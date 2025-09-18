import { createContext, useContext, useMemo, ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApi } from "../api";
import type { User } from "../api/client";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const api = useApi();
  const queryClient = useQueryClient();

  // /me 엔드포인트에서 사용자 정보를 가져옵니다.
  // 이 쿼리가 인증 상태의 유일한 진실 공급원(Single Source of Truth)이 됩니다.
  const { data, isLoading, isError } = useQuery({
    queryKey: ["me"],
    queryFn: () => api.getMe(),
    retry: (failureCount, error: any) => {
      // 401 Unauthorized 에러 발생 시 재시도하지 않습니다.
      if (error?.response?.status === 401) {
        return false;
      }
      // 그 외 네트워크 에러 등은 3번까지 재시도합니다.
      return failureCount < 3;
    },
    staleTime: Infinity, // 한 번 가져온 사용자 정보는 절대 오래된(stale) 데이터로 간주하지 않음
    gcTime: Infinity, // 캐시에서 절대 삭제하지 않음
  });

  const logoutMutation = useMutation({
    mutationFn: api.logout,
    onSuccess: () => {
      // 로그아웃 성공 시, 모든 쿼리 캐시를 지우고 로그인 페이지로 이동합니다.
      queryClient.clear();
      // 페이지를 새로고침하여 모든 상태를 초기화하는 것이 가장 간단하고 확실한 방법입니다.
      window.location.href = "/login";
    },
  });

  const authContextValue = useMemo(
    () => ({
      user: data?.user ?? null,
      // 쿼리가 성공하고 user 데이터가 있으면 인증된 상태입니다.
      isAuthenticated: !isError && !!data?.user,
      // 초기 사용자 정보 로딩 중일 때 isAuthLoading은 true가 됩니다.
      isAuthLoading: isLoading,
      logout: () => logoutMutation.mutate(),
    }),
    [data, isLoading, isError, logoutMutation]
  );

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
