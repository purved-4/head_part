<<<<<<< HEAD
let baseUrl = "http://localhost:8082/api";
=======
// let baseUrl = "http://localhost:8082/api";
>>>>>>> 9621ef083ab3271219b50ee64ac33205c7bda65c
export const uiUrl =
  typeof window !== 'undefined'
    ? window.location.origin
    : '';// export default baseUrl;
// let baseUrl = '/api';
export const fileBaseUrl = `${baseUrl}/api/files/private`;

export default baseUrl;


 