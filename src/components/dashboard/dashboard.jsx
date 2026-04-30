import { useCallback, useEffect, useMemo, useState } from "react";
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
import {
    getActiveLoans,
    getActiveInvestments,
    recordDeposit,
    recordWithdrawal,
    recordLoanDisbursement,
    addCollateral,
    addGuarantor,
    recordRepayment,
} from "../../services/adminServices";
import {
    getActiveCustomers,
    registerSaver,
    addNextOfKin,
} from "../../services/customerServices";
import { getLoggedInAdminId } from "../../lib/auth";
import { PAYMENT_METHODS } from "../../constants/paymentMethods";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";

const QUICK_ACTIONS = {
    REGISTER_SAVER: "register_saver",
    RECORD_DEPOSIT: "record_deposit",
    RECORD_WITHDRAWAL: "record_withdrawal",
    RECORD_LOAN_DISBURSEMENT: "record_loan_disbursement",
    RECORD_LOAN_REPAYMENT: "record_loan_repayment",
};

const REPAYMENT_FREQUENCIES = [
    { value: "WEEKLY", label: "Weekly" },
    { value: "BI_WEEKLY", label: "Two-Two weeks" },
    { value: "MONTHLY", label: "Monthly" },
];

const INITIAL_LOAN_DISBURSEMENT_FORM = {
    borrowerName: "",
    borrowerPhoneNumber: "",
    borrowerEmail: "",
    principal: "",
    interestRate: "",
    startDate: "",
    durationDays: "",
    repaymentFrequency: "MONTHLY",
};

// ─── helpers ──────────────────────────────────────────────────────────────────

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
        balance: Number(customer.currentBalance || 0),
        status: customer.status || customer.customerStatus || "active",
        createdAt: customer.createdAt || customer.dateCreated || "",
        nextOfKin: customer.nextOfKin || null,
    };
}

function mapInvestmentForDashboard(inv) {
    return {
        id:             inv.id || "",
        investorName:   inv.investor?.fullName || inv.investorName || "—",
        amountInvested: Number(inv.amountInvested || 0),
        remainingReturn: Number(inv.remainingReturn || 0),
        status:         inv.investmentStatus || inv.status || "ACTIVE",
    };
}

function extractContent(response) {
    if (Array.isArray(response)) return response;
    if (response && Array.isArray(response.content)) return response.content;
    return [];
}

async function fetchAllPages(fetchFn, pageSize = 50) {
    let page = 0;
    let allItems = [];
    let totalPages = 1;

    do {
        const res = await fetchFn(page, pageSize);
        const items = extractContent(res);
        allItems = [...allItems, ...items];
        totalPages = res?.totalPages ?? 1;
        page++;
    } while (page < totalPages);

    return allItems;
}

function formatNumberWithCommas(value) {
    if (value === null || value === undefined) return "";
    const stringValue = String(value).replace(/,/g, "").replace(/[^\d.]/g, "");
    if (!stringValue) return "";
    const [whole, decimal] = stringValue.split(".");
    const formattedWhole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return decimal !== undefined ? `${formattedWhole}.${decimal}` : formattedWhole;
}

function sanitizeMoneyInput(value) {
    const cleaned = String(value).replace(/,/g, "").replace(/[^\d.]/g, "");
    const parts = cleaned.split(".");
    if (parts.length <= 1) return cleaned;
    return `${parts[0]}.${parts.slice(1).join("")}`;
}

function getTodayDate() {
    return new Date().toISOString().split("T")[0];
}

// ─── component ────────────────────────────────────────────────────────────────

