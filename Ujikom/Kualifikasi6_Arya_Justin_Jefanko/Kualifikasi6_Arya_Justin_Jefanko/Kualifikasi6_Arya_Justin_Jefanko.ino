#include <WiFi.h>
#include <WebServer.h>
#include <LittleFS.h>
#include <Arduino_JSON.h>
#include <Adafruit_Sensor.h>
#include <DHT.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

// Konfigurasi WiFi
const char* ssid = "UGMURO-INET";
const char* password = "Gepuk15000";

// Pin Hardware
#define DHTPIN 4
#define SOIL_PIN 36
#define RELAY1_PIN 12
#define RELAY2_PIN 25

// Konfigurasi LCD
#define LCD_ADDR 0x27
#define LCD_COLS 20
#define LCD_ROWS 4
LiquidCrystal_I2C lcd(LCD_ADDR, LCD_COLS, LCD_ROWS);

// Inisialisasi objek
#define DHTTYPE DHT21
DHT dht(DHTPIN, DHTTYPE);
WebServer server(80);

// Variabel global
bool relay1State = false;
bool relay2State = false;
unsigned long previousMillis = 0;
const long interval = 2000;
float currentTemp = 0;
float currentHum = 0;
int currentSoil = 0;

String getContentType(String filename) {
  if (filename.endsWith(".html")) return "text/html";
  else if (filename.endsWith(".css")) return "text/css";
  else if (filename.endsWith(".js")) return "application/javascript";
  else if (filename.endsWith(".ico")) return "image/x-icon";
  else if (filename.endsWith(".png")) return "image/png";
  return "text/plain";
}

bool handleFileRead(String path) {
  if (path.endsWith("/")) path += "index.html";
  String contentType = getContentType(path);
  if (LittleFS.exists(path)) {
    File file = LittleFS.open(path, "r");
    server.streamFile(file, contentType);
    file.close();
    return true;
  }
  return false;
}

void handleSensorData() {
  JSONVar sensorData;
  sensorData["temperature"] = currentTemp;
  sensorData["humidity"] = currentHum;
  sensorData["soil"] = currentSoil;
  sensorData["relay1"] = relay1State;
  sensorData["relay2"] = relay2State;

  String jsonString = JSON.stringify(sensorData);
  server.send(200, "application/json", jsonString);
}

void handleRelayUpdate() {
  if (server.hasArg("relay") && server.hasArg("state")) {
    int relayNum = server.arg("relay").toInt();
    bool state = server.arg("state").toInt() == 1;

    if (relayNum == 1) {
      relay1State = state;
      digitalWrite(RELAY1_PIN, relay1State ? HIGH : LOW); // Aktif HIGH
    } else if (relayNum == 2) {
      relay2State = state;
      digitalWrite(RELAY2_PIN, relay2State ? HIGH : LOW); // Aktif HIGH
    }
    
    server.send(200, "text/plain", "OK");
    updateLCD();
  } else {
    server.send(400, "text/plain", "Bad Request");
  }
}

void updateLCD() {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("T:");
  lcd.print(currentTemp, 1);
  lcd.print("C H:");
  lcd.print(currentHum, 1);
  lcd.print("%");

  lcd.setCursor(0, 1);
  lcd.print("Tanah:");
  lcd.print(currentSoil);
  lcd.print("%");

  lcd.setCursor(0, 2);
  lcd.print("R1:");
  lcd.print(relay1State ? "ON " : "OFF");
  lcd.setCursor(10, 2);
  lcd.print("R2:");
  lcd.print(relay2State ? "ON" : "OFF");

  lcd.setCursor(0, 3);
  lcd.print("IP:");
  lcd.print(WiFi.localIP());
}

void setup() {
  Serial.begin(115200);
  
  // Inisialisasi hardware
  pinMode(RELAY1_PIN, OUTPUT);
  pinMode(RELAY2_PIN, OUTPUT);
  digitalWrite(RELAY1_PIN, LOW); // Relay mati saat startup (aktif HIGH)
  digitalWrite(RELAY2_PIN, LOW);
  dht.begin();
  
  // Inisialisasi LCD
  lcd.init();
  lcd.backlight();
  lcd.clear();
  lcd.setCursor(4, 0);
  lcd.print("TRAINER KIT");
  lcd.setCursor(3, 1);
  lcd.print("AGROTECHNOLOGY");
  
  // Inisialisasi LittleFS
  if (!LittleFS.begin(true)) {
    Serial.println("Error mounting LittleFS");
    lcd.setCursor(0, 2);
    lcd.print("Error: LittleFS");
    while (true);
  }
  
  // Koneksi WiFi
  WiFi.begin(ssid, password);
  lcd.setCursor(0, 2);
  lcd.print("Menghubungkan WiFi");
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    lcd.print(".");
    attempts++;
  }
  
  if (WiFi.status() != WL_CONNECTED) {
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("WiFi Gagal!");
    while(true);
  }
  
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Terhubung WiFi");
  lcd.setCursor(0, 1);
  lcd.print("IP:");
  lcd.print(WiFi.localIP());
  
  // Konfigurasi server
  server.on("/data", HTTP_GET, handleSensorData);
  server.on("/update", HTTP_GET, handleRelayUpdate);
  server.onNotFound([]() {
    if (!handleFileRead(server.uri())) {
      server.send(404, "text/plain", "File not found");
    }
  });
  server.begin();
  
  lcd.setCursor(0, 2);
  lcd.print("Server berjalan");
}

void loop() {
  server.handleClient();
  
  unsigned long currentMillis = millis();
  if (currentMillis - previousMillis >= interval) {
    previousMillis = currentMillis;

    // Baca sensor dengan penanganan error
    float temp = dht.readTemperature();
    float hum = dht.readHumidity();
    
    if (!isnan(temp) && !isnan(hum)) {
      currentTemp = temp;
      currentHum = hum;
    } else {
      Serial.println("Pembacaan DHT gagal!");
    }
    
    int soilRaw = analogRead(SOIL_PIN);
    currentSoil = map(soilRaw, 4095, 0, 0, 100);
    currentSoil = constrain(currentSoil, 0, 100);

    updateLCD();
  }
}