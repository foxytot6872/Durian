# Chatbot API Systemd Setup

Use this on your Linux server to keep `chatbot_api.py` running after reboot.

## 0. Deploy the repo to your server

If you haven't already, clone/copy the Durian repo to `/var/www/durian` on your Linux server:

```bash
sudo git clone https://github.com/foxytot6872/Durian.git /var/www/durian
sudo chown -R www-data:www-data /var/www/durian
```

Or if you already have the repo elsewhere, update the paths in `chatbot-api.service` and the commands below accordingly.

## 1. Copy the service file

```bash
sudo cp /var/www/durian/chatbot-api.service /etc/systemd/system/chatbot-api.service
```

## 2. Create the environment file

Create `/etc/durian/chatbot-api.env` and put your API keys there:

```bash
sudo mkdir -p /etc/durian
sudo nano /etc/durian/chatbot-api.env
```

Example contents:

```bash
OPENAI_API_KEY=your_openai_api_key_here
CHATBOT_API_PORT=8000
MODEL_PROVIDER=openai
OPENAI_MODEL=gpt-4o-mini
OPENAI_TEMPERATURE=0.7
```

If you use Gemini instead of OpenAI:

```bash
MODEL_PROVIDER=gemini
GOOGLE_API_KEY=your_google_api_key_here
GENAI_MODEL=gemini-2.0-flash
```

## 3. Enable and start the service

```bash
sudo systemctl daemon-reload
sudo systemctl enable chatbot-api
sudo systemctl start chatbot-api
sudo systemctl status chatbot-api
```

## 4. Verify the API

```bash
curl -i http://127.0.0.1:8000/api/chat
```

For a real request:

```bash
curl -i -X POST http://127.0.0.1:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"hello","history":[]}'
```

## 5. Make the API publicly accessible

The chatbot frontend on Netlify calls `https://duriancam.duckdns.org/api/chat` directly with CORS.

**If your VPS is behind a firewall, ensure port 443 is open:**

```bash
sudo ufw allow 443/tcp
sudo ufw reload
```

The API already has CORS headers, so cross-origin requests from `durian-dashboard.netlify.app` will work. No Nginx proxy needed.
