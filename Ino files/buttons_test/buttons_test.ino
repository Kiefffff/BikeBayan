const int BUTTON_1 = 34;
const int BUTTON_2 = 35;
void setup() {
  // put your setup code here, to run once:
  // pins to receive signals from buttons
  pinMode(BUTTON_1, INPUT);
  pinMode(BUTTON_2, INPUT);
  Serial.begin(115200);

}

void loop() {
  // put your main code here, to run repeatedly:
  Serial.println("Button 1: " + String(digitalRead(BUTTON_1)) + " Button 2: " + String(digitalRead(BUTTON_2)));

}
