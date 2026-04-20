from django.test import TestCase
from django.db import OperationalError
from django.core.cache import cache
from django.test.utils import override_settings
from rest_framework.test import APIRequestFactory, force_authenticate
from rest_framework import status
from unittest.mock import patch

from accounts.models import CustomUser
from todos.models import TaskGroup, TaskGroupMember, Todo, TodoNotification
from todos.views import (
    groups_list_create,
    todo_detail,
    todos_list_create,
    group_remove_member,
    notifications_list,
    notification_mark_read,
    notifications_mark_all_read,
)
from todos.serializers import TaskGroupSerializer


# ─────────────────────────────── Helper Mixin ───────────────────────────────


class TodoTestMixin:
    """Shared helper methods for creating test users and groups."""

    def create_user(self, email, is_leader=False, role='employee', **kwargs):
        """Create a test user with sensible defaults."""
        username = email.split('@')[0]
        return CustomUser.objects.create_user(
            email=email,
            username=username,
            password='testpass123',
            first_name=kwargs.get('first_name', username.capitalize()),
            last_name=kwargs.get('last_name', 'User'),
            is_leader=is_leader,
            role=role,
        )

    def create_group(self, name, leader):
        """Create a TaskGroup with the given leader."""
        return TaskGroup.objects.create(
            name=name,
            leader=leader,
            created_by=leader,
        )


# ────────────────────────────── Group Create Tests ──────────────────────────


class GroupCreateTest(TodoTestMixin, TestCase):
    """Tests for creating task groups via the groups_list_create view."""

    def setUp(self):
        self.factory = APIRequestFactory()
        self.leader = self.create_user('leader@test.com', is_leader=True)

    def test_leader_can_create_group(self):
        """A leader should be able to create a new group."""
        request = self.factory.post(
            '/api/todos/groups/',
            {'name': 'Test Group'},
            format='json',
        )
        force_authenticate(request, user=self.leader)

        response = groups_list_create(request)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], 'Test Group')
        self.assertEqual(TaskGroup.objects.count(), 1)

    def test_create_group_without_name_fails(self):
        """Creating a group without a name should return 400."""
        request = self.factory.post(
            '/api/todos/groups/',
            {'name': ''},
            format='json',
        )
        force_authenticate(request, user=self.leader)

        response = groups_list_create(request)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_leader_cannot_create_second_group(self):
        """A non-privileged leader who already leads a group cannot create another."""
        self.create_group('Existing Group', self.leader)

        request = self.factory.post(
            '/api/todos/groups/',
            {'name': 'Second Group'},
            format='json',
        )
        force_authenticate(request, user=self.leader)

        response = groups_list_create(request)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_list_groups(self):
        """GET request should return all groups."""
        self.create_group('Group A', self.leader)

        request = self.factory.get('/api/todos/groups/')
        force_authenticate(request, user=self.leader)

        response = groups_list_create(request)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)


# ────────────────────────────── Serializer Tests ────────────────────────────


class GroupSerializerTest(TodoTestMixin, TestCase):
    """Tests for TaskGroupSerializer output."""

    def setUp(self):
        self.leader = self.create_user('leader@test.com', is_leader=True)
        self.member_user = self.create_user('member@test.com')
        self.group = self.create_group('Serializer Test Group', self.leader)
        TaskGroupMember.objects.create(group=self.group, user=self.member_user)

    def test_serializer_includes_members(self):
        """Serialized group data should contain the members list."""
        serializer = TaskGroupSerializer(self.group)
        data = serializer.data

        self.assertEqual(data['name'], 'Serializer Test Group')
        self.assertEqual(len(data['members']), 1)
        self.assertEqual(data['members'][0]['user']['email'], 'member@test.com')

    def test_serializer_includes_leader_info(self):
        """Serialized group data should include leader details."""
        serializer = TaskGroupSerializer(self.group)
        data = serializer.data

        self.assertIsNotNone(data['leader'])
        self.assertEqual(data['leader']['email'], 'leader@test.com')
        self.assertIn('leader_name', data)

    def test_serializer_without_members(self):
        """A group with no members should serialize with an empty members list."""
        empty_leader = self.create_user('solo@test.com', is_leader=True)
        empty_group = self.create_group('Empty Group', empty_leader)

        serializer = TaskGroupSerializer(empty_group)
        data = serializer.data

        self.assertEqual(data['members'], [])


# ──────────────────────────── Leader Complete Tests ─────────────────────────


class LeaderCompleteTest(TodoTestMixin, TestCase):
    """Tests for a leader completing self-assigned tasks."""

    def setUp(self):
        self.factory = APIRequestFactory()
        self.leader = self.create_user('leader@test.com', is_leader=True)
        self.group = self.create_group('Leader Group', self.leader)

    def test_leader_can_create_assigned_task(self):
        """Leader should be able to create a task assigned to themselves."""
        request = self.factory.post(
            '/api/todos/',
            {
                'task': 'Test self-assigned task',
                'todo_type': 'assigned',
                'assigned_to': self.leader.id,
            },
            format='json',
        )
        force_authenticate(request, user=self.leader)

        response = todos_list_create(request)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['task'], 'Test self-assigned task')

    def test_leader_can_complete_own_task(self):
        """Leader should be able to mark their own assigned task as complete."""
        todo = Todo.objects.create(
            user=self.leader,
            task='Task to complete',
            todo_type='assigned',
            assigned_to=self.leader,
            assigned_by=self.leader,
            is_confirmed=True,
            group=self.group,
        )

        request = self.factory.put(
            f'/api/todos/{todo.id}/',
            {'completed': True},
            format='json',
        )
        force_authenticate(request, user=self.leader)

        response = todo_detail(request, todo_id=str(todo.id))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        todo.refresh_from_db()
        self.assertTrue(todo.completed)

    def test_member_completion_goes_to_pending(self):
        """A member completing a group task should set pending_completion, not completed."""
        member = self.create_user('member@test.com')
        TaskGroupMember.objects.create(group=self.group, user=member)

        todo = Todo.objects.create(
            user=self.leader,
            task='Member task',
            todo_type='group',
            is_confirmed=True,
            group=self.group,
        )

        request = self.factory.put(
            f'/api/todos/{todo.id}/',
            {'completed': True},
            format='json',
        )
        force_authenticate(request, user=member)

        response = todo_detail(request, todo_id=str(todo.id))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        todo.refresh_from_db()
        self.assertTrue(todo.pending_completion)
        self.assertFalse(todo.completed)


