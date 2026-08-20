"""Auth API views: login, logout, me, password-reset (request + confirm)."""
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ObjectDoesNotExist
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.mail import send_mail
from django.db.models import Q
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from .models import NotificationPreference
from .serializers import (
    ChangePasswordSerializer,
    ContactDetailsSerializer,
    LoginSerializer,
    NotificationPreferenceSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
)
from .throttles import (
    ChangePasswordRateThrottle,
    LoginRateThrottle,
    PasswordResetConfirmRateThrottle,
    PasswordResetRateThrottle,
)

User = get_user_model()


@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([LoginRateThrottle])
def login_view(request):
    """Authenticate by email / student ID / staff ID (case-insensitive)."""
    serializer = LoginSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)  # 400 on missing fields
    identifier = serializer.validated_data["identifier"].strip()
    password = serializer.validated_data["password"]

    # Match the identifier against the email, a student's matric no, or a
    # staff/lecturer's staff no (the latter two now live in the profile tables).
    user = (
        User.objects.filter(
            Q(email__iexact=identifier)
            | Q(student__matric_no__iexact=identifier)
            | Q(office_staff__staff_no__iexact=identifier)
            | Q(lecturer__staff_no__iexact=identifier)
        )
        .distinct()
        .first()
    )
    # Hash even when no account matched, so response time does not reveal
    # whether an identifier exists. Skipping this made unknown identifiers
    # roughly 100x faster to reject than known ones.
    if user is None:
        User().set_password(password)
        return Response({"error": "Invalid credentials."}, status=status.HTTP_401_UNAUTHORIZED)

    # A disabled account returns the same generic 401 whether or not the
    # password was right; a distinct 403 confirmed valid credentials and
    # revealed which accounts the office had suspended.
    if not user.check_password(password) or not user.is_active:
        return Response({"error": "Invalid credentials."}, status=status.HTTP_401_UNAUTHORIZED)

    refresh = RefreshToken.for_user(user)
    return Response({"token": str(refresh.access_token), "user": user.to_public_dict()})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """Stateless JWT logout — the client discards the token. Endpoint exists so
    the frontend has a stable call and we can add token blacklisting later."""
    return Response({"message": "Logged out successfully."})


