"""Simple script to verify that .env is loaded and keys are accessible."""
import os
from dotenv import load_dotenv

load_dotenv()

key = os.getenv('OPENAI_API_KEY')
if key:
    if key.startswith('[') or key.endswith(']') or key.startswith('"') or key.endswith('"'):
        print('OPENAI_API_KEY looks malformed. Remove any surrounding quotes or brackets in .env.')
    else:
        print('OPENAI_API_KEY found (length={}): {}'.format(len(key), key[:4] + '...' if len(key) > 8 else key))
else:
    print('OPENAI_API_KEY NOT found. Copy .env.example to .env and set the key.')

google_key = os.getenv('GOOGLE_API_KEY')
if google_key:
    print('GOOGLE_API_KEY found (length={}): {}'.format(len(google_key), google_key[:4] + '...' if len(google_key) > 8 else google_key))
else:
    print('GOOGLE_API_KEY not set (only required if MODEL_PROVIDER=gemini).')
