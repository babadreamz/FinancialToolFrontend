import { useEffect, useMemo, useState, useCallback } from "react";
import {
    Search, HandCoins, Receipt,
    ChevronLeft, ChevronRight, X, AlertTriangle, Plus,
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
    recordLoanDisbursement,
    addCollateral,
    addGuarantor,
    recordRepayment,
    getActiveLoans,
    cancelLoanDisbursement,
    cancelLoanRepayments,
} from "../../services/adminServices";
import { getLoggedInAdminId } from "../../lib/auth";
import { PAYMENT_METHODS } from "../../constants/paymentMethods";

// ─── constants ────────────────────────────────────────────────────────────────

const LOANS_PER_PAGE = 10;
const SUMMARY_PER_PAGE = 5;
const REPAYMENTS_PER_PAGE = 5;

const NAV_BTN =
    "flex items-center gap-1 rounded-lg border border-slate-400 bg-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-800 hover:bg-slate-300 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed";

const REPAYMENT_FREQUENCIES = [
    { value: "WEEKLY", label: "Weekly" },
    { value: "BI_WEEKLY", label: "Two-Two weeks" },
    { value: "MONTHLY", label: "Monthly" },
];

const INITIAL_DISBURSEMENT_FORM = {
    borrowerName: "", borrowerPhoneNumber: "", borrowerEmail: "",
    principal: "", interestRate: "", startDate: "",
    durationDays: "", repaymentFrequency: "MONTHLY",
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function mapLoan(loan) {
    return {
        id:               loan.id || loan.loanId || "",
        borrowerName:     loan.borrowerName || "—",
        borrowerPhone:    loan.borrowerPhoneNumber || loan.phoneNo || "—",
        borrowerEmail:    loan.borrowerEmail || loan.email || "—",
        principal:        Number(loan.principal || 0),
        interestRate:     Number(loan.interestRate || 0),
        interestAmount:   Number(loan.interestAmount || 0),
        totalPayable:     Number(loan.totalPayable || 0),
        remainingBalance: Number(loan.balance ?? loan.remainingBalance ?? loan.principal ?? 0),
        startDate:        loan.startDate || "",
        endDate:          loan.endDate || "",
        durationDays:     Number(loan.durationDays || 0),
        repaymentFrequency: loan.repaymentFrequency || "—",
        status:           loan.loanStatus || loan.status || "ACTIVE",
        createdAt:        loan.createdAt || "",
        updatedAt:        loan.updatedAt || "",
        loanRepayments:   Array.isArray(loan.loanRepayments) ? loan.loanRepayments : [],
        collaterals:      Array.isArray(loan.collaterals)    ? loan.collaterals    : [],
        guarantors:       Array.isArray(loan.guarantors)     ? loan.guarantors     : [],
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

function friendlyFrequency(freq) {
    return String(freq || "").replace(/_/g, " ").toLowerCase();
}

// ─── Cancel Disbursement Modal ────────────────────────────────────────────────

function CancelDisbursementModal({ loan, onConfirm, onClose, isSaving }) {
    const [reason, setReason] = useState("");
    const [error, setError] = useState("");

    return (
        <Dialog open onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-red-600">
                        <AlertTriangle className="h-5 w-5" />
                        Cancel Loan Disbursement
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    <p className="text-sm text-slate-600">
                        You are about to cancel the disbursement for{" "}
                        <span className="font-semibold">{loan.borrowerName}</span>{" "}
                        of <span className="font-semibold">{formatCurrency(loan.principal)}</span>.
                        This action cannot be undone.
                    </p>
                    <div className="grid gap-2">
                        <Label htmlFor="cancelDisburseReason">Reason for cancellation</Label>
                        <Input
                            id="cancelDisburseReason"
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

// ─── Cancel Repayment Modal ───────────────────────────────────────────────────

function CancelRepaymentModal({ repayment, onConfirm, onClose, isSaving }) {
    const [reason, setReason] = useState("");
    const [error, setError] = useState("");

    return (
        <Dialog open onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-red-600">
                        <AlertTriangle className="h-5 w-5" />
                        Cancel Repayment
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    <p className="text-sm text-slate-600">
                        You are about to cancel a repayment of{" "}
                        <span className="font-semibold">
                            {formatCurrency(Number(repayment.amountPaid || repayment.totalPaid || 0))}
                        </span>.
                        This action cannot be undone.
                    </p>
                    <div className="grid gap-2">
                        <Label htmlFor="cancelRepayReason">Reason for cancellation</Label>
                        <Input
                            id="cancelRepayReason"
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

// ─── Loan Repayments Modal ────────────────────────────────────────────────────

function LoanRepaymentsModal({ loan, onClose, onRepaymentCancelled }) {
    const [repayments, setRepayments] = useState(
        [...(loan.loanRepayments || [])].sort((a, b) =>
            new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        )
    );
    const [page, setPage] = useState(1);
    const [cancelTarget, setCancelTarget] = useState(null);
    const [isCancelling, setIsCancelling] = useState(false);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    const totalPages = Math.max(1, Math.ceil(repayments.length / REPAYMENTS_PER_PAGE));
    const paged = repayments.slice(
        (page - 1) * REPAYMENTS_PER_PAGE,
        page * REPAYMENTS_PER_PAGE,
    );

    const handleCancelRepayment = async (reason) => {
        if (!cancelTarget) return;
        const recorderId = getLoggedInAdminId();
        if (!recorderId) { setError("Could not find logged in admin."); return; }
        try {
            setIsCancelling(true);
            const repaymentId = String(cancelTarget.id || cancelTarget.repaymentId || "");
            await cancelLoanRepayments({
                loanRepaymentId: repaymentId,
                recorderId: String(recorderId),
                cancellationReason: reason,
            });
            setRepayments((prev) =>
                prev.map((r) =>
                    (r.id || r.repaymentId) === (cancelTarget.id || cancelTarget.repaymentId)
                        ? { ...r, cancelled: true }
                        : r
                )
            );
            setCancelTarget(null);
            setSuccessMessage("Repayment cancelled successfully.");
            setTimeout(() => setSuccessMessage(""), 4000);
            onRepaymentCancelled?.();
        } catch (err) {
            setError(err?.response?.data?.message || err?.response?.data?.error || "Failed to cancel repayment.");
        } finally {
            setIsCancelling(false);
        }
    };

    return (
        <>
            <Dialog open onOpenChange={onClose}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Repayments — {loan.borrowerName}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        {successMessage && (
                            <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                                {successMessage}
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
                                    <TableHead>Date</TableHead>
                                    <TableHead className="text-right">Amount Paid</TableHead>
                                    <TableHead className="text-right">Principal</TableHead>
                                    <TableHead className="text-right">Interest</TableHead>
                                    <TableHead className="text-right">Remaining</TableHead>
                                    <TableHead>Method</TableHead>
                                    <TableHead />
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paged.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                                            No repayments recorded yet.
                                        </TableCell>
                                    </TableRow>
                                ) : paged.map((r, i) => {
                                    const rId = r.id || r.repaymentId || i;
                                    const isCancelled = Boolean(r.cancelled || String(r.status || "").toUpperCase() === "CANCELLED");
                                    return (
                                        <TableRow key={rId} className={isCancelled ? "opacity-60" : ""}>
                                            <TableCell className={isCancelled ? "line-through text-slate-400" : ""}>
                                                {formatDate(r.createdAt)}
                                            </TableCell>
                                            <TableCell className={`text-right ${isCancelled ? "line-through text-slate-400" : "font-medium"}`}>
                                                {formatCurrency(Number(r.amountPaid || r.totalPaid || 0))}
                                            </TableCell>
                                            <TableCell className={`text-right ${isCancelled ? "text-slate-400" : ""}`}>
                                                {formatCurrency(Number(r.principalPaid || 0))}
                                            </TableCell>
                                            <TableCell className={`text-right ${isCancelled ? "text-slate-400" : ""}`}>
                                                {formatCurrency(Number(r.interestPaid || 0))}
                                            </TableCell>
                                            <TableCell className={`text-right ${isCancelled ? "text-slate-400" : ""}`}>
                                                {formatCurrency(Number(r.remainingBalance || 0))}
                                            </TableCell>
                                            <TableCell className={isCancelled ? "text-slate-400" : ""}>
                                                {r.paymentMethod || "—"}
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

                        {repayments.length > REPAYMENTS_PER_PAGE && (
                            <div className="flex items-center justify-between pt-1 text-sm text-slate-500">
                                <span>
                                    Showing {(page - 1) * REPAYMENTS_PER_PAGE + 1}–
                                    {Math.min(page * REPAYMENTS_PER_PAGE, repayments.length)} of {repayments.length}
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
                <CancelRepaymentModal
                    repayment={cancelTarget}
                    onConfirm={handleCancelRepayment}
                    onClose={() => setCancelTarget(null)}
                    isSaving={isCancelling}
                />
            )}
        </>
    );
}

// ─── Loan Detail Modal ────────────────────────────────────────────────────────

function LoanDetailModal({ loan, onClose, onReload }) {
    const [activeTab, setActiveTab] = useState("details");
    const [showAddCollateral, setShowAddCollateral] = useState(false);
    const [showAddGuarantor, setShowAddGuarantor] = useState(false);

    const [collateralForm, setCollateralForm] = useState({
        name: "", description: "", location: "", approximateValue: "",
    });
    const [guarantorForm, setGuarantorForm] = useState({
        firstName: "", middleName: "", lastName: "",
        phoneNo: "", address: "", occupation: "", placeOfWork: "",
    });

    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const resetMessages = () => { setError(""); setSuccess(""); };

    const handleCollateralChange = (e) => {
        const { name, value } = e.target;
        setCollateralForm((p) => ({
            ...p,
            [name]: name === "approximateValue" ? sanitizeMoneyInput(value) : value,
        }));
    };

    const handleGuarantorChange = (e) => {
        const { name, value } = e.target;
        setGuarantorForm((p) => ({ ...p, [name]: value }));
    };

    const handleAddCollateral = async () => {
        resetMessages();
        const { name, description, location, approximateValue } = collateralForm;
        if (!name.trim() || !description.trim() || !location.trim() || !approximateValue) {
            setError("All collateral fields are required."); return;
        }
        const val = Number(approximateValue);
        if (isNaN(val) || val <= 0) { setError("Enter a valid collateral value."); return; }
        try {
            setIsSaving(true);
            await addCollateral(loan.id, {
                loanId: loan.id, name: name.trim(),
                description: description.trim(), location: location.trim(), approximateValue: val,
            });
            setSuccess("Collateral added successfully.");
            setCollateralForm({ name: "", description: "", location: "", approximateValue: "" });
            setShowAddCollateral(false);
            onReload?.();
        } catch (err) {
            setError(err?.response?.data?.message || err?.response?.data?.error || "Failed to add collateral.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddGuarantor = async () => {
        resetMessages();
        const { firstName, lastName, phoneNo, address, occupation, placeOfWork } = guarantorForm;
        if (!firstName.trim() || !lastName.trim() || !phoneNo.trim() || !address.trim() || !occupation.trim() || !placeOfWork.trim()) {
            setError("All fields except middle name are required."); return;
        }
        try {
            setIsSaving(true);
            await addGuarantor(loan.id, {
                ...guarantorForm,
                firstName: guarantorForm.firstName.trim(),
                lastName: guarantorForm.lastName.trim(),
                loanId: loan.id,
            });
            setSuccess("Guarantor added successfully.");
            setGuarantorForm({ firstName: "", middleName: "", lastName: "", phoneNo: "", address: "", occupation: "", placeOfWork: "" });
            setShowAddGuarantor(false);
            onReload?.();
        } catch (err) {
            setError(err?.response?.data?.message || err?.response?.data?.error || "Failed to add guarantor.");
        } finally {
            setIsSaving(false);
        }
    };

    const TABS = [
        { key: "details",     label: "Details" },
        { key: "collaterals", label: `Collaterals (${loan.collaterals.length})` },
        { key: "guarantors",  label: `Guarantors (${loan.guarantors.length})` },
    ];

    return (
        <Dialog open onOpenChange={onClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{loan.borrowerName}</DialogTitle>
                </DialogHeader>

                <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                    {TABS.map(({ key, label }) => (
                        <button key={key} type="button"
                                onClick={() => {
                                    setActiveTab(key);
                                    resetMessages();
                                    setShowAddCollateral(false);
                                    setShowAddGuarantor(false);
                                }}
                                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                                    activeTab === key
                                        ? "bg-slate-900 text-white"
                                        : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                                }`}>
                            {label}
                        </button>
                    ))}
                </div>

                {error && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
                )}
                {success && (
                    <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{success}</div>
                )}

                {activeTab === "details" && (
                    <div className="py-2 text-sm">
                        <div className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-xl bg-slate-50 p-4">
                            <div>
                                <span className="text-slate-500">Principal</span>
                                <p className="font-medium">{formatCurrency(loan.principal)}</p>
                            </div>
                            <div>
                                <span className="text-slate-500">Remaining Balance</span>
                                <p className="font-medium text-orange-600">{formatCurrency(loan.remainingBalance)}</p>
                            </div>
                            <div>
                                <span className="text-slate-500">Interest Rate</span>
                                <p className="font-medium">{loan.interestRate}%</p>
                            </div>
                            <div>
                                <span className="text-slate-500">Interest Amount</span>
                                <p className="font-medium">{formatCurrency(loan.interestAmount)}</p>
                            </div>
                            <div>
                                <span className="text-slate-500">Total Payable</span>
                                <p className="font-medium">{formatCurrency(loan.totalPayable)}</p>
                            </div>
                            <div>
                                <span className="text-slate-500">Duration</span>
                                <p className="font-medium">{loan.durationDays} days</p>
                            </div>
                            <div>
                                <span className="text-slate-500">Repayment Frequency</span>
                                <p className="font-medium capitalize">{friendlyFrequency(loan.repaymentFrequency)}</p>
                            </div>
                            <div>
                                <span className="text-slate-500">Status</span>
                                <p className="font-medium capitalize">{String(loan.status || "").toLowerCase()}</p>
                            </div>
                            <div>
                                <span className="text-slate-500">Start Date</span>
                                <p className="font-medium">{formatDate(loan.startDate)}</p>
                            </div>
                            <div>
                                <span className="text-slate-500">End Date</span>
                                <p className="font-medium">{formatDate(loan.endDate)}</p>
                            </div>
                            <div>
                                <span className="text-slate-500">Phone</span>
                                <p className="font-medium">{loan.borrowerPhone}</p>
                            </div>
                            <div>
                                <span className="text-slate-500">Email</span>
                                <p className="font-medium">{loan.borrowerEmail || "—"}</p>
                            </div>
                            <div>
                                <span className="text-slate-500">Disbursed On</span>
                                <p className="font-medium">{formatDate(loan.createdAt)}</p>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === "collaterals" && (
                    <div className="py-2 text-sm space-y-4">
                        {loan.collaterals.length === 0 && !showAddCollateral && (
                            <p className="rounded-xl bg-slate-50 px-4 py-3 text-slate-400">
                                No collaterals recorded for this loan.
                            </p>
                        )}
                        {loan.collaterals.length > 0 && (
                            <div className="space-y-3">
                                {loan.collaterals.map((c, i) => (
                                    <div key={c.id || i} className="grid grid-cols-2 gap-x-6 gap-y-2 rounded-xl border border-slate-200 p-4">
                                        <div>
                                            <span className="text-slate-500">Name</span>
                                            <p className="font-medium">{c.name || "—"}</p>
                                        </div>
                                        <div>
                                            <span className="text-slate-500">Approximate Value</span>
                                            <p className="font-medium">{formatCurrency(Number(c.approximateValue || 0))}</p>
                                        </div>
                                        <div className="col-span-2">
                                            <span className="text-slate-500">Description</span>
                                            <p className="font-medium">{c.description || "—"}</p>
                                        </div>
                                        <div className="col-span-2">
                                            <span className="text-slate-500">Location</span>
                                            <p className="font-medium">{c.location || "—"}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {showAddCollateral && (
                            <div className="grid gap-3 rounded-xl border border-slate-200 p-4 md:grid-cols-2">
                                <p className="md:col-span-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                                    Add Collateral
                                </p>
                                <div className="grid gap-1">
                                    <Label>Name</Label>
                                    <Input name="name" value={collateralForm.name} onChange={handleCollateralChange} />
                                </div>
                                <div className="grid gap-1">
                                    <Label>Approximate Value (₦)</Label>
                                    <Input name="approximateValue" inputMode="decimal"
                                           value={formatNumberWithCommas(collateralForm.approximateValue)}
                                           onChange={handleCollateralChange} placeholder="e.g. 500,000" />
                                </div>
                                <div className="grid gap-1 md:col-span-2">
                                    <Label>Description</Label>
                                    <Input name="description" value={collateralForm.description} onChange={handleCollateralChange} />
                                </div>
                                <div className="grid gap-1 md:col-span-2">
                                    <Label>Location</Label>
                                    <Input name="location" value={collateralForm.location} onChange={handleCollateralChange} />
                                </div>
                                <div className="md:col-span-2 flex justify-end gap-2">
                                    <Button variant="outline" type="button"
                                            onClick={() => { setShowAddCollateral(false); resetMessages(); }}>
                                        Cancel
                                    </Button>
                                    <Button type="button" onClick={handleAddCollateral} disabled={isSaving}>
                                        {isSaving ? "Saving..." : "Save Collateral"}
                                    </Button>
                                </div>
                            </div>
                        )}
                        {!showAddCollateral && (
                            <div className="flex justify-end">
                                <Button size="sm" type="button"
                                        onClick={() => { setShowAddCollateral(true); resetMessages(); }}>
                                    <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Collateral
                                </Button>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === "guarantors" && (
                    <div className="py-2 text-sm space-y-4">
                        {loan.guarantors.length === 0 && !showAddGuarantor && (
                            <p className="rounded-xl bg-slate-50 px-4 py-3 text-slate-400">
                                No guarantors recorded for this loan.
                            </p>
                        )}
                        {loan.guarantors.length > 0 && (
                            <div className="space-y-3">
                                {loan.guarantors.map((g, i) => (
                                    <div key={g.id || i} className="grid grid-cols-2 gap-x-6 gap-y-2 rounded-xl border border-slate-200 p-4">
                                        <div>
                                            <span className="text-slate-500">Name</span>
                                            <p className="font-medium">
                                                {[g.firstName, g.middleName, g.lastName].filter(Boolean).join(" ") || "—"}
                                            </p>
                                        </div>
                                        <div>
                                            <span className="text-slate-500">Phone</span>
                                            <p className="font-medium">{g.phoneNo || "—"}</p>
                                        </div>
                                        <div>
                                            <span className="text-slate-500">Occupation</span>
                                            <p className="font-medium">{g.occupation || "—"}</p>
                                        </div>
                                        <div>
                                            <span className="text-slate-500">Place of Work</span>
                                            <p className="font-medium">{g.placeOfWork || "—"}</p>
                                        </div>
                                        <div className="col-span-2">
                                            <span className="text-slate-500">Address</span>
                                            <p className="font-medium">{g.address || "—"}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {showAddGuarantor && (
                            <div className="grid gap-3 rounded-xl border border-slate-200 p-4 md:grid-cols-2">
                                <p className="md:col-span-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                                    Add Guarantor
                                </p>
                                {[
                                    { label: "First Name", name: "firstName" },
                                    { label: "Middle Name", name: "middleName" },
                                    { label: "Last Name", name: "lastName" },
                                    { label: "Phone Number", name: "phoneNo" },
                                ].map(({ label, name }) => (
                                    <div key={name} className="grid gap-1">
                                        <Label>{label}</Label>
                                        <Input name={name} value={guarantorForm[name]} onChange={handleGuarantorChange} />
                                    </div>
                                ))}
                                <div className="grid gap-1 md:col-span-2">
                                    <Label>Address</Label>
                                    <Input name="address" value={guarantorForm.address} onChange={handleGuarantorChange} />
                                </div>
                                <div className="grid gap-1">
                                    <Label>Occupation</Label>
                                    <Input name="occupation" value={guarantorForm.occupation} onChange={handleGuarantorChange} />
                                </div>
                                <div className="grid gap-1">
                                    <Label>Place of Work</Label>
                                    <Input name="placeOfWork" value={guarantorForm.placeOfWork} onChange={handleGuarantorChange} />
                                </div>
                                <div className="md:col-span-2 flex justify-end gap-2">
                                    <Button variant="outline" type="button"
                                            onClick={() => { setShowAddGuarantor(false); resetMessages(); }}>
                                        Cancel
                                    </Button>
                                    <Button type="button" onClick={handleAddGuarantor} disabled={isSaving}>
                                        {isSaving ? "Saving..." : "Save Guarantor"}
                                    </Button>
                                </div>
                            </div>
                        )}
                        {!showAddGuarantor && (
                            <div className="flex justify-end">
                                <Button size="sm" type="button"
                                        onClick={() => { setShowAddGuarantor(true); resetMessages(); }}>
                                    <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Guarantor
                                </Button>
                            </div>
                        )}
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ─── Repayment Modal ──────────────────────────────────────────────────────────

function RepaymentModal({ loans, onClose, onSuccess }) {
    const [loanSearch, setLoanSearch] = useState("");
    const [selectedLoan, setSelectedLoan] = useState(null);
    const [amount, setAmount] = useState("");
    const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS?.[0]?.value || "CASH");
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState("");

    const filtered = useMemo(() => {
        const q = loanSearch.trim().toLowerCase();
        if (!q) return loans;
        return loans.filter((l) =>
            [l.borrowerName, l.borrowerPhone].filter(Boolean).join(" ").toLowerCase().includes(q)
        );
    }, [loans, loanSearch]);

    const handleSubmit = async () => {
        setError("");
        if (!selectedLoan || !amount) { setError("Please select a loan and enter amount."); return; }
        const parsed = Number(amount);
        if (isNaN(parsed) || parsed <= 0) { setError("Enter a valid repayment amount."); return; }
        const recorderId = getLoggedInAdminId();
        if (!recorderId) { setError("Could not find logged in admin."); return; }
        try {
            setIsSaving(true);
            await recordRepayment({
                loanId: String(selectedLoan.id),
                amountPaid: parsed,
                paymentMethod,
                recorderId: String(recorderId),
            });
            onSuccess();
        } catch (err) {
            setError(err?.response?.data?.message || err?.response?.data?.error || "Failed to record repayment.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open onOpenChange={onClose}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Record Loan Repayment</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-2">
                    {error && (
                        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
                    )}
                    <div className="grid gap-2">
                        <Label>Search Loan / Borrower</Label>
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <Input
                                value={loanSearch}
                                onChange={(e) => { setLoanSearch(e.target.value); setSelectedLoan(null); }}
                                className="pl-10"
                                placeholder="Type borrower name or phone"
                            />
                        </div>
                        {loanSearch.trim() && !selectedLoan && (
                            <div className="max-h-44 overflow-y-auto rounded-xl border border-slate-200">
                                {filtered.length === 0 ? (
                                    <div className="px-4 py-3 text-sm text-slate-500">No matching loan found.</div>
                                ) : filtered.map((l) => (
                                    <button key={l.id} type="button"
                                            onClick={() => { setSelectedLoan(l); setLoanSearch(l.borrowerName); }}
                                            className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-slate-50">
                                        <span>{l.borrowerName}</span>
                                        <span className="text-xs text-slate-400">{formatCurrency(l.remainingBalance)} left</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="grid gap-2">
                        <Label>Selected Loan</Label>
                        <Input
                            value={selectedLoan
                                ? `${selectedLoan.borrowerName} — Balance: ${formatCurrency(selectedLoan.remainingBalance)}`
                                : ""}
                            disabled className="bg-slate-50"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label>Amount (₦)</Label>
                        <Input inputMode="decimal"
                               value={formatNumberWithCommas(amount)}
                               onChange={(e) => setAmount(sanitizeMoneyInput(e.target.value))}
                               placeholder="e.g. 50,000" />
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
                        {isSaving ? "Recording..." : "Record Repayment"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ─── Disbursement Modal — 3-step flow ─────────────────────────────────────────

function DisbursementModal({ onClose, onSuccess }) {
    const today = getTodayDate();
    const [step, setStep] = useState("loan");
    const [createdLoanId, setCreatedLoanId] = useState("");
    const [collateralCount, setCollateralCount] = useState(0);
    const [guarantorCount, setGuarantorCount] = useState(0);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const [loanForm, setLoanForm] = useState(INITIAL_DISBURSEMENT_FORM);
    const [collateralForm, setCollateralForm] = useState({
        name: "", description: "", location: "", approximateValue: "",
    });
    const [guarantorForm, setGuarantorForm] = useState({
        firstName: "", middleName: "", lastName: "",
        phoneNo: "", address: "", occupation: "", placeOfWork: "",
    });

    const handleLoanChange = (e) => {
        const { name, value } = e.target;
        setLoanForm((p) => ({
            ...p,
            [name]: name === "principal" ? sanitizeMoneyInput(value) : value,
        }));
    };
    const handleCollateralChange = (e) => {
        const { name, value } = e.target;
        setCollateralForm((p) => ({
            ...p,
            [name]: name === "approximateValue" ? sanitizeMoneyInput(value) : value,
        }));
    };
    const handleGuarantorChange = (e) => {
        const { name, value } = e.target;
        setGuarantorForm((p) => ({ ...p, [name]: value }));
    };

    const handleRecordLoan = async () => {
        setError(""); setSuccess("");
        const { borrowerName, borrowerPhoneNumber, principal, interestRate, startDate, durationDays } = loanForm;
        if (!borrowerName.trim() || !borrowerPhoneNumber.trim() || !principal || !interestRate || !startDate || !durationDays) {
            setError("All required fields must be filled."); return;
        }
        if (loanForm.startDate < today) { setError("Start date cannot be in the past."); return; }
        const parsedPrincipal = Number(principal);
        const parsedRate = Number(interestRate);
        const parsedDays = Number(durationDays);
        if (isNaN(parsedPrincipal) || parsedPrincipal <= 0) { setError("Enter a valid principal amount."); return; }
        if (isNaN(parsedRate) || parsedRate < 0) { setError("Enter a valid interest rate."); return; }
        if (isNaN(parsedDays) || parsedDays <= 0) { setError("Enter a valid duration in days."); return; }
        const approverId = getLoggedInAdminId();
        if (!approverId) { setError("Could not find logged in admin."); return; }
        try {
            setIsSaving(true);
            const res = await recordLoanDisbursement({
                borrowerName: borrowerName.trim(),
                borrowerPhoneNumber: borrowerPhoneNumber.trim(),
                borrowerEmail: loanForm.borrowerEmail.trim(),
                principal: parsedPrincipal, interestRate: parsedRate,
                startDate: loanForm.startDate, durationDays: parsedDays,
                repaymentFrequency: loanForm.repaymentFrequency,
                approverId: String(approverId),
            });
            const loanId = res?.loanId || res?.id;
            if (!loanId) { setError("Loan recorded but ID was not returned by the server."); return; }
            setCreatedLoanId(loanId);
            setSuccess("Loan disbursement recorded. Add collateral or proceed.");
            setStep("collateral");
        } catch (err) {
            setError(err?.response?.data?.message || err?.response?.data?.error || "Failed to record loan.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddCollateral = async () => {
        setError(""); setSuccess("");
        const { name, description, location, approximateValue } = collateralForm;
        if (!name.trim() || !description.trim() || !location.trim() || !approximateValue) {
            setError("All collateral fields are required."); return;
        }
        const val = Number(approximateValue);
        if (isNaN(val) || val <= 0) { setError("Enter a valid collateral value."); return; }
        try {
            setIsSaving(true);
            await addCollateral(createdLoanId, {
                loanId: createdLoanId, name: name.trim(),
                description: description.trim(), location: location.trim(), approximateValue: val,
            });
            setCollateralCount((c) => c + 1);
            setCollateralForm({ name: "", description: "", location: "", approximateValue: "" });
            setSuccess("Collateral added. You can add another or proceed to guarantor.");
        } catch (err) {
            setError(err?.response?.data?.message || err?.response?.data?.error || "Failed to add collateral.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddGuarantor = async () => {
        setError(""); setSuccess("");
        const { firstName, lastName, phoneNo, address, occupation, placeOfWork } = guarantorForm;
        if (!firstName.trim() || !lastName.trim() || !phoneNo.trim() || !address.trim() || !occupation.trim() || !placeOfWork.trim()) {
            setError("All fields except middle name are required."); return;
        }
        try {
            setIsSaving(true);
            await addGuarantor(createdLoanId, {
                ...guarantorForm,
                firstName: guarantorForm.firstName.trim(),
                lastName: guarantorForm.lastName.trim(),
                loanId: createdLoanId,
            });
            setGuarantorCount((c) => c + 1);
            setGuarantorForm({ firstName: "", middleName: "", lastName: "", phoneNo: "", address: "", occupation: "", placeOfWork: "" });
            setSuccess("Guarantor added. You can add another or finish.");
        } catch (err) {
            setError(err?.response?.data?.message || err?.response?.data?.error || "Failed to add guarantor.");
        } finally {
            setIsSaving(false);
        }
    };

    const STEPS = [
        { key: "loan",       label: "1. Loan" },
        { key: "collateral", label: "2. Collateral" },
        { key: "guarantor",  label: "3. Guarantor" },
    ];

    return (
        <Dialog open onOpenChange={onClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Record Loan Disbursement</DialogTitle>
                </DialogHeader>
                <div className="flex items-center gap-3 flex-wrap">
                    {STEPS.map(({ key, label }) => (
                        <div key={key} className={`rounded-full px-3 py-1 text-sm font-medium ${
                            step === key ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500"
                        }`}>{label}</div>
                    ))}
                </div>
                {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
                {success && <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{success}</div>}

                {step === "loan" && (
                    <div className="grid gap-4 py-2 md:grid-cols-2">
                        <div className="grid gap-2">
                            <Label>Borrower Name <span className="text-red-500">*</span></Label>
                            <Input name="borrowerName" value={loanForm.borrowerName} onChange={handleLoanChange} placeholder="e.g. John Doe" />
                        </div>
                        <div className="grid gap-2">
                            <Label>Phone Number <span className="text-red-500">*</span></Label>
                            <Input name="borrowerPhoneNumber" value={loanForm.borrowerPhoneNumber} onChange={handleLoanChange} />
                        </div>
                        <div className="grid gap-2 md:col-span-2">
                            <Label>Email Address</Label>
                            <Input name="borrowerEmail" type="email" value={loanForm.borrowerEmail} onChange={handleLoanChange} />
                        </div>
                        <div className="grid gap-2">
                            <Label>Principal Amount (₦) <span className="text-red-500">*</span></Label>
                            <Input name="principal" inputMode="decimal"
                                   value={formatNumberWithCommas(loanForm.principal)} onChange={handleLoanChange} placeholder="e.g. 500,000" />
                        </div>
                        <div className="grid gap-2">
                            <Label>Interest Rate (%) <span className="text-red-500">*</span></Label>
                            <Input name="interestRate" type="number" min="0" step="0.01"
                                   value={loanForm.interestRate} onChange={handleLoanChange} placeholder="e.g. 12.5" />
                        </div>
                        <div className="grid gap-2">
                            <Label>Start Date <span className="text-red-500">*</span></Label>
                            <Input name="startDate" type="date" min={today} value={loanForm.startDate} onChange={handleLoanChange} />
                        </div>
                        <div className="grid gap-2">
                            <Label>Duration (Days) <span className="text-red-500">*</span></Label>
                            <Input name="durationDays" type="number" min="1"
                                   value={loanForm.durationDays} onChange={handleLoanChange} placeholder="e.g. 180" />
                        </div>
                        <div className="grid gap-2 md:col-span-2">
                            <Label>Repayment Frequency <span className="text-red-500">*</span></Label>
                            <select name="repaymentFrequency" value={loanForm.repaymentFrequency} onChange={handleLoanChange}
                                    className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200">
                                {REPAYMENT_FREQUENCIES.map((f) => (
                                    <option key={f.value} value={f.value}>{f.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="md:col-span-2 flex justify-end gap-2 pt-2">
                            <Button variant="outline" onClick={onClose} type="button">Cancel</Button>
                            <Button onClick={handleRecordLoan} disabled={isSaving} type="button">
                                {isSaving ? "Recording..." : "Continue"}
                            </Button>
                        </div>
                    </div>
                )}

                {step === "collateral" && (
                    <div className="grid gap-4 py-2 md:grid-cols-2">
                        <p className="md:col-span-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Add Collateral
                            {collateralCount > 0 && <span className="ml-2 normal-case text-green-600 font-medium">({collateralCount} added)</span>}
                        </p>
                        <div className="grid gap-2">
                            <Label>Name</Label>
                            <Input name="name" value={collateralForm.name} onChange={handleCollateralChange} />
                        </div>
                        <div className="grid gap-2">
                            <Label>Approximate Value (₦)</Label>
                            <Input name="approximateValue" inputMode="decimal"
                                   value={formatNumberWithCommas(collateralForm.approximateValue)}
                                   onChange={handleCollateralChange} placeholder="e.g. 500,000" />
                        </div>
                        <div className="grid gap-2 md:col-span-2">
                            <Label>Description</Label>
                            <Input name="description" value={collateralForm.description} onChange={handleCollateralChange} />
                        </div>
                        <div className="grid gap-2 md:col-span-2">
                            <Label>Location</Label>
                            <Input name="location" value={collateralForm.location} onChange={handleCollateralChange} />
                        </div>
                        <div className="md:col-span-2 flex justify-end gap-2 pt-2">
                            <Button variant="outline" type="button"
                                    onClick={() => { setError(""); setSuccess(""); setStep("guarantor"); }}>
                                {collateralCount > 0 ? "Go Next" : "Skip Collateral"}
                            </Button>
                            <Button onClick={handleAddCollateral} disabled={isSaving} type="button">
                                {isSaving ? "Saving..." : "Add Collateral"}
                            </Button>
                        </div>
                    </div>
                )}

                {step === "guarantor" && (
                    <div className="grid gap-4 py-2 md:grid-cols-2">
                        <p className="md:col-span-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Add Guarantor
                            {guarantorCount > 0 && <span className="ml-2 normal-case text-green-600 font-medium">({guarantorCount} added)</span>}
                        </p>
                        {[
                            { label: "First Name", name: "firstName" },
                            { label: "Middle Name", name: "middleName" },
                            { label: "Last Name", name: "lastName" },
                            { label: "Phone Number", name: "phoneNo" },
                        ].map(({ label, name }) => (
                            <div key={name} className="grid gap-2">
                                <Label>{label}</Label>
                                <Input name={name} value={guarantorForm[name]} onChange={handleGuarantorChange} />
                            </div>
                        ))}
                        <div className="grid gap-2 md:col-span-2">
                            <Label>Address</Label>
                            <Input name="address" value={guarantorForm.address} onChange={handleGuarantorChange} />
                        </div>
                        <div className="grid gap-2">
                            <Label>Occupation</Label>
                            <Input name="occupation" value={guarantorForm.occupation} onChange={handleGuarantorChange} />
                        </div>
                        <div className="grid gap-2">
                            <Label>Place of Work</Label>
                            <Input name="placeOfWork" value={guarantorForm.placeOfWork} onChange={handleGuarantorChange} />
                        </div>
                        <div className="md:col-span-2 flex justify-end gap-2 pt-2">
                            <Button variant="outline" type="button" onClick={onSuccess}>
                                {guarantorCount > 0 ? "Finish" : "Skip & Finish"}
                            </Button>
                            <Button onClick={handleAddGuarantor} disabled={isSaving} type="button">
                                {isSaving ? "Saving..." : "Add Guarantor"}
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

// ─── Main Loans component ─────────────────────────────────────────────────────

export default function Loans({ setData, initialAction }) {
    // ── data ──────────────────────────────────────────────────────────────────
    const [allLoans, setAllLoans] = useState([]);
    const [isLoadingLoans, setIsLoadingLoans] = useState(false);

    // ── active loans list ─────────────────────────────────────────────────────
    const [showLoansList, setShowLoansList] = useState(false);
    const [loanPage, setLoanPage] = useState(1);
    const [loanSearch, setLoanSearch] = useState("");

    // ── loan summary ──────────────────────────────────────────────────────────
    const [summaryPage, setSummaryPage] = useState(1);
    const [summarySearch, setSummarySearch] = useState("");
    const [summaryStatus, setSummaryStatus] = useState(""); // "" | "DISBURSED" | "CANCELLED" | "PAID_OFF"
    const [summaryDateFrom, setSummaryDateFrom] = useState("");
    const [summaryDateTo, setSummaryDateTo] = useState("");

    // ── ui state ──────────────────────────────────────────────────────────────
    const [modal, setModal] = useState(null);
    const [detailLoan, setDetailLoan] = useState(null);
    const [repaymentsLoan, setRepaymentsLoan] = useState(null);
    const [cancelDisbursementTarget, setCancelDisbursementTarget] = useState(null);
    const [isCancellingDisbursement, setIsCancellingDisbursement] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [globalError, setGlobalError] = useState("");

    // ── loader ────────────────────────────────────────────────────────────────

    const loadLoans = useCallback(async () => {
        try {
            setIsLoadingLoans(true);
            setGlobalError("");
            const all = await fetchAllPages(getActiveLoans, 50);
            all.sort((a, b) =>
                new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
            );
            const mapped = all.map(mapLoan);
            setAllLoans(mapped);
            setData?.((prev) => ({ ...prev, loans: mapped }));
        } catch (err) {
            setGlobalError(err?.response?.data?.message || "Failed to load loans.");
        } finally {
            setIsLoadingLoans(false);
        }
    }, [setData]);

    useEffect(() => { loadLoans(); }, [loadLoans]);

    useEffect(() => {
        if (initialAction === "disbursement") setModal("disbursement");
        if (initialAction === "repayment") setModal("repayment");
    }, [initialAction]);

    // ── active loans — derived ────────────────────────────────────────────────

    const filteredLoans = useMemo(() => {
        const q = loanSearch.trim().toLowerCase();
        if (!q) return allLoans;
        return allLoans.filter((l) =>
            [l.borrowerName, l.borrowerPhone].filter(Boolean).join(" ").toLowerCase().includes(q)
        );
    }, [allLoans, loanSearch]);

    const loanTotalPages = Math.max(1, Math.ceil(filteredLoans.length / LOANS_PER_PAGE));
    const pagedLoans = filteredLoans.slice(
        (loanPage - 1) * LOANS_PER_PAGE,
        loanPage * LOANS_PER_PAGE,
    );

    useEffect(() => { setLoanPage(1); }, [loanSearch]);
    useEffect(() => { setSummaryPage(1); }, [summarySearch, summaryStatus, summaryDateFrom, summaryDateTo]);

    // ── summary — derived ─────────────────────────────────────────────────────

    const filteredSummary = useMemo(() => {
        let list = allLoans;
        const q = summarySearch.trim().toLowerCase();
        if (q) {
            list = list.filter((l) =>
                [l.borrowerName, l.borrowerPhone].filter(Boolean).join(" ").toLowerCase().includes(q)
            );
        }
        // ── status filter ──
        if (summaryStatus) {
            list = list.filter((l) =>
                String(l.status || "").toUpperCase() === summaryStatus
            );
        }
        if (summaryDateFrom) {
            const from = new Date(summaryDateFrom).setHours(0, 0, 0, 0);
            list = list.filter((l) => new Date(l.createdAt || 0).getTime() >= from);
        }
        if (summaryDateTo) {
            const to = new Date(summaryDateTo).setHours(23, 59, 59, 999);
            list = list.filter((l) => new Date(l.createdAt || 0).getTime() <= to);
        }
        return list;
    }, [allLoans, summarySearch, summaryStatus, summaryDateFrom, summaryDateTo]);

    const summaryTotalPages = Math.max(1, Math.ceil(filteredSummary.length / SUMMARY_PER_PAGE));
    const pagedSummary = filteredSummary.slice(
        (summaryPage - 1) * SUMMARY_PER_PAGE,
        summaryPage * SUMMARY_PER_PAGE,
    );

    // ── cancel disbursement ───────────────────────────────────────────────────

    const handleCancelDisbursement = async (reason) => {
        if (!cancelDisbursementTarget) return;
        const recorderId = getLoggedInAdminId();
        if (!recorderId) { setGlobalError("Could not find logged in admin."); return; }
        try {
            setIsCancellingDisbursement(true);
            await cancelLoanDisbursement({
                loanId: String(cancelDisbursementTarget.id),
                recorderId: String(recorderId),
                cancellationReason: reason,
            });
            setCancelDisbursementTarget(null);
            setSuccessMessage("Loan disbursement cancelled successfully.");
            setTimeout(() => setSuccessMessage(""), 4000);
            await loadLoans();
        } catch (err) {
            setGlobalError(err?.response?.data?.message || err?.response?.data?.error || "Failed to cancel disbursement.");
        } finally {
            setIsCancellingDisbursement(false);
        }
    };

    // ── modal callbacks ───────────────────────────────────────────────────────

    const handleDisbursementSuccess = async () => {
        setModal(null);
        setSuccessMessage("Loan disbursement recorded successfully.");
        setTimeout(() => setSuccessMessage(""), 4000);
        await loadLoans();
    };

    const handleRepaymentSuccess = async () => {
        setModal(null);
        setSuccessMessage("Loan repayment recorded successfully.");
        setTimeout(() => setSuccessMessage(""), 4000);
        await loadLoans();
    };

    const handleDetailReload = useCallback(async () => {
        const prevId = detailLoan?.id;
        const all = await fetchAllPages(getActiveLoans, 50);
        const mapped = all.map(mapLoan);
        setAllLoans(mapped);
        setData?.((prev) => ({ ...prev, loans: mapped }));
        if (prevId) {
            const fresh = mapped.find((l) => l.id === prevId);
            if (fresh) setDetailLoan(fresh);
        }
    }, [detailLoan?.id, setData]);

    // ── helpers ───────────────────────────────────────────────────────────────

    const hasActiveSummaryFilters = summarySearch || summaryStatus || summaryDateFrom || summaryDateTo;

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
                    <h2 className="text-2xl font-bold text-foreground">Loans</h2>
                    <p className="text-muted-foreground">Manage loan disbursements and repayments</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => setModal("disbursement")} type="button">
                        <HandCoins className="mr-2 h-4 w-4" /> Record Disbursement
                    </Button>
                    <Button variant="outline" onClick={() => setModal("repayment")} type="button">
                        <Receipt className="mr-2 h-4 w-4" /> Record Repayment
                    </Button>
                </div>
            </div>

            {/* ── Active Loans ── */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Active Loans</CardTitle>
                    <Button variant="outline" size="sm" type="button"
                            onClick={() => setShowLoansList((v) => !v)}>
                        <HandCoins className="mr-2 h-4 w-4" />
                        {showLoansList ? "Hide Loans" : "View Active Loans"}
                    </Button>
                </CardHeader>

                {showLoansList && (
                    <CardContent className="space-y-4">
                        <div className="relative max-w-sm">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <Input value={loanSearch} onChange={(e) => setLoanSearch(e.target.value)}
                                   className="pl-10" placeholder="Search by borrower name or phone" />
                        </div>

                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Borrower</TableHead>
                                    <TableHead>Phone</TableHead>
                                    <TableHead>Principal</TableHead>
                                    <TableHead>Remaining</TableHead>
                                    <TableHead>Frequency</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoadingLoans ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                                            Loading loans...
                                        </TableCell>
                                    </TableRow>
                                ) : pagedLoans.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                                            No active loans found.
                                        </TableCell>
                                    </TableRow>
                                ) : pagedLoans.map((loan) => {
                                    const isCancelled = String(loan.status || "").toUpperCase() === "CANCELLED";
                                    return (
                                        <TableRow key={loan.id} className={isCancelled ? "opacity-60" : "hover:bg-slate-50"}>
                                            <TableCell className={`font-medium ${isCancelled ? "line-through text-slate-400" : ""}`}>
                                                {loan.borrowerName}
                                            </TableCell>
                                            <TableCell className={isCancelled ? "line-through text-slate-400" : ""}>
                                                {loan.borrowerPhone}
                                            </TableCell>
                                            <TableCell className={isCancelled ? "line-through text-slate-400" : ""}>
                                                {formatCurrency(loan.principal)}
                                            </TableCell>
                                            <TableCell className={`font-medium ${isCancelled ? "line-through text-slate-400" : "text-orange-600"}`}>
                                                {formatCurrency(loan.remainingBalance)}
                                            </TableCell>
                                            <TableCell className="capitalize text-sm">
                                                {friendlyFrequency(loan.repaymentFrequency)}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center justify-end">
                                                    {!isCancelled ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => setDetailLoan(loan)}
                                                            className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-800 hover:text-white"
                                                        >
                                                            View
                                                        </button>
                                                    ) : (
                                                        <span className="text-xs italic text-slate-400">Cancelled</span>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>

                        {filteredLoans.length > LOANS_PER_PAGE && (
                            <div className="flex items-center justify-between pt-2 text-sm text-slate-500">
                                <span>
                                    Showing {(loanPage - 1) * LOANS_PER_PAGE + 1}–
                                    {Math.min(loanPage * LOANS_PER_PAGE, filteredLoans.length)} of {filteredLoans.length} loans
                                </span>
                                <div className="flex items-center gap-2">
                                    <button type="button" disabled={loanPage === 1}
                                            onClick={() => setLoanPage((p) => p - 1)} className={NAV_BTN}>
                                        <ChevronLeft className="h-4 w-4" /> Prev
                                    </button>
                                    <span className="px-1">{loanPage} / {loanTotalPages}</span>
                                    <button type="button" disabled={loanPage === loanTotalPages}
                                            onClick={() => setLoanPage((p) => p + 1)} className={NAV_BTN}>
                                        Next <ChevronRight className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                )}
            </Card>

            {/* ── Loan Summary — hidden while active loans list is open ── */}
            {!showLoansList && (
                <Card>
                    <CardHeader>
                        <CardTitle>Loan Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex flex-wrap gap-3">
                            {/* name / phone search */}
                            <div className="relative flex-1 min-w-[180px]">
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <Input value={summarySearch}
                                       onChange={(e) => setSummarySearch(e.target.value)}
                                       className="pl-10" placeholder="Search by borrower name or phone" />
                            </div>

                            {/* status dropdown */}
                            <select
                                value={summaryStatus}
                                onChange={(e) => setSummaryStatus(e.target.value)}
                                className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                            >
                                <option value="">All Statuses</option>
                                <option value="DISBURSED">Disbursed</option>
                                <option value="CANCELLED">Cancelled</option>
                                <option value="PAID_OFF">Paid Off</option>
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
                                {hasActiveSummaryFilters && (
                                    <button type="button"
                                            onClick={() => { setSummarySearch(""); setSummaryStatus(""); setSummaryDateFrom(""); setSummaryDateTo(""); }}
                                            className="text-xs text-slate-500 underline underline-offset-2 hover:text-slate-800 whitespace-nowrap">
                                        Clear
                                    </button>
                                )}
                            </div>
                        </div>

                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Borrower</TableHead>
                                    <TableHead>Disbursed</TableHead>
                                    <TableHead>Frequency</TableHead>
                                    <TableHead className="text-right">Principal</TableHead>
                                    <TableHead className="text-right">Remaining</TableHead>
                                    <TableHead />
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoadingLoans ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                                            Loading loans...
                                        </TableCell>
                                    </TableRow>
                                ) : pagedSummary.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                                            No loans found.
                                        </TableCell>
                                    </TableRow>
                                ) : pagedSummary.map((loan) => {
                                    const isCancelled = String(loan.status || "").toUpperCase() === "CANCELLED";
                                    return (
                                        <TableRow key={loan.id} className={isCancelled ? "opacity-60" : "hover:bg-slate-50"}>
                                            <TableCell className={`font-medium ${isCancelled ? "line-through text-slate-400" : ""}`}>
                                                {loan.borrowerName}
                                            </TableCell>
                                            <TableCell className={isCancelled ? "line-through text-slate-400" : ""}>
                                                {formatDate(loan.createdAt)}
                                            </TableCell>
                                            <TableCell>
                                                <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 capitalize">
                                                    {friendlyFrequency(loan.repaymentFrequency)}
                                                </span>
                                            </TableCell>
                                            <TableCell className={`text-right ${isCancelled ? "line-through text-slate-400" : ""}`}>
                                                {formatCurrency(loan.principal)}
                                            </TableCell>
                                            <TableCell className={`text-right font-medium ${isCancelled ? "line-through text-slate-400" : "text-orange-600"}`}>
                                                {formatCurrency(loan.remainingBalance)}
                                            </TableCell>
                                            <TableCell>
                                                {!isCancelled ? (
                                                    <div className="flex items-center justify-end gap-3">
                                                        {/* ── Repayments — green ── */}
                                                        <button type="button"
                                                                onClick={() => setRepaymentsLoan(loan)}
                                                                className="text-xs font-medium text-green-600 underline underline-offset-2 hover:text-green-800 whitespace-nowrap">
                                                            Repayments
                                                        </button>
                                                        <button type="button"
                                                                onClick={() => setCancelDisbursementTarget(loan)}
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
                                    ? "No loans"
                                    : `Showing ${(summaryPage - 1) * SUMMARY_PER_PAGE + 1}–${Math.min(summaryPage * SUMMARY_PER_PAGE, filteredSummary.length)} of ${filteredSummary.length} loans`}
                            </span>
                            <div className="flex items-center gap-2">
                                <button type="button" disabled={summaryPage === 1 || isLoadingLoans}
                                        onClick={() => setSummaryPage((p) => p - 1)} className={NAV_BTN}>
                                    <ChevronLeft className="h-4 w-4" /> Prev
                                </button>
                                <span className="px-1">{summaryPage} / {summaryTotalPages}</span>
                                <button type="button" disabled={summaryPage === summaryTotalPages || isLoadingLoans}
                                        onClick={() => setSummaryPage((p) => p + 1)} className={NAV_BTN}>
                                    Next <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* ── modals ── */}
            {modal === "disbursement" && (
                <DisbursementModal onClose={() => setModal(null)} onSuccess={handleDisbursementSuccess} />
            )}
            {modal === "repayment" && (
                <RepaymentModal loans={allLoans} onClose={() => setModal(null)} onSuccess={handleRepaymentSuccess} />
            )}
            {detailLoan && (
                <LoanDetailModal
                    loan={detailLoan}
                    onClose={() => setDetailLoan(null)}
                    onReload={handleDetailReload}
                />
            )}
            {repaymentsLoan && (
                <LoanRepaymentsModal
                    loan={repaymentsLoan}
                    onClose={() => setRepaymentsLoan(null)}
                    onRepaymentCancelled={loadLoans}
                />
            )}
            {cancelDisbursementTarget && (
                <CancelDisbursementModal
                    loan={cancelDisbursementTarget}
                    onConfirm={handleCancelDisbursement}
                    onClose={() => setCancelDisbursementTarget(null)}
                    isSaving={isCancellingDisbursement}
                />
            )}
        </div>
    );
}
