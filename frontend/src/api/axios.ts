import axios from "axios";

// 앱 전체에서 사용할 단일 axios 인스턴스 생성
const axiosInstance = axios.create({
  // 백엔드 API의 기본 URL을 설정합니다.
  baseURL: `${import.meta.env.VITE_API_URL || "http://localhost:4001"}/api`,
  // 교차 출처 요청 시 쿠키를 보내도록 설정
  withCredentials: true,
});

// 응답 인터셉터를 추가하여 에러를 전역적으로 처리
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error("Axios 인터셉터에서 미인증 요청 감지.");
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
