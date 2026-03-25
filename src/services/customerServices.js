import api from "./api";

export const registerSaver = async (saverData) => {
    const response = await api.post("/customer/register", saverData);
    return response.data;
};
export const addNextOfKin = async (payload) => {
    const response = await api.post("/customer/add/nextofkin", payload);
    return response.data;
};

export const getActiveCustomers = async () => {
    const response = await api.get("/customer/all/active");
    return response.data;
};