"""
Asthma IoT Sensor Simulation Script (Zero external dependencies)
Uses Python's built-in urllib to POST realistic telemetry every 3 seconds to Django.
"""

import time
import random
import json
import urllib.request
import urllib.error

API_URL = "http://127.0.0.1:8000/api/readings/"
API_KEY = "ASTHMA_SECRET_KEY_123"

def simulate():
    print("=" * 60)
    print("Asthma IoT Telemetry Simulator (Local Test)")
    print(f"Target: {API_URL}")
    print("Sending telemetry every 3 seconds. Press Ctrl+C to stop.")
    print("=" * 60)

    temp_base = 22.0
    hum_base = 48.0
    co2_base = 450
    aqi_base = 35

    count = 1
    while True:
        # Slight drift with random noise
        temp = round(temp_base + random.uniform(-1.5, 1.5), 1)
        hum = round(hum_base + random.uniform(-3.0, 3.0), 1)
        # Periodically spike CO2 to demonstrate asthma alerts on the dashboard
        co2_spike = 650 if (count % 7 == 0) else 0
        co2 = int(co2_base + random.randint(-40, 60) + co2_spike)
        aqi = int(max(10, aqi_base + random.randint(-10, 20) + (co2_spike // 15)))

        payload = {
            "temperature": temp,
            "humidity": hum,
            "co2": co2,
            "air_quality": aqi,
        }

        data_bytes = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            API_URL,
            data=data_bytes,
            headers={
                "Content-Type": "application/json",
                "X-API-KEY": API_KEY,
            },
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=3) as resp:
                status_code = resp.getcode()
                response_body = resp.read().decode("utf-8")
                print(f"[{count:03d}] Sent: Temp={temp}°C | Hum={hum}% | CO2={co2}ppm | AQI={aqi} -> HTTP {status_code}")
        except urllib.error.HTTPError as e:
            print(f"[{count:03d}] HTTP Error: {e.code} - {e.read().decode('utf-8')}")
        except urllib.error.URLError as e:
            print(f"[{count:03d}] Connection Error: {e.reason}")
            print("       Make sure 'python manage.py runserver 0.0.0.0:8000' is running.")

        count += 1
        time.sleep(3)

if __name__ == "__main__":
    simulate()
