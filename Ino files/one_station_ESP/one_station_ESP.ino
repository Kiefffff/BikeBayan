// #include <SoftwareSerial.h> no need on esp32, use UART2
#include <WiFi.h>
#include <HTTPClient.h>
#include <SPI.h>
#include <MFRC522.h>
#include <ArduinoJson.h>
#include <IskakINO_LiquidCrystal_I2C.h> 

/*
  PIN DEFINITIONS
*/
//
const int LOCK_CHECK_1 = 36;
const int LOCK_CHECK_2 = 39; 
// Other components
const int LED_SUCCESS = 32;
const int BUTTON_1 = 34;
const int BUTTON_2 = 35;
// Relay module signals
const int UNLOCK_1 = 26;
const int UNLOCK_2 = 27;
// RFID SS pins
const int RFID_SS_1 = 12;
// GM816S RX and TX
const int RXD2 = 16;
const int TXD2 = 17;
HardwareSerial scanner(2); // UART2
// LCD will use SCL, SDA (22, 21)
LiquidCrystal_I2C lcd(20, 4);
/*
  VARIABLE DEFINITIONS
*/

const char STATION_ID = '2'; // STATION ID for this particular ESP (1 slot: station 2)

// Verified status
int VERIFIED = -1;
//raw_json
String raw_json = "";
JsonDocument json;
// Variables for buttons
int BUTTON_1_STATE = LOW;
int BUTTON_2_STATE = LOW;
// wifi config; use home wifi or acl wifi (or could data wifi)
const char* WIFI_SSID = "Password";
const char* WIFI_PW = "password";
const char* API_URL = "http://54.255.202.140:8000/api";

//mfrc522 variables
#define numReaders  1
const byte ssPins[] = {RFID_SS_1}; // define SS Pins later, can be any
const byte resetPin = 14; // define RST Pin later, can be any
MFRC522 mfrc522[numReaders];

void setup() {
  pinMode(LED_SUCCESS, OUTPUT); // initialize D2 (GPIO4) for external LED

  // pins to receive signals to locks
  pinMode(LOCK_CHECK_1, INPUT);
  pinMode(LOCK_CHECK_2, INPUT);

  // pins to send signals to locks
  pinMode(UNLOCK_1, OUTPUT);
  pinMode(UNLOCK_2, OUTPUT);

  // pins to receive signals from buttons
  pinMode(BUTTON_1, INPUT);
  pinMode(BUTTON_2, INPUT);

  // setup LCD
  lcd.begin();         
  lcd.backlight();     

  // intitate SPI bus
  SPI.begin();

  for (uint8_t reader = 0; reader < numReaders; reader++) {
    mfrc522[reader].PCD_Init(ssPins[reader], resetPin); // Init each MFRC522 card
    Serial.print(F("Reader "));
    Serial.print(reader);
    Serial.print(F(": "));
    mfrc522[reader].PCD_DumpVersionToSerial();
  }

  // Blink 3 times quickly 
  for(int i=0; i<3; i++) {
    digitalWrite(LED_SUCCESS, HIGH);
    delay(100);
    digitalWrite(LED_SUCCESS, LOW); 
    delay(100);
  }

  Serial.begin(115200);
  // delay 5 seconds before setup check
  delay(5000); 
  Serial.println("\n\n--- setup running ---");

  // connect to wifi
  Serial.printf("Connecting to Wifi: %s", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PW);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connceted. IP: " + WiFi.localIP().toString());
  // check for wifi
  scanner.begin(9600, SERIAL_8N1, RXD2, TXD2);

  // run station update to update slot statuses to server
  stationUpdate();
  
}

