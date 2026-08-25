# Framia — Fase 3.1: Backlog ejecutable (R1 + R2 del roadmap de TASK-1415)

**Task**: TASK-1473 · **Agente**: Backend Architect · **Fecha**: 2026-08-23
**Commit base verificado**: `eac927d` (confirmado vigente en este worktree, hallazgos re-verificados contra el código real — ver "Verificación" abajo)
**Alcance de esta tarea**: solo planificación. No se modificó código de Framia, no hay commits, no hay deploys, no hay migraciones, no se rotó ninguna credencial, no se cambió arquitectura.

---

## 0. Nota sobre la fuente (léase antes de usar este plan)

No se encontró en este worktree (ni en los workspaces hermanos de `framia/backend-architect/*`) un archivo `docs/projects/FRAMIA-AUDIT-SYNTHESIS.md` ni ningún artefacto físico de TASK-1415 con un roadmap "R1/R2" explícito — probablemente vive fuera del repo (sistema de gestión de la agencia). Este plan reconstruye R1/R2 a partir del **contexto de proyecto persistido** (hallazgos F-01…F-32, score de Production Readiness 8/100, decisión "Keep & Modernize") entregado como contexto de esta tarea, verificado línea por línea contra el código actual:

- **R1 = Cierre de brechas críticas de seguridad y control de costo de IA.** Corresponde a los hallazgos P0/HIGH de superficie de ataque directa y fuga de presupuesto (F-01, F-02, F-03, F-04, F-12 + hallazgos HIGH de `setCors`/App Check/SSRF/`temp_uploads`).
- **R2 = Fundamentos de comercio real** (pagos, órdenes, fulfillment). Corresponde a F-05, F-06, F-07, F-08 y a la arquitectura destino recomendada en la fuente (dominios `orders/`, `payments/`, `fulfillment/`).

**Si la agencia tiene el documento original de TASK-1415 con una numeración R1/R2 distinta, este plan debe reconciliarse contra ese documento antes de crear las tareas definitivas** — el mapeo de IDs de tarea abajo es estable, pero el nombre "R1"/"R2" es una inferencia razonada, no una cita literal.

### Verificación rápida contra el código (commit `eac927d`)
Confirmado por lectura directa, no solo por el contexto heredado:
- `functions/src/index.ts:181` → `invoker: "public"` en `processAiImage`, sin ninguna verificación de `request.auth`. Confirma F-01.
- Ningún `credits` se lee ni decrementa en `functions/src/index.ts`. Confirma F-04.
- `functions/src/index.ts:252,287` → `enable_safety_checker: false` en ambas llamadas FLUX; `promptStyle` se usa como clave directa de `STYLE_CONFIG` con fallback silencioso a prompt libre (`buildPrompt`, línea 115) si no hay match. Confirma F-12.
- `firestore.rules:18-20` → catch-all `match /{document=**} { allow read, write: if request.auth != null; }` sigue presente además de las reglas específicas de `users` y `my_art`. Confirma F-03.
- `storage.rules:7-9` → `temp_uploads/{userId}/**` con `allow read: if true` (público, sin expiración). Confirma el hallazgo HIGH de exposición de `temp_uploads`.
- `src/app/services/payment.ts` → `processPayment()` es literalmente `of(true).pipe(delay(2000))`. Confirma F-05.
- `src/app/checkout/checkout.page.ts:101` → `dummyOrderId = 'ORD-' + Math.floor(Math.random() * 100000)`, nunca escrito a Firestore. Confirma F-06.
- `src/app/services/printing.service.ts` → `submitOrder()` solo hace `console.log`, y no se invoca desde `checkout.page.ts`. Confirma F-07 (código huérfano).
- `src/app/checkout/checkout.page.ts:68` → `this.totalCost = frame.price + this.shippingCost` calculado en cliente desde `catalog.json`, sin revalidación server-side. Confirma F-08.
- `functions/package.json` → no hay dependencia `stripe`; `src/app/models/order.interface.ts` existe (tipo `Order`) pero no hay colección `orders` en `firestore.rules` ni escritura en ningún servicio.

