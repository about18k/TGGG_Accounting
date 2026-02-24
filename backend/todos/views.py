from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Q

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


def _actor_name(user):
    """Return a display name for a user."""
    if user.first_name or user.last_name:
        return f"{user.first_name} {user.last_name}".strip()
    return user.email


def _notify(recipient, actor, notif_type, title, message, todo=None, dept_task=None):
    """Create a TodoNotification. Skips if recipient == actor."""
    if recipient and actor and recipient.id == actor.id:
        return None
    return TodoNotification.objects.create(
        recipient=recipient,
        actor=actor,
        type=notif_type,
        title=title,
        message=message,
        todo=todo,
        department_task=dept_task,
    )


# ─── User Profile (with is_leader) ───────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def todo_profile(request):
    """Return current user profile with is_leader and group info."""
    user = request.user
    group_membership = TaskGroupMember.objects.filter(user=user).select_related('group').first()
    led_group = TaskGroup.objects.filter(leader=user).first()

    data = {
        'id': user.id,
        'email': user.email,
        'username': user.username,
        'full_name': f"{user.first_name} {user.last_name}".strip() if (user.first_name or user.last_name) else user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'role': user.role,
        'department': user.department.name if user.department else None,
        'department_id': user.department_id,
        'profile_picture': user.profile_picture,
        'is_leader': getattr(user, 'is_leader', False),
        'group_id': group_membership.group_id if group_membership else (led_group.id if led_group else None),
    }
    return Response(data)


# ─── Todos CRUD ──────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def todos_list_create(request):
    """List or create todos."""
    if request.method == 'GET':
        return _list_todos(request)
    return _create_todo(request)


def _list_todos(request):
    user = request.user
    todo_type = request.query_params.get('type', 'personal')

    if todo_type == 'personal':
        todos = Todo.objects.filter(user=user, todo_type='personal')
    elif todo_type == 'team':
        # Get all confirmed group/assigned todos for the user's group
        user_group_ids = list(
            TaskGroupMember.objects.filter(user=user).values_list('group_id', flat=True)
        )
        # Also include groups the user leads
        led_group_ids = list(
            TaskGroup.objects.filter(leader=user).values_list('id', flat=True)
        )
        all_group_ids = list(set(user_group_ids + led_group_ids))

        todos = Todo.objects.filter(
            Q(group_id__in=all_group_ids, is_confirmed=True) |
            Q(assigned_to=user, todo_type='assigned')
        )
    elif todo_type == 'group':
        # For manage tab: show unconfirmed group todos + pending completions
        led_group_ids = list(
            TaskGroup.objects.filter(leader=user).values_list('id', flat=True)
        )
        todos = Todo.objects.filter(
            Q(group_id__in=led_group_ids, is_confirmed=False) |
            Q(group_id__in=led_group_ids, pending_completion=True)
        )
    else:
        todos = Todo.objects.filter(user=user)

    serializer = TodoSerializer(todos, many=True)
    return Response(serializer.data)


