#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include "DHTesp.h"

// ============================================================
// CONFIGURATION
// ============================================================
// 1. WiFi: Wokwi simulated access point
const char* WIFI_SSID = "Wokwi-GUEST";
const char* WIFI_PASSWORD = "";

// 2. Django Server URL:
// IMPORTANT FOR WOKWI:
// Inside Wokwi, "localhost" or "127.0.0.1" refers to the simulated ESP32!
// To reach your local computer:
// - Option A (Wokwi IoT Gateway): "http://10.0.1.2:8000/api/readings/"
// - Option B (Local WiFi IP):     "http://192.168.x.x:8000/api/readings/" (replace with your PC's IP)
// - Option C (ngrok / tunnel):    "https://xxxx.ngrok-free.app/api/readings/"
const char* SERVER_URL = "http://10.0.1.2:8000/api/readings/";

// 3. Authentication Secret Key (matches DEVICE_API_KEY in Django settings.py)
const char* API_KEY = "ASTHMA_SECRET_KEY_123";

// Pins matching diagram.json
const int DHT_PIN = 15;
const int POT_CO2_PIN = 34;   // Analog Pin for simulated CO2
const int POT_AQI_PIN = 35;   // Analog Pin for simulated AQI

DHTesp dhtSensor;
unsigned long lastSendTime = 0;
const unsigned long SEND_INTERVAL_MS = 3000; // Send telemetry every 3 seconds

void setup() {
  Serial.begin(115200);
  Serial.println("\n[ESP32] Initializing Asthma IoT Telemetry Station...");

  // Initialize DHT22
  dhtSensor.setup(DHT_PIN, DHTesp::DHT22);

  // Initialize ADC Pins
  pinMode(POT_CO2_PIN, INPUT);
  pinMode(POT_AQI_PIN, INPUT);

  // Connect to Wokwi WiFi
  Serial.print("[WiFi] Connecting to: ");
  Serial.println(WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD, 6);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\n[WiFi] Connected successfully!");
  Serial.print("[WiFi] IP Address: ");
  Serial.println(WiFi.localIP());
}

void loop() {
  unsigned long now = millis();
  if (now - lastSendTime >= SEND_INTERVAL_MS) {
    lastSendTime = now;

    if (WiFi.status() == WL_CONNECTED) {
      sendTelemetry();
    } else {
      Serial.println("[WiFi] Lost connection, attempting reconnect...");
      WiFi.reconnect();
    }
  }
}

void sendTelemetry() {
  // 1. Read temperature and humidity from DHT22
  TempAndHumidity dhtData = dhtSensor.getTempAndHumidity();

  float temperature = dhtData.temperature;
  float humidity = dhtData.humidity;

  if (isnan(temperature) || isnan(humidity)) {
    Serial.println("[DHT22] Warning: Failed to read from sensor. Using defaults.");
    temperature = 22.0;
    humidity = 50.0;
  }

  // 2. Read simulated CO2 and Air Quality from Potentiometers (0-4095 ADC)
  int rawCO2 = analogRead(POT_CO2_PIN);
  int rawAQI = analogRead(POT_AQI_PIN);

  // Map ADC to realistic environmental ranges:
  // CO2: 400 ppm (fresh air) to 2000 ppm (heavily polluted / stuffy)
  int co2 = map(rawCO2, 0, 4095, 400, 2000);

  // Air Quality AQI: 10 (Excellent) to 250 (Hazardous for asthma)
  int air_quality = map(rawAQI, 0, 4095, 10, 250);

  // 3. Serialize JSON payload
  StaticJsonDocument<256> doc;
  doc["temperature"] = serialized(String(temperature, 1));
  doc["humidity"] = serialized(String(humidity, 1));
  doc["co2"] = co2;
  doc["air_quality"] = air_quality;

  String jsonPayload;
  serializeJson(doc, jsonPayload);

  Serial.println("\n-------------------------------------------");
  Serial.print("[Telemetry] Outgoing Payload: ");
  Serial.println(jsonPayload);

  // 4. Send HTTP POST to Django backend
  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-API-KEY", API_KEY);

  int httpResponseCode = http.POST(jsonPayload);

  if (httpResponseCode > 0) {
    Serial.print("[HTTP] Response code: ");
    Serial.println(httpResponseCode);
    String response = http.getString();
    Serial.print("[HTTP] Server reply: ");
    Serial.println(response);
  } else {
    Serial.print("[HTTP] Error on sending POST: ");
    Serial.println(http.errorToString(httpResponseCode).c_str());
    Serial.println("[Hint] If connection refused, make sure Django is running with:");
    Serial.println("       python manage.py runserver 0.0.0.0:8000");
  }

  http.end();
}

