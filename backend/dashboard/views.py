from django.http import HttpResponse
from django.shortcuts import render

def dashboard_home(request):
    # Sample context data for the accounting manager's dashboard
    context = {
        'manager_name': 'Jane Doe',
        'total_employees': 42,
        'pending_payrolls': 3,
        'recent_activities': [
            'Approved payroll for January',
            'Reviewed expense report',
            'Updated employee records',
        ],
    }
    return render(request, 'dashboard/home.html', context)
