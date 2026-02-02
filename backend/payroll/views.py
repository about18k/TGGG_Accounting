from rest_framework import viewsets
from rest_framework.decorators import api_view
from rest_framework.response import Response

# Create your views here.

@api_view(['GET'])
def payroll_overview(request):
    """Overview of payroll module"""
    return Response({
        'message': 'Payroll module',
        'features': ['Salary Processing', 'Tax Calculations', 'Benefits Management', 'Payroll Reports']
    })