int default_lcd = 0;
void loop() {
  // lcd default
  if (default_lcd == 0){
    lcd.clear();
    lcd.setCursor(0, 0); 
    lcd.print("BikeBayan standby.");
    default_lcd = 1;
  }

  // scanning
  if (scanner.available()) {
    char c = scanner.read();
    //Serial.print(c); 
    raw_json += c; // add bytes to text variable
    if (c == '}'){ // once retrieve closing brace, have complete json file
      Serial.print('\n');
      Serial.println("captured JSON: " + raw_json); // check text variable
      DeserializationError error = deserializeJson(json, raw_json);
      if (error) {
        Serial.print(F("deserializeJson() failed: "));
        Serial.println(error.f_str());
      } 
      // verify user is from MOSIP
      String uin = json["uin"];
      String dob = json["dob"];
      String name = json["name"];
      String verify_check = userVerify(uin, dob, name);
      Serial.println("result of verify check: " + verify_check);
      if (verify_check == "-1"){
        default_lcd = 0;
        lcd.clear();
        lcd.setCursor(0, 0); 
        lcd.print("Unable to verify user.");
        delay(1000);
        return;
      } else {
        default_lcd = 0;
        lcd.clear();
        lcd.setCursor(0, 0); 
        lcd.print("Verified user.");
        digitalWrite(LED_SUCCESS, HIGH);
        delay(1000);
      }
      // check status of user
      Serial.println(uin);
      String status_check = userStatusCheck(uin);
      // if "Cleared", go for borrowing procedure. if "Borrowing", go for returning procedur. if "Flagged", do not do anything.
      digitalWrite(LED_SUCCESS, LOW);
      int procedure_success = 0;
      default_lcd = 0;
      if (status_check.equals("Cleared")) {
        // print lcd string "confirm borrowing? 1 for yes, 2 for no"
        // while(), read state of button 1 and 2. if button 1 high, go to borrowing. else, break.
        lcd.setCursor(0, 0); 
        lcd.print("Confirm borrowing?");
        lcd.setCursor(0, 1);
        lcd.print("Long press 1 for yes");
        lcd.setCursor(0, 2);
        lcd.print("2 for no.");
        while(1){ // basically checks if long press button 1 or 2. if 1, goes to borrowing(). if 2, goes back to standby loop
          BUTTON_1_STATE = digitalRead(BUTTON_1);
          BUTTON_2_STATE = digitalRead(BUTTON_2);
          //Serial.println(String(BUTTON_1_STATE) + " " + String(BUTTON_2_STATE));
          if (BUTTON_1_STATE == HIGH){
            int time_1 = millis();
            while(1){
              BUTTON_1_STATE = digitalRead(BUTTON_1);
              if (BUTTON_1_STATE == LOW){
                break;
              } else {
                  if (millis() - time_1 >= 2000){
                    borrowing(uin);
                    procedure_success = 1;
                    break;
                  }
              }
            }
          }
          if (BUTTON_2_STATE == HIGH){
            int time_1 = millis();
            while(1){
              BUTTON_2_STATE = digitalRead(BUTTON_2);
              if (BUTTON_2_STATE == LOW){
                break;
              } else {
                  if (millis() - time_1 >= 2000){
                    procedure_success = 1;
                    break;
                  }
              }
            }
          }
          if (procedure_success == 1){
          procedure_success = 0;
          break;
         }
        }
      } 
      if (status_check.equals("Borrowing")) {
        lcd.setCursor(0, 0); 
        lcd.print("Confirm returning?");
        lcd.setCursor(0, 1);
        lcd.print("Press 1 for yes,");
        lcd.setCursor(0, 2);
        lcd.print("2 for no.");
        while(1){ // basically checks if long press button 1 or 2. if 1, goes to returning(). if 2, goes back to standby loop
          BUTTON_1_STATE = digitalRead(BUTTON_1);
          BUTTON_2_STATE = digitalRead(BUTTON_2);
          //Serial.println(String(BUTTON_1_STATE) + " " + String(BUTTON_2_STATE));
          if (BUTTON_1_STATE == HIGH){
            int time_1 = millis();
            while(1){
              BUTTON_1_STATE = digitalRead(BUTTON_1);
              if (BUTTON_1_STATE == LOW){
                break;
              } else {
                  if (millis() - time_1 >= 2000){
                    returning(uin);
                    procedure_success = 1;
                    break;
                  }
              }
            }
          }
          if (BUTTON_2_STATE == HIGH){
            int time_1 = millis();
            while(1){
              BUTTON_2_STATE = digitalRead(BUTTON_2);
              if (BUTTON_2_STATE == LOW){
                break;
              } else {
                  if (millis() - time_1 >= 2000){
                    procedure_success = 1;
                    break;
                  }
              }
            }
          }
          if (procedure_success == 1){
          procedure_success = 0;
          break;
         }
        } 
      }
      // reset peripherals
      lcd.clear();
      raw_json = ""; 
      json.clear();
    }
  }
  
  if (VERIFIED == 1){
    // led light up
    digitalWrite(LED_SUCCESS, HIGH);
    delay(4000); // two second delay? before able to scan again
    digitalWrite(LED_SUCCESS, LOW);
    VERIFIED = -1; // set back to initial state
    Serial.println("You can now scan again.");
  } else {
    digitalWrite(LED_SUCCESS, LOW);
  }
}

