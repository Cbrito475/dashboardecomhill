# Plantillas de workflows por tienda (H2 · plataforma multi-empresa)

Cada tienda tiene **sus propios workflows en n8n**, y esos workflows **se GENERAN
desde estas plantillas versionadas** — nunca se crean ni se editan a mano.
El registro `tienda_workflows` (Supabase) siempre sabe qué workflow es de quién,
de qué plantilla y de qué versión viene.

## Estructura

```
plantillas/
  README.md            ← este archivo (el contrato del aprovisionador)
  <servicio>/
    <plantilla>.<version>.json   ← ej: correo/wf-gmail-live.v1.json
```

Cada archivo es el **export JSON de n8n** (`nodes` + `connections` + `settings`)
con dos agregados:

- `_manifest`: metadatos de la plantilla — servicio, versión, parámetros que
  exige y **slots de credenciales** (qué credencial de n8n necesita cada nodo).
- Placeholders `{{ASI}}` en los valores que cambian por tienda.

## Parámetros estándar

| Placeholder | Qué es | Ejemplo (Lorentina) |
|---|---|---|
| `{{TIENDA_NOMBRE}}` | Nombre de la tienda (para el nombre del WF y nodos) | `Lorentina` |
| `{{STORE_ID}}` | uuid de `stores.id` — **toda escritura lo fija explícito** | `8452699c-…` |
| `{{SUPABASE_URL}}` | URL del proyecto Supabase | `https://exgcnhoqkbjljvandhgq.supabase.co` |
| `{{CRED_*}}` | id de credencial n8n del slot (ver `_manifest.credenciales`) | `pvBi7UetztNIWb9i` |

Regla vital de multi-tenancy: **ninguna plantilla puede confiar en el DEFAULT de
`store_id` de la base** (ese default existe solo como red de la migración de
Lorentina). Toda fila que un workflow escriba lleva `store_id: {{STORE_ID}}`.

## Cómo se aprovisiona una tienda (azul/verde)

1. Tomar la plantilla de la versión deseada y sustituir los placeholders con los
   parámetros de la tienda (de `stores` + `tienda_servicios.credencial_ids`).
2. Crear el workflow vía API de n8n con el nombre
   **`[<EMPRESA>/<TIENDA>] <nombre> (servicio) vN`** — ej:
   `[ECOMHILL/GIULIANI] WF-Gmail Live -> correos (correo) v1`.
3. Validar (ejecución de prueba / test_workflow) **antes** de publicar.
4. Publicar el nuevo; si reemplaza a uno anterior, despublicar el viejo y
   marcarlo `respaldo` en el registro (nunca borrarlo en el momento).
5. Registrar en `tienda_workflows` (store_id, servicio, plantilla, version,
   workflow_id, nombre, estado='activo').

Cambios para UNA tienda = nueva versión de plantilla o nuevos parámetros +
re-aprovisionar esa tienda. Cambios para TODAS = loop sobre el registro.
Diferencias legítimas entre tiendas viven como **parámetros/overrides** en
`tienda_servicios.config` — jamás como ediciones manuales del workflow, así la
re-aprovisión nunca las pisa.

## Credenciales

Los secretos **nunca** pasan por este repo ni por la base: en el onboarding los
tokens viajan del formulario directo a la API de n8n (que crea la credencial) y
acá solo llega el **id** resultante, guardado en
`tienda_servicios.credencial_ids` como `{ "slot": "id_n8n" }`.

## Estado de extracción (v1 desde los WFs reales de Lorentina)

- [x] `correo/wf-gmail-live.v1.json`
- [ ] `correo/wf-clasificador.v2.json`
- [ ] `correo/wf-redactor.v1.json`
- [ ] `correo/wf-enviar-cola.v1.json`
- [ ] `correo/wf-auto-responder.v1.json`
- [ ] `correo/wf-enviados-conciliar.v1.json`
- [ ] `correo/wf-adjuntos.v1.json`
- [ ] `tracking/wf-parcelpanel.v3.json`
- [ ] `redes/…`, `pagos_stripe/…`, `pagos_airwallex/…`, `disputas/…`, `monitoreo/…`

El resto se extrae **por servicio, cuando el piloto lo necesita** (Giuliani entra
solo con `correo`): así la plantilla se congela recién cuando se va a usar y no
envejece mientras Lorentina sigue evolucionando.
