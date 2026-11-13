# Wokwi Simulation Setup for Asthma IoT Monitor

This directory contains the complete Wokwi configuration to simulate an ESP32 connected to:
- **DHT22** (Temperature & Humidity on GPIO 15)
- **Potentiometer 1** (Simulated CO₂ ppm on Analog Pin 34)
- **Potentiometer 2** (Simulated Air Quality AQI on Analog Pin 35)

---

## 1. How Wokwi Communicates With Django

Inside Wokwi, `localhost` (or `127.0.0.1`) refers to the simulated ESP32 chip itself, **not your physical PC**.

To allow Wokwi to reach your Django server:

### Option A: Use Wokwi IoT Gateway (Recommended for local dev)
1. Install the [Wokwi IoT Gateway](https://docs.wokwi.com/guides/esp32-wifi#the-private-gateway) or run Wokwi in VS Code with the Wokwi extension.
2. In `sketch.ino`, set:
   ```cpp
   const char* SERVER_URL = "http://10.0.1.2:8000/api/readings/";
   ```

### Option B: Use your Local LAN IP (If using Wokwi IoT Gateway or local bridge)
1. Find your PC's IP address (e.g. `ipconfig` -> `192.168.1.50`).
2. Run Django binding to all interfaces:
   ```bash
   python manage.py runserver 0.0.0.0:8000
   ```
3. In `sketch.ino`, set:
   ```cpp
   const char* SERVER_URL = "http://192.168.1.50:8000/api/readings/";
   ```

### Option C: Use ngrok or cloudflared (Easiest & Works in Browser Wokwi!)
1. Start your Django server:
   ```bash
   python manage.py runserver 8000
   ```
2. Start an ngrok tunnel in another terminal:
   ```bash
   ngrok http 8000
   ```
3. Copy the public URL (e.g. `https://abc-123.ngrok-free.app`) and update `sketch.ino`:
   ```cpp
   const char* SERVER_URL = "https://abc-123.ngrok-free.app/api/readings/";
   ```

---

## 2. Setting Up in Wokwi (Web)

1. Open [wokwi.com](https://wokwi.com) and start a new **ESP32** project.
2. Copy the contents of `sketch.ino` into the **`sketch.ino`** tab.
3. Switch to the **`diagram.json`** tab in Wokwi and paste the contents of `wokwi/diagram.json`.
4. In the **`libraries.txt`** tab, add:
   ```text
   DHT sensor library for ESPx
   ArduinoJson
   ```
5. Click **Play (Start the simulation)**.
6. Look at the Serial Monitor — you will see telemetry being sent every 3 seconds!

---

## 3. Data Flow Overview

```
[Wokwi ESP32]
  │  (DHT22 + Potentiometers)
  │  HTTP POST + X-API-KEY: ASTHMA_SECRET_KEY_123
  ▼
[Django REST API: http://localhost:8000/api/readings/]
  │  Validates & saves to SQLite
  ▼
[React Dashboard: http://localhost:5173]
  │  Polls API every 3s
  ▼
[Real-time Metric Cards + Recharts Live Graphs + Asthma Trigger Alert]
```

