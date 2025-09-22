import { isAxiosError } from "axios";

/**
 * 다양한 타입의 에러 객체에서 사용자에게 보여줄 에러 메시지를 추출합니다.
 * 1. Axios 에러의 경우, 백엔드에서 보낸 응답 메시지를 우선적으로 사용합니다.
 * 2. 일반 Error 객체의 경우, 해당 객체의 메시지를 사용합니다.
 * 3. 그 외의 경우, 일반적인 에러 메시지를 반환합니다.
 * @param error 알 수 없는 타입의 에러 객체
 * @returns 사용자에게 표시할 에러 메시지 문자열
 */
export function getErrorMessage(error: unknown): string {
  if (isAxiosError(error) && error.response?.data?.message) {
    return error.response.data.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "알 수 없는 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
}
