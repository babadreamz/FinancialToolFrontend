import { useEffect, useState } from "react";
import { Plus, ArrowDownToLine, ArrowUpFromLine, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
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

export default function Savings({ data, setData, initialAction }) {
    const [showRecordTypeDialog, setShowRecordTypeDialog] = useState(false);
    const [showRecordDialog, setShowRecordDialog] = useState(false);
    const [recordType, setRecordType] = useState(null);
    const [selectedSaver, setSelectedSaver] = useState("");
    const [amount, setAmount] = useState("");

    useEffect(() => {
        if (initialAction) {
            setRecordType(initialAction);
            setShowRecordDialog(true);
        }
    }, [initialAction]);

    const handleNewRecord = () => {
        setShowRecordTypeDialog(true);
    };

    const handleSelectRecordType = (type) => {
        setRecordType(type);
        setShowRecordTypeDialog(false);
        setShowRecordDialog(true);
    };

    const handleSubmitRecord = () => {
        if (!selectedSaver || !amount) return;

        const newRecord = {
            id: Math.max(...data.savingsRecords.map((r) => r.id), 0) + 1,
            saverId: parseInt(selectedSaver),
            type: recordType,
            amount: parseFloat(amount),
            date: new Date().toISOString().split("T")[0],
            cancelled: false,
        };

        const saverIndex = data.savers.findIndex((s) => s.id === parseInt(selectedSaver));
        const updatedSavers = [...data.savers];

        if (recordType === "deposit") {
            updatedSavers[saverIndex].balance += parseFloat(amount);
        } else {
            updatedSavers[saverIndex].balance -= parseFloat(amount);
        }

        setData({
            ...data,
            savingsRecords: [...data.savingsRecords, newRecord],
            savers: updatedSavers,
        });

        setShowRecordDialog(false);
        setSelectedSaver("");
        setAmount("");
        setRecordType(null);
    };

    const handleCancelRecord = (recordId) => {
        const recordIndex = data.savingsRecords.findIndex((r) => r.id === recordId);
        const record = data.savingsRecords[recordIndex];

        if (record.cancelled) return;

        const saverIndex = data.savers.findIndex((s) => s.id === record.saverId);
        const updatedSavers = [...data.savers];

        if (record.type === "deposit") {
            updatedSavers[saverIndex].balance -= record.amount;
        } else {
            updatedSavers[saverIndex].balance += record.amount;
        }

        const updatedRecords = [...data.savingsRecords];
        updatedRecords[recordIndex] = { ...record, cancelled: true };

        setData({
            ...data,
            savingsRecords: updatedRecords,
            savers: updatedSavers,
        });
    };

    const getSaverName = (saverId) => {
        const saver = data.savers.find((s) => s.id === saverId);
        return saver ? saver.name : "Unknown";
    };

    const sortedRecords = [...data.savingsRecords].sort(
        (a, b) => new Date(b.date) - new Date(a.date)
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-foreground">Savings</h2>
                    <p className="text-muted-foreground">
                        Manage savings deposits and withdrawals
                    </p>
                </div>
                <Button onClick={handleNewRecord}>
                    <Plus className="mr-2 h-4 w-4" />
                    New Record
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Savings Records</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Saver</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedRecords.map((record) => (
                                <TableRow key={record.id} className={record.cancelled ? "opacity-60" : ""}>
                                    <TableCell className={record.cancelled ? "line-through" : ""}>
                                        {formatDate(record.date)}
                                    </TableCell>
                                    <TableCell className={record.cancelled ? "line-through" : ""}>
                                        {getSaverName(record.saverId)}
                                    </TableCell>
                                    <TableCell className={record.cancelled ? "line-through" : ""}>
                    <span
                        className={`inline-flex items-center gap-1 ${
                            record.type === "deposit" ? "text-green-600" : "text-red-600"
                        }`}
                    >
                      {record.type === "deposit" ? (
                          <ArrowDownToLine className="h-3 w-3" />
                      ) : (
                          <ArrowUpFromLine className="h-3 w-3" />
                      )}
                        {record.type === "deposit" ? "Deposit" : "Withdrawal"}
                    </span>
                                    </TableCell>
                                    <TableCell className={`text-right ${record.cancelled ? "line-through" : ""}`}>
                                        {formatCurrency(record.amount)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {!record.cancelled && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 text-xs text-muted-foreground hover:text-destructive"
                                                onClick={() => handleCancelRecord(record.id)}
                                            >
                                                <X className="mr-1 h-3 w-3" />
                                                Cancel
                                            </Button>
                                        )}
                                        {record.cancelled && (
                                            <span className="text-xs text-muted-foreground">Cancelled</span>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={showRecordTypeDialog} onOpenChange={setShowRecordTypeDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Select Record Type</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <Button
                            variant="outline"
                            className="h-auto flex-col gap-2 py-6"
                            onClick={() => handleSelectRecordType("deposit")}
                        >
                            <ArrowDownToLine className="h-6 w-6 text-green-600" />
                            <span className="font-medium">Deposit</span>
                            <span className="text-xs text-muted-foreground">
                Record a savings deposit
              </span>
                        </Button>

                        <Button
                            variant="outline"
                            className="h-auto flex-col gap-2 py-6"
                            onClick={() => handleSelectRecordType("withdrawal")}
                        >
                            <ArrowUpFromLine className="h-6 w-6 text-red-600" />
                            <span className="font-medium">Withdrawal</span>
                            <span className="text-xs text-muted-foreground">
                Record a savings withdrawal
              </span>
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={showRecordDialog} onOpenChange={setShowRecordDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {recordType === "deposit" ? "Record Deposit" : "Record Withdrawal"}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="saver">Saver</Label>
                            <Select value={selectedSaver} onValueChange={setSelectedSaver}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select a saver" />
                                </SelectTrigger>
                                <SelectContent>
                                    {data.savers
                                        .filter((s) => s.status === "active")
                                        .map((saver) => (
                                            <SelectItem key={saver.id} value={saver.id.toString()}>
                                                {saver.name} - Balance: {formatCurrency(saver.balance)}
                                            </SelectItem>
                                        ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="amount">Amount</Label>
                            <Input
                                id="amount"
                                type="number"
                                placeholder="Enter amount"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowRecordDialog(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSubmitRecord}>
                            Record {recordType === "deposit" ? "Deposit" : "Withdrawal"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}