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
const int RFID_SS_1 = 25;
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
const char* WIFI_SSID = "brunolee";
const char* WIFI_PW = "mgabatalangnakakaalam99";
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
  pinMode(RFID_SS_1, OUTPUT);
  pinMode(RFID_SS_2, OUTPUT);
  digitalWrite(RFID_SS_1, HIGH);  // deselect both before SPI starts
  digitalWrite(RFID_SS_2, HIGH);
  SPI.begin();

  for (uint8_t reader = 0; reader < numReaders; reader++) {
    mfrc522[reader].PCD_Init(ssPins[reader], resetPin); // Init each MFRC522 card
    delay(200);
    mfrc522[reader].PCD_SetAntennaGain(mfrc522[reader].RxGain_max);
    delay(50);
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
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("setup running..");

  // connect to wifi
  Serial.printf("Connecting to Wifi: %s", WIFI_SSID);
  lcd.clear();
  lcd.print("Connecting to Wifi: " + String(WIFI_SSID));
  WiFi.begin(WIFI_SSID, WIFI_PW);
  
  while (WiFi.status() != WL_CONNECTED) {

    delay(500);
    Serial.print(".");
    lcd.print(".");
    delay(500);
    Serial.print(".");
    lcd.print(".");
    delay(500);
    Serial.print(".");
    lcd.print(".");
    delay(500);
    lcd.clear();
    lcd.print("Connecting to Wifi: " + String(WIFI_SSID));
  }
  Serial.println("\nWiFi connceted. IP: " + WiFi.localIP().toString());
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("WiFi connected.");
  lcd.setCursor(0, 1);
  lcd.print(WiFi.localIP().toString());
  delay(1000);
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
        raw_json = "";
        json.clear();
        return;
      } else {
        default_lcd = 0;
        digitalWrite(LED_SUCCESS, HIGH);
        delay(500);
      }
      // check status of user
      Serial.println(uin);
      String status_check = userStatusCheck(uin);
      // if "Cleared", go for borrowing procedure. if "Borrowing", go for returning procedur. if "Flagged"
      digitalWrite(LED_SUCCESS, LOW);
      int procedure_success = 0;
      default_lcd = 0;
      if (status_check.equals("Cleared")) { // Borrowing check
        // Discontinue borrowing when no bikes available 
        if (rfidScan(1) == "0"){ // 1 slot here, 2 slots in two_station
          lcd.clear();
          lcd.setCursor(0, 0); 
          lcd.print("Sorry, no bikes");
          lcd.setCursor(0, 1); 
          lcd.print("are available.");
          delay(500);
          return;
        }
        // print lcd string "confirm borrowing? 1 for yes, 2 for no"
        // while(), read state of button 1 and 2. if button 1 high, go to borrowing. else, break.
        lcd.clear();
        lcd.setCursor(0, 0); 
        lcd.print("Confirm borrowing?");
        lcd.setCursor(0, 1);
        lcd.print("press 1 for yes");
        lcd.setCursor(0, 2);
        lcd.print("2 for no.");
        while(1){ // basically checks if long press button 1 or 2. if 1, goes to borrowing(). if 2, goes back to standby loop
          BUTTON_1_STATE = digitalRead(BUTTON_1);
          BUTTON_2_STATE = digitalRead(BUTTON_2);
          //Serial.println(String(BUTTON_1_STATE) + " " + String(BUTTON_2_STATE));
          if (BUTTON_1_STATE == HIGH){
            borrowing(uin);
            break;
          }
          if (BUTTON_2_STATE == HIGH){
            break;
          }
        }
      } 
      if (status_check.equals("Borrowing") || status_check.equals("Flagged")) { // Returning check
        lcd.setCursor(0, 0); 
        lcd.print("Confirm returning?");
        lcd.setCursor(0, 1);
        lcd.print("Press 1 for yes,");
        lcd.setCursor(0, 2);
        lcd.print("2 for no.");
        while(1){ // basically checks if long press button 1 or 2. if 1, goes to borrowing(). if 2, goes back to standby loop
          BUTTON_1_STATE = digitalRead(BUTTON_1);
          BUTTON_2_STATE = digitalRead(BUTTON_2);
          //Serial.println(String(BUTTON_1_STATE) + " " + String(BUTTON_2_STATE));
          if (BUTTON_1_STATE == HIGH){
            returning(uin);
            break;
          }
          if (BUTTON_2_STATE == HIGH){
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

  // Prompt user to choose a slot 
  lcd.clear();
  lcd.setCursor(0, 0); 
  lcd.print("Pick a slot w/ bike");
  lcd.setCursor(0, 1);
  lcd.print("Press 1 for slot 1");
  // no more slot 2
  int procedure_success = 0;
  String rfid = "";
  while(1){ // basically checks if long press button 1 if 1, unlocks slot 1. =
    BUTTON_1_STATE = digitalRead(BUTTON_1);
    //Serial.println(String(BUTTON_1_STATE) + " " + String(BUTTON_2_STATE));
    if (BUTTON_1_STATE == HIGH){
      rfid = unlock(1);
      if (rfid == "0"){
        lcd.clear();
        lcd.setCursor(0, 0); 
        lcd.print("No bike on this slot."); // more important in two station slot
        delay(500);
        lcd.clear();
        lcd.setCursor(0, 0); 
        lcd.print("Pick a slot w/ bike");
        lcd.setCursor(0, 1);
        lcd.print("press 1 for slot 1");
        break;
      } 
      lcd.clear();
      lcd.setCursor(0, 0); 
      lcd.print("Slot 1 has been unlocked.");
      break;
    }
  }

  // Asks user to confirm bike has been retrieved.
  lcd.clear();
  lcd.setCursor(0, 0); 
  lcd.print("Confirm bike");
  lcd.setCursor(0, 1);
  lcd.print("retrieved?");
  procedure_success = 0;
  while(1){ // basically checks if long press button 1. will 
    BUTTON_1_STATE = digitalRead(BUTTON_1);
    //Serial.println(String(BUTTON_1_STATE) + " " + String(BUTTON_2_STATE));
    if (BUTTON_1_STATE == HIGH){
      break;
    }
  }

  // runs station update and set user borrowing
  stationUpdate();
  setUserBorrowing(uin, String(STATION_ID), rfid);
  return;
}

String unlock(int slot) { // sends unlock signal, returns RFID of bike in slot. 
  String rfid = rfidScan(slot);
   // keep unlocking until bike is no longer locked
  if (rfid == "0"){
    return "0";
  }
  if (slot == 1){
    while(1){
      digitalWrite(UNLOCK_1, HIGH);
      delay(1500); // 1.5 seconds MAX 
      digitalWrite(UNLOCK_1, LOW);
      delay(2500); // 2.5 seconds rest
      if(lockCheck(1) == 0){
        delay(1500);
        if(lockCheck(1) == 0){
          break;
        }
      }
    }
  }
  // set all signals to none
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
  lcd.print("Press 1 for slot 1");
  // no more slot 2
  int procedure_success = 0;
  String rfid = "";
  while(1){ // basically checks if long press button 1 or x. if 1, scans slot 1. 
    BUTTON_1_STATE = digitalRead(BUTTON_1);
    //Serial.println(String(BUTTON_1_STATE) + " " + String(BUTTON_2_STATE));
    if (BUTTON_1_STATE == HIGH){
      if (rfidScan(1) == expected_rfid){
        lcd.clear();
        lcd.setCursor(0, 0); 
        lcd.print("Bike is in slot 1");
        procedure_success = 1;
        break;
      } else {
        lcd.clear();
        lcd.setCursor(0, 0); 
        lcd.print("Please make sure its locked.");
        lcd.setCursor(0, 1); 
        lcd.print("Press slot button again to confirm.");
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

String rfidScan(int rfid_slot) { // rfid slot can be 1 or 2 for this station, returns UID
  
  int sensor = rfid_slot - 1;
  // Show LCD msg
  lcd.clear();
  lcd.setCursor(0, 0); 
  lcd.print("RFID scan: " + String(rfid_slot)); // 12 chars
  Serial.println("RFID scan: " + String(rfid_slot));
  delay(100);
  String readRFID ="";
  //for(int i = 0; i < 2; i++){
  // Initiate sensor
  mfrc522[sensor].PCD_Init(ssPins[sensor], resetPin);
  delay(100);
  mfrc522[sensor].PCD_SetAntennaGain(mfrc522[sensor].RxGain_max);
  delay(50);
  // Initiate evaluation
  
  bool isNewCard = mfrc522[sensor].PICC_IsNewCardPresent();
  bool readSerial = mfrc522[sensor].PICC_ReadCardSerial();
  bool isLocked = lockCheck(rfid_slot);

  Serial.println(String(readSerial) + String(isLocked));
  lcd.clear();
  lcd.print(String(readSerial) + String(isLocked));
  delay(200);

  if(readSerial && isLocked){
    readRFID = dump_byte_array(mfrc522[sensor].uid.uidByte, mfrc522[sensor].uid.size);
    Serial.println("TRUE RFID read: " + String(readRFID));
  } else {
    readRFID = "0";
    Serial.println(dump_byte_array(mfrc522[sensor].uid.uidByte, mfrc522[sensor].uid.size));
  }
  mfrc522[sensor].PICC_HaltA();
  mfrc522[sensor].PCD_StopCrypto1();
  //}
  // translation (this our only demo bike)
  if(readRFID == "96 f9 11 06"){ 
    readRFID = "67";
  }
  // LCD notes bike detection
  if(readRFID != "0"){ 
    lcd.clear();
    lcd.setCursor(0, 0); 
    lcd.print("Bike detected");
    delay(100);
  } else {
    Serial.println("RFID not detected at " + String(rfid_slot));
  }
  
  return readRFID; 
}

int lockCheck(int lock_slot) { // lock slot can be 1 for this station, returns 1 or 0
  int LOCK_CHECK_STATE = 0;
  if (lock_slot == 1) { // checks lock check 1
    LOCK_CHECK_STATE = digitalRead(LOCK_CHECK_1);
  }
  // no slot 2
  Serial.println("Lock_check_state: " + String(LOCK_CHECK_STATE));
  // LCD message
  lcd.clear();
  lcd.setCursor(0, 0); 
  lcd.print("Lock " + String(lock_slot) + ": " + String(LOCK_CHECK_STATE)); // careful, less than 20 chars (9 chars)
  delay(100);

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
  // LCD print station:
  lcd.clear();
  lcd.setCursor(0, 0); 
  lcd.print("station update..."); //17 char
  // http
  http.begin(client, String(String(API_URL) + "/bikes/station-update")); // change this API URL
  http.setTimeout(60000); // timeout of session is 1 min
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
      lcd.clear();
      lcd.setCursor(0, 0); 
      lcd.print("success"); 
      return 1;
      
    } else {
      Serial.println("station update fail.");
      lcd.clear();
      lcd.setCursor(0, 0); 
      lcd.print("fail"); 
      return -1;
    }
  } else {
    Serial.printf("Request failed, error: %s\n", http.errorToString(httpCode).c_str());
    lcd.clear();
    lcd.setCursor(0, 0); 
    lcd.print("request fail"); 
    return -1;
 }
 http.end();
}

String userVerify(String uin, String dob, String name) { // MOSIP
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("wifi not connected. cant send api request");
    return "-1";
  }

  WiFiClient client;
  HTTPClient http;

  Serial.println("verifying user");
  // LCD message
  lcd.clear();
  lcd.setCursor(0, 0); 
  lcd.print("verifying user"); //17 char

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
      lcd.clear();
      lcd.setCursor(0, 0); 
      lcd.print("Verified user.");
      return "Success";
    } else {
      Serial.println(response);
      lcd.clear();
      lcd.setCursor(0, 0); 
      lcd.print("Unable to verify user. Try Again");
      delay(1000);
      return "-1";
    }
  } else {
    Serial.printf("Request failed, error: %s\n", http.errorToString(httpCode).c_str());
    lcd.clear();
    lcd.print("Verification Request Failed");
    delay(1000);
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
  // LCD message
  lcd.clear();
  lcd.setCursor(0, 0); 
  lcd.print("User status");
  lcd.setCursor(0, 1);
  lcd.print("check...");

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
      lcd.clear();
      lcd.setCursor(0, 0); 
      lcd.print("User borrowing"); // 14
      delay(500);
      return "Borrowing";
      
    } else if (response.equalsIgnoreCase("Cleared")){
      Serial.println("User is currently cleared.");
      lcd.clear();
      lcd.setCursor(0, 0); 
      lcd.print("User cleared"); // 14
      delay(500);
      return "Cleared";
    } else if (response.equalsIgnoreCase("Flagged")){
      Serial.println("User is currently flagged.");
      lcd.clear();
      lcd.setCursor(0, 0); 
      lcd.print("User FLAGGED"); // 14
      delay(500);
      lcd.clear();
      lcd.setCursor(0, 0); 
      lcd.print("Please resolve ASAP!"); // 19
      delay(500);
      return "Flagged";
    } else {
      Serial.println(response);
      lcd.clear();
      lcd.setCursor(0, 0); 
      lcd.print("Unable get status"); // 14
      delay(500);
      return "-1";
    }
  } else {
    Serial.printf("Request failed, error: %s\n", http.errorToString(httpCode).c_str());
    lcd.clear();
    lcd.setCursor(0, 0); 
    lcd.print("Request failed"); // 14
    delay(500);
    return "-1";
 }
 http.end();
}

