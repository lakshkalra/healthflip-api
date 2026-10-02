# healthFlip Phase 3 AI Specification

This document defines the AI contract and delivery boundaries before provider code is
introduced. Phase 3 is intentionally incremental: the deterministic fallback must work
before a Gemini credential is connected.

## Phase 3.0 objective

Finalize the provider-independent contracts, safety rules, failure taxonomy, and test
matrix for AI meal estimation and Kimbo daily insights.

Phase 3.0 does not require a Gemini key, database migration, mobile UI change, or live
provider call.

## v1 scope

### Meal estimation

The user supplies a short meal description. The backend returns a reviewable estimate;
the mobile app only saves the meal after the user confirms it through the existing meal
creation API.

Voice input will convert speech to text and reuse this exact contract. It is not a
second estimation pipeline.

Image input will be added after the text contract is stable. The image path will use the
same structured response and confirmation step, with explicit size and permission
handling.

### Kimbo daily insight

The backend builds a small context from the guest's persisted goal and meals for a
requested local date. It returns one concise wellness insight and an optional practical
next action. The insight is generated on demand and is not persisted in v1.

### Explicitly out of scope for the first AI slice

- Diagnosis, treatment, medication, or medical risk assessment.
- Medical emergency or symptom triage.
- Automatic meal persistence without user confirmation.
- Open-ended chat memory.
- A new AI database table or duplicate meal table.

## Backend module boundary

The API will add one `ai` module with the standard project structure:

```text
src/modules/ai/
  ai.controller.ts
  ai.helper.ts
  ai.router.ts
  ai.service.ts
  ai.validator.ts
```

Provider code will remain separate from the module:

```text
src/shared/ai/
  ai-provider.ts
  fallback-provider.ts
  gemini-provider.ts
```

The controller handles HTTP concerns, the service owns use-case orchestration, the
provider owns model calls, and helpers normalize provider output. No SQL is written in
the AI module. Existing goal and meal repositories remain the only persistence path.

## Provider-independent contracts

### Meal estimate request

```json
{
  "description": "2 eggs with two slices of toast and a banana",
  "mealType": "breakfast"
}
```

Rules:

- `description`: trimmed string, 3–500 characters.
- `mealType`: optional existing meal type.
- No guest identifiers or provider details are accepted from the mobile client.

### Meal estimate response

```json
{
  "estimate": {
    "name": "Eggs, toast and banana",
    "caloriesKcal": 420,
    "proteinGrams": 19,
    "carbsGrams": 54,
    "fatGrams": 15,
    "confidence": "medium",
    "assumptions": ["Two large eggs", "Two standard slices of toast"],
    "source": "ai"
  }
}
```

`source` is either `ai` or `fallback`. Numeric values are non-negative and bounded;
unknown macros may be `null`. The mobile client must display assumptions and require
confirmation before saving.

### Daily insight response

```json
{
  "insight": {
    "date": "2026-10-02",
    "message": "You have logged one meal today. Adding a protein-rich option later can help you stay satisfied.",
    "nextAction": "Plan your next meal around one protein source.",
    "source": "ai"
  }
}
```

The service must derive this from persisted data, not from client-supplied totals.

## API routes

```text
POST /v1/ai/meal-estimate
GET  /v1/ai/daily-insight?date=YYYY-MM-DD&timezone=IANA_TIMEZONE
```

Both routes require the existing anonymous guest session. API keys are never accepted
from the mobile client and are never returned in an error response.

## Failure taxonomy

All failures use the existing structured error envelope:

```json
{
  "error": {
    "code": "AI_PROVIDER_UNAVAILABLE",
    "message": "AI estimation is temporarily unavailable."
  },
  "requestId": "..."
}
```

Expected codes:

- `AI_INPUT_INVALID`
- `AI_PROVIDER_UNAVAILABLE`
- `AI_PROVIDER_TIMEOUT`
- `AI_PROVIDER_QUOTA_EXCEEDED`
- `AI_OUTPUT_INVALID`
- `AI_OPERATION_FAILED`

Provider failures must never prevent manual meal entry or dashboard loading. The
deterministic fallback is used for local/demo reliability and is clearly marked in the
response as `source: fallback`.

## Safety rules

- Use wellness language only: habits, meals, patterns, and practical next actions.
- Never diagnose, prescribe, interpret symptoms, or claim clinical certainty.
- Include a short wellness disclaimer in the mobile insight/estimate UI.
- Treat model output as untrusted input; validate and normalize it before returning it.
- Cap text length and image size before provider calls.
- Apply a request timeout and one bounded retry only for transient provider failures.
- Log request IDs, durations, status, and failure codes; never log API keys or raw images.

## Phase gates

### Phase 3.0 — Contract and safety checkpoint

- [x] Define text meal estimate request/response.
- [x] Define Kimbo daily insight request/response.
- [x] Define provider abstraction and module boundaries.
- [x] Define fallback behavior and failure codes.
- [x] Define wellness safety rules and observability boundaries.
- [x] Confirm no database migration is required for the first AI slice.

### Phase 3.1 — Backend fallback slice

- [ ] Implement validators, helpers, service, controller, and routes.
- [ ] Implement deterministic fallback provider.
- [ ] Add API tests for successful estimates, insights, validation, and failures.
- [ ] Run typecheck and integration tests.

### Phase 3.2 — Gemini provider

- [ ] Add backend-only Gemini configuration.
- [ ] Request the user's Gemini API key through a local environment setup.
- [ ] Implement strict structured-output parsing and timeout handling.
- [ ] Verify live provider behavior without exposing the key.

### Phase 3.3 — Mobile input channels

- [ ] Add text estimate review and confirm flow.
- [ ] Add voice-to-text input reusing the text estimate endpoint.
- [ ] Add image capture/picker, compression, upload limits, and review flow.

### Phase 3.4 — Kimbo and closure

- [ ] Add the daily insight card to the mobile dashboard/progress experience.
- [ ] Verify provider unavailable, timeout, quota, malformed output, retry, and fallback states.
- [ ] Manually verify the Android flow and record evidence in the phase tracker.