No se encontró nada que contradijera el contexto heredado — se usa tal cual como base del backlog.

---

## 1. Reglas transversales (aplican a todas las tareas)

- **Ninguna tarea de este backlog incluye el deploy real a producción.** Todo el trabajo se valida en Firebase Emulator Suite (`firestore`, `functions`, `storage`) y/o Stripe en modo test. El deploy a producción es un paso posterior, explícito, fuera de este backlog, y requiere aprobación separada.
- **Ninguna tarea incluye rotación de credenciales.** R1-08 prepara el terreno (elimina el uso del código) pero la rotación efectiva de la key de Replicate queda fuera de alcance hasta aprobación explícita, como indica la tarea origen.
- Cambios a `firestore.rules` / `storage.rules` se desarrollan y prueban contra el emulador (`firebase emulators:exec` + `@firebase/rules-unit-testing`); el `firebase deploy --only firestore:rules,storage` queda pendiente de aprobación y ventana de despliegue.
- Presupuesto de IA: 2 USD/día, 30 USD/mes (memoria de negocio). Cualquier tarea que ejercite `processAiImage`/`upscaleImageForPrint` en pruebas debe usar el emulador con mocks de `fal.ai`, no llamadas reales, para no consumir presupuesto durante desarrollo.

---

## 2. R1 — Seguridad y control de costo de IA

| ID | Tarea | Depende de | Agente recomendado | Archivos/componentes | ¿Paralelizable? | ¿Requiere aprobación? |
|---|---|---|---|---|---|---|
| R1-01 | Autenticación obligatoria en Cloud Functions de IA | — | Backend Architect | `functions/src/index.ts` (`processAiImage`, `saveImagePermanently`, `upscaleImageForPrint`) | Sí (junto con R1-04..R1-07, R2-01) | No para desarrollo; **sí** para el deploy que cambia `invoker` en producción (puede romper clientes no actualizados) |
| R1-02 | Enforcement server-side de créditos de IA (transacción atómica) | R1-01 | Backend Architect | `functions/src/index.ts`, `src/app/services/user.service.ts`, nuevo `users/{uid}.credits` write path | No (usa el `request.auth` que agrega R1-01) | Sí — cambia el modelo de negocio visible al usuario (puede bloquear generaciones que hoy son "gratis") |
| R1-03 | Rate limiting / cuota por usuario en endpoints de IA | R1-01 | Backend Architect / DevOps Engineer | `functions/src/index.ts`, nueva colección `rate_limits/{uid}` o Firestore counters | No (necesita `request.auth`) | No |
| R1-04 | Firebase App Check (cliente + funciones) | — | Backend Architect + Frontend/Angular Developer | `src/app/app.component.ts` o bootstrap, `src/environments/*`, `functions/src/index.ts` (`enforceAppCheck`) | Sí | Sí — riesgo de bloquear tráfico legítimo si se activa en modo "enforce" sin monitoreo previo |
| R1-05 | Whitelist server-side de `promptStyle` + revisión de `enable_safety_checker` | — | Backend Architect | `functions/src/index.ts` (`buildPrompt`, `STYLE_CONFIG`, payload FLUX) | Sí | Sí — decisión de producto/legal sobre si reactivar el safety checker (impacta calidad de output vs. riesgo de derecho de imagen) |
| R1-06 | Cerrar SSRF en `saveImagePermanently` (allowlist de dominios de origen) | — | Backend Architect | `functions/src/index.ts` (`saveImagePermanently`) | Sí | No |
| R1-07 | Restringir `setCors` público + exponer `temp_uploads` con expiración | — | Backend Architect / DevOps Engineer | `functions/src/index.ts` (`setCors`), `storage.rules`, lifecycle rule del bucket | Sí | Sí — cambia comportamiento de URLs hoy públicas que la UI podría estar consumiendo directamente |
| R1-08 | [PREP, no ejecuta rotación] Eliminar uso de la key de Replicate filtrada del código cliente y dejar preparado el checklist de rotación | — | Backend Architect / Security Engineer | `src/environments/environment.ts`, `environment.dev.ts`, `environment.prod.ts`, buscar usos de Replicate en `src/app/**` | Sí | **Sí, obligatorio** — la rotación de la credencial en sí y el squash/purge del historial de git quedan bloqueados hasta aprobación explícita fuera de esta tarea |