void borrowing(String uin) {
  Serial.println("You have arrived in borrowing procedure! uin: " + uin);
  // Signal to OTP verification
  int otp_sent_success = sendOTPVerification(uin);

  if (otp_sent_success != 1){
    Serial.println("OTP Verification not sent."); //put here retry later
    return;
  }

  int otp_verify_success = 0;

  while(otp_verify_success != 1){
    lcd.clear();
    lcd.setCursor(0, 0); 
    lcd.print("Please input OTP");
    lcd.setCursor(0, 1);
    lcd.print("in the webapp.");
    otp_verify_success = checkOTPVerification(uin);
    delay(2000);
  }

  lcd.clear();
  lcd.setCursor(0, 0); 
  lcd.print("OTP success!");
  delay(1000);


  // Prompt user to choose a slot 
  lcd.clear();
  lcd.setCursor(0, 0); 
  lcd.print("Pick a slot");
  lcd.setCursor(0, 1);
  lcd.print("Long press 1 for slot 1");
  // no more slot 2
  int procedure_success = 0;
  String rfid = "";
  while(1){ // basically checks if long press button 1if 1, unlocks slot 1. =
    BUTTON_1_STATE = digitalRead(BUTTON_1);
    //Serial.println(String(BUTTON_1_STATE) + " " + String(BUTTON_2_STATE));
    if (BUTTON_1_STATE == HIGH){
      int time_1 = millis();
      while(1){
        BUTTON_1_STATE = digitalRead(BUTTON_1);
        if (BUTTON_1_STATE == LOW){
          break;
        } else {
            if (millis() - time_1 >= 2000){
              rfid = unlock(1);
              lcd.clear();
              lcd.setCursor(0, 0); 
              lcd.print("Slot 1 has been unlocked.");
              procedure_success = 1;
              break;
            }
        }
      }
    }
    if (procedure_success == 1){
    procedure_success = 0;
    break;
    }
  }

  // Asks user to confirm bike has been retrieved.
  lcd.clear();
  lcd.setCursor(0, 0); 
  lcd.print("Confirm you have");
  lcd.setCursor(0, 1);
  lcd.print("retrieved the bike?");
  while(1){ // basically checks if long press button 1. will 
    BUTTON_1_STATE = digitalRead(BUTTON_1);
    //Serial.println(String(BUTTON_1_STATE) + " " + String(BUTTON_2_STATE));
    if (BUTTON_1_STATE == HIGH){
      int time_1 = millis();
      while(1){
        BUTTON_1_STATE = digitalRead(BUTTON_1);
        if (BUTTON_1_STATE == LOW){
          break;
        } else {
            if (millis() - time_1 >= 2000){
              procedure_success = 1;
              break;
            }
        }
      }
    }
    if (procedure_success == 1){
    procedure_success = 0;
    break;
    }
  }

  // runs station update and set user borrowing
  stationUpdate();
  setUserBorrowing(uin, String(STATION_ID), rfid);
  return;
}

String unlock(int slot) { // returns RFID of bike in slot. No more slot 2
  String rfid = rfidScan(slot);
  if (slot == 1){
    digitalWrite(UNLOCK_1, HIGH);
    delay(500);
  }
  digitalWrite(UNLOCK_1, LOW);
  return rfid;
}

