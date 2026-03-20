import {
  BffError,
  type ListUsersRequest,
  type ListUsersResponse,
  type CreateUserRequest,
  type CreateUserResponse,
  type ListTemplatesRequest,
  type ListTemplatesResponse,
  type Template,
  type CreateTemplateRequest,
  type CreateTemplateResponse,
  type UpdateTemplateRequest,
  type UpdateTemplateResponse,
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
    credentials: 'include', // Enviar cookies de sesión al servidor
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
    const searchParams = new URLSearchParams();
    if (params.role) {
      searchParams.set('role', params.role);
    }
    const suffix = searchParams.toString();
    return apiFetch<ListUsersResponse>(`/api/proxy/users${suffix ? `?${suffix}` : ''}`);
  },

  create: async (data: CreateUserRequest): Promise<CreateUserResponse> => {
    const { requesterUserId: _, ...payload } = data;
    return apiFetch<CreateUserResponse>('/api/proxy/users', {
      method: 'POST',
      body: payload,
    });
  },
};

// ============================================
// TEMPLATES API
// ============================================

function normalizeTemplateSchema(template: Template): Template {
  const sourceSchema =
    template.fabricSchemaJson && Object.keys(template.fabricSchemaJson).length > 0
      ? template.fabricSchemaJson
      : template.craftSchemaJson;

  return {
    ...template,
    fabricSchemaJson: sourceSchema,
    craftSchemaJson: sourceSchema,
  };
}

export const templatesApi = {
  list: async (params: ListTemplatesRequest): Promise<ListTemplatesResponse> => {
    void params;
    const templates = await apiFetch<ListTemplatesResponse>('/api/proxy/templates');
    return templates.map(normalizeTemplateSchema);
  },

  create: async (data: CreateTemplateRequest): Promise<CreateTemplateResponse> => {
    const { requesterUserId: _, fabricSchemaJson, craftSchemaJson, ...rest } = data;
    const payload = {
      ...rest,
      // Contrato nuevo preferido
      fabricSchemaJson,
      // Compatibilidad con backend actual
      craftSchemaJson: craftSchemaJson ?? fabricSchemaJson,
    };

    const created = await apiFetch<CreateTemplateResponse>('/api/proxy/templates', {
      method: 'POST',
      body: payload,
    });

    return normalizeTemplateSchema(created);
  },

  update: async (data: UpdateTemplateRequest): Promise<UpdateTemplateResponse> => {
    const {
      requesterUserId: _,
      templateId,
      fabricSchemaJson,
      craftSchemaJson,
      ...rest
    } = data;

    const payload = {
      ...rest,
      fabricSchemaJson,
      craftSchemaJson: craftSchemaJson ?? fabricSchemaJson,
    };

    const updated = await apiFetch<UpdateTemplateResponse>(`/api/proxy/templates/${templateId}`, {
      method: 'PUT',
      body: payload,
    });

    return normalizeTemplateSchema(updated);
  },
};

// ============================================
// EVENTS API
// ============================================

export const eventsApi = {
  create: async (data: CreateEventRequest): Promise<CreateEventResponse> => {
    const { creatorUserId: _, ...payload } = data;
    return apiFetch<CreateEventResponse>('/api/proxy/events', {
      method: 'POST',
      body: payload,
    });
  },

  get: async (eventId: string, _requesterUserId: string): Promise<GetEventResponse> => {
    return apiFetch<GetEventResponse>(`/api/proxy/events/${eventId}`);
  },

  authorize: async (data: AuthorizeEventRequest): Promise<AuthorizeEventResponse> => {
    return apiFetch<AuthorizeEventResponse>(`/api/proxy/events/${data.eventId}/authorize`, {
      method: 'POST',
    });
  },

  sign: async (data: SignEventRequest): Promise<SignEventResponse> => {
    return apiFetch<SignEventResponse>(`/api/proxy/events/${data.eventId}/sign`, {
      method: 'POST',
      body: {
        documentHashes: data.documentHashes,
      },
    });
  },

  reconcileStaging: async (data: ReconcileStagingRequest): Promise<ReconcileStagingResponse> => {
    return apiFetch<ReconcileStagingResponse>(`/api/proxy/events/${data.eventId}/staging/reconcile`, {
      method: 'POST',
      body: {
        declaredZones: data.declaredZones,
        rows: data.rows,
        zipBundles: data.zipBundles,
      },
    });
  },

  generate: async (data: GenerateDocumentsRequest): Promise<GenerateDocumentsResponse> => {
    return apiFetch<GenerateDocumentsResponse>(`/api/proxy/events/${data.eventId}/generate`, {
      method: 'POST',
      body: {
        rows: data.rows,
        batchType: data.batchType,
        revokedHashToReplace: data.revokedHashToReplace,
      },
    });
  },

  revoke: async (data: RevokeEventRequest): Promise<RevokeEventResponse> => {
    return apiFetch<RevokeEventResponse>(`/api/proxy/events/${data.eventId}/revoke`, {
      method: 'POST',
      body: {
        hashToRevoke: data.hashToRevoke,
        idempotencyKey: data.idempotencyKey,
      },
    });
  },

  processRevocations: async (data: ProcessRevocationsRequest): Promise<ProcessRevocationsResponse> => {
    return apiFetch<ProcessRevocationsResponse>('/api/proxy/events/revocations/process', {
      method: 'POST',
      body: {
        maxJobs: data.maxJobs,
      },
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
    const searchParams = new URLSearchParams();
    if (params.userId) searchParams.set('userId', params.userId);
    if (params.action) searchParams.set('action', params.action);
    if (params.affectedEntity) searchParams.set('affectedEntity', params.affectedEntity);
    if (params.limit) searchParams.set('limit', params.limit.toString());

    const suffix = searchParams.toString();
    return apiFetch<ListAuditsResponse>(`/api/proxy/audits${suffix ? `?${suffix}` : ''}`);
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
