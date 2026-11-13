from django.contrib import admin
from .models import SensorReading

@admin.register(SensorReading)
class SensorReadingAdmin(admin.ModelAdmin):
    list_display = ('id', 'temperature', 'humidity', 'co2', 'air_quality', 'timestamp')
    list_filter = ('timestamp',)
    ordering = ('-timestamp',)
