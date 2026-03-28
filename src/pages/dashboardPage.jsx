import { useState } from "react";
import {
    LayoutDashboard,
    PiggyBank,
    HandCoins,
    TrendingUp,
    FileText,
    LogOut,
    Menu,
    X,
} from "lucide-react";
import { useDispatch } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import { logoutAsync } from "../features/auth/authSlice";

import Dashboard from "../components/dashboard/dashboard";
import Savings from "../components/dashboard/savings";
import Loans from "../components/dashboard/loans";
import Investments from "../components/dashboard/investments";
import FinancialStatement from "../components/dashboard/financialStatement";

const VALID_TABS = ["dashboard", "savings", "loans", "investments", "statement"];

export default function DashboardPage() {
    const [data, setData] = useState({
        savers: [],
        savingsRecords: [],
        loans: [],
        loanRecords: [],
        investors: [],
        investments: [],
        investmentReturns: [],
    });

    const [searchParams, setSearchParams] = useSearchParams();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Tab is stored in the URL: ?tab=savings
    // On reload the URL is preserved so the correct tab is restored automatically.
    const rawTab = searchParams.get("tab");
    const activeTab = VALID_TABS.includes(rawTab) ? rawTab : "dashboard";

    const dispatch = useDispatch();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await dispatch(logoutAsync());
        navigate("/");
    };

    const handleMenuClick = (key) => {
        setSearchParams({ tab: key }, { replace: true });
        setSidebarOpen(false);
    };

    const menuItems = [
        { key: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-5 w-5" /> },
        { key: "savings",   label: "Savings",   icon: <PiggyBank className="h-5 w-5" /> },
        { key: "loans",     label: "Loans",     icon: <HandCoins className="h-5 w-5" /> },
        { key: "investments", label: "Investments", icon: <TrendingUp className="h-5 w-5" /> },
        { key: "statement", label: "Statement", icon: <FileText className="h-5 w-5" /> },
    ];

    return (
        <div className="min-h-screen bg-slate-50 overflow-x-hidden">
            <div className="flex min-h-screen w-full">
                {sidebarOpen && (
                    <div
                        className="fixed inset-0 z-40 bg-black/40 md:hidden"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}

                <aside
                    className={`fixed left-0 top-0 z-50 flex h-screen w-72 flex-col border-r border-slate-200 bg-white transition-transform duration-300 md:static md:z-auto md:w-64 md:translate-x-0 ${
                        sidebarOpen ? "translate-x-0" : "-translate-x-full"
                    }`}
                >
                    <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
                        <div>
                            <h1 className="text-xl font-bold text-slate-900">SAYE Digibook</h1>
                            <p className="text-sm text-slate-500">Financial management tool</p>
                        </div>
                        <button
                            onClick={() => setSidebarOpen(false)}
                            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
                            type="button"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <nav className="flex-1 space-y-2 px-4 py-6">
                        {menuItems.map((item) => (
                            <button
                                key={item.key}
                                onClick={() => handleMenuClick(item.key)}
                                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition ${
                                    activeTab === item.key
                                        ? "bg-slate-900 text-white"
                                        : "text-slate-700 hover:bg-slate-100"
                                }`}
                                type="button"
                            >
                                {item.icon}
                                <span>{item.label}</span>
                            </button>
                        ))}
                    </nav>

                    <div className="border-t border-slate-200 p-4">
                        <button
                            onClick={handleLogout}
                            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                            type="button"
                        >
                            <LogOut className="h-5 w-5" />
                            <span>Logout</span>
                        </button>
                    </div>
                </aside>

                <div className="flex min-w-0 flex-1 flex-col">
                    <header className="border-b border-slate-200 bg-white">
                        <div className="flex items-center justify-between px-4 py-4 md:px-6">
                            <div>
                                <h1 className="text-lg font-bold text-slate-900 md:hidden">SAYE Digibook</h1>
                                <p className="text-sm text-slate-500 md:hidden">Financial management tool</p>
                            </div>
                            <button
                                onClick={() => setSidebarOpen(true)}
                                className="rounded-xl border border-slate-200 p-2 text-slate-700 hover:bg-slate-100 md:hidden"
                                type="button"
                            >
                                <Menu className="h-5 w-5" />
                            </button>
                        </div>
                    </header>

                    <main className="min-w-0 flex-1 px-4 py-6 md:px-6">
                        {activeTab === "dashboard" && <Dashboard data={data} setData={setData} />}
                        {activeTab === "savings" && <Savings data={data} setData={setData} initialAction={null} />}
                        {activeTab === "loans" && <Loans data={data} setData={setData} initialAction={null} />}
                        {activeTab === "investments" && <Investments data={data} setData={setData} />}
                        {activeTab === "statement" && <FinancialStatement data={data} />}
                    </main>
                </div>
            </div>
        </div>
    );
}