### Detalle por tarea (R1)

**R1-01 — Autenticación obligatoria en Cloud Functions de IA**
- Riesgos: cualquier cliente que hoy invoque las funciones sin sesión (si existe alguno, ej. testing/QA scripts) se rompe; hay que auditar consumidores antes de forzar `invoker` no público.
- Tests requeridos: unit test con `firebase-functions-test` simulando `request.auth = null` → debe lanzar `unauthenticated`; test con `request.auth` válido → debe proceder normalmente.
- Criterios de aceptación: las 3 funciones (`processAiImage`, `saveImagePermanently`, `upscaleImageForPrint`) rechazan invocaciones sin `request.auth.uid`; el emulador confirma 401/`unauthenticated` para llamadas anónimas.
- Rollback: revertir el commit de la función (Cloud Functions versiona por deploy; `firebase functions:log` + rollback a la revisión anterior de Cloud Run/Functions si es post-deploy). Como no hay deploy en esta fase, el rollback real es solo `git revert`.

**R1-02 — Enforcement server-side de créditos**
- Riesgos: condición de carrera si dos generaciones concurrentes decrementan el mismo documento sin transacción → usar `admin.firestore().runTransaction`. Riesgo de negocio: usuarios existentes con `credits` ya "gastados" en el cliente pero nunca descontados en servidor van a percibir una reducción repentina de saldo.
- Tests requeridos: test de transacción concurrente (dos invocaciones simultáneas no deben dejar `credits` negativo); test de refund en caso de fallo del pipeline de IA (crédito se revierte si `fal.ai` falla después de haber sido descontado).
- Criterios de aceptación: `credits` se decrementa exactamente una vez por generación exitosa, se revierte en fallos, nunca queda negativo; UI muestra saldo actualizado tras cada llamada.
- Rollback: flag de configuración (`remoteConfig` o doc `config/ai_credits.enforced=false`) para desactivar el enforcement sin redeploy si aparece un bug bloqueando a usuarios legítimos.

**R1-03 — Rate limiting por usuario**
- Riesgos: falsos positivos si el límite es muy bajo para usuarios legítimos que iteran estilos.
- Tests requeridos: test que exceda el límite y confirme rechazo `resource-exhausted`; test que confirme reseteo de ventana temporal.
- Criterios de aceptación: un usuario no puede exceder N invocaciones/minuto (a definir con negocio, sugerido inicial: alineado al presupuesto de 2 USD/día ÷ costo estimado por generación).
- Rollback: mismo patrón de flag que R1-02.

**R1-04 — Firebase App Check**
- Riesgos: dispositivos con reCAPTCHA/Play Integrity mal configurado quedan bloqueados; requiere periodo de "monitor only" antes de "enforce".
- Tests requeridos: test manual en emulador con token de App Check válido/ausente; smoke test en cada plataforma (web/iOS/Android vía Capacitor) antes de enforce.
- Criterios de aceptación: fase 1 en modo *monitor* (logging sin bloquear) desplegable de forma segura; fase 2 (*enforce*) requiere aprobación separada tras revisar métricas de falsos positivos.
- Rollback: App Check se puede desactivar por función individualmente desde la consola sin redeploy de código.

**R1-05 — Whitelist de `promptStyle`**
- Riesgos: si la whitelist es más estricta que los estilos activos en `src/assets/data/catalog.json` o en el picker de estilos del cliente, se rompen estilos legítimos — hay que derivar la whitelist de `Object.keys(STYLE_CONFIG)`, no inventarla aparte.
- Tests requeridos: test que confirme rechazo de un `promptStyle` fuera de `STYLE_CONFIG` (`invalid-argument`, no fallback silencioso); test de regresión de los 9 estilos existentes.
- Criterios de aceptación: `buildPrompt` ya no tiene fallback a `style` crudo; cualquier valor no reconocido lanza error explícito antes de llamar a `fal.ai`.
- Rollback: revert de commit; sin dependencias externas.

