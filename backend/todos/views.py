"""
DRF ViewSets for todos app.
Thin views layer - routing only, business logic in services.py
"""
import logging

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import OperationalError
from django.core.cache import cache
from django.conf import settings
from django.shortcuts import get_object_or_404
from django.utils import timezone

from accounts.models import CustomUser
from .models import (
    TaskGroup, TaskGroupMember, Todo,
    DepartmentTask, DepartmentTaskStats, TodoNotification
)
from .serializers import (
    TaskGroupSerializer, TodoSerializer,
    DepartmentTaskSerializer, DepartmentTaskStatsSerializer,
    UserMiniSerializer, TodoNotificationSerializer
)
from .services import (
    TodoService, GroupService, DepartmentTaskService,
    UserProfileService, NotificationService
)


logger = logging.getLogger(__name__)


# ─────────────────────────────────── Profile Endpoints ───────────────────────

@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def todo_profile(request):
    """Get or update current user profile."""
    if request.method == 'GET':
        payload = UserProfileService.get_profile_payload(request.user)
        return Response(payload)
    
    # PUT
    try:
        user = UserProfileService.update_profile(request.user, request.data)
        payload = UserProfileService.get_profile_payload(user)
        return Response(payload)
    except ValueError as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def todo_profile_password(request):
    """Update user password."""
    password = str(request.data.get('password') or '')
    if len(password) < 6:
        return Response({'error': 'Password must be at least 6 characters.'}, status=status.HTTP_400_BAD_REQUEST)

    user = request.user
    user.set_password(password)
    user.save(update_fields=['password'])
    return Response({'success': True})


# ─────────────────────────────────── Todo Endpoints ───────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def todos_list_create(request):
    """List or create todos."""
    if request.method == 'GET':
        todo_type = request.query_params.get('type', 'personal')
        todos = TodoService.list_todos(request.user, todo_type)
        serializer = TodoSerializer(todos, many=True)
        return Response(serializer.data)
    
    # POST
    try:
        todo = TodoService.create_todo(request.user, request.data)
        serializer = TodoSerializer(todo)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    except (ValueError, PermissionError) as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def todo_detail(request, todo_id):
    """Update or delete a specific todo."""
    todo = get_object_or_404(Todo, id=todo_id)

    if request.method == 'PUT':
        try:
            completed = request.data.get('completed')
            if completed is not None:
                todo = TodoService.update_todo_completion(todo, request.user, completed)
            serializer = TodoSerializer(todo)
            return Response(serializer.data)
        except PermissionError as e:
            return Response({'error': str(e)}, status=status.HTTP_403_FORBIDDEN)

    elif request.method == 'DELETE':
        try:
            TodoService.delete_todo(todo, request.user)
            return Response(status=status.HTTP_204_NO_CONTENT)
        except PermissionError as e:
            return Response({'error': str(e)}, status=status.HTTP_403_FORBIDDEN)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def todo_confirm(request, todo_id):
    """Leader confirms a suggested group todo."""
    todo = get_object_or_404(Todo, id=todo_id)
    try:
        todo = TodoService.confirm_todo(todo, request.user, request.data)
        serializer = TodoSerializer(todo)
        return Response(serializer.data)
    except PermissionError as e:
        return Response({'error': str(e)}, status=status.HTTP_403_FORBIDDEN)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def todo_confirm_completion(request, todo_id):
    """Leader confirms a member's completion request."""
    todo = get_object_or_404(Todo, id=todo_id)
    try:
        todo = TodoService.confirm_completion(todo, request.user)
        serializer = TodoSerializer(todo)
        return Response(serializer.data)
    except PermissionError as e:
        return Response({'error': str(e)}, status=status.HTTP_403_FORBIDDEN)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def todo_reject_completion(request, todo_id):
    """Reject a member's completion request."""
    todo = get_object_or_404(Todo, id=todo_id)
    try:
        todo = TodoService.reject_completion(todo, request.user)
        serializer = TodoSerializer(todo)
        return Response(serializer.data)
    except PermissionError as e:
        return Response({'error': str(e)}, status=status.HTTP_403_FORBIDDEN)