void returning(String uin) {
  Serial.println("You have arrived in returning procedure! uin: " + uin);
  String expected_rfid = userBikeCheck(uin);

  // Prompt user to choose a slot 
  lcd.clear();
  lcd.setCursor(0, 0); 
  lcd.print("Pick a slot to return");
  lcd.setCursor(0, 1);
  lcd.print("Long press 1 for slot 1");
  // no more slot 2
  int procedure_success = 0;
  String rfid = "";
  while(1){ // basically checks if long press button 1 or x. if 1, scans slot 1. 
    BUTTON_1_STATE = digitalRead(BUTTON_1);
    //Serial.println(String(BUTTON_1_STATE) + " " + String(BUTTON_2_STATE));
    if (BUTTON_1_STATE == HIGH){
      int time_1 = millis();
      while(1){
        BUTTON_1_STATE = digitalRead(BUTTON_1);
        if (BUTTON_1_STATE == LOW){
          break;
        } else {
            if (millis() - time_1 >= 2000){
              if (rfidScan(1) == expected_rfid){
                lcd.clear();
                lcd.setCursor(0, 0); 
                lcd.print("Bike is in slot 1");
                procedure_success = 1;
                break;
              } else {
                lcd.clear();
                lcd.setCursor(0, 0); 
                lcd.print("Please make sure it is locked.");
                lcd.setCursor(0, 1); 
                lcd.print("Press 1 to confirm.");
              }
              
            }
        }
      }
    }
    if (procedure_success == 1){
    procedure_success = 0;
    break;
    }
  }
  setUserReturned(uin, String(STATION_ID));
  stationUpdate();
  return;
}

String dump_byte_array(byte *buffer, byte bufferSize) { // helper routine for rfidScan
    String output = "";
    for (byte i = 0; i < bufferSize; i++) {
    //Serial.print(buffer[i] < 0x10 ? " 0" : " ");
    //Serial.print(buffer[i], HEX);
    output += String(buffer[i] < 0x10 ? " 0" : " ");
    output += String(buffer[i], HEX);
  }
    output.trim();
    return output;
}

String rfidScan(int rfid_slot) { // rfid slot can be 1 for this station, returns UID
  // Initiate sensor
  int sensor = rfid_slot - 1;
  mfrc522[sensor].PCD_Init();
  String readRFID ="";
  if(mfrc522[sensor].PICC_IsNewCardPresent() && mfrc522[sensor].PICC_ReadCardSerial() && lockCheck(rfid_slot)){
    readRFID = dump_byte_array(mfrc522[sensor].uid.uidByte, mfrc522[sensor].uid.size);
  } else {
    readRFID = "0";
  }
  if(readRFID == "a9 aa b5 b2"){ // translation
    readRFID = "67";
  }
  mfrc522[sensor].PICC_HaltA();
  mfrc522[sensor].PCD_StopCrypto1();
  return readRFID; 
}

int lockCheck(int lock_slot) { // lock slot can be 1 for this station, returns 1 or 0
  int LOCK_CHECK_STATE = 0;
  if (lock_slot == 1) { // checks lock check 1
    LOCK_CHECK_STATE = digitalRead(LOCK_CHECK_1);
  }
  // no slot 2
  Serial.println("Lock_check_state: " + String(LOCK_CHECK_STATE));
  return LOCK_CHECK_STATE;

}

int stationUpdate() { // update station, scans both rfid scanners
  String rfid_uid_1 = rfidScan(1);
  // String rfid_uid_2 = rfidScan(2);

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("wifi not connected. cant send api request");
    return -1;
  }

  WiFiClient client;
  HTTPClient http;

  Serial.println("updating station...");
  http.begin(client, String(String(API_URL) + "/bikes/station-update")); // change this API URL
  http.setTimeout(60000); // timeout of session is 1 s
  http.addHeader("Content-Type", "application/json");

  // json
  String json = String("{\"station_id\":\"" + String(STATION_ID) + "\", \"slots\":{ \"21\":\""+ rfid_uid_1 + "\"}}");
  Serial.println(json);
  int httpCode = http.POST(json);

  if (httpCode > 0) {
    String response = http.getString();
    Serial.printf("http %d, response: %s\n", httpCode, response.c_str());

    response.trim(); // edit to handle otp case
    if (response.equalsIgnoreCase("1")) { // if server sends back verified/truth value"
      Serial.println("station update success.");
      return 1;
      
    } else {
      Serial.println("station update fail.");
      return -1;
    }
  } else {
    Serial.printf("Request failed, error: %s\n", http.errorToString(httpCode).c_str());
    return -1;
 }
 http.end();
}

