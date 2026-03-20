// ============================================
// ENUMS - Sincronizados con backend
// ============================================

export const UserRole = {
  ADMIN: 'ADMIN',
  CREATOR: 'CREATOR',
  SIGNER: 'SIGNER',
  AUDITOR: 'AUDITOR',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const EventStatus = {
  PENDING: 'PENDIENTE',
  AUTHORIZED: 'AUTORIZADO',
  SIGNED: 'FIRMADO',
  COMPLETED: 'COMPLETADO',
  REJECTED: 'RECHAZADO',
} as const;

export type EventStatus = (typeof EventStatus)[keyof typeof EventStatus];

// ============================================
// API ERROR TYPES
// ============================================

export interface ApiError {
  error: string;
  code?: string;
  statusCode: number;
}

export class BffError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly error: string,
    public readonly code?: string
  ) {
    super(error);
    this.name = 'BffError';
  }

  static fromResponse(statusCode: number, body: { error?: string; code?: string }): BffError {
    return new BffError(statusCode, body.error ?? 'Error desconocido', body.code);
  }

  get isNotFound(): boolean {
    return this.statusCode === 404;
  }

  get isForbidden(): boolean {
    return this.statusCode === 403;
  }

  get isConflict(): boolean {
    return this.statusCode === 409;
  }

  get isValidation(): boolean {
    return this.statusCode === 400;
  }
}

// ============================================
// USER CONTRACTS
// ============================================

export interface User {
  id: string;
  fullName: string;
  institutionalEmail: string;
  rolesAssigned: UserRole[];
  officialPosition: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListUsersRequest {
  requesterUserId: string;
  role?: UserRole;
}

export type ListUsersResponse = User[];

export interface CreateUserRequest {
  requesterUserId: string;
  fullName: string;
  institutionalEmail: string;
  rolesAssigned: UserRole[];
  officialPosition: string;
  signaturePngUrl: string;
}

export type CreateUserResponse = User;

// ============================================
// TEMPLATE CONTRACTS
// ============================================

export interface Template {
  id: string;
  templateName: string;
  folioPrefix: string;
  fabricSchemaJson: Record<string, unknown>;
  // Compatibilidad temporal durante la transición backend
  craftSchemaJson: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ListTemplatesRequest {
  requesterUserId: string;
}

export type ListTemplatesResponse = Template[];

export interface CreateTemplateRequest {
  requesterUserId: string;
  templateName: string;
  folioPrefix: string;
  fabricSchemaJson: Record<string, unknown>;
  // Compatibilidad temporal durante la transición backend
  craftSchemaJson: Record<string, unknown>;
}

export type CreateTemplateResponse = Template;

export interface UpdateTemplateRequest {
  requesterUserId: string;
  templateId: string;
  templateName?: string;
  folioPrefix?: string;
  fabricSchemaJson: Record<string, unknown>;
  craftSchemaJson?: Record<string, unknown>;
}

export type UpdateTemplateResponse = Template;

// ============================================
// EVENT CONTRACTS
// ============================================

export interface Event {
  id: string;
  eventName: string;
  templateId: string;
  creatorId: string;
  consensusStatus: EventStatus;
  globalContextInjected?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEventRequest {
  templateId: string;
  eventName: string;
  creatorUserId: string;
  globalContextInjected?: Record<string, unknown>;
}

export interface CreateEventResponse {
  id: string;
  eventName: string;
  templateId: string;
  creatorId: string;
  consensusStatus: EventStatus;
}

export interface GetEventRequest {
  eventId: string;
  requesterUserId: string;
}

export type GetEventResponse = Event & {
  template?: Template;
  signerConsensus?: SignerConsensus[];
};

export interface SignerConsensus {
  userId: string;
  userFullName: string;
  signedAt: string | null;
}

export interface AuthorizeEventRequest {
  eventId: string;
  authorizerUserId: string;
}

export interface AuthorizeEventResponse {
  id: string;
  consensusStatus: EventStatus;
}

export interface SignEventRequest {
  eventId: string;
  signerUserId: string;
  documentHashes: string[];
}

export interface SignEventResponse {
  id: string;
  consensusStatus: EventStatus;
}

export interface ReconcileStagingRequest {
  eventId: string;
  operatorUserId: string;
  declaredZones: string[];
  rows: Record<string, unknown>[];
  zipBundles?: Record<string, unknown>[];
}

export interface ReconcileStagingResponse {
  valid: boolean;
  errors: Array<{ row: number; field: string; message: string }>;
  reconciledCount: number;
}

export interface GenerateDocumentsRequest {
  eventId: string;
  generatorUserId: string;
  rows: Record<string, unknown>[];
  batchType?: string;
  revokedHashToReplace?: string;
}

export interface GenerateDocumentsResponse {
  batchId: string;
  generatedCount: number;
  folios: string[];
}

export interface RevokeEventRequest {
  eventId: string;
  requesterUserId: string;
  hashToRevoke: string;
  idempotencyKey: string;
}

export interface RevokeEventResponse {
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
}

export interface ProcessRevocationsRequest {
  requesterUserId: string;
  maxJobs?: number;
}

export interface ProcessRevocationsResponse {
  processed: number;
  completed: number;
  failed: number;
  pending: number;
}

// ============================================
// VERIFY CONTRACTS
// ============================================

export interface VerifyByFolioRequest {
  folio: string;
  hash?: string;
}

export interface VerifyByProofRequest {
  payload: Record<string, unknown>;
  merkleRoot: string;
  proof: string[];
  expectedHash?: string;
}

export type VerifyStatus = 'VALID' | 'REVOKED' | 'ALTERED' | 'NOT_FOUND';

export interface VerifyResponse {
  status: VerifyStatus;
  institutionalFolio?: string;
  documentHash?: string;
  merkleRoot?: string;
  isOnChain?: boolean;
  message: string;
}

// ============================================
// AUDIT CONTRACTS
// ============================================

export interface AuditLog {
  id: string;
  userId: string;
  userFullName: string;
  action: string;
  affectedEntity: string;
  affectedEntityId: string;
  snapshot?: Record<string, unknown>;
  createdAt: string;
}

export interface ListAuditsRequest {
  requesterUserId: string;
  userId?: string;
  action?: string;
  affectedEntity?: string;
  limit?: number;
}

export type ListAuditsResponse = AuditLog[];

// ============================================
// DOCUMENT RECOVERY
// ============================================

export interface RecoverDocumentRequest {
  documentId: string;
  requesterUserId: string;
  reason?: string;
}
