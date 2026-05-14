const int RXD2 = 16;
const int TXD2 = 17;
HardwareSerial scanner(2); // UART2

void setup() {
  // put your setup code here, to run once:
  Serial.begin(115200); 
  scanner.begin(9600, SERIAL_8N1, RXD2, TXD2);
}

String raw_json = "";

void loop() {
  // put your main code here, to run repeatedly:
    if (scanner.available()) {
      char c = scanner.read();
      //Serial.print(c); 
      raw_json += c; // add bytes to text variable
      if (c == '}'){ // once retrieve closing brace, have complete json file
        Serial.print('\n');
        Serial.println("captured JSON: " + raw_json); // check text variable
        raw_json = "";
      }
    }
}
