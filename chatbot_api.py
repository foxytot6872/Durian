"""Local GPT proxy for the dashboard chatbot.

Run this alongside the static site so the browser widget can send messages to a
local endpoint without exposing your OpenAI API key in frontend JavaScript.
"""

from __future__ import annotations

import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any

from dotenv import load_dotenv
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI

load_dotenv()

PORT = int(os.getenv("CHATBOT_API_PORT", "8000"))
MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
TEMPERATURE = float(os.getenv("OPENAI_TEMPERATURE", "0.7"))
MODEL_PROVIDER = os.getenv("MODEL_PROVIDER", "openai").strip().lower()
ENABLE_GEMINI = os.getenv("ENABLE_GEMINI", "false").strip().lower() in {"1", "true", "yes", "on"}
USE_GEMINI = ENABLE_GEMINI and MODEL_PROVIDER in ("gemini", "google")

# Optional Google AI Studio / Gemini support
GENAI_MODEL = os.getenv("GENAI_MODEL", "gemini-2.0-flash")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
genai = None
if USE_GEMINI:
    try:
        from google import genai as genai_client
        genai = genai_client.Client(api_key=GOOGLE_API_KEY)
    except Exception:
        genai = None

SYSTEM_PROMPT = (
    "You are a concise, helpful chatbot for the Durian dashboard. "
    "Answer naturally and directly. Keep replies short unless the user asks for more detail."
)

# Only initialize OpenAI if we're using OpenAI (not Gemini)
llm = None
if not USE_GEMINI:
    llm = ChatOpenAI(model=MODEL, temperature=TEMPERATURE)


def _normalize_error_message(error: Exception) -> tuple[int, str]:
    error_text = " ".join(str(error).lower().split())

    if (
        "quota" in error_text
        or "rate limit" in error_text
        or "429" in error_text
        or "resource_exhausted" in error_text
    ):
        if USE_GEMINI:
            return 429, "Gemini API quota/rate limit reached. Check Google AI Studio usage/billing and retry."
        return 429, "OpenAI API quota/rate limit reached. Check usage/billing and retry."

    if (
        "api key" in error_text
        or "invalid_api_key" in error_text
        or "incorrect api key provided" in error_text
        or "401" in error_text
    ):
        if USE_GEMINI:
            return 401, "GOOGLE_API_KEY in .env is missing or invalid."
        return 401, "OPENAI_API_KEY in .env is missing or invalid."

    return 500, "Failed to generate response from GPT."


def _json_response(handler: BaseHTTPRequestHandler, status_code: int, payload: dict[str, Any]) -> None:
    body = json.dumps(payload).encode("utf-8")
    handler.send_response(status_code)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(body)))
    handler.send_header("Access-Control-Allow-Origin", "*")
    handler.send_header("Access-Control-Allow-Headers", "Content-Type")
    handler.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
    handler.end_headers()
    handler.wfile.write(body)


def _build_messages(history: list[dict[str, str]], message: str) -> list[Any]:
    messages: list[Any] = [SystemMessage(content=SYSTEM_PROMPT)]

    for item in history[-10:]:
        role = (item.get("role") or "").strip().lower()
        content = (item.get("content") or "").strip()
        if not content:
            continue

        if role == "user":
            messages.append(HumanMessage(content=content))
        elif role == "assistant":
            messages.append(AIMessage(content=content))

    messages.append(HumanMessage(content=message))
    return messages


class ChatbotHandler(BaseHTTPRequestHandler):
    def log_message(self, format: str, *args: Any) -> None:  # noqa: A003
        return

    def do_OPTIONS(self) -> None:  # noqa: N802
        if self.path == "/api/chat":
            _json_response(self, 204, {})
            return
        self.send_error(404, "Not Found")

    def do_POST(self) -> None:  # noqa: N802
        if self.path != "/api/chat":
            self.send_error(404, "Not Found")
            return

        content_length = int(self.headers.get("Content-Length", "0"))
        raw_body = self.rfile.read(content_length).decode("utf-8") if content_length else "{}"

        try:
            body = json.loads(raw_body)
        except json.JSONDecodeError:
            _json_response(self, 400, {"error": "Invalid JSON body."})
            return

        message = (body.get("message") or "").strip()
        history = body.get("history") or []

        if not message:
            _json_response(self, 400, {"error": "Message is required."})
            return

        if not isinstance(history, list):
            history = []

        try:
            # Branch between OpenAI (LangChain) or Google Generative AI (Gemini)
            if USE_GEMINI:
                if genai is None:
                    raise RuntimeError("Gemini is enabled but google-genai is not available or GOOGLE_API_KEY is missing.")
                resp = genai.models.generate_content(
                    model=GENAI_MODEL,
                    contents=message,
                )
                reply = (resp.text or "").strip() if resp else ""
            else:
                if llm is None:
                    raise RuntimeError("OpenAI model is not initialized.")
                response = llm.invoke(_build_messages(history, message))
                reply = (response.content or "").strip()
        except Exception as exc:  # pragma: no cover - network/API errors
            status_code, error_message = _normalize_error_message(exc)
            _json_response(self, status_code, {"error": error_message, "details": str(exc)})
            return

        _json_response(self, 200, {"reply": reply})


if __name__ == "__main__":
    server = ThreadingHTTPServer(("0.0.0.0", PORT), ChatbotHandler)
    print(f"Chatbot API listening on http://localhost:{PORT}/api/chat")
    server.serve_forever()
