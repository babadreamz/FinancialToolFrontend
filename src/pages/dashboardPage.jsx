import { useEffect, useRef, useState } from "react";
import {
    LayoutDashboard,
    PiggyBank,
    HandCoins,
    TrendingUp,
    FileText,
    LogOut,
    Menu,
    X,
    KeyRound,
    UserCircle,
    Eye,
    EyeOff,
} from "lucide-react";
import { useDispatch } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import { logoutAsync } from "../features/auth/authSlice";
import { getLoggedInAdminId } from "../lib/auth";
import { changeAdminPassword, getAdminProfile } from "../services/adminServices";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

import Dashboard from "../components/dashboard/dashboard";
import Savings from "../components/dashboard/savings";
import Loans from "../components/dashboard/loans";
import Investments from "../components/dashboard/investments";
import FinancialStatement from "../components/dashboard/financialStatement";

const VALID_TABS = ["dashboard", "savings", "loans", "investments", "statement"];

const INITIAL_CHANGE_PASSWORD_FORM = {
    password: "",
    newPassword: "",
    confirmNewPassword: "",
};

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

    // ── profile dropdown ───────────────────────────────────────────────────────
    const [profileOpen, setProfileOpen] = useState(false);
    const [adminUsername, setAdminUsername] = useState("");
    const profileRef = useRef(null);

    // ── change password modal ──────────────────────────────────────────────────
    const [showChangePassword, setShowChangePassword] = useState(false);
    const [changePasswordForm, setChangePasswordForm] = useState(INITIAL_CHANGE_PASSWORD_FORM);
    const [changePasswordError, setChangePasswordError] = useState("");
    const [changePasswordSuccess, setChangePasswordSuccess] = useState("");
    const [isSavingPassword, setIsSavingPassword] = useState(false);
    const [showPasswords, setShowPasswords] = useState({
        password: false,
        newPassword: false,
        confirmNewPassword: false,
    });

    const toggleShowPassword = (field) =>
        setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }));

    const rawTab = searchParams.get("tab");
    const activeTab = VALID_TABS.includes(rawTab) ? rawTab : "dashboard";

    const dispatch = useDispatch();
    const navigate = useNavigate();

    // ── fetch admin username on mount ──────────────────────────────────────────
    useEffect(() => {
        async function loadProfile() {
            try {
                const username = await getAdminProfile();
                setAdminUsername(typeof username === "string" ? username : username?.data ?? "Admin");
            } catch {
                setAdminUsername("Admin");
            }
        }
        void loadProfile();
    }, []);

    // ── close dropdown when clicking outside ───────────────────────────────────
    useEffect(() => {
        function handleOutsideClick(e) {
            if (profileRef.current && !profileRef.current.contains(e.target)) {
                setProfileOpen(false);
            }
        }
        if (profileOpen) document.addEventListener("mousedown", handleOutsideClick);
        return () => document.removeEventListener("mousedown", handleOutsideClick);
    }, [profileOpen]);

    const handleLogout = async () => {
        await dispatch(logoutAsync());
        navigate("/");
    };

    const handleMenuClick = (key) => {
        setSearchParams({ tab: key }, { replace: true });
        setSidebarOpen(false);
    };

    // ── change password ────────────────────────────────────────────────────────
    const openChangePassword = () => {
        setProfileOpen(false);
        setChangePasswordForm(INITIAL_CHANGE_PASSWORD_FORM);
        setChangePasswordError("");
        setChangePasswordSuccess("");
        setShowPasswords({ password: false, newPassword: false, confirmNewPassword: false });
        setShowChangePassword(true);
    };

    const closeChangePassword = () => {
        setShowChangePassword(false);
        setChangePasswordForm(INITIAL_CHANGE_PASSWORD_FORM);
        setChangePasswordError("");
        setChangePasswordSuccess("");
    };

    const handleChangePasswordInput = (e) => {
        const { name, value } = e.target;
        setChangePasswordForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleChangePassword = async () => {
        setChangePasswordError("");
        setChangePasswordSuccess("");

        const { password, newPassword, confirmNewPassword } = changePasswordForm;

        if (!password.trim() || !newPassword.trim() || !confirmNewPassword.trim()) {
            setChangePasswordError("All fields are required.");
            return;
        }
        if (newPassword.length < 6) {
            setChangePasswordError("New password must be at least 6 characters.");
            return;
        }
        if (newPassword !== confirmNewPassword) {
            setChangePasswordError("New password and confirmation do not match.");
            return;
        }

        const id = getLoggedInAdminId();
        if (!id) {
            setChangePasswordError("Could not identify the logged-in admin.");
            return;
        }

        try {
            setIsSavingPassword(true);
            await changeAdminPassword({ id: String(id), password, newPassword });
            setChangePasswordSuccess("Password changed successfully.");
            setChangePasswordForm(INITIAL_CHANGE_PASSWORD_FORM);
        } catch (error) {
            setChangePasswordError(
                error?.response?.data?.message ||
                error?.response?.data?.error ||
                error?.message ||
                "Failed to change password."
            );
        } finally {
            setIsSavingPassword(false);
        }
    };

    const menuItems = [
        { key: "dashboard",   label: "Dashboard",   icon: <LayoutDashboard className="h-5 w-5" /> },
        { key: "savings",     label: "Savings",     icon: <PiggyBank className="h-5 w-5" /> },
        { key: "loans",       label: "Loans",       icon: <HandCoins className="h-5 w-5" /> },
        { key: "investments", label: "Investments", icon: <TrendingUp className="h-5 w-5" /> },
        { key: "statement",   label: "Statement",   icon: <FileText className="h-5 w-5" /> },
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

                {/* ── sidebar ── */}
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
                    {/* logout removed from here — lives in the header avatar dropdown */}
                </aside>

                {/* ── main content ── */}
                <div className="flex min-w-0 flex-1 flex-col">
                    <header className="border-b border-slate-200 bg-white">
                        <div className="flex items-center justify-between px-4 py-4 md:px-6">
                            <div>
                                <h1 className="text-lg font-bold text-slate-900 md:hidden">SAYE Digibook</h1>
                                <p className="text-sm text-slate-500 md:hidden">Financial management tool</p>
                            </div>

                            <div className="flex items-center gap-3 ml-auto">
                                {/* hamburger — mobile only */}
                                <button
                                    onClick={() => setSidebarOpen(true)}
                                    className="rounded-xl border border-slate-200 p-2 text-slate-700 hover:bg-slate-100 md:hidden"
                                    type="button"
                                >
                                    <Menu className="h-5 w-5" />
                                </button>

                                {/* ── avatar / profile dropdown ── */}
                                <div className="relative" ref={profileRef}>
                                    <button
                                        type="button"
                                        onClick={() => setProfileOpen((prev) => !prev)}
                                        className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-white transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
                                        aria-label="Open profile menu"
                                    >
                                        <UserCircle className="h-5 w-5" />
                                    </button>

                                    {profileOpen && (
                                        <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-slate-200 bg-white py-2 shadow-lg z-50">
                                            {/* username */}
                                            <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
                                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                                                    <UserCircle className="h-5 w-5" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-semibold text-slate-900">
                                                        {adminUsername || "Admin"}
                                                    </p>
                                                    <p className="text-xs text-slate-500">Administrator</p>
                                                </div>
                                            </div>

                                            {/* change password */}
                                            <button
                                                type="button"
                                                onClick={openChangePassword}
                                                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50"
                                            >
                                                <KeyRound className="h-4 w-4 text-slate-500" />
                                                Change Password
                                            </button>

                                            {/* logout */}
                                            <button
                                                type="button"
                                                onClick={handleLogout}
                                                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-600 transition hover:bg-red-50"
                                            >
                                                <LogOut className="h-4 w-4" />
                                                Logout
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </header>

                    <main className="min-w-0 flex-1 px-4 py-6 md:px-6">
                        {activeTab === "dashboard"   && <Dashboard data={data} setData={setData} />}
                        {activeTab === "savings"     && <Savings data={data} setData={setData} initialAction={null} />}
                        {activeTab === "loans"       && <Loans data={data} setData={setData} initialAction={null} />}
                        {activeTab === "investments" && <Investments data={data} setData={setData} />}
                        {activeTab === "statement"   && <FinancialStatement data={data} />}
                    </main>
                </div>
            </div>

            {/* ── change password modal ── */}
            {showChangePassword && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
                    <div className="absolute inset-0" onClick={closeChangePassword} />
                    <div className="relative z-10 w-full max-w-md rounded-2xl bg-white shadow-2xl">
                        {/* header */}
                        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                            <div className="flex items-center gap-2">
                                <KeyRound className="h-5 w-5 text-slate-600" />
                                <h3 className="text-lg font-semibold text-slate-900">Change Password</h3>
                            </div>
                            <button
                                type="button"
                                onClick={closeChangePassword}
                                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* body */}
                        <div className="px-6 py-5 space-y-4">
                            {changePasswordSuccess && (
                                <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                                    {changePasswordSuccess}
                                </div>
                            )}
                            {changePasswordError && (
                                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                                    {changePasswordError}
                                </div>
                            )}

                            {[
                                { id: "cp-current",  name: "password",            label: "Current Password",     placeholder: "Enter current password",  autoComplete: "current-password" },
                                { id: "cp-new",      name: "newPassword",          label: "New Password",         placeholder: "Enter new password",       autoComplete: "new-password"     },
                                { id: "cp-confirm",  name: "confirmNewPassword",   label: "Confirm New Password", placeholder: "Re-enter new password",    autoComplete: "new-password"     },
                            ].map(({ id, name, label, placeholder, autoComplete }) => (
                                <div key={name} className="grid gap-2">
                                    <Label htmlFor={id}>{label}</Label>
                                    <div className="relative">
                                        <Input
                                            id={id}
                                            name={name}
                                            type={showPasswords[name] ? "text" : "password"}
                                            placeholder={placeholder}
                                            value={changePasswordForm[name]}
                                            onChange={handleChangePasswordInput}
                                            autoComplete={autoComplete}
                                            className="pr-10"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => toggleShowPassword(name)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                                            tabIndex={-1}
                                            aria-label={showPasswords[name] ? "Hide password" : "Show password"}
                                        >
                                            {showPasswords[name]
                                                ? <EyeOff className="h-4 w-4" />
                                                : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>
                            ))}

                            <div className="flex justify-end gap-2 pt-2">
                                <Button variant="outline" onClick={closeChangePassword} type="button">
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleChangePassword}
                                    disabled={isSavingPassword}
                                    type="button"
                                    className="transition-all duration-200 hover:bg-slate-700 hover:scale-[1.02] hover:shadow-md"
                                >
                                    {isSavingPassword ? "Saving..." : "Change Password"}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}