# Plan Maestro Frontend para v0 (ITSON)

## 1. Objetivo del documento

Este plan define, con nivel de ejecución, cómo construir el frontend completo del Sistema Gestor Documental Institucional usando Next.js App Router, shadcn/ui, Craft.js, Auth.js y una capa proxy/BFF tipada.

El documento está redactado para que v0 pueda continuar el trabajo al recibir el repositorio sin depender de contexto adicional.

---

## 2. Contexto mínimo del proyecto

### 2.1 Stack base

- Next.js (App Router)
- TypeScript
- Tailwind CSS + shadcn/ui
- Backend expuesto vía `app/api/*`
- Lógica de negocio modular en `src/modules/*`

### 2.2 Estado actual relevante

- Existen endpoints backend funcionales para usuarios, plantillas, eventos, verificación, auditoría y recuperación.
- El frontend está parcialmente scaffolded (rutas iniciales), pero falta capa completa de UI, auth real y BFF tipado.
- El flujo de negocio central ya existe en backend: `PENDIENTE -> AUTORIZADO -> FIRMADO -> COMPLETADO/RECHAZADO`.

### 2.3 Objetivo de este plan frontend

Construir:

1. Shell por rol (admin, creator, signer, auditor).
2. Módulo de plantillas con editor Craft.js.
3. Módulo de eventos (crear, autorizar, firmar, staging, generar, revocar).
4. Portal público de verificación.
5. Configuración editable de institución (nombre, logo, descripción, tema).
6. Seguridad frontend + proxy/BFF + contratos tipados.

---

## 3. Principios de arquitectura frontend

## 3.1 App Router por zonas

- Zona pública: verificación externa.
- Zona auth: acceso e inicio de sesión.
- Zona dashboard: módulos operativos internos.
- Zona configuración: branding y parámetros institucionales.

## 3.2 Capa Proxy/BFF obligatoria

La UI no debe consumir endpoints de dominio de forma dispersa. Se define una capa centralizada de clientes tipados con:

- validación de request/response
- normalización de errores
- trazabilidad (correlation-id)
- control de retries en operaciones idempotentes

## 3.3 Seguridad por diseño

- Auth.js como fuente de sesión.
- Guards de ruta por rol y permiso.
- Permisos de acción (botones, forms, mutaciones) sincronizados con RBAC backend.
- Prevención de doble submit y operaciones repetidas.

---

## 4. Mapa de rutas frontend a construir

## 4.1 Público

### Ruta: `/verify`

**Propósito:** validar credenciales/documentos por folio/hash o por payload+proof.

**Contenido:**

- Formulario de verificación rápida (folio + hash opcional)
- Verificación avanzada (payload + merkleRoot + proof[])
- Resultado visual (válido, revocado, alterado, no encontrado)
- Acciones: copiar resultado, exportar evidencia, descargar PDF si aplica

**Endpoints:**

- `GET /api/verify?folio={folio}&hash={hash?}`
- `POST /api/verify`

---

## 4.2 Auth

### Ruta: `/auth/signin`

**Propósito:** autenticación con Auth.js.

**Contenido:**

- Formulario de acceso
- Mensajes de error de sesión
- Estado de cuenta

**Acciones:**

- iniciar sesión
- redireccionar por rol
- cerrar sesión

**Endpoints asociados:**

- `Auth.js handlers` (`/api/auth/*`)

---

## 4.3 Dashboard principal

### Ruta: `/dashboard`

**Propósito:** vista de arranque por rol.

**Contenido:**

- KPIs operativos por rol
- acciones rápidas
- alertas de flujo (pendientes de firma, jobs de revocación, inconsistencias de staging)

---

## 4.4 Usuarios y roles

### Ruta: `/dashboard/users`

**Propósito:** administración RBAC y bóveda de firma.

**Contenido:**

- tabla de usuarios
- filtros por rol
- formulario alta de usuario
- estado de bóveda/firma

**Endpoints:**

- `GET /api/users`
- `POST /api/users`

**Casos de uso:**

1. alta de usuario
2. consulta por rol
3. validación de permisos para gestión

---

## 4.5 Plantillas

### Ruta: `/dashboard/templates`

**Propósito:** listar y administrar plantillas.

**Contenido:**

- tabla de plantillas
- filtros
- estado y metadata

**Endpoints:**

- `GET /api/templates`

### Ruta: `/dashboard/templates/new`

**Propósito:** crear plantilla nueva con editor.

**Contenido:**

- formulario de metadatos (nombre, prefijo)
- editor Craft.js
- preview

**Endpoints:**

- `POST /api/templates`

**Casos de uso:**

1. crear plantilla documental
2. validar unicidad de prefijo
3. versionar esquema visual

---

## 4.6 Eventos

### Ruta: `/dashboard/events`

**Propósito:** crear/listar eventos.

**Contenido:**

- listado de eventos
- alta de evento
- estado de consenso

**Endpoints:**

- `POST /api/events`

### Ruta: `/dashboard/events/[id]`

**Propósito:** detalle del evento y acciones de transición.

**Contenido:**

- metadata del evento
- estado actual
- historial de acciones
- acciones habilitadas por estado/permiso