int sendOTPVerification(String uin) { // MOSIP
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("wifi not connected. cant send api request");
    return -1;
  }

  WiFiClient client;
  HTTPClient http;

  Serial.println("Sending otp to email...");
  // LCD Message
  lcd.clear();
  lcd.setCursor(0, 0); 
  lcd.print("Sending otp");
  lcd.setCursor(0, 1); 
  lcd.print("to email...");
  // http
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
      lcd.clear();
      lcd.setCursor(0, 0); 
      lcd.print("OTP sent");
      return 1;
    } else {
      Serial.println("OTP not sent, error");
      Serial.println(response);
      lcd.clear();
      lcd.setCursor(0, 0); 
      lcd.print("OTP not sent");
      return -1;
    }
  } else {
    Serial.printf("Request failed, error: %s\n", http.errorToString(httpCode).c_str());
    return -1;
 }
 http.end();
}

int checkOTPVerification(String uin) { // MOSIP, run this in a loop, delay(2000)
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
      lcd.clear();
      lcd.setCursor(0, 0); 
      lcd.print("OTP verified!");
      return 1;
    } else {
      Serial.println("pending");
      lcd.clear();
      lcd.setCursor(0, 0); 
      lcd.print("OTP pending");
      delay(500);
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
  // LCD message
  lcd.clear();
  lcd.setCursor(0, 0); 
  lcd.print("Updating user");
  lcd.setCursor(0, 1);
  lcd.print("status...");
  // http
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
      lcd.clear();
      lcd.setCursor(0, 0); 
      lcd.print("User now borrowing"); 
      return 1;
    } else {
      Serial.println("error");
      lcd.clear();
      lcd.setCursor(0, 0); 
      lcd.print("error"); 
      return -1;
    }
  } else {
    Serial.printf("Request failed, error: %s\n", http.errorToString(httpCode).c_str());
    lcd.clear();
      lcd.setCursor(0, 0); 
      lcd.print("request failed"); 
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
  // LCD message
  lcd.clear();
  lcd.setCursor(0, 0); 
  lcd.print("Checking user bike..");
  // http
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
      lcd.clear();
      lcd.setCursor(0, 0); 
      lcd.print("error");
      delay(500);
      return "-1";
    } else {
      lcd.clear();
      lcd.setCursor(0, 0); 
      lcd.print("Bike: " + String(response));
      delay(500);
      return response;
    }
  } else {
    Serial.printf("Request failed, error: %s\n", http.errorToString(httpCode).c_str());
    lcd.clear();
      lcd.setCursor(0, 0); 
      lcd.print("request failed");
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
  //LCD Message
  lcd.clear();
  lcd.setCursor(0, 0); 
  lcd.print("Update return..");
  // http
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
      lcd.clear();
      lcd.setCursor(0, 0); 
      lcd.print("Return success");
      return 1;
    } else {
      Serial.println("error");
      lcd.clear();
      lcd.setCursor(0, 0); 
      lcd.print("error");
      return -1;
    }
  } else {
    Serial.printf("Request failed, error: %s\n", http.errorToString(httpCode).c_str());
    lcd.clear();
      lcd.setCursor(0, 0); 
      lcd.print("request failed");
    return -1;
 }
 http.end();
}