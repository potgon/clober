# Grabaciones de la prueba de concepto (T3 → F0.6)

30 frases cortas dichas por Petru con su micro de directo, para elegir el
modelo de Whisper por defecto (`docs/PLAN.md` F0.6).

## Formato

Por cada frase, dos archivos con el mismo número:

- `01.wav` — WAV 16 kHz, mono, 16 bits. Sin silencio largo al principio ni
  al final (unos 300 ms está bien).
- `01.txt` — lo que se dijo, en texto normal: `pon la escena juego`.

## Qué decir

Órdenes de escena con los nombres reales de tus escenas de OBS, variando la
forma: "escena juego", "pon la escena just chatting", "cambia a la escena
BRB", "regidor, escena inicio"… Habla como en directo (mismo volumen, mismo
micro, con el juego sonando de fondo si es lo normal).

## Grabar

```
cd sidecar-audio
uv run scripts/record_clips.py      # Enter, hablas, Enter, escribes lo que dijiste
```

Continúa la numeración si lo cortas y lo vuelves a lanzar.

## Medir

```
cd sidecar-audio
uv run scripts/bench_stt.py
```

Imprime p50/p95 y WER por modelo y el que elige la regla. Apunta el resultado
en `brain/state/roadmap.md` ("Resultados de medidas").
