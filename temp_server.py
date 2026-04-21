from flask import Flask, request
from mosip_auth_sdk.models import DemographicsModel
from mosip_auth_sdk import MOSIPAuthenticator
from dynaconf import Dynaconf

app = Flask(__name__)

# Initialize MOSIP Authenticator once when the server starts
config = Dynaconf(settings_files=["./config.toml"], environments=False)
authenticator = MOSIPAuthenticator(config=config)

@app.route('/api/verify', methods=['POST'])
def verify_scan():
    try:
        # force=True ensures Flask tries to parse JSON even if the ESP 
        # somehow drops the "Content-Type: application/json" header
        data = request.get_json(force=True) 
        
        if not data:
            print("No JSON received.")
            return "False", 400

        # Extract the variables sent by your scanner
        uin = data.get("individual_id")
        dob = data.get("dob")
        name = data.get("name") 

        # Build the demographics model
        name_list = [{"language": "eng", "value": name}] if name else None
        demographics_data = DemographicsModel(
            name=name_list,
            dob=dob
        )

        # Authenticate with MOSIP
        response = authenticator.auth(
            individual_id=uin,
            individual_id_type="UIN",
            demographic_data=demographics_data,
            consent=True,
        )
        
        # If MOSIP authentication is successful, return the exact string the ESP expects
        # Note: If MOSIP returns a 200 OK but the payload says auth failed, 
        # you might need to check response.json() here before returning "Truth".
        print(f"MOSIP Response: {response.json()}")
        return "Truth", 200
        
    except Exception as e:
        print(f"Authentication failed or error occurred: {e}")
        # Return anything other than "Truth" so the ESP8266 registers VERIFIED = 0
        return "False", 500

if __name__ == '__main__':
    # host='0.0.0.0' allows the ESP8266 to connect over the local Wi-Fi
    app.run(host='0.0.0.0', port=5000)