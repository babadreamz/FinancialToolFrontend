import {
    PiggyBank,
    HandCoins,
    TrendingUp,
    ArrowDownToLine,
    ArrowUpFromLine,
    Receipt,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { formatCurrency } from "../../lib/store";

export default function Dashboard({ data, onQuickAction }) {
    const activeSavers = data.savers.filter((s) => s.status === "active").length;
    const activeLoans = data.loans.filter((l) => l.status === "active").length;
    const activeInvestors = data.investors.filter((i) => i.status === "active").length;

    const totalSavings = data.savers.reduce((sum, s) => sum + s.balance, 0);
    const totalLoans = data.loans.reduce((sum, l) => sum + l.balance, 0);
    const totalInvestments = data.investments.reduce((sum, i) => sum + i.amount, 0);

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-foreground">Dashboard</h2>
                <p className="text-muted-foreground">
                    Overview of your savings and loans business
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
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
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
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
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Investors</CardTitle>
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
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <Button
                            variant="outline"
                            className="h-auto flex-col gap-2 py-4"
                            onClick={() => onQuickAction("savings", "deposit")}
                        >
                            <ArrowDownToLine className="h-5 w-5" />
                            <span>Record Savings</span>
                        </Button>

                        <Button
                            variant="outline"
                            className="h-auto flex-col gap-2 py-4"
                            onClick={() => onQuickAction("savings", "withdrawal")}
                        >
                            <ArrowUpFromLine className="h-5 w-5" />
                            <span>Record Withdrawal</span>
                        </Button>

                        <Button
                            variant="outline"
                            className="h-auto flex-col gap-2 py-4"
                            onClick={() => onQuickAction("loans", "disbursement")}
                        >
                            <HandCoins className="h-5 w-5" />
                            <span>Record Loan</span>
                        </Button>

                        <Button
                            variant="outline"
                            className="h-auto flex-col gap-2 py-4"
                            onClick={() => onQuickAction("loans", "repayment")}
                        >
                            <Receipt className="h-5 w-5" />
                            <span>Record Repayment</span>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}