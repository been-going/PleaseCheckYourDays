import { useMemo } from "react";
import * as client from "./client";

// 모든 API 함수를 포함하는 객체를 생성합니다.
const apiClient = { ...client };

/**
 * Provides a memoized API client object that includes all functions from client.ts.
 * This hook ensures that components don't re-render unnecessarily due to
 * the API object being recreated on every render.
 * By centralizing API access through this hook, we ensure all components
 * use a consistent, complete, and authenticated API client.
 */
export function useApi() {
  // useMemo를 사용하여 client 모듈의 모든 export를 포함하는 객체를 반환합니다.
  // client 모듈은 상태를 가지지 않으므로, 이 객체는 렌더링 간에 동일하게 유지됩니다.
  return useMemo(() => apiClient, []);
}
