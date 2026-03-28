import { useEffect, useMemo, useState, useCallback } from "react";
import {
    Search, UserPlus, ArrowDownToLine, ArrowUpFromLine,
    ChevronLeft, ChevronRight, X, AlertTriangle, Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "../ui/dialog";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "../ui/table";
import { formatCurrency, formatDate } from "../../lib/store";
import { registerSaver, getActiveCustomers, addNextOfKin } from "../../services/customerServices";
import {
    recordDeposit,
    recordWithdrawal,
    getSavingsTransactions,
    cancelDeposit,
    cancelWithdrawal,
} from "../../services/adminServices";
import { getLoggedInAdminId } from "../../lib/auth";
import { PAYMENT_METHODS } from "../../constants/paymentMethods";

// ─── constants ────────────────────────────────────────────────────────────────

const SAVERS_PER_PAGE = 10;
const TX_PER_PAGE = 5;

// shared nav-button style
const NAV_BTN =
    "flex items-center gap-1 rounded-lg border border-slate-400 bg-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-800 hover:bg-slate-300 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed";

// ─── helpers ──────────────────────────────────────────────────────────────────

function mapSaver(customer) {
    return {
        id: customer.id,
        name: [customer.firstName, customer.middleName, customer.lastName]
            .filter(Boolean).join(" "),
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
        address: customer.address || "",
        nextOfKin: customer.nextOfKin || null,
    };
}

function formatNumberWithCommas(value) {
    if (value === null || value === undefined) return "";
    const s = String(value).replace(/,/g, "").replace(/[^\d.]/g, "");
    if (!s) return "";
    const [whole, decimal] = s.split(".");
    const formatted = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return decimal !== undefined ? `${formatted}.${decimal}` : formatted;
}

function sanitizeMoneyInput(value) {
    const cleaned = String(value).replace(/,/g, "").replace(/[^\d.]/g, "");
    const parts = cleaned.split(".");
    if (parts.length <= 1) return cleaned;
    return `${parts[0]}.${parts.slice(1).join("")}`;
}

/**
 * Fetch ALL pages from a Spring-paginated endpoint.
 * Handles both plain arrays and Page objects { content, totalPages }.
 */
async function fetchAllPages(fetchFn, pageSize = 50) {
    let page = 0;
    let allItems = [];
    let totalPages = 1;
    do {
        const res = await fetchFn(page, pageSize);
        const items = Array.isArray(res) ? res : (res?.content ?? []);
        totalPages = res?.totalPages ?? 1;
        allItems = [...allItems, ...items];
        page++;
    } while (page < totalPages);
    return allItems;
}

// ─── NOK modal ────────────────────────────────────────────────────────────────

function NokModal({ saver, onClose, onSaved }) {
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({
        firstName: "", middleName: "", lastName: "",
        phoneNo: "", address: "", relationship: "",
        customerId: saver.id,
    });
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const nok = saver.nextOfKin;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((p) => ({ ...p, [name]: value }));
    };

    const handleSave = async () => {
        setError(""); setSuccess("");
        if (!form.firstName.trim() || !form.lastName.trim() || !form.phoneNo.trim() ||
            !form.address.trim() || !form.relationship.trim()) {
            setError("All fields except middle name are required.");
            return;
        }
        try {
            setIsSaving(true);
            await addNextOfKin({ ...form, customerId: saver.id });
            setSuccess("Next of kin saved successfully.");
            setShowForm(false);
            onSaved?.();
        } catch (err) {
            setError(err?.response?.data?.message || err?.response?.data?.error || "Failed to save next of kin.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open onOpenChange={onClose}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Next of Kin — {saver.name}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2 text-sm">
                    {success && <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-green-700">{success}</div>}
                    {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-600">{error}</div>}

                    {!showForm && nok && (
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-x-6 gap-y-2 rounded-xl bg-slate-50 p-4">
                                <div>
                                    <span className="text-slate-500">Name</span>
                                    <p className="font-medium">{[nok.firstName, nok.middleName, nok.lastName].filter(Boolean).join(" ")}</p>
                                </div>
                                <div>
                                    <span className="text-slate-500">Relationship</span>
                                    <p className="font-medium">{nok.relationship || "—"}</p>
                                </div>
                                <div>
                                    <span className="text-slate-500">Phone</span>
                                    <p className="font-medium">{nok.phoneNo || "—"}</p>
                                </div>
                                <div className="col-span-2">
                                    <span className="text-slate-500">Address</span>
                                    <p className="font-medium">{nok.address || "—"}</p>
                                </div>
                            </div>
                            <div className="flex justify-end">
                                <Button variant="outline" size="sm" type="button"
                                        onClick={() => { setShowForm(true); setError(""); setSuccess(""); }}>
                                    Update Next of Kin
                                </Button>
                            </div>
                        </div>
                    )}

                    {!showForm && !nok && (
                        <div className="space-y-3">
                            <p className="rounded-xl bg-slate-50 px-4 py-3 text-slate-400">
                                No next of kin on record for this saver.
                            </p>
                            <div className="flex justify-end">
                                <Button size="sm" type="button"
                                        onClick={() => { setShowForm(true); setError(""); }}>
                                    Add Next of Kin
                                </Button>
                            </div>
                        </div>
                    )}

                    {showForm && (
                        <div className="grid gap-3 rounded-xl border border-slate-200 p-4 md:grid-cols-2">
                            <p className="md:col-span-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                                {nok ? "Update Next of Kin" : "Add Next of Kin"}
                            </p>
                            {[
                                { label: "First Name", name: "firstName" },
                                { label: "Middle Name", name: "middleName" },
                                { label: "Last Name", name: "lastName" },
                                { label: "Phone Number", name: "phoneNo" },
                                { label: "Relationship", name: "relationship" },
                            ].map(({ label, name }) => (
                                <div key={name} className="grid gap-1">
                                    <Label htmlFor={`nok-${name}`}>{label}</Label>
                                    <Input id={`nok-${name}`} name={name} value={form[name]} onChange={handleChange} />
                                </div>
                            ))}
                            <div className="grid gap-1 md:col-span-2">
                                <Label htmlFor="nok-address">Address</Label>
                                <Input id="nok-address" name="address" value={form.address} onChange={handleChange} />
                            </div>
                            <div className="md:col-span-2 flex justify-end gap-2">
                                <Button variant="outline" type="button"
                                        onClick={() => { setShowForm(false); setError(""); }}>
                                    Cancel
                                </Button>
                                <Button type="button" onClick={handleSave} disabled={isSaving}>
                                    {isSaving ? "Saving..." : "Save Next of Kin"}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ─── Saver detail modal ───────────────────────────────────────────────────────

function SaverDetailModal({ saver, onClose }) {
    return (
        <Dialog open onOpenChange={onClose}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>{saver.name}</DialogTitle>
                </DialogHeader>
                <div className="py-2 text-sm">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Personal Information
                    </p>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-xl bg-slate-50 p-4">
                        <div><span className="text-slate-500">Balance</span><p className="font-medium text-green-700">{formatCurrency(saver.balance)}</p></div>
                        <div><span className="text-slate-500">Status</span><p className="font-medium capitalize">{saver.status}</p></div>
                        <div><span className="text-slate-500">Phone</span><p className="font-medium">{saver.phone || "—"}</p></div>
                        <div><span className="text-slate-500">WhatsApp</span><p className="font-medium">{saver.whatsappNo || "—"}</p></div>
                        <div className="col-span-2"><span className="text-slate-500">Email</span><p className="font-medium">{saver.email || "—"}</p></div>
                        <div className="col-span-2"><span className="text-slate-500">Address</span><p className="font-medium">{saver.address || "—"}</p></div>
                        <div><span className="text-slate-500">Registered</span><p className="font-medium">{formatDate(saver.createdAt)}</p></div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ─── Cancel transaction modal ─────────────────────────────────────────────────

function CancelTransactionModal({ transaction, onConfirm, onClose, isSaving }) {
    const [reason, setReason] = useState("");
    const [error, setError] = useState("");

    const isDeposit = String(transaction.transactionType || transaction.type || "")
        .toUpperCase() === "DEPOSIT";

    const handleConfirm = () => {
        if (!reason.trim()) { setError("Please provide a cancellation reason."); return; }
        onConfirm(reason.trim());
    };

    return (
        <Dialog open onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-red-600">
                        <AlertTriangle className="h-5 w-5" />
                        Cancel Transaction
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    <p className="text-sm text-slate-600">
                        You are about to cancel a{" "}
                        <span className="font-semibold">{isDeposit ? "deposit" : "withdrawal"}</span>{" "}
                        of <span className="font-semibold">{formatCurrency(transaction.amount)}</span>.
                        This action cannot be undone.
                    </p>
                    <div className="grid gap-2">
                        <Label htmlFor="cancelReason">Reason for cancellation</Label>
                        <Input
                            id="cancelReason"
                            value={reason}
                            onChange={(e) => { setReason(e.target.value); setError(""); }}
                            placeholder="e.g. Wrong amount entered"
                        />
                        {error && <p className="text-xs text-red-500">{error}</p>}
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} type="button">Back</Button>
                    <Button onClick={handleConfirm} disabled={isSaving} type="button"
                            className="bg-red-600 text-white hover:bg-red-700">
                        {isSaving ? "Cancelling..." : "Confirm Cancel"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ─── Deposit / Withdrawal modal ───────────────────────────────────────────────

function TransactionModal({ mode, savers, onClose, onSuccess }) {
    const [saverSearch, setSaverSearch] = useState("");
    const [selectedSaver, setSelectedSaver] = useState(null);
    const [amount, setAmount] = useState("");
    const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS?.[0]?.value || "CASH");
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState("");

    const filtered = useMemo(() => {
        const q = saverSearch.trim().toLowerCase();
        if (!q) return savers;
        return savers.filter((s) =>
            [s.name, s.accountId, s.phone].filter(Boolean).join(" ").toLowerCase().includes(q)
        );
    }, [savers, saverSearch]);

    const handleSubmit = async () => {
        setError("");
        if (!selectedSaver || !amount) { setError("Please select a saver and enter amount."); return; }
        const parsedAmount = Number(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) { setError("Enter a valid amount."); return; }
        if (mode === "withdrawal" && parsedAmount > Number(selectedSaver.balance || 0)) {
            setError("Withdrawal amount exceeds saver's balance."); return;
        }
        const recorderId = getLoggedInAdminId();
        if (!recorderId) { setError("Could not find logged in admin."); return; }
        try {
            setIsSaving(true);
            const payload = {
                saverId: String(selectedSaver.id),
                amount: parsedAmount,
                paymentMethod,
                recorderId: String(recorderId),
            };
            if (mode === "deposit") await recordDeposit(payload);
            else await recordWithdrawal(payload);
            onSuccess();
        } catch (err) {
            setError(err?.response?.data?.message || err?.response?.data?.error || `Failed to record ${mode}.`);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open onOpenChange={onClose}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>{mode === "deposit" ? "Record Deposit" : "Record Withdrawal"}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-2">
                    {error && (
                        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
                    )}
                    <div className="grid gap-2">
                        <Label>Search Saver</Label>
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <Input
                                value={saverSearch}
                                onChange={(e) => { setSaverSearch(e.target.value); setSelectedSaver(null); }}
                                className="pl-10"
                                placeholder="Type name, phone or account ID"
                            />
                        </div>
                        {saverSearch.trim() && !selectedSaver && (
                            <div className="max-h-44 overflow-y-auto rounded-xl border border-slate-200">
                                {filtered.length === 0 ? (
                                    <div className="px-4 py-3 text-sm text-slate-500">No matching saver found.</div>
                                ) : filtered.map((s) => (
                                    <button key={s.id} type="button"
                                            onClick={() => { setSelectedSaver(s); setSaverSearch(s.name); }}
                                            className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-slate-50">
                                        <span>{s.name}</span>
                                        <span className="text-xs text-slate-400">{formatCurrency(s.balance)}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="grid gap-2">
                        <Label>Selected Saver</Label>
                        <Input
                            value={selectedSaver ? `${selectedSaver.name} — Balance: ${formatCurrency(selectedSaver.balance)}` : ""}
                            disabled className="bg-slate-50"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label>Amount (₦)</Label>
                        <Input
                            inputMode="decimal"
                            value={formatNumberWithCommas(amount)}
                            onChange={(e) => setAmount(sanitizeMoneyInput(e.target.value))}
                            placeholder="e.g. 50,000"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label>Payment Method</Label>
                        <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}
                                className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200">
                            {PAYMENT_METHODS.map((m) => (
                                <option key={m.value} value={m.value}>{m.label}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} type="button">Cancel</Button>
                    <Button onClick={handleSubmit} disabled={isSaving} type="button">
                        {isSaving
                            ? (mode === "deposit" ? "Recording..." : "Processing...")
                            : (mode === "deposit" ? "Record Deposit" : "Record Withdrawal")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ─── Register Saver modal — 2-step flow ───────────────────────────────────────

function RegisterSaverModal({ onClose, onSuccess }) {
    const [step, setStep] = useState("saver");
    const [registeredCustomerId, setRegisteredCustomerId] = useState("");
    const [saverForm, setSaverForm] = useState({
        firstName: "", middleName: "", lastName: "",
        email: "", phoneNo: "", whatsappNo: "", address: "",
    });
    const [nokForm, setNokForm] = useState({
        firstName: "", middleName: "", lastName: "",
        phoneNo: "", address: "", relationship: "", customerId: "",
    });
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const handleSaverChange = (e) => {
        const { name, value } = e.target;
        setSaverForm((p) => ({ ...p, [name]: value }));
    };
    const handleNokChange = (e) => {
        const { name, value } = e.target;
        setNokForm((p) => ({ ...p, [name]: value }));
    };

    const handleRegisterSaver = async () => {
        setError(""); setSuccess("");
        if (!saverForm.firstName.trim() || !saverForm.lastName.trim() || !saverForm.address.trim()) {
            setError("First name, last name and address are required.");
            return;
        }
        try {
            setIsSaving(true);
            const response = await registerSaver(saverForm);
            const customerId = response?.id || "";
            setRegisteredCustomerId(customerId);
            setNokForm((p) => ({ ...p, customerId }));
            setSuccess("Saver registered! Now add next of kin.");
            setStep("next_of_kin");
        } catch (err) {
            setError(err?.response?.data?.message || err?.response?.data?.error || "Failed to register saver.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddNextOfKin = async () => {
        setError(""); setSuccess("");
        if (!nokForm.firstName.trim() || !nokForm.lastName.trim() || !nokForm.phoneNo.trim() ||
            !nokForm.address.trim() || !nokForm.relationship.trim()) {
            setError("All fields except middle name are required.");
            return;
        }
        if (!nokForm.customerId && !registeredCustomerId) {
            setError("Customer ID is missing. Please start over.");
            return;
        }
        try {
            setIsSaving(true);
            await addNextOfKin({ ...nokForm, customerId: nokForm.customerId || registeredCustomerId });
            onSuccess();
        } catch (err) {
            setError(err?.response?.data?.message || err?.response?.data?.error || "Failed to add next of kin.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open onOpenChange={onClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Register New Saver</DialogTitle>
                </DialogHeader>
                <div className="flex items-center gap-3">
                    {[
                        { key: "saver", label: "1. Register Saver" },
                        { key: "next_of_kin", label: "2. Add Next of Kin" },
                    ].map(({ key, label }) => (
                        <div key={key} className={`rounded-full px-3 py-1 text-sm font-medium ${
                            step === key ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500"
                        }`}>{label}</div>
                    ))}
                </div>
                {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
                {success && <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{success}</div>}

                {step === "saver" && (
                    <div className="grid gap-4 py-2 md:grid-cols-2">
                        {[
                            { label: "First Name", name: "firstName", required: true },
                            { label: "Middle Name", name: "middleName" },
                            { label: "Last Name", name: "lastName", required: true },
                            { label: "Email", name: "email", type: "email" },
                            { label: "Phone Number", name: "phoneNo" },
                            { label: "WhatsApp Number", name: "whatsappNo" },
                        ].map(({ label, name, type, required }) => (
                            <div key={name} className="grid gap-2">
                                <Label htmlFor={`reg-${name}`}>
                                    {label}{required && <span className="ml-1 text-red-500">*</span>}
                                </Label>
                                <Input id={`reg-${name}`} name={name} type={type || "text"}
                                       value={saverForm[name]} onChange={handleSaverChange} />
                            </div>
                        ))}
                        <div className="grid gap-2 md:col-span-2">
                            <Label htmlFor="reg-address">Address <span className="text-red-500">*</span></Label>
                            <Input id="reg-address" name="address" value={saverForm.address} onChange={handleSaverChange} />
                        </div>
                        <div className="md:col-span-2 flex justify-end gap-2 pt-2">
                            <Button variant="outline" onClick={onClose} type="button">Cancel</Button>
                            <Button onClick={handleRegisterSaver} disabled={isSaving} type="button">
                                {isSaving ? "Registering..." : "Continue"}
                            </Button>
                        </div>
                    </div>
                )}

                {step === "next_of_kin" && (
                    <div className="grid gap-4 py-2 md:grid-cols-2">
                        {[
                            { label: "First Name", name: "firstName" },
                            { label: "Middle Name", name: "middleName" },
                            { label: "Last Name", name: "lastName" },
                            { label: "Phone Number", name: "phoneNo" },
                            { label: "Relationship", name: "relationship" },
                        ].map(({ label, name }) => (
                            <div key={name} className="grid gap-2">
                                <Label htmlFor={`nok2-${name}`}>{label}</Label>
                                <Input id={`nok2-${name}`} name={name}
                                       value={nokForm[name]} onChange={handleNokChange} />
                            </div>
                        ))}
                        <div className="grid gap-2 md:col-span-2">
                            <Label htmlFor="nok2-address">Address</Label>
                            <Input id="nok2-address" name="address" value={nokForm.address} onChange={handleNokChange} />
                        </div>
                        <div className="md:col-span-2 flex justify-end gap-2 pt-2">
                            <Button variant="outline" onClick={onSuccess} type="button">Skip &amp; Finish</Button>
                            <Button onClick={handleAddNextOfKin} disabled={isSaving} type="button">
                                {isSaving ? "Saving..." : "Finish"}
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

// ─── Main Savings component ───────────────────────────────────────────────────

export default function Savings({ setData, initialAction }) {
    // ── savers ───────────────────────────────────────────────────────────────
    const [allSavers, setAllSavers] = useState([]);
    const [isLoadingSavers, setIsLoadingSavers] = useState(false);
    const [showSaversList, setShowSaversList] = useState(false);
    const [saverPage, setSaverPage] = useState(1);
    const [saverSearch, setSaverSearch] = useState("");

    // ── transactions — all fetched upfront, paged client-side (same as savers) ──
    const [allTransactions, setAllTransactions] = useState([]);
    const [isLoadingTx, setIsLoadingTx] = useState(false);
    const [txPage, setTxPage] = useState(1);
    const [txSearch, setTxSearch] = useState("");
    const [txDateFrom, setTxDateFrom] = useState("");
    const [txDateTo, setTxDateTo] = useState("");

    // ── ui state ─────────────────────────────────────────────────────────────
    const [modal, setModal] = useState(null);
    const [detailSaver, setDetailSaver] = useState(null);
    const [nokSaver, setNokSaver] = useState(null);
    const [cancelTarget, setCancelTarget] = useState(null);
    const [isCancelling, setIsCancelling] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [globalError, setGlobalError] = useState("");

    // ── loaders ──────────────────────────────────────────────────────────────

    const loadSavers = useCallback(async () => {
        try {
            setIsLoadingSavers(true);
            setGlobalError("");
            const all = await fetchAllPages(getActiveCustomers, 50);
            const mapped = all.map(mapSaver);
            setAllSavers(mapped);
            setData?.((prev) => ({ ...prev, savers: mapped }));
        } catch (err) {
            setGlobalError(err?.response?.data?.message || "Failed to load savers.");
        } finally {
            setIsLoadingSavers(false);
        }
    }, [setData]);

    const loadTransactions = useCallback(async () => {
        try {
            setIsLoadingTx(true);
            const all = await fetchAllPages(getSavingsTransactions, 50);
            // newest first
            all.sort((a, b) => {
                const da = new Date(a.createdAt || a.date || a.transactionDate || 0).getTime();
                const db = new Date(b.createdAt || b.date || b.transactionDate || 0).getTime();
                return db - da;
            });
            setAllTransactions(all);
            setTxPage(1);
        } catch {
            // silently fail — endpoint may not exist yet
        } finally {
            setIsLoadingTx(false);
        }
    }, []);

    useEffect(() => {
        loadSavers();
        loadTransactions();
    }, [loadSavers, loadTransactions]);

    useEffect(() => {
        if (initialAction === "register-saver") setModal("register");
        if (initialAction === "deposit") setModal("deposit");
    }, [initialAction]);

    // ── savers — derived ─────────────────────────────────────────────────────

    const filteredSavers = useMemo(() => {
        const q = saverSearch.trim().toLowerCase();
        const active = allSavers.filter((s) => {
            const st = String(s.status || "").toLowerCase();
            return st === "active" || st === "approved";
        });
        if (!q) return active;
        return active.filter((s) =>
            [s.name, s.accountId, s.phone].filter(Boolean).join(" ").toLowerCase().includes(q)
        );
    }, [allSavers, saverSearch]);

    const saverTotalPages = Math.max(1, Math.ceil(filteredSavers.length / SAVERS_PER_PAGE));
    const pagedSavers = filteredSavers.slice(
        (saverPage - 1) * SAVERS_PER_PAGE,
        saverPage * SAVERS_PER_PAGE,
    );

    useEffect(() => { setSaverPage(1); }, [saverSearch]);
    useEffect(() => { setTxPage(1); }, [txSearch, txDateFrom, txDateTo]);

    const activeSavers = useMemo(() => allSavers.filter((s) => {
        const st = String(s.status || "").toLowerCase();
        return st === "active" || st === "approved";
    }), [allSavers]);

    // ── transactions — derived (identical pattern to savers) ─────────────────

    const filteredTransactions = useMemo(() => {
        let list = allTransactions;
        const q = txSearch.trim().toLowerCase();
        if (q) {
            list = list.filter((tx) =>
                (tx.saverName || tx.customerName || "").toLowerCase().includes(q)
            );
        }
        if (txDateFrom) {
            const from = new Date(txDateFrom).setHours(0, 0, 0, 0);
            list = list.filter((tx) => {
                const d = new Date(tx.createdAt || tx.date || tx.transactionDate || 0).getTime();
                return d >= from;
            });
        }
        if (txDateTo) {
            const to = new Date(txDateTo).setHours(23, 59, 59, 999);
            list = list.filter((tx) => {
                const d = new Date(tx.createdAt || tx.date || tx.transactionDate || 0).getTime();
                return d <= to;
            });
        }
        return list;
    }, [allTransactions, txSearch, txDateFrom, txDateTo]);

    const txTotalPages = Math.max(1, Math.ceil(filteredTransactions.length / TX_PER_PAGE));
    const pagedTransactions = filteredTransactions.slice(
        (txPage - 1) * TX_PER_PAGE,
        txPage * TX_PER_PAGE,
    );

    // ── cancel ───────────────────────────────────────────────────────────────

    const handleCancelTransaction = async (reason) => {
        if (!cancelTarget) return;
        const recorderId = getLoggedInAdminId();
        if (!recorderId) { setGlobalError("Could not find logged in admin."); return; }
        try {
            setIsCancelling(true);
            const { transaction, type } = cancelTarget;
            const txId = String(transaction.id || transaction.savingsId || transaction.transactionId);
            const payload = { savingsId: txId, recorderId: String(recorderId), cancellationReason: reason };
            if (type === "deposit") await cancelDeposit(payload);
            else await cancelWithdrawal(payload);
            setAllTransactions((prev) =>
                prev.map((t) =>
                    (t.id || t.savingsId || t.transactionId) ===
                    (transaction.id || transaction.savingsId || transaction.transactionId)
                        ? { ...t, cancelled: true, cancellationReason: reason }
                        : t
                )
            );
            setCancelTarget(null);
            setSuccessMessage("Transaction cancelled successfully.");
            setTimeout(() => setSuccessMessage(""), 4000);
        } catch (err) {
            setGlobalError(err?.response?.data?.message || "Failed to cancel transaction.");
        } finally {
            setIsCancelling(false);
        }
    };

    // ── modal callbacks ──────────────────────────────────────────────────────

    const handleTransactionSuccess = async () => {
        setModal(null);
        setSuccessMessage("Transaction recorded successfully.");
        setTimeout(() => setSuccessMessage(""), 4000);
        await loadSavers();
        await loadTransactions();
    };

    const handleRegisterSuccess = async () => {
        setModal(null);
        setSuccessMessage("Saver registered successfully.");
        setTimeout(() => setSuccessMessage(""), 4000);
        await loadSavers();
    };

    // ─────────────────────────────────────────────────────────────────────────

    return (
        <div className="space-y-6">
            {successMessage && (
                <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                    {successMessage}
                </div>
            )}
            {globalError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                    {globalError}
                </div>
            )}

            {/* header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="text-2xl font-bold text-foreground">Savings</h2>
                    <p className="text-muted-foreground">Manage savers, deposits, and withdrawals</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => setModal("register")} type="button">
                        <UserPlus className="mr-2 h-4 w-4" /> Register Saver
                    </Button>
                    <Button variant="outline" onClick={() => setModal("deposit")} type="button">
                        <ArrowDownToLine className="mr-2 h-4 w-4" /> Record Deposit
                    </Button>
                    <Button variant="outline" onClick={() => setModal("withdrawal")} type="button">
                        <ArrowUpFromLine className="mr-2 h-4 w-4" /> Record Withdrawal
                    </Button>
                </div>
            </div>

            {/* ── Active Savers ── */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Active Savers</CardTitle>
                    <Button variant="outline" size="sm" type="button"
                            onClick={() => setShowSaversList((v) => !v)}>
                        <Users className="mr-2 h-4 w-4" />
                        {showSaversList ? "Hide Savers" : "View Active Savers"}
                    </Button>
                </CardHeader>

                {showSaversList && (
                    <CardContent className="space-y-4">
                        <div className="relative max-w-sm">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <Input value={saverSearch} onChange={(e) => setSaverSearch(e.target.value)}
                                   className="pl-10" placeholder="Search by name, phone or account ID" />
                        </div>

                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Phone</TableHead>
                                    <TableHead>Registered</TableHead>
                                    <TableHead className="text-right">Balance</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoadingSavers ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                                            Loading savers...
                                        </TableCell>
                                    </TableRow>
                                ) : pagedSavers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                                            No active savers found.
                                        </TableCell>
                                    </TableRow>
                                ) : pagedSavers.map((saver) => (
                                    <TableRow key={saver.id} className="hover:bg-slate-50">
                                        <TableCell className="font-medium">{saver.name}</TableCell>
                                        <TableCell>{saver.phone || "—"}</TableCell>
                                        <TableCell>{formatDate(saver.createdAt)}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(saver.balance)}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center justify-end gap-4">
                                                <button type="button" onClick={() => setDetailSaver(saver)}
                                                        className="text-xs text-slate-500 underline underline-offset-2 hover:text-slate-800">
                                                    View
                                                </button>
                                                <button type="button" onClick={() => setNokSaver(saver)}
                                                        className="text-xs text-slate-500 underline underline-offset-2 hover:text-slate-800">
                                                    Next of Kin
                                                </button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>

                        {filteredSavers.length > SAVERS_PER_PAGE && (
                            <div className="flex items-center justify-between pt-2 text-sm text-slate-500">
                                <span>
                                    Showing {(saverPage - 1) * SAVERS_PER_PAGE + 1}–
                                    {Math.min(saverPage * SAVERS_PER_PAGE, filteredSavers.length)} of {filteredSavers.length} savers
                                </span>
                                <div className="flex items-center gap-2">
                                    <button type="button" disabled={saverPage === 1}
                                            onClick={() => setSaverPage((p) => p - 1)} className={NAV_BTN}>
                                        <ChevronLeft className="h-4 w-4" /> Prev
                                    </button>
                                    <span className="px-1">{saverPage} / {saverTotalPages}</span>
                                    <button type="button" disabled={saverPage === saverTotalPages}
                                            onClick={() => setSaverPage((p) => p + 1)} className={NAV_BTN}>
                                        Next <ChevronRight className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                )}
            </Card>

            {/* ── Transaction Summary — hidden while savers list is open ── */}
            {!showSaversList && (
                <Card>
                    <CardHeader>
                        <CardTitle>Transaction Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* search controls */}
                        <div className="flex flex-wrap gap-3">
                            <div className="relative flex-1 min-w-[180px]">
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <Input
                                    value={txSearch}
                                    onChange={(e) => setTxSearch(e.target.value)}
                                    className="pl-10"
                                    placeholder="Search by saver name"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <Input
                                    type="date"
                                    value={txDateFrom}
                                    onChange={(e) => setTxDateFrom(e.target.value)}
                                    className="w-36 text-sm"
                                    title="From date"
                                />
                                <span className="text-slate-400 text-sm">to</span>
                                <Input
                                    type="date"
                                    value={txDateTo}
                                    onChange={(e) => setTxDateTo(e.target.value)}
                                    className="w-36 text-sm"
                                    title="To date"
                                />
                                {(txDateFrom || txDateTo || txSearch) && (
                                    <button
                                        type="button"
                                        onClick={() => { setTxSearch(""); setTxDateFrom(""); setTxDateTo(""); }}
                                        className="text-xs text-slate-500 underline underline-offset-2 hover:text-slate-800 whitespace-nowrap"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>
                        </div>

                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Saver</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Method</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    <TableHead />
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoadingTx ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                                            Loading transactions...
                                        </TableCell>
                                    </TableRow>
                                ) : pagedTransactions.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                                            No transactions found.
                                        </TableCell>
                                    </TableRow>
                                ) : pagedTransactions.map((tx) => {
                                    const txId = tx.id || tx.savingsId || tx.transactionId;
                                    const isCancelled = Boolean(tx.cancelled || tx.status === "CANCELLED");
                                    const isDeposit = String(tx.transactionType || tx.type || "")
                                        .toUpperCase() === "DEPOSIT";
                                    return (
                                        <TableRow key={txId} className={isCancelled ? "opacity-60" : ""}>
                                            <TableCell className={isCancelled ? "line-through text-slate-400" : "font-medium"}>
                                                {tx.saverName || tx.customerName || "—"}
                                            </TableCell>
                                            <TableCell>
                                                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                                                    isDeposit ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                                                }`}>
                                                    {isDeposit ? "Deposit" : "Withdrawal"}
                                                </span>
                                            </TableCell>
                                            <TableCell className={isCancelled ? "line-through text-slate-400" : ""}>
                                                {formatDate(tx.createdAt || tx.date || tx.transactionDate)}
                                            </TableCell>
                                            <TableCell className={isCancelled ? "line-through text-slate-400" : ""}>
                                                {tx.paymentMethod || "—"}
                                            </TableCell>
                                            <TableCell className={`text-right ${isCancelled ? "line-through text-slate-400" : ""}`}>
                                                {formatCurrency(tx.amount)}
                                            </TableCell>
                                            <TableCell>
                                                {!isCancelled ? (
                                                    <button type="button"
                                                            onClick={() => setCancelTarget({
                                                                transaction: tx,
                                                                type: isDeposit ? "deposit" : "withdrawal",
                                                            })}
                                                            className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700">
                                                        <X className="h-3.5 w-3.5" /> Cancel
                                                    </button>
                                                ) : (
                                                    <span className="text-xs italic text-slate-400">Cancelled</span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>

                        {/* pagination — mirrors savers exactly */}
                        <div className="flex items-center justify-between pt-2 text-sm text-slate-500">
                            <span>
                                {filteredTransactions.length === 0
                                    ? "No transactions"
                                    : `Showing ${(txPage - 1) * TX_PER_PAGE + 1}–${Math.min(txPage * TX_PER_PAGE, filteredTransactions.length)} of ${filteredTransactions.length} transactions`}
                            </span>
                            <div className="flex items-center gap-2">
                                <button type="button" disabled={txPage === 1 || isLoadingTx}
                                        onClick={() => setTxPage((p) => p - 1)} className={NAV_BTN}>
                                    <ChevronLeft className="h-4 w-4" /> Prev
                                </button>
                                <span className="px-1">{txPage} / {txTotalPages}</span>
                                <button type="button" disabled={txPage === txTotalPages || isLoadingTx}
                                        onClick={() => setTxPage((p) => p + 1)} className={NAV_BTN}>
                                    Next <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* ── modals ── */}
            {(modal === "deposit" || modal === "withdrawal") && (
                <TransactionModal mode={modal} savers={activeSavers}
                                  onClose={() => setModal(null)} onSuccess={handleTransactionSuccess} />
            )}
            {modal === "register" && (
                <RegisterSaverModal onClose={() => setModal(null)} onSuccess={handleRegisterSuccess} />
            )}
            {detailSaver && (
                <SaverDetailModal saver={detailSaver} onClose={() => setDetailSaver(null)} />
            )}
            {nokSaver && (
                <NokModal saver={nokSaver} onClose={() => setNokSaver(null)} onSaved={loadSavers} />
            )}
            {cancelTarget && (
                <CancelTransactionModal
                    transaction={cancelTarget.transaction}
                    onConfirm={handleCancelTransaction}
                    onClose={() => setCancelTarget(null)}
                    isSaving={isCancelling}
                />
            )}
        </div>
    );
}
