'use client';

import useSWR from 'swr';
import { useState } from 'react';
import { templatesApi } from '@/lib/bff/client';
import type { Template, CreateTemplateRequest, BffError } from '@/lib/types';

interface UseTemplatesOptions {
  requesterUserId: string;
}

export function useTemplates({ requesterUserId }: UseTemplatesOptions) {
  const {
    data: templates,
    error,
    isLoading,
    mutate,
  } = useSWR<Template[], BffError>(
    requesterUserId ? ['templates', requesterUserId] : null,
    () => templatesApi.list({ requesterUserId }),
    {
      revalidateOnFocus: false,
    }
  );

  return {
    templates: templates ?? [],
    isLoading,
    error,
    mutate,
  };
}

export function useCreateTemplate() {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<BffError | null>(null);

  const createTemplate = async (
    data: CreateTemplateRequest
  ): Promise<Template | null> => {
    setIsCreating(true);
    setError(null);

    try {
      const created = await templatesApi.create(data);
      return created;
    } catch (err) {
      setError(err as BffError);
      return null;
    } finally {
      setIsCreating(false);
    }
  };

  return {
    createTemplate,
    isCreating,
    error,
    clearError: () => setError(null),
  };
}
