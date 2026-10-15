from django.urls import path

from . import views

urlpatterns = [
    path("", views.documents_view, name="documents"),
    path("options/", views.options_view, name="document-options"),
    path("students/", views.student_search_view, name="document-students"),
    path("students/<str:matric>/", views.student_header_view, name="document-student"),
    path("summary/", views.summary_view, name="document-summary"),
    path("tags/", views.tags_view, name="document-tags"),
    path("download-zip/", views.download_zip_view, name="document-zip"),
    path("<int:pk>/", views.document_view, name="document-detail"),
    path("<int:pk>/download/", views.download_view, name="document-download"),
    path("<int:pk>/versions/", views.versions_view, name="document-versions"),
    path("<int:pk>/check/", views.check_view, name="document-check"),
    path("<int:pk>/preview/", views.preview_view, name="document-preview"),
    path("<int:pk>/preview/pages/<int:number>/", views.preview_page_view, name="document-preview-page"),
]
