from rest_framework.permissions import BasePermission


class IsOfficeStaffAdmin(BasePermission):
    message = "Only Office Staff/Admin can manage lecturer capacity."

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user and user.is_authenticated and user.role == user.Role.OFFICE_ADMIN
        )
