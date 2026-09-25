from django.urls import path

from . import participant_views


urlpatterns = [
    path("", participant_views.participant_list_view),
    path("students/<str:matric_no>/", participant_views.student_participant_detail_view),
    path("students/<str:matric_no>/transition/", participant_views.student_transition_view),
    path("students/<str:matric_no>/pending-work/cancel/", participant_views.student_pending_cancel_view),
    path("lecturers/<str:staff_no>/", participant_views.lecturer_participant_detail_view),
    path("lecturers/<str:staff_no>/transition/", participant_views.lecturer_transition_view),
    path("lecturers/<str:staff_no>/pending-work/cancel/", participant_views.lecturer_pending_cancel_view),
]
