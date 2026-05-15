# Gemini AI Chatbot Integration Guide
## Two-Phase Architecture: Firebase + Python RAG

---

## Table of Contents
1. [Current Architecture Overview](#current-architecture-overview)
2. [Phase A: Firebase Cloud Functions + Gemini Integration](#phase-a-firebase-cloud-functions--gemini-integration)
3. [Phase B: Python RAG Backend with LangChain + ChromaDB](#phase-b-python-rag-backend-with-langchain--chromadb)
4. [API Communication Patterns](#api-communication-patterns)
5. [Deployment Strategy](#deployment-strategy)
6. [Security & Best Practices](#security--best-practices)

---

## Current Architecture Overview

### Existing Setup
```
┌─────────────────────────────────────────────────────────────┐
│                     Netlify Frontend                         │
│              (Node.js + Static Assets)                       │
│          durian-dashboard.netlify.app                        │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
   Firebase       Firebase          Python
   Functions      Firestore      chatbot_api.py
   (Auth, DB)     (Real-time)    (localhost:8000)
```

### Current Python Chatbot (chatbot_api.py)
- **Location**: Local Python HTTP server (port 8000)
- **Supported Models**: OpenAI (default), Gemini (opt-in with `ENABLE_GEMINI=true`)
- **Environment**: Uses `.env` for API keys
- **Deployment**: Systemd service on Linux server at `duriancam.duckdns.org`

### Limitations
- Direct Python API requires separate server management
- Difficult to scale on serverless Firebase infrastructure
- Manual environment configuration per deployment

---

## Phase A: Firebase Cloud Functions + Gemini Integration

### Objective
Establish direct Gemini API connection via Firebase Cloud Functions for basic chat functionality without requiring a separate Python server.

### Architecture

```
┌──────────────────────────┐
│   Netlify Frontend       │
│   (HTML/JS/CSS)          │
│                          │
│   chatbot-widget.js      │
└────────────┬─────────────┘
             │ POST /api/chat
             │
┌────────────▼─────────────┐
│  Firebase Cloud Function │
│  (Node.js Runtime)       │
│                          │
│  ├─ POST /api/chat       │
│  ├─ Message handling     │
│  ├─ Token management     │
│  └─ Error handling       │
└────────────┬─────────────┘
             │ HTTPS
             │
      ┌──────▼──────┐
      │ Gemini API  │
      │ (google-    │
      │  generativeai)
      └─────────────┘
```

### Step 1: Set Up Firebase Functions Project

#### 1a. Initialize Firebase Project (if not already done)
```bash
npm install -g firebase-tools
firebase login
firebase init functions
```

#### 1b. Install Dependencies
```bash
cd functions
npm install @google-cloud/functions-framework @google/generative-ai express cors dotenv
```

#### 1c. Update `functions/package.json`
```json
{
  "name": "durian-chatbot",
  "description": "Gemini-powered chatbot for Durian dashboard",
  "version": "1.0.0",
  "dependencies": {
    "@google/generative-ai": "^0.3.0",
    "@google-cloud/functions-framework": "^3.3.0",
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1"
  },
  "engines": {
    "node": "18"
  }
}
```

### Step 2: Create Firebase Cloud Function

#### 2a. File: `functions/src/chatbot.ts` (or `.js`)

```typescript
import * as functions from 'firebase-functions';
import { GoogleGenerativeAI } from '@google/generative-ai';
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

interface ChatRequest {
  message: string;
  history?: Array<{ role: 'user' | 'model'; content: string }>;
}

interface ChatResponse {
  reply: string;
  error?: string;
}

const MODEL_NAME = 'gemini-2.0-flash';
const SYSTEM_PROMPT = `You are a concise, helpful chatbot for the Durian dashboard. 
Answer naturally and directly. Keep replies short unless the user asks for more detail.`;

app.post('/api/chat', async (req: express.Request, res: express.Response) => {
  try {
    const { message, history = [] } = req.body as ChatRequest;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required.' });
    }

    // Initialize the model
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    // Prepare conversation history
    const conversationHistory = [
      {
        role: 'user' as const,
        content: SYSTEM_PROMPT,
      },
      {
        role: 'model' as const,
        content: 'I understand. I will be a helpful chatbot for the Durian dashboard.',
      },
      ...history.map((item) => ({
        role: item.role === 'user' ? ('user' as const) : ('model' as const),
        content: item.content,
      })),
    ];

    // Generate response
    const chat = model.startChat({ history: conversationHistory });
    const result = await chat.sendMessage(message);
    const reply = result.response.text() || '';

    return res.status(200).json({ reply });
  } catch (error: any) {
    console.error('Chat error:', error);

    // Normalize error messages
    let statusCode = 500;
    let errorMessage = 'Failed to generate response.';

    if (error.message?.includes('API_KEY')) {
      statusCode = 401;
      errorMessage = 'GOOGLE_API_KEY is missing or invalid.';
    } else if (error.message?.includes('quota') || error.message?.includes('429')) {
      statusCode = 429;
      errorMessage = 'Gemini API quota/rate limit reached. Check Google AI Studio usage.';
    }

    return res.status(statusCode).json({
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

export const chatbot = functions.https.onRequest(app);
```

#### 2b. Set Environment Variables

Create `functions/.env.local` (for local testing):
```
GOOGLE_API_KEY=your_google_api_key_here
NODE_ENV=development
```

Create `functions/.env.production` (for production):
```
GOOGLE_API_KEY=your_production_google_api_key
NODE_ENV=production
```

### Step 3: Update Frontend to Use Firebase Function

#### 3a. File: `js/chatbot-firebase.js`

```javascript
/**
 * Firebase Cloud Function Chatbot Integration
 * Sends messages to Firebase Cloud Function instead of local API
 */

// Configuration
const CHATBOT_CONFIG = {
  firebaseFunction: 'https://us-central1-your-project-id.cloudfunctions.net/chatbot',
  // OR: If using emulator locally: 'http://localhost:5001/your-project-id/us-central1/chatbot'
};

class FirebaseChatbot {
  constructor(config = CHATBOT_CONFIG) {
    this.endpoint = config.firebaseFunction;
    this.conversationHistory = [];
  }

  async sendMessage(message) {
    if (!message.trim()) {
      throw new Error('Message cannot be empty.');
    }

    try {
      const response = await fetch(this.endpoint + '/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message.trim(),
          history: this.conversationHistory,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `HTTP Error: ${response.status}`
        );
      }

      const data = await response.json();
      const reply = data.reply || '';

      // Store in history for context
      this.conversationHistory.push(
        { role: 'user', content: message },
        { role: 'model', content: reply }
      );

      return reply;
    } catch (error) {
      console.error('Chat error:', error);
      throw error;
    }
  }

  clearHistory() {
    this.conversationHistory = [];
  }
}

// Export for use in HTML
window.FirebaseChatbot = FirebaseChatbot;
```

#### 3b. Update `index.html`

```html
<script src="js/chatbot-firebase.js"></script>
<script>
  // Initialize chatbot with Firebase Function
  window.chatbotInstance = new FirebaseChatbot({
    firebaseFunction: 'https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/chatbot',
  });

  // Wire up to UI elements (chat input, send button, etc.)
  document.getElementById('send-btn').addEventListener('click', async () => {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();

    if (!message) return;

    try {
      // Display user message
      displayMessage(message, 'user');

      // Get bot response
      const reply = await window.chatbotInstance.sendMessage(message);
      displayMessage(reply, 'bot');

      input.value = '';
    } catch (error) {
      displayMessage(`Error: ${error.message}`, 'error');
    }
  });

  function displayMessage(text, role) {
    const chatBox = document.getElementById('chat-box');
    const messageEl = document.createElement('div');
    messageEl.className = `message ${role}`;
    messageEl.textContent = text;
    chatBox.appendChild(messageEl);
    chatBox.scrollTop = chatBox.scrollHeight;
  }
</script>
```

### Step 4: Deploy Firebase Function

#### 4a. Local Testing (Emulator)
```bash
firebase emulators:start
# Access locally: http://localhost:5001/your-project-id/us-central1/chatbot
```

#### 4b. Deploy to Firebase
```bash
firebase deploy --only functions:chatbot
```

#### 4c. Get the Function URL
After deployment, Firebase provides a public HTTPS URL:
```
https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/chatbot
```

---

## Phase B: Python RAG Backend with LangChain + ChromaDB

*Covered in subsequent sections - see full guide for details.*

### Quick Summary (Phase B - do later)
- Vector database for document retrieval
- LangChain RAG chains
- Enhanced context-aware responses
- Python + ChromaDB on separate server
- Nginx routing to both Phase A (Firebase) and Phase B (Python RAG)

---

## API Communication Patterns

### Pattern 1: Frontend → Firebase Function → Gemini (Phase A)
**Best for**: Quick responses, multi-user chat, no custom context

```
Client Request:
POST /api/chat
{
  "message": "What is farming?",
  "history": [...]
}

Firebase Response:
{
  "reply": "Farming is the practice of cultivating crops and raising livestock..."
}
```

### Pattern 2: Frontend → Firebase Function → Python RAG (Phase B - Later)
**Best for**: Context-aware responses, document-based Q&A

```
Client Request:
POST /api/chat
{
  "message": "What crops does the guide recommend?",
  "history": [...],
  "useRAG": true
}

Firebase Response:
{
  "reply": "According to the guide, recommended crops include...",
  "sources": [
    { "file": "agricultural_guide.txt", "page": 3 }
  ]
}
```

---

## Deployment Strategy

### Phase A Deployment (Firebase)

#### 1. Set Environment Variables in Firebase
```bash
firebase functions:config:set gemini.api_key="YOUR_KEY"
```

Or use Google Cloud Secret Manager:
```bash
gcloud secrets create google-api-key --data-file=-
```

#### 2. Update `functions/src/index.ts`
```typescript
import * as secretmanager from '@google-cloud/secret-manager';

async function getSecret(secretId: string) {
  const [version] = await secretmanager
    .v1()
    .accessSecretVersion({ name: `projects/YOUR_PROJECT/secrets/${secretId}/versions/latest` });
  return version.payload?.data?.toString();
}

const apiKey = await getSecret('google-api-key');
```

#### 3. Deploy
```bash
firebase deploy --only functions:chatbot
```

---

## Security & Best Practices

### 1. API Key Management

**DO NOT:**
- Hardcode API keys in code
- Commit `.env` files to git
- Expose keys in error messages

**DO:**
- Use environment variables / secret managers
- Rotate keys periodically
- Use separate keys for dev/prod
- Implement request rate limiting

### 2. Authentication & Authorization

#### Firebase Function Security
Add Firebase Authentication:
```typescript
app.post('/api/chat', async (req, res) => {
  const token = req.headers.authorization?.split('Bearer ')[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    const userId = decodedToken.uid;
    // Proceed with authenticated request
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
});
```

### 3. Rate Limiting

**Firebase Function (using express-rate-limit):**
```typescript
import * as rateLimit from "express-rate-limit";

const limiter = rateLimit.default({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});

app.post('/api/chat', limiter, async (req, res) => {
  // Handle request
});
```

### 4. Input Validation

**Firebase Function:**
```typescript
function validateInput(message: string): string {
  if (typeof message !== 'string') throw new Error('Invalid input');
  const trimmed = message.trim();
  if (trimmed.length === 0) throw new Error('Empty message');
  if (trimmed.length > 5000) throw new Error('Message too long');
  return trimmed;
}
```

### 5. Error Handling

- Never expose internal errors to the client
- Log errors securely (use Cloud Logging)
- Return generic messages in production
- Include error codes for debugging

### 6. CORS Configuration

**Firebase Function:**
```typescript
const cors = require('cors')({ 
  origin: 'https://durian-dashboard.netlify.app' 
});
app.use(cors);
```

### 7. Data Privacy

- Don't store chat history without user consent
- Delete old conversations periodically
- Comply with GDPR/CCPA requirements
- Use HTTPS everywhere

---

## Quick Start Checklist - Phase A

- [ ] Create Firebase Cloud Function project
- [ ] Install `@google/generative-ai` package
- [ ] Set `GOOGLE_API_KEY` in Firebase secrets
- [ ] Create `functions/src/chatbot.ts`
- [ ] Deploy function: `firebase deploy --only functions:chatbot`
- [ ] Update `js/chatbot-firebase.js` with your Firebase project ID
- [ ] Update `index.html` to initialize `FirebaseChatbot`
- [ ] Test with Netlify frontend
- [ ] Add rate limiting
- [ ] Add Firebase Authentication (optional but recommended)
- [ ] Monitor errors in Cloud Logging

---

## Troubleshooting

### Firebase Function won't deploy
```bash
# Check for TypeScript errors
npm run build
firebase deploy --debug
```

### CORS errors
```bash
# Ensure Firebase Function sets CORS headers
# Add this to your express app:
app.use(cors({ origin: 'https://durian-dashboard.netlify.app' }));
# Check browser console for detailed error
```

### Slow responses
```bash
# Check API quota at Google AI Studio
# Implement response caching
# Use a faster model: gemini-1.5-flash instead of gemini-2.0-flash
```

### "API key not found" error
```bash
# Verify Firebase secrets are set:
firebase functions:config:get

# Or check Cloud Secrets Manager:
gcloud secrets list
```

---

## Next Steps

1. **Start with Phase A**: Firebase is simpler and serverless - deploy first
2. **Test locally**: Use Firebase Emulator before deploying to production
3. **Monitor & optimize**: Track API usage and costs
4. **Add Phase B later**: When you have documents ready for RAG
5. **Enhance security**: Add authentication and rate limiting

---

## References

- [Google Generative AI JavaScript Docs](https://github.com/google/generative-ai-js)
- [Firebase Cloud Functions](https://firebase.google.com/docs/functions)
- [Firebase Hosting + Functions](https://firebase.google.com/docs/hosting/functions)
- [Gemini API Documentation](https://ai.google.dev/docs)
