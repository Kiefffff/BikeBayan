from mosip_auth_sdk.models import DemographicsModel
from mosip_auth_sdk import MOSIPAuthenticator
from dynaconf import Dynaconf

config = Dynaconf(settings_files=["./config.toml"], environments=False)
authenticator = MOSIPAuthenticator(config=config)

scanned_uin = "7831465308"
scanned_name = "Rafael Jimenez" 
scanned_dob = "2003/06/12"      

print("Sending Demographic Data for Authentication...")

# 2. Package the scanned data as the "authentication factor"
demographics_data = DemographicsModel(
    name=[
        {
            "language": "eng",  # Try "eng" first, fallback to "fil" if the RP policy requires it
            "value": scanned_name
        }
    ],
    dob=scanned_dob
)

# 3. Call KYC directly (NO OTP, NO Transaction ID)
kyc_response = authenticator.kyc(
    individual_id=scanned_uin,
    individual_id_type="UIN",
    demographic_data=demographics_data, 
    consent=True,
)

kyc_response_body = kyc_response.json()

# Check for failures (e.g., the scanned name didn't match the database exactly)
if "errors" in kyc_response_body and kyc_response_body["errors"]:
    print(f"Verification Failed: {kyc_response_body['errors']}")
    exit(1)

# 4. Decrypt and Extract the Data you wanted
decrypted_response = authenticator.decrypt_response(kyc_response_body)
print(f"DEBUG - Fields allowed by RP Policy: {list(decrypted_response.keys())}")
extracted_email = decrypted_response.get("email") or decrypted_response.get("emailId")
raw_name = decrypted_response.get("name")
extracted_name = decrypted_response.get("name_eng")
if isinstance(raw_name, list) and len(raw_name) > 0:
    extracted_name = raw_name[0].get("value")
elif isinstance(raw_name, str):
    extracted_name = raw_name

print("\n--- VERIFICATION & EXTRACTION SUCCESSFUL ---")
print(f"UIN:   {scanned_uin}")
print(f"Name:  {extracted_name}")
print(f"Email: {extracted_email}")