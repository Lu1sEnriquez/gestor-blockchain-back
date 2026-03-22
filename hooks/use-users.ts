'use client';

import { useState } from 'react';
import useSWR from 'swr';

import { usersApi } from '@/lib/bff/client';
import type { BffError, CreateUserRequest, User, UserRole } from '@/lib/types';

interface UseUsersOptions {
  requesterUserId: string;
  role?: UserRole;
}

export function useUsers({ requesterUserId, role }: UseUsersOptions) {
  const { data, error, isLoading, mutate } = useSWR<User[], BffError>(
    requesterUserId ? ['users', requesterUserId, role] : null,
    () => usersApi.list({ requesterUserId, role }),
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    },
  );

  return {
    users: data ?? [],
    error,
    isLoading,
    mutate,
  };
}

export function useCreateUser() {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createUser = async (payload: CreateUserRequest) => {
    setIsCreating(true);
    setError(null);

    try {
      return await usersApi.create(payload);
    } catch (err) {
      const bffError = err as BffError;
      setError(bffError.error || 'Error al crear usuario');
      throw err;
    } finally {
      setIsCreating(false);
    }
  };

  return {
    createUser,
    isCreating,
    error,
    clearError: () => setError(null),
  };
}
