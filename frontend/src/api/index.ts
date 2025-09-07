import { useAuth } from '../context/AuthContext';
import * as realApi from './client';
import { guestStoreApi } from './guestStore';

// The guest API doesn't implement all functions, so we fall back to the real API.
// In a real scenario, the guest API should be more complete or handle the missing functions gracefully.
const guestApi = {
  ...realApi,
  ...guestStoreApi,
};

export const useApi = () => {
  const { isGuest } = useAuth();
  return isGuest ? guestApi : realApi;
};