# ─────────────────────────────────── Group Endpoints ──────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def groups_list_create(request):
    """List all groups or create a new group."""
    if request.method == 'GET':
        groups = TaskGroup.objects.select_related('leader', 'created_by').prefetch_related('members__user').all()
        serializer = TaskGroupSerializer(groups, many=True)
        return Response(serializer.data)

    # POST
    try:
        group = GroupService.create_group(request.user, request.data)
        serializer = TaskGroupSerializer(group)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    except ValueError as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def group_delete(request, group_id):
    """Delete a group."""
    group = get_object_or_404(TaskGroup, id=group_id)
    try:
        GroupService.delete_group(group, request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)
    except PermissionError as e:
        return Response({'error': str(e)}, status=status.HTTP_403_FORBIDDEN)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def group_add_member(request, group_id):
    """Add a member to a group."""
    group = get_object_or_404(TaskGroup, id=group_id)
    user_id = request.data.get('user_id')

    if not user_id:
        return Response({'error': 'user_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        GroupService.add_member(group, user_id)
        serializer = TaskGroupSerializer(group)
        return Response(serializer.data)
    except ValueError as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def group_remove_member(request, group_id, user_id):
    """Remove a member from a group."""
    membership = get_object_or_404(TaskGroupMember, group_id=group_id, user_id=user_id)
    membership.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


# ─────────────────────────────────── User Management ──────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def available_users(request):
    """Get users not in any group."""
    in_group_ids = TaskGroupMember.objects.values_list('user_id', flat=True)
    leader_ids = TaskGroup.objects.values_list('leader_id', flat=True)
    excluded_ids = set(list(in_group_ids) + [i for i in leader_ids if i] + [request.user.id])

    users = CustomUser.objects.filter(is_active=True).exclude(id__in=excluded_ids)
    serializer = UserMiniSerializer(users, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_interns(request):
    """List all interns."""
    interns = CustomUser.objects.filter(role='intern', is_active=True)
    data = [
        {
            'id': u.id,
            'full_name': f"{u.first_name} {u.last_name}".strip() if (u.first_name or u.last_name) else u.email,
            'username': u.username,
            'email': u.email,
            'is_leader': getattr(u, 'is_leader', False),
        }
        for u in interns
    ]
    return Response(data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def make_leader(request, user_id):
    """Promote a user to leader."""
    user = request.user
    is_privileged = user.role in ['studio_head', 'admin', 'site_coordinator'] or user.is_staff
    if not is_privileged:
        return Response({'error': 'Not authorized.'}, status=status.HTTP_403_FORBIDDEN)
        
    target = get_object_or_404(CustomUser, id=user_id)
    target.is_leader = True
    target.save(update_fields=['is_leader'])
    return Response({'message': f'{target} is now a leader.'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def remove_leader(request, user_id):
    """Demote a user from leader."""
    user = request.user
    is_privileged = user.role in ['studio_head', 'admin', 'site_coordinator'] or user.is_staff
    if not is_privileged:
        return Response({'error': 'Not authorized.'}, status=status.HTTP_403_FORBIDDEN)

    target = get_object_or_404(CustomUser, id=user_id)
    target.is_leader = False
    target.save(update_fields=['is_leader'])
    return Response({'message': f'{target} is no longer a leader.'})


# ─────────────────────────────────── Department Tasks ─────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def department_tasks_list_create(request):
    """List or create department tasks."""
    if request.method == 'GET':
        if request.user.department:
            tasks = DepartmentTask.objects.filter(
                department=request.user.department,
                deleted_at__isnull=True
            ).select_related('suggested_by', 'grabbed_by', 'completed_by', 'department')
        else:
            tasks = DepartmentTask.objects.none()
        serializer = DepartmentTaskSerializer(tasks, many=True)
        return Response(serializer.data)

    # POST
    try:
        task = DepartmentTaskService.create_task(request.user, request.data)
        serializer = DepartmentTaskSerializer(task)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    except ValueError as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def department_task_delete(request, task_id):
    """Soft-delete a department task."""
    task = get_object_or_404(DepartmentTask, id=task_id, deleted_at__isnull=True)
    task.deleted_at = timezone.now()
    task.save()
    DepartmentTaskStats.refresh_for_department(task.department_id)
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def department_task_grab(request, task_id):
    """Grab a department task."""
    task = get_object_or_404(DepartmentTask, id=task_id, deleted_at__isnull=True)
    try:
        task = DepartmentTaskService.grab_task(task, request.user)
        serializer = DepartmentTaskSerializer(task)
        return Response(serializer.data)
    except ValueError as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def department_task_complete(request, task_id):
    """Complete a department task."""
    task = get_object_or_404(DepartmentTask, id=task_id, deleted_at__isnull=True)
    try:
        task = DepartmentTaskService.complete_task(task, request.user)
        serializer = DepartmentTaskSerializer(task)
        return Response(serializer.data)
    except ValueError as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def department_task_abandon(request, task_id):
    """Abandon a grabbed department task."""
    task = get_object_or_404(DepartmentTask, id=task_id, deleted_at__isnull=True)
    try:
        task = DepartmentTaskService.abandon_task(task, request.user)
        serializer = DepartmentTaskSerializer(task)
        return Response(serializer.data)
    except ValueError as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


# ─────────────────────────────────── Notifications ──────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def notifications_list(request):
    """List current user's notifications."""
    cache_enabled = getattr(settings, 'ENABLE_API_RESPONSE_CACHE', True)
    cache_key = f"todos:notifications:user:{request.user.id}"
    if cache_enabled:
        cached_payload = cache.get(cache_key)
        if cached_payload is not None:
            response = Response(cached_payload)
            response['Cache-Control'] = f"private, max-age={settings.API_CACHE_TTL_SHORT}"
            return response

    try:
        notifications = TodoNotification.objects.filter(
            recipient=request.user
        ).select_related('actor')[:50]
        serializer = TodoNotificationSerializer(notifications, many=True)
        payload = serializer.data
        if cache_enabled:
            cache.set(cache_key, payload, timeout=settings.API_CACHE_TTL_SHORT)
        response = Response(payload)
        response['Cache-Control'] = f"private, max-age={settings.API_CACHE_TTL_SHORT}"
        return response
    except OperationalError as exc:
        logger.warning('Notification list unavailable due to DB connectivity: %s', exc)
        return Response(
            {'error': 'Notification service temporarily unavailable. Please try again.'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def notification_mark_read(request, notif_id):
    """Mark single notification as read."""
    try:
        notif = get_object_or_404(TodoNotification, id=notif_id, recipient=request.user)
        notif.is_read = True
        notif.save()
        cache.delete(f"todos:notifications:user:{request.user.id}")
        return Response({'status': 'ok'})
    except OperationalError as exc:
        logger.warning('Notification mark-read unavailable due to DB connectivity: %s', exc)
        return Response(
            {'error': 'Notification service temporarily unavailable. Please try again.'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def notifications_mark_all_read(request):
    """Mark all notifications as read."""
    try:
        TodoNotification.objects.filter(recipient=request.user, is_read=False).update(is_read=True)
        cache.delete(f"todos:notifications:user:{request.user.id}")
        return Response({'status': 'ok'})
    except OperationalError as exc:
        logger.warning('Notification mark-all-read unavailable due to DB connectivity: %s', exc)
        return Response(
            {'error': 'Notification service temporarily unavailable. Please try again.'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
