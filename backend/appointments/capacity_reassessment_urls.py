from django.urls import path
from . import capacity_reassessment_views as views
urlpatterns = [path('', views.collection), path('<str:kind>/<int:pk>/<str:action>/', views.decision)]
