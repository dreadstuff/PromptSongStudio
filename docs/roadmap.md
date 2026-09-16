# Next implementation steps

## Real prompt intelligence

Demo 03 provides a bounded English scene interpreter and visible interpretation preview. For broader narrative understanding, keep the current schema and synthesizer and add a server-side `/api/compose` adapter that accepts the prompt, calls a configured LLM with a constrained patch-sheet schema, validates the result, and returns the normalized song. Never send an API key to browser code. Keep local composition as an explicitly labeled fallback. Add request limits, response-size limits, timeouts, retry/error handling, and tests against invalid model output. Do not imply a cloud model is connected until a real request has been verified.

## Richer music

Per-bar patterns and style-specific articulation are available in Demo 02. Next: explicit intro/build/drop/outro sections, piano-roll note-length editing, automation, sidechain envelopes, a swing control, MIDI export, and isolated stem rendering. Preserve the live/offline scheduling path so export matches the chosen composition.

## Shared backend

For a StoryDeck integration, exchange versioned patch sheets and an explicit rendering contract. Add project ownership and database persistence only when cross-device libraries are required; current saves are device-local.

## Device acceptance checklist

1. iPhone Safari: generate, tap Play, hear every voice, stop, and replay.
2. Change live mix/mute and confirm the audible result; edit a step and restart.
3. Compare multiple genres and both major/minor keys.
4. Save, refresh, load; export JSON and import it in another browser.
5. Download WAV with and without an effect tail; listen and confirm duration/mix.
6. Test desktop and small mobile layouts with enlarged text and keyboard controls.
7. Validate optional WebMCP registration, valid composition input, invalid input, and current-song readback in a supporting browser.
