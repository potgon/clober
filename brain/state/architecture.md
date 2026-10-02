<!-- última actualización: 2026-10-02 -->

# Arquitectura — Clober

Sin código todavía (F0). Esto resume las decisiones vigentes; el detalle
(contratos, esquemas, catálogo de herramientas) está en `docs/PLAN.md` §3–§5.
Ver `/brain/decisions/` para el porqué.

## Documentos

- `docs/PRD.md` decide **qué** hace el producto; `docs/PLAN.md` decide
  **cómo** se construye. Una decisión en `/brain/decisions/` posterior al
  plan prevalece sobre él. Ver
  [[2026-10-02-plan-de-implementacion-como-fuente-del-como]].

## Tres capas locales

1. **Sidecar de audio (Python).** Wake word, push-to-talk, VAD, STT, TTS y
   earcons. No decide nada: audio ↔ texto.
2. **Núcleo (Node + TypeScript).** Ruta rápida sin LLM + agente LLM,
   contexto vivo (eventos OBS + EventSub), políticas, confirmaciones,
   deshacer, modo ensayo, registro. Sirve el dock.
3. **Herramientas** en paquetes `mcp-obs`, `mcp-twitch`, `mcp-media`:
   el núcleo las importa en proceso; cada paquete trae además un servidor
   MCP stdio publicable (sin políticas). Ver
   [[2026-10-02-herramientas-en-proceso-y-mcp-como-envoltorio]].

Único tráfico externo: Twitch y, si se elige, el proveedor del LLM. El audio
nunca sale del PC. Sin telemetría.

## Red local

- Núcleo en `127.0.0.1:7531`: HTTP (dock), WS `/dock`, WS `/audio`.
- Sidecar es cliente de WS `/audio`.
- Token local por instalación + comprobación de `Host` contra ataques desde
  páginas web a localhost.

## Seguridad

- Solo dos orígenes de órdenes: voz del streamer y (F2) `!clober` de mods en
  lista blanca. Todo dato de Twitch entra al LLM como `<third_party_data>` y
  no puede disparar herramientas.
- Niveles por herramienta: `free`, `confirm`, `blocked`. Una sobrescritura
  nunca convierte `blocked` en `free`.
- Secretos en el llavero del sistema (`@napi-rs/keyring`, servicio
  `clober`), nunca en `config.json`.

## Stack

Fijado en [[2026-10-02-stack-y-estructura-del-monorepo]]: Node 24, pnpm 10,
TS strict, Vitest, Biome, zod 4; obs-websocket-js 5; Twurple 7 con EventSub
WS y Device Code Flow propio; adaptadores LLM `anthropic` y
`openai-compatible` (OpenAI + Ollama); Python 3.12 con uv, sounddevice,
openWakeWord, Silero VAD (el ONNX que incluye faster-whisper, sin torch), faster-whisper int8, Piper; React 19 + Vite +
Tailwind 4; instalador Inno Setup. Licencia MIT.

## Valores medidos

Se rellenan con las medidas de F0/F1 (ver `roadmap.md`, "Resultados de
medidas"):

- Modelo STT por defecto: pendiente de F0.6.
- CPU en reposo: pendiente de F0.7.

## Project brain — acceso vía MCP

`/mcp-server` expone `/brain` como servidor MCP (`clober-brain`) con cuatro
tools: `read_state`, `update_state`, `log_decision`, `search`. Registrado en
`/.mcp.json` (stdio). El transporte HTTP (`src/http.js`) existe pero no está
desplegado: requiere decisión de Petru (T7 en `docs/PLAN.md` §11).