@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def me_view(request):
    """Return the authenticated user, or update their own contact details.

    Only the phone number is writable. Email is the login identifier and role /
    department / ID fields are office-controlled, so those stay read-only here
    and are managed through Registry Management or the Django admin.
    """
    if request.method == "GET":
        return Response(request.user.to_public_dict())

    serializer = ContactDetailsSerializer(data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    if "phone" in serializer.validated_data:
        request.user.phone = serializer.validated_data["phone"]
        request.user.save(update_fields=["phone"])
    return Response(request.user.to_public_dict())


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@throttle_classes([ChangePasswordRateThrottle])
def change_password_view(request):
    """Change the caller's own password after verifying the current one."""
    serializer = ChangePasswordSerializer(
        data=request.data, context={"user": request.user}
    )
    serializer.is_valid(raise_exception=True)

    request.user.set_password(serializer.validated_data["new_password"])
    request.user.must_change_password = False
    request.user.save(update_fields=["password", "must_change_password"])
    # The existing access token stays valid until it expires; the frontend
    # re-authenticates on the next login.
    return Response({"message": "Your password has been updated."})


@api_view(["GET", "PUT", "PATCH"])
@permission_classes([IsAuthenticated])
def notification_preferences_view(request):
    """Read or update the caller's own notification preferences."""
    preference = NotificationPreference.for_user(request.user)
    if request.method == "GET":
        return Response(preference.to_public_dict())

    serializer = NotificationPreferenceSerializer(data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    changed = []
    for key, field in NotificationPreference.FIELD_MAP.items():
        if key in serializer.validated_data:
            setattr(preference, field, serializer.validated_data[key])
            changed.append(field)
    if changed:
        preference.save(update_fields=[*changed, "updated_at"])
    return Response(preference.to_public_dict())


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_letter_details_view(request):
    """Return the logged-in student's details for letter generation: the base
    profile (name, matric, programme, status) plus the extended StudentRegistry
    fields (passport, country, semesters…). The student Letter Generation screen
    fills its template placeholders from this. Non-students get 403; a student
    with no registry row yet gets the base fields with the extras left blank
    (so the office still completes them by hand)."""
    student = request.user._related_or_none("student")
    if student is None:
        return Response(
            {"error": "Only students have letter details."},
            status=status.HTTP_403_FORBIDDEN,
        )

    data = {
        "studentName": request.user.full_name,
        "matricNumber": student.matric_no,
        "programName": student.programme,
        "currentStatus": student.status,
        "supervisorName": "",  # no system data source for the supervisor yet
        # Registry-backed fields — blank until a registry row exists.
        "passportNumber": "",
        "country": "",
        "programmeMode": "",
        "fieldOfResearch": "",
        "modeOfStudy": "",
        "initialSemester": student.intake_semester,
        "currentSemester": "",
        "maxSemester": "",
        "expectedCompletion": "",
    }
    try:
        data.update(student.registry.to_letter_dict())
    except ObjectDoesNotExist:
        pass  # no registry details captured yet — keep the blanks above
    return Response(data)


def _send_password_reset_email(user):
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    reset_link = f"{settings.FRONTEND_URL}/reset-password?uid={uid}&token={token}"
    subject = "Reset your FSKTM PG Office password"
    message = (
        f"Hello {user.full_name},\n\n"
        "We received a request to reset the password for your FSKTM Postgraduate "
        "Office account. Click the link below to choose a new password:\n\n"
        f"{reset_link}\n\n"
        "This link will expire in 30 minutes. If you did not request a reset, "
        "you can safely ignore this email.\n\n"
        "— FSKTM Postgraduate Office"
    )
    # fail_silently: an SMTP outage otherwise turned this endpoint into a
    # registered/unregistered oracle (500 for a real address, 200 for an
    # unknown one) despite the deliberately generic response body.
    send_mail(
        subject,
        message,
        settings.DEFAULT_FROM_EMAIL,
        [user.email],
        fail_silently=True,
    )


@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([PasswordResetRateThrottle])
def password_reset_view(request):
    """Send a reset link. Always returns 200 so we never reveal which emails
    are registered."""
    serializer = PasswordResetRequestSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    email = serializer.validated_data["email"]

    user = User.objects.filter(email__iexact=email, is_active=True).first()
    if user is not None:
        _send_password_reset_email(user)

    return Response(
        {"message": "If that email is registered, a password reset link has been sent."}
    )


@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([PasswordResetConfirmRateThrottle])
def password_reset_confirm_view(request):
    """Validate the uid+token from the email link and set the new password."""
    serializer = PasswordResetConfirmSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    uidb64 = serializer.validated_data["uid"]
    token = serializer.validated_data["token"]
    new_password = serializer.validated_data["new_password"]

    try:
        uid = force_str(urlsafe_base64_decode(uidb64))
        user = User.objects.get(pk=uid)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        user = None

    # ``is_active`` is not covered by the token hash, so a suspended account
    # could still complete an outstanding reset link and choose its password.
    if (
        user is None
        or not user.is_active
        or not default_token_generator.check_token(user, token)
    ):
        return Response(
            {"error": "This reset link is invalid or has expired."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Validated here rather than in the serializer so the resolved user is
    # available; without it UserAttributeSimilarityValidator never runs and a
    # user could reset their password to their own email address.
    try:
        validate_password(new_password, user=user)
    except DjangoValidationError as exc:
        return Response(
            {"new_password": list(exc.messages)}, status=status.HTTP_400_BAD_REQUEST
        )

    user.set_password(new_password)
    user.must_change_password = False
    user.save(update_fields=["password", "must_change_password"])
    return Response({"message": "Your password has been reset. You can now sign in."})
