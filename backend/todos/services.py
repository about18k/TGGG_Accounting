"""
Business logic services for todos app.
Handles all complex operations separate from views/serializers.
"""
from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.db.models import Q

from accounts.models import CustomUser
from .models import (
    TaskGroup, TaskGroupMember, Todo,
    DepartmentTask, DepartmentTaskStats, TodoNotification
)


class NotificationService:
    """Centralized notification creation & management."""

    @staticmethod
    def create_notification(recipient, actor, notif_type, title, message, todo=None, dept_task=None):
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

    @staticmethod
    def get_actor_name(user):
        """Return a display name for a user."""
        if user.first_name or user.last_name:
            return f"{user.first_name} {user.last_name}".strip()
        return user.email


class UserProfileService:
    """Handle user profile operations."""

    @staticmethod
    def get_profile_payload(user):
        """Build complete user profile with group/leader info."""
        group_membership = TaskGroupMember.objects.filter(user=user).select_related('group').first()
        led_group = TaskGroup.objects.filter(leader=user).first()

        return {
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
            'signature_image': user.signature_image,
            'payroll_allowance_eligible': bool(user.payroll_allowance_eligible),
            'is_leader': getattr(user, 'is_leader', False),
            'group_id': group_membership.group_id if group_membership else (led_group.id if led_group else None),
        }

    @staticmethod
    def update_profile(user, data):
        """Update user profile fields."""
        updated_fields = []

        # Handle full_name
        if 'full_name' in data:
            full_name = str(data.get('full_name') or '').strip()
            name_parts = full_name.split(None, 1)
            user.first_name = name_parts[0] if name_parts else ''
            user.last_name = name_parts[1] if len(name_parts) > 1 else ''
            updated_fields.extend(['first_name', 'last_name'])

        # Handle individual name fields
        if 'first_name' in data:
            user.first_name = str(data.get('first_name') or '').strip()
            updated_fields.append('first_name')

        if 'last_name' in data:
            user.last_name = str(data.get('last_name') or '').strip()
            updated_fields.append('last_name')

        # Handle email with uniqueness check
        if 'email' in data:
            next_email = str(data.get('email') or '').strip().lower()
            if not next_email:
                raise ValueError('Email is required.')
            if CustomUser.objects.filter(email=next_email).exclude(id=user.id).exists():
                raise ValueError('Email is already in use.')
            user.email = next_email
            updated_fields.append('email')

        if updated_fields:
            user.save(update_fields=sorted(set(updated_fields)))
        
        return user


