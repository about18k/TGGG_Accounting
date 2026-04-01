from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import MaterialRequestViewSet, ProjectViewSet


router = DefaultRouter()
router.register(r'projects', ProjectViewSet, basename='project')
router.register(r'', MaterialRequestViewSet, basename='material-request')

app_name = 'material_requests'

urlpatterns = [
    path('', include(router.urls)),
]
