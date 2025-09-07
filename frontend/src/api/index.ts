import { useMemo } from "react";
import * as client from "./client";

/**
 * Provides a memoized API client object that includes all functions from client.ts.
 * This hook ensures that components don't re-render unnecessarily due to
 * the API object being recreated on every render.
 * By centralizing API access through this hook, we ensure all components
 * use a consistent, complete, and authenticated API client.
 */
export const useApi = () => {
  // NOTE: The previous implementation had complex guest-mode logic which was
  // causing inconsistencies and errors. This has been simplified to always
  // return the real, full API client.
  return useMemo(() => client, []);
};
