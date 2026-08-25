# TASK-1890 (R1-08) — Checklist de rotación de la key de Replicate filtrada

**Task**: TASK-1890 (R1-08 del backlog de `TASK-1473-FASE-3.1-PLAN.md`) · **Agente**: Backend Architect
**Alcance de esta tarea**: solo preparación — eliminar el uso de la key del código y dejar este checklist. **No se rotó la credencial real.**

---

## 1. Qué se hizo en esta tarea

- Se eliminó el campo `replicateApiKey` y la URL `api.processAiImage` (`https://api.replicate.com/v1/predictions`) de `src/environments/environment.ts`, `environment.dev.ts` y `environment.prod.ts`. Ninguno de los dos campos estaba en uso: el cliente ya invoca la IA vía `httpsCallable(..., 'processAiImage')` contra la Cloud Function propia (`functions/src/index.ts`), que usa `fal.ai` con `FAL_KEY` en Secret Manager, no Replicate.
- Se eliminaron del working tree y del índice de git los artefactos de depuración `diff.txt`, `diff_ascii.txt` y `logs_firebase.txt` (dumps de debug versionados por error) porque contenían la key en texto plano.
- Verificado por grep: cero referencias a la key `***REPLICATE-KEY-ROTATED-Y-REDACTADA-2026-08-25***` en el working tree tras el cambio.

## 2. Qué queda pendiente (fuera de esta tarea, requiere aprobación)

- [ ] **Rotar la key de Replicate** en la consola de Replicate (invalidar `***REPLICATE-KEY-ROTATED-Y-REDACTADA-2026-08-25***` y generar una nueva, si la cuenta se sigue usando; si no, revocarla sin reemplazo).
- [ ] Confirmar con el dueño de la cuenta de Replicate si el servicio sigue en uso en algún flujo fuera de este repo (ej. scripts internos, otro proyecto) antes de revocar.
- [ ] Purgar la key del **historial de git** (`git filter-repo` o equivalente) — la key sigue presente en commits antiguos aunque ya no esté en el working tree. Requiere coordinación (reescribe historial, invalida clones existentes) y ventana de mantenimiento.
- [ ] Auditar si la key fue usada por terceros no autorizados desde que se filtró (logs de uso en el dashboard de Replicate) antes de rotarla, para dimensionar el impacto.
- [ ] Una vez rotada, confirmar que ningún flujo de Framia depende de Replicate (este repo ya no lo usa; verificar otros repos/proyectos hermanos si existen).

## 3. Cómo verificar que el checklist se completó

```bash
# Cero referencias a la key en el working tree (ya verificado en esta tarea):
grep -rl "***REPLICATE-KEY-ROTATED-Y-REDACTADA-2026-08-25***" . --exclude-dir=.git

# Tras la rotación real, confirmar en el dashboard de Replicate que la key antigua
# aparece como revocada/inactiva.
```

**Responsable de ejecutar la rotación real**: quien tenga acceso administrativo a la cuenta de Replicate de la agencia (fuera del alcance de este agente).
