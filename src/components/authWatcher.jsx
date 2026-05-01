import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { logout, parseJwt } from "../features/auth/authSlice";
import { useNavigate } from "react-router-dom";

const AuthWatcher = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const token = useSelector((state) => state.auth.token);

    useEffect(() => {
        if (!token) return;

        const decoded = parseJwt(token);

        if (!decoded?.exp) {
            dispatch(logout());
            navigate("/");
            return;
        }

        const expiryTime = decoded.exp * 1000;
        const timeLeft = expiryTime - Date.now();

        if (timeLeft <= 0) {
            dispatch(logout());
            navigate("/login");
            return;
        }

        const timer = setTimeout(() => {
            dispatch(logout());
            navigate("/");
        }, timeLeft);

        return () => clearTimeout(timer);
    }, [token, dispatch, navigate]);

    return null;
};

export default AuthWatcher;