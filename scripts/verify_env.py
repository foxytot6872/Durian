"""Simple script to verify that .env is loaded and keys are accessible."""
import os
from dotenv import load_dotenv

load_dotenv()

key = os.getenv('OPENAI_API_KEY')
if key:
    print('OPENAI_API_KEY found (length={}): {}'.format(len(key), key[:4] + '...' if len(key) > 8 else key))
else:
    print('OPENAI_API_KEY NOT found. Copy .env.example to .env and set the key.')

if __name__ == '__main__':
    python.exe verify_env.py
