import api from "./api";

export const loginAdmin = async (loginData) => {
    const response = await api.post("/auth/login", loginData);
    return response.data;
};

export const logoutAdmin = async () => {
    const response = await api.delete("/admin/logout");
    return response.data;
};