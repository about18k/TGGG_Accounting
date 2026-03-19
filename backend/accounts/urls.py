from django.urls import path
from . import views

app_name = 'accounts'

urlpatterns = [
    path('login/', views.login_view, name='login'),
    path('register/', views.register_view, name='register'),
    path('profile/', views.user_profile, name='profile'),
    path('profile/picture/', views.upload_profile_picture, name='upload_profile_picture'),
    path('profile/signature/', views.upload_profile_signature, name='upload_profile_signature'),
    path('pending/', views.pending_users, name='pending_users'),
    path('approve/', views.approve_user, name='approve_user'),
    path('departments/', views.get_departments, name='departments'),
    path('overview/', views.accounts_overview, name='overview'),
    path('users/', views.list_users, name='users'),
    path('users/<int:user_id>/', views.manage_user, name='manage_user'),
    # Accounting Employee Management Endpoints
    path('accounting/employees/', views.accounting_employees, name='accounting_employees'),
    path('accounting/employees/<int:user_id>/', views.accounting_employee_detail, name='accounting_employee_detail'),
]
