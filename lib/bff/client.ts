import {
  BffError,
  type ListUsersRequest,
  type ListUsersResponse,
  type CreateUserRequest,
  type CreateUserResponse,
  type ListTemplatesRequest,
  type ListTemplatesResponse,
  type CreateTemplateRequest,
  type CreateTemplateResponse,
  type CreateEventRequest,
  type CreateEventResponse,
  type GetEventResponse,
  type AuthorizeEventRequest,
  type AuthorizeEventResponse,
  type SignEventRequest,
  type SignEventResponse,
  type ReconcileStagingRequest,
  type ReconcileStagingResponse,
  type GenerateDocumentsRequest,
  type GenerateDocumentsResponse,
  type RevokeEventRequest,
  type RevokeEventResponse,
  type ProcessRevocationsRequest,
  type ProcessRevocationsResponse,
  type VerifyByFolioRequest,
  type VerifyByProofRequest,
  type VerifyResponse,
  type ListAuditsRequest,
  type ListAuditsResponse,
} from '@/lib/types';

// ============================================
// BASE FETCH WRAPPER
// ============================================

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

interface FetchOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
}

async function apiFetch<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { body, headers: customHeaders, ...rest } = options;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...customHeaders,
  };

  const config: RequestInit = {
    ...rest,
    headers,
  };

  if (body !== undefined) {
    config.body = JSON.stringify(body);
  }

  const url = `${BASE_URL}${endpoint}`;

  const response = await fetch(url, config);

  if (!response.ok) {
    let errorBody: { error?: string; code?: string } = {};
    try {
      errorBody = await response.json();
    } catch {
      errorBody = { error: response.statusText };
    }
    throw BffError.fromResponse(response.status, errorBody);
  }

  // Handle empty responses (204, etc.)
  const contentType = response.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    return {} as T;
  }

  return response.json();
}

// ============================================
// USERS API
// ============================================

export const usersApi = {
  list: async (params: ListUsersRequest): Promise<ListUsersResponse> => {
    const searchParams = new URLSearchParams({
      requesterUserId: params.requesterUserId,
    });
    if (params.role) {
      searchParams.set('role', params.role);
    }
    return apiFetch<ListUsersResponse>(`/api/users?${searchParams.toString()}`);
  },

  create: async (data: CreateUserRequest): Promise<CreateUserResponse> => {
    return apiFetch<CreateUserResponse>('/api/users', {
      method: 'POST',
      body: data,
    });
  },
};

// ============================================
// TEMPLATES API
// ============================================

export const templatesApi = {
  list: async (params: ListTemplatesRequest): Promise<ListTemplatesResponse> => {
    const searchParams = new URLSearchParams({
      requesterUserId: params.requesterUserId,
    });
    return apiFetch<ListTemplatesResponse>(`/api/templates?${searchParams.toString()}`);
  },

  create: async (data: CreateTemplateRequest): Promise<CreateTemplateResponse> => {
    return apiFetch<CreateTemplateResponse>('/api/templates', {
      method: 'POST',
      body: data,
    });
  },
};

// ============================================
// EVENTS API
// ============================================

