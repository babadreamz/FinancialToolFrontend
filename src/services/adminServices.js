import api from "./api";


export const recordDeposit = async (payload) => {
    const response = await api.post("/admin/record/savings", payload);
    return response.data;
};

export const recordWithdrawal = async (payload) => {
    const response = await api.post("/admin/record/withdrawal", payload);
    return response.data;
};

export const getSavingsTransactions = async (page = 0, size = 5) => {
    const response = await api.get("/admin/transactions/all", {
        params: { page, size, sort: "createdAt,desc" },
    });
    return response.data;
};

export const cancelDeposit = async (payload) => {
    await api.put("/admin/cancel/savings", payload);
};

export const cancelWithdrawal = async (payload) => {
    await api.put("/admin/cancel/withdrawal", payload);
};

export const recordLoanDisbursement = async (payload) => {
    const response = await api.post("/admin/record/loan", payload);
    return response.data;
};

export const addCollateral = async (loanId, payload) => {
    const response = await api.post(`/admin/${loanId}/collateral`, payload);
    return response.data;
};

export const addGuarantor = async (loanId, payload) => {
    const response = await api.post(`/admin/${loanId}/guarantor`, payload);
    return response.data;
};

export const recordRepayment = async (payload) => {
    const response = await api.post("/admin/loan/repay", payload);
    return response.data;
};

export const getActiveLoans = async (page = 0, size = 10) => {
    const response = await api.get("/admin/loans/disbursed", {
        params: { page, size, sort: "createdAt,desc" },
    });
    return response.data;
};

export const getActiveInvestments = async (page = 0, size = 10) => {
    const response = await api.get("/admin/active/investments", {
        params: { page, size },
    });
    return response.data;
};
