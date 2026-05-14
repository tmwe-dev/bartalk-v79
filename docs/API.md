# BarTalk v8.2.6 — API Reference

## Base URL

All API endpoints are Vercel Serverless Functions served under `/api/`.

## Authentication

- Supabase JWT token via `Authorization: Bearer <token>` header
- Skip-auth mode: set `X-BT-Skip-Auth: true` header (uses server-side API keys)

---

## POST /api/ai-proxy

Main AI proxy. Routes requests to the appropriate provider with rate limiting.

**Request Body:**
```json
{
  "provider": "openai | anthropic | gemini | groq | xai",
  "model": "gpt-4o",
  "messages": [{ "role": "user", "content": "Hello" }],
  "systemPrompt": "You are a helpful assistant.",
  "temperature": 0.7,
  "maxTokens": 2048,
  "stream": false
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

**Rate Limits:**
- Anonymous: 30 requests/minute per IP
- Authenticated: 60 requests/minute per user

## GET /api/ai-proxy?health=true

Health check endpoint.

**Response (200):**
```json
{
  "status": "ok",
  "version": "8.2.6",
  "providers": ["openai", "anthropic", "gemini", "groq", "xai"],
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

---

## Conversations — /api/conversations

Requires Supabase auth (`Authorization: Bearer <token>`).

### GET /api/conversations

List all conversations for the authenticated user.

**Response (200):**
```json
{ "conversations": [{ "id": "uuid", "title": "...", "summary": "...", "created_at": "..." }] }
```

### GET /api/conversations?id=xxx

Get a single conversation with its messages.

**Response (200):**
```json
{ "conversation": { "id": "uuid", "title": "..." }, "messages": [{ "role": "user", "content": "..." }] }
```

### POST /api/conversations

Create a new conversation.

**Request Body:**
```json
{ "title": "My conversation" }
```

### PUT /api/conversations

Update a conversation (title, summary).

**Request Body:**
```json
{ "id": "uuid", "title": "New title", "summary": "Updated summary" }
```

### DELETE /api/conversations?id=xxx

Delete a conversation and its messages.

### POST /api/conversations?action=message

Add a message to a conversation.

**Request Body:**
```json
{ "conversation_id": "uuid", "role": "user | assistant", "content": "Hello", "agent_id": "albert" }
```

---

## Billing — /api/billing

### GET /api/billing?action=plans

List available billing plans (public, no auth required).

**Response (200):**
```json
{ "plans": [{ "id": "uuid", "name": "Pro", "price_monthly": 9.99, "is_active": true }] }
```

### GET /api/billing

Get current user subscription status (requires auth).

**Response (200):**
```json
{ "subscription": { "status": "active", "plan": { "name": "Pro" }, "current_period_end": "..." } }
```

---

## Agent Config — /api/agent-config

Requires auth.

### GET /api/agent-config

List agent configurations for the authenticated user.

**Response (200):**
```json
{ "configs": [{ "agent_id": "albert", "is_enabled": true, "freedom_level": "balanced" }] }
```

### PUT /api/agent-config

Update an agent's configuration.

**Request Body:**
```json
{
  "agent_id": "albert",
  "is_enabled": true,
  "freedom_level": "strict | balanced | creative | autonomous",
  "custom_instructions": "Optional custom prompt",
  "custom_model": "gpt-4o-mini",
  "custom_temperature": 0.5
}
```

---

## File Parsing — POST /api/parse-file

Parse uploaded files (PDF, DOCX, XLSX). Max upload size: 12 MB.

**Request Body:**
```json
{ "filename": "document.pdf", "data": "<base64-encoded>", "mimeType": "application/pdf" }
```

**Response (200):**
```json
{ "text": "Extracted text content", "pages": 5, "sheets": ["Sheet1"] }
```

---

## WebSocket / Streaming

The AI proxy supports Server-Sent Events (SSE) for real-time streaming. Set `stream: true` in the request body.

**SSE Event Format:**
```
data: {"chunk": "partial text", "done": false}
data: {"chunk": "", "done": true, "tokensIn": 150, "tokensOut": 200, "duration": 1234}
```

Client-side streaming is handled by `src/lib/streaming.ts` which provides `StreamCallbacks` for `onChunk`, `onComplete`, and `onError`.

---

## Provider Routing

| Provider | Upstream Endpoint | Format |
|----------|-------------------|--------|
| openai | api.openai.com/v1/chat/completions | OpenAI |
| anthropic | api.anthropic.com/v1/messages | Anthropic |
| gemini | generativelanguage.googleapis.com | Google AI |
| groq | api.groq.com/openai/v1/chat/completions | OpenAI-compatible |
| xai | api.x.ai/v1/chat/completions | OpenAI-compatible |

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `AUTH_REQUIRED` | 401 | Missing or invalid Bearer token |
| `RATE_LIMITED` | 429 | Rate limit exceeded (30/60 req/min) |
| `INVALID_PROVIDER` | 400 | Unknown AI provider |
| `INVALID_REQUEST` | 400 | Missing required fields |
| `PROVIDER_ERROR` | 502 | Upstream AI provider failure |
| `QUOTA_EXCEEDED` | 403 | Billing quota or skip-mode quota exceeded |
| `FILE_TOO_LARGE` | 413 | Upload exceeds 12 MB limit |
| `UNSUPPORTED_FORMAT` | 400 | File type not supported by parse-file |
| `SERVER_ERROR` | 500 | Internal server error |

**Error Response Shape:**
```json
{ "error": "Error description", "detail": "Optional detailed message" }
```
