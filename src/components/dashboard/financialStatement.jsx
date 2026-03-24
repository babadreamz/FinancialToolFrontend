import { useState } from "react";
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
import {formatCurrency,formatDate} from "../../lib/store.js";

export default function FinancialStatement({ data }) {
    const [selectedSaver, setSelectedSaver] = useState("");

    const getSaverTransactions = (saverId) => {
        return data.savingsRecords
            .filter((r) => r.saverId === parseInt(saverId))
            .sort((a, b) => new Date(a.date) - new Date(b.date));
    };

    const calculateRunningBalance = (transactions) => {
        let balance = 0;

        return transactions.map((t) => {
            if (!t.cancelled) {
                if (t.type === "deposit") {
                    balance += t.amount;
                } else {
                    balance -= t.amount;
                }
            }
            return { ...t, runningBalance: balance };
        });
    };

    const saver = data.savers.find((s) => s.id === parseInt(selectedSaver));
    const transactions = selectedSaver ? getSaverTransactions(selectedSaver) : [];
    const transactionsWithBalance = calculateRunningBalance(transactions);

    const totalDeposits = transactions
        .filter((t) => t.type === "deposit" && !t.cancelled)
        .reduce((sum, t) => sum + t.amount, 0);

    const totalWithdrawals = transactions
        .filter((t) => t.type === "withdrawal" && !t.cancelled)
        .reduce((sum, t) => sum + t.amount, 0);

    return (
        <div className="space-y-6">
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
                                    <SelectValue placeholder="Select a saver" />
                                </SelectTrigger>
                                <SelectContent>
                                    {data.savers.map((s) => (
                                        <SelectItem key={s.id} value={s.id.toString()}>
                                            {s.name} - Current Balance: {formatCurrency(s.balance)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {selectedSaver && saver && (
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
                                {transactionsWithBalance.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
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
                            {transaction.cancelled && (
                                <span className="ml-1 text-xs text-muted-foreground">
                              (Cancelled)
                            </span>
                            )}
                        </span>
                                            </TableCell>

                                            <TableCell
                                                className={`text-right ${transaction.cancelled ? "line-through" : ""}`}
                                            >
                                                {transaction.type === "withdrawal" && !transaction.cancelled
                                                    ? formatCurrency(transaction.amount)
                                                    : "-"}
                                            </TableCell>

                                            <TableCell
                                                className={`text-right ${transaction.cancelled ? "line-through" : ""}`}
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
            )}
        </div>
    );
}