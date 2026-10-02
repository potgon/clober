# Reinicio del brain para Clober sin historial del proyecto anterior

**Fecha:** 2026-10-02
**Dueño:** Petru
**Contexto:** `/brain` y `/mcp-server` se copiaron de otro proyecto de Petru
(Neurodivina) para reutilizar el formato: estado en `/state`, decisiones
append-only en `/decisions`, glosario, índice, y un servidor MCP que los
expone a otros agentes. El contenido era del proyecto anterior.
**Decisión:** se conserva la estructura y el contrato de `/CLAUDE.md` sin
cambios, se borran las 32 decisiones del proyecto anterior y se reescriben
`INDEX.md`, `meta.yml`, `glossary.md` y los cuatro archivos de `/state` para
Clober. El servidor MCP pasa a llamarse `clober-brain` (misma lógica, mismas
cuatro tools) y se registra en `/.mcp.json`.
**Alternativas consideradas:** conservar las decisiones antiguas en una
carpeta de archivo — descartada porque `search` las devolvería mezcladas con
las de Clober y confundiría a los agentes; el original sigue en el repo de
Neurodivina.
