from django.urls import path
from . import delegation_views as views

urlpatterns = [
    path('', views.delegations_view),
    path('options/', views.options_view),
    path('<int:delegation_id>/revoke/', views.revoke_view),
]
