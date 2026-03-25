import { useEffect, useMemo, useState } from "react";
import {
    PiggyBank,
    HandCoins,
    TrendingUp,
    ArrowDownToLine,
    ArrowUpFromLine,
    Receipt,
    UserPlus,
    Search,
    X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { formatCurrency } from "../../lib/store";
import { getActiveLoans, getActiveInvestments, recordSavings } from "../../services/adminServices";
import {
    getActiveCustomers,
    registerSaver,
    addNextOfKin,
} from "../../services/customerServices";
import { getLoggedInAdminId } from "../../lib/auth";
import { PAYMENT_METHODS } from "../../constants/paymentMethods";

const QUICK_ACTIONS = {
    REGISTER_SAVER: "register_saver",
    RECORD_DEPOSIT: "record_deposit",
    RECORD_WITHDRAWAL: "record_withdrawal",
    RECORD_LOAN_DISBURSEMENT: "record_loan_disbursement",
    RECORD_LOAN_REPAYMENT: "record_loan_repayment",
};

function mapSaver(customer) {
    return {
        id: customer.id,
        name: [customer.firstName, customer.middleName, customer.lastName]
            .filter(Boolean)
            .join(" "),
        firstName: customer.firstName || "",
        middleName: customer.middleName || "",
        lastName: customer.lastName || "",
        email: customer.email || "",
        phone: customer.phoneNo || "",
        whatsappNo: customer.whatsappNo || customer.whatsAppNo || "",
        accountId: customer.accountId || "",
        balance: Number(customer.balance || 0),
        status: customer.status || customer.customerStatus || "active",
        createdAt: customer.createdAt || customer.dateCreated || "",
        nextOfKin: customer.nextOfKin || null,
    };
}

export default function Dashboard({ data, setData }) {
    const [loans, setLoans] = useState([]);
    const [investments, setInvestments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activePanel, setActivePanel] = useState(null);

    const [saverSearch, setSaverSearch] = useState("");
    const [selectedSaver, setSelectedSaver] = useState(null);
    const [amount, setAmount] = useState("");
    const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS?.[0]?.value || "CASH");

    const [loanBorrowerName, setLoanBorrowerName] = useState("");
    const [loanRepaymentTarget, setLoanRepaymentTarget] = useState("");

    const [isSaving, setIsSaving] = useState(false);
    const [formError, setFormError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    const [registerStep, setRegisterStep] = useState("saver");
    const [registeredCustomerId, setRegisteredCustomerId] = useState("");

    const [saverForm, setSaverForm] = useState({
        firstName: "",
        middleName: "",
        lastName: "",
        email: "",
        phoneNo: "",
        whatsappNo: "",
        address: "",
    });

    const [nextOfKinForm, setNextOfKinForm] = useState({
        firstName: "",
        middleName: "",
        lastName: "",
        customerId: "",
        phoneNo: "",
        address: "",
        relationship: "",
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const savers = data?.savers || [];

    const filteredSavers = useMemo(() => {
        const query = saverSearch.trim().toLowerCase();
        const activeSavers = savers.filter((saver) => {
            const status = String(saver.status || "").toLowerCase();
            return status === "active" || status === "approved";
        });

        if (!query) return activeSavers;

        return activeSavers.filter((saver) => {
            const haystack = [saver.name, saver.accountId, saver.phone]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            return haystack.includes(query);
        });
    }, [savers, saverSearch]);

    useEffect(() => {
        let ignore = false;

        async function loadDashboardData() {
            try {
                setLoading(true);

                const [loansRes, investmentsRes] = await Promise.all([
                    getActiveLoans(),
                    getActiveInvestments(),
                ]);

                if (!ignore) {
                    setLoans(Array.isArray(loansRes) ? loansRes : []);
                    setInvestments(Array.isArray(investmentsRes) ? investmentsRes : []);
                }
            } catch (error) {
                console.error("Dashboard fetch error:", error);
            } finally {
                if (!ignore) {
                    setLoading(false);
                }
            }
        }

        loadDashboardData();

        return () => {
            ignore = true;
        };
    }, []);

    const resetMessages = () => {
        setFormError("");
        setSuccessMessage("");
    };

    const refreshSavers = async () => {
        try {
            const response = await getActiveCustomers();

            const refreshedSavers = Array.isArray(response)
                ? response.map(mapSaver)
                : [];

            setData((prev) => ({
                ...prev,
                savers: refreshedSavers,
            }));

            return refreshedSavers;
        } catch (error) {
            console.error("Failed to refresh savers:", error);
            throw error;
        }
    };

    const resetSavingsForm = () => {
        setSaverSearch("");
        setSelectedSaver(null);
        setAmount("");
        setPaymentMethod(PAYMENT_METHODS?.[0]?.value || "CASH");
    };

    const resetLoanForms = () => {
        setLoanBorrowerName("");
        setLoanRepaymentTarget("");
        setAmount("");
    };

    const resetSaverRegistrationForm = () => {
        setSaverForm({
            firstName: "",
            middleName: "",
            lastName: "",
            email: "",
            phoneNo: "",
            whatsappNo: "",
            address: "",
        });
    };

    const resetNextOfKinForm = () => {
        setNextOfKinForm({
            firstName: "",
            middleName: "",
            lastName: "",
            customerId: "",
            phoneNo: "",
            address: "",
            relationship: "",
        });
    };

    const resetRegisterFlow = () => {
        setRegisterStep("saver");
        setRegisteredCustomerId("");
        resetSaverRegistrationForm();
        resetNextOfKinForm();
    };

    const closePanel = () => {
        setActivePanel(null);
        setIsSaving(false);
        setFormError("");
        resetSavingsForm();
        resetLoanForms();
        resetRegisterFlow();
    };

    const openPanel = (panel) => {
        setFormError("");
        resetSavingsForm();
        resetLoanForms();

        if (panel === QUICK_ACTIONS.REGISTER_SAVER) {
            resetRegisterFlow();
        }

        setActivePanel(panel);
    };

    const handleSaverInputChange = (event) => {
        const { name, value } = event.target;

        setSaverForm((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleNextOfKinInputChange = (event) => {
        const { name, value } = event.target;

        setNextOfKinForm((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleRegisterSaver = async () => {
        resetMessages();

        if (
            !saverForm.firstName.trim() ||
            !saverForm.lastName.trim() ||
            !saverForm.address.trim()
        ) {
            setFormError("First name, last name and address are required.");
            return;
        }

        try {
            setIsSaving(true);

            const response = await registerSaver(saverForm);
            const customerId = response?.id;

            if (!customerId) {
                console.error("Customer registered but ID missing from response:", response);
            }

            setRegisteredCustomerId(customerId);

            setNextOfKinForm({
                firstName: "",
                middleName: "",
                lastName: "",
                customerId,
                phoneNo: "",
                address: "",
                relationship: "",
            });

            setSuccessMessage("Saver registered successfully. Please add next of kin.");
            setRegisterStep("next_of_kin");

            try {
                await refreshSavers();
            } catch (refreshError) {
                console.error("refreshSavers failed after saver registration:", refreshError);
            }
        } catch (error) {
            console.error("registerSaver failed:", error);
            setFormError(
                error?.response?.data?.message ||
                error?.response?.data?.error ||
                error?.message ||
                "Failed to register saver."
            );
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddNextOfKin = async () => {
        resetMessages();

        if (
            !nextOfKinForm.firstName.trim() ||
            !nextOfKinForm.lastName.trim() ||
            !nextOfKinForm.phoneNo.trim() ||
            !nextOfKinForm.address.trim() ||
            !nextOfKinForm.relationship.trim()
        ) {
            setFormError("All next of kin required fields must be filled.");
            return;
        }

        if (!nextOfKinForm.customerId && !registeredCustomerId) {
            setFormError("Customer ID is missing. Please register saver again.");
            return;
        }

        try {
            setIsSaving(true);

            const payload = {
                ...nextOfKinForm,
                customerId: nextOfKinForm.customerId || registeredCustomerId,
            };

            console.log("addNextOfKin payload:", payload);

            await addNextOfKin(payload);

            setSuccessMessage("Saver registered and next of kin added successfully.");

            try {
                await refreshSavers();
            } catch (refreshError) {
                console.error(
                    "refreshSavers failed after next of kin creation:",
                    refreshError
                );
            }

            closePanel();
        } catch (error) {
            console.error("addNextOfKin failed:", error);

            setFormError(
                error?.response?.data?.message ||
                error?.response?.data?.error ||
                error?.message ||
                "Failed to add next of kin."
            );
        } finally {
            setIsSaving(false);
        }
    };

    const handleRecordDeposit = async () => {
        resetMessages();

        if (!selectedSaver || !amount) {
            setFormError("Please select a saver and enter amount.");
            return;
        }

        const recorderId = getLoggedInAdminId();

        if (!recorderId) {
            setFormError("Could not find logged in admin.");
            return;
        }

        try {
            setIsSaving(true);

            await recordSavings({
                saverId: String(selectedSaver.id),
                amount: Number(amount),
                paymentMethod,
                recorderId: String(recorderId),
            });

            await refreshSavers();
            closePanel();
            setSuccessMessage("Deposit recorded successfully.");
        } catch (error) {
            setFormError(
                error?.response?.data?.message ||
                error?.response?.data?.error ||
                "Failed to record deposit."
            );
        } finally {
            setIsSaving(false);
        }
    };

    const handleRecordWithdrawal = async () => {
        resetMessages();

        if (!selectedSaver || !amount) {
            setFormError("Please select a saver and enter amount.");
            return;
        }

        const withdrawalAmount = Number(amount);

        if (Number.isNaN(withdrawalAmount) || withdrawalAmount <= 0) {
            setFormError("Enter a valid withdrawal amount.");
            return;
        }

        if (withdrawalAmount > Number(selectedSaver.balance || 0)) {
            setFormError("Withdrawal amount cannot be more than the saver balance.");
            return;
        }

        setData((prev) => ({
            ...prev,
            savers: prev.savers.map((saver) =>
                saver.id === selectedSaver.id
                    ? { ...saver, balance: Number(saver.balance || 0) - withdrawalAmount }
                    : saver
            ),
            savingsRecords: [
                ...(prev.savingsRecords || []),
                {
                    id: Date.now(),
                    saverId: selectedSaver.id,
                    type: "withdrawal",
                    amount: withdrawalAmount,
                    date: new Date().toISOString().split("T")[0],
                    cancelled: false,
                    source: "dashboard",
                },
            ],
        }));

        closePanel();
        setSuccessMessage("Withdrawal recorded on the dashboard.");
    };

    const handleRecordLoanDisbursement = () => {
        resetMessages();

        if (!loanBorrowerName.trim() || !amount) {
            setFormError("Enter borrower name and amount.");
            return;
        }

        const parsedAmount = Number(amount);

        if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
            setFormError("Enter a valid loan amount.");
            return;
        }

        setData((prev) => ({
            ...prev,
            loans: [
                ...(prev.loans || []),
                {
                    id: Date.now(),
                    borrowerName: loanBorrowerName.trim(),
                    amount: parsedAmount,
                    balance: parsedAmount,
                    date: new Date().toISOString(),
                    source: "dashboard",
                },
            ],
            loanRecords: [
                ...(prev.loanRecords || []),
                {
                    id: Date.now() + 1,
                    type: "disbursement",
                    borrowerName: loanBorrowerName.trim(),
                    amount: parsedAmount,
                    date: new Date().toISOString(),
                    source: "dashboard",
                },
            ],
        }));

        closePanel();
        setSuccessMessage("Loan disbursement recorded on the dashboard.");
    };

    const handleRecordLoanRepayment = () => {
        resetMessages();

        if (!loanRepaymentTarget.trim() || !amount) {
            setFormError("Enter borrower name and amount.");
            return;
        }

        const parsedAmount = Number(amount);

        if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
            setFormError("Enter a valid repayment amount.");
            return;
        }

        setData((prev) => ({
            ...prev,
            loans: (prev.loans || []).map((loan) => {
                const borrowerName = loan.borrowerName || loan.name || "";

                if (borrowerName.toLowerCase() !== loanRepaymentTarget.trim().toLowerCase()) {
                    return loan;
                }

                const currentBalance = Number(loan.balance ?? loan.amount ?? 0);

                return {
                    ...loan,
                    balance: Math.max(0, currentBalance - parsedAmount),
                };
            }),
            loanRecords: [
                ...(prev.loanRecords || []),
                {
                    id: Date.now(),
                    type: "repayment",
                    borrowerName: loanRepaymentTarget.trim(),
                    amount: parsedAmount,
                    date: new Date().toISOString(),
                    source: "dashboard",
                },
            ],
        }));

        closePanel();
        setSuccessMessage("Loan repayment recorded on the dashboard.");
    };

    const activeSavers = savers.filter((saver) => {
        const status = String(saver.status || "").toLowerCase();
        return status === "active" || status === "approved";
    }).length;

    const allLoans = [...loans, ...(data?.loans || [])];
    const activeLoans = allLoans.length;
    const activeInvestors = investments.length;

    const totalSavings = savers.reduce((sum, saver) => sum + Number(saver.balance || 0), 0);
    const totalLoans = allLoans.reduce((sum, loan) => sum + Number(loan.balance || loan.amount || 0), 0);
    const totalInvestments = investments.reduce((sum, investment) => sum + Number(investment.amount || 0), 0);

    if (loading) {
        return <div className="text-sm text-muted-foreground">Loading dashboard...</div>;
    }

    return (
        <div className="space-y-6">
            {successMessage ? (
                <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                    {successMessage}
                </div>
            ) : null}

            {formError && !activePanel ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                    {formError}
                </div>
            ) : null}

            <div>
                <h2 className="text-2xl font-bold text-foreground">Dashboard</h2>
                <p className="text-muted-foreground">Overview of your savings and loans business</p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Active Savers</CardTitle>
                        <PiggyBank className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{activeSavers}</div>
                        <p className="text-xs text-muted-foreground">
                            Total balance: {formatCurrency(totalSavings)}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Active Loans</CardTitle>
                        <HandCoins className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{activeLoans}</div>
                        <p className="text-xs text-muted-foreground">
                            Outstanding: {formatCurrency(totalLoans)}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Active Investments</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{activeInvestors}</div>
                        <p className="text-xs text-muted-foreground">
                            Total invested: {formatCurrency(totalInvestments)}
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                        <Button
                            variant="outline"
                            className="h-auto flex-col gap-2 py-4"
                            onClick={() => openPanel(QUICK_ACTIONS.REGISTER_SAVER)}
                            type="button"
                        >
                            <UserPlus className="h-5 w-5" />
                            Register Saver
                        </Button>

                        <Button
                            variant="outline"
                            className="h-auto flex-col gap-2 py-4"
                            onClick={() => openPanel(QUICK_ACTIONS.RECORD_DEPOSIT)}
                            type="button"
                        >
                            <ArrowDownToLine className="h-5 w-5" />
                            Record Deposit
                        </Button>

                        <Button
                            variant="outline"
                            className="h-auto flex-col gap-2 py-4"
                            onClick={() => openPanel(QUICK_ACTIONS.RECORD_WITHDRAWAL)}
                            type="button"
                        >
                            <ArrowUpFromLine className="h-5 w-5" />
                            Record Withdrawal
                        </Button>

                        <Button
                            variant="outline"
                            className="h-auto flex-col gap-2 py-4"
                            onClick={() => openPanel(QUICK_ACTIONS.RECORD_LOAN_DISBURSEMENT)}
                            type="button"
                        >
                            <HandCoins className="h-5 w-5" />
                            Record Loan Disbursement
                        </Button>

                        <Button
                            variant="outline"
                            className="h-auto flex-col gap-2 py-4"
                            onClick={() => openPanel(QUICK_ACTIONS.RECORD_LOAN_REPAYMENT)}
                            type="button"
                        >
                            <Receipt className="h-5 w-5" />
                            Record Loan Repayment
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {activePanel ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
                    <div className="absolute inset-0" onClick={closePanel} />

                    <div className="relative z-10 w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                            <h3 className="text-lg font-semibold text-slate-900">
                                {activePanel === QUICK_ACTIONS.REGISTER_SAVER && "Register Saver"}
                                {activePanel === QUICK_ACTIONS.RECORD_DEPOSIT && "Record Deposit"}
                                {activePanel === QUICK_ACTIONS.RECORD_WITHDRAWAL && "Record Withdrawal"}
                                {activePanel === QUICK_ACTIONS.RECORD_LOAN_DISBURSEMENT && "Record Loan Disbursement"}
                                {activePanel === QUICK_ACTIONS.RECORD_LOAN_REPAYMENT && "Record Loan Repayment"}
                            </h3>

                            <button
                                type="button"
                                onClick={closePanel}
                                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="max-h-[80vh] overflow-y-auto px-6 py-5">
                            {successMessage ? (
                                <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                                    {successMessage}
                                </div>
                            ) : null}

                            {formError ? (
                                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                                    {formError}
                                </div>
                            ) : null}

                            {activePanel === QUICK_ACTIONS.REGISTER_SAVER && (
                                <div className="space-y-5">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className={`rounded-full px-3 py-1 text-sm font-medium ${
                                                registerStep === "saver"
                                                    ? "bg-slate-900 text-white"
                                                    : "bg-slate-100 text-slate-600"
                                            }`}
                                        >
                                            1. Register Saver
                                        </div>
                                        <div
                                            className={`rounded-full px-3 py-1 text-sm font-medium ${
                                                registerStep === "next_of_kin"
                                                    ? "bg-slate-900 text-white"
                                                    : "bg-slate-100 text-slate-600"
                                            }`}
                                        >
                                            2. Add Next of Kin
                                        </div>
                                    </div>

                                    {registerStep === "saver" && (
                                        <div className="grid gap-4 md:grid-cols-2">
                                            <div className="grid gap-2">
                                                <Label htmlFor="firstName">First Name</Label>
                                                <Input
                                                    id="firstName"
                                                    name="firstName"
                                                    value={saverForm.firstName}
                                                    onChange={handleSaverInputChange}
                                                />
                                            </div>

                                            <div className="grid gap-2">
                                                <Label htmlFor="middleName">Middle Name</Label>
                                                <Input
                                                    id="middleName"
                                                    name="middleName"
                                                    value={saverForm.middleName}
                                                    onChange={handleSaverInputChange}
                                                />
                                            </div>

                                            <div className="grid gap-2">
                                                <Label htmlFor="lastName">Last Name</Label>
                                                <Input
                                                    id="lastName"
                                                    name="lastName"
                                                    value={saverForm.lastName}
                                                    onChange={handleSaverInputChange}
                                                />
                                            </div>

                                            <div className="grid gap-2">
                                                <Label htmlFor="email">Email</Label>
                                                <Input
                                                    id="email"
                                                    name="email"
                                                    type="email"
                                                    value={saverForm.email}
                                                    onChange={handleSaverInputChange}
                                                />
                                            </div>

                                            <div className="grid gap-2">
                                                <Label htmlFor="phoneNo">Phone Number</Label>
                                                <Input
                                                    id="phoneNo"
                                                    name="phoneNo"
                                                    value={saverForm.phoneNo}
                                                    onChange={handleSaverInputChange}
                                                />
                                            </div>

                                            <div className="grid gap-2">
                                                <Label htmlFor="whatsappNo">WhatsApp Number</Label>
                                                <Input
                                                    id="whatsappNo"
                                                    name="whatsappNo"
                                                    value={saverForm.whatsappNo}
                                                    onChange={handleSaverInputChange}
                                                />
                                            </div>

                                            <div className="grid gap-2 md:col-span-2">
                                                <Label htmlFor="address">Address</Label>
                                                <Input
                                                    id="address"
                                                    name="address"
                                                    value={saverForm.address}
                                                    onChange={handleSaverInputChange}
                                                />
                                            </div>

                                            <div className="md:col-span-2 flex justify-end gap-2 pt-2">
                                                <Button variant="outline" onClick={closePanel} type="button">
                                                    Cancel
                                                </Button>
                                                <Button
                                                    onClick={handleRegisterSaver}
                                                    disabled={isSaving}
                                                    type="button"
                                                    className="transition-all duration-200 hover:bg-slate-700 hover:scale-[1.02] hover:shadow-md"
                                                >
                                                    {isSaving ? "Registering..." : "Continue"}
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    {registerStep === "next_of_kin" && (
                                        <div className="grid gap-4 md:grid-cols-2">
                                            <div className="grid gap-2">
                                                <Label htmlFor="nokFirstName">First Name</Label>
                                                <Input
                                                    id="nokFirstName"
                                                    name="firstName"
                                                    value={nextOfKinForm.firstName}
                                                    onChange={handleNextOfKinInputChange}
                                                />
                                            </div>

                                            <div className="grid gap-2">
                                                <Label htmlFor="nokMiddleName">Middle Name</Label>
                                                <Input
                                                    id="nokMiddleName"
                                                    name="middleName"
                                                    value={nextOfKinForm.middleName}
                                                    onChange={handleNextOfKinInputChange}
                                                />
                                            </div>

                                            <div className="grid gap-2">
                                                <Label htmlFor="nokLastName">Last Name</Label>
                                                <Input
                                                    id="nokLastName"
                                                    name="lastName"
                                                    value={nextOfKinForm.lastName}
                                                    onChange={handleNextOfKinInputChange}
                                                />
                                            </div>

                                            <div className="grid gap-2">
                                                <Label htmlFor="nokPhoneNo">Phone Number</Label>
                                                <Input
                                                    id="nokPhoneNo"
                                                    name="phoneNo"
                                                    value={nextOfKinForm.phoneNo}
                                                    onChange={handleNextOfKinInputChange}
                                                />
                                            </div>

                                            <div className="grid gap-2">
                                                <Label htmlFor="nokRelationship">Relationship</Label>
                                                <Input
                                                    id="nokRelationship"
                                                    name="relationship"
                                                    value={nextOfKinForm.relationship}
                                                    onChange={handleNextOfKinInputChange}
                                                />
                                            </div>

                                            <div className="grid gap-2 md:col-span-2">
                                                <Label htmlFor="nokAddress">Address</Label>
                                                <Input
                                                    id="nokAddress"
                                                    name="address"
                                                    value={nextOfKinForm.address}
                                                    onChange={handleNextOfKinInputChange}
                                                />
                                            </div>

                                            <div className="md:col-span-2 flex justify-end gap-2 pt-2">
                                                <Button
                                                    variant="outline"
                                                    onClick={() => {
                                                        setFormError("");
                                                        setRegisterStep("saver");
                                                    }}
                                                    type="button"
                                                >
                                                    Back
                                                </Button>
                                                <Button
                                                    onClick={handleAddNextOfKin}
                                                    disabled={isSaving}
                                                    type="button"
                                                >
                                                    {isSaving ? "Saving..." : "Finish"}
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {(activePanel === QUICK_ACTIONS.RECORD_DEPOSIT ||
                                activePanel === QUICK_ACTIONS.RECORD_WITHDRAWAL) && (
                                <div className="grid gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="dashboard-saver-search">Search Saver</Label>
                                        <div className="relative">
                                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                            <Input
                                                id="dashboard-saver-search"
                                                value={saverSearch}
                                                onChange={(e) => {
                                                    setSaverSearch(e.target.value);
                                                    setSelectedSaver(null);
                                                }}
                                                className="pl-10"
                                                placeholder="Type saver name"
                                            />
                                        </div>
                                    </div>

                                    <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200">
                                        {filteredSavers.length === 0 ? (
                                            <div className="px-4 py-3 text-sm text-slate-500">
                                                No matching saver found.
                                            </div>
                                        ) : (
                                            filteredSavers.map((saver) => (
                                                <button
                                                    key={saver.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedSaver(saver);
                                                        setSaverSearch(saver.name);
                                                    }}
                                                    className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm transition hover:bg-slate-50 ${
                                                        selectedSaver?.id === saver.id ? "bg-slate-100" : ""
                                                    }`}
                                                >
                                                    <span>{saver.name}</span>
                                                    <span className="text-slate-500">
                                                        {saver.accountId || saver.id}
                                                    </span>
                                                </button>
                                            ))
                                        )}
                                    </div>

                                    <div className="grid gap-2">
                                        <Label>Selected Saver</Label>
                                        <Input
                                            value={selectedSaver ? `${selectedSaver.name} (${selectedSaver.id})` : ""}
                                            disabled
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="dashboard-amount">Amount</Label>
                                        <Input
                                            id="dashboard-amount"
                                            type="number"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                        />
                                    </div>

                                    {activePanel === QUICK_ACTIONS.RECORD_DEPOSIT && (
                                        <div className="grid gap-2">
                                            <Label htmlFor="paymentMethod">Payment Method</Label>
                                            <select
                                                id="paymentMethod"
                                                value={paymentMethod}
                                                onChange={(e) => setPaymentMethod(e.target.value)}
                                                className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                                            >
                                                {PAYMENT_METHODS.map((method) => (
                                                    <option key={method.value} value={method.value}>
                                                        {method.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    <div className="flex justify-end gap-2 pt-2">
                                        <Button variant="outline" onClick={closePanel} type="button">
                                            Cancel
                                        </Button>
                                        <Button
                                            onClick={
                                                activePanel === QUICK_ACTIONS.RECORD_DEPOSIT
                                                    ? handleRecordDeposit
                                                    : handleRecordWithdrawal
                                            }
                                            disabled={isSaving}
                                            type="button"
                                        >
                                            {activePanel === QUICK_ACTIONS.RECORD_DEPOSIT
                                                ? "Record Deposit"
                                                : "Record Withdrawal"}
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {activePanel === QUICK_ACTIONS.RECORD_LOAN_DISBURSEMENT && (
                                <div className="grid gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="loanBorrowerName">Borrower Name</Label>
                                        <Input
                                            id="loanBorrowerName"
                                            value={loanBorrowerName}
                                            onChange={(e) => setLoanBorrowerName(e.target.value)}
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="loanDisbursementAmount">Amount</Label>
                                        <Input
                                            id="loanDisbursementAmount"
                                            type="number"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                        />
                                    </div>

                                    <div className="flex justify-end gap-2 pt-2">
                                        <Button variant="outline" onClick={closePanel} type="button">
                                            Cancel
                                        </Button>
                                        <Button onClick={handleRecordLoanDisbursement} type="button">
                                            Record Loan Disbursement
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {activePanel === QUICK_ACTIONS.RECORD_LOAN_REPAYMENT && (
                                <div className="grid gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="loanRepaymentTarget">Borrower Name</Label>
                                        <Input
                                            id="loanRepaymentTarget"
                                            value={loanRepaymentTarget}
                                            onChange={(e) => setLoanRepaymentTarget(e.target.value)}
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="loanRepaymentAmount">Amount</Label>
                                        <Input
                                            id="loanRepaymentAmount"
                                            type="number"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                        />
                                    </div>

                                    <div className="flex justify-end gap-2 pt-2">
                                        <Button variant="outline" onClick={closePanel} type="button">
                                            Cancel
                                        </Button>
                                        <Button onClick={handleRecordLoanRepayment} type="button">
                                            Record Loan Repayment
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
