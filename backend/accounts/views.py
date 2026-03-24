import threading
import uuid

from django.conf import settings
from django.contrib.auth import authenticate
from django.core.mail import send_mail
from django.db import transaction
from django.db.models import Q
from django.utils.dateparse import parse_date
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from supabase import create_client, Client
from todos.services import NotificationService
from .models import CustomUser, Department, ROLE_CHOICES
from .serializers import CustomUserSerializer, PendingUserSerializer


def _send_approval_email_async(user_id):
    """Send account-approval email in a background thread so the HTTP response is not delayed."""
    try:
        user = CustomUser.objects.get(id=user_id)
        email_message = f"""
Hello {user.first_name} {user.last_name},

Your account has been successfully verified and approved!

Account Details:
- Email: {user.email}
- Department: {user.department.name if user.department else 'N/A'}
- Role: {user.get_role_display()}

You can now log in to the Triple G using your email and password.

If you have any questions, please contact your administrator.

Best regards,
Triple G Admin
        """.strip()
        send_mail(
            subject='Your Account Has Been Verified - Triple G',
            message=email_message,
            from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', None),
            recipient_list=[user.email],
            fail_silently=True,
        )
        print(f"✅ Approval email sent to {user.email}")
    except Exception as e:
        print(f"⚠️ Approval email failed for user_id={user_id}: {e}")


def _display_name(user):
    return f"{user.first_name} {user.last_name}".strip() or user.email


def _notify_accounting_user_verified(approved_user, approver):
    """Notify accounting users when Studio Head verifies a pending account."""
    approver_role = normalize_role_input(getattr(approver, 'role', None))
    if approver_role != 'studio_head':
        return

    accounting_recipients = (
        CustomUser.objects
        .select_related('department')
        .filter(is_active=True)
        .filter(
            Q(role='accounting')
            | Q(department__name__iexact='accounting')
            | Q(department__name__iexact='accounting department')
        )
        .exclude(id=approver.id)
        .distinct()
    )

    approved_name = _display_name(approved_user)
    approver_name = _display_name(approver)

    for recipient in accounting_recipients:
        NotificationService.create_notification(
            recipient=recipient,
            actor=approver,
            notif_type='user_verified',
            title='User Verified by Studio Head',
            message=f'{approved_name} was verified by {approver_name} and is now active.',
        )


def _notify_approvers_pending_account(pending_user, actor=None, source='self_registration'):
    """Notify Studio Head/Admin users that an account is waiting for verification."""
    approver_recipients = (
        CustomUser.objects
        .select_related('department')
        .filter(is_active=True)
        .filter(
            Q(role__in=APPROVER_ROLES)
            | Q(is_staff=True)
            | Q(is_superuser=True)
        )
        .distinct()
    )

    pending_name = _display_name(pending_user)
    pending_email = pending_user.email or 'Unknown email'
    notification_actor = actor or pending_user

    if source == 'accounting_created':
        title = 'New Employee Pending Verification'
        message = (
            f'{pending_name} ({pending_email}) was created by Accounting '
            'and is waiting for Studio Head/Admin verification.'
        )
    else:
        title = 'New Account Pending Verification'
        message = (
            f'{pending_name} ({pending_email}) created a new account '
            'and is waiting for Studio Head/Admin verification.'
        )

    for recipient in approver_recipients:
        NotificationService.create_notification(
            recipient=recipient,
            actor=notification_actor,
            notif_type='user_pending_approval',
            title=title,
            message=message,
        )

# Create your views here.

ALLOWED_ROLES = sorted({key for key, _ in ROLE_CHOICES}.union({'employee'}))
ROLE_LABEL_TO_KEY = {label.strip().lower(): key for key, label in ROLE_CHOICES}
ROLE_FILTER_ALIASES = {
    'interns': 'intern',
    'junior designer': 'junior_architect',
}
ROLE_NORMALIZATION_ALIASES = {
    'studio head': 'studio_head',
    'site engineer': 'site_engineer',
    'site coordinator': 'site_coordinator',
    'junior designer': 'junior_architect',
    'administrator': 'admin',
}
APPROVER_ROLES = {'studio_head', 'admin'}
ACCOUNTING_ACCESS_ROLES = APPROVER_ROLES.union({'accounting'})


