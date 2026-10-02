# `docs/PLAN.md` como fuente del cómo, con valores por defecto para lo abierto

**Fecha:** 2026-10-02
**Dueño:** Petru (pedido explícito: que los agentes futuros no tengan que
tomar casi ninguna decisión)
**Contexto:** `docs/PRD.md` define el qué, recomienda un stack y deja cinco
preguntas abiertas. Además, dos bloques del PRD exportado se perdieron
("embedded content": diagrama de arquitectura y roadmap de 4 fases con 3
puertas); el texto que los rodea sí está.
**Decisión:** `docs/PLAN.md` fija stack, estructura, contratos (protocolo
sidecar, `ToolDefinition`, políticas, config, registro), catálogo de 25
herramientas del MVP con su nivel de permiso, y tareas por fase con criterio
de hecho. Orden de autoridad: PRD → PLAN → decisiones posteriores del brain.
Las preguntas abiertas pasan a D1–D6 con un **valor por defecto en vigor**
hasta que Petru decida, para no bloquear a los agentes. El roadmap perdido
se reconstruye del texto del PRD: F0 PoC → G1 (latencia < 2 s) → F1 MVP →
G2 (criterios de aceptación) → F2 v1 → G3 (métricas v1) → F3 v2. La
licencia queda cerrada como MIT porque `LICENSE` ya lo es.
**Alternativas consideradas:** dejar las preguntas abiertas sin default —
descartada porque bloquearía F1.3 y F1.10; elegir Apache 2.0 por encajar con
openWakeWord — descartada porque MIT ya está publicado y es compatible con
dependencias Apache 2.0.
