<!-- última actualización: 2026-10-02 -->

# Gestión de proyecto — Clober

Verdad actual sobre quién hace qué, para cuándo, y quién decide. Se
actualiza en el mismo commit que cualquier cambio de responsable, plazo o
dueño de decisión — ver contrato en `/CLAUDE.md`.

## Responsables

**Petru**: responsable del producto y dueño de todas las decisiones
abiertas (D1–D6 en `roadmap.md`). Desarrollo: agentes siguiendo
`docs/PLAN.md`. No hay más personas con rol asignado.

## Plazos

Sin fechas. Las fases avanzan por puertas medibles (G1, G2, G3), no por
calendario (`docs/PRD.md`, roadmap).

## Criterios de cierre de fase

- **F0 → F1 (G1):** latencia p50 < 2 s y p95 < 3 s en 30 órdenes "escena X"
  en el PC de Petru. Lo verifica: Petru.
- **F1 → F2 (G2):** los 5 criterios de aceptación del MVP (`PLAN.md` §2),
  medidos en un directo real de 3 h. Lo verifica: Petru.
- **F2 → F3 (G3):** métricas v1 del PRD. Lo verifica: Petru.

## Tareas pendientes de Petru

Detalle en `docs/PLAN.md` §11.

| ID | Tarea | Desbloquea | Estado |
| --- | --- | --- | --- |
| T1 | Decidir D1–D6 o aceptar defaults | — | pendiente |
| T2 | Registrar app pública en Twitch y pasar Client ID | F1.6 | pendiente |
| T3 | Grabar 30 frases PoC y 100 órdenes en español | F0.6, F1.14 | pendiente |
| T4 | Grabar 3 h de juego sin la palabra de activación | F1.15 | pendiente |
| T5 | Comprobar `clober` en GitHub y `@clober` en npm | publicación | pendiente |
| T6 | Clave de API del LLM para desarrollo | F1.10, F1.14 | pendiente |
| T7 | Decidir despliegue remoto del MCP del brain | Claude.ai | pendiente |

## Despliegue del MCP server remoto (Claude.ai)

Sin desplegar. Requiere elegir host con HTTPS, dominio, coste y quién rota
`MCP_TOKEN`. Dueño: Petru (T7).
