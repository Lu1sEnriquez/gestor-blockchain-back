'use client';

import useSWR from 'swr';
import { useState } from 'react';
import { bffClient } from '@/lib/bff/client';
import type {
  Event,
  CreateEventRequest,
  GetEventResponse,
  AuthorizeEventRequest,
  SignEventRequest,
  ReconcileStagingRequest,
  GenerateDocumentsRequest,
  BffError,
} from '@/lib/types';

// Note: El backend actual no tiene endpoint GET /api/events para listar todos
// Workaround: Usamos localStorage para trackear IDs creados
const EVENTS_STORAGE_KEY = 'tracked_event_ids';

function getTrackedEventIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(EVENTS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function addTrackedEventId(id: string): void {
  if (typeof window === 'undefined') return;
  const ids = getTrackedEventIds();
  if (!ids.includes(id)) {
    ids.push(id);
    localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(ids));
  }
}

// Hook para obtener un evento individual
export function useEvent(eventId: string | null, userId: string) {
  const { data, error, isLoading, mutate } = useSWR<GetEventResponse, BffError>(
    eventId && userId ? ['event', eventId, userId] : null,
    () => bffClient.events.get(eventId!, userId),
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  );

  return {
    event: data,
    isLoading,
    error,
    mutate,
  };
}

// Hook para crear evento
export function useCreateEvent() {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createEvent = async (data: CreateEventRequest) => {
    setIsCreating(true);
    setError(null);
    try {
      const result = await bffClient.events.create(data);
      addTrackedEventId(result.id);
      return result;
    } catch (err) {
      const bffError = err as BffError;
      setError(bffError.error || 'Error al crear el evento');
      throw err;
    } finally {
      setIsCreating(false);
    }
  };

  return { createEvent, isCreating, error };
}

// Hook para acciones de transicion de estado
export function useEventActions(eventId: string, userId: string) {
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const executeAction = async <T,>(
    actionName: string,
    action: () => Promise<T>
  ): Promise<T | null> => {
    setIsLoading(actionName);
    setActionError(null);
    try {
      return await action();
    } catch (err) {
      const bffError = err as BffError;
      setActionError(bffError.error || `Error en ${actionName}`);
      return null;
    } finally {
      setIsLoading(null);
    }
  };

  const authorize = async () => {
    return executeAction('authorize', () =>
      bffClient.events.authorize({
        eventId,
        authorizerUserId: userId,
      })
    );
  };

  const sign = async (documentHashes: string[]) => {
    return executeAction('sign', () =>
      bffClient.events.sign({
        eventId,
        signerUserId: userId,
        documentHashes,
      })
    );
  };

  const reconcileStaging = async (
    declaredZones: string[],
    rows: Record<string, unknown>[],
    zipBundles?: Record<string, unknown>[]
  ) => {
    return executeAction('reconcile', () =>
      bffClient.events.reconcileStaging({
        eventId,
        operatorUserId: userId,
        declaredZones,
        rows,
        zipBundles,
      })
    );
  };

  const generate = async (
    rows: Record<string, unknown>[],
    batchType?: string,
    revokedHashToReplace?: string
  ) => {
    return executeAction('generate', () =>
      bffClient.events.generate({
        eventId,
        generatorUserId: userId,
        rows,
        batchType,
        revokedHashToReplace,
      })
    );
  };

  const revoke = async (hashToRevoke: string, idempotencyKey: string) => {
    return executeAction('revoke', () =>
      bffClient.events.revoke({
        eventId,
        requesterUserId: userId,
        hashToRevoke,
        idempotencyKey,
      })
    );
  };

  const processRevocations = async (maxJobs?: number) => {
    return executeAction('process-revocations', () =>
      bffClient.events.processRevocations({
        requesterUserId: userId,
        maxJobs,
      })
    );
  };

  return {
    authorize,
    sign,
    reconcileStaging,
    generate,
    revoke,
    processRevocations,
    isLoading,
    actionError,
    clearError: () => setActionError(null),
  };
}
