## Plan: Master Plan de Ejecución ITSON Web2/Web3

Construiremos el sistema en Next.js App Router + TypeScript, con arquitectura modular y límites claros por dominio. Se aplicará TDD estricto backend-first: primero datos, casos de uso, API y Web3 con cobertura alta; luego UI. Ya alineé tus decisiones clave: CU-05 solo en estado FIRMADO, sin estado STAGING nuevo, Saga con cola/reintentos para revocación, secuencias anuales por plantilla, y recuperación visual operada por Administrador/Auditor.

### 1. FASE 0: Setup y Configuración (Arquitectura base)

1. Congelar baseline técnico actual y preparar estructura modular sobre Next App Router.
2. Instalar backend core: TypeORM, pg, reflect-metadata, class-validator, class-transformer, zod.
3. Instalar testing TDD: jest, ts-jest, supertest, @types/jest, testcontainers (PostgreSQL real en integración).
4. Instalar Web3: ethers v6 y utilidades de hashing/canonicalización.
5. Inicializar shadcn/ui (solo bootstrap), mantener frontend detenido hasta cerrar backend.
6. Definir variables de entorno por ambiente: local/test/ci/staging.
7. Definir quality gate obligatorio: lint, typecheck, unit, integration, coverage.

Estructura recomendada (module-based adaptada a Next):
1. app/api para rutas REST.
2. app/(public) para verify público.
3. src/modules/<modulo>/domain, application, infrastructure, presentation.
4. src/shared para config, db, crypto, web3, errores, logger.
5. test/unit, test/integration, test/contract, test/fixtures.
6. migrations y seeds versionados.

Referencias del estado actual:
- package.json
- tsconfig.json
- app/layout.tsx
- app/page.tsx
- app/globals.css
- docs/DOCUMENTACION  SISTEMA GESTOR DOCUMENTOS INSTITUCIONAL-final.md

### 2. FASE 1: TDD Backend - Capa de Datos (TypeORM)

1. Crear entidad base auditable reutilizable con isActive, createdAt, updatedAt.
2. Modelar entidades TypeORM con clases/decoradores:
3. Usuario
4. BovedaFirma
5. PlantillaDocumental
6. EventoAcademico
7. ConsensoFirmantes
8. SecuenciaPlantilla
9. LoteEmision
10. DocumentoFolio
11. RegistroAuditoria
12. Definir enums estrictos de estado y acciones.
13. Definir constraints críticos:
14. unique correo institucional
15. unique prefijo plantilla
16. unique folio institucional
17. unique compuesto (idPlantilla, yearEmision)
18. índices por matrícula, hash, evento, estado
19. Implementar repositorios con transacciones explícitas.
20. Implementar bloqueo de fila para secuencias de folios (SELECT FOR UPDATE).
21. Crear migración inicial y migraciones incrementales.

Plan TDD de esta fase (tests primero):
1. Unit tests de defaults, enums, validaciones, relaciones.
2. Integration tests de repositorios con PostgreSQL real:
3. creación de usuario y bóveda
4. prefijo inmutable por plantilla
5. transiciones de estado permitidas/prohibidas
6. secuencia concurrente sin colisiones
7. unicidad folio/hash
8. Pruebas de concurrencia con múltiples workers para no duplicados/no saltos.
9. Pruebas de auditoría con snapshot obligatorio.
10. Criterio de salida: capa de datos 100% verde + cobertura mínima recomendada >= 85%, invariantes críticas cubiertas al 100%.

### 3. FASE 2: TDD Backend - Lógica de Negocio y Web3

Casos de uso críticos:
1. Gestión RBAC granular y permisos atómicos.
2. Diseño de plantilla y contexto global.
3. Flujo de estados: PENDIENTE → AUTORIZADO → FIRMADO → COMPLETADO / RECHAZADO.
4. CU-05 carga masiva y conciliación multizona habilitada solo en FIRMADO.
5. Generación documental y asignación JIT de folios.
6. Data Hashing:
7. canonicalización determinística del payload JSON
8. SHA-256
9. Merkle Tree y proofs por documento
10. Notarización Web3 con ethers v6:
11. anchorMerkleRoot
12. revokeHash
13. Validación pública verify con re-hashing y verificación de revocación.

Consistencia BD + Blockchain:
1. Patrón Saga con cola persistente.
2. Reintentos exponenciales e idempotencia.
3. Estados de procesamiento on-chain y reconciliación.
4. Registro forense en auditoría para cada paso.

Diseño API REST (consumida por frontend):
1. auth/usuarios/permisos
2. plantillas
3. eventos y estados
4. staging/conciliación
5. generación/lotes/documentos
6. revocación/complementaria
7. verify pública
8. auditoría

Plan TDD de esta fase:
1. Unit tests por caso de uso con mocks/adapters.
2. Integration tests API con Supertest.
3. Integration tests transaccionales multi-entidad con PostgreSQL real.
4. Contract tests Web3 con provider mock y smoke opcional en testnet Polygon.
5. Pruebas negativas obligatorias: estado inválido, hash revocado, proof inválida, caída RPC, colisión de folio.
6. Criterio de salida: backend funcional extremo a extremo sin UI y trazabilidad RF/RNF/CU validada.

