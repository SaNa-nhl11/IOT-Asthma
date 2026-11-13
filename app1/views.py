from django.conf import settings
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .models import SensorReading
from .serializers import SensorReadingSerializer

@api_view(['GET', 'POST'])
def readings_list_create(request):
    if request.method == 'POST':
        # Accept API key via header (X-API-KEY) or query parameter (?api_key=...)
        api_key = (
            request.headers.get('X-API-KEY')
            or request.headers.get('x-api-key')
            or request.META.get('HTTP_X_API_KEY')
            or request.query_params.get('api_key')
        )

        if api_key != settings.DEVICE_API_KEY:
            return Response(
                {'error': 'Invalid or missing X-API-KEY'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        serializer = SensorReadingSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # Return the last 30 readings in chronological order (oldest to newest) for charting
    latest_readings = list(SensorReading.objects.all()[:30])[::-1]
    serializer = SensorReadingSerializer(latest_readings, many=True)
    return Response(serializer.data)
