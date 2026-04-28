from flask import Flask, request, render_template_string
from mosip_auth_sdk import MOSIPAuthenticator
from dynaconf import Dynaconf
import time

app = Flask(__name__)

config = Dynaconf(settings_files=["./config.toml"], environments=False)
authenticator = MOSIPAuthenticator(config=config)

# Dictionary to hold states while the server makes the ESP wait
auth_sessions = {}

HTML_TEMPLATE = """
<!DOCTYPE html>
<html>
<head><title>BikeBayan OTP Input</title></head>
<body style="font-family: Arial, sans-serif; text-align: center; margin-top: 50px;">
    <h2>BikeBayan OTP Verification</h2>
    <form action="/submit_otp" method="POST">
        <p>UIN: <input type="text" name="uin" required></p>
        <p>OTP: <input type="text" name="otp" required></p>
        <button type="submit" style="padding: 10px 20px; font-size: 16px;">Verify OTP</button>
    </form>
    {% if message %}
        <p style="color: {{ color }}; font-weight: bold; margin-top: 20px;">{{ message }}</p>
    {% endif %}
</body>
</html>
"""

# -------------------------------------------------------------------
# ROUTES FOR THE WEB BROWSER 
# -------------------------------------------------------------------

@app.route('/', methods=['GET'])
def index():
    return render_template_string(HTML_TEMPLATE, message="", color="black")

@app.route('/submit_otp', methods=['POST'])
def submit_otp():
    uin = request.form.get("uin")
    otp = request.form.get("otp")

    if uin not in auth_sessions:
        return render_template_string(HTML_TEMPLATE, message="UIN not found. Did the ESP scan it yet?", color="red")

    txn_id = auth_sessions[uin]["txn_id"]

    try:
        # Verify with MOSIP
        response = authenticator.auth(
            individual_id=uin,
            individual_id_type="UIN",
            otp_value=otp,
            txn_id=txn_id,
            consent=True,
        )
        
        # --- NEW DEBUGGING SAFETY NET ---
        print(f"MOSIP Status Code: {response.status_code}")
        print(f"Raw MOSIP Response: '{response.text}'")
        
        try:
            response_body = response.json()
        except Exception as json_err:
            print(f"JSON Parse Error: {json_err}")
            error_msg = f"MOSIP returned non-JSON data. Raw text: {response.text}"
            return render_template_string(HTML_TEMPLATE, message=error_msg, color="red")
        # --------------------------------

        if "errors" in response_body and response_body["errors"]:
            return render_template_string(HTML_TEMPLATE, message="Invalid OTP. Try again.", color="red")

        # Success! Tell the waiting ESP loop to release
        auth_sessions[uin]["status"] = "Truth"
        return render_template_string(HTML_TEMPLATE, message="Verification Successful! The bike is unlocking...", color="green")
        
    except Exception as e:
        return render_template_string(HTML_TEMPLATE, message=f"Error checking MOSIP: {e}", color="red")
# -------------------------------------------------------------------
# ROUTE FOR THE ESP8266 (THE "WAITING" ENDPOINT)
# -------------------------------------------------------------------

@app.route('/api/verify', methods=['POST'])
def verify_scan():
    """ESP calls this once it sends the OTP."""
    try:
        # Force=True ensures it parses as JSON even if ESP headers are slightly off
        data = request.get_json(force=True)
        
        # --- NEW VISUAL DEBUGGING BLOCK ---
        print("\n" + "="*40)
        print("NEW REQUEST FROM ESP8266")
        print(f"Raw JSON Payload Received: {data}")
        print("="*40 + "\n")
        # ----------------------------------

        if not data:
            print("Error: Received an empty payload from the ESP.")
            return "False", 400

        uin = data.get("uin")
        if not uin:
            print("Error: Payload is missing the 'uin' key.")
            return "False", 400

        print(f"Triggering MOSIP OTP generation for UIN: {uin}...")

        # Step 1: Tell MOSIP to send the OTP
        print(f"Triggering MOSIP OTP generation for UIN: {uin}...")
        
        try:
            response = authenticator.genotp(
                individual_id=uin,
                individual_id_type="UIN",
                email=True,
                phone=False,
            )
            
            print(f"MOSIP GenOTP Status Code: {response.status_code}")
            
            # This is where it was likely crashing silently!
            response_body = response.json() 
            
        except Exception as json_err:
            print(f"JSON Parse Error during GenOTP: {json_err}")
            # Only try to print response.text if the response variable exists
            if 'response' in locals() and hasattr(response, 'text'):
                print(f"Raw text from MOSIP: '{response.text}'")
            return "False", 500

        if "errors" in response_body and response_body["errors"]:
            print(f"Failed to generate OTP via MOSIP. Errors: {response_body['errors']}")
            return "False", 400

        # Save the transaction ID and set status to pending
        auth_sessions[uin] = {
            "txn_id": response_body.get("transactionID"),
            "status": "Pending"
        }

        # Step 2: The Waiting Game
        timeout_seconds = 60 
        start_time = time.time()
        
        print("Waiting up to 60s to input OTP on the webpage...")
        
        while time.time() - start_time < timeout_seconds:
            # SAFEGUARD: Check if the session was deleted by another timeout
            if uin not in auth_sessions:
                print("Session was overwritten or deleted by another request.")
                return "False", 400

            # Check if the webpage changed the status to Truth
            if auth_sessions[uin]["status"] == "Truth":
                print("OTP verified successfully! Releasing ESP...")
                del auth_sessions[uin] # Clean up
                return "Truth", 200    
                
            # Pause for 1 second before checking again
            time.sleep(1)

        # Step 3: Timeout reached
        print("Timeout: No OTP entered on the webpage in time.")
        if uin in auth_sessions:
            del auth_sessions[uin]
        return "False", 408 

    except Exception as e:
        print(f" Server error in /api/verify: {e}")
        return "False", 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)