from django.urls import path
from . import views

app_name = 'accounts'

urlpatterns = [
    path('login/', views.login_view, name='login'),
    path('register/', views.register_view, name='register'),
    path('profile/', views.user_profile, name='profile'),
    path('pending/', views.pending_users, name='pending_users'),
    path('approve/', views.approve_user, name='approve_user'),
    path('departments/', views.get_departments, name='departments'),
    path('overview/', views.accounts_overview, name='overview'),
    path('users/', views.list_users, name='users'),
]
