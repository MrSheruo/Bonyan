"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  getMe,
  loginUser,
  logoutUser,
  registerUser,
  type LoginInput,
  type RegisterInput,
  type User,
} from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";

export const ME_QUERY_KEY = ["me"] as const;

export function useMe() {
  return useQuery<User | null, ApiError | Error>({
    queryKey: ME_QUERY_KEY,
    queryFn: getMe,
    staleTime: 1000 * 60 * 5,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status === 401) {
        return false;
      }
      return failureCount < 2;
    },
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (data: LoginInput) => loginUser(data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY });
      router.push("/");
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 409) {
        queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY });
        router.push("/");
      }
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (data: RegisterInput) => registerUser(data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY });
      router.push("/");
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 409) {
        queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY });
        router.push("/");
      }
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: () => logoutUser(),
    onSuccess: async () => {
      queryClient.setQueryData(ME_QUERY_KEY, null);
      await queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY });
      router.push("/login");
    },
  });
}

export function useUser() {
  const meQuery = useMe();
  const logoutMutation = useLogout();

  const user = meQuery.data ?? null;
  const isLoading = meQuery.isLoading;
  const isAuthenticated = Boolean(user);

  return {
    user,
    isLoading,
    isAuthenticated,
    error: meQuery.error,
    refetch: meQuery.refetch,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
  };
}
