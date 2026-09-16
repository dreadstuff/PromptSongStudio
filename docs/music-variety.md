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

## Demo 09: first expansion milestone

Implemented:

- New generation defaults to an **Evolving score** with 16 or 32 bars. Intro, Theme, Build, Peak and Release have distinct note patterns and dynamics. Loop generation remains selectable.
- A motif is quoted in the introduction, answered in the theme, sequenced during the build, raised in the peak and resolved in the release. Supporting percussion enters and leaves, with fills and a tonic ending.
- More progression choices for synthwave, house, lo-fi and ambient. Score chords use nearby inversions to reduce abrupt register jumps.
- New synthesized reed, mallet and strings voices. These are oscillator-based sounds, not sampled acoustic instruments.
- Every arranged bar is stored, validated, exported and individually editable. Playback and WAV rendering use the same patterns, chord degree, inversion and expression values.
- More like this keeps the score plan and exact opening bar while developing related phrases. Legacy saves without arrangement data keep their loop behavior.
- A compact section strip follows playback. Structure and length controls are inside Music settings; selected-track structure/length and bar editing are in Customize. Changing structure or length rebuilds score sections; Undo can restore edits.

### Model integration status

`lib/plan.ts` defines and strictly validates the first shared musical-plan contract: five ordered sections, bounded density, and a total of 16 or 32 bars. `buildScore(source, length, plan)` can accept a validated plan from a future server. The local planner works with no network or credentials.

No cloud model, API subscription, model backend, or sampled-instrument service has been connected. There is no model API credential available in this project's execution environment. GitHub Pages still serves a static app. Before connecting a model, provision a separate server endpoint with a securely stored provider credential, request limits and a usage budget; preserve local generation as fallback. The current contract is a foundation for section planning, not yet an arbitrary narrative-to-full-score model pipeline.

### Compatibility and recovery

Score data uses an optional `arrangement` extension under the existing v1 song format. Import rejects malformed section lengths or invalid score bars rather than playing partial data. JSON imports up to 500 KB accommodate complete scores. Recent history remains capped at 12 batches; browser storage failures prompt export of favorites.

The exact Demo 08 build is preserved at `backup/explore-refine-demo08`, commit `b5e4de4e12c2f460650c03899caffa759661c12f`. No saved songs are automatically rewritten.

## Demo 10: develop an accepted take

Each take now offers **Expand into full song**. Duration choices are two minutes, three minutes, and a custom integer from 120 to 300 seconds. Durations round up to a complete two-bar phrase based on the accepted tempo; the preview reports the actual duration before creation. New full songs play once by default. Tempo edits subsequently change their duration.

The full-song plan uses version 2 with eight ordered sections: Intro, Theme, Variation, Build, Peak, Breakdown, Return, Release. Plans are bounded to 226 total bars and 64 bars per section. Version 1 five-section plans and legacy loops retain their existing validation and playback. Song/arrangement envelopes stay version 1; their nested plan is versioned. Invalid or mismatched lengths are rejected. The longest exported JSON remains within the existing 500 KB import limit.

Expansion clones and validates the accepted take. Its tempo, key, synth voices, mix, mutes, seed, base phrases, and progression remain intact. For existing scores, matching sections reuse their arranged patterns, including theme edits; Variation and Breakdown develop that theme and Return quotes it. The ending resolves to the tonic. Longer sections still reuse phrases, so listening feedback remains important; this is a procedural arrangement, not a cloud-generated performance.

A new batch contains the original and the separately identified full song, keeping both within the six-track recent-batch cap. Previous comparisons remain in Recent. Save and JSON export are available for durable favorites; storage remains browser-local with the existing quota warning. All bars share the live playback/offline WAV path.

The pre-expansion-button build is preserved at `backup/evolving-scores-demo09`, commit `fdfd2a184b44d89ff2bc9f62036280da49820b83`.

Long WAV exports now schedule four bars at a time where offline audio suspension is supported. They keep one continuous audio context, preserving reverb and delay across boundaries, and report render progress. This bounds the number of future audio nodes instead of constructing the entire song's graph before rendering. Other browsers retain the original rendering path.
