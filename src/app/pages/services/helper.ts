let baseUrl = "http://localhost:8082/api";
export const uiUrl =
  typeof window !== 'undefined'
    ? window.location.origin
    : '';// export default baseUrl;
// let baseUrl = '/api';
export const fileBaseUrl = `${baseUrl}/api/files/private`;

export default baseUrl;
 