# Project workflow

- The canonical repository is `dreadstuff/PromptSongStudio` on GitHub.
- The user-facing demo is https://dreadstuff.github.io/PromptSongStudio/.
- Publish project updates through GitHub `main` and the `Publish public demo` workflow. Do not deploy to the old ChatGPT Sites demo unless explicitly requested.
- Check the current GitHub branch before edits and preserve unrelated changes. The local Sites origin may have a different commit history; do not force-push it over GitHub.
- Validate with `pnpm test`, `pnpm typecheck`, and `pnpm build:pages`.
- Default UI is Simple: Describe → Generate → Listen. Keep next-generation settings separate from current-track editing. Studio mode opens advanced sections.
- Every track has a direct Play/Stop button synchronized with the bottom player. Preserve existing local song storage and import/export formats.