def normalize_role_input(raw_role):
    if raw_role is None:
        return None

    role = str(raw_role).strip()
    if not role:
        return None

    role_lower = role.lower()
    normalized_role = role_lower.replace(' ', '_')

    if normalized_role in ALLOWED_ROLES:
        return normalized_role

    if role_lower in ROLE_LABEL_TO_KEY:
        return ROLE_LABEL_TO_KEY[role_lower]

    if role_lower in ROLE_FILTER_ALIASES:
        return ROLE_FILTER_ALIASES[role_lower]

    if role_lower in ROLE_NORMALIZATION_ALIASES:
        return ROLE_NORMALIZATION_ALIASES[role_lower]

    return normalized_role

@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """Login endpoint - returns JWT token and user info"""
    email = request.data.get('email')
    password = request.data.get('password')
    
    if not email or not password:
        return Response({
            'error': 'Email and password are required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        user = CustomUser.objects.get(email=email)
        if user.check_password(password):
            if not user.is_active:
                return Response({'error': 'Account not yet approved by Studio Head/Admin.'}, status=status.HTTP_403_FORBIDDEN)

            normalized_role = normalize_role_input(user.role)

            # Only allow login for users with the allowed roles
            if normalized_role not in ALLOWED_ROLES:
                return Response({'error': 'Your role is not permitted to login.'}, status=status.HTTP_403_FORBIDDEN)

            refresh = RefreshToken.for_user(user)
            return Response({
                'success': True,
                'token': str(refresh.access_token),
                'refresh': str(refresh),
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'employee_id': user.employee_id,
                    'department': user.department.id if user.department else None,
                    'department_name': user.department.name if user.department else None,
                    'role': normalized_role if normalized_role else None,
                    'role_name': user.get_role_display() if user.role else None,
                    'permissions': user.permissions or [],
                    'profile_picture': user.profile_picture or None,
                    'signature_image': user.signature_image or None,
                    'payroll_allowance_eligible': bool(user.payroll_allowance_eligible),
                }
            }, status=status.HTTP_200_OK)
        else:
            return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)
    except CustomUser.DoesNotExist:
        return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['POST'])
