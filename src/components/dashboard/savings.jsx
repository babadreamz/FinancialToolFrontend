import { useEffect, useMemo, useState } from "react";
import { Plus, ArrowDownToLine, Search, UserPlus } from "lucide-react";
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
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "../ui/table";
import { formatCurrency, formatDate } from "../../lib/store";
import {
    registerSaver,
    getActiveCustomers,
} from "../../services/customerServices";
import {recordSavings} from "../../services/adminServices";
import { getLoggedInAdminId } from "../../lib/auth";
import { PAYMENT_METHODS } from "../../constants/paymentMethods";

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
        whatsappNo: customer.whatsappNo || "",
        accountId: customer.accountId || "",
        balance: Number(customer.balance || 0),
        status: customer.status || "active",
        createdAt: customer.createdAt || customer.dateCreated || "",
    };
}

export default function Savings({ data, setData, initialAction }) {
    const [showRecordDialog, setShowRecordDialog] = useState(false);
    const [showRegisterSaverDialog, setShowRegisterSaverDialog] = useState(false);

    const [selectedSaver, setSelectedSaver] = useState(null);
    const [saverSearch, setSaverSearch] = useState("");
    const [amount, setAmount] = useState("");
    const [paymentMethod, setPaymentMethod] = useState(
        PAYMENT_METHODS?.[0]?.value || "CASH"
    );

    const [activeSavers, setActiveSavers] = useState([]);
    const [isLoadingSavers, setIsLoadingSavers] = useState(false);
    const [isRegisteringSaver, setIsRegisteringSaver] = useState(false);
    const [isRecordingSavings, setIsRecordingSavings] = useState(false);

    const [formError, setFormError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    const [saverForm, setSaverForm] = useState({
        firstName: "",
        middleName: "",
        lastName: "",
        email: "",
        phoneNo: "",
        whatsappNo: "",
        address: "",
    });

    useEffect(() => {
        loadActiveSavers();
    }, []);

    useEffect(() => {
        if (initialAction === "register-saver") {
            setShowRegisterSaverDialog(true);
        }

        if (initialAction === "deposit") {
            setShowRecordDialog(true);
        }
    }, [initialAction]);

    const loadActiveSavers = async () => {
        try {
            setIsLoadingSavers(true);
            setFormError("");

            const response = await getActiveCustomers();
            const savers = Array.isArray(response) ? response.map(mapSaver) : [];

            setActiveSavers(savers);

            setData((prev) => ({
                ...prev,
                savers,
            }));
        } catch (error) {
            setFormError(
                error?.response?.data?.message ||
                error?.response?.data?.error ||
                "Failed to load active savers."
            );
        } finally {
            setIsLoadingSavers(false);
        }
    };

    const filteredSavers = useMemo(() => {
        const query = saverSearch.trim().toLowerCase();

        if (!query) return activeSavers;

        return activeSavers.filter((saver) =>
            saver.name.toLowerCase().includes(query)
        );
    }, [activeSavers, saverSearch]);

    const handleSaverInputChange = (event) => {
        const { name, value } = event.target;

        setSaverForm((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleRegisterSaver = async () => {
        setFormError("");
        setSuccessMessage("");

        if (
            !saverForm.firstName.trim() ||
            !saverForm.lastName.trim() ||
            !saverForm.address.trim()
        ) {
            setFormError("First name, last name and address are required.");
            return;
        }

        try {
            setIsRegisteringSaver(true);

            await registerSaver(saverForm);
            await loadActiveSavers();

            setSaverForm({
                firstName: "",
                middleName: "",
                lastName: "",
                email: "",
                phoneNo: "",
                whatsappNo: "",
                address: "",
            });

            setShowRegisterSaverDialog(false);
            setSuccessMessage("Saver registered successfully.");
        } catch (error) {
            setFormError(
                error?.response?.data?.message ||
                error?.response?.data?.error ||
                "Failed to register saver."
            );
        } finally {
            setIsRegisteringSaver(false);
        }
    };

    const handleSubmitSavings = async () => {
        setFormError("");
        setSuccessMessage("");

        if (!selectedSaver || !amount) {
            setFormError("Please select a saver and enter amount.");
            return;
        }

        const recorderId = getLoggedInAdminId();

        if (!recorderId) {
            setFormError("Could not find logged in admin.");
            return;
        }

        try {
            setIsRecordingSavings(true);

            await recordSavings({
                saverId: String(selectedSaver.id),
                amount: Number(amount),
                paymentMethod,
                recorderId: String(recorderId),
            });

            await loadActiveSavers();

            setSelectedSaver(null);
            setSaverSearch("");
            setAmount("");
            setPaymentMethod(PAYMENT_METHODS?.[0]?.value || "CASH");
            setShowRecordDialog(false);
            setSuccessMessage("Savings recorded successfully.");
        } catch (error) {
            setFormError(
                error?.response?.data?.message ||
                error?.response?.data?.error ||
                "Failed to record savings."
            );
        } finally {
            setIsRecordingSavings(false);
        }
    };

    const savers = data?.savers || [];

    return (
        <div className="space-y-6">
            {successMessage ? (
                <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                    {successMessage}
                </div>
            ) : null}

            {formError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                    {formError}
                </div>
            ) : null}

            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-foreground">Savings</h2>
                    <p className="text-muted-foreground">
                        Manage saver registration and savings deposits
                    </p>
                </div>

                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setShowRegisterSaverDialog(true)}>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Register Saver
                    </Button>

                    <Button onClick={() => setShowRecordDialog(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Record Savings
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Active Savers</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Phone</TableHead>
                                <TableHead>Created</TableHead>
                                <TableHead className="text-right">Balance</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoadingSavers ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                                        Loading savers...
                                    </TableCell>
                                </TableRow>
                            ) : savers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                                        No active savers found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                savers.map((saver) => (
                                    <TableRow key={saver.id}>
                                        <TableCell className="font-medium">{saver.name}</TableCell>
                                        <TableCell>{saver.phone || "-"}</TableCell>
                                        <TableCell>{formatDate(saver.createdAt)}</TableCell>
                                        <TableCell className="text-right">
                                            {formatCurrency(saver.balance)}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={showRecordDialog} onOpenChange={setShowRecordDialog}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Record Savings</DialogTitle>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="saver-search">Search Saver</Label>
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <Input
                                    id="saver-search"
                                    value={saverSearch}
                                    onChange={(e) => {
                                        setSaverSearch(e.target.value);
                                        setSelectedSaver(null);
                                    }}
                                    placeholder="Type saver name"
                                    className="pl-10"
                                />
                            </div>
                        </div>

                        <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200">
                            {isLoadingSavers ? (
                                <div className="px-4 py-3 text-sm text-slate-500">
                                    Loading savers...
                                </div>
                            ) : filteredSavers.length === 0 ? (
                                <div className="px-4 py-3 text-sm text-slate-500">
                                    No matching saver found.
                                </div>
                            ) : (
                                filteredSavers.map((saver) => (
                                    <button
                                        key={saver.id}
                                        type="button"
                                        onClick={() => {
                                            setSelectedSaver(saver);
                                            setSaverSearch(saver.name);
                                        }}
                                        className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm transition hover:bg-slate-50 ${
                                            selectedSaver?.id === saver.id ? "bg-slate-100" : ""
                                        }`}
                                    >
                                        <span>{saver.name}</span>
                                        <span className="text-slate-500">
                                            {saver.accountId || saver.id}
                                        </span>
                                    </button>
                                ))
                            )}
                        </div>

                        <div className="grid gap-2">
                            <Label>Selected Saver ID</Label>
                            <Input value={selectedSaver?.id || ""} disabled />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="amount">Amount</Label>
                            <Input
                                id="amount"
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="Enter amount"
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="paymentMethod">Payment Method</Label>
                            <select
                                id="paymentMethod"
                                value={paymentMethod}
                                onChange={(e) => setPaymentMethod(e.target.value)}
                                className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                            >
                                {PAYMENT_METHODS.map((method) => (
                                    <option key={method.value} value={method.value}>
                                        {method.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowRecordDialog(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSubmitSavings} disabled={isRecordingSavings}>
                            {isRecordingSavings ? "Saving..." : "Save Record"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={showRegisterSaverDialog} onOpenChange={setShowRegisterSaverDialog}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Register New Saver</DialogTitle>
                    </DialogHeader>

                    <div className="grid gap-4 py-4 md:grid-cols-2">
                        <div className="grid gap-2">
                            <Label htmlFor="firstName">First Name</Label>
                            <Input
                                id="firstName"
                                name="firstName"
                                value={saverForm.firstName}
                                onChange={handleSaverInputChange}
                                placeholder="Enter first name"
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="middleName">Middle Name</Label>
                            <Input
                                id="middleName"
                                name="middleName"
                                value={saverForm.middleName}
                                onChange={handleSaverInputChange}
                                placeholder="Enter middle name"
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="lastName">Last Name</Label>
                            <Input
                                id="lastName"
                                name="lastName"
                                value={saverForm.lastName}
                                onChange={handleSaverInputChange}
                                placeholder="Enter last name"
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                value={saverForm.email}
                                onChange={handleSaverInputChange}
                                placeholder="Enter email"
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="phoneNo">Phone Number</Label>
                            <Input
                                id="phoneNo"
                                name="phoneNo"
                                value={saverForm.phoneNo}
                                onChange={handleSaverInputChange}
                                placeholder="Enter phone number"
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="whatsappNo">WhatsApp Number</Label>
                            <Input
                                id="whatsappNo"
                                name="whatsappNo"
                                value={saverForm.whatsappNo}
                                onChange={handleSaverInputChange}
                                placeholder="Enter WhatsApp number"
                            />
                        </div>

                        <div className="grid gap-2 md:col-span-2">
                            <Label htmlFor="address">Address</Label>
                            <Input
                                id="address"
                                name="address"
                                value={saverForm.address}
                                onChange={handleSaverInputChange}
                                placeholder="Enter address"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowRegisterSaverDialog(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleRegisterSaver} disabled={isRegisteringSaver}>
                            {isRegisteringSaver ? "Registering..." : "Register Saver"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}