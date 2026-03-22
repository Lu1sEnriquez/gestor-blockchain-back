'use client';

import useSWR from 'swr';
import { bffClient } from '@/lib/bff/client';
import type { ListAuditsRequest, AuditLog, BffError } from '@/lib/types';

export function useAudits(params: ListAuditsRequest) {
  const { data, error, isLoading, mutate } = useSWR<AuditLog[], BffError>(
    ['audits', params],
    () => bffClient.audits.list(params),
    {
      revalidateOnFocus: false,
    }
  );

  return {
    audits: data ?? [],
    isLoading,
    error,
    mutate,
  };
}
