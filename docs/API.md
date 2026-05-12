# BarTalk v8.2.5 — API Reference

## Endpoints

All API endpoints are Vercel Serverless Functions under `/api/`.

### POST /api/ai-proxy

Main AI proxy. Routes requests to the appropriate AI provider.

**Request Body:**
```json
{
  "provider": "openai" | "anthropic" | "gemini" | "groq" | "xai",
  "model": "gpt-4o",
  "messages": [{ "role": "user", "content": "Hello" }],
  "systemPrompt": "You are a helpful assistant.",
  "temperature": 0.7,
  "maxTokens": 2048,
  "apiKey": "sk-..." 
}
```

**Response (200):**
```json
{
  "content": "AI response text",
  "tokensIn": 150,
  "tokensOut": 200,
  "duration": 1234
}
```

**Error Response (4xx/5xx):**
```json
{
  "error": "Error description",
  "detail": "Detailed message"
}
```

**Rate Limits:**
- Anonymous: 30 requests/minute per IP
- Authenticated: 60 requests/minute per user

### GET /api/ai-proxy?health=true

Health check endpoint.

**Response (200):**
```json
{
  "status": "ok",
  "version": "8.2.5",
  "providers": ["openai", "anthropic", "gemini", "groq", "xai"],
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

### POST /api/conversations

CRUD operations for conversations (requires Supabase auth).

### POST /api/agent-config

Agent configuration management.

### POST /api/billing

Stripe billing integration (Pro plan).

### POST /api/parse-file

File parsing for PDF, DOCX, XLSX uploads.

## Authentication

- Supabase JWT token via `Authorization: Bearer <token>` header
- Skip-auth mode: set `X-BT-Skip-Auth: true` header (uses server-side API keys)

## Provider Routing

| Provider | Endpoint | Format |
|----------|----------|--------|
| openai | api.openai.com/v1/chat/completions | OpenAI |
| anthropic | api.anthropic.com/v1/messages | Anthropic |
| gemini | generativelanguage.googleapis.com | Google AI |
| groq | api.groq.com/openai/v1/chat/completions | OpenAI-compatible |
| xai | api.x.ai/v1/chat/completions | OpenAI-compatible |
