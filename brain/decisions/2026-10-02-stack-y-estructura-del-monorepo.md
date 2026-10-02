# Stack y estructura del monorepo

**Fecha:** 2026-10-02
**Dueño:** Petru (propuesta del agente sobre la recomendación del PRD;
revocable con decisión nueva)
**Contexto:** el PRD recomienda Node + TypeScript para el núcleo y los MCP,
Python para audio, obs-websocket-js, Twurple, openWakeWord, faster-whisper,
Piper o Kokoro, React + Vite + Tailwind y pnpm workspaces, pero deja
versiones, herramientas de test/lint y varias opciones sin cerrar.
**Decisión:** Node 24 LTS, pnpm 10, TypeScript strict ESM, Vitest, Biome,
zod 4; Twurple 7 con chat por EventSub (sin IRC) y Device Code Flow propio
con cliente público; adaptadores LLM `anthropic` y `openai-compatible` (este
cubre OpenAI y Ollama); secretos con `@napi-rs/keyring`; registro en JSONL
(SQLite solo desde F2); Python 3.12 con uv, sounddevice, silero-vad,
faster-whisper int8 en CPU, Piper (no Kokoro), pynput para PTT, ruff +
pytest; instalador Inno Setup con Node portable y PyInstaller. Se añade
`packages/shared` (no estaba en el PRD) para tipos y esquemas comunes, y
`evals/runner` al workspace.
**Alternativas consideradas:** whisper.cpp (binding Node, sin sidecar para
STT) — descartada: el wake word y el VAD ya obligan al sidecar Python;
Kokoro para TTS — descartada en el MVP por peso frente a Piper; ESLint +
Prettier — descartada por ser dos herramientas donde Biome es una; keytar —
descartada por estar archivado; IRC para chat — descartada porque EventSub
ya se necesita para eventos; Tauri — aplazada a F3 como dice el PRD.
