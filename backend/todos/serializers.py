from rest_framework import serializers
from .models import TaskGroup, TaskGroupMember, Todo, DepartmentTask, DepartmentTaskStats, TodoNotification


class UserMiniSerializer(serializers.Serializer):
    """Lightweight user representation for nested fields."""
    id = serializers.IntegerField()
    full_name = serializers.SerializerMethodField()
    username = serializers.CharField()
    email = serializers.EmailField()

    def get_full_name(self, obj):
        if obj.first_name or obj.last_name:
            return f"{obj.first_name} {obj.last_name}".strip()
        return obj.email


class TaskGroupMemberSerializer(serializers.ModelSerializer):
    user = UserMiniSerializer(read_only=True)
    user_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = TaskGroupMember
        fields = ['id', 'user', 'user_id', 'joined_at']


class TaskGroupSerializer(serializers.ModelSerializer):
    members = TaskGroupMemberSerializer(many=True, read_only=True)
    leader_id = serializers.IntegerField(source='leader.id', read_only=True, allow_null=True)
    leader_name = serializers.SerializerMethodField()
    created_by_id = serializers.IntegerField(source='created_by.id', read_only=True, allow_null=True)

    class Meta:
        model = TaskGroup
        fields = [
            'id', 'name', 'description', 'leader_id', 'leader_name',
            'created_by_id', 'members', 'created_at'
        ]

    def get_leader_name(self, obj):
        if obj.leader:
            if obj.leader.first_name or obj.leader.last_name:
                return f"{obj.leader.first_name} {obj.leader.last_name}".strip()
            return obj.leader.email
        return None


class TodoSerializer(serializers.ModelSerializer):
    assignee = serializers.SerializerMethodField()
    suggester = serializers.SerializerMethodField()
    owner = serializers.SerializerMethodField()

    class Meta:
        model = Todo
        fields = [
            'id', 'task', 'description', 'completed', 'todo_type',
            'group_id', 'assigned_to_id', 'assigned_by_id', 'suggested_by_id',
            'is_confirmed', 'pending_completion',
            'start_date', 'deadline', 'date_assigned',
            'created_at', 'updated_at',
            'assignee', 'suggester', 'owner'
        ]
        read_only_fields = ['created_at', 'updated_at']

    def _user_dict(self, user):
        if not user:
            return None
        return {
            'id': user.id,
            'full_name': f"{user.first_name} {user.last_name}".strip() if (user.first_name or user.last_name) else user.email,
            'username': user.username,
            'email': user.email,
        }

    def get_assignee(self, obj):
        return self._user_dict(obj.assigned_to)

    def get_suggester(self, obj):
        return self._user_dict(obj.suggested_by)

    def get_owner(self, obj):
        return self._user_dict(obj.user)


class DepartmentTaskSerializer(serializers.ModelSerializer):
    suggested_by_name = serializers.SerializerMethodField()
    grabbed_by_name = serializers.SerializerMethodField()
    completed_by_name = serializers.SerializerMethodField()
    department_name = serializers.CharField(source='department.name', read_only=True)

    # Bare ID fields the frontend uses for ownership checks
    # (e.g. task.suggested_by === userProfile.id)
    suggested_by = serializers.IntegerField(source='suggested_by_id', read_only=True)
    grabbed_by = serializers.IntegerField(source='grabbed_by_id', read_only=True, allow_null=True)
    completed_by = serializers.IntegerField(source='completed_by_id', read_only=True, allow_null=True)

    # Nested user objects the frontend uses for display
    # (e.g. task.suggester?.full_name)
    suggester = serializers.SerializerMethodField()
    grabber = serializers.SerializerMethodField()
    completer = serializers.SerializerMethodField()

    class Meta:
        model = DepartmentTask
        fields = [
            'id', 'task', 'description', 'department_id', 'department_name',
            'suggested_by_id', 'suggested_by_name', 'suggested_by', 'suggester',
            'grabbed_by_id', 'grabbed_by_name', 'grabbed_by', 'grabber',
            'completed_by_id', 'completed_by_name', 'completed_by', 'completer',
            'status', 'priority', 'start_date', 'deadline',
            'suggested_at', 'grabbed_at', 'completed_at', 'abandoned_at',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'suggested_at']

    def _get_name(self, user):
        if not user:
            return None
        if user.first_name or user.last_name:
            return f"{user.first_name} {user.last_name}".strip()
        return user.email

    def _user_dict(self, user):
        if not user:
            return None
        return {
            'id': user.id,
            'full_name': self._get_name(user),
        }

    def get_suggested_by_name(self, obj):
        return self._get_name(obj.suggested_by)

    def get_grabbed_by_name(self, obj):
        return self._get_name(obj.grabbed_by)

    def get_completed_by_name(self, obj):
        return self._get_name(obj.completed_by)

    def get_suggester(self, obj):
        return self._user_dict(obj.suggested_by)

    def get_grabber(self, obj):
        return self._user_dict(obj.grabbed_by)

    def get_completer(self, obj):
        return self._user_dict(obj.completed_by)


class DepartmentTaskStatsSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True)

    class Meta:
        model = DepartmentTaskStats
        fields = [
            'id', 'department_id', 'department_name',
            'total_tasks', 'suggested_count', 'grabbed_count',
            'completed_count', 'abandoned_count', 'last_updated'
        ]


class TodoNotificationSerializer(serializers.ModelSerializer):
    actor_name = serializers.SerializerMethodField()

    class Meta:
        model = TodoNotification
        fields = [
            'id', 'type', 'title', 'message', 'is_read',
            'actor_name', 'created_at',
            'todo_id', 'department_task_id'
        ]
        read_only_fields = ['created_at']

    def get_actor_name(self, obj):
        if not obj.actor:
            return None
        if obj.actor.first_name or obj.actor.last_name:
            return f"{obj.actor.first_name} {obj.actor.last_name}".strip()
        return obj.actor.email
