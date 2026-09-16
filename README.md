# Prompt Song Studio

An instrumental music studio built for the Music Gen project. Describe a sound, generate a repeatable patch sheet, synthesize it in the browser, edit it, and export stereo audio.

## Demo scope

The demo uses a **local, rule-based composer**, not an LLM or cloud audio generation service. Its English scene interpreter maps actions, mood, and pace onto eight music styles, BPM, musical keys, energy, and a small instrument vocabulary. It does not create vocals or faithfully interpret arbitrary narrative prompts. Everything is synthesized; no prerecorded audio or samples are loaded.

- Eight styles: synthwave, house, lo-fi, ambient, drum & bass, chiptune, trance, hip-hop.
- Six voices: kick, snare, hi-hat, bass, melody, and chord pads.
- Style-specific rhythm banks and four editable 16-step bars (A–D), with answering phrases, rests, and fills. The four-bar phrase repeats over 4, 8, or 16 bars.
- Five drum-kit characters plus pluck, bell, square, keys, sine, and supersaw leads; note lengths and chord articulation match the style.
- Tempo, key, scale, instrument tones, reverb, delay, and swing inferred from prompts.
- Live volume/mute controls; other edits stop playback and apply on the next play.
- Loop/one-shot playback, real-time spectrum, variation generation, and 20-step undo for pattern/settings edits.
- Session restore and up to 50 explicit saves, **local to this browser/device**.
- JSON import/export and 44.1 kHz, 16-bit stereo WAV with an optional two-second effect tail.
- Responsive layout, accessible controls, and Space to play/stop outside input controls.
- Optional WebMCP tools for reading, composing, and stopping a song when the browser supports them.

## Run locally

Requires Node 22.13+ and the pnpm version recorded in `package.json`.

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

No API key is required. To build: `pnpm build`.

```sh
pnpm test
pnpm typecheck
```

## Architecture

- `lib/song.ts`: schema normalization, harmony, timing, remixing, and PCM WAV encoding.
- `lib/composer.ts`: seeded, style-specific grooves, melodic contours, phrase construction, and sound palettes.
- `lib/interpret.ts`: shared scene/mood/pace interpretation for both the preview and generation.
- `lib/scene.ts`: scene-specific score changes and authoritative instrument exclusions.
- `lib/audio.ts`: shared Web Audio synthesis graph, clock-based live scheduling, offline WAV rendering, and downloads.
- `app/page.tsx`: studio UI, local persistence, imported file validation, and WebMCP actions.
- `app/globals.css`: responsive studio theme.
- `tests/composer.test.cjs`: composer properties, timing, import safety, WAV structure, and instrumented audio scheduling/lifecycle tests.

React runs on the Sites Vinext starter. Standard Web Audio APIs perform all synthesis on the client. The hosting manifest binds this checkout to its existing Site; reuse that identity when redeploying. GitHub Actions is prepared for repository check-in, but creating an actual GitHub repository requires an available repository-creation capability or an owner-created repository.

## Storage and privacy

Prompts and saved patches stay on the current device; this version sends no prompt requests to an AI service. Hosting still serves the application and uses the platform's access controls. Clearing browser storage removes local saves. Use JSON export for portable backups. No application secrets belong in source control or the browser.

## Known limitations

- This is a loop composer, not a full DAW, multisection song arranger, or vocal generator.
- iOS/browser audio needs a user gesture. Keep the page open; background tabs and screen locks may suspend sound. The scheduler skips missed steps after throttling instead of playing them in a burst.
- Imported values are validated/clamped; unsupported schemas and malformed patterns are rejected before applying state.
- Exact-length WAVs begin with fresh effects. An effects tail adds two seconds but is not guaranteed to capture every last quiet reverb sample.
- Automated audio tests use an instrumented Web Audio contract. They verify valid schedules and lifecycle behavior, **not native browser DSP output, audible quality, mobile playback, or visual layout**. Browser/end-to-end QA was not requested explicitly and was not performed. WebMCP runtime validation was unavailable in this environment.

See `docs/roadmap.md` for the next integration steps.

## Demo 02: composition diversity

The first demo reused kick/snare patterns across genres and a near-universal arpeggio contour. Demo 02 replaces that shared recipe with role-specific rhythm banks, separate sound palettes, four-bar phrasing, variable note lengths, and subtle deterministic timing offsets. Remix now rebuilds the rhythm and phrases while retaining tempo, harmony, sound choices, and mix.

New songs use optional `composerVersion: 2`, three `variations` for bars B–D, and validated `performance` settings. The base `patterns` field remains bar A. Legacy v1 saves are not silently rewritten; a visible recreate action generates a fresh song from their prompt. Live playback and offline WAV rendering call the same bar-selection and duration functions.

The 22 automated checks include rhythm-only comparisons at identical tempo/key/seed, multiple grooves within each style, phrase editing and serialization, legacy compatibility, and finite audio scheduling. These establish structural diversity; they do not substitute for subjective listening or native browser audio QA.

## Demo 03: descriptive input

Describe what is happening, how it feels, and how fast it should move. For example:

> Dungeon Crawler Carl enters into a boss fight with upbeat and fast music.

With Style set to Auto and energy following the description, this maps to a boss-fight scene, upbeat mood, 160 BPM, 92% energy, and a driving electronic score in A dorian. The battle adaptation changes percussion, repeating bass figures, melody phrasing, chord hits, and sound choices. It is not a search for, or reproduction of, music associated with that book. Names alone do not supply a musical scene.

The **Interpreted as · next track** panel shows the exact plan used by generation. Supported action families include battles, chases, suspense, exploration, victory, rest, romance, and loss. Mood and pace modifiers, common negations, and explicit numeric tempo/key requests are supported. Contradictory fast/slow requests and unavailable acoustic/orchestral/vocal instruments produce explanatory notes. This is a bounded rule-based interpreter, not general semantic understanding or a connected LLM.

The energy slider follows the description until moved; **Use description** clears that override. A selected style overrides the inferred style. Explicit BPM and key in the prompt override descriptive guesses. Sample prompts and the older-song recreate action reset inference overrides. Existing saved patches remain unchanged. Remix retains an inferred scene while preserving the current harmony, tempo, sounds, and mix.

33 automated checks cover the exact example, other scene families, common negations, misleading story nouns (a haunted house is not house music), real score changes, control precedence, exclusions, and prior audio/saving behavior. The tests inspect composition data and audio scheduling contracts; subjective listening and native browser rendering are not covered.
