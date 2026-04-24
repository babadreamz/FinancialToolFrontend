import { useEffect, useMemo, useState } from "react";
import { FileText, Download, Loader2, Search, MessageCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { formatCurrency, formatDate } from "../../lib/store";
import { getActiveCustomers } from "../../services/customerServices";
import { generateStatementPdf, sendStatementWhatsApp,sendMonthlyStatementToAll} from "../../services/adminServices";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";

function mapSaver(customer) {
    return {
        id: customer.id,
        name: [customer.firstName, customer.middleName, customer.lastName]
            .filter(Boolean)
            .join(" "),
        phone: customer.phoneNo || customer.phone || "-",
        balance: Number(customer.currentBalance || 0),
        status: customer.status || "active",
        createdAt: customer.createdAt || customer.dateCreated || "",
    };
}

function toLocalDateTime(dateStr, endOfDay = false) {
    return `${dateStr}T${endOfDay ? "23:59:59" : "00:00:00"}`;
}

async function fetchAllPages(fetchFn, pageSize = 200) {
    let page = 0;
    let all = [];
    let totalPages = 1;
    do {
        const res = await fetchFn(page, pageSize);
        const items = Array.isArray(res) ? res : (res?.content ?? []);
        totalPages = res?.totalPages ?? 1;
        all = [...all, ...items];
        page++;
    } while (page < totalPages);
    return all;
}

export default function FinancialStatement() {
    const [savers, setSavers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [saverSearch, setSaverSearch] = useState("");
    const [selectedSaver, setSelectedSaver] = useState(null);

    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    const [generating, setGenerating] = useState(false);
    const [sending, setSending] = useState(false);
    const [genError, setGenError] = useState("");
    const [sendSuccess, setSendSuccess] = useState("");

    const [sendingAll, setSendingAll] = useState(false);
    const [sendAllSuccess, setSendAllSuccess] = useState("");
    const [sendAllError, setSendAllError] = useState("");

    useEffect(() => {
        let ignore = false;
        async function loadSavers() {
            try {
                setLoading(true);
                setError("");
                const data = await fetchAllPages(getActiveCustomers);
                if (!ignore) setSavers(data.map(mapSaver));
            } catch (err) {
                if (!ignore)
                    setError(
                        err?.response?.data?.message ||
                        err?.response?.data?.error ||
                        "Failed to load savers."
                    );
            } finally {
                if (!ignore) setLoading(false);
            }
        }
        loadSavers();
        return () => { ignore = true; };
    }, []);

    const filteredSavers = useMemo(() => {
        const q = saverSearch.trim().toLowerCase();
        if (!q) return [];
        return savers.filter((s) => s.name.toLowerCase().includes(q));
    }, [savers, saverSearch]);

    const canGenerate = selectedSaver && startDate && endDate && !generating && !sending;

    function validateDates() {
        if (new Date(startDate) > new Date(endDate)) {
            setGenError("Start date cannot be after end date.");
            return false;
        }
        return true;
    }

    async function handleGeneratePdf() {
        if (!canGenerate) return;
        setGenError("");
        setSendSuccess("");
        if (!validateDates()) return;
        try {
            setGenerating(true);
            const blob = await generateStatementPdf(
                selectedSaver.id,
                toLocalDateTime(startDate, false),
                toLocalDateTime(endDate, true)
            );
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            const safeName = selectedSaver.name.replace(/\s+/g, "_");
            link.download = `statement_${safeName}.pdf`;
            link.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            setGenError(
                err?.response?.data?.message ||
                err?.response?.data?.error ||
                "Failed to generate statement. Please try again."
            );
        } finally {
            setGenerating(false);
        }
    }

    async function handleSendWhatsApp() {
        if (!canGenerate) return;
        setGenError("");
        setSendSuccess("");
        if (!validateDates()) return;
        try {
            setSending(true);
            await sendStatementWhatsApp(
                selectedSaver.id,
                toLocalDateTime(startDate, false),
                toLocalDateTime(endDate, true)
            );
            setSendSuccess(`Statement sent to ${selectedSaver.name}'s WhatsApp successfully.`);
            setTimeout(() => setSendSuccess(""), 5000);
        } catch (err) {
            setGenError(
                err?.response?.data?.message ||
                err?.response?.data?.error ||
                "Failed to send via WhatsApp. Please try again."
            );
        } finally {
            setSending(false);
        }
    }

    async function handleSendMonthlyToAll() {
        setSendAllError("");
        setSendAllSuccess("");

        const today = new Date();
        const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
        if (today.getDate() !== lastDayOfMonth) {
            setSendAllError(
                `Monthly statements can only be sent on the last day of the month. Today is the ${today.getDate()}th.`
            );
            return;
        }
        try {
            setSendingAll(true);
            await sendMonthlyStatementToAll();
            setSendAllSuccess("Monthly statements are being dispatched to all savers. This may take a while.");
            setTimeout(() => setSendAllSuccess(""), 8000);
        } catch (err) {
            setSendAllError(
                err?.response?.data?.message ||
                err?.response?.data?.error ||
                "Failed to start bulk dispatch. Please try again."
            );
        } finally {
            setSendingAll(false);
        }
    }

    return (
        <div className="space-y-6">
            {error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                    {error}
                </div>
            ) : null}

            <div>
                <h2 className="text-2xl font-bold text-foreground">Financial Statement</h2>
                <p className="text-muted-foreground">
                    Search for a saver and generate their PDF statement
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Generate Statement</CardTitle>
                    <CardDescription>
                        Search a saver by name, then select a date range to download or send their statement
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-6 max-w-lg">

                        {/* Saver Search */}
                        <div className="grid gap-2">
                            <Label>Search Saver</Label>
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <Input
                                    value={saverSearch}
                                    onChange={(e) => {
                                        setSaverSearch(e.target.value);
                                        setSelectedSaver(null);
                                        setGenError("");
                                        setSendSuccess("");
                                    }}
                                    className="pl-10"
                                    placeholder={loading ? "Loading savers..." : "Type saver name..."}
                                    disabled={loading}
                                />
                            </div>
                            {saverSearch.trim() && !selectedSaver && (
                                <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200">
                                    {filteredSavers.length === 0 ? (
                                        <div className="px-4 py-3 text-sm text-slate-500">No savers found.</div>
                                    ) : filteredSavers.map((s) => (
                                        <button
                                            key={s.id}
                                            type="button"
                                            onClick={() => {
                                                setSelectedSaver(s);
                                                setSaverSearch(s.name);
                                                setGenError("");
                                            }}
                                            className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-slate-50"
                                        >
                                            <span className="font-medium">{s.name}</span>
                                            <span className="text-xs text-slate-400">{formatCurrency(s.balance)}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Selected Saver */}
                        <div className="grid gap-2">
                            <Label>Selected Saver</Label>
                            <Input
                                value={
                                    selectedSaver
                                        ? `${selectedSaver.name} — Balance: ${formatCurrency(selectedSaver.balance)}`
                                        : ""
                                }
                                disabled
                                className="bg-slate-50"
                                placeholder="No saver selected"
                            />
                        </div>

                        {/* Date Range */}
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="startDate">Start Date</Label>
                                <Input
                                    id="startDate"
                                    type="date"
                                    value={startDate}
                                    max={endDate || undefined}
                                    onChange={(e) => { setStartDate(e.target.value); setGenError(""); }}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="endDate">End Date</Label>
                                <Input
                                    id="endDate"
                                    type="date"
                                    value={endDate}
                                    min={startDate || undefined}
                                    onChange={(e) => { setEndDate(e.target.value); setGenError(""); }}
                                />
                            </div>
                        </div>

                        {genError ? (
                            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                                {genError}
                            </div>
                        ) : null}

                        {sendSuccess ? (
                            <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                                {sendSuccess}
                            </div>
                        ) : null}

                        {/* Action Buttons */}
                        <div className="flex flex-wrap gap-3">
                            <Button
                                onClick={handleGeneratePdf}
                                disabled={!canGenerate}
                                type="button"
                            >
                                {generating ? (
                                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating...</>
                                ) : (
                                    <><Download className="mr-2 h-4 w-4" />Download PDF</>
                                )}
                            </Button>

                            <Button
                                onClick={handleSendWhatsApp}
                                disabled={!canGenerate}
                                variant="outline"
                                type="button"
                            >
                                {sending ? (
                                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending...</>
                                ) : (
                                    <><MessageCircle className="mr-2 h-4 w-4" />Send via WhatsApp</>
                                )}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Monthly Bulk Dispatch</CardTitle>
                    <CardDescription>
                        Sends the current month's statement to every saver via WhatsApp.
                        This runs in the background — the server will process all customers automatically.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 max-w-lg">
                        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                            <strong>Note:</strong> This will send statements to <em>all</em> savers who have a WhatsApp number on file.
                            Only run this once per month.
                        </div>

                        {sendAllError ? (
                            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                                {sendAllError}
                            </div>
                        ) : null}

                        {sendAllSuccess ? (
                            <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                                {sendAllSuccess}
                            </div>
                        ) : null}

                        <Button
                            onClick={handleSendMonthlyToAll}
                            disabled={sendingAll}
                            variant="outline"
                            type="button"
                            className="w-fit"
                        >
                            {sendingAll ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Dispatching...</>
                            ) : (
                                <><MessageCircle className="mr-2 h-4 w-4" />Send This Month's Statement to All</>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Selected Saver Summary */}
            {selectedSaver ? (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            {selectedSaver.name}
                        </CardTitle>
                        <CardDescription>
                            Member since: {formatDate(selectedSaver.createdAt)} | Phone: {selectedSaver.phone}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                                <p className="text-sm font-medium text-blue-600">Current Balance</p>
                                <p className="text-2xl font-bold text-blue-700">
                                    {formatCurrency(selectedSaver.balance)}
                                </p>
                            </div>
                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                                <p className="text-sm font-medium text-slate-600">Status</p>
                                <p className="text-2xl font-bold text-slate-700 capitalize">
                                    {selectedSaver.status}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ) : null}
        </div>
    );
}