from django.db import models

class SensorReading(models.Model):
    temperature = models.FloatField()
    humidity = models.FloatField()
    co2 = models.IntegerField()
    air_quality = models.IntegerField()
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"Temp: {self.temperature}°C | CO2: {self.co2}ppm @ {self.timestamp}"