**R1-06 — SSRF en `saveImagePermanently`**
- Riesgos: si el allowlist es muy estricto, rompe integraciones legítimas de fal.ai si cambian de dominio/CDN.
- Tests requeridos: test que confirme rechazo de una URL fuera del allowlist (ej. `http://169.254.169.254/...` o dominio arbitrario); test de aceptación para dominios conocidos de fal.ai.
- Criterios de aceptación: `fetch(rawOutputUrl)` solo se ejecuta si el host está en la allowlist explícita.
- Rollback: revert de commit.

**R1-07 — `setCors` + `temp_uploads`**
- Riesgos: si hay flujos de UI que hoy dependen de leer `temp_uploads` sin auth (ej. previsualización compartida), se rompen — auditar `src/app/services/image-upload.service.ts` y `editor-store.service.ts` antes de restringir.
- Tests requeridos: test de reglas de Storage (`@firebase/rules-unit-testing`) confirmando que lectura anónima de `temp_uploads` ya no está permitida tras el cambio (o está limitada a URLs firmadas con expiración); confirmar que `setCors` requiere rol admin.
- Criterios de aceptación: `temp_uploads` deja de ser legible sin autenticación o expira en ventana corta (ej. 24h) vía lifecycle rule; `setCors` ya no es invocable públicamente.
- Rollback: revert de `storage.rules` + revert del código de `setCors`.

**R1-08 — Prep de rotación de Replicate**
- Riesgos: ninguno de código (es limpieza), pero **no ejecutar** la rotación real de la key sin aprobación — el acceso actual sigue comprometido hasta que se rote, así que esta tarea debe ir acompañada de una escalación explícita a quien tenga permisos sobre la cuenta de Replicate.
- Tests requeridos: grep de todo el repo confirmando cero referencias a la key de Replicate tras el cambio; build de `src/environments/*` sin ese secreto embebido en el bundle.
- Criterios de aceptación: código cliente ya no importa/usa Replicate; documento de checklist de rotación entregado a quien tenga la aprobación (fuera de esta tarea).
- Rollback: revert de commit (no hay estado externo mutado por esta tarea en particular).

---

## 3. R2 — Comercio real: pagos, órdenes y fulfillment

| ID | Tarea | Depende de | Agente recomendado | Archivos/componentes | ¿Paralelizable? | ¿Requiere aprobación? |
|---|---|---|---|---|---|---|
| R2-01 | Esquema Firestore `orders` + reglas explícitas | — (coordinar con R1-07 por ser el mismo archivo `firestore.rules`) | Backend Architect | `firestore.rules`, nuevo `src/app/models/order.interface.ts` (extender) | Sí (junto a R1-*) | Sí — cambio de reglas de seguridad |
| R2-02 | Cloud Function `createOrder` (precio server-side, orderId server-side) | R2-01 | Backend Architect | `functions/src/index.ts` (nueva función), `src/app/checkout/checkout.page.ts`, `src/assets/data/catalog.json` (fuente de verdad server-side) | No | No para desarrollo; sí para el deploy |
| R2-03 | Integración Stripe backend: PaymentIntent + webhook firmado | R2-02 | Backend Architect / Payments Integration Engineer | `functions/src/index.ts` (nuevas funciones `createPaymentIntent`, `stripeWebhook`), `functions/package.json` (dep `stripe`) | No | **Sí, obligatorio** — requiere cuenta Stripe, claves y decisión de negocio sobre modo live/test |
| R2-04 | Cliente: reemplazar `PaymentService` mock por Stripe real | R2-03 | Frontend/Angular Developer | `src/app/services/payment.ts`, `src/app/checkout/checkout.page.ts`, `src/app/checkout/checkout.page.html` | No | Sí (mismo motivo que R2-03) |
| R2-05 | Order confirmation: leer orden real desde Firestore | R2-02 | Frontend/Angular Developer | `src/app/order-confirmation/order-confirmation.page.ts/html` | Sí (con R2-06) | No |
| R2-06 | Idempotencia en `createOrder` / `createPaymentIntent` | R2-02, R2-03 | Backend Architect | `functions/src/index.ts`, nueva colección `idempotency_keys/{key}` | Sí (con R2-05) | No |
| R2-07 | Integración Sensaria: SDK/cliente + mapeo SKU + trigger post-pago | R2-02, R2-03 | Backend Architect | `functions/src/index.ts` (nueva función `submitFulfillmentOrder`), nuevo `functions/src/fulfillment/`, `src/assets/data/catalog.json` (mapeo `Frame.id` → SKU Sensaria) | No | **Sí, obligatorio** — requiere credenciales y contrato con Sensaria (fuera del alcance de esta tarea: "no rotar/crear credenciales todavía") |
| R2-08 | Conectar `upscaleImageForPrint` (huérfano) al pipeline de fulfillment + estado de fulfillment en UI | R2-07 | Backend Architect + Frontend/Angular Developer | `functions/src/index.ts`, `src/app/services/printing.service.ts` (o su reemplazo), `src/app/order-confirmation/`, `src/app/account/` | No | No |

