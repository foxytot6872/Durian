Running the chatbot as a service on Linux
----------------------------------------
- Copy `chatbot-api.service` to `/etc/systemd/system/chatbot-api.service`.
- Create `/etc/durian/chatbot-api.env` with your API keys and model settings.
- Run:

```bash
sudo systemctl daemon-reload
sudo systemctl enable chatbot-api
sudo systemctl start chatbot-api
```

The chatbot should listen on `127.0.0.1:8000`, and Nginx can proxy `/api/chat` to it.
How to store API keys and secrets

1. Create a `.env` file in the project root (next to this repo's `package.json`).
   - Copy `.env.example` to `.env` and fill your keys.

2. The repository already ignores `.env` via `.gitignore`, so your secrets won't be committed.

3. Loading secrets in Python (example):

```python
from dotenv import load_dotenv
import os

load_dotenv()  # reads .env in project root
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
```

4. Loading secrets in Node.js (example):

```js
// install dotenv in your Node environment: npm install dotenv
require('dotenv').config();
const openaiKey = process.env.OPENAI_API_KEY;
```

5. Quick verification: run the included `scripts/verify_env.py` to confirm the environment variable loads.

6. Start the chatbot backend so the browser widget can talk to GPT:

```bash
D:/python.exe chatbot_api.py
```

Or start both the static site and the chatbot backend together. This is now the default behavior for `npm start` and `npm run dev`:

```bash
npm start
```

If port `5500` is already busy, the launcher automatically falls back to the next available port.

Then open the dashboard and use the chatbot widget. It posts messages to `http://localhost:8000/api/chat` by default.

```bash
# Use the workspace Python command if configured
D:/python.exe scripts/verify_env.py
```

Security note: never store production secrets in the repository. Use environment variables, secret managers, or CI/CD secrets for deployments.

Using Google AI Studio / Gemini
--------------------------------
- Install the client (quick option):

```bash
D:/python.exe -m pip install google-generativeai
```

- Add these to your `.env` to use Gemini instead of OpenAI:

```
MODEL_PROVIDER=gemini
GOOGLE_API_KEY=your_google_api_key_here
GENAI_MODEL=text-bison-001
```

The local proxy will pick up `MODEL_PROVIDER` and route requests to Google if set to `gemini`.