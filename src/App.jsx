import { Navigate, Route, Routes } from "react-router-dom";
import { useSelector } from "react-redux";
import LoginPage from "./pages/AdminLogin";
import DashboardPage from "./pages/DashboardPage";

function ProtectedRoute({ children }) {
    const { isAuthenticated, token } = useSelector((state) => state.auth);

    if (!isAuthenticated || !token) {
        return <Navigate to="/" replace />;
    }

    return children;
}

function PublicRoute({ children }) {
    const { isAuthenticated, token } = useSelector((state) => state.auth);

    if (isAuthenticated && token) {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
}

export default function App() {
    return (
        <Routes>
            <Route
                path="/"
                element={
                    <PublicRoute>
                        <LoginPage />
                    </PublicRoute>
                }
            />

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