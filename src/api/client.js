// api/client.js
import axios from "axios";
import { API_URL } from "../constants/config";
import { getToken } from "../storage/token";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

/*
|--------------------------------------------------------------------------
| Request Interceptor — Attach Bearer Token Automatically
|--------------------------------------------------------------------------
| Reads the token from secure storage before EVERY request and sets the
| `Authorization` header if a token exists. No screen needs to do this.
*/
api.interceptors.request.use(
  async (config) => {
    const token = await getToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

/*
|--------------------------------------------------------------------------
| Optional: Response Interceptor — Handle 401 Globally
|--------------------------------------------------------------------------
| If any request comes back 401, we can broadcast a "session expired" event
| so the app can log the user out and redirect to login.
*/
// api.interceptors.response.use(
//   (response) => response,
//   (error) => {
//     if (error.response?.status === 401) {
//       // TODO: emit logout event
//     }
//     return Promise.reject(error);
//   }
// );

export default api;