# clober-audio (sidecar)

Proceso Python que convierte audio en texto (y, desde F1.2, texto en audio)
para el núcleo de Clober. No interpreta órdenes. Contrato del protocolo:
`docs/PLAN.md` §5.1.

## Desarrollo

```
uv sync
uv run pytest
uv run ruff check . && uv run ruff format --check .
```

Probar sin el núcleo, con un servidor que imprime lo que llega:

```
uv run scripts/echo_server.py --token dev
uv run python -m clober_audio --token dev     # mantén ctrl+shift+space y habla
```

Opciones: `--lang es|en`, `--stt-model tiny|base|small`, `--ptt-key`,
`--input-device`, `--url` (por defecto `ws://127.0.0.1:7531/audio`).

## Notas

- El VAD usa el modelo Silero ONNX que ya incluye faster-whisper; no hace
  falta torch.
- `tests/data/escena_juego.wav` se genera con `scripts/make_test_audio.ps1`
  (voz es-ES de Windows). Esa voz pronuncia mal "escena", así que los tests
  comprueban el pipeline, no la precisión del STT (eso es F0.6, con voz real).