@permission_classes([AllowAny])
def register_view(request):
    """Register endpoint"""
    email = request.data.get('email')
    password = request.data.get('password')
    first_name = request.data.get('first_name', '')
    last_name = request.data.get('last_name', '')
    # Remove department and role assignment at registration
    if not email or not password:
        return Response({'error': 'Email and password are required'}, status=status.HTTP_400_BAD_REQUEST)
    if CustomUser.objects.filter(email=email).exists():
        return Response({'error': 'Email already registered'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        user = CustomUser.objects.create_user(
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            username=email.split('@')[0],
            is_active=False  # Always inactive until approved by studio head/admin
        )

        try:
            _notify_approvers_pending_account(
                pending_user=user,
                actor=user,
                source='self_registration',
            )
        except Exception as e:
            print(f"⚠️ Pending-account notification failed for user_id={user.id}: {e}")

        return Response({
            'success': True,
            'message': 'Registration submitted. Your account will be verified by a Studio Head or Admin.',
            'user': {
                'id': user.id,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
            }
        }, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_profile(request):
    """Get current user profile"""
    user = request.user
    return Response({
        'id': user.id,
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'employee_id': user.employee_id,
        'phone_number': user.phone_number,
        'department': user.department.id if user.department else None,
        'department_name': user.department.name if user.department else None,
        'role': user.role if user.role else None,
        'role_name': user.get_role_display() if user.role else None,
        'profile_picture': user.profile_picture,
        'signature_image': user.signature_image,
        'payroll_allowance_eligible': bool(user.payroll_allowance_eligible),
        'permissions': user.permissions or []
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_profile_picture(request):
    """Upload user profile picture to Supabase Storage."""
    user = request.user
    profile_pic = request.FILES.get('profile_pic')

    if not profile_pic:
        return Response({'error': 'No image provided.'}, status=status.HTTP_400_BAD_REQUEST)

    # Initialize Supabase client
    supabase_url = getattr(settings, 'SUPABASE_URL', None)
    supabase_key = getattr(settings, 'SUPABASE_KEY', None)

    if not supabase_url or not supabase_key:
        return Response({'error': 'Supabase configuration is missing in the backend.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    try:
        supabase: Client = create_client(supabase_url, supabase_key)
        
        # Generate unique filename
        file_extension = profile_pic.name.split('.')[-1]
        file_path = f"{user.id}/avatar_{uuid.uuid4().hex}.{file_extension}"

        # Upload to Supabase Storage bucket 'profile_picture'
        # read the file content
        file_content = profile_pic.read()
        res = supabase.storage.from_('profile_picture').upload(
            file=file_content,
            path=file_path,
            file_options={'content-type': profile_pic.content_type, 'upsert': 'true'}
        )

        # Get the public URL
        public_url = supabase.storage.from_('profile_picture').get_public_url(file_path)

        # Remove the previous picture from storage if it exists to save space
        if user.profile_picture and "supabase.co/storage/v1/object/public/profile_picture/" in user.profile_picture:
            try:
                old_path = user.profile_picture.split("profile_picture/")[-1]
                supabase.storage.from_('profile_picture').remove([old_path])
            except Exception as e:
                print(f"Failed to delete old profile picture: {e}")

        # Update user profile
        user.profile_picture = public_url
        user.save()

        return Response({
            'success': True,
            'message': 'Profile picture updated successfully.',
            'profile_picture': public_url
        })
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_profile_signature(request):
    """Upload user signature image to Supabase Storage."""
    user = request.user
    signature_file = request.FILES.get('signature') or request.FILES.get('signature_file')

    if not signature_file:
        return Response({'error': 'No signature image provided.'}, status=status.HTTP_400_BAD_REQUEST)

    supabase_url = getattr(settings, 'SUPABASE_URL', None)
    supabase_key = getattr(settings, 'SUPABASE_KEY', None)

    if not supabase_url or not supabase_key:
        return Response({'error': 'Supabase configuration is missing in the backend.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    try:
        supabase: Client = create_client(supabase_url, supabase_key)

        file_extension = signature_file.name.split('.')[-1]
        file_path = f"{user.id}/signature_{uuid.uuid4().hex}.{file_extension}"

        file_content = signature_file.read()
        try:
            supabase.storage.from_('user_signature').upload(
                file=file_content,
                path=file_path,
                file_options={'content-type': signature_file.content_type, 'upsert': 'true'}
            )
        except Exception as e:
            return Response({'error': f"Failed to upload to user_signature bucket. Please ensure RLS policies are set up. Details: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

        public_url = supabase.storage.from_('user_signature').get_public_url(file_path)

        # Remove the old signature from either the old bucket or the new bucket
        if user.signature_image:
            try:
                if "supabase.co/storage/v1/object/public/user_signature/" in user.signature_image:
                    old_path = user.signature_image.split("user_signature/")[-1]
                    supabase.storage.from_('user_signature').remove([old_path])
                elif "supabase.co/storage/v1/object/public/profile_picture/" in user.signature_image:
                    old_path = user.signature_image.split("profile_picture/")[-1]
                    supabase.storage.from_('profile_picture').remove([old_path])
            except Exception as e:
                print(f"Failed to delete old signature image: {e}")

        user.signature_image = public_url
        user.save(update_fields=['signature_image'])

        return Response({
            'success': True,
            'message': 'Signature updated successfully.',
            'signature_image': public_url,
        })
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_departments(request):
    """Get all departments"""
    departments = Department.objects.all()
    return Response([
        {
            'id': dept.id,
            'name': dept.name,
            'description': dept.description
        }
        for dept in departments
    ])


def _is_studio_head_or_admin(user):
    # Only studio head or admin can approve/see users
    normalized_role = normalize_role_input(getattr(user, 'role', None))
    return user.is_staff or user.is_superuser or normalized_role in APPROVER_ROLES


def _is_accounting_or_admin(user):
    # Accounting department staff and admins
    normalized_role = normalize_role_input(getattr(user, 'role', None))
    return user.is_staff or user.is_superuser or normalized_role in ACCOUNTING_ACCESS_ROLES


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def pending_users(request):
    if not _is_studio_head_or_admin(request.user):
        return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
    users = CustomUser.objects.filter(is_active=False).select_related('department').order_by('-created_at')
    return Response(PendingUserSerializer(users, many=True).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def approve_user(request):
    if not _is_studio_head_or_admin(request.user):
        return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

    user_id = request.data.get('user_id') or request.data.get('userId') or request.data.get('id')
    role = normalize_role_input(request.data.get('role'))
    permissions = request.data.get('permissions', [])
    department_id = request.data.get('department_id') if 'department_id' in request.data else None

    if isinstance(permissions, str):
        permissions = [permissions]
    if not isinstance(permissions, list):
        permissions = []

    if user_id in [None, ''] or not role or role not in ALLOWED_ROLES:
        return Response({'error': 'user_id and valid role are required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user_id = int(user_id)
    except (TypeError, ValueError):
        return Response({'error': 'user_id must be a valid integer'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = CustomUser.objects.get(id=user_id)
    except CustomUser.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

    if 'department_id' in request.data:
        if department_id in [None, '', 'null', 'None']:
            user.department = None
        else:
            try:
                user.department = Department.objects.get(id=department_id)
            except Department.DoesNotExist:
                return Response({'error': 'Department not found'}, status=status.HTTP_404_NOT_FOUND)

    user.role = role
    user.permissions = permissions
    user.is_active = True
    user.save()

    # Send the approval email in the background so this response returns immediately.
    threading.Thread(target=_send_approval_email_async, args=(user.id,), daemon=True).start()

    try:
        _notify_accounting_user_verified(user, request.user)
    except Exception as e:
        print(f"⚠️ Accounting verification notification failed for user_id={user.id}: {e}")

    return Response({
        'success': True,
        'email_sent': 'queued',
        'user': {
            'id': user.id,
            'email': user.email,
            'department': user.department.id if user.department else None,
            'department_name': user.department.name if user.department else None,
            'role': user.role,
        }
    })


@api_view(['GET'])
def accounts_overview(request):
    """Overview of accounts module"""
    return Response({
        'message': 'Accounts module',
        'features': ['Chart of Accounts', 'Journal Entries', 'General Ledger', 'Financial Reports']
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_users(request):
    if not _is_studio_head_or_admin(request.user):
        return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
    users = CustomUser.objects.select_related('department').all().order_by('last_name', 'first_name', 'email')
    return Response(CustomUserSerializer(users, many=True).data)


@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def manage_user(request, user_id):
    if not _is_studio_head_or_admin(request.user):
        return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

    try:
        user = CustomUser.objects.get(id=user_id)
    except CustomUser.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'DELETE':
        if request.user.id == user.id:
            return Response({'error': 'You cannot delete your own account.'}, status=status.HTTP_400_BAD_REQUEST)
        user.delete()
        return Response({'success': True})

    # PATCH update
    fields_updated = []
    first_name = request.data.get('first_name')
    last_name = request.data.get('last_name')
    role = request.data.get('role')
    department_id = request.data.get('department_id') if 'department_id' in request.data else None
    is_active = request.data.get('is_active') if 'is_active' in request.data else None
    date_hired = request.data.get('date_hired') if 'date_hired' in request.data else None

    if first_name is not None:
        user.first_name = str(first_name).strip()
        fields_updated.append('first_name')

    if last_name is not None:
        user.last_name = str(last_name).strip()
        fields_updated.append('last_name')

    if role is not None:
        normalized_role = normalize_role_input(role)
        if normalized_role not in ALLOWED_ROLES:
            return Response({'error': 'Invalid role'}, status=status.HTTP_400_BAD_REQUEST)
        user.role = normalized_role
        fields_updated.append('role')

    if 'department_id' in request.data:
        if department_id in [None, '', 'null', 'None']:
            user.department = None
        else:
            try:
                user.department = Department.objects.get(id=department_id)
            except Department.DoesNotExist:
                return Response({'error': 'Department not found'}, status=status.HTTP_404_NOT_FOUND)
        fields_updated.append('department')

    if is_active is not None:
        normalized = is_active
        if isinstance(is_active, str):
            normalized = is_active.lower() in ['1', 'true', 'yes', 'on']
        else:
            normalized = bool(is_active)

        if request.user.id == user.id and normalized is False:
            return Response({'error': 'You cannot suspend your own account.'}, status=status.HTTP_400_BAD_REQUEST)

        user.is_active = normalized
        fields_updated.append('is_active')

    if 'date_hired' in request.data:
        if date_hired in [None, '', 'null', 'None']:
            user.date_hired = None
        else:
            parsed_date = parse_date(str(date_hired))
            if not parsed_date:
                return Response({'error': 'Invalid date_hired format. Use YYYY-MM-DD.'}, status=status.HTTP_400_BAD_REQUEST)
            user.date_hired = parsed_date
        fields_updated.append('date_hired')

    if not fields_updated:
        return Response({'error': 'No valid fields to update'}, status=status.HTTP_400_BAD_REQUEST)

    user.save()
    return Response({
        'success': True,
        'user': CustomUserSerializer(user).data,
    })

# --- Accounting Employee Management Endpoints ---

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def accounting_employees(request):
    if not _is_accounting_or_admin(request.user):
        return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

    from payroll.models import SalaryStructure

    if request.method == 'GET':
        # Approved/verified users are represented by is_active=True in this project.
        active_only = request.query_params.get('active_only', 'true').lower() != 'false'
        requested_role = (request.query_params.get('role') or '').strip().lower()
        requested_department = (request.query_params.get('department') or '').strip()

        users_qs = CustomUser.objects.select_related('department', 'salary_structure').order_by('last_name', 'first_name')
        if active_only:
            users_qs = users_qs.filter(is_active=True)
        if requested_department:
            users_qs = users_qs.filter(department__name__iexact=requested_department)
        if requested_role:
            normalized_role = ROLE_FILTER_ALIASES.get(requested_role, requested_role)
            if normalized_role in ROLE_LABEL_TO_KEY:
                normalized_role = ROLE_LABEL_TO_KEY[normalized_role]
            if normalized_role in ALLOWED_ROLES:
                users_qs = users_qs.filter(role=normalized_role)

        data = []
        for user in users_qs:
            salary = 0
            if hasattr(user, 'salary_structure'):
                salary = float(user.salary_structure.base_salary)

            status_text = 'Active' if user.is_active else 'Inactive'

            data.append({
                'id': user.id,
                'name': f"{user.first_name} {user.last_name}".strip(),
                'email': user.email,
                'phone': user.phone_number or '',
                'whatsapp_account': user.phone_number or '',
                'department': user.department.name if user.department else 'Unassigned',
                'position': user.get_role_display() if user.role else 'Unassigned',
                'status': status_text,
                'joinDate': user.date_hired.strftime('%Y-%m-%d') if user.date_hired else '',
                'salary': salary,
                'location': 'Head Office',
                'avatar': user.profile_picture,
                'manager': 'N/A',
                'skills': [],
            })
        return Response(data, status=status.HTTP_200_OK)

    elif request.method == 'POST':
        # Create a new employee
        email = (request.data.get('email') or '').strip().lower()
        first_name = (request.data.get('first_name') or '').strip()
        last_name = (request.data.get('last_name') or '').strip()
        whatsapp_account = request.data.get('whatsapp_account')
        phone = (request.data.get('phone') or '').strip()
        if whatsapp_account is not None:
            phone = str(whatsapp_account).strip()
        department_name = request.data.get('department')
        position_role = (request.data.get('position') or '').strip()
        temporary_password = (request.data.get('temporary_password') or '').strip()
        salary_amount = request.data.get('salary', 0)
        start_date = request.data.get('startDate')

        if not email or not first_name or not last_name:
            return Response({'error': 'Email, first name, and last name are required'}, status=status.HTTP_400_BAD_REQUEST)
        if not temporary_password or len(temporary_password) < 8:
            return Response({'error': 'temporary_password is required and must be at least 8 characters'}, status=status.HTTP_400_BAD_REQUEST)

        if CustomUser.objects.filter(email=email).exists():
            return Response({'error': 'User with this email already exists'}, status=status.HTTP_400_BAD_REQUEST)

        # Validate phone number format if provided (basic validation)
        if phone:
            # For testing: just strip and validate length
            phone = str(phone).strip()
            if len(phone) < 10:
                return Response({'error': 'Phone number must be at least 10 digits'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                dept = None
                if department_name:
                    dept = Department.objects.filter(name=department_name).first()

                # Allow exact role key (e.g. "site_engineer") or display label (e.g. "Site Engineer").
                role_key = 'employee'
                position_lower = position_role.lower()
                position_lower = ROLE_FILTER_ALIASES.get(position_lower, position_lower)
                if position_lower in ALLOWED_ROLES:
                    role_key = position_lower
                elif position_lower in ROLE_LABEL_TO_KEY:
                    mapped = ROLE_LABEL_TO_KEY[position_lower]
                    if mapped in ALLOWED_ROLES:
                        role_key = mapped

                username_base = email.split('@')[0] if '@' in email else email
                username = username_base
                suffix = 1
                while CustomUser.objects.filter(username=username).exists():
                    username = f"{username_base}{suffix}"
                    suffix += 1

                user = CustomUser.objects.create(
                    email=email,
                    username=username,
                    first_name=first_name,
                    last_name=last_name,
                    phone_number=phone,
                    department=dept,
                    role=role_key,
                    is_active=False,
                    date_hired=start_date if start_date else None
                )
                user.set_password(temporary_password)
                user.save()

                if salary_amount:
                    SalaryStructure.objects.create(
                        employee=user,
                        base_salary=salary_amount,
                        frequency='monthly'
                    )
            
            email_sent = False
            try:
                email_message = f"""
Hello {first_name} {last_name},

Your Triple G account has been created by the Accounting Department.

Account Details:
- Email: {email}
- Temporary Password: {temporary_password}
- Department: {dept.name if dept else 'N/A'}
- Role: {user.get_role_display() if user.role else 'N/A'}

Important:
Your account is currently pending verification. You cannot log in yet until a Studio Head or Admin approves your account.
You will receive another confirmation once your account is activated.

Best regards,
Triple G Admin
                """.strip()
                send_mail(
                    subject='Triple G Account Created - Pending Verification',
                    message=email_message,
                    from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', None),
                    recipient_list=[email],
                    fail_silently=False,
                )
                email_sent = True
            except Exception as e:
                print(f"Account creation email failed: {str(e)}")

            try:
                _notify_approvers_pending_account(
                    pending_user=user,
                    actor=request.user,
                    source='accounting_created',
                )
            except Exception as e:
                print(f"⚠️ Accounting pending-account notification failed for user_id={user.id}: {e}")

            return Response({
                'success': True,
                'email_sent': email_sent,
                'message': 'Employee created and submitted for Studio Head/Admin verification.'
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def accounting_employee_detail(request, user_id):
    if not _is_accounting_or_admin(request.user):
        return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
        
    from payroll.models import SalaryStructure
    
    try:
        user = CustomUser.objects.get(id=user_id)
    except CustomUser.DoesNotExist:
        return Response({'error': 'Employee not found'}, status=status.HTTP_404_NOT_FOUND)
        
    if request.method == 'DELETE':
        if request.user.id == user.id:
            return Response({'error': 'Cannot delete your own account'}, status=status.HTTP_400_BAD_REQUEST)
        user.delete()
        return Response({'success': True})
        
    elif request.method == 'PATCH':
        try:
            with transaction.atomic():
                first_name = request.data.get('first_name')
                last_name = request.data.get('last_name')
                email = request.data.get('email')
                phone = request.data.get('phone')
                whatsapp_account = request.data.get('whatsapp_account')
                department_name = request.data.get('department')
                position_role = request.data.get('position')
                salary_amount = request.data.get('salary')
                start_date = request.data.get('startDate')
                status_text = request.data.get('status')

                if first_name is not None:
                    user.first_name = str(first_name).strip()
                if last_name is not None:
                    user.last_name = str(last_name).strip()
                if email is not None:
                    normalized_email = str(email).strip().lower()
                    if not normalized_email:
                        return Response({'error': 'Email cannot be empty'}, status=status.HTTP_400_BAD_REQUEST)
                    existing = CustomUser.objects.filter(email=normalized_email).exclude(id=user.id).exists()
                    if existing:
                        return Response({'error': 'User with this email already exists'}, status=status.HTTP_400_BAD_REQUEST)
                    user.email = normalized_email
                if whatsapp_account is not None:
                    phone_value = str(whatsapp_account).strip()
                    if phone_value and len(phone_value) < 10:
                        return Response({'error': 'Phone number must be at least 10 digits'}, status=status.HTTP_400_BAD_REQUEST)
                    user.phone_number = phone_value
                elif phone is not None:
                    phone_value = str(phone).strip()
                    if phone_value and len(phone_value) < 10:
                        return Response({'error': 'Phone number must be at least 10 digits'}, status=status.HTTP_400_BAD_REQUEST)
                    user.phone_number = phone_value

                if status_text is not None:
                    user.is_active = (status_text == 'Active')

                if department_name is not None:
                    name_clean = str(department_name).strip()
                    if not name_clean:
                        user.department = None
                    else:
                        dept = Department.objects.filter(name=name_clean).first()
                        user.department = dept

                if position_role is not None:
                    position_lower = str(position_role).strip().lower()
                    position_lower = ROLE_FILTER_ALIASES.get(position_lower, position_lower)
                    next_role = None
                    if position_lower in ALLOWED_ROLES:
                        next_role = position_lower
                    elif position_lower in ROLE_LABEL_TO_KEY:
                        mapped = ROLE_LABEL_TO_KEY[position_lower]
                        if mapped in ALLOWED_ROLES:
                            next_role = mapped
                    if next_role is None:
                        return Response({'error': 'Invalid role/position'}, status=status.HTTP_400_BAD_REQUEST)
                    user.role = next_role

                user.save()

                if salary_amount is not None and str(salary_amount).strip() != '':
                    salary_obj, created = SalaryStructure.objects.get_or_create(
                        employee=user,
                        defaults={'base_salary': salary_amount, 'frequency': 'monthly'}
                    )
                    if not created:
                        salary_obj.base_salary = float(salary_amount)
                        salary_obj.save()
            return Response({'success': True, 'message': 'Employee updated successfully'}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
