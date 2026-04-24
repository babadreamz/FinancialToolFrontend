import api from "./api";

export const registerSaver = async (saverData) => {
    const response = await api.post("/customer/register", saverData);
    return response.data;
};

export const addNextOfKin = async (payload) => {
    const response = await api.post("/customer/add/nextofkin", payload);
    return response.data;
};
export const getActiveCustomers = async (page = 0, size = 10) => {
    const response = await api.get("/customer/all/active", {
        params: { page, size, sort: "createdAt,desc" },
    });
    return response.data;
};