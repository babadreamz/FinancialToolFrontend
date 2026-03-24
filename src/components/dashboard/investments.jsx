import { useState } from "react";
import { Plus, X, ArrowLeft, Calendar, UserPlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "../ui/dialog";
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

export default function Investments({ data, setData }) {
    const [selectedInvestment, setSelectedInvestment] = useState(null);
    const [showNewInvestorDialog, setShowNewInvestorDialog] = useState(false);
    const [showNewInvestmentDialog, setShowNewInvestmentDialog] = useState(false);
    const [showReturnDialog, setShowReturnDialog] = useState(false);

    const [investorName, setInvestorName] = useState("");
    const [investorPhone, setInvestorPhone] = useState("");

    const [selectedInvestor, setSelectedInvestor] = useState("");
    const [investmentAmount, setInvestmentAmount] = useState("");
    const [returnRate, setReturnRate] = useState("15");
    const [investmentEndDate, setInvestmentEndDate] = useState("");

    const [returnAmount, setReturnAmount] = useState("");

    const handleRegisterInvestor = () => {
        if (!investorName || !investorPhone) return;

        const newInvestor = {
            id: Math.max(...data.investors.map((i) => i.id), 0) + 1,
            name: investorName,
            phone: investorPhone,
            status: "active",
            createdAt: new Date().toISOString().split("T")[0],
        };

        setData({
            ...data,
            investors: [...data.investors, newInvestor],
        });

        setShowNewInvestorDialog(false);
        setInvestorName("");
        setInvestorPhone("");
    };

    const handleCreateInvestment = () => {
        if (!selectedInvestor || !investmentAmount || !investmentEndDate) return;

        const investor = data.investors.find((i) => i.id === parseInt(selectedInvestor));
        const newInvestmentId = Math.max(...data.investments.map((i) => i.id), 0) + 1;

        const newInvestment = {
            id: newInvestmentId,
            investorId: parseInt(selectedInvestor),
            investorName: investor.name,
            amount: parseFloat(investmentAmount),
            returnRate: parseFloat(returnRate),
            status: "active",
            startDate: new Date().toISOString().split("T")[0],
            endDate: investmentEndDate,
        };

        setData({
            ...data,
            investments: [...data.investments, newInvestment],
        });

        setShowNewInvestmentDialog(false);
        setSelectedInvestor("");
        setInvestmentAmount("");
        setReturnRate("15");
        setInvestmentEndDate("");
    };

    const handleRecordReturn = () => {
        if (!returnAmount) return;

        const newReturn = {
            id: Math.max(...data.investmentReturns.map((r) => r.id), 0) + 1,
            investmentId: selectedInvestment,
            amount: parseFloat(returnAmount),
            date: new Date().toISOString().split("T")[0],
            cancelled: false,
        };

        setData({
            ...data,
            investmentReturns: [...data.investmentReturns, newReturn],
        });

        setShowReturnDialog(false);
        setReturnAmount("");
    };

    const handleCancelReturn = (returnId) => {
        const returnIndex = data.investmentReturns.findIndex((r) => r.id === returnId);
        const returnRecord = data.investmentReturns[returnIndex];

        if (returnRecord.cancelled) return;

        const updatedReturns = [...data.investmentReturns];
        updatedReturns[returnIndex] = { ...returnRecord, cancelled: true };

        setData({
            ...data,
            investmentReturns: updatedReturns,
        });
    };

    const activeInvestments = data.investments.filter((i) => i.status === "active");

    const getInvestmentReturns = (investmentId) => {
        return data.investmentReturns
            .filter((r) => r.investmentId === investmentId)
            .sort((a, b) => new Date(b.date) - new Date(a.date));
    };

    const getTotalReturns = (investmentId) => {
        return data.investmentReturns
            .filter((r) => r.investmentId === investmentId && !r.cancelled)
            .reduce((sum, r) => sum + r.amount, 0);
    };

    if (selectedInvestment) {
        const investment = data.investments.find((i) => i.id === selectedInvestment);
        const returns = getInvestmentReturns(selectedInvestment);
        const totalReturns = getTotalReturns(selectedInvestment);

        return (
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedInvestment(null)}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Investments
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>{investment.investorName} - Investment Details</CardTitle>
                        <CardDescription>
                            Principal: {formatCurrency(investment.amount)} | Return Rate:{" "}
                            {investment.returnRate}% | Total Returns Paid:{" "}
                            {formatCurrency(totalReturns)} | End Date: {formatDate(investment.endDate)}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="font-semibold">Investment Returns History</h3>
                            <Button size="sm" onClick={() => setShowReturnDialog(true)}>
                                <Plus className="mr-2 h-4 w-4" />
                                Record Return Payment
                            </Button>
                        </div>

                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {returns.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                                            No returns recorded yet
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    returns.map((ret) => (
                                        <TableRow key={ret.id} className={ret.cancelled ? "opacity-60" : ""}>
                                            <TableCell className={ret.cancelled ? "line-through" : ""}>
                                                {formatDate(ret.date)}
                                            </TableCell>
                                            <TableCell className={`text-right ${ret.cancelled ? "line-through" : ""}`}>
                                                {formatCurrency(ret.amount)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {!ret.cancelled && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-7 text-xs text-muted-foreground hover:text-destructive"
                                                        onClick={() => handleCancelReturn(ret.id)}
                                                    >
                                                        <X className="mr-1 h-3 w-3" />
                                                        Cancel
                                                    </Button>
                                                )}
                                                {ret.cancelled && (
                                                    <span className="text-xs text-muted-foreground">Cancelled</span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <Dialog open={showReturnDialog} onOpenChange={setShowReturnDialog}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Record Investment Return</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label>Investment</Label>
                                <p className="text-sm text-muted-foreground">
                                    {investment.investorName} - Principal: {formatCurrency(investment.amount)}
                                </p>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="return-amount">Return Amount</Label>
                                <Input
                                    id="return-amount"
                                    type="number"
                                    placeholder="Enter return amount"
                                    value={returnAmount}
                                    onChange={(e) => setReturnAmount(e.target.value)}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowReturnDialog(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleRecordReturn}>Record Return</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-foreground">Investments</h2>
                    <p className="text-muted-foreground">
                        Manage investor investments and returns
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setShowNewInvestorDialog(true)}>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Register Investor
                    </Button>
                    <Button onClick={() => setShowNewInvestmentDialog(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        New Investment
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Active Investments</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Investor</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Return Rate</TableHead>
                                <TableHead>End Date</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {activeInvestments.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                                        No active investments
                                    </TableCell>
                                </TableRow>
                            ) : (
                                activeInvestments.map((investment) => (
                                    <TableRow
                                        key={investment.id}
                                        className="cursor-pointer hover:bg-muted/50"
                                        onClick={() => setSelectedInvestment(investment.id)}
                                    >
                                        <TableCell className="font-medium">{investment.investorName}</TableCell>
                                        <TableCell>{formatCurrency(investment.amount)}</TableCell>
                                        <TableCell>{investment.returnRate}%</TableCell>
                                        <TableCell className="flex items-center gap-1">
                                            <Calendar className="h-3 w-3 text-muted-foreground" />
                                            {formatDate(investment.endDate)}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={showNewInvestorDialog} onOpenChange={setShowNewInvestorDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Register New Investor</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="investor-name">Investor Name</Label>
                            <Input
                                id="investor-name"
                                placeholder="Enter investor name"
                                value={investorName}
                                onChange={(e) => setInvestorName(e.target.value)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="investor-phone">Phone Number</Label>
                            <Input
                                id="investor-phone"
                                placeholder="Enter phone number"
                                value={investorPhone}
                                onChange={(e) => setInvestorPhone(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowNewInvestorDialog(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleRegisterInvestor}>Register Investor</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={showNewInvestmentDialog} onOpenChange={setShowNewInvestmentDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Record New Investment</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="investor">Investor</Label>
                            <Select value={selectedInvestor} onValueChange={setSelectedInvestor}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select an investor" />
                                </SelectTrigger>
                                <SelectContent>
                                    {data.investors
                                        .filter((i) => i.status === "active")
                                        .map((investor) => (
                                            <SelectItem key={investor.id} value={investor.id.toString()}>
                                                {investor.name}
                                            </SelectItem>
                                        ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="investment-amount">Investment Amount</Label>
                            <Input
                                id="investment-amount"
                                type="number"
                                placeholder="Enter investment amount"
                                value={investmentAmount}
                                onChange={(e) => setInvestmentAmount(e.target.value)}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="return-rate">Return Rate (%)</Label>
                            <Input
                                id="return-rate"
                                type="number"
                                placeholder="Enter return rate"
                                value={returnRate}
                                onChange={(e) => setReturnRate(e.target.value)}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="investment-end-date">Investment End Date</Label>
                            <Input
                                id="investment-end-date"
                                type="date"
                                value={investmentEndDate}
                                onChange={(e) => setInvestmentEndDate(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowNewInvestmentDialog(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleCreateInvestment}>Record Investment</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}