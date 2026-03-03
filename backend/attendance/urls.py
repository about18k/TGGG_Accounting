from django.urls import path
from . import views

app_name = 'attendance'

urlpatterns = [
    path('', views.attendance_overview, name='overview'),
    path('my/', views.my_attendance_records, name='my_attendance_records'),
    path('my/today/', views.my_attendance_today, name='my_attendance_today'),
    path('all/', views.all_attendance_records, name='all_attendance_records'),
    path('clock-in/', views.clock_in, name='clock_in'),
    path('clock-out/', views.clock_out, name='clock_out'),
    path('leave/', views.create_leave_request, name='create_leave_request'),
    path('leave/my/', views.my_leave_requests, name='my_leave_requests'),
    path('events/', views.calendar_events, name='calendar_events'),
    path('overtime/', views.all_overtime_requests, name='all_overtime_requests'),
]
