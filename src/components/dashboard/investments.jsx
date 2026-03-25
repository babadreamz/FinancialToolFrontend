import { useEffect, useMemo, useState } from "react";
import { FileText, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Label } from "../ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "../ui/table";
import { formatCurrency, formatDate } from "../../lib/store";
import * as customerServices from "../../services/customerServices";

function buildFullName(customer) {
    return [customer.firstName, customer.middleName, customer.lastName]
        .filter(Boolean)
        .join(" ");
}

function mapSaver(customer) {
    return {
        id: customer.id,
        name: buildFullName(customer),
        phone: customer.phoneNo || customer.phone || "-",
        balance: Number(customer.balance || 0),
        status: customer.status || "active",
        createdAt: customer.createdAt || customer.dateCreated || null,
    };
}

function mapTransaction(record) {
    return {
        id: record.id,
        saverId: Number(record.saverId || record.customerId || record.customer?.id),
        type: String(record.type || record.transactionType || "").toLowerCase(),
        amount: Number(record.amount || 0),
        date:
            record.date ||
            record.createdAt ||
            record.transactionDate ||
            new Date().toISOString(),
        cancelled: Boolean(record.cancelled || record.isCancelled),
    };
}

export default function FinancialStatement({ data }) {
    const [selectedSaver, setSelectedSaver] = useState("");
    const [savers, setSavers] = useState([]);
    const [records, setRecords] = useState([]);
    const [loadingSavers, setLoadingSavers] = useState(false);
    const [loadingRecords, setLoadingRecords] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        let ignore = false;

        async function loadSavers() {
            try {
                setLoadingSavers(true);
                setError("");

                const fallbackSavers = Array.isArray(data?.savers) ? data.savers : [];

                if (typeof customerServices.getActiveCustomers === "function") {
                    const response = await customerServices.getActiveCustomers();
                    if (!ignore) {
                        setSavers(Array.isArray(response) ? response.map(mapSaver) : []);
                    }
                    return;
                }

                if (!ignore) {
                    setSavers(fallbackSavers);
                }
            } catch (err) {
                if (!ignore) {
                    setError(
                        err?.response?.data?.message ||
                        err?.response?.data?.error ||
                        "Failed to load savers."
                    );
                    setSavers(Array.isArray(data?.savers) ? data.savers : []);
                }
            } finally {
                if (!ignore) {
                    setLoadingSavers(false);
                }
            }
        }

        loadSavers();
        return () => {
            ignore = true;
        };
    }, [data?.savers]);

    useEffect(() => {
        let ignore = false;

        async function loadTransactions() {
            if (!selectedSaver) {
                setRecords([]);
                return;
            }

            try {
                setLoadingRecords(true);
                setError("");

                const saverId = String(selectedSaver);
                const service =
                    customerServices.getSavingsStatement ||
                    customerServices.getSavingsRecords ||
                    customerServices.getSaverTransactions;

                if (typeof service === "function") {
                    const response = await service(saverId);

                    const rawRecords = Array.isArray(response)
                        ? response
                        : Array.isArray(response?.records)
                            ? response.records
                            : Array.isArray(response?.transactions)
                                ? response.transactions
                                : [];

                    if (!ignore) {
                        setRecords(rawRecords.map(mapTransaction));
                    }
                    return;
                }

                const fallbackRecords = Array.isArray(data?.savingsRecords)
                    ? data.savingsRecords.filter(
                        (record) => String(record.saverId) === String(selectedSaver)
                    )
                    : [];

                if (!ignore) {
                    setRecords(fallbackRecords);
                }
            } catch (err) {
                if (!ignore) {
                    setError(
                        err?.response?.data?.message ||
                        err?.response?.data?.error ||
                        "Failed to load statement records."
                    );
                    const fallbackRecords = Array.isArray(data?.savingsRecords)
                        ? data.savingsRecords.filter(
                            (record) => String(record.saverId) === String(selectedSaver)
                        )
                        : [];
                    setRecords(fallbackRecords);
                }
            } finally {
                if (!ignore) {
                    setLoadingRecords(false);
                }
            }
        }

        loadTransactions();
        return () => {
            ignore = true;
        };
    }, [selectedSaver, data?.savingsRecords]);

    const saver = useMemo(
        () => savers.find((item) => String(item.id) === String(selectedSaver)),
        [savers, selectedSaver]
    );

    const transactions = useMemo(() => {
        return [...records].sort((a, b) => new Date(a.date) - new Date(b.date));
    }, [records]);

    const transactionsWithBalance = useMemo(() => {
        let balance = 0;

        return transactions.map((transaction) => {
            if (!transaction.cancelled) {
                if (transaction.type === "deposit") {
                    balance += Number(transaction.amount || 0);
                } else if (transaction.type === "withdrawal") {
                    balance -= Number(transaction.amount || 0);
                }
            }

            return {
                ...transaction,
                runningBalance: balance,
            };
        });
    }, [transactions]);

    const totalDeposits = transactions
        .filter((transaction) => transaction.type === "deposit" && !transaction.cancelled)
        .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);

    const totalWithdrawals = transactions
        .filter((transaction) => transaction.type === "withdrawal" && !transaction.cancelled)
        .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);

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
                    View individual saver account statements
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Select Saver</CardTitle>
                    <CardDescription>
                        Choose a saver to view their financial statement
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid max-w-sm gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="saver">Saver</Label>
                            <Select value={selectedSaver} onValueChange={setSelectedSaver}>
                                <SelectTrigger className="w-full">
                                    <SelectValue
                                        placeholder={
                                            loadingSavers ? "Loading savers..." : "Select a saver"
                                        }
                                    />
                                </SelectTrigger>
                                <SelectContent>
                                    {savers.map((item) => (
                                        <SelectItem key={item.id} value={String(item.id)}>
                                            {item.name} - Current Balance:{" "}
                                            {formatCurrency(item.balance)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {selectedSaver && saver ? (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            Account Statement - {saver.name}
                        </CardTitle>
                        <CardDescription>
                            Member since: {formatDate(saver.createdAt)} | Phone: {saver.phone}
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <div className="mb-6 grid gap-4 sm:grid-cols-3">
                            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                                <p className="text-sm font-medium text-green-600">Total Deposits</p>
                                <p className="text-2xl font-bold text-green-700">
                                    {formatCurrency(totalDeposits)}
                                </p>
                            </div>

                            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                                <p className="text-sm font-medium text-red-600">Total Withdrawals</p>
                                <p className="text-2xl font-bold text-red-700">
                                    {formatCurrency(totalWithdrawals)}
                                </p>
                            </div>

                            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                                <p className="text-sm font-medium text-blue-600">Current Balance</p>
                                <p className="text-2xl font-bold text-blue-700">
                                    {formatCurrency(saver.balance)}
                                </p>
                            </div>
                        </div>

                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="text-right">Debit</TableHead>
                                    <TableHead className="text-right">Credit</TableHead>
                                    <TableHead className="text-right">Balance</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loadingRecords ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={5}
                                            className="py-8 text-center text-muted-foreground"
                                        >
                                            Loading statement...
                                        </TableCell>
                                    </TableRow>
                                ) : transactionsWithBalance.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={5}
                                            className="py-8 text-center text-muted-foreground"
                                        >
                                            No transactions found for this saver
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    transactionsWithBalance.map((transaction) => (
                                        <TableRow
                                            key={transaction.id}
                                            className={transaction.cancelled ? "opacity-60" : ""}
                                        >
                                            <TableCell className={transaction.cancelled ? "line-through" : ""}>
                                                {formatDate(transaction.date)}
                                            </TableCell>

                                            <TableCell className={transaction.cancelled ? "line-through" : ""}>
                                                <span className="flex items-center gap-1">
                                                    {transaction.type === "deposit" ? (
                                                        <>
                                                            <ArrowDownToLine className="h-3 w-3 text-green-600" />
                                                            Deposit
                                                        </>
                                                    ) : (
                                                        <>
                                                            <ArrowUpFromLine className="h-3 w-3 text-red-600" />
                                                            Withdrawal
                                                        </>
                                                    )}

                                                    {transaction.cancelled ? (
                                                        <span className="ml-1 text-xs text-muted-foreground">
                                                            (Cancelled)
                                                        </span>
                                                    ) : null}
                                                </span>
                                            </TableCell>

                                            <TableCell
                                                className={`text-right ${
                                                    transaction.cancelled ? "line-through" : ""
                                                }`}
                                            >
                                                {transaction.type === "withdrawal" && !transaction.cancelled
                                                    ? formatCurrency(transaction.amount)
                                                    : "-"}
                                            </TableCell>

                                            <TableCell
                                                className={`text-right ${
                                                    transaction.cancelled ? "line-through" : ""
                                                }`}
                                            >
                                                {transaction.type === "deposit" && !transaction.cancelled
                                                    ? formatCurrency(transaction.amount)
                                                    : "-"}
                                            </TableCell>

                                            <TableCell
                                                className={`text-right font-medium ${
                                                    transaction.cancelled ? "line-through" : ""
                                                }`}
                                            >
                                                {formatCurrency(transaction.runningBalance)}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            ) : null}
        </div>
    );
}