String userVerify(String uin, String dob, String name) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("wifi not connected. cant send api request");
    return "-1";
  }

  WiFiClient client;
  HTTPClient http;

  Serial.println("verifying user...");
  http.begin(client, String(String(API_URL) + "/verify"));
  http.setTimeout(60000); // timeout of session is 1 s
  http.addHeader("Content-Type", "application/json");

  // json
  String json = String("{\"uin\":\"" + String(uin) + "\", \"dob\":\"" + String(dob) + "\", \"name\":\"" + String(name) + "\"}");
  Serial.println(json);
  int httpCode = http.POST(json);

  if (httpCode > 0) {
    String response = http.getString();
    Serial.printf("http %d, response: %s\n", httpCode, response.c_str());

    response.trim(); 
    if (response.equalsIgnoreCase("\"Success\"")) { 
      Serial.println(response);
      return "Success";
    } else {
      Serial.println(response);
      return "-1";
    }
  } else {
    Serial.printf("Request failed, error: %s\n", http.errorToString(httpCode).c_str());
    return "-1";
 }
 http.end();
}

String userStatusCheck(String uin) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("wifi not connected. cant send api request");
    return "-1";
  }

  WiFiClient client;
  HTTPClient http;

  Serial.println("running status check on user...");
  http.begin(client, String(String(API_URL) + "/bikes/user-status"));
  http.setTimeout(60000); // timeout of session is 1 s
  http.addHeader("Content-Type", "application/json");

  // json
  String json = String("{\"uin\":\"" + String(uin) + "\"}");
  Serial.println(json);
  int httpCode = http.POST(json);

  if (httpCode > 0) {
    String response = http.getString();
    Serial.printf("http %d, response: %s\n", httpCode, response.c_str());

    response.trim(); 
    if (response.equalsIgnoreCase("Borrowing")) { 
      Serial.println("User is currently borrowing.");
      return "Borrowing";
      
    } else if (response.equalsIgnoreCase("Cleared")){
      Serial.println("User is currently cleared.");
      return "Cleared";
    } else if (response.equalsIgnoreCase("Flagged")){
      Serial.println("User is currently flagged.");
      return "Flagged";
    } else {
      Serial.println(response);
      return "-1";
    }
  } else {
    Serial.printf("Request failed, error: %s\n", http.errorToString(httpCode).c_str());
    return "-1";
 }
 http.end();
}

int sendOTPVerification(String uin) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("wifi not connected. cant send api request");
    return -1;
  }

  WiFiClient client;
  HTTPClient http;

  Serial.println("Sending otp to email...");
  http.begin(client, (String(API_URL) + "/auth/generate-otp"));
  http.setTimeout(60000); // timeout of session is 1 s
  http.addHeader("Content-Type", "application/json");

  // json
  String json = String("{\"uin\":\"" + String(uin) + "\"}");
  Serial.println(json);
  int httpCode = http.POST(json);

  if (httpCode > 0) {
    String response = http.getString();
    response.trim(); 
    Serial.printf("http %d, response: %s\n", httpCode, response.c_str());
  
    if (response.equalsIgnoreCase("success")) { 
      Serial.println("OTP sent");
      Serial.println(response);
      return 1;
    } else {
      Serial.println("OTP not sent, error");
      Serial.println(response);
      return -1;
    }
  } else {
    Serial.printf("Request failed, error: %s\n", http.errorToString(httpCode).c_str());
    return -1;
 }
 http.end();
}

