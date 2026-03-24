import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/AdminLogin";
import DashboardPage from "./pages/DashboardPage";

function ProtectedRoute({ children }) {
    const isAuthenticated = localStorage.getItem("saye_auth") === "true";

    if (!isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    return children;
}

export default function App() {
    return (
        <Routes>
            <Route path="/" element={<LoginPage />} />
            <Route
                path="/dashboard"
                element={
                    <ProtectedRoute>
                        <DashboardPage />
                    </ProtectedRoute>
                }
            />
        </Routes>
    );
}