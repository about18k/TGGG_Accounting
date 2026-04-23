import logging

from django.db import DatabaseError, OperationalError
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler


logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    """Return JSON for DB connectivity/query failures instead of HTML debug pages."""
    response = drf_exception_handler(exc, context)
    if response is not None:
        return response

    if isinstance(exc, (OperationalError, DatabaseError)):
        view_name = getattr(context.get('view'), '__class__', type('Unknown', (), {})).__name__
        logger.warning('Database error in %s: %s', view_name, exc)
        return Response(
            {
                'error': 'Database temporarily unavailable. Please try again in a moment.'
            },
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    return response
