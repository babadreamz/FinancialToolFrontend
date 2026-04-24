import axios from "axios";

const api = axios.create({
    baseURL: "http://localhost:2001/saye/v1",
});

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("saye_token");

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// RESPONSE INTERCEPTOR (handle auth errors)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem("saye_auth");
            localStorage.removeItem("saye_token");
            localStorage.removeItem("saye_user");
            window.location.href = "/";
        }

        return Promise.reject(error);
    }
);

export default api;