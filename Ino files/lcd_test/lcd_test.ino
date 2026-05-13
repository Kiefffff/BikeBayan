/*
 * Project: IskakINO_LiquidCrystal_I2C
 * Folder: examples/01_HelloWorld
 * Description: Basic example to demonstrate auto-addressing and simple text output.
 * Author: Iskak Fatoni
 */

#include <IskakINO_LiquidCrystal_I2C.h>

// Inisialisasi: (Jumlah Kolom, Jumlah Baris)
// Alamat I2C akan dicari otomatis oleh library
LiquidCrystal_I2C lcd(20, 4);

void setup() {
  // 1. Inisialisasi I2C dan LCD
  // Memanggil fungsi _scanAddress() secara internal
  lcd.begin();         
  
  // 2. Menyalakan Lampu Latar
  lcd.backlight();     

  // 3. Menampilkan Pesan di Baris Pertama (0)

}

void loop() {
  // Loop kosong untuk contoh dasar
  lcd.setCursor(0, 0); 
  lcd.print("line 1");
  lcd.setCursor(0, 1);
  lcd.print("line 2");
  lcd.setCursor(0, 2);
  lcd.print("line 3");
  lcd.setCursor(0, 3);
  lcd.print("line 4");
  delay(2000);
  lcd.setCursor(0, 0); 
  lcd.print("line 5");
  lcd.setCursor(0, 1);
  lcd.print("line 6");
  lcd.setCursor(0, 2);
  lcd.print("line 7");
  lcd.setCursor(0, 3);
  lcd.print("line 8");
  delay(2000);

}