### Detalle por tarea (R2)

**R2-01 — Esquema `orders` + reglas**
- Riesgos: si se desarrolla en paralelo con R1-07 (ambas tocan `firestore.rules`/`storage.rules`), hay riesgo de conflicto de merge — coordinar orden de integración, no ejecución simultánea del mismo archivo por dos agentes distintos.
- Tests requeridos: tests de reglas (`@firebase/rules-unit-testing`) confirmando que solo Admin SDK (Cloud Functions) puede escribir `orders`, y que un usuario solo puede leer sus propias órdenes (`resource.data.userId == request.auth.uid`).
- Criterios de aceptación: colección `orders/{orderId}` con campos `userId`, `items`, `subtotal`, `shippingCost`, `total`, `paymentStatus` (`pending|paid|failed|refunded`), `fulfillmentStatus` (`pending|submitted|printing|shipped|delivered|failed`), `createdAt`, `updatedAt`; reglas deniegan `write` directo desde cliente.
- Rollback: es una colección nueva (aditiva) — no hay datos previos que migrar; revertir reglas es seguro.

**R2-02 — `createOrder` server-side**
- Riesgos: `catalog.json` hoy vive como asset estático del cliente — si `createOrder` recalcula precio, necesita su propia copia server-side de `catalog.json` (o cargarlo de Firestore/Storage) para no confiar en el payload del cliente; hay que decidir la fuente de verdad única antes de implementar (riesgo de desincronización si quedan dos copias del catálogo).
- Tests requeridos: test que envíe un `total` manipulado desde el cliente y confirme que el servidor lo ignora y recalcula desde su propia fuente; test de `orderId` generado server-side (no reproducible/predecible, ej. UUID).
- Criterios de aceptación: el precio final que se cobra siempre proviene del cálculo server-side; `orderId` nunca se genera en el cliente.
- Rollback: revert de función; la colección `orders` es aditiva, no hay que revertir datos.

**R2-03 — Stripe backend**
- Riesgos: es el mayor riesgo operativo del backlog — maneja dinero real. Sin idempotencia (R2-06) puede duplicar cargos en reintentos de red. Webhook sin verificación de firma es vulnerable a payloads falsificados.
- Tests requeridos: test de verificación de firma del webhook con `stripe-mock` o fixtures oficiales de Stripe; test de flujo completo en modo test (`pk_test_`/`sk_test_`) create→confirm→webhook; test de manejo de `payment_intent.payment_failed`.
- Criterios de aceptación: `createPaymentIntent` nunca expone `sk_` al cliente; webhook verifica firma (`stripe.webhooks.constructEvent`) y actualiza `orders/{orderId}.paymentStatus` solo a partir del evento verificado, nunca desde una llamada directa del cliente.
- Rollback: feature flag `payments.stripe.enabled=false` que retorna al estado actual ("próximamente" / checkout deshabilitado) sin necesidad de redeploy de emergencia. Las claves de Stripe deben quedar en Secret Manager, nunca en `environment*.ts` (mismo patrón que `FAL_KEY`, que sí está bien implementado hoy).

