const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const cors = require('cors')({ origin: true });

const geminiKey = defineSecret('GEMINI_KEY');

const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const SYSTEM_PROMPT =
  'You are a concise, helpful chatbot for the Durian dashboard. Answer naturally and directly. Keep replies short unless the user asks for more detail.';

function buildHistory(history) {
  if (!Array.isArray(history)) {
    return [];
  }

  return history
    .slice(-10)
    .map((item) => {
      const role = (item && item.role ? String(item.role) : '').trim().toLowerCase();
      const content = (item && item.content ? String(item.content) : '').trim();

      if (!content) {
        return null;
      }

      if (role === 'user') {
        return { role: 'user', parts: [{ text: content }] };
      }

      if (role === 'assistant' || role === 'model') {
        return { role: 'model', parts: [{ text: content }] };
      }

      return null;
    })
    .filter(Boolean);
}

exports.chatbot = onRequest({ secrets: [geminiKey], invoker: 'public' }, async (req, res) => {
  cors(req, res, async () => {
    if (req.method === 'OPTIONS') {
      return res.status(204).send('');
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed.' });
    }

    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
      const message = String(body.message || '').trim();
      const history = buildHistory(body.history);

      if (!message) {
        return res.status(400).json({ error: 'Message is required.' });
      }

      const apiKey = geminiKey.value();
      if (!apiKey) {
        return res.status(500).json({ error: 'GEMINI_KEY secret is missing.' });
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: MODEL_NAME,
        systemInstruction: SYSTEM_PROMPT,
      });

      const chat = model.startChat({ history });
      const result = await chat.sendMessage(message);
      const reply = result?.response?.text?.() || '';

      return res.status(200).json({ reply });
    } catch (error) {
      const errorText = String((error && error.message) || error || '').toLowerCase();

      if (errorText.includes('api key') || errorText.includes('unauthorized') || errorText.includes('permission')) {
        return res.status(401).json({ error: 'GEMINI_KEY is missing or invalid.' });
      }

      if (errorText.includes('quota') || errorText.includes('429')) {
        return res.status(429).json({ error: 'Gemini API quota/rate limit reached. Try again later.' });
      }

      console.error('chatbot error:', error);
      return res.status(500).json({ error: 'Failed to generate response.' });
    }
  });
});