**Endpoints:**

- `GET /api/events/{id}`
- `POST /api/events/{id}/authorize`
- `POST /api/events/{id}/sign`

### Ruta: `/dashboard/events/[id]/staging`

**Propósito:** conciliación multizona de datos previos a generación.

**Contenido:**

- grid de conciliación
- errores por fila
- edición quirúrgica
- validación total antes de avanzar

**Endpoint:**

- `POST /api/events/{id}/staging/reconcile`

### Ruta: `/dashboard/events/[id]/generate`

**Propósito:** generar lotes documentales con folios JIT.

**Contenido:**

- carga de rows
- selección de `batchType`
- confirmación de operación

**Endpoint:**

- `POST /api/events/{id}/generate`

### Ruta: `/dashboard/events/[id]/revocation`

**Propósito:** revocar hash y gestionar cola/saga.

**Contenido:**

- formulario de revocación
- estatus de job
- reproceso manual de cola

**Endpoints:**

- `POST /api/events/{id}/revoke`
- `POST /api/events/revocations/process`

---

## 4.7 Auditoría

### Ruta: `/dashboard/audits`

**Propósito:** trazabilidad forense operativa.

**Contenido:**

- filtros (usuario, acción, entidad, límite)
- tabla de registros
- detalle de snapshot

**Endpoint:**

- `GET /api/audits`

---

## 4.8 Recuperación documental

### Acción desde módulo de auditoría/evento/documentos

**Propósito:** recuperar PDF original cuando se autorice.

**Endpoint:**

- `POST /api/documents/{id}/recover`

**Resultado esperado:** descarga `application/pdf` con headers de trazabilidad.

---

## 4.9 Configuración institucional (branding editable)

### Ruta: `/dashboard/settings/branding`

**Propósito:** editar identidad institucional sin tocar código.

**Campos editables obligatorios:**

1. Nombre de institución (default: Instituto Tecnológico de Sonora)
2. Nombre del sistema (default: Gestor Documental Institucional)
3. Descripción corta
4. Descripción pública extendida
5. Logo principal (URL/asset)
6. Isotipo
7. Paleta de color (primario/secundario/acento/superficie)
8. Tipografía principal y secundaria
9. Favicon y metadata social

**Aplicación de branding:**

- login
- shell dashboard
- portal verify
- metadata global
- pantallas de exportación y reportes

---

## 5. Contratos API tipados (request/response)

> Fuente de verdad: use-cases de backend y route handlers existentes.

## 5.1 Usuarios

### `GET /api/users`

**Query:**

```ts
{
  requesterUserId: string;
  role?: 'ADMIN' | 'CREATOR' | 'SIGNER' | 'AUDITOR';
}
```

**Response 200:**

```ts
type UserListResponse = Array<{
  id: string;
  fullName: string;
  institutionalEmail: string;
  rolesAssigned: string[];
  officialPosition: string;
  createdAt: string;
  updatedAt: string;
}>;
```

### `POST /api/users`

**Body:**

```ts
{
  requesterUserId: string;
  fullName: string;
  institutionalEmail: string;
  rolesAssigned: Array<'ADMIN' | 'CREATOR' | 'SIGNER' | 'AUDITOR'>;
  officialPosition: string;
  signaturePngUrl: string;
}
```

**Response 201:** usuario creado.

---

## 5.2 Plantillas

### `GET /api/templates`

**Query:**

```ts
{
  requesterUserId: string;
}
```

**Response 200:** listado de plantillas.

### `POST /api/templates`

**Body:**

```ts
{
  requesterUserId: string;
  templateName: string;
  folioPrefix: string;
  craftSchemaJson: Record<string, unknown>;
}
```

**Response 201:** plantilla creada.

---

## 5.3 Eventos

### `POST /api/events`

**Body:**

```ts
{
  templateId: string;
  eventName: string;
  creatorUserId: string;
  globalContextInjected?: Record<string, unknown>;
}
```

**Response 201:**

```ts
{
  id: string;
  eventName: string;
  templateId: string;
  creatorId: string;
  consensusStatus: string;
}
```

### `GET /api/events/{id}`

**Query:**

```ts
{
  requesterUserId: string;
}
```

**Response 200:** detalle del evento.

### `POST /api/events/{id}/authorize`

**Body:**

```ts
{
  authorizerUserId: string;
}
```

**Response 200:**

```ts
{
  id: string;
  consensusStatus: string;
}
```

### `POST /api/events/{id}/sign`

**Body:**

```ts
{
  signerUserId: string;
  documentHashes: string[];
}
```

**Response 200:**

```ts
{
  id: string;
  consensusStatus: string;
}
```

### `POST /api/events/{id}/staging/reconcile`

**Body:**

```ts
{
  operatorUserId: string;
  declaredZones: string[];
  rows: Array<Record<string, unknown>>;
  zipBundles?: Array<Record<string, unknown>>;
}
```

**Response 200:** resultado de conciliación.

### `POST /api/events/{id}/generate`

**Body:**

```ts
{
  generatorUserId: string;
  rows: Array<Record<string, unknown>>;
  batchType?: string;
  revokedHashToReplace?: string;
}
```

