from rest_framework import serializers
from .models import CustomUser, Department, PERMISSION_CHOICES


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ['id', 'name', 'description', 'created_at', 'updated_at']


class CustomUserSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True)
    role_name = serializers.SerializerMethodField()
    permissions = serializers.ListField(
        child=serializers.ChoiceField(choices=PERMISSION_CHOICES),
        required=False
    )

    def get_role_name(self, obj):
        return obj.get_role_display() if obj.role else None

    class Meta:
        model = CustomUser
        fields = [
            'id', 'email', 'username', 'first_name', 'last_name',
            'department', 'department_name', 'role', 'role_name',
            'permissions', 'phone_number', 'employee_id',
            'is_active', 'is_leader', 'date_hired', 'profile_picture', 'signature_image',
            'payroll_allowance_eligible', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class PendingUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ['id', 'email', 'first_name', 'last_name', 'created_at']
