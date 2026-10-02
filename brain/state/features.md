<!-- última actualización: 2026-10-02 -->

# Features — Clober

Estado del producto: **F0 (prueba de concepto), sin código**. Todo está
*planeado*. Fuente: `docs/PRD.md` (catálogo y alcance) y `docs/PLAN.md`
(diseño y tarea que lo implementa).

Estados: `planeada`, `en curso`, `hecha`, `retirada`.

## F0 — PoC

| Feature | Tarea | Estado |
| --- | --- | --- |
| Orden "escena X" por push-to-talk o wake word de prueba, sin LLM | F0.4–F0.5 | planeada |
| Registro de latencia de punta a punta | F0.5, F0.8 | planeada |

## F1 — MVP v0.1

**Escucha y entiende**

| Feature | Tarea | Estado |
| --- | --- | --- |
| Wake word configurable + push-to-talk | F0.7, F1.3 | planeada |
| STT local con fin de frase (VAD) | F0.4, F0.6 | planeada |
| Orquestador con LLM a elegir (Anthropic, OpenAI, Ollama) | F1.10 | planeada |
| Ruta rápida sin LLM para órdenes literales | F0.5, F1.11 | planeada |
| Respuesta discreta: earcon + TTS solo en auriculares | F1.2 | planeada |

**OBS** (herramientas 1–8 y 9–11 de `PLAN.md` §5.7)

| Feature | Tarea | Estado |
| --- | --- | --- |
| Cambiar escena, mostrar/ocultar fuentes | F1.5 | planeada |
| Reproducir vídeo/imagen local buscando por nombre | F1.9 | planeada |
| Silenciar, desilenciar, volumen | F1.5 | planeada |
| Guardar replay buffer y captura | F1.5 | planeada |

**Twitch** (herramientas 12–24)

| Feature | Tarea | Estado |
| --- | --- | --- |
| Título (confirmación) y categoría con búsqueda aproximada | F1.8 | planeada |
| Clip y marcador de VOD | F1.8 | planeada |
| Mensaje y anuncio al chat | F1.8 | planeada |
| Encuesta y predicción | F1.8 | planeada |
| Shoutout, timeout (confirmación si > 600 s) y ban (confirmación) | F1.8 | planeada |

**Seguridad y control**

| Feature | Tarea | Estado |
| --- | --- | --- |
| Niveles libre / confirmación / bloqueada | F1.11 | planeada |
| "Deshaz eso" | F1.11 | planeada |
| Modo ensayo (dry-run) | F1.11 | planeada |
| Dock de OBS: registro, confirmaciones, ajustes | F1.12 | planeada |
| Defensa contra inyección por chat | F1.8, F1.10, F1.14 | planeada |

**Instalación**

| Feature | Tarea | Estado |
| --- | --- | --- |
| Asistente de primera configuración | F1.17 | planeada |
| Instalador de Windows | F1.18 | planeada |

## F2 — v1

Biblioteca semántica de medios, rutinas por voz, rótulos y temporizadores,
mods remotos con permisos, consultas de contexto, resumen del chat, reglas
por eventos, persona con voz opcional, anuncios y raids. Todas
*planeadas*; diseño en `PLAN.md` §8.

## F3 — v2

Informe post-stream, visión de pantalla, MCP externos, YouTube y Kick,
verificación de voz. *Planeadas*; dirección en `PLAN.md` §9.

## Fuera de alcance (por ahora)

Rutinas compartidas por la comunidad y copiloto proactivo ("Futuro" en el
PRD). Voz del bot en el stream fuera del MVP.
