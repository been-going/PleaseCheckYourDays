import axios from "axios";

// Vercel에 설정된 VITE_API_URL에서 마지막 '/'가 있을 경우 제거합니다.
// 예: "http://.../" -> "http://..."
const prodUrl = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

// 환경에 따라 baseURL을 다르게 설정합니다.
// 1. 프로덕션 환경(Vercel): Vercel에 설정된 환경 변수 + /api
// 2. 개발 환경: Vite 프록시를 사용하기 위해 상대 경로인 /api로 설정
const baseURL = import.meta.env.PROD ? `${prodUrl}/api` : "/api";

// 앱 전체에서 사용할 단일 axios 인스턴스 생성
const axiosInstance = axios.create({
  baseURL,
  // 교차 출처 요청 시 쿠키를 보내도록 설정
  withCredentials: true,
});

// 응답 인터셉터를 추가하여 에러를 전역적으로 처리
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error("Axios 인터셉터에서 미인증 요청 감지.");
      // 여기서 전역적으로 로그아웃 처리를 하거나 로그인 페이지로 리디렉션 할 수 있습니다.
      // 예: if (window.location.pathname !== '/login') window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
