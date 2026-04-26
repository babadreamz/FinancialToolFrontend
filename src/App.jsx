import { Navigate, Route, Routes } from "react-router-dom";
import { useSelector } from "react-redux";
import LoginPage from "./pages/adminLogin";
import DashboardPage from "./pages/dashboardPage";
import AuthWatcher from "./components/authWatcher";

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
        <>
            <AuthWatcher />
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
        </>
    );
}