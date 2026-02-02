from rest_framework import viewsets
from rest_framework.decorators import api_view
from rest_framework.response import Response

# Create your views here.

@api_view(['GET'])
def attendance_overview(request):
    """Overview of attendance module"""
    return Response({
        'message': 'Attendance module',
        'features': ['Time Tracking', 'Clock In/Out', 'Leave Management', 'Attendance Reports']
    })
