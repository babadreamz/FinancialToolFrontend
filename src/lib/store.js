
export const initialData = {
    savers: [
        { id: 1, name: "John Doe", phone: "0712345678", balance: 25000, status: "active", createdAt: "2024-01-15" },
        { id: 2, name: "Jane Smith", phone: "0723456789", balance: 50000, status: "active", createdAt: "2024-02-20" },
        { id: 3, name: "Mike Johnson", phone: "0734567890", balance: 15000, status: "active", createdAt: "2024-03-10" },
        { id: 4, name: "Sarah Williams", phone: "0745678901", balance: 75000, status: "active", createdAt: "2024-01-25" },
    ],
    savingsRecords: [
        { id: 1, saverId: 1, type: "deposit", amount: 10000, date: "2024-03-01", cancelled: false },
        { id: 2, saverId: 1, type: "deposit", amount: 15000, date: "2024-03-15", cancelled: false },
        { id: 3, saverId: 2, type: "deposit", amount: 50000, date: "2024-02-20", cancelled: false },
        { id: 4, saverId: 3, type: "withdrawal", amount: 5000, date: "2024-03-20", cancelled: true },
        { id: 5, saverId: 3, type: "deposit", amount: 20000, date: "2024-03-10", cancelled: false },
        { id: 6, saverId: 4, type: "deposit", amount: 75000, date: "2024-01-25", cancelled: false },
    ],
    loans: [
        { id: 1, borrowerId: 1, borrowerName: "John Doe", amount: 100000, interest: 10, balance: 80000, status: "active", disbursementDate: "2024-02-01", endDate: "2024-08-01" },
        { id: 2, borrowerId: 2, borrowerName: "Jane Smith", amount: 50000, interest: 10, balance: 30000, status: "active", disbursementDate: "2024-01-15", endDate: "2024-07-15" },
        { id: 3, borrowerId: 3, borrowerName: "Mike Johnson", amount: 200000, interest: 12, balance: 200000, status: "active", disbursementDate: "2024-03-01", endDate: "2024-09-01" },
    ],
    loanRecords: [
        { id: 1, loanId: 1, type: "disbursement", amount: 100000, date: "2024-02-01", cancelled: false },
        { id: 2, loanId: 1, type: "repayment", amount: 20000, date: "2024-03-01", cancelled: false },
        { id: 3, loanId: 2, type: "disbursement", amount: 50000, date: "2024-01-15", cancelled: false },
        { id: 4, loanId: 2, type: "repayment", amount: 20000, date: "2024-02-15", cancelled: false },
        { id: 5, loanId: 2, type: "repayment", amount: 5000, date: "2024-02-28", cancelled: true },
        { id: 6, loanId: 3, type: "disbursement", amount: 200000, date: "2024-03-01", cancelled: false },
    ],
    investors: [
        { id: 1, name: "Robert Brown", phone: "0756789012", status: "active", createdAt: "2024-01-01" },
        { id: 2, name: "Emily Davis", phone: "0767890123", status: "active", createdAt: "2024-01-10" },
        { id: 3, name: "David Wilson", phone: "0778901234", status: "active", createdAt: "2024-02-15" },
    ],
    investments: [
        { id: 1, investorId: 1, investorName: "Robert Brown", amount: 500000, returnRate: 15, status: "active", startDate: "2024-01-01", endDate: "2024-07-01" },
        { id: 2, investorId: 2, investorName: "Emily Davis", amount: 300000, returnRate: 12, status: "active", startDate: "2024-01-10", endDate: "2024-07-10" },
        { id: 3, investorId: 3, investorName: "David Wilson", amount: 1000000, returnRate: 18, status: "active", startDate: "2024-02-15", endDate: "2024-08-15" },
    ],
    investmentReturns: [
        { id: 1, investmentId: 1, amount: 50000, date: "2024-02-01", cancelled: false },
        { id: 2, investmentId: 1, amount: 50000, date: "2024-03-01", cancelled: false },
        { id: 3, investmentId: 2, amount: 30000, date: "2024-02-10", cancelled: false },
        { id: 4, investmentId: 2, amount: 30000, date: "2024-03-10", cancelled: true },
        { id: 5, investmentId: 3, amount: 100000, date: "2024-03-15", cancelled: false },
    ],
}

export function formatCurrency(amount) {
    return new Intl.NumberFormat('en-KE', {
        style: 'currency',
        currency: 'KES',
        minimumFractionDigits: 0,
    }).format(amount)
}

export  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-KE', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    })
}
