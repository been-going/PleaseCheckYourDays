import axios from "axios";

// 개발(Vite 프록시) 및 프로덕션(Vercel 프록시) 환경 모두에서
// 상대 경로 '/api'를 사용하도록 baseURL을 고정합니다.
const baseURL = "/api";

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
