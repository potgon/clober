<!-- última actualización: 2026-10-02 -->

# Glosario — Clober

- **Clober.** Nombre del producto. Sustituye a "Regidor", nombre de trabajo
  en `docs/PRD.md`.
- **Palabra de activación (wake word).** Palabra que despierta a Clober.
  Configurable; el valor por defecto es la decisión abierta D1 (por defecto
  "Regidor").
- **PTT (push-to-talk).** Tecla global que, mantenida, graba una orden sin
  palabra de activación. Plan B ante activaciones falsas.
- **Sidecar (de audio).** Proceso Python que convierte audio en texto y texto
  en audio. No interpreta ni decide.
- **Núcleo (core).** Proceso Node que decide, aplica políticas y ejecuta.
- **Dock.** UI React del núcleo, cargada como dock de navegador dentro de
  OBS.
- **Ruta rápida (fastpath).** Reconocimiento sin LLM de órdenes literales
  ("escena juego", "deshaz eso").
- **Agente.** Ruta con LLM para todo lo que la ruta rápida no reconoce.
- **Herramienta.** Acción de alto nivel (`obs_set_scene`, `twitch_ban`…)
  definida como `ToolDefinition`. Catálogo en `docs/PLAN.md` §5.7.
- **Nivel de permiso.** `free` (ejecuta y avisa con sonido), `confirm` (pide
  "sí" por los auriculares o en el dock), `blocked` (no se ejecuta salvo
  ajuste explícito, y entonces pasa a `confirm`).
- **Actor.** Quién origina una orden: el streamer (voz) o un mod en lista
  blanca (F2).
- **Dato de terceros.** Todo contenido que viene de Twitch (chat, nombres,
  títulos). Se marca `<third_party_data>` y nunca es una orden.
- **Earcon.** Sonido corto de confirmación o error en los auriculares.
- **Modo ensayo (dry-run).** Clober decide y registra lo que haría, sin
  ejecutar nada.
- **Contexto vivo.** Estado de OBS y Twitch mantenido por eventos, que usan
  las herramientas y el agente.
- **Puerta (G1, G2, G3).** Criterio medible que debe cumplirse para empezar
  la fase siguiente.
- **Evals.** Conjunto de órdenes con resultado esperado contra el que se
  mide cada cambio de prompt, modelo o herramienta (`evals/`).
- **Rutina (F2).** Secuencia guardada de herramientas ("modo pausa").