export const eventsApi = {
  create: async (data: CreateEventRequest): Promise<CreateEventResponse> => {
    return apiFetch<CreateEventResponse>('/api/events', {
      method: 'POST',
      body: data,
    });
  },

  get: async (eventId: string, requesterUserId: string): Promise<GetEventResponse> => {
    const searchParams = new URLSearchParams({ requesterUserId });
    return apiFetch<GetEventResponse>(`/api/events/${eventId}?${searchParams.toString()}`);
  },

  authorize: async (data: AuthorizeEventRequest): Promise<AuthorizeEventResponse> => {
    return apiFetch<AuthorizeEventResponse>(`/api/events/${data.eventId}/authorize`, {
      method: 'POST',
      body: { authorizerUserId: data.authorizerUserId },
    });
  },

  sign: async (data: SignEventRequest): Promise<SignEventResponse> => {
    return apiFetch<SignEventResponse>(`/api/events/${data.eventId}/sign`, {
      method: 'POST',
      body: {
        signerUserId: data.signerUserId,
        documentHashes: data.documentHashes,
      },
    });
  },

  reconcileStaging: async (data: ReconcileStagingRequest): Promise<ReconcileStagingResponse> => {
    return apiFetch<ReconcileStagingResponse>(`/api/events/${data.eventId}/staging/reconcile`, {
      method: 'POST',
      body: {
        operatorUserId: data.operatorUserId,
        declaredZones: data.declaredZones,
        rows: data.rows,
        zipBundles: data.zipBundles,
      },
    });
  },

  generate: async (data: GenerateDocumentsRequest): Promise<GenerateDocumentsResponse> => {
    return apiFetch<GenerateDocumentsResponse>(`/api/events/${data.eventId}/generate`, {
      method: 'POST',
      body: {
        generatorUserId: data.generatorUserId,
        rows: data.rows,
        batchType: data.batchType,
        revokedHashToReplace: data.revokedHashToReplace,
      },
    });
  },

  revoke: async (data: RevokeEventRequest): Promise<RevokeEventResponse> => {
    return apiFetch<RevokeEventResponse>(`/api/events/${data.eventId}/revoke`, {
      method: 'POST',
      body: {
        requesterUserId: data.requesterUserId,
        hashToRevoke: data.hashToRevoke,
        idempotencyKey: data.idempotencyKey,
      },
    });
  },

  processRevocations: async (data: ProcessRevocationsRequest): Promise<ProcessRevocationsResponse> => {
    return apiFetch<ProcessRevocationsResponse>('/api/events/revocations/process', {
      method: 'POST',
      body: data,
    });
  },
};

// ============================================
// VERIFY API
// ============================================

export const verifyApi = {
  byFolio: async (params: VerifyByFolioRequest): Promise<VerifyResponse> => {
    const searchParams = new URLSearchParams({ folio: params.folio });
    if (params.hash) {
      searchParams.set('hash', params.hash);
    }
    return apiFetch<VerifyResponse>(`/api/verify?${searchParams.toString()}`);
  },

  byProof: async (data: VerifyByProofRequest): Promise<VerifyResponse> => {
    return apiFetch<VerifyResponse>('/api/verify', {
      method: 'POST',
      body: data,
    });
  },
};

// ============================================
// AUDITS API
// ============================================

export const auditsApi = {
  list: async (params: ListAuditsRequest): Promise<ListAuditsResponse> => {
    const searchParams = new URLSearchParams({
      requesterUserId: params.requesterUserId,
    });
    if (params.userId) searchParams.set('userId', params.userId);
    if (params.action) searchParams.set('action', params.action);
    if (params.affectedEntity) searchParams.set('affectedEntity', params.affectedEntity);
    if (params.limit) searchParams.set('limit', params.limit.toString());

    return apiFetch<ListAuditsResponse>(`/api/audits?${searchParams.toString()}`);
  },
};

// ============================================
// DOCUMENTS API
// ============================================

export const documentsApi = {
  recover: async (documentId: string, requesterUserId: string, reason?: string): Promise<Blob> => {
    const response = await fetch(`${BASE_URL}/api/documents/${documentId}/recover`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requesterUserId, reason }),
    });

    if (!response.ok) {
      let errorBody: { error?: string } = {};
      try {
        errorBody = await response.json();
      } catch {
        errorBody = { error: response.statusText };
      }
      throw BffError.fromResponse(response.status, errorBody);
    }

    return response.blob();
  },
};

// ============================================
// UNIFIED CLIENT EXPORT
// ============================================

export const bffClient = {
  users: usersApi,
  templates: templatesApi,
  events: eventsApi,
  verify: verifyApi,
  audits: auditsApi,
  documents: documentsApi,
};

export default bffClient;
