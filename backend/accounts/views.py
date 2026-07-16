"""Auth API views: login, logout, me, password-reset (request + confirm)."""
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ObjectDoesNotExist
from django.core.mail import send_mail
from django.db.models import Q
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import (
    LoginSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
)
from .throttles import (
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
    if user is None or not user.check_password(password):
        return Response({"error": "Invalid credentials."}, status=status.HTTP_401_UNAUTHORIZED)
    if not user.is_active:
        return Response({"error": "This account is disabled."}, status=status.HTTP_403_FORBIDDEN)

    refresh = RefreshToken.for_user(user)
    return Response({"token": str(refresh.access_token), "user": user.to_public_dict()})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """Stateless JWT logout — the client discards the token. Endpoint exists so
    the frontend has a stable call and we can add token blacklisting later."""
    return Response({"message": "Logged out successfully."})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me_view(request):
    """Return the authenticated user (for session restore on the frontend)."""
    return Response(request.user.to_public_dict())


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
    send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [user.email], fail_silently=False)


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

    if user is None or not default_token_generator.check_token(user, token):
        return Response(
            {"error": "This reset link is invalid or has expired."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user.set_password(new_password)
    user.save(update_fields=["password"])
    return Response({"message": "Your password has been reset. You can now sign in."})