# ──────────────────────────── Remove Member Tests ───────────────────────────


class RemoveMemberTest(TodoTestMixin, TestCase):
    """Tests for removing a member from a group."""

    def setUp(self):
        self.factory = APIRequestFactory()
        self.leader = self.create_user('leader@test.com', is_leader=True)
        self.member_user = self.create_user('member@test.com')
        self.group = self.create_group('Remove Test Group', self.leader)
        self.membership = TaskGroupMember.objects.create(
            group=self.group,
            user=self.member_user,
        )

    def test_leader_can_remove_member(self):
        """Leader should be able to remove a member from their group."""
        request = self.factory.delete(
            f'/api/todos/groups/{self.group.id}/members/{self.member_user.id}/',
        )
        force_authenticate(request, user=self.leader)

        response = group_remove_member(
            request,
            group_id=str(self.group.id),
            user_id=str(self.member_user.id),
        )

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(
            TaskGroupMember.objects.filter(
                group=self.group,
                user=self.member_user,
            ).exists()
        )

    def test_remove_nonexistent_member_returns_404(self):
        """Removing a user who is not a member should return 404."""
        non_member = self.create_user('stranger@test.com')

        request = self.factory.delete(
            f'/api/todos/groups/{self.group.id}/members/{non_member.id}/',
        )
        force_authenticate(request, user=self.leader)

        response = group_remove_member(
            request,
            group_id=str(self.group.id),
            user_id=str(non_member.id),
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_member_count_decreases_after_removal(self):
        """Group member count should decrease by 1 after removal."""
        initial_count = TaskGroupMember.objects.filter(group=self.group).count()

        request = self.factory.delete(
            f'/api/todos/groups/{self.group.id}/members/{self.member_user.id}/',
        )
        force_authenticate(request, user=self.leader)

        group_remove_member(
            request,
            group_id=str(self.group.id),
            user_id=str(self.member_user.id),
        )

        self.assertEqual(
            TaskGroupMember.objects.filter(group=self.group).count(),
            initial_count - 1,
        )


class NotificationEndpointResilienceTest(TodoTestMixin, TestCase):
    """Ensure notification endpoints degrade gracefully on DB connectivity errors."""

    def setUp(self):
        self.factory = APIRequestFactory()
        self.user = self.create_user('notif@test.com')

    @patch('todos.views.TodoNotification.objects.filter')
    def test_notifications_list_returns_503_on_operational_error(self, mock_filter):
        mock_filter.side_effect = OperationalError('connection timed out')

        request = self.factory.get('/api/notifications')
        force_authenticate(request, user=self.user)

        response = notifications_list(request)

        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertIn('temporarily unavailable', response.data['error'].lower())

    @patch('todos.views.get_object_or_404')
    def test_notification_mark_read_returns_503_on_operational_error(self, mock_get_object):
        mock_get_object.side_effect = OperationalError('connection timed out')

        request = self.factory.post('/api/notifications/1/read/')
        force_authenticate(request, user=self.user)

        response = notification_mark_read(request, notif_id='1')

        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertIn('temporarily unavailable', response.data['error'].lower())

    @patch('todos.views.TodoNotification.objects.filter')
    def test_notifications_mark_all_read_returns_503_on_operational_error(self, mock_filter):
        mock_filter.side_effect = OperationalError('connection timed out')

        request = self.factory.post('/api/notifications/read-all/')
        force_authenticate(request, user=self.user)

        response = notifications_mark_all_read(request)

        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertIn('temporarily unavailable', response.data['error'].lower())


class NotificationCacheLifecycleTests(TodoTestMixin, TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.user = self.create_user('cache-notif-user@test.com')
        self.actor = self.create_user('cache-notif-actor@test.com')

    @override_settings(ENABLE_API_RESPONSE_CACHE=True)
    def test_notifications_list_populates_cache(self):
        cache.clear()
        TodoNotification.objects.create(
            recipient=self.user,
            actor=self.actor,
            type='task_assigned',
            title='Task Assigned',
            message='You have a new task.',
        )

        request = self.factory.get('/api/notifications')
        force_authenticate(request, user=self.user)

        response = notifications_list(request)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        cache_key = f'todos:notifications:user:{self.user.id}'
        self.assertIsNotNone(cache.get(cache_key))

    @override_settings(ENABLE_API_RESPONSE_CACHE=True)
    def test_mark_read_clears_cached_notifications(self):
        cache.clear()
        notif = TodoNotification.objects.create(
            recipient=self.user,
            actor=self.actor,
            type='task_assigned',
            title='Task Assigned',
            message='You have a new task.',
        )

        cache_key = f'todos:notifications:user:{self.user.id}'
        cache.set(cache_key, [{'id': notif.id}], timeout=60)

        request = self.factory.post(f'/api/notifications/{notif.id}/read/')
        force_authenticate(request, user=self.user)

        response = notification_mark_read(request, notif_id=str(notif.id))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(cache.get(cache_key))
