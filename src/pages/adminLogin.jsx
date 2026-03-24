import { useEffect, useState } from "react";
import { Landmark, Eye, EyeOff, ArrowRight } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { clearError, login } from "../features/auth/authSlice";
import { useNavigate } from "react-router-dom";

export default function AdminLogin() {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const { isLoading, error, isAuthenticated, token } = useSelector(
        (state) => state.auth
    );

    const [formData, setFormData] = useState({
        username: "",
        password: "",
    });

    useEffect(() => {
        if (isAuthenticated && token) {
            navigate("/dashboard", { replace: true });
        }
    }, [isAuthenticated, token, navigate]);

    useEffect(() => {
        return () => {
            dispatch(clearError());
        };
    }, [dispatch]);

    const handleChange = (event) => {
        const { name, value } = event.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        dispatch(clearError());
        dispatch(login(formData));
    };

    const [showPassword, setShowPassword] = useState(false);

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
            <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
                <div className="mb-8 text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white">
                        <Landmark className="h-6 w-6" />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                        SAYE Financial Tool
                    </h1>
                    <p className="mt-2 text-sm text-slate-500">Sign in to continue</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label
                            htmlFor="username"
                            className="mb-2 block text-sm font-medium text-slate-700"
                        >
                            Username
                        </label>
                        <input
                            id="username"
                            name="username"
                            type="text"
                            value={formData.username}
                            onChange={handleChange}
                            placeholder="Enter your username"
                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="password"
                            className="mb-2 block text-sm font-medium text-slate-700"
                        >
                            Password
                        </label>
                        <div className="relative">
                            <input
                                id="password"
                                name="password"
                                type={showPassword ? "text" : "password"}
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="Enter your password"
                                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pr-12 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((prev) => !prev)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                            >
                                {showPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                ) : (
                                    <Eye className="h-4 w-4" />
                                )}
                            </button>
                        </div>
                    </div>

                    {error ? (
                        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                            {error}
                        </div>
                    ) : null}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isLoading ? "Signing in..." : "Login"}
                        {!isLoading && <ArrowRight className="h-4 w-4" />}
                    </button>
                </form>
            </div>
        </div>
    );
}