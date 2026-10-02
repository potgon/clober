<!-- última actualización: 2026-10-02 -->

# Roadmap — Clober

Fuente: `docs/PRD.md` y `docs/PLAN.md` (detalle de cada tarea, contratos y
criterios de hecho). Fase actual: **F0 — prueba de concepto**. Sin código.

## Fases y puertas

| Fase | Estado | Puerta de salida |
| --- | --- | --- |
| F0 — PoC (una orden por voz) | **en curso** | G1: latencia fin de frase → escena, p50 < 2 s y p95 < 3 s en 30 intentos |
| F1 — MVP v0.1 | bloqueada por G1 | G2: 5 criterios de aceptación del PRD (`PLAN.md` §2) |
| F2 — v1 | bloqueada por G2 | G3: métricas v1 del PRD |
| F3 — v2 | bloqueada por G3 | — |

## Estado de tareas

Estados: `pendiente`, `en curso`, `hecha`, `hecha (sin verificar en vivo)`,
`bloqueada (motivo)`. Un agente coge la primera `pendiente` con
dependencias `hecha`.

### F0

| Tarea | Estado | Notas |
| --- | --- | --- |
| F0.1 Andamiaje del monorepo | hecha | `pnpm build && pnpm test && pnpm lint` en verde |
| F0.2 CI | hecha (sin verificar en vivo) | workflow escrito; no se ha hecho push, pendiente de ver el primer run en GitHub |
| F0.3 Esquemas compartidos | hecha | `packages/shared`: protocolo, ToolDefinition, políticas, config, registro |
| F0.4 Sidecar mínimo (PTT + VAD + STT) | pendiente | |
| F0.5 Núcleo mínimo (servidor + atajo + OBS) | pendiente | |
| F0.6 Medida y elección del modelo STT | bloqueada (T3: grabar 30 frases) | |
| F0.7 Wake word de prueba y CPU en reposo | pendiente | |
| F0.8 Puerta G1 | pendiente | |

### F1

| Tarea | Estado | Notas |
| --- | --- | --- |
| F1.1 Configuración y llavero | pendiente | |
| F1.2 Sidecar completo | pendiente | |
| F1.3 Wake word propio | pendiente | usa D1 por defecto si no se decide |
| F1.4 Contexto vivo de OBS | pendiente | |
| F1.5 Herramientas OBS | pendiente | |
| F1.6 Login de Twitch | bloqueada (T2: Client ID) | |
| F1.7 Contexto vivo de Twitch | pendiente | |
| F1.8 Herramientas Twitch + `context_get` | pendiente | |
| F1.9 Medios por nombre | pendiente | |
| F1.10 Agente LLM | pendiente | necesita T6 para la prueba manual |
| F1.11 Executor, confirmación, deshacer, ensayo | pendiente | |
| F1.12 Dock de OBS | pendiente | |
| F1.13 Robustez | pendiente | |
| F1.14 Evals | pendiente | `es-core` necesita T3 |
| F1.15 Activaciones falsas | pendiente | necesita T4 |
| F1.16 i18n | pendiente | |
| F1.17 Asistente de configuración | pendiente | |
| F1.18 Instalador de Windows | pendiente | |
| F1.19 Documentación | pendiente | |
| F1.20 Puerta G2 | pendiente | |

### F2 y F3

Tabla de diseño en `docs/PLAN.md` §8 y §9. Se desglosan en tareas al
empezar F2.

## Resultados de medidas

Aquí se apuntan los números que fijan defaults (modelo STT, CPU en reposo,
latencia de G1/G2, activaciones falsas, acierto de evals), con fecha.

- (ninguno todavía)

## Decisiones abiertas (sin resolver)

Valor por defecto en vigor mientras no se decidan — detalle en
`docs/PLAN.md` §10. Dueño de todas: Petru.

- **D1** — palabra de activación por defecto. Por defecto: "Regidor".
- **D2** — proveedor LLM por defecto. Por defecto: `anthropic`,
  `claude-haiku-4-5`; Ollama como alternativa.
- **D3** — persona con voz en el stream. Por defecto: extra opcional,
  desactivado.
- **D4** — solo Windows en el MVP. Por defecto: sí.
- **D5** — streamer piloto para v0.1. Por defecto: Petru hace el primer
  directo de G2.
- **D6** — nombres `clober` / `@clober/*`. Por defecto: usarlos tras
  comprobar disponibilidad.

Cerrada: licencia MIT (`LICENSE`).
