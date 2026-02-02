from rest_framework import viewsets
from rest_framework.decorators import api_view
from rest_framework.response import Response

# Create your views here.

@api_view(['GET'])
def accounts_overview(request):
    """Overview of accounts module"""
    return Response({
        'message': 'Accounts module',
        'features': ['Chart of Accounts', 'Journal Entries', 'General Ledger', 'Financial Reports']
    })
