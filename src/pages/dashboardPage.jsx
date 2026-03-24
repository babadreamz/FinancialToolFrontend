import { useState } from "react";
import { LayoutDashboard, PiggyBank, HandCoins, TrendingUp, FileText } from "lucide-react";
import Dashboard from "../components/dashboard/Dashboard";
import Savings from "../components/dashboard/Savings";
import Loans from "../components/dashboard/Loans";
import Investments from "../components/dashboard/Investments";
import FinancialStatement from "../components/dashboard/FinancialStatement";
import { initialData } from "../lib/store";

export default function DashboardPage() {
    const [data, setData] = useState(initialData);
    const [activeTab, setActiveTab] = useState("dashboard");
    const [quickAction, setQuickAction] = useState(null);

    const handleQuickAction = (tab, action) => {
        setActiveTab(tab);
        setQuickAction({ tab, action });
        setTimeout(() => setQuickAction(null), 100);
    };

    const tabs = [
        { key: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
        { key: "savings", label: "Savings", icon: <PiggyBank className="h-4 w-4" /> },
        { key: "loans", label: "Loans", icon: <HandCoins className="h-4 w-4" /> },
        { key: "investments", label: "Investments", icon: <TrendingUp className="h-4 w-4" /> },
        { key: "statement", label: "Statement", icon: <FileText className="h-4 w-4" /> },
    ];

    return (
        <div className="min-h-screen bg-slate-50">
            <header className="border-b bg-white">
                <div className="mx-auto max-w-7xl px-4 py-4">
                    <h1 className="text-xl font-bold text-slate-900">SAYE Financial Tool</h1>
                    <p className="text-sm text-slate-500">Financial management system</p>
                </div>
            </header>

            <main className="mx-auto max-w-7xl px-4 py-6">
                <div className="mb-6 flex flex-wrap gap-2">
                    {tabs.map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition ${
                                activeTab === tab.key
                                    ? "bg-slate-900 text-white"
                                    : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                            }`}
                        >
                            {tab.icon}
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>

                {activeTab === "dashboard" && (
                    <Dashboard data={data} onQuickAction={handleQuickAction} />
                )}

                {activeTab === "savings" && (
                    <Savings
                        data={data}
                        setData={setData}
                        initialAction={quickAction?.tab === "savings" ? quickAction.action : null}
                    />
                )}

                {activeTab === "loans" && (
                    <Loans
                        data={data}
                        setData={setData}
                        initialAction={quickAction?.tab === "loans" ? quickAction.action : null}
                    />
                )}

                {activeTab === "investments" && (
                    <Investments data={data} setData={setData} />
                )}

                {activeTab === "statement" && (
                    <FinancialStatement data={data} />
                )}
            </main>
        </div>
    );
}