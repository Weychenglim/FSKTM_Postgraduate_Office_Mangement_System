"""Admin forms for the custom user (the default ones assume a ``username``)."""
from django import forms
from django.contrib.auth.forms import ReadOnlyPasswordHashField
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError

from .models import User

PORTAL_PROFILES = ("student", "office_staff", "lecturer")
# Until the Office actions stop depending on ``is_staff`` (pending-work T03),
# only Office accounts may keep it; no other portal role needs the admin site.
NON_STAFF_ROLES = {User.Role.STUDENT, User.Role.LECTURER, User.Role.COORDINATOR}


def check_one_role(cleaned_data, instance=None):
    """One account, one role: a Technical Administrator never doubles as a
    portal account, and a portal account is never a superuser."""
    if cleaned_data.get("role") == User.TECHNICAL_ADMIN:
        if instance is not None and any(hasattr(instance, name) for name in PORTAL_PROFILES):
            raise forms.ValidationError(
                "This account has a portal profile. Create a separate "
                "Technical Administrator account instead."
            )
    elif cleaned_data.get("is_superuser"):
        raise forms.ValidationError(
            "Portal accounts cannot be superusers. Create a separate "
            "Technical Administrator account instead."
        )
    if cleaned_data.get("is_staff") and cleaned_data.get("role") in NON_STAFF_ROLES:
        raise forms.ValidationError(
            "Only Office Staff/Admin portal accounts may have staff status."
        )


class UserCreationForm(forms.ModelForm):
    """Create a user in the Django admin with a confirmed, hashed password."""

    password1 = forms.CharField(label="Password", widget=forms.PasswordInput)
    password2 = forms.CharField(label="Confirm password", widget=forms.PasswordInput)

    class Meta:
        model = User
        fields = ("email", "full_name", "role", "phone")

    def clean_password2(self):
        p1 = self.cleaned_data.get("password1")
        p2 = self.cleaned_data.get("password2")
        if p1 and p2 and p1 != p2:
            raise forms.ValidationError("The two password fields don't match.")
        return p2

    def clean(self):
        cleaned_data = super().clean()
        password = cleaned_data.get("password2")
        if password:
            candidate = User(
                email=cleaned_data.get("email") or "",
                full_name=cleaned_data.get("full_name") or "",
            )
            try:
                validate_password(password, user=candidate)
            except ValidationError as exc:
                self.add_error("password2", exc)
        return cleaned_data

    def save(self, commit=True):
        user = super().save(commit=False)
        user.set_password(self.cleaned_data["password1"])
        if user.role == User.TECHNICAL_ADMIN:
            user.is_staff = True
            user.is_superuser = True
        else:
            # A password typed by an administrator is temporary (FR-04).
            user.must_change_password = True
        if commit:
            user.save()
        return user


class UserChangeForm(forms.ModelForm):
    """Edit a user; shows the password hash (read-only) like Django's default."""

    password = ReadOnlyPasswordHashField(
        label="Password",
        help_text=(
            "Raw passwords are not stored, so there is no way to see this "
            'user\'s password, but you can change it using '
            '<a href="../password/">this form</a>.'
        ),
    )

    class Meta:
        model = User
        fields = (
            "email",
            "password",
            "full_name",
            "role",
            "phone",
            "must_change_password",
            "is_active",
            "is_staff",
            "is_superuser",
            "groups",
            "user_permissions",
        )

    def clean(self):
        cleaned_data = super().clean()
        check_one_role(cleaned_data, instance=self.instance)
        if cleaned_data.get("role") == User.TECHNICAL_ADMIN and not (
            cleaned_data.get("is_staff") and cleaned_data.get("is_superuser")
        ):
            raise forms.ValidationError(
                "Technical Administrator accounts must keep staff and superuser status."
            )
        return cleaned_data
