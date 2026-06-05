import React, { createContext, useContext } from "react";
import { useGetMe, useLogin, useLogout, useRegister, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";

type AuthContextType = {
  user: any;
  isLoading: boolean;
  login: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  register: (data: any) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const { data, isLoading, refetch } = useGetMe({
    query: { queryKey: getGetMeQueryKey(), retry: false }
  });

  const loginMutation = useLogin();
  const logoutMutation = useLogout();
  const registerMutation = useRegister();

  const login = async (credentials: any) => {
    await loginMutation.mutateAsync({ data: credentials });
    await refetch();
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
    queryClient.setQueryData(getGetMeQueryKey(), null);
    setLocation("/login");
  };

  const register = async (userData: any) => {
    await registerMutation.mutateAsync({ data: userData });
    await refetch();
  };

  return (
    <AuthContext.Provider value={{ user: (data as any) || null, isLoading, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}