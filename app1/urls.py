from django.urls import path
from .views import readings_list_create

urlpatterns = [
    path('readings/', readings_list_create, name='readings'),
]