def _create_todo(request):
    user = request.user
    data = request.data

    todo = Todo(
        user=user,
        task=data.get('task', ''),
        description=data.get('description', ''),
        todo_type=data.get('todo_type', 'personal'),
        start_date=data.get('start_date'),
        deadline=data.get('deadline'),
    )

    if todo.todo_type == 'group':
        group_id = data.get('group_id')
        if not group_id:
            return Response({'error': 'group_id is required for group todos.'}, status=status.HTTP_400_BAD_REQUEST)
        group = get_object_or_404(TaskGroup, id=group_id)
        todo.group = group

        # If user is the leader, auto-confirm; else it's a suggestion
        if group.leader_id == user.id:
            todo.is_confirmed = True
            todo.assigned_by = user
        else:
            todo.is_confirmed = False
            todo.suggested_by = user

    elif todo.todo_type == 'assigned':
        assigned_to_id = data.get('assigned_to')
        if not assigned_to_id:
            return Response({'error': 'assigned_to is required.'}, status=status.HTTP_400_BAD_REQUEST)
        todo.assigned_to_id = assigned_to_id
        todo.assigned_by = user
        todo.is_confirmed = True
        todo.date_assigned = timezone.now()

        # Also set group if user leads a group
        led_group = TaskGroup.objects.filter(leader=user).first()
        if led_group:
            todo.group = led_group

    elif todo.todo_type == 'personal':
        todo.is_confirmed = True

    todo.save()

    # ── Notifications ──
    task_preview = todo.task[:60]
    name = _actor_name(user)
    # Member suggests a task → notify leader
    if todo.todo_type == 'group' and not todo.is_confirmed and todo.group and todo.group.leader:
        _notify(
            recipient=todo.group.leader, actor=user,
            notif_type='task_suggested',
            title='Task Suggested for Approval',
            message=f'{name} suggested a new team task: "{task_preview}"',
            todo=todo,
        )
    # Task assigned → notify assignee
    if todo.todo_type == 'assigned' and todo.assigned_to:
        _notify(
            recipient=todo.assigned_to, actor=user,
            notif_type='task_assigned',
            title='New Task Assigned to You',
            message=f'{name} assigned you a task: "{task_preview}"',
            todo=todo,
        )

    serializer = TodoSerializer(todo)
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def todo_detail(request, todo_id):
    """Update or delete a specific todo."""
    todo = get_object_or_404(Todo, id=todo_id)

    if request.method == 'PUT':
        completed = request.data.get('completed')
        if completed is not None:
            # For group/assigned tasks: member marks pending, leader confirms
            if todo.todo_type in ('group', 'assigned') and todo.is_confirmed:
                if todo.user_id != request.user.id and todo.assigned_to_id != request.user.id:
                    # Check if the user is in the group
                    if not todo.group or not (
                        todo.group.leader_id == request.user.id or
                        TaskGroupMember.objects.filter(group=todo.group, user=request.user).exists()
                    ):
                        return Response({'error': 'Not authorized.'}, status=status.HTTP_403_FORBIDDEN)

                # If user is a member (not leader), set pending
                if todo.group and todo.group.leader_id != request.user.id:
                    todo.pending_completion = True
                    todo.save()
                    # Notify leader about pending completion
                    if todo.group.leader:
                        _notify(
                            recipient=todo.group.leader, actor=request.user,
                            notif_type='completion_requested',
                            title='Completion Pending Approval',
                            message=f'{_actor_name(request.user)} marked "{todo.task[:60]}" as complete — awaiting your confirmation',
                            todo=todo,
                        )
                    return Response(TodoSerializer(todo).data)

            todo.completed = completed
            todo.save()
        return Response(TodoSerializer(todo).data)

    elif request.method == 'DELETE':
        # Only owner, group leader, or assigned_by can delete
        can_delete = (
            todo.user_id == request.user.id or
            (todo.group and todo.group.leader_id == request.user.id) or
            todo.assigned_by_id == request.user.id
        )
        if not can_delete:
            return Response({'error': 'Not authorized.'}, status=status.HTTP_403_FORBIDDEN)
        todo.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def todo_confirm(request, todo_id):
    """Leader confirms a suggested group todo."""
    todo = get_object_or_404(Todo, id=todo_id)
    user = request.user

    if not todo.group or todo.group.leader_id != user.id:
        return Response({'error': 'Only the group leader can confirm.'}, status=status.HTTP_403_FORBIDDEN)

    # Update with any edits from the leader
    data = request.data
    if data.get('task'):
        todo.task = data['task']
    if data.get('description') is not None:
        todo.description = data['description']
    if data.get('start_date'):
        todo.start_date = data['start_date']
    if data.get('deadline'):
        todo.deadline = data['deadline']
    if data.get('assigned_to'):
        todo.assigned_to_id = data['assigned_to']
        todo.todo_type = 'assigned'
        todo.date_assigned = timezone.now()

    todo.is_confirmed = True
    todo.assigned_by = user
    todo.save()

    # Notify the suggester that their task was confirmed
    if todo.suggested_by:
        _notify(
            recipient=todo.suggested_by, actor=user,
            notif_type='task_confirmed',
            title='Your Suggested Task Was Approved',
            message=f'Your task suggestion "{todo.task[:60]}" was approved by {_actor_name(user)}',
            todo=todo,
        )
    # If assigned to someone, notify assignee
    if todo.assigned_to:
        _notify(
            recipient=todo.assigned_to, actor=user,
            notif_type='task_assigned',
            title='New Task Assigned to You',
            message=f'{_actor_name(user)} assigned you a task: "{todo.task[:60]}"',
            todo=todo,
        )

    return Response(TodoSerializer(todo).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def todo_confirm_completion(request, todo_id):
    """Leader confirms a member's completion request."""
    todo = get_object_or_404(Todo, id=todo_id)
    user = request.user

    if not todo.group or todo.group.leader_id != user.id:
        return Response({'error': 'Only the group leader can confirm completion.'}, status=status.HTTP_403_FORBIDDEN)

    todo.completed = True
    todo.pending_completion = False
    todo.save()

    # Notify task owner that completion was confirmed
    task_owner = todo.assigned_to or todo.user
    _notify(
        recipient=task_owner, actor=user,
        notif_type='completion_confirmed',
        title='Task Completion Confirmed',
        message=f'{_actor_name(user)} confirmed completion of "{todo.task[:60]}" — great job!',
        todo=todo,
    )

    return Response(TodoSerializer(todo).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def todo_reject_completion(request, todo_id):
    """Leader rejects a member's completion request."""
    todo = get_object_or_404(Todo, id=todo_id)
    user = request.user

    if not todo.group or todo.group.leader_id != user.id:
        return Response({'error': 'Only the group leader can reject completion.'}, status=status.HTTP_403_FORBIDDEN)

    todo.pending_completion = False
    todo.save()

    # Notify task owner that completion was rejected
    task_owner = todo.assigned_to or todo.user
    _notify(
        recipient=task_owner, actor=user,
        notif_type='completion_rejected',
        title='Task Completion Rejected',
        message=f'{_actor_name(user)} rejected your completion of "{todo.task[:60]}" — please review and retry',
        todo=todo,
    )

    return Response(TodoSerializer(todo).data)


# ─── Groups ──────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def groups_list_create(request):
    """List all groups or create a new group."""
    if request.method == 'GET':
        groups = TaskGroup.objects.select_related('leader', 'created_by').prefetch_related('members__user').all()
        serializer = TaskGroupSerializer(groups, many=True)
        return Response(serializer.data)

    # POST — create group
    user = request.user
    name = request.data.get('name', '').strip()
    description = request.data.get('description', '')

    if not name:
        return Response({'error': 'Group name is required.'}, status=status.HTTP_400_BAD_REQUEST)

    # Leaders can only create one group
    if getattr(user, 'is_leader', False) and TaskGroup.objects.filter(leader=user).exists():
        return Response({'error': 'You already lead a group.'}, status=status.HTTP_400_BAD_REQUEST)

    group = TaskGroup.objects.create(
        name=name,
        description=description,
        leader=user,
        created_by=user
    )
    serializer = TaskGroupSerializer(group)
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def group_delete(request, group_id):
    """Delete a group (leader or coordinator only)."""
    group = get_object_or_404(TaskGroup, id=group_id)
    user = request.user

    is_coordinator = user.role == 'site_coordinator'
    if group.leader_id != user.id and not is_coordinator and not user.is_staff:
        return Response({'error': 'Not authorized.'}, status=status.HTTP_403_FORBIDDEN)

    group.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def group_add_member(request, group_id):
    """Add a member to a group."""
    group = get_object_or_404(TaskGroup, id=group_id)
    user_id = request.data.get('user_id')

    if not user_id:
        return Response({'error': 'user_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

    target_user = get_object_or_404(CustomUser, id=user_id)

    # Check if user is already in a group
    if TaskGroupMember.objects.filter(user=target_user).exists():
        return Response({'error': 'User is already in a group.'}, status=status.HTTP_400_BAD_REQUEST)

    TaskGroupMember.objects.create(group=group, user=target_user)
    serializer = TaskGroupSerializer(group)
    return Response(serializer.data)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def group_remove_member(request, group_id, user_id):
    """Remove a member from a group."""
    membership = get_object_or_404(TaskGroupMember, group_id=group_id, user_id=user_id)
    membership.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


# ─── User Management for Todos ───────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def available_users(request):
    """Get users not currently in any group."""
    in_group_ids = TaskGroupMember.objects.values_list('user_id', flat=True)
    leader_ids = TaskGroup.objects.values_list('leader_id', flat=True)
    excluded_ids = set(list(in_group_ids) + [i for i in leader_ids if i])

    users = CustomUser.objects.filter(is_active=True).exclude(id__in=excluded_ids)
    serializer = UserMiniSerializer(users, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_interns(request):
    """List interns (for coordinator leader management)."""
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
    target = get_object_or_404(CustomUser, id=user_id)
    target.is_leader = True
    target.save(update_fields=['is_leader'])
    return Response({'message': f'{target} is now a leader.'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def remove_leader(request, user_id):
    """Demote a user from leader."""
    target = get_object_or_404(CustomUser, id=user_id)
    target.is_leader = False
    target.save(update_fields=['is_leader'])
    return Response({'message': f'{target} is no longer a leader.'})


# ─── Department Tasks ─────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def department_tasks_list_create(request):
    """List or create department tasks."""
    user = request.user

    if request.method == 'GET':
        if user.department:
            tasks = DepartmentTask.objects.filter(
                department=user.department,
                deleted_at__isnull=True
            ).select_related('suggested_by', 'grabbed_by', 'completed_by', 'department')
        else:
            tasks = DepartmentTask.objects.none()
        serializer = DepartmentTaskSerializer(tasks, many=True)
        return Response(serializer.data)

    # POST — create department task
    if not user.department:
        return Response({'error': 'You must belong to a department.'}, status=status.HTTP_400_BAD_REQUEST)

    task_name = request.data.get('task', '').strip()
    if not task_name:
        return Response({'error': 'Task name is required.'}, status=status.HTTP_400_BAD_REQUEST)

    dept_task = DepartmentTask.objects.create(
        task=task_name,
        description=request.data.get('description', ''),
        department=user.department,
        suggested_by=user,
        start_date=request.data.get('start_date'),
        deadline=request.data.get('deadline'),
        priority=request.data.get('priority'),
    )

    # Refresh stats
    DepartmentTaskStats.refresh_for_department(user.department_id)

    serializer = DepartmentTaskSerializer(dept_task)
    return Response(serializer.data, status=status.HTTP_201_CREATED)


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
    user = request.user

    if task.status != 'suggested':
        return Response({'error': 'Task is not available to grab.'}, status=status.HTTP_400_BAD_REQUEST)

    task.status = 'grabbed'
    task.grabbed_by = user
    task.grabbed_at = timezone.now()
    task.save()

    # Notify the suggester that their task was grabbed
    if task.suggested_by:
        _notify(
            recipient=task.suggested_by, actor=user,
            notif_type='dept_task_grabbed',
            title='Dept. Task Grabbed',
            message=f'{_actor_name(user)} grabbed your department task: "{task.task[:60]}"',
            dept_task=task,
        )

    DepartmentTaskStats.refresh_for_department(task.department_id)
    serializer = DepartmentTaskSerializer(task)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def department_task_complete(request, task_id):
    """Complete a department task."""
    task = get_object_or_404(DepartmentTask, id=task_id, deleted_at__isnull=True)
    user = request.user

    if task.status != 'grabbed':
        return Response({'error': 'Task must be grabbed first.'}, status=status.HTTP_400_BAD_REQUEST)

    task.status = 'completed'
    task.completed_by = user
    task.completed_at = timezone.now()
    task.save()

    # Notify the suggester that their task was completed
    if task.suggested_by:
        _notify(
            recipient=task.suggested_by, actor=user,
            notif_type='dept_task_completed',
            title='Dept. Task Completed',
            message=f'{_actor_name(user)} completed your department task: "{task.task[:60]}"',
            dept_task=task,
        )

    DepartmentTaskStats.refresh_for_department(task.department_id)
    serializer = DepartmentTaskSerializer(task)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def department_task_abandon(request, task_id):
    """Abandon a grabbed department task."""
    task = get_object_or_404(DepartmentTask, id=task_id, deleted_at__isnull=True)

    if task.status != 'grabbed':
        return Response({'error': 'Only grabbed tasks can be abandoned.'}, status=status.HTTP_400_BAD_REQUEST)

    abandoner = request.user
    # Reset task back to suggested so it can be grabbed again
    task.status = 'suggested'
    task.grabbed_by = None
    task.grabbed_at = None
    task.abandoned_at = timezone.now()
    task.save()

    # Notify the suggester that their task was abandoned
    if task.suggested_by:
        _notify(
            recipient=task.suggested_by, actor=abandoner,
            notif_type='dept_task_abandoned',
            title='Dept. Task Abandoned',
            message=f'{_actor_name(abandoner)} abandoned your department task: "{task.task[:60]}"',
            dept_task=task,
        )

    DepartmentTaskStats.refresh_for_department(task.department_id)
    serializer = DepartmentTaskSerializer(task)
    return Response(serializer.data)


# ─── Notifications ────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def notifications_list(request):
    """List current user's notifications (newest first, max 50)."""
    notifications = TodoNotification.objects.filter(
        recipient=request.user
    ).select_related('actor')[:50]
    serializer = TodoNotificationSerializer(notifications, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def notification_mark_read(request, notif_id):
    """Mark a single notification as read."""
    notif = get_object_or_404(TodoNotification, id=notif_id, recipient=request.user)
    notif.is_read = True
    notif.save()
    return Response({'status': 'ok'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def notifications_mark_all_read(request):
    """Mark all of the current user's notifications as read."""
    TodoNotification.objects.filter(recipient=request.user, is_read=False).update(is_read=True)
    return Response({'status': 'ok'})
