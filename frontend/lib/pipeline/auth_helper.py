import sys
import json
import pickle
import os
from pathlib import Path

# Need to import Credentials to pickle it correctly
from google.oauth2.credentials import Credentials

def save_token(json_str: str, token_path: str):
    data = json.loads(json_str)
    
    # Create the Credentials object
    creds = Credentials(
        token=data.get('access_token'),
        refresh_token=data.get('refresh_token'),
        token_uri=data.get('token_uri', 'https://oauth2.googleapis.com/token'),
        client_id=data.get('client_id'),
        client_secret=data.get('client_secret'),
        scopes=data.get('scope', '').split(' ')
    )
    
    # Pickle it exactly as the pipeline expects
    with open(token_path, 'wb') as token:
        pickle.dump(creds, token)
        
    print(f"Successfully saved to {token_path}")

def check_token(token_path: str):
    if not os.path.exists(token_path):
        print(json.dumps({"authenticated": False}))
        return
        
    try:
        with open(token_path, 'rb') as token:
            creds = pickle.load(token)
            
        print(json.dumps({
            "authenticated": bool(creds and creds.valid or (creds and creds.expired and creds.refresh_token)),
            "expired": bool(creds and creds.expired),
            "scopes": creds.scopes if creds else []
        }))
    except Exception as e:
        print(json.dumps({"authenticated": False, "error": str(e)}))

if __name__ == "__main__":
    action = sys.argv[1]
    
    # The pipeline expects token.pickle in its base dir. 
    # Settings.py logic: Path(__file__).parent.parent / "token.pickle"
    # We will assume this script is called with the target path.
    target_path = sys.argv[2]
    
    if action == "save":
        token_json = sys.stdin.read()
        save_token(token_json, target_path)
    elif action == "check":
        check_token(target_path)
