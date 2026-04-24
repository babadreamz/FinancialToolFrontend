import { useEffect, useMemo, useState, useCallback } from "react";
import {
    Search, TrendingUp, ArrowDownToLine,
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
import {
    getActiveInvestments,
    getActiveInvestors,
    registerInvestor,
    recordInvestment,
    cancelInvestment,
    recordInvestmentReturn,
    cancelInvestmentReturn,
} from "../../services/adminServices";
import { getLoggedInAdminId } from "../../lib/auth";

import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
// ─── constants ────────────────────────────────────────────────────────────────

const INVESTMENTS_PER_PAGE = 10;
const SUMMARY_PER_PAGE = 5;
const RETURNS_PER_PAGE = 5;

const NAV_BTN =
    "flex items-center gap-1 rounded-lg border border-slate-400 bg-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-800 hover:bg-slate-300 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed";

const INVESTOR_TYPES = [
    { value: "INDIVIDUAL",  label: "Individual"  },
    { value: "INSTITUTIONAL", label: "Institutional" },
];

// InvestmentStatus enum values
const INVESTMENT_STATUSES = [
    { value: "",           label: "All Statuses" },
    { value: "ACTIVE",     label: "Active"       },
    { value: "PAID_OFF",   label: "Paid Off"     },
    { value: "CANCELLED",  label: "Cancelled"    },
];

function statusBadgeClass(status) {
    switch (String(status || "").toUpperCase()) {
        case "ACTIVE":   return "bg-green-100 text-green-700";
        case "PAID_OFF": return "bg-blue-100 text-blue-700";
        case "CANCELLED": return "bg-red-100 text-red-600";
        default:         return "bg-slate-100 text-slate-500";
    }
}

function friendlyStatus(status) {
    switch (String(status || "").toUpperCase()) {
        case "ACTIVE":    return "Active";
        case "PAID_OFF":  return "Paid Off";
        case "CANCELLED": return "Cancelled";
        default:          return status || "—";
    }
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function mapInvestment(inv) {
    return {
        id:                 inv.id               || "",
        // InvestmentDto now embeds InvestorDto under `investor`
        investorId:         (inv.investor?.id)       || inv.investorId   || "",
        investorName:       (inv.investor?.fullName)  || inv.investorName || "—",
        amountInvested:     Number(inv.amountInvested  || 0),
        interestRate:       Number(inv.interestRate    || 0),
        expectedReturn:     Number(inv.expectedReturn  || 0),
        remainingReturn:    Number(inv.remainingReturn || 0),
        status:             inv.investmentStatus  || inv.status || "ACTIVE",
        startDate:          inv.startDate         || "",
        maturityDate:       inv.maturityDate      || "",
        createdAt:          inv.createdAt         || "",
        cancellationReason: inv.cancellationReason || "",
        cancelledAt:        inv.cancelledAt        || "",
        // returns embedded in DTO if the backend includes them
        returns: Array.isArray(inv.returns)
            ? inv.returns
            : Array.isArray(inv.investmentReturns)
                ? inv.investmentReturns
                : [],
    };
}

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

function getTodayDate() {
    return new Date().toISOString().split("T")[0];
}

// ─── Cancel Investment Modal ──────────────────────────────────────────────────

function CancelInvestmentModal({ investment, onConfirm, onClose, isSaving }) {
    const [reason, setReason] = useState("");
    const [error,  setError]  = useState("");

    return (
        <Dialog open onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-red-600">
                        <AlertTriangle className="h-5 w-5" /> Cancel Investment
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    <p className="text-sm text-slate-600">
                        You are about to cancel the investment of{" "}
                        <span className="font-semibold">{formatCurrency(investment.amountInvested)}</span>
                        {" "}for <span className="font-semibold">{investment.investorName}</span>.
                        This action cannot be undone.
                    </p>
                    <div className="grid gap-2">
                        <Label htmlFor="cancelInvReason">Reason for cancellation</Label>
                        <Input
                            id="cancelInvReason"
                            value={reason}
                            onChange={(e) => { setReason(e.target.value); setError(""); }}
                            placeholder="e.g. Wrong amount entered"
                        />
                        {error && <p className="text-xs text-red-500">{error}</p>}
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} type="button">Back</Button>
                    <Button
                        onClick={() => {
                            if (!reason.trim()) { setError("Please provide a cancellation reason."); return; }
                            onConfirm(reason.trim());
                        }}
                        disabled={isSaving} type="button"
                        className="bg-red-600 text-white hover:bg-red-700">
                        {isSaving ? "Cancelling..." : "Confirm Cancel"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ─── Cancel Return Modal ──────────────────────────────────────────────────────

function CancelReturnModal({ investmentReturn, onConfirm, onClose, isSaving }) {
    const [reason, setReason] = useState("");
    const [error,  setError]  = useState("");

    return (
        <Dialog open onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-red-600">
                        <AlertTriangle className="h-5 w-5" /> Cancel Investment Return
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    <p className="text-sm text-slate-600">
                        You are about to cancel a return of{" "}
                        <span className="font-semibold">
                            {formatCurrency(Number(investmentReturn.returnAmount || 0))}
                        </span>. This action cannot be undone.
                    </p>
                    <div className="grid gap-2">
                        <Label htmlFor="cancelRetReason">Reason for cancellation</Label>
                        <Input
                            id="cancelRetReason"
                            value={reason}
                            onChange={(e) => { setReason(e.target.value); setError(""); }}
                            placeholder="e.g. Wrong amount entered"
                        />
                        {error && <p className="text-xs text-red-500">{error}</p>}
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} type="button">Back</Button>
                    <Button
                        onClick={() => {
                            if (!reason.trim()) { setError("Please provide a cancellation reason."); return; }
                            onConfirm(reason.trim());
                        }}
                        disabled={isSaving} type="button"
                        className="bg-red-600 text-white hover:bg-red-700">
                        {isSaving ? "Cancelling..." : "Confirm Cancel"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ─── Investment Returns Modal ─────────────────────────────────────────────────
// Uses returns embedded in InvestmentDto — same pattern as loanRepayments in LoanDto.

function InvestmentReturnsModal({ investment, onClose, onReturnCancelled }) {
    // investmentReturns is embedded in InvestmentDto — no extra round trip needed
    const [returns,      setReturns]      = useState(() =>
        [...(investment.investmentReturns || investment.returns || [])].sort((a, b) =>
            new Date(b.returnDate || b.createdAt || 0).getTime() -
            new Date(a.returnDate || a.createdAt || 0).getTime()
        )
    );
    const [page,         setPage]         = useState(1);
    const [cancelTarget, setCancelTarget] = useState(null);
    const [isCancelling, setIsCancelling] = useState(false);
    const [error,        setError]        = useState("");
    const [successMsg,   setSuccessMsg]   = useState("");

    const totalPages = Math.max(1, Math.ceil(returns.length / RETURNS_PER_PAGE));
    const paged = returns.slice(
        (page - 1) * RETURNS_PER_PAGE,
        page * RETURNS_PER_PAGE,
    );

    const handleCancelReturn = async (reason) => {
        if (!cancelTarget) return;
        const recorderId = getLoggedInAdminId();
        if (!recorderId) { setError("Could not find logged in admin."); return; }
        try {
            setIsCancelling(true);
            await cancelInvestmentReturn({
                investmentReturnId: String(cancelTarget.id || cancelTarget.returnId || ""),
                cancellationReason: reason,
                recorderId:         String(recorderId),
            });
            setReturns((prev) =>
                prev.map((r) =>
                    (r.id || r.returnId) === (cancelTarget.id || cancelTarget.returnId)
                        ? { ...r, cancelled: true }
                        : r
                )
            );
            setCancelTarget(null);
            setSuccessMsg("Return cancelled successfully.");
            setTimeout(() => setSuccessMsg(""), 4000);
            onReturnCancelled?.();
        } catch (err) {
            setError(err?.response?.data?.message || err?.response?.data?.error || "Failed to cancel return.");
        } finally {
            setIsCancelling(false);
        }
    };

    return (
        <>
            <Dialog open onOpenChange={onClose}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>
                            Returns — {investment.investorName}
                            <span className="ml-2 text-sm font-normal text-slate-400">
                                ({formatCurrency(investment.amountInvested)})
                            </span>
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        {successMsg && (
                            <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                                {successMsg}
                            </div>
                        )}
                        {error && (
                            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                                {error}
                            </div>
                        )}

                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Return Date</TableHead>
                                    <TableHead className="text-right">Return Amount</TableHead>
                                    <TableHead className="text-right">Return %</TableHead>
                                    <TableHead />
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paged.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                                            No returns recorded yet.
                                        </TableCell>
                                    </TableRow>
                                ) : paged.map((r, i) => {
                                    const rId = r.id || r.returnId || i;
                                    const isCancelled = Boolean(
                                        r.cancelled ||
                                        String(r.status || "").toUpperCase() === "CANCELLED"
                                    );
                                    return (
                                        <TableRow key={rId} className={isCancelled ? "opacity-60" : ""}>
                                            <TableCell className={isCancelled ? "line-through text-slate-400" : ""}>
                                                {formatDate(r.returnDate || r.createdAt)}
                                            </TableCell>
                                            <TableCell className={`text-right ${isCancelled ? "line-through text-slate-400" : "font-medium"}`}>
                                                {formatCurrency(Number(r.returnAmount || 0))}
                                            </TableCell>
                                            <TableCell className={`text-right ${isCancelled ? "text-slate-400" : ""}`}>
                                                {r.returnPercentage != null
                                                    ? `${Number(r.returnPercentage).toFixed(2)}%`
                                                    : "—"}
                                            </TableCell>
                                            <TableCell>
                                                {!isCancelled ? (
                                                    <button type="button"
                                                            onClick={() => { setError(""); setCancelTarget(r); }}
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

                        {returns.length > RETURNS_PER_PAGE && (
                            <div className="flex items-center justify-between pt-1 text-sm text-slate-500">
                                <span>
                                    Showing {(page - 1) * RETURNS_PER_PAGE + 1}–
                                    {Math.min(page * RETURNS_PER_PAGE, returns.length)} of {returns.length}
                                </span>
                                <div className="flex items-center gap-2">
                                    <button type="button" disabled={page === 1}
                                            onClick={() => setPage((p) => p - 1)} className={NAV_BTN}>
                                        <ChevronLeft className="h-4 w-4" /> Prev
                                    </button>
                                    <span className="px-1">{page} / {totalPages}</span>
                                    <button type="button" disabled={page === totalPages}
                                            onClick={() => setPage((p) => p + 1)} className={NAV_BTN}>
                                        Next <ChevronRight className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={onClose}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {cancelTarget && (
                <CancelReturnModal
                    investmentReturn={cancelTarget}
                    onConfirm={handleCancelReturn}
                    onClose={() => setCancelTarget(null)}
                    isSaving={isCancelling}
                />
            )}
        </>
    );
}

// ─── Register Investor Modal ──────────────────────────────────────────────────

function RegisterInvestorModal({ onClose, onSuccess }) {
    const [form, setForm] = useState({
        fullName: "", email: "", phoneNo: "", investorType: "INDIVIDUAL",
    });
    const [isSaving, setIsSaving] = useState(false);
    const [error,    setError]    = useState("");

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((p) => ({ ...p, [name]: value }));
    };

    const handleSave = async () => {
        setError("");
        if (!form.fullName.trim()) {
            setError("Full name is required."); return;
        }
        try {
            setIsSaving(true);
            await registerInvestor(form);
            onSuccess();
        } catch (err) {
            setError(err?.response?.data?.message || err?.response?.data?.error || "Failed to register investor.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open onOpenChange={onClose}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Register New Investor</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-2 md:grid-cols-2">
                    {error && (
                        <div className="md:col-span-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                            {error}
                        </div>
                    )}
                    <div className="grid gap-2 md:col-span-2">
                        <Label htmlFor="inv-fullName">
                            Full Name <span className="text-red-500">*</span>
                        </Label>
                        <Input id="inv-fullName" name="fullName"
                               value={form.fullName} onChange={handleChange}
                               placeholder="e.g. Acme Ltd or John Doe" />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="inv-email">Email</Label>
                        <Input id="inv-email" name="email" type="email"
                               value={form.email} onChange={handleChange} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="inv-phoneNo">Phone Number</Label>
                        <PhoneInput international defaultCountry="NG"
                                    value={form.phoneNo}
                                    onChange={(val) => setForm((p) => ({ ...p, phoneNo: val || "" }))}
                                    className="flex h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-200"
                        />
                    </div>
                    <div className="grid gap-2 md:col-span-2">
                        <Label htmlFor="inv-investorType">Investor Type</Label>
                        <select id="inv-investorType" name="investorType" value={form.investorType}
                                onChange={handleChange}
                                className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200">
                            {INVESTOR_TYPES.map((t) => (
                                <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="md:col-span-2 flex justify-end gap-2 pt-2">
                        <Button variant="outline" onClick={onClose} type="button">Cancel</Button>
                        <Button onClick={handleSave} disabled={isSaving} type="button">
                            {isSaving ? "Registering..." : "Register Investor"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

// ─── Record Investment Modal ──────────────────────────────────────────────────
// Derives the investor dropdown from already-loaded investments (investorId +
// investorName are both present in InvestmentDto) — no separate endpoint needed.

function RecordInvestmentModal({ investors, onClose, onSuccess }) {
    const today = getTodayDate();
    const [investorSearch,   setInvestorSearch]   = useState("");
    const [selectedInvestor, setSelectedInvestor] = useState(null);
    const [form, setForm] = useState({
        amountInvested: "", interestRate: "", startDate: "", maturityDate: "",
    });
    const [isSaving, setIsSaving] = useState(false);
    const [error,    setError]    = useState("");

    const filtered = useMemo(() => {
        const q = investorSearch.trim().toLowerCase();
        if (!q) return [];
        return investors.filter((inv) =>
            (inv.fullName || "").toLowerCase().includes(q)
        );
    }, [investors, investorSearch]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((p) => ({
            ...p,
            [name]: (name === "amountInvested" || name === "interestRate")
                ? sanitizeMoneyInput(value) : value,
        }));
    };

    const handleSubmit = async () => {
        setError("");
        if (!selectedInvestor) { setError("Please select an investor."); return; }
        if (!form.amountInvested || !form.interestRate || !form.startDate || !form.maturityDate) {
            setError("All fields are required."); return;
        }
        const amount = Number(form.amountInvested);
        const rate   = Number(form.interestRate);
        if (isNaN(amount) || amount <= 0) { setError("Enter a valid investment amount."); return; }
        if (isNaN(rate)   || rate   <  0) { setError("Enter a valid interest rate."); return; }
        if (form.maturityDate <= form.startDate) {
            setError("Maturity date must be after start date."); return;
        }
        const recorderId = getLoggedInAdminId();
        if (!recorderId) { setError("Could not find logged in admin."); return; }
        try {
            setIsSaving(true);
            await recordInvestment({
                investorId:     String(selectedInvestor.id),  // InvestorDto.id
                amountInvested: amount,
                interestRate:   rate,
                startDate:      form.startDate,
                maturityDate:   form.maturityDate,
                recorderId:     String(recorderId),
            });
            onSuccess();
        } catch (err) {
            setError(err?.response?.data?.message || err?.response?.data?.error || "Failed to record investment.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open onOpenChange={onClose}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Record Investment</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-2">
                    {error && (
                        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
                    )}

                    {/* investor typeahead — derived from already-loaded investments */}
                    <div className="grid gap-2">
                        <Label>Search Investor</Label>
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <Input value={investorSearch}
                                   onChange={(e) => { setInvestorSearch(e.target.value); setSelectedInvestor(null); }}
                                   className="pl-10" placeholder="Type investor name" />
                        </div>
                        {investorSearch.trim() && !selectedInvestor && (
                            <div className="max-h-44 overflow-y-auto rounded-xl border border-slate-200">
                                {filtered.length === 0 ? (
                                    <div className="px-4 py-3 text-sm text-slate-500">
                                        No matching investor found. Register them first.
                                    </div>
                                ) : filtered.map((inv) => (
                                    <button key={inv.id} type="button"
                                            onClick={() => { setSelectedInvestor(inv); setInvestorSearch(inv.fullName); }}
                                            className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-slate-50">
                                        <span>{inv.fullName}</span>
                                        <span className="text-xs text-slate-400 capitalize">
                                            {String(inv.investorType || "").toLowerCase()}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="grid gap-2">
                        <Label>Selected Investor</Label>
                        <Input value={selectedInvestor ? selectedInvestor.fullName : ""}
                               disabled className="bg-slate-50" />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="grid gap-2">
                            <Label>Amount Invested (₦)</Label>
                            <Input name="amountInvested" inputMode="decimal"
                                   value={formatNumberWithCommas(form.amountInvested)}
                                   onChange={handleChange} placeholder="e.g. 500,000" />
                        </div>
                        <div className="grid gap-2">
                            <Label>Interest Rate (%)</Label>
                            <Input name="interestRate" type="number" min="0" step="0.01"
                                   value={form.interestRate} onChange={handleChange} placeholder="e.g. 12.5" />
                        </div>
                        <div className="grid gap-2">
                            <Label>Start Date</Label>
                            <Input name="startDate" type="date" min={today}
                                   value={form.startDate} onChange={handleChange} />
                        </div>
                        <div className="grid gap-2">
                            <Label>Maturity Date</Label>
                            <Input name="maturityDate" type="date"
                                   min={form.startDate || today}
                                   value={form.maturityDate} onChange={handleChange} />
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} type="button">Cancel</Button>
                    <Button onClick={handleSubmit} disabled={isSaving} type="button">
                        {isSaving ? "Recording..." : "Record Investment"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ─── Record Return Modal ──────────────────────────────────────────────────────

function RecordReturnModal({ activeInvestments, onClose, onSuccess }) {
    const [invSearch,    setInvSearch]    = useState("");
    const [selectedInv,  setSelectedInv]  = useState(null);
    const [returnAmount, setReturnAmount] = useState("");
    const [isSaving,     setIsSaving]     = useState(false);
    const [error,        setError]        = useState("");

    const filtered = useMemo(() => {
        const q = invSearch.trim().toLowerCase();
        if (!q) return activeInvestments;
        return activeInvestments.filter((inv) =>
            (inv.investorName || "").toLowerCase().includes(q)
        );
    }, [activeInvestments, invSearch]);

    const handleSubmit = async () => {
        setError("");
        if (!selectedInv || !returnAmount) {
            setError("Please select an investment and enter return amount."); return;
        }
        const amount = Number(returnAmount);
        if (isNaN(amount) || amount <= 0) { setError("Enter a valid return amount."); return; }
        const recorderId = getLoggedInAdminId();
        if (!recorderId) { setError("Could not find logged in admin."); return; }
        try {
            setIsSaving(true);
            await recordInvestmentReturn({
                investmentId: String(selectedInv.id),
                returnAmount: amount,
                recorderId:   String(recorderId),
            });
            onSuccess();
        } catch (err) {
            setError(err?.response?.data?.message || err?.response?.data?.error || "Failed to record return.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open onOpenChange={onClose}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Record Investment Return</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-2">
                    {error && (
                        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
                    )}
                    <div className="grid gap-2">
                        <Label>Search Investment</Label>
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <Input value={invSearch}
                                   onChange={(e) => { setInvSearch(e.target.value); setSelectedInv(null); }}
                                   className="pl-10" placeholder="Type investor name" />
                        </div>
                        {invSearch.trim() && !selectedInv && (
                            <div className="max-h-44 overflow-y-auto rounded-xl border border-slate-200">
                                {filtered.length === 0 ? (
                                    <div className="px-4 py-3 text-sm text-slate-500">No matching investment found.</div>
                                ) : filtered.map((inv) => (
                                    <button key={inv.id} type="button"
                                            onClick={() => { setSelectedInv(inv); setInvSearch(inv.investorName); }}
                                            className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-slate-50">
                                        <span>{inv.investorName}</span>
                                        <span className="text-xs text-slate-400">
                                            {formatCurrency(inv.remainingReturn)} remaining
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="grid gap-2">
                        <Label>Selected Investment</Label>
                        <Input
                            value={selectedInv
                                ? `${selectedInv.investorName} — ${formatCurrency(selectedInv.remainingReturn)} remaining`
                                : ""}
                            disabled className="bg-slate-50"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label>Return Amount (₦)</Label>
                        <Input inputMode="decimal"
                               value={formatNumberWithCommas(returnAmount)}
                               onChange={(e) => setReturnAmount(sanitizeMoneyInput(e.target.value))}
                               placeholder="e.g. 60,000" />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} type="button">Cancel</Button>
                    <Button onClick={handleSubmit} disabled={isSaving} type="button">
                        {isSaving ? "Recording..." : "Record Return"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ─── Main Investments component ───────────────────────────────────────────────

export default function Investments({ setData, initialAction }) {
    // ── data ──────────────────────────────────────────────────────────────────
    const [allInvestments, setAllInvestments] = useState([]);
    const [allInvestors,   setAllInvestors]   = useState([]);
    const [isLoading,      setIsLoading]      = useState(false);

    // ── active list ───────────────────────────────────────────────────────────
    const [showList,   setShowList]   = useState(false);
    const [listPage,   setListPage]   = useState(1);
    const [listSearch, setListSearch] = useState("");

    // ── summary ───────────────────────────────────────────────────────────────
    const [summaryPage,     setSummaryPage]     = useState(1);
    const [summarySearch,   setSummarySearch]   = useState("");
    const [summaryStatus,   setSummaryStatus]   = useState("");   // "" = all
    const [summaryDateFrom, setSummaryDateFrom] = useState("");
    const [summaryDateTo,   setSummaryDateTo]   = useState("");

    // ── ui ────────────────────────────────────────────────────────────────────
    const [modal,          setModal]          = useState(null); // "register"|"invest"|"return"
    const [returnsTarget,  setReturnsTarget]  = useState(null);
    const [cancelTarget,   setCancelTarget]   = useState(null);
    const [isCancelling,   setIsCancelling]   = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [globalError,    setGlobalError]    = useState("");

    // ── loader ────────────────────────────────────────────────────────────────

    const loadInvestments = useCallback(async () => {
        try {
            setIsLoading(true);
            setGlobalError("");
            const all = await fetchAllPages(getActiveInvestments, 50);
            all.sort((a, b) =>
                new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
            );
            const mapped = all.map(mapInvestment);
            setAllInvestments(mapped);
            setData?.((prev) => ({ ...prev, investments: mapped }));
        } catch (err) {
            setGlobalError(err?.response?.data?.message || "Failed to load investments.");
        } finally {
            setIsLoading(false);
        }
    }, [setData]);

    const loadInvestors = useCallback(async () => {
        try {
            const res = await getActiveInvestors();
            const list = Array.isArray(res) ? res : (res?.content ?? []);
            setAllInvestors(list.filter((inv) => inv.active !== false));
        } catch {
            // non-fatal
        }
    }, []);

    useEffect(() => {
        loadInvestments();
        loadInvestors();
    }, [loadInvestments, loadInvestors]);

    useEffect(() => {
        if (initialAction === "invest")   setModal("invest");
        if (initialAction === "return")   setModal("return");
        if (initialAction === "register") setModal("register");
    }, [initialAction]);

    // allInvestors is fetched fresh from /admin/investors/all on mount

    // ── active list — derived ─────────────────────────────────────────────────

    const filteredList = useMemo(() => {
        const q = listSearch.trim().toLowerCase();
        if (!q) return allInvestments;
        return allInvestments.filter((inv) =>
            (inv.investorName || "").toLowerCase().includes(q)
        );
    }, [allInvestments, listSearch]);

    const listTotalPages = Math.max(1, Math.ceil(filteredList.length / INVESTMENTS_PER_PAGE));
    const pagedList = filteredList.slice(
        (listPage - 1) * INVESTMENTS_PER_PAGE,
        listPage * INVESTMENTS_PER_PAGE,
    );

    useEffect(() => { setListPage(1); }, [listSearch]);
    useEffect(() => { setSummaryPage(1); }, [summarySearch, summaryStatus, summaryDateFrom, summaryDateTo]);

    // ── summary — derived (all statuses, filterable) ──────────────────────────

    const filteredSummary = useMemo(() => {
        let list = allInvestments;
        const q = summarySearch.trim().toLowerCase();
        if (q) {
            list = list.filter((inv) =>
                (inv.investorName || "").toLowerCase().includes(q)
            );
        }
        if (summaryStatus) {
            list = list.filter((inv) =>
                String(inv.status || "").toUpperCase() === summaryStatus
            );
        }
        if (summaryDateFrom) {
            const from = new Date(summaryDateFrom).setHours(0, 0, 0, 0);
            list = list.filter((inv) => new Date(inv.createdAt || 0).getTime() >= from);
        }
        if (summaryDateTo) {
            const to = new Date(summaryDateTo).setHours(23, 59, 59, 999);
            list = list.filter((inv) => new Date(inv.createdAt || 0).getTime() <= to);
        }
        return list;
    }, [allInvestments, summarySearch, summaryStatus, summaryDateFrom, summaryDateTo]);

    const summaryTotalPages = Math.max(1, Math.ceil(filteredSummary.length / SUMMARY_PER_PAGE));
    const pagedSummary = filteredSummary.slice(
        (summaryPage - 1) * SUMMARY_PER_PAGE,
        summaryPage * SUMMARY_PER_PAGE,
    );

    // ── cancel investment ─────────────────────────────────────────────────────

    const handleCancelInvestment = async (reason) => {
        if (!cancelTarget) return;
        const recorderId = getLoggedInAdminId();
        if (!recorderId) { setGlobalError("Could not find logged in admin."); return; }
        try {
            setIsCancelling(true);
            await cancelInvestment({
                investmentId:       String(cancelTarget.id),
                cancellationReason: reason,
                recorderId:         String(recorderId),
            });
            setCancelTarget(null);
            setSuccessMessage("Investment cancelled successfully.");
            setTimeout(() => setSuccessMessage(""), 4000);
            await loadInvestments();
        } catch (err) {
            setGlobalError(
                err?.response?.data?.message ||
                err?.response?.data?.error ||
                "Failed to cancel investment."
            );
        } finally {
            setIsCancelling(false);
        }
    };

    // ── modal callbacks ───────────────────────────────────────────────────────

    const handleRegisterSuccess = async () => {
        setModal(null);
        setSuccessMessage("Investor registered successfully.");
        setTimeout(() => setSuccessMessage(""), 4000);
        // No extra fetch needed — investor name appears on next investment recorded
    };

    const handleInvestmentSuccess = async () => {
        setModal(null);
        setSuccessMessage("Investment recorded successfully.");
        setTimeout(() => setSuccessMessage(""), 4000);
        await loadInvestments();
    };

    const handleReturnSuccess = async () => {
        setModal(null);
        setSuccessMessage("Investment return recorded successfully.");
        setTimeout(() => setSuccessMessage(""), 4000);
        await loadInvestments();
    };

    const hasSummaryFilters = summarySearch || summaryStatus || summaryDateFrom || summaryDateTo;

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
                    <h2 className="text-2xl font-bold text-foreground">Investments</h2>
                    <p className="text-muted-foreground">Manage investors, investments, and returns</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => setModal("register")} type="button">
                        <Users className="mr-2 h-4 w-4" /> Register Investor
                    </Button>
                    <Button variant="outline" onClick={() => setModal("invest")} type="button">
                        <TrendingUp className="mr-2 h-4 w-4" /> Record Investment
                    </Button>
                    <Button variant="outline" onClick={() => setModal("return")} type="button">
                        <ArrowDownToLine className="mr-2 h-4 w-4" /> Record Return
                    </Button>
                </div>
            </div>

            {/* ── Active Investments ── */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>All Investments</CardTitle>
                    <Button variant="outline" size="sm" type="button"
                            onClick={() => setShowList((v) => !v)}>
                        <TrendingUp className="mr-2 h-4 w-4" />
                        {showList ? "Hide Investments" : "View All Investments"}
                    </Button>
                </CardHeader>

                {showList && (
                    <CardContent className="space-y-4">
                        <div className="relative max-w-sm">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <Input value={listSearch}
                                   onChange={(e) => setListSearch(e.target.value)}
                                   className="pl-10" placeholder="Search by investor name" />
                        </div>

                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Investor</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Start</TableHead>
                                    <TableHead>Maturity</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    <TableHead className="text-right">Expected Return</TableHead>
                                    <TableHead className="text-right">Remaining</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                                            Loading investments...
                                        </TableCell>
                                    </TableRow>
                                ) : pagedList.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                                            No investments found.
                                        </TableCell>
                                    </TableRow>
                                ) : pagedList.map((inv) => {
                                    const isCancelled = String(inv.status || "").toUpperCase() === "CANCELLED";
                                    return (
                                        <TableRow key={inv.id} className={isCancelled ? "opacity-60" : "hover:bg-slate-50"}>
                                            <TableCell className={`font-medium ${isCancelled ? "line-through text-slate-400" : ""}`}>
                                                {inv.investorName}
                                            </TableCell>
                                            <TableCell>
                                                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(inv.status)}`}>
                                                    {friendlyStatus(inv.status)}
                                                </span>
                                            </TableCell>
                                            <TableCell className={isCancelled ? "text-slate-400" : ""}>{formatDate(inv.startDate)}</TableCell>
                                            <TableCell className={isCancelled ? "text-slate-400" : ""}>{formatDate(inv.maturityDate)}</TableCell>
                                            <TableCell className={`text-right ${isCancelled ? "line-through text-slate-400" : ""}`}>
                                                {formatCurrency(inv.amountInvested)}
                                            </TableCell>
                                            <TableCell className={`text-right font-medium ${isCancelled ? "line-through text-slate-400" : "text-green-700"}`}>
                                                {formatCurrency(inv.expectedReturn)}
                                            </TableCell>
                                            <TableCell className={`text-right font-medium ${isCancelled ? "line-through text-slate-400" : "text-orange-600"}`}>
                                                {formatCurrency(inv.remainingReturn)}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>

                        {filteredList.length > INVESTMENTS_PER_PAGE && (
                            <div className="flex items-center justify-between pt-2 text-sm text-slate-500">
                                <span>
                                    Showing {(listPage - 1) * INVESTMENTS_PER_PAGE + 1}–
                                    {Math.min(listPage * INVESTMENTS_PER_PAGE, filteredList.length)} of {filteredList.length} investments
                                </span>
                                <div className="flex items-center gap-2">
                                    <button type="button" disabled={listPage === 1}
                                            onClick={() => setListPage((p) => p - 1)} className={NAV_BTN}>
                                        <ChevronLeft className="h-4 w-4" /> Prev
                                    </button>
                                    <span className="px-1">{listPage} / {listTotalPages}</span>
                                    <button type="button" disabled={listPage === listTotalPages}
                                            onClick={() => setListPage((p) => p + 1)} className={NAV_BTN}>
                                        Next <ChevronRight className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                )}
            </Card>

            {/* ── Investment Summary — hidden while active list is open ── */}
            {!showList && (
                <Card>
                    <CardHeader>
                        <CardTitle>Investment Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* search + status + date controls */}
                        <div className="flex flex-wrap gap-3">
                            <div className="relative flex-1 min-w-[160px]">
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <Input value={summarySearch}
                                       onChange={(e) => setSummarySearch(e.target.value)}
                                       className="pl-10" placeholder="Search by investor name" />
                            </div>
                            {/* status filter */}
                            <select value={summaryStatus}
                                    onChange={(e) => setSummaryStatus(e.target.value)}
                                    className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200">
                                {INVESTMENT_STATUSES.map((s) => (
                                    <option key={s.value} value={s.value}>{s.label}</option>
                                ))}
                            </select>
                            {/* date range */}
                            <div className="flex items-center gap-2">
                                <Input type="date" value={summaryDateFrom}
                                       onChange={(e) => setSummaryDateFrom(e.target.value)}
                                       className="w-36 text-sm" title="From date" />
                                <span className="text-slate-400 text-sm">to</span>
                                <Input type="date" value={summaryDateTo}
                                       onChange={(e) => setSummaryDateTo(e.target.value)}
                                       className="w-36 text-sm" title="To date" />
                                {hasSummaryFilters && (
                                    <button type="button"
                                            onClick={() => {
                                                setSummarySearch("");
                                                setSummaryStatus("");
                                                setSummaryDateFrom("");
                                                setSummaryDateTo("");
                                            }}
                                            className="text-xs text-slate-500 underline underline-offset-2 hover:text-slate-800 whitespace-nowrap">
                                        Clear
                                    </button>
                                )}
                            </div>
                        </div>

                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Investor</TableHead>
                                    <TableHead>Recorded</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    <TableHead className="text-right">Remaining</TableHead>
                                    <TableHead />
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                                            Loading investments...
                                        </TableCell>
                                    </TableRow>
                                ) : pagedSummary.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                                            No investments found.
                                        </TableCell>
                                    </TableRow>
                                ) : pagedSummary.map((inv) => {
                                    const isCancelled = String(inv.status || "").toUpperCase() === "CANCELLED";
                                    return (
                                        <TableRow key={inv.id}
                                                  className={isCancelled ? "opacity-60" : "hover:bg-slate-50"}>
                                            <TableCell className={`font-medium ${isCancelled ? "line-through text-slate-400" : ""}`}>
                                                {inv.investorName}
                                            </TableCell>
                                            <TableCell className={isCancelled ? "line-through text-slate-400" : ""}>
                                                {formatDate(inv.createdAt)}
                                            </TableCell>
                                            <TableCell>
                                                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(inv.status)}`}>
                                                    {friendlyStatus(inv.status)}
                                                </span>
                                            </TableCell>
                                            <TableCell className={`text-right ${isCancelled ? "line-through text-slate-400" : ""}`}>
                                                {formatCurrency(inv.amountInvested)}
                                            </TableCell>
                                            <TableCell className={`text-right font-medium ${isCancelled ? "line-through text-slate-400" : "text-orange-600"}`}>
                                                {formatCurrency(inv.remainingReturn)}
                                            </TableCell>
                                            <TableCell>
                                                {!isCancelled ? (
                                                    <div className="flex items-center justify-end gap-3">
                                                        <button type="button"
                                                                onClick={() => setReturnsTarget(inv)}
                                                                className="text-xs text-slate-500 underline underline-offset-2 hover:text-slate-800 whitespace-nowrap">
                                                            Returns
                                                        </button>
                                                        <button type="button"
                                                                onClick={() => setCancelTarget(inv)}
                                                                className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700">
                                                            <X className="h-3.5 w-3.5" /> Cancel
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs italic text-slate-400">Cancelled</span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>

                        <div className="flex items-center justify-between pt-2 text-sm text-slate-500">
                            <span>
                                {filteredSummary.length === 0
                                    ? "No investments"
                                    : `Showing ${(summaryPage - 1) * SUMMARY_PER_PAGE + 1}–${Math.min(summaryPage * SUMMARY_PER_PAGE, filteredSummary.length)} of ${filteredSummary.length} investments`}
                            </span>
                            <div className="flex items-center gap-2">
                                <button type="button" disabled={summaryPage === 1 || isLoading}
                                        onClick={() => setSummaryPage((p) => p - 1)} className={NAV_BTN}>
                                    <ChevronLeft className="h-4 w-4" /> Prev
                                </button>
                                <span className="px-1">{summaryPage} / {summaryTotalPages}</span>
                                <button type="button" disabled={summaryPage === summaryTotalPages || isLoading}
                                        onClick={() => setSummaryPage((p) => p + 1)} className={NAV_BTN}>
                                    Next <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* ── modals ── */}
            {modal === "register" && (
                <RegisterInvestorModal
                    onClose={() => setModal(null)}
                    onSuccess={handleRegisterSuccess}
                />
            )}
            {modal === "invest" && (
                <RecordInvestmentModal
                    investors={allInvestors}
                    onClose={() => setModal(null)}
                    onSuccess={handleInvestmentSuccess}
                />
            )}
            {modal === "return" && (
                <RecordReturnModal
                    activeInvestments={allInvestments.filter(
                        (inv) => String(inv.status || "").toUpperCase() === "ACTIVE"
                    )}
                    onClose={() => setModal(null)}
                    onSuccess={handleReturnSuccess}
                />
            )}
            {returnsTarget && (
                <InvestmentReturnsModal
                    investment={returnsTarget}
                    onClose={() => setReturnsTarget(null)}
                    onReturnCancelled={loadInvestments}
                />
            )}
            {cancelTarget && (
                <CancelInvestmentModal
                    investment={cancelTarget}
                    onConfirm={handleCancelInvestment}
                    onClose={() => setCancelTarget(null)}
                    isSaving={isCancelling}
                />
            )}
        </div>
    );
}
