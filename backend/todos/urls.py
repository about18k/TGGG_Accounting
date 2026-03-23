from django.urls import path, re_path
from . import views

from accounts.views import upload_profile_picture, upload_profile_signature

app_name = 'todos'

urlpatterns = [
    # User profile (with is_leader)
    re_path(r'^profile/picture/?$', upload_profile_picture, name='upload_profile_picture'),
    re_path(r'^profile/signature/?$', upload_profile_signature, name='upload_profile_signature'),
    re_path(r'^profile/password/?$', views.todo_profile_password, name='profile_password'),
    re_path(r'^profile/?$', views.todo_profile, name='profile'),

    # Todos
    re_path(r'^todos/?$', views.todos_list_create, name='todos_list_create'),
    re_path(r'^todos/(?P<todo_id>\d+)/?$', views.todo_detail, name='todo_detail'),
    re_path(r'^todos/(?P<todo_id>\d+)/confirm/?$', views.todo_confirm, name='todo_confirm'),
    re_path(r'^todos/(?P<todo_id>\d+)/confirm-completion/?$', views.todo_confirm_completion, name='todo_confirm_completion'),
    re_path(r'^todos/(?P<todo_id>\d+)/reject-completion/?$', views.todo_reject_completion, name='todo_reject_completion'),

    # Groups
    re_path(r'^groups/?$', views.groups_list_create, name='groups_list_create'),
    re_path(r'^groups/(?P<group_id>\d+)/?$', views.group_delete, name='group_delete'),
    re_path(r'^groups/(?P<group_id>\d+)/members/?$', views.group_add_member, name='group_add_member'),
    re_path(r'^groups/(?P<group_id>\d+)/members/(?P<user_id>\d+)/?$', views.group_remove_member, name='group_remove_member'),

    # User management for todos
    re_path(r'^users/available/?$', views.available_users, name='available_users'),
    re_path(r'^users/interns/?$', views.list_interns, name='list_interns'),
    re_path(r'^users/(?P<user_id>\d+)/make-leader/?$', views.make_leader, name='make_leader'),
    re_path(r'^users/(?P<user_id>\d+)/remove-leader/?$', views.remove_leader, name='remove_leader'),

    # Department tasks
    re_path(r'^department-tasks/?$', views.department_tasks_list_create, name='department_tasks_list_create'),
    re_path(r'^department-tasks/(?P<task_id>[0-9a-f-]+)/?$', views.department_task_delete, name='department_task_delete'),
    re_path(r'^department-tasks/(?P<task_id>[0-9a-f-]+)/grab/?$', views.department_task_grab, name='department_task_grab'),
    re_path(r'^department-tasks/(?P<task_id>[0-9a-f-]+)/complete/?$', views.department_task_complete, name='department_task_complete'),
    re_path(r'^department-tasks/(?P<task_id>[0-9a-f-]+)/abandon/?$', views.department_task_abandon, name='department_task_abandon'),

    # Notifications
    re_path(r'^notifications/?$', views.notifications_list, name='notifications_list'),
    re_path(r'^notifications/(?P<notif_id>\d+)/read/?$', views.notification_mark_read, name='notification_mark_read'),
    re_path(r'^notifications/read-all/?$', views.notifications_mark_all_read, name='notifications_mark_all_read'),
]
