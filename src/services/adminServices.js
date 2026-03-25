import api from "./api";

export const recordSavings = async (payload) => {
    const response = await api.post("/admin/record/savings", payload);
    return response.data;
};

export const getActiveLoans = async () => {
    const response = await api.get("/admin/loans/disbursed");
    return response.data;
};

export const getActiveInvestments = async () => {
    const response = await api.get("/admin/active/investments");
    return response.data;
};