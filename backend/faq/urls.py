"""FAQ routes, mounted under /api/faq/ by the project URLconf."""
from django.urls import path

from . import chat_views, views

urlpatterns = [
    path("start/", chat_views.start_view, name="faq-start"),
    path("ask/", chat_views.ask_view, name="faq-ask"),
    path("feedback/", chat_views.feedback_view, name="faq-feedback"),
    path("try/", chat_views.try_view, name="faq-try"),
    path("search-status/", chat_views.search_status_view, name="faq-search-status"),
    path("entries/", views.entries_view, name="faq-entries"),
    path("entries/<int:entry_id>/", views.entry_detail_view, name="faq-entry"),
    path("entries/<int:entry_id>/<str:step>/", views.entry_step_view, name="faq-entry-step"),
    path("categories/", views.categories_view, name="faq-categories"),
    path("categories/<int:category_id>/", views.category_detail_view, name="faq-category"),
    path("review-list/", views.review_list_view, name="faq-review-list"),
    path("questions/", views.questions_view, name="faq-questions"),
    path("questions/review/", views.questions_review_view, name="faq-questions-review"),
    path("settings/", views.chatbot_settings_view, name="faq-settings"),
    path("documents/", views.documents_view, name="faq-documents"),
    path("documents/<int:document_id>/", views.document_detail_view, name="faq-document"),
    path("documents/<int:document_id>/file/", chat_views.document_file_view, name="faq-document-file"),
    path("documents/<int:document_id>/<str:step>/", views.document_step_view, name="faq-document-step"),
]
