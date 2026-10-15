"""FAQ routes, mounted under /api/faq/ by the project URLconf."""
from django.urls import path

from . import views

urlpatterns = [
    path("entries/", views.entries_view, name="faq-entries"),
    path("entries/<int:entry_id>/", views.entry_detail_view, name="faq-entry"),
    path("entries/<int:entry_id>/<str:step>/", views.entry_step_view, name="faq-entry-step"),
    path("categories/", views.categories_view, name="faq-categories"),
    path("categories/<int:category_id>/", views.category_detail_view, name="faq-category"),
    path("review-list/", views.review_list_view, name="faq-review-list"),
]
