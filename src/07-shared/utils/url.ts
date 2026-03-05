/**
 * QR 코드 결과 문자열에서 유효한 토큰 값만 추출함
 * URL 형태인 경우 검색 파라미터(token) 또는 경로에서 추출하고, 일반 문자열인 경우 그대로 반환함
 */
const extractToken = (rawString: string): string | null => {
  try {
    const url = new URL(rawString);

    // URL에 token 쿼리 파라미터가 있는 경우 우선적으로 추출함
    const tokenParam = url.searchParams.get('token');
    if (tokenParam) {
      return tokenParam;
    }

    // 쿼리 파라미터가 없다면 URL 경로의 마지막 부분을 토큰으로 간주하여 추출함
    const pathSegments = url.pathname.split('/').filter(Boolean);
    if (pathSegments.length > 0) {
      return pathSegments[pathSegments.length - 1];
    }

    return null;
  } catch {
    // URL 파싱 에러 발생 시, 입력된 원본 문자열의 공백을 제거하여 토큰으로 취급 및 반환함
    const trimmedString = rawString.trim();
    return trimmedString || null;
  }
};

export default extractToken;