class TodoService:
    """Handle todo CRUD and state transitions."""

    @staticmethod
    def list_todos(user, todo_type='personal'):
        """List todos filtered by type."""
        opt = ('group', 'assigned_to', 'assigned_by', 'suggested_by', 'user')

        if todo_type == 'personal':
            return Todo.objects.select_related(*opt).filter(user=user, todo_type='personal')
        
        elif todo_type == 'team':
            # Get confirmed group/assigned todos for user's groups
            user_group_ids = list(TaskGroupMember.objects.filter(user=user).values_list('group_id', flat=True))
            led_group_ids = list(TaskGroup.objects.filter(leader=user).values_list('id', flat=True))
            all_group_ids = list(set(user_group_ids + led_group_ids))

            return Todo.objects.select_related(*opt).filter(
                Q(group_id__in=all_group_ids, is_confirmed=True) |
                Q(assigned_to=user, todo_type='assigned')
            )
        
        elif todo_type == 'group':
            # For manage tab: show all group todos
            led_group_ids = list(TaskGroup.objects.filter(leader=user).values_list('id', flat=True))
            return Todo.objects.select_related(*opt).filter(group_id__in=led_group_ids)
        
        return Todo.objects.select_related(*opt).filter(user=user)

    @staticmethod
    def create_todo(user, data):
        """Create a new todo with appropriate defaults and notifications."""
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
                raise ValueError('group_id is required for group todos.')
            group = get_object_or_404(TaskGroup, id=group_id)
            todo.group = group
            
            # Auto-confirm if creator is leader, else it's a suggestion
            if group.leader_id == user.id:
                todo.is_confirmed = True
                todo.assigned_by = user
            else:
                todo.is_confirmed = False
                todo.suggested_by = user

        elif todo.todo_type == 'assigned':
            assigned_to_id = data.get('assigned_to')
            if not assigned_to_id:
                raise ValueError('assigned_to is required.')
            todo.assigned_to_id = assigned_to_id
            todo.assigned_by = user
            todo.is_confirmed = True
            todo.date_assigned = timezone.now()
            
            # Set group if user leads one
            led_group = TaskGroup.objects.filter(leader=user).first()
            if led_group:
                todo.group = led_group

        elif todo.todo_type == 'personal':
            todo.is_confirmed = True

        todo.save()
        TodoService._send_creation_notifications(user, todo)
        return todo

    @staticmethod
    def _send_creation_notifications(user, todo):
        """Send notifications when todo is created."""
        actor_name = NotificationService.get_actor_name(user)
        task_preview = todo.task[:60]
        
        # Suggest to leader for review
        if todo.todo_type == 'group' and not todo.is_confirmed and todo.group and todo.group.leader:
            NotificationService.create_notification(
                recipient=todo.group.leader,
                actor=user,
                notif_type='task_suggested',
                title='Task Suggested for Approval',
                message=f'{actor_name} suggested a new team task: "{task_preview}"',
                todo=todo,
            )
        
        # Notify assignee
        if todo.todo_type == 'assigned' and todo.assigned_to:
            NotificationService.create_notification(
                recipient=todo.assigned_to,
                actor=user,
                notif_type='task_assigned',
                title='New Task Assigned to You',
                message=f'{actor_name} assigned you a task: "{task_preview}"',
                todo=todo,
            )

    @staticmethod
    def update_todo_completion(todo, user, completed_value):
        """Handle todo completion with leader confirmation workflow."""
        # For group/assigned tasks: member marks pending, leader confirms
        if todo.todo_type in ('group', 'assigned') and todo.is_confirmed:
            is_authorized = (
                todo.user_id == user.id or
                todo.assigned_to_id == user.id or
                (todo.group and todo.group.leader_id == user.id)
            )
            
            if not is_authorized:
                # Check group membership
                if not todo.group or not (
                    todo.group.leader_id == user.id or
                    TaskGroupMember.objects.filter(group=todo.group, user=user).exists()
                ):
                    raise PermissionError('Not authorized.')

            # Member marks as pending (not leader)
            if todo.group and todo.group.leader_id != user.id:
                todo.pending_completion = True
                todo.save()
                
                if todo.group.leader:
                    actor_name = NotificationService.get_actor_name(user)
                    NotificationService.create_notification(
                        recipient=todo.group.leader,
                        actor=user,
                        notif_type='completion_requested',
                        title='Completion Pending Approval',
                        message=f'{actor_name} marked "{todo.task[:60]}" as complete — awaiting your confirmation',
                        todo=todo,
                    )
                return todo

        todo.completed = completed_value
        todo.save()
        return todo

    @staticmethod
    def confirm_todo(todo, user, data):
        """Leader confirms a suggested task."""
        if not todo.group or todo.group.leader_id != user.id:
            raise PermissionError('Only the group leader can confirm.')

        # Apply any edits from leader
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

        actor_name = NotificationService.get_actor_name(user)
        
        # Notify suggester
        if todo.suggested_by:
            NotificationService.create_notification(
                recipient=todo.suggested_by,
                actor=user,
                notif_type='task_confirmed',
                title='Your Suggested Task Was Approved',
                message=f'Your task suggestion "{todo.task[:60]}" was approved by {actor_name}',
                todo=todo,
            )
        
        # Notify assignee if assigned
        if todo.assigned_to:
            NotificationService.create_notification(
                recipient=todo.assigned_to,
                actor=user,
                notif_type='task_assigned',
                title='New Task Assigned to You',
                message=f'{actor_name} assigned you a task: "{todo.task[:60]}"',
                todo=todo,
            )

        return todo

    @staticmethod
    def confirm_completion(todo, user):
        """Leader confirms member's completion request."""
        if not todo.group or todo.group.leader_id != user.id:
            raise PermissionError('Only the group leader can confirm completion.')

        todo.completed = True
        todo.pending_completion = False
        todo.save()

        actor_name = NotificationService.get_actor_name(user)
        task_owner = todo.assigned_to or todo.user
        NotificationService.create_notification(
            recipient=task_owner,
            actor=user,
            notif_type='completion_confirmed',
            title='Task Completion Confirmed',
            message=f'{actor_name} confirmed completion of "{todo.task[:60]}" — great job!',
            todo=todo,
        )

        return todo

    @staticmethod
    def reject_completion(todo, user):
        """Reject a completion request."""
        is_leader = todo.group and todo.group.leader_id == user.id
        is_owner = todo.assigned_to_id == user.id or todo.user_id == user.id
        is_coordinator = user.role == 'site_coordinator'

        if not (is_leader or is_owner or is_coordinator):
            raise PermissionError('Not authorized to reject completion.')

        todo.pending_completion = False
        todo.save()

        # Only notify if rejected by leader/coordinator (not self-cancel)
        if is_leader or is_coordinator:
            actor_name = NotificationService.get_actor_name(user)
            task_owner = todo.assigned_to or todo.user
            NotificationService.create_notification(
                recipient=task_owner,
                actor=user,
                notif_type='completion_rejected',
                title='Task Completion Rejected',
                message=f'{actor_name} rejected your completion of "{todo.task[:60]}" — please review and retry',
                todo=todo,
            )

        return todo

    @staticmethod
    def delete_todo(todo, user):
        """Delete a todo (owner, group leader, or assigned_by only)."""
        can_delete = (
            todo.user_id == user.id or
            (todo.group and todo.group.leader_id == user.id) or
            todo.assigned_by_id == user.id
        )
        if not can_delete:
            raise PermissionError('Not authorized.')
        
        todo.delete()