### 4. FASE 3: Frontend - UI y Craft.js

1. Construir shell por rol con shadcn/ui.
2. Implementar módulos:
3. administración de usuarios/roles
4. plantillas
5. eventos/consenso
6. auditoría/histórico
7. portal verify público
8. Implementar editor de plantillas con Craft.js:
9. drag and drop
10. bloques permitidos
11. binding de variables de contexto global y de fila
12. preview con datos mock y versionado de esquema
13. Implementar Staging Area:
14. carga xlsx/csv
15. carga de múltiples zip por zona
16. conciliación por matrícula
17. datagrid con errores y edición quirúrgica
18. bloqueo de avance hasta validación total
19. Integrar cliente API tipado y manejo uniforme de errores.
20. Pruebas UI: unit de componentes críticos + smoke end-to-end de flujos clave.

### 5. Verificación transversal del plan

1. Pipeline local completo en verde en cada fase.
2. Pruebas de concurrencia reales para secuencias por plantilla/año.
3. Prueba completa: crear → autorizar → firmar → cargar/conciliar → generar → anclar root.
4. Prueba CU-12: revocar + emitir complementario con nuevo folio/hash/root.
5. Prueba CU-13: verify en estados válido, revocado y alterado.
6. Validar latencias RNF (verify y descarga).

---

## Lista de archivos de apoyo (contenido exacto solicitado)

### A. Contenido exacto para el archivo de configuración de Jest (jest.config.js)

Línea 1: const nextJest = require('next/jest');
Línea 2: 
Línea 3: const createJestConfig = nextJest({
Línea 4:   dir: './',
Línea 5: });
Línea 6: 
Línea 7: const customJestConfig = {
Línea 8:   testEnvironment: 'node',
Línea 9:   clearMocks: true,
Línea 10:   collectCoverage: true,
Línea 11:   coverageDirectory: 'coverage',
Línea 12:   collectCoverageFrom: [
Línea 13:     'src/**/*.{ts,tsx}',
Línea 14:     'app/api/**/*.{ts,tsx}',
Línea 15:     '!**/*.d.ts',
Línea 16:     '!**/node_modules/**',
Línea 17:     '!**/.next/**'
Línea 18:   ],
Línea 19:   moduleNameMapper: {
Línea 20:     '^@/(.*)$': '<rootDir>/$1'
Línea 21:   },
Línea 22:   setupFilesAfterEnv: [],
Línea 23:   testMatch: [
Línea 24:     '<rootDir>/test/**/*.test.ts',
Línea 25:     '<rootDir>/src/**/*.test.ts'
Línea 26:   ],
Línea 27:   transform: {
Línea 28:     '^.+\.(ts|tsx)$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }]
Línea 29:   },
Línea 30:   testPathIgnorePatterns: ['/node_modules/', '/.next/']
Línea 31: };
Línea 32: 
Línea 33: module.exports = createJestConfig(customJestConfig);

### B. Contenido exacto recomendado para tsconfig.json

Línea 1: {
Línea 2:   "compilerOptions": {
Línea 3:     "target": "ES2022",
Línea 4:     "lib": ["dom", "dom.iterable", "es2022"],
Línea 5:     "allowJs": false,
Línea 6:     "skipLibCheck": true,
Línea 7:     "strict": true,
Línea 8:     "noEmit": true,
Línea 9:     "esModuleInterop": true,
Línea 10:     "module": "esnext",
Línea 11:     "moduleResolution": "bundler",
Línea 12:     "resolveJsonModule": true,
Línea 13:     "isolatedModules": true,
Línea 14:     "jsx": "preserve",
Línea 15:     "incremental": true,
Línea 16:     "plugins": [{ "name": "next" }],
Línea 17:     "baseUrl": ".",
Línea 18:     "paths": {
Línea 19:       "@/*": ["./*"]
Línea 20:     },
Línea 21:     "experimentalDecorators": true,
Línea 22:     "emitDecoratorMetadata": true,
Línea 23:     "types": ["node", "jest"]
Línea 24:   },
Línea 25:   "include": [
Línea 26:     "next-env.d.ts",
Línea 27:     "**/*.ts",
Línea 28:     "**/*.tsx",
Línea 29:     ".next/types/**/*.ts"
Línea 30:   ],
Línea 31:   "exclude": ["node_modules"]
Línea 32: }

### C. Entidad base TypeORM para herencia universal de auditoría

Línea 1: import { BaseEntity, CreateDateColumn, UpdateDateColumn, Column } from 'typeorm';
Línea 2: 
Línea 3: export abstract class AuditableEntity extends BaseEntity {
Línea 4:   @Column({ type: 'boolean', default: true })
Línea 5:   isActive!: boolean;
Línea 6: 
Línea 7:   @CreateDateColumn({ type: 'timestamptz' })
Línea 8:   createdAt!: Date;
Línea 9: 
Línea 10:   @UpdateDateColumn({ type: 'timestamptz' })
Línea 11:   updatedAt!: Date;
Línea 12: }

---

Plan persistido en memoria de sesión: /memories/session/plan.md

Siguiente paso natural:
1. Si te parece bien, en tu siguiente mensaje arrancamos Fase 0 con checklist TDD y comandos exactos de instalación/configuración.
