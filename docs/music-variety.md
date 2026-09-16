# Musical variety: current behavior and proposed expansion

## Current engine

This demo runs entirely in the browser. A bounded English interpreter selects scene, mood, tempo, key and energy. A seeded composer chooses from eight genre palettes, builds four bars of patterns and repeats those patterns over the track. Six synthesized voices play the result. No model or recorded instrument library is connected.

There are two separate limits: the vocabulary of composition decisions and the sound palette. Improving story interpretation alone cannot produce an acoustic instrument or a long evolving score that the renderer cannot express.

## Shipped in Demo 08

- Batch arrangement directions: Melody-led, Rhythm-led, Atmospheric, Balanced and Pulse. A single output stays Balanced. Rhythm, note density, note lengths and mix change, while explicit tempo/key and supported instrument exclusions are retained. Five labels are not five new genres.
- More like this preserves the source take, chord progression, tempo, key, sounds, mix and exact first-bar motif. New answering phrases and supporting rhythms create related variations. The original remains first in the new batch.
- The last 12 batches are persisted locally, capped at six tracks each (one original plus up to five variations). Validation rejects malformed tracks. Storage failures are surfaced. Saved favorites and JSON export remain separate from rolling history.

These features create controllable alternatives, not a promise that every pair sounds radically different. Listening feedback remains essential.

## Proposed next engine work

1. **Longer form and development.** Replace a repeating four-bar phrase with explicit sections: intro, main motif, tension/build, peak and release. Give each part entrances, rests, fills and transitions. A boss fight can escalate over time rather than simply be fast throughout.
2. **Motif and harmony systems.** Build a short recognizable idea and transform its rhythm, register, contour and ending. Add chord inversions, voice leading, harmonic rhythm and more progression families. Preserve tonal constraints and coherent phrase resolution.
3. **Instrument variety.** Expand synthesis envelopes and articulation, and optionally introduce properly licensed samples for acoustic timbres and richer percussion. Samples require download, memory and licensing decisions; they do not follow automatically from connecting a model.
4. **A model as musical planner.** A server could translate scene descriptions into a validated composition plan: emotional arc, tempo, section lengths, rhythmic character, instrument roles and motif constraints. The local engine would render that plan with reproducible seeds and keep editing/export available.

Suggested flow: description → server-side model → validated musical plan → deterministic composer → browser audio. Keep credentials on the server, bound requests and schema values, allow cancellation, and fall back to the local composer if generation fails. The GitHub Pages UI can remain the public frontend, but a model service needs a separate backend and a usage-budget decision. Anonymous use would need request limits.

A model-generated audio service is a different route: it may offer richer finished sound, but separate notes and six editable voices are not guaranteed. That route would need a different editing/export experience. The proposed planner approach fits this project's current controls better.

## Backup

The pre-change Simple Studio build is preserved in GitHub branch `backup/simple-studio-demo07`, pointing to commit `dfec15fc57222d7ef542ef8e42fc773acca447b8`. Restore selected files through a new commit if needed; do not overwrite later history with a force push.
