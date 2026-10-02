import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "../lib/adminApi";
import type { AdminIdentity } from "../lib/adminApi";

export const adminSessionQueryKey = ["admin", "session"] as const;

export async function login(email: string, password: string): Promise<AdminIdentity> {
  const response = await adminApi.login({ email, password });
  return response.admin;
}

export async function logout(): Promise<void> {
  await adminApi.logout();
}

export async function getMe(): Promise<AdminIdentity> {
  const response = await adminApi.me();
  return response.admin;
}

export function useAdminSession() {
  return useQuery({
    queryKey: adminSessionQueryKey,
    queryFn: getMe,
    retry: false
  });
}

export function useAdminLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) => login(email, password),
    onSuccess(admin) {
      queryClient.setQueryData(adminSessionQueryKey, admin);
    }
  });
}

export function useAdminLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logout,
    onSettled() {
      queryClient.removeQueries({ queryKey: adminSessionQueryKey });
    }
  });
}