**R2-04 — Cliente Stripe real**
- Riesgos: cambia la UX del checkout (requiere Stripe Elements/PaymentSheet, manejo de errores de tarjeta, 3D Secure) — no es un cambio trivial de una línea.
- Tests requeridos: test de componente con tarjetas de prueba de Stripe (éxito, fondos insuficientes, requiere autenticación 3DS); test de que `isProcessing` se limpia correctamente en todos los casos de error.
- Criterios de aceptación: el usuario puede pagar con una tarjeta de prueba de Stripe end-to-end en el emulador/modo test y llegar a `order-confirmation` con una orden real persistida.
- Rollback: revert de commit del componente; sin estado de servidor mutado por el cliente en sí (los `PaymentIntent` de prueba no tienen impacto en producción).

**R2-05 — Order confirmation real**
- Riesgos: bajo. Cuidado con exponer datos de otras órdenes si la ruta usa solo el `orderId` de query param sin verificar `userId` — debe validarse contra `request.auth.uid` (regla de R2-01) o vía función `getOrder` que verifique propiedad.
- Tests requeridos: test que un usuario no pueda leer la orden de otro usuario (403/permission-denied); test de renderizado con datos reales.
- Criterios de aceptación: la página muestra datos reales de Firestore, no solo el `orderId` de query param.
- Rollback: revert de commit.

**R2-06 — Idempotencia**
- Riesgos: si la clave de idempotencia no se genera correctamente en el cliente (ej. se regenera en cada reintento en vez de reusarse), no protege nada — debe generarse una vez por intento de checkout y reusarse en reintentos.
- Tests requeridos: test que invoque `createOrder`/`createPaymentIntent` dos veces con la misma idempotency key y confirme que la segunda invocación retorna el mismo resultado sin duplicar orden ni cargo.
- Criterios de aceptación: doble-click o reintento de red en el botón "Pagar" nunca genera dos órdenes ni dos cargos.
- Rollback: revert de commit; colección `idempotency_keys` es aditiva.

**R2-07 — Integración Sensaria**
- Riesgos: el mayor desconocido del backlog — "cero integración con Sensaria en todo el repositorio" (contexto heredado), no hay SDK, ni mapeo de SKUs, ni documentación de su API en el repo. Este ítem probablemente necesita una sub-tarea previa de descubrimiento (leer documentación de Sensaria, definir contrato) antes de poder estimarse con precisión — se recomienda tratarlo como spike + implementación, no como una sola tarea de tamaño fijo.
- Tests requeridos: test con la API de Sensaria mockeada (sandbox si existe) confirmando el payload de envío de orden; test de manejo de fallos (orden pagada pero fulfillment falla → debe quedar en estado recuperable, no perderse).
- Criterios de aceptación: al pasar `paymentStatus` a `paid`, se dispara automáticamente el envío a Sensaria con el SKU correcto mapeado desde `Frame.id`; el estado queda registrado en `orders/{orderId}.fulfillmentStatus`.
- Rollback: feature flag para desactivar el trigger automático y volver a fulfillment manual si la integración falla en producción; ninguna orden se pierde porque el pago y el fulfillment son pasos separados y auditable en Firestore.
- **Bloqueo explícito**: requiere credenciales de Sensaria, que esta tarea NO debe crear ni rotar — la implementación puede desarrollarse contra un mock/sandbox, pero la conexión real queda pendiente de aprobación y de que la agencia provea las credenciales.

**R2-08 — Conectar `upscaleImageForPrint` + tracking de estado**
- Riesgos: bajo técnicamente (la función ya existe y funciona, solo está huérfana), pero el timing importa — el upscale debe ocurrir después de pago confirmado, no antes (para no gastar presupuesto de IA en órdenes que nunca se pagan).
- Tests requeridos: test que confirme que el upscale se dispara solo tras `paymentStatus == 'paid'`, no antes; test de UI mostrando el estado de fulfillment.
- Criterios de aceptación: toda orden pagada dispara automáticamente el upscale de alta resolución antes de enviarse a Sensaria; el usuario puede ver el estado (`pending → submitted → printing → shipped → delivered`) en `account`/`order-confirmation`.
- Rollback: revert de commit; no hay migración de datos.