class GroupService:
    """Handle task groups and membership."""

    @staticmethod
    def create_group(user, data):
        """Create a new task group."""
        name = data.get('name', '').strip()
        description = data.get('description', '')
        leader_id = data.get('leader_id')

        if not name:
            raise ValueError('Group name is required.')

        is_privileged = user.role in ['studio_head', 'admin'] or user.is_staff
        target_leader = user

        if leader_id and is_privileged:
            target_leader = get_object_or_404(CustomUser, id=leader_id)

        # Check if leader already leads a group
        if not is_privileged and getattr(user, 'is_leader', False):
            if TaskGroup.objects.filter(leader=user).exists():
                raise ValueError('You already lead a group.')
        
        if target_leader and TaskGroup.objects.filter(leader=target_leader).exists():
            raise ValueError('The selected user already leads another group.')

        group = TaskGroup.objects.create(
            name=name,
            description=description,
            leader=target_leader,
            created_by=user
        )
        
        # Ensure leader has is_leader=True
        if target_leader and not getattr(target_leader, 'is_leader', False):
            target_leader.is_leader = True
            target_leader.save(update_fields=['is_leader'])

        return group

    @staticmethod
    def add_member(group, user_id):
        """Add a member to a group."""
        target_user = get_object_or_404(CustomUser, id=user_id)

        # Check if user already in a group
        if TaskGroupMember.objects.filter(user=target_user).exists():
            raise ValueError('User is already in a group.')

        return TaskGroupMember.objects.create(group=group, user=target_user)

    @staticmethod
    def delete_group(group, user):
        """Delete a group (leader, coordinator, or privileged only)."""
        is_coordinator = user.role == 'site_coordinator'
        is_privileged = user.role in ['studio_head', 'admin'] or user.is_staff
        
        if group.leader_id != user.id and not is_coordinator and not is_privileged:
            raise PermissionError('Not authorized.')
        
        group.delete()


class DepartmentTaskService:
    """Handle department-level tasks."""

    @staticmethod
    def create_task(user, data):
        """Create a department task."""
        if not user.department:
            raise ValueError('You must belong to a department.')

        task_name = data.get('task', '').strip()
        if not task_name:
            raise ValueError('Task name is required.')

        task = DepartmentTask.objects.create(
            task=task_name,
            description=data.get('description', ''),
            department=user.department,
            suggested_by=user,
            start_date=data.get('start_date'),
            deadline=data.get('deadline'),
            priority=data.get('priority'),
        )

        DepartmentTaskStats.refresh_for_department(user.department_id)
        return task

    @staticmethod
    def grab_task(task, user):
        """Mark a task as grabbed by a user."""
        if task.status != 'suggested':
            raise ValueError('Task is not available to grab.')

        task.status = 'grabbed'
        task.grabbed_by = user
        task.grabbed_at = timezone.now()
        task.save()

        actor_name = NotificationService.get_actor_name(user)
        if task.suggested_by:
            NotificationService.create_notification(
                recipient=task.suggested_by,
                actor=user,
                notif_type='dept_task_grabbed',
                title='Dept. Task Grabbed',
                message=f'{actor_name} grabbed your department task: "{task.task[:60]}"',
                dept_task=task,
            )

        DepartmentTaskStats.refresh_for_department(task.department_id)
        return task

    @staticmethod
    def complete_task(task, user):
        """Mark a task as completed."""
        if task.status != 'grabbed':
            raise ValueError('Task must be grabbed first.')

        task.status = 'completed'
        task.completed_by = user
        task.completed_at = timezone.now()
        task.save()

        actor_name = NotificationService.get_actor_name(user)
        if task.suggested_by:
            NotificationService.create_notification(
                recipient=task.suggested_by,
                actor=user,
                notif_type='dept_task_completed',
                title='Dept. Task Completed',
                message=f'{actor_name} completed your department task: "{task.task[:60]}"',
                dept_task=task,
            )

        DepartmentTaskStats.refresh_for_department(task.department_id)
        return task

    @staticmethod
    def abandon_task(task, user):
        """Abandon a grabbed task (returns to suggested)."""
        if task.status != 'grabbed':
            raise ValueError('Only grabbed tasks can be abandoned.')

        task.status = 'suggested'
        task.grabbed_by = None
        task.grabbed_at = None
        task.abandoned_at = timezone.now()
        task.save()

        actor_name = NotificationService.get_actor_name(user)
        if task.suggested_by:
            NotificationService.create_notification(
                recipient=task.suggested_by,
                actor=user,
                notif_type='dept_task_abandoned',
                title='Dept. Task Abandoned',
                message=f'{actor_name} abandoned your department task: "{task.task[:60]}"',
                dept_task=task,
            )

        DepartmentTaskStats.refresh_for_department(task.department_id)
        return task
