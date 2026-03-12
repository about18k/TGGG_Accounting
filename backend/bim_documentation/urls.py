from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'', views.BimDocumentationViewSet, basename='bim-documentation')

app_name = 'bim_documentation'

urlpatterns = [
    path('', include(router.urls)),
]
