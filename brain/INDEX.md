<!-- última actualización: 2026-10-02 -->

# INDEX — Project Brain de Clober

Punto de entrada. Lee esto primero; abre solo los archivos relevantes a tu
tarea. Para implementar, la guía es `docs/PLAN.md`; el producto está en
`docs/PRD.md`.

## Cómo funciona este brain

- `/state` — verdad actual. Se **sobreescribe**. Cada archivo empieza con
  `<!-- última actualización: AAAA-MM-DD -->`.
- `/decisions` — log histórico **append-only**, un archivo por decisión
  (`AAAA-MM-DD-slug.md`: título, Fecha, Dueño, Contexto, Decisión,
  Alternativas consideradas). Nunca se edita: si cambia, entrada nueva que
  referencia a la anterior con `[[slug]]`.
- `glossary.md` — términos del proyecto.
- `meta.yml` — nombre, estado y color del proyecto.
- Contrato de cuándo actualizar cada archivo: `/CLAUDE.md`.
- Acceso desde otras IAs: servidor MCP `clober-brain` en `/mcp-server`
  (`read_state`, `update_state`, `log_decision`, `search`).

## /state

- `state/roadmap.md` — fases F0→F3 con sus puertas, **estado de cada tarea
  de `docs/PLAN.md`**, resultados de medidas y decisiones abiertas D1–D6 con
  su valor por defecto. Fase actual: **F0, sin código**.
- `state/features.md` — features del PRD por fase, con la tarea que las
  implementa y su estado. Todo planeado.
- `state/architecture.md` — tres capas locales, red local, seguridad, stack
  y valores medidos.
- `state/gestion.md` — Petru responsable y dueño de todo; sin plazos;
  criterios de puerta; tareas pendientes de Petru T1–T7.

## /decisions

- `2026-10-02-reinicio-del-brain-para-clober.md` — por qué se borró el
  historial del proyecto anterior y se conservó el formato.
- `2026-10-02-plan-de-implementacion-como-fuente-del-como.md` — por qué
  `docs/PLAN.md` manda sobre el cómo, cómo se reconstruyó el roadmap y por
  qué las preguntas abiertas tienen default.
- `2026-10-02-stack-y-estructura-del-monorepo.md` — versiones, herramientas
  y alternativas descartadas.
- `2026-10-02-herramientas-en-proceso-y-mcp-como-envoltorio.md` — por qué el
  núcleo importa las herramientas en proceso y el MCP es solo envoltorio.
