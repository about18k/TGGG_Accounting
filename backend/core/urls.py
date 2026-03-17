"""
URL configuration for core project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import include, path, re_path
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
)
from attendance import views as attendance_views
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    # JWT Token Endpoints
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/token/verify/', TokenVerifyView.as_view(), name='token_verify'),
    # App URLs
    path('api/accounts/', include('accounts.urls')),
    path('api/attendance/', include('attendance.urls')),
    path('api/payroll/', include('payroll.urls')),
    path('api/bim-docs/', include('bim_documentation.urls')),
    # Backward-compatible overtime endpoints used by existing frontend modules
    re_path(r'^api/overtime/?$', attendance_views.overtime_list_create, name='overtime_list_create'),
    re_path(r'^api/overtime/my/?$', attendance_views.my_overtime_requests, name='my_overtime_requests'),
    re_path(r'^api/overtime/all/?$', attendance_views.all_overtime_requests, name='all_overtime_requests'),
    re_path(r'^api/overtime/(?P<request_id>\d+)/approve/?$', attendance_views.approve_overtime_request, name='approve_overtime_request'),
    # Todos app routes mounted at /api/ root to match frontend expectations
    # (frontend VITE_API_URL is http://localhost:8000/api)
    path('api/', include('todos.urls')),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

