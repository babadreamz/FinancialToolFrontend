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
export const cancelLoanDisbursement = async (payload) => {
    await api.put("/admin/cancel/disbursement", payload);
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
export const cancelLoanRepayments = async (payload) => {
    await api.put("/admin/cancel/repayment", payload);
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
export const registerInvestor = async (payload) => {
    const response = await api.post("/admin/register/investor", payload);
    return response.data;
};
export const recordInvestment = async (payload) => {
    const response = await api.post("/admin/record/investment", payload);
    return response.data;
};
export const cancelInvestment = async (payload) => {
    await api.put("/admin/cancel/investment", payload);
};
export const recordInvestmentReturn = async (payload) => {
    const response = await api.post("/admin/record/return", payload);
    return response.data;
};
export const cancelInvestmentReturn = async (payload) => {
    await api.put("/admin/cancel/return", payload);
};
export const getActiveInvestors = async () => {
    const response = await api.get("/admin/investors/all");
    return response.data;
};
export const getReturnsOnInvestment = async (investmentId) => {
    const response = await api.get(`/admin/${investmentId}/returns/all`);
    return response.data;
};

export const generateStatementPdf = async (customerId, startDate, endDate) => {
    const response = await api.get("/admin/customer/statement/pdf", {
        params: { customerId, startDate, endDate },
        responseType: "blob",
    });
    return response.data;
};
export const sendStatementWhatsApp = async (customerId, startDate, endDate) => {
    await api.post("/admin/customer/statement/send-whatsapp", null, {
        params: { customerId, startDate, endDate },
    });
};
export const sendMonthlyStatementToAll = async () => {
    const response = await api.post("/admin/customer/statement/send-whatsapp/all");
    return response.data;
};