---

## 4. Orden de ejecución y paralelización

```
Oleada 0 (sin dependencias, en paralelo):
  R1-01, R1-04, R1-05, R1-06, R1-08, R2-01
  R1-07  ← coordinar con R2-01 (mismo archivo firestore.rules/storage.rules; no ejecutar
           ambas simultáneamente sobre el mismo archivo, secuenciar su merge aunque el
           desarrollo pueda avanzar en paralelo en ramas separadas)

Oleada 1 (depende de oleada 0):
  R1-02 (← R1-01)
  R1-03 (← R1-01)
  R2-02 (← R2-01)

Oleada 2 (depende de oleada 1):
  R2-03 (← R2-02)

Oleada 3 (depende de oleada 2, en paralelo entre sí):
  R2-04 (← R2-03)
  R2-05 (← R2-02)
  R2-06 (← R2-02, R2-03)

Oleada 4 (depende de oleada 3):
  R2-07 (← R2-02, R2-03)

Oleada 5:
  R2-08 (← R2-07)
```

Total: 16 tareas, 6 oleadas. Las oleadas 0 y 3 son las de mayor paralelismo (hasta 6 y 3 tareas simultáneas respectivamente).

---

## 5. Riesgos transversales del backlog completo

1. **Presupuesto de IA durante pruebas** — cualquier test que golpee `fal.ai` real (en vez del emulador con mocks) puede agotar el límite de 2 USD/día. Mitigación: todas las tareas que tocan `processAiImage`/`upscaleImageForPrint` deben probarse contra mocks/emulador, nunca contra `fal.ai` real en CI.
2. **`firestore.rules`/`storage.rules` como recurso compartido** — R1-03, R1-07, R2-01 y R2-06 tocan reglas o colecciones nuevas en el mismo par de archivos. Sin coordinación de merge, hay riesgo real de que un agente sobreescriba el trabajo de otro.
3. **Dependencia externa no documentada (Sensaria)** — R2-07 es el mayor riesgo de estimación del backlog; no hay documentación de su API en el repo. Recomendado tratarlo como spike antes de comprometerse a una fecha.
4. **Deploy real está fuera de todas estas tareas** — cada tarea de este backlog termina en "validado en emulador / modo test", no en producción. Se necesita una tarea explícita posterior (fuera de este backlog, con aprobación) para desplegar cada oleada a producción, idealmente con feature flags para poder revertir sin rollback de código.
5. **Doble fuente de verdad del catálogo** — `catalog.json` vive hoy solo en `src/assets/data/`. R2-02 necesita una copia/fuente server-side. Si no se resuelve con una única fuente de verdad (ej. mover `catalog.json` a Cloud Storage o Firestore y que el cliente lo consuma de ahí también), se corre el riesgo de crear una tercera fuente desincronizada.
6. **Datos de usuario con `credits` no confiables** — R1-02 puede exponer que el saldo mostrado hoy en cliente no refleja consumo real; requiere decisión de producto sobre cómo comunicar/migrar el saldo inicial de usuarios existentes.

---

## 6. Siguiente paso sugerido

1. Confirmar con quien gestiona TASK-1415 si "R1/R2" tiene una definición distinta a la reconstruida en la Sección 0 — si coincide, este backlog puede convertirse directamente en tareas de agencia con los IDs de las Secciones 2 y 3.
2. Priorizar Oleada 0 de R1 (seguridad/costo) antes que cualquier tarea de R2 — son P0 según el contexto heredado y no dependen de decisiones de negocio (Stripe/Sensaria) que sí bloquean partes de R2.
3. Tratar R2-07 (Sensaria) como spike de descubrimiento antes de asignarlo como tarea de implementación de tamaño fijo.