int checkOTPVerification(String uin) { // run this in a loop, delay(2000)
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("wifi not connected. cant send api request");
    VERIFIED = 0;
    return -1;
  }

  WiFiClient client;
  HTTPClient http;

  Serial.println("checking otp...");
  http.begin(client, (String(API_URL) + "/auth/check-status"));
  http.setTimeout(60000); // timeout of session is 1 s
  http.addHeader("Content-Type", "application/json");

  // json
  int httpCode = http.POST(String("{\"uin\": \"" + uin + "\"}"));

  if (httpCode > 0) {
    String response = http.getString();
    response.trim();

    Serial.printf("http %d, response: %s\n", httpCode, response.c_str());

    if (response.equalsIgnoreCase("success")) { 
      Serial.println("User successfully verified OTP.");
      return 1;
    } else {
      Serial.println("pending");
      return -1;
    }
  } else {
    Serial.printf("Request failed, error: %s\n", http.errorToString(httpCode).c_str());
    return -1;
 }
 http.end();
}

int setUserBorrowing(String uin, String start_station_ID, String rfid) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("wifi not connected. cant send api request");
    VERIFIED = 0;
    return -1;
  }

  WiFiClient client;
  HTTPClient http;

  Serial.println("Setting user as borrowing...");
  http.begin(client, String(String(API_URL) + "/bikes/set-borrowing"));
  http.setTimeout(60000); // timeout of session is 1 s
  http.addHeader("Content-Type", "application/json");

  // json
  String json = String("{\"uin\":\"" + String(uin) + "\", \"bike_id\":\"" + String(rfid) + "\", \"station_id\":\"" + String(start_station_ID) + "\"}");
  int httpCode = http.POST(json);
  Serial.println(json);

  if (httpCode > 0) {
    String response = http.getString();
    Serial.printf("http %d, response: %s\n", httpCode, response.c_str());

    response.trim(); 
    if (response.equalsIgnoreCase("1")) { 
      Serial.println("User successfully borrowed.");
      return 1;
    } else {
      Serial.println("error");
      return -1;
    }
  } else {
    Serial.printf("Request failed, error: %s\n", http.errorToString(httpCode).c_str());
    return -1;
 }
 http.end();
}

String userBikeCheck(String uin) { // to be tested
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("wifi not connected. cant send api request");
    VERIFIED = 0;
    return "-1";
  }

  WiFiClient client;
  HTTPClient http;

  Serial.println("Checking bike...");
  http.begin(client, String(String(API_URL) + "/bikes/user-bike-check"));
  http.setTimeout(60000); // timeout of session is 1 s
  http.addHeader("Content-Type", "application/json");

  // json
  String json = String("{\"uin\":\"" + String(uin) + "\"}");
  int httpCode = http.POST(json);

  if (httpCode > 0) {
    String response = http.getString();
    Serial.printf("http %d, response: %s\n", httpCode, response.c_str());

    response.trim(); 
    if (response.equalsIgnoreCase("-1")) { 
      Serial.println("error.");
      return "-1";
    } else {
      return response;
    }
  } else {
    Serial.printf("Request failed, error: %s\n", http.errorToString(httpCode).c_str());
    return "-1";
 }
 http.end();
}

int setUserReturned(String uin, String end_station_ID) { //to be tested
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("wifi not connected. cant send api request");
    VERIFIED = 0;
    return -1;
  }

  WiFiClient client;
  HTTPClient http;

  Serial.println("Checking user's bike...");
  http.begin(client, String(String(API_URL) + "/bikes/set-returned"));
  http.setTimeout(60000); // timeout of session is 1 s
  http.addHeader("Content-Type", "application/json");

  // json
  String json = String("{\"station_id\":\"" + String(end_station_ID) + "\", \"uin\":\"" + String(uin) + "\"}");
  int httpCode = http.POST(json);

  if (httpCode > 0) {
    String response = http.getString();
    Serial.printf("http %d, response: %s\n", httpCode, response.c_str());

    response.trim(); 
    if (response.equalsIgnoreCase("1")) { 
      Serial.println("User successfully returned.");
      return 1;
    } else {
      Serial.println("error");
      return -1;
    }
  } else {
    Serial.printf("Request failed, error: %s\n", http.errorToString(httpCode).c_str());
    return -1;
 }
 http.end();
}