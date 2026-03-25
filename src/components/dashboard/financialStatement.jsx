import { useEffect, useMemo, useState } from "react";
import { FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Label } from "../ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../ui/select";
import { formatCurrency, formatDate } from "../../lib/store";
import { getActiveCustomers } from "../../services/customerServices";

function mapSaver(customer) {
    return {
        id: customer.id,
        name: [customer.firstName, customer.middleName, customer.lastName]
            .filter(Boolean)
            .join(" "),
        phone: customer.phoneNo || customer.phone || "-",
        balance: Number(customer.balance || 0),
        status: customer.status || "active",
        createdAt: customer.createdAt || customer.dateCreated || "",
    };
}

export default function FinancialStatement() {
    const [selectedSaver, setSelectedSaver] = useState("");
    const [savers, setSavers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        let ignore = false;

        async function loadSavers() {
            try {
                setLoading(true);
                setError("");

                const response = await getActiveCustomers();

                if (!ignore) {
                    setSavers(Array.isArray(response) ? response.map(mapSaver) : []);
                }
            } catch (err) {
                if (!ignore) {
                    setError(
                        err?.response?.data?.message ||
                        err?.response?.data?.error ||
                        "Failed to load savers."
                    );
                }
            } finally {
                if (!ignore) {
                    setLoading(false);
                }
            }
        }

        loadSavers();

        return () => {
            ignore = true;
        };
    }, []);

    const saver = useMemo(
        () => savers.find((item) => String(item.id) === String(selectedSaver)),
        [savers, selectedSaver]
    );

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
                    View saver account summary from backend data
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Select Saver</CardTitle>
                    <CardDescription>
                        Choose a saver to view their account summary
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid max-w-sm gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="saver">Saver</Label>
                            <Select value={selectedSaver} onValueChange={setSelectedSaver}>
                                <SelectTrigger className="w-full">
                                    <SelectValue
                                        placeholder={loading ? "Loading savers..." : "Select a saver"}
                                    />
                                </SelectTrigger>
                                <SelectContent>
                                    {savers.map((item) => (
                                        <SelectItem key={item.id} value={String(item.id)}>
                                            {item.name} - {formatCurrency(item.balance)}
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
                            Account Summary - {saver.name}
                        </CardTitle>
                        <CardDescription>
                            Member since: {formatDate(saver.createdAt)} | Phone: {saver.phone}
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                                <p className="text-sm font-medium text-blue-600">Current Balance</p>
                                <p className="text-2xl font-bold text-blue-700">
                                    {formatCurrency(saver.balance)}
                                </p>
                            </div>

                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                                <p className="text-sm font-medium text-slate-600">Status</p>
                                <p className="text-2xl font-bold text-slate-700 capitalize">
                                    {saver.status}
                                </p>
                            </div>
                        </div>

                        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                            Transaction statement is not shown here yet because there is no backend
                            savings-records endpoint connected in the provided services.
                        </div>
                    </CardContent>
                </Card>
            ) : null}
        </div>
    );
}