**Response 201:** resultado de generación/lote.

### `POST /api/events/{id}/revoke`

**Body:**

```ts
{
  requesterUserId: string;
  hashToRevoke: string;
  idempotencyKey: string;
}
```

**Response 202:** job de revocación.

### `POST /api/events/revocations/process`

**Body:**

```ts
{
  requesterUserId: string;
  maxJobs?: number;
}
```

**Response 200:**

```ts
{
  processed: number;
  completed: number;
  failed: number;
  pending: number;
}
```

---

## 5.4 Verificación pública

### `GET /api/verify`

**Query:**

```ts
{
  folio: string;
  hash?: string;
}
```

**Response 200:** resultado de verificación por folio.

### `POST /api/verify`

**Body:**

```ts
{
  payload: Record<string, unknown>;
  merkleRoot: string;
  proof: string[];
  expectedHash?: string;
}
```

**Response 200:** resultado de verificación criptográfica.

---

## 5.5 Auditoría

### `GET /api/audits`

**Query:**

```ts
{
  requesterUserId: string;
  userId?: string;
  action?: string;
  affectedEntity?: string;
  limit?: number;
}
```

**Response 200:** listado de auditoría.

---

## 5.6 Recuperación PDF

### `POST /api/documents/{id}/recover`

**Body:**

```ts
{
  requesterUserId: string;
  reason?: string;
}
```

**Response 200:** `application/pdf` + headers forenses.

---

## 6. Seguridad frontend requerida

1. Auth.js obligatorio para sesiones de dashboard.
2. Route guards por rol y permiso.
3. Validación de entrada en formularios con esquemas tipados.
4. Sanitización de payloads rich text/variables libres.
5. Protección CSRF en mutaciones sensibles.
6. Cookies seguras (`httpOnly`, `secure`, `sameSite`).
7. Control anti doble-submit en autorizar/firmar/generar/revocar.
8. Idempotencia visual y técnica en revocación.
9. Mensajería de errores homogénea (400/403/404/409/5xx).
10. Trazabilidad de acciones sensibles (telemetría + auditoría UI).

---

## 7. Casos de uso frontend (resumen operativo)

1. CU-FE-01 Alta y consulta de usuarios con RBAC.
2. CU-FE-02 Diseño de plantilla con editor visual Craft.js.
3. CU-FE-03 Creación de evento con contexto global.
4. CU-FE-04 Autorización de evento por rol permitido.
5. CU-FE-05 Firma de evento con consenso previo.
6. CU-FE-06 Conciliación staging multizona.
7. CU-FE-07 Generación documental con folios JIT.
8. CU-FE-08 Revocación + procesamiento de cola.
9. CU-FE-09 Verificación pública de credenciales.
10. CU-FE-10 Recuperación visual PDF con permisos.
11. CU-FE-11 Auditoría operativa y forense.
12. CU-FE-12 Administración de branding institucional.

---

## 8. Plan de ejecución por iteraciones (para v0)

## Iteración A: Auth + Shell + Proxy

- Auth.js base
- layout por rol
- navegación principal
- capa BFF tipada inicial

**Definition of Done:** login funcional + rutas protegidas + consumo tipado de 2 endpoints críticos.

## Iteración B: Plantillas + Craft.js

- listado y alta de plantillas
- editor drag & drop
- persistencia `craftSchemaJson`

**Definition of Done:** crear plantilla end-to-end con preview y validaciones.

## Iteración C: Eventos + Staging + Generación

- alta de eventos
- transición autorizar/firmar
- pantalla de staging/reconcile
- generación documental

**Definition of Done:** flujo completo hasta generación en estado permitido.

## Iteración D: Revocación + Auditoría + Verify

- revocación e idempotencia
- proceso de cola
- auditoría con filtros
- portal verify público final

**Definition of Done:** validación de estados válido/revocado/alterado + trazabilidad completa.

---

## 9. Checklist de validación final

1. Cada pantalla tiene endpoint, permisos y contrato tipado.
2. Todos los flujos críticos muestran estados UX completos: loading, empty, error, success.
3. Branding institucional se aplica globalmente sin tocar código.
4. Reglas de estado de negocio restringen acciones correctamente.
5. Errores HTTP se traducen a mensajes claros por contexto.
6. Seguridad de sesión y mutaciones validada.
7. Flujo principal validado: plantilla -> evento -> autorizar -> firmar -> staging -> generar -> verify.

---

## 10. Guía rápida para v0 al recibir el repo

1. Leer primero este documento completo.
2. Tomar como verdad de contratos los route handlers de `app/api/*`.
3. Implementar en orden A -> B -> C -> D.
4. No saltar capa proxy/BFF tipada.
5. No construir acciones sin validar rol + estado del evento.
6. Mantener branding en configuración central editable.

---

## 11. Valores iniciales de branding (editable)

- Institución: Instituto Tecnológico de Sonora (ITSON)
- Sistema: Gestor Documental Institucional
- Descripción base: plataforma de orquestación documental híbrida Web2/Web3 para emisión, validación y trazabilidad de credenciales académicas.
- Ajustable en runtime desde panel de branding.
