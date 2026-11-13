from rest_framework import serializers
from .models import SensorReading

class FlexibleIntegerField(serializers.IntegerField):
    """
    Accepts integers, floats, or numeric strings (common in IoT sensors),
    and safely rounds them to integer.
    """
    def to_internal_value(self, data):
        try:
            data = int(round(float(data)))
        except (ValueError, TypeError):
            pass
        return super().to_internal_value(data)

class SensorReadingSerializer(serializers.ModelSerializer):
    co2 = FlexibleIntegerField()
    air_quality = FlexibleIntegerField()

    class Meta:
        model = SensorReading
        fields = ['id', 'temperature', 'humidity', 'co2', 'air_quality', 'timestamp']