export default function Dashboard({ data, setData }) {
    const [loans, setLoans] = useState([]);
    const [investments, setInvestments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activePanel, setActivePanel] = useState(null);

    const [saverSearch, setSaverSearch] = useState("");
    const [selectedSaver, setSelectedSaver] = useState(null);
    const [amount, setAmount] = useState("");
    const [paymentMethod, setPaymentMethod] = useState(
        PAYMENT_METHODS?.[0]?.value || "CASH",
    );

    const [selectedLoanId, setSelectedLoanId] = useState("");

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

    const [loanDisbursementForm, setLoanDisbursementForm] = useState(
        INITIAL_LOAN_DISBURSEMENT_FORM,
    );
    const [loanFlowStep, setLoanFlowStep] = useState("disbursement");
    const [createdLoanId, setCreatedLoanId] = useState("");
    const [collateralAddedCount, setCollateralAddedCount] = useState(0);
    const [guarantorAddedCount, setGuarantorAddedCount] = useState(0);

    const [collateralForm, setCollateralForm] = useState({
        name: "",
        description: "",
        location: "",
        approximateValue: "",
    });

    const [guarantorForm, setGuarantorForm] = useState({
        firstName: "",
        middleName: "",
        lastName: "",
        phoneNo: "",
        address: "",
        occupation: "",
        placeOfWork: "",
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const savers = data?.savers || [];
    const today = useMemo(() => getTodayDate(), []);

    // ── refresh savers ────────────────────────────────────────────────────────
    const refreshSavers = useCallback(async () => {
        try {
            const allSavers = await fetchAllPages(getActiveCustomers, 50);
            const mapped = allSavers.map(mapSaver);
            setData((prev) => ({ ...prev, savers: mapped }));
            return mapped;
        } catch (error) {
            console.error("Failed to refresh savers:", error);
            throw error;
        }
    }, [setData]);

    // ── refresh investments — fetches ALL pages, maps, updates state + shared data
    const refreshInvestments = useCallback(async () => {
        try {
            const all = await fetchAllPages(getActiveInvestments, 50);
            const mapped = all.map(mapInvestmentForDashboard);
            setInvestments(mapped);
            setData((prev) => ({ ...prev, investments: mapped }));
            return mapped;
        } catch (error) {
            console.error("Failed to refresh investments:", error);
        }
    }, [setData]);

    // ── refresh loans ─────────────────────────────────────────────────────────
    const refreshLoans = useCallback(async () => {
        try {
            const allLoans = await fetchAllPages(getActiveLoans, 50);
            setLoans(allLoans);
            setData((prev) => ({ ...prev, loans: allLoans }));
            return allLoans;
        } catch (error) {
            console.error("Failed to refresh loans:", error);
        }
    }, [setData]);

    useEffect(() => {
        let ignore = false;

        async function loadDashboardData() {
            try {
                setLoading(true);
                await Promise.all([
                    refreshSavers(),
                    refreshInvestments(),
                    refreshLoans(),
                ]);
            } catch (error) {
                console.error("Dashboard load error:", error);
            } finally {
                if (!ignore) setLoading(false);
            }
        }

        void loadDashboardData();
        return () => { ignore = true; };
    }, [refreshSavers, refreshInvestments, refreshLoans]);

    const filteredSavers = useMemo(() => {
        const query = saverSearch.trim().toLowerCase();
        const activeOnly = savers.filter((saver) => {
            const status = String(saver.status || "").toLowerCase();
            return status === "active" || status === "approved";
        });
        if (!query) return activeOnly;
        return activeOnly.filter((saver) => {
            const haystack = [saver.name, saver.accountId, saver.phone]
                .filter(Boolean).join(" ").toLowerCase();
            return haystack.includes(query);
        });
    }, [savers, saverSearch]);

    const combinedLoans = useMemo(() => {
        const sourceLoans = [...loans, ...(data?.loans || [])];
        const seen = new Set();
        return sourceLoans.filter((loan) => {
            const key = String(loan.id || loan.loanId || "");
            if (!key) return true;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }, [loans, data?.loans]);

    const activeSaversCount = useMemo(() =>
            savers.filter((s) => {
                const st = String(s.status || "").toLowerCase();
                return st === "active" || st === "approved";
            }).length,
        [savers]);

    const totalSavings = useMemo(() =>
            savers.reduce((sum, s) => sum + Number(s.balance || 0), 0),
        [savers]);

    const totalLoans = useMemo(() =>
            combinedLoans.reduce(
                (sum, loan) => sum + Number(loan.remainingBalance ?? loan.balance ?? loan.amount ?? 0),
                0,
            ),
        [combinedLoans]);

    // Uses live investments state — always up to date after every refresh
    const activeInvestmentsCount = useMemo(() =>
            investments.filter((inv) =>
                String(inv.status || "").toUpperCase() === "ACTIVE"
            ).length,
        [investments]);

    const totalInvestments = useMemo(() =>
            investments
                .filter((inv) => String(inv.status || "").toUpperCase() === "ACTIVE")
                .reduce((sum, inv) => sum + Number(inv.amountInvested || 0), 0),
        [investments]);

    // ── form resets ────────────────────────────────────────────────────────────

    const resetMessages = () => { setFormError(""); setSuccessMessage(""); };

    const resetSavingsForm = () => {
        setSaverSearch(""); setSelectedSaver(null); setAmount("");
        setPaymentMethod(PAYMENT_METHODS?.[0]?.value || "CASH");
    };

    const resetLoanForms = () => {
        setLoanDisbursementForm(INITIAL_LOAN_DISBURSEMENT_FORM);
        setSelectedLoanId(""); setAmount("");
        setPaymentMethod(PAYMENT_METHODS?.[0]?.value || "CASH");
        setLoanFlowStep("disbursement"); setCreatedLoanId("");
        setCollateralAddedCount(0); setGuarantorAddedCount(0);
        setCollateralForm({ name: "", description: "", location: "", approximateValue: "" });
        setGuarantorForm({ firstName: "", middleName: "", lastName: "", phoneNo: "", address: "", occupation: "", placeOfWork: "" });
    };

    const resetSaverRegistrationForm = () => {
        setSaverForm({ firstName: "", middleName: "", lastName: "", email: "", phoneNo: "", whatsappNo: "", address: "" });
    };

    const resetNextOfKinForm = () => {
        setNextOfKinForm({ firstName: "", middleName: "", lastName: "", customerId: "", phoneNo: "", address: "", relationship: "" });
    };

    const resetRegisterFlow = () => {
        setRegisterStep("saver"); setRegisteredCustomerId("");
        resetSaverRegistrationForm(); resetNextOfKinForm();
    };

    const closePanel = () => {
        setActivePanel(null); setIsSaving(false); setFormError("");
        resetSavingsForm(); resetLoanForms(); resetRegisterFlow();
    };

    const openPanel = (panel) => {
        resetMessages();
        if (panel === QUICK_ACTIONS.REGISTER_SAVER) resetRegisterFlow();
        if (panel === QUICK_ACTIONS.RECORD_DEPOSIT || panel === QUICK_ACTIONS.RECORD_WITHDRAWAL) resetSavingsForm();
        if (panel === QUICK_ACTIONS.RECORD_LOAN_DISBURSEMENT || panel === QUICK_ACTIONS.RECORD_LOAN_REPAYMENT) resetLoanForms();
        setActivePanel(panel);
    };

    // ── input handlers ─────────────────────────────────────────────────────────

    const handleSaverInputChange = (e) => {
        const { name, value } = e.target;
        setSaverForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleNextOfKinInputChange = (e) => {
        const { name, value } = e.target;
        setNextOfKinForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleLoanDisbursementInputChange = (e) => {
        const { name, value } = e.target;
        setLoanDisbursementForm((prev) => ({
            ...prev,
            [name]: name === "principal" ? sanitizeMoneyInput(value) : value,
        }));
    };

    const handleCollateralInputChange = (e) => {
        const { name, value } = e.target;
        setCollateralForm((prev) => ({
            ...prev,
            [name]: name === "approximateValue" ? sanitizeMoneyInput(value) : value,
        }));
    };

    const handleGuarantorInputChange = (e) => {
        const { name, value } = e.target;
        setGuarantorForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleMoneyInputChange = (setter) => (e) => {
        setter(sanitizeMoneyInput(e.target.value));
    };

    // ── action handlers ────────────────────────────────────────────────────────

    const handleRegisterSaver = async () => {
        resetMessages();
        if (!saverForm.firstName.trim() || !saverForm.lastName.trim() || !saverForm.address.trim()) {
            setFormError("First name, last name and address are required.");
            return;
        }
        if (!saverForm.phoneNo || saverForm.phoneNo.trim().length < 7) {
            setFormError("A valid phone number is required.");
            return;
        }
        try {
            setIsSaving(true);
            const response = await registerSaver(saverForm);
            const customerId = response?.id;
            setRegisteredCustomerId(customerId || "");
            setNextOfKinForm({ firstName: "", middleName: "", lastName: "", customerId: customerId || "", phoneNo: "", address: "", relationship: "" });
            setSuccessMessage("Saver registered successfully. Please add next of kin.");
            setRegisterStep("next_of_kin");
            try { await refreshSavers(); } catch (e) { console.error(e); }
        } catch (error) {
            setFormError(error?.response?.data?.message || error?.response?.data?.error || error?.message || "Failed to register saver.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddNextOfKin = async () => {
        resetMessages();
        if (!nextOfKinForm.firstName.trim() || !nextOfKinForm.lastName.trim() ||
            !nextOfKinForm.phoneNo.trim() || !nextOfKinForm.address.trim() || !nextOfKinForm.relationship.trim()) {
            setFormError("All next of kin required fields must be filled."); return;
        }
        if (!nextOfKinForm.phoneNo || nextOfKinForm.phoneNo.trim().length < 7) {
            setFormError("A valid phone number is required for next of kin.");
            return;
        }
        if (!nextOfKinForm.customerId && !registeredCustomerId) {
            setFormError("Customer ID is missing. Please register saver again."); return;
        }
        try {
            setIsSaving(true);
            await addNextOfKin({ ...nextOfKinForm, customerId: nextOfKinForm.customerId || registeredCustomerId });
            try { await refreshSavers(); } catch (e) { console.error(e); }
            closePanel();
            setSuccessMessage("Saver registered and next of kin added successfully.");
        } catch (error) {
            setFormError(error?.response?.data?.message || error?.response?.data?.error || error?.message || "Failed to add next of kin.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleRecordDeposit = async () => {
        resetMessages();
        if (!selectedSaver || !amount) { setFormError("Please select a saver and enter amount."); return; }
        const depositAmount = Number(amount);
        if (Number.isNaN(depositAmount) || depositAmount <= 0) { setFormError("Enter a valid deposit amount."); return; }
        const recorderId = getLoggedInAdminId();
        if (!recorderId) { setFormError("Could not find logged in admin."); return; }
        try {
            setIsSaving(true);
            await recordDeposit({ saverId: String(selectedSaver.id), amount: depositAmount, paymentMethod, recorderId: String(recorderId) });
            await refreshSavers();
            closePanel();
            setSuccessMessage("Deposit recorded successfully.");
        } catch (error) {
            setFormError(error?.response?.data?.message || error?.response?.data?.error || "Failed to record deposit.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleRecordWithdrawal = async () => {
        resetMessages();
        if (!selectedSaver || !amount) { setFormError("Please select a saver and enter amount."); return; }
        const withdrawalAmount = Number(amount);
        if (Number.isNaN(withdrawalAmount) || withdrawalAmount <= 0) { setFormError("Enter a valid withdrawal amount."); return; }
        if (withdrawalAmount > Number(selectedSaver.balance || 0)) { setFormError("Withdrawal amount cannot exceed the saver's current balance."); return; }
        const recorderId = getLoggedInAdminId();
        if (!recorderId) { setFormError("Could not find logged in admin."); return; }
        try {
            setIsSaving(true);
            await recordWithdrawal({ saverId: String(selectedSaver.id), amount: withdrawalAmount, paymentMethod, recorderId: String(recorderId) });
            await refreshSavers();
            closePanel();
            setSuccessMessage("Withdrawal recorded successfully.");
        } catch (error) {
            setFormError(error?.response?.data?.message || error?.response?.data?.error || "Failed to record withdrawal.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleRecordLoanDisbursement = async () => {
        resetMessages();
        const { borrowerName, borrowerPhoneNumber, borrowerEmail, principal, interestRate, startDate, durationDays, repaymentFrequency } = loanDisbursementForm;
        if (!borrowerName.trim() || !borrowerPhoneNumber.trim() || !principal || !interestRate || !startDate || !durationDays || !repaymentFrequency) {
            setFormError("All required fields must be filled."); return;
        }
        const parsedPrincipal = Number(principal);
        const parsedInterestRate = Number(interestRate);
        const parsedDurationDays = Number(durationDays);
        if (Number.isNaN(parsedPrincipal) || parsedPrincipal <= 0) { setFormError("Enter a valid principal amount."); return; }
        if (Number.isNaN(parsedInterestRate) || parsedInterestRate < 0) { setFormError("Enter a valid interest rate."); return; }
        if (Number.isNaN(parsedDurationDays) || parsedDurationDays <= 0) { setFormError("Enter a valid duration in days."); return; }
        if (startDate < today) { setFormError("Start date cannot be in the past."); return; }
        const approverId = getLoggedInAdminId();
        if (!approverId) { setFormError("Could not find logged in admin."); return; }
        try {
            setIsSaving(true);
            const payload = {
                borrowerName: borrowerName.trim(), borrowerPhoneNumber: borrowerPhoneNumber.trim(),
                borrowerEmail: borrowerEmail.trim(), principal: parsedPrincipal,
                interestRate: parsedInterestRate, startDate,
                durationDays: parsedDurationDays, repaymentFrequency,
                approverId: String(approverId),
            };
            const response = await recordLoanDisbursement(payload);
            const loanId = response?.loanId || response?.id;
            if (!loanId) { setFormError("Loan was recorded but loanId was not returned by backend."); return; }
            setCreatedLoanId(loanId);
            setCollateralAddedCount(0); setGuarantorAddedCount(0);
            setLoans((prev) => [response, ...prev]);
            setData((prev) => ({ ...prev, loans: [response, ...(prev.loans || [])] }));
            setSuccessMessage("Loan disbursement recorded successfully. Add collateral or go next.");
            setLoanFlowStep("collateral");
        } catch (error) {
            setFormError(error?.response?.data?.message || error?.response?.data?.error || error?.message || "Failed to record loan disbursement.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddCollateral = async () => {
        resetMessages();
        if (!createdLoanId) { setFormError("Loan ID is missing. Please record the loan again."); return; }
        const { name, description, location, approximateValue } = collateralForm;
        if (!name.trim() || !description.trim() || !location.trim() || !approximateValue) { setFormError("All collateral fields are required."); return; }
        const parsedApproximateValue = Number(approximateValue);
        if (Number.isNaN(parsedApproximateValue) || parsedApproximateValue <= 0) { setFormError("Enter a valid collateral value."); return; }
        try {
            setIsSaving(true);
            await addCollateral(createdLoanId, { loanId: createdLoanId, name: name.trim(), description: description.trim(), location: location.trim(), approximateValue: parsedApproximateValue });
            setCollateralAddedCount((prev) => prev + 1);
            setCollateralForm({ name: "", description: "", location: "", approximateValue: "" });
            setSuccessMessage("Collateral added successfully. Add another one or go next.");
        } catch (error) {
            setFormError(error?.response?.data?.message || error?.response?.data?.error || error?.message || "Failed to add collateral.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddGuarantor = async () => {
        resetMessages();
        if (!createdLoanId) { setFormError("Loan ID is missing. Please record the loan again."); return; }
        const { firstName, middleName, lastName, phoneNo, address, occupation, placeOfWork } = guarantorForm;
        if (!firstName.trim() || !lastName.trim() || !phoneNo.trim() || !address.trim() || !occupation.trim() || !placeOfWork.trim()) {
            setFormError("All fields except middle name are required."); return;
        }
        try {
            setIsSaving(true);
            await addGuarantor(createdLoanId, { firstName: firstName.trim(), middleName: middleName.trim() || "", lastName: lastName.trim(), loanId: createdLoanId, phoneNo: phoneNo.trim(), address: address.trim(), occupation: occupation.trim(), placeOfWork: placeOfWork.trim() });
            setGuarantorAddedCount((prev) => prev + 1);
            setGuarantorForm({ firstName: "", middleName: "", lastName: "", phoneNo: "", address: "", occupation: "", placeOfWork: "" });
            setSuccessMessage("Guarantor added successfully. Add another one or proceed.");
        } catch (error) {
            setFormError(error?.response?.data?.message || error?.response?.data?.error || error?.message || "Failed to add guarantor.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleProceedToGuarantorStep = () => {
        resetMessages();
        setLoanFlowStep("guarantor");
        setSuccessMessage(collateralAddedCount > 0 ? "Proceed to add guarantor." : "Proceeding without adding collateral.");
    };

    const handleFinishLoanFlow = () => {
        resetMessages();
        closePanel();
        setSuccessMessage("Loan flow completed successfully.");
    };

    const handleRecordLoanRepayment = async () => {
        resetMessages();
        if (!selectedLoanId || !amount) { setFormError("Select a loan and enter amount."); return; }
        const parsedAmount = Number(amount);
        if (Number.isNaN(parsedAmount) || parsedAmount <= 0) { setFormError("Enter a valid repayment amount."); return; }
        const recorderId = getLoggedInAdminId();
        if (!recorderId) { setFormError("Could not find logged in admin."); return; }
        try {
            setIsSaving(true);
            await recordRepayment({ loanId: selectedLoanId, amountPaid: parsedAmount, paymentMethod, recorderId: String(recorderId) });
            await refreshLoans();
            await refreshSavers();
            closePanel();
            setSuccessMessage("Loan repayment recorded successfully.");
        } catch (error) {
            setFormError(error?.response?.data?.message || error?.response?.data?.error || error?.message || "Failed to record loan repayment.");
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return <div className="text-sm text-muted-foreground">Loading dashboard...</div>;
    }

    // ── render ─────────────────────────────────────────────────────────────────

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
                        <div className="text-2xl font-bold">{activeSaversCount}</div>
                        <p className="text-xs text-muted-foreground">Total balance: {formatCurrency(totalSavings)}</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Active Loans</CardTitle>
                        <HandCoins className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{combinedLoans.length}</div>
                        <p className="text-xs text-muted-foreground">Outstanding: {formatCurrency(totalLoans)}</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Active Investments</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{activeInvestmentsCount}</div>
                        <p className="text-xs text-muted-foreground">Total invested: {formatCurrency(totalInvestments)}</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                        {[
                            { action: QUICK_ACTIONS.REGISTER_SAVER, icon: <UserPlus className="h-5 w-5" />, label: "Register Saver" },
                            { action: QUICK_ACTIONS.RECORD_DEPOSIT, icon: <ArrowDownToLine className="h-5 w-5" />, label: "Record Deposit" },
                            { action: QUICK_ACTIONS.RECORD_WITHDRAWAL, icon: <ArrowUpFromLine className="h-5 w-5" />, label: "Record Withdrawal" },
                            { action: QUICK_ACTIONS.RECORD_LOAN_DISBURSEMENT, icon: <HandCoins className="h-5 w-5" />, label: "Record Loan Disbursement" },
                            { action: QUICK_ACTIONS.RECORD_LOAN_REPAYMENT, icon: <Receipt className="h-5 w-5" />, label: "Record Loan Repayment" },
                        ].map(({ action, icon, label }) => (
                            <Button key={action} variant="outline" className="h-auto flex-col gap-2 py-4"
                                    onClick={() => openPanel(action)} type="button">
                                {icon}
                                {label}
                            </Button>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* ── modal overlay ── */}
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
                            <button type="button" onClick={closePanel} className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="max-h-[80vh] overflow-y-auto px-6 py-5">
                            {successMessage ? (
                                <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{successMessage}</div>
                            ) : null}
                            {formError ? (
                                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{formError}</div>
                            ) : null}

                            {/* ── Register Saver ── */}
                            {activePanel === QUICK_ACTIONS.REGISTER_SAVER && (
                                <div className="space-y-5">
                                    <div className="flex items-center gap-3">
                                        {["saver", "next_of_kin"].map((step, i) => (
                                            <div key={step} className={`rounded-full px-3 py-1 text-sm font-medium ${registerStep === step ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}>
                                                {i + 1}. {step === "saver" ? "Register Saver" : "Add Next of Kin"}
                                            </div>
                                        ))}
                                    </div>
                                    {registerStep === "saver" && (
                                        <div className="grid gap-4 md:grid-cols-2">
                                            {[
                                                { label: "First Name", name: "firstName" },
                                                { label: "Middle Name", name: "middleName" },
                                                { label: "Last Name", name: "lastName" },
                                                { label: "Email", name: "email", type: "email" },
                                            ].map(({ label, name, type }) => (
                                                <div key={name} className="grid gap-2">
                                                    <Label htmlFor={name}>{label}</Label>
                                                    <Input id={name} name={name} type={type || "text"}
                                                           value={saverForm[name]} onChange={handleSaverInputChange} />
                                                </div>
                                            ))}
                                            <div className="grid gap-2">
                                                <Label>Phone Number</Label>
                                                <PhoneInput international defaultCountry="NG"
                                                            value={saverForm.phoneNo}
                                                            onChange={(val) => setSaverForm((prev) => ({ ...prev, phoneNo: val || "" }))}
                                                            className="flex h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-200"
                                                />
                                            </div>

                                            {/* WhatsApp — E.164 with country picker */}
                                            <div className="grid gap-2">
                                                <Label>WhatsApp Number</Label>
                                                <PhoneInput
                                                    international
                                                    defaultCountry="NG"
                                                    value={saverForm.whatsappNo}
                                                    onChange={(val) => setSaverForm((prev) => ({ ...prev, whatsappNo: val || "" }))}
                                                    className="flex h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-200"
                                                />
                                            </div>

                                            <div className="grid gap-2 md:col-span-2">
                                                <Label htmlFor="address">Address</Label>
                                                <Input id="address" name="address" value={saverForm.address} onChange={handleSaverInputChange} />
                                            </div>
                                            <div className="md:col-span-2 flex justify-end gap-2 pt-2">
                                                <Button variant="outline" onClick={closePanel} type="button">Cancel</Button>
                                                <Button onClick={handleRegisterSaver} disabled={isSaving} type="button"
                                                        className="transition-all duration-200 hover:bg-slate-700 hover:scale-[1.02] hover:shadow-md">
                                                    {isSaving ? "Registering..." : "Continue"}
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    {registerStep === "next_of_kin" && (
                                        <div className="grid gap-4 md:grid-cols-2">
                                            {[
                                                { label: "First Name", name: "firstName", id: "nokFirstName" },
                                                { label: "Middle Name", name: "middleName", id: "nokMiddleName" },
                                                { label: "Last Name", name: "lastName", id: "nokLastName" },
                                                { label: "Relationship", name: "relationship", id: "nokRelationship" },
                                            ].map(({ label, name, id }) => (
                                                <div key={name} className="grid gap-2">
                                                    <Label htmlFor={id}>{label}</Label>
                                                    <Input id={id} name={name} value={nextOfKinForm[name]} onChange={handleNextOfKinInputChange} />
                                                </div>
                                            ))}
                                            <div className="grid gap-2">
                                                <Label htmlFor="nokPhoneNo">Phone Number</Label>
                                                <PhoneInput international defaultCountry="NG"
                                                            value={nextOfKinForm.phoneNo}
                                                            onChange={(val) => setNextOfKinForm((prev) => ({ ...prev, phoneNo: val || "" }))}
                                                            className="flex h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-200"
                                                />
                                            </div>
                                            <div className="grid gap-2 md:col-span-2">
                                                <Label htmlFor="nokAddress">Address</Label>
                                                <Input id="nokAddress" name="address" value={nextOfKinForm.address} onChange={handleNextOfKinInputChange} />
                                            </div>
                                            <div className="md:col-span-2 flex justify-end gap-2 pt-2">
                                                <Button variant="outline" onClick={() => { setFormError(""); setRegisterStep("saver"); }} type="button">
                                                    Back
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    type="button"
                                                    onClick={() => {
                                                        closePanel();
                                                        setSuccessMessage("Saver registered successfully.");
                                                    }}
                                                >
                                                    Skip &amp; Finish
                                                </Button>
                                                <Button
                                                    onClick={handleAddNextOfKin}
                                                    disabled={isSaving}
                                                    type="button"
                                                    className="transition-all duration-200 hover:bg-slate-700 hover:scale-[1.02] hover:shadow-md"
                                                >
                                                    {isSaving ? "Saving..." : "Add Next of Kin"}
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ── Deposit / Withdrawal ── */}
                            {(activePanel === QUICK_ACTIONS.RECORD_DEPOSIT || activePanel === QUICK_ACTIONS.RECORD_WITHDRAWAL) && (
                                <div className="grid gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="dashboard-saver-search">Search Saver</Label>
                                        <div className="relative">
                                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                            <Input id="dashboard-saver-search" value={saverSearch}
                                                   onChange={(e) => { setSaverSearch(e.target.value); setSelectedSaver(null); }}
                                                   className="pl-10" placeholder="Type saver name to search" />
                                        </div>
                                        {saverSearch.trim() && !selectedSaver && (
                                            <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200">
                                                {filteredSavers.length === 0 ? (
                                                    <div className="px-4 py-3 text-sm text-slate-500">No matching saver found.</div>
                                                ) : filteredSavers.map((saver) => (
                                                    <button key={saver.id} type="button"
                                                            onClick={() => { setSelectedSaver(saver); setSaverSearch(saver.name); }}
                                                            className="flex w-full px-4 py-3 text-left text-sm transition hover:bg-slate-50">
                                                        {saver.name}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Selected Saver</Label>
                                        <Input value={selectedSaver ? `${selectedSaver.name} — Balance: ${formatCurrency(selectedSaver.balance)}` : ""} disabled />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="dashboard-amount">Amount</Label>
                                        <Input id="dashboard-amount" inputMode="decimal" value={formatNumberWithCommas(amount)} onChange={handleMoneyInputChange(setAmount)} placeholder="e.g. 500,000" />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="paymentMethod">Payment Method</Label>
                                        <select id="paymentMethod" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200">
                                            {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                                        </select>
                                    </div>
                                    <div className="flex justify-end gap-2 pt-2">
                                        <Button variant="outline" onClick={closePanel} type="button">Cancel</Button>
                                        <Button onClick={activePanel === QUICK_ACTIONS.RECORD_DEPOSIT ? handleRecordDeposit : handleRecordWithdrawal}
                                                disabled={isSaving} type="button" className="transition-all duration-200 hover:bg-slate-700 hover:scale-[1.02] hover:shadow-md">
                                            {isSaving
                                                ? activePanel === QUICK_ACTIONS.RECORD_DEPOSIT ? "Recording..." : "Processing..."
                                                : activePanel === QUICK_ACTIONS.RECORD_DEPOSIT ? "Record Deposit" : "Record Withdrawal"}
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* ── Loan Disbursement ── */}
                            {activePanel === QUICK_ACTIONS.RECORD_LOAN_DISBURSEMENT && (
                                <div className="space-y-5">
                                    {loanFlowStep === "disbursement" && (
                                        <>
                                            <div className="grid gap-4 md:grid-cols-2">
                                                <div className="grid gap-2">
                                                    <Label htmlFor="borrowerName">Borrower Name <span className="text-red-500">*</span></Label>
                                                    <Input id="borrowerName" name="borrowerName" placeholder="e.g. John Doe" value={loanDisbursementForm.borrowerName} onChange={handleLoanDisbursementInputChange} />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label>Phone Number <span className="text-red-500">*</span></Label>
                                                    <PhoneInput international defaultCountry="NG"
                                                                value={loanDisbursementForm.borrowerPhoneNumber}
                                                                onChange={(val) => setLoanDisbursementForm((prev) => ({ ...prev, borrowerPhoneNumber: val || "" }))}
                                                                className="flex h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-200"
                                                    />
                                                </div>
                                                <div className="grid gap-2 md:col-span-2">
                                                    <Label htmlFor="borrowerEmail">Email Address</Label>
                                                    <Input id="borrowerEmail" name="borrowerEmail" type="email" placeholder="e.g. john.doe@example.com" value={loanDisbursementForm.borrowerEmail} onChange={handleLoanDisbursementInputChange} />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label htmlFor="principal">Principal Amount (₦) <span className="text-red-500">*</span></Label>
                                                    <Input id="principal" name="principal" inputMode="decimal" placeholder="e.g. 500,000" value={formatNumberWithCommas(loanDisbursementForm.principal)} onChange={handleLoanDisbursementInputChange} />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label htmlFor="interestRate">Interest Rate (%) <span className="text-red-500">*</span></Label>
                                                    <Input id="interestRate" name="interestRate" type="number" min="0" step="0.01" placeholder="e.g. 12.5" value={loanDisbursementForm.interestRate} onChange={handleLoanDisbursementInputChange} />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label htmlFor="startDate">Start Date <span className="text-red-500">*</span></Label>
                                                    <Input id="startDate" name="startDate" type="date" min={today} value={loanDisbursementForm.startDate} onChange={handleLoanDisbursementInputChange} />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label htmlFor="durationDays">Duration (Days) <span className="text-red-500">*</span></Label>
                                                    <Input id="durationDays" name="durationDays" type="number" min="1" placeholder="e.g. 180" value={loanDisbursementForm.durationDays} onChange={handleLoanDisbursementInputChange} />
                                                </div>
                                                <div className="grid gap-2 md:col-span-2">
                                                    <Label htmlFor="repaymentFrequency">Repayment Frequency <span className="text-red-500">*</span></Label>
                                                    <select id="repaymentFrequency" name="repaymentFrequency" value={loanDisbursementForm.repaymentFrequency} onChange={handleLoanDisbursementInputChange} className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200">
                                                        {REPAYMENT_FREQUENCIES.map((freq) => <option key={freq.value} value={freq.value}>{freq.label}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="flex justify-end gap-2 pt-2">
                                                <Button variant="outline" onClick={closePanel} type="button">Cancel</Button>
                                                <Button onClick={handleRecordLoanDisbursement} disabled={isSaving} type="button" className="transition-all duration-200 hover:bg-slate-700 hover:scale-[1.02] hover:shadow-md">
                                                    {isSaving ? "Recording..." : "Record Loan Disbursement"}
                                                </Button>
                                            </div>
                                        </>
                                    )}
                                    {loanFlowStep === "collateral" && (
                                        <>
                                            <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">Loan recorded successfully</div>
                                            <div className="grid gap-4 md:grid-cols-2">
                                                <div className="grid gap-2">
                                                    <Label htmlFor="collateralName">Collateral Name</Label>
                                                    <Input id="collateralName" name="name" value={collateralForm.name} onChange={handleCollateralInputChange} />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label htmlFor="collateralValue">Approximate Value (₦)</Label>
                                                    <Input id="collateralValue" name="approximateValue" inputMode="decimal" placeholder="e.g. 500,000" value={formatNumberWithCommas(collateralForm.approximateValue)} onChange={handleCollateralInputChange} />
                                                </div>
                                                <div className="grid gap-2 md:col-span-2">
                                                    <Label htmlFor="collateralDescription">Description</Label>
                                                    <Input id="collateralDescription" name="description" value={collateralForm.description} onChange={handleCollateralInputChange} />
                                                </div>
                                                <div className="grid gap-2 md:col-span-2">
                                                    <Label htmlFor="collateralLocation">Location</Label>
                                                    <Input id="collateralLocation" name="location" value={collateralForm.location} onChange={handleCollateralInputChange} />
                                                </div>
                                            </div>
                                            <div className="flex justify-end gap-2 pt-2">
                                                <Button variant="outline" type="button" onClick={handleProceedToGuarantorStep}>
                                                    {collateralAddedCount > 0 ? "Go Next" : "Proceed Without Adding Collateral"}
                                                </Button>
                                                <Button onClick={handleAddCollateral} disabled={isSaving} type="button" className="transition-all duration-200 hover:bg-slate-700 hover:scale-[1.02] hover:shadow-md">
                                                    {isSaving ? "Saving..." : "Add Collateral"}
                                                </Button>
                                            </div>
                                        </>
                                    )}
                                    {loanFlowStep === "guarantor" && (
                                        <>
                                            <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">Register guarantor</div>
                                            <div className="grid gap-4 md:grid-cols-2">
                                                {[
                                                    { label: "First Name",  name: "firstName",  id: "guarantorFirstName"  },
                                                    { label: "Middle Name", name: "middleName", id: "guarantorMiddleName" },
                                                    { label: "Last Name",   name: "lastName",   id: "guarantorLastName"   },
                                                ].map(({ label, name, id }) => (
                                                    <div key={name} className="grid gap-2">
                                                        <Label htmlFor={id}>{label}</Label>
                                                        <Input id={id} name={name} value={guarantorForm[name]} onChange={handleGuarantorInputChange} />
                                                    </div>
                                                ))}
                                                <div className="grid gap-2">
                                                    <Label htmlFor="guarantorPhoneNo">Phone Number</Label>
                                                    <PhoneInput international defaultCountry="NG"
                                                                value={guarantorForm.phoneNo}
                                                                onChange={(val) => setGuarantorForm((prev) => ({ ...prev, phoneNo: val || "" }))}
                                                                className="flex h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-200"
                                                    />
                                                </div>
                                                <div className="grid gap-2 md:col-span-2">
                                                    <Label htmlFor="guarantorAddress">Address</Label>
                                                    <Input id="guarantorAddress" name="address" value={guarantorForm.address} onChange={handleGuarantorInputChange} />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label htmlFor="guarantorOccupation">Occupation</Label>
                                                    <Input id="guarantorOccupation" name="occupation" value={guarantorForm.occupation} onChange={handleGuarantorInputChange} />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label htmlFor="guarantorPlaceOfWork">Place of Work</Label>
                                                    <Input id="guarantorPlaceOfWork" name="placeOfWork" value={guarantorForm.placeOfWork} onChange={handleGuarantorInputChange} />
                                                </div>
                                            </div>
                                            <div className="flex justify-end gap-2 pt-2">
                                                <Button variant="outline" type="button" onClick={handleFinishLoanFlow}>
                                                    {guarantorAddedCount > 0 ? "Proceed" : "Proceed Without Adding Guarantor"}
                                                </Button>
                                                <Button onClick={handleAddGuarantor} disabled={isSaving} type="button"
                                                        className="transition-all duration-200 hover:bg-slate-700 hover:scale-[1.02] hover:shadow-md">
                                                    {isSaving ? "Saving..." : "Add Guarantor"}
                                                </Button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* ── Loan Repayment ── */}
                            {activePanel === QUICK_ACTIONS.RECORD_LOAN_REPAYMENT && (
                                <div className="grid gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="loanRepaymentTarget">Select Loan</Label>
                                        <select id="loanRepaymentTarget" value={selectedLoanId} onChange={(e) => setSelectedLoanId(e.target.value)} className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200">
                                            <option value="">Select loan</option>
                                            {combinedLoans.map((loan, index) => (
                                                <option key={loan.id || loan.loanId || index} value={loan.id || loan.loanId}>
                                                    {loan.borrowerName || loan.name || "Unknown Borrower"} —{" "}
                                                    {formatCurrency(Number(loan.remainingBalance ?? loan.balance ?? loan.amount ?? 0))}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="loanRepaymentAmount">Amount</Label>
                                        <Input id="loanRepaymentAmount" inputMode="decimal" value={formatNumberWithCommas(amount)} onChange={handleMoneyInputChange(setAmount)} placeholder="e.g. 500,000" />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="loanRepaymentPaymentMethod">Payment Method</Label>
                                        <select id="loanRepaymentPaymentMethod" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200">
                                            {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                                        </select>
                                    </div>
                                    <div className="flex justify-end gap-2 pt-2">
                                        <Button variant="outline" onClick={closePanel} type="button">Cancel</Button>
                                        <Button onClick={handleRecordLoanRepayment} disabled={isSaving} type="button" className="transition-all duration-200 hover:bg-slate-700 hover:scale-[1.02] hover:shadow-md">
                                            {isSaving ? "Recording..." : "Record Loan Repayment"}
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