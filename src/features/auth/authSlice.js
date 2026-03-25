import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { loginAdmin, logoutAdmin } from "../../services/authService";

const savedAuth = localStorage.getItem("saye_auth");
const savedToken = localStorage.getItem("saye_token");
const savedUser = localStorage.getItem("saye_user");

let parsedUser;

try {
    parsedUser = savedUser ? JSON.parse(savedUser) : null;
    // eslint-disable-next-line no-unused-vars
} catch (error) {
    parsedUser = null;
}

const parseJwt = (token) => {
    try {
        const base64Url = token.split(".")[1];
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split("")
                .map(
                    (char) =>
                        `%${(`00${char.charCodeAt(0).toString(16)}`).slice(-2)}`
                )
                .join("")
        );
        return JSON.parse(jsonPayload);
        // eslint-disable-next-line no-unused-vars
    } catch (error) {
        return null;
    }
};

const isTokenExpired = (token) => {
    if (!token) return true;

    const decoded = parseJwt(token);

    if (!decoded?.exp) return true;

    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp <= currentTime;
};

const tokenIsValid = savedToken && !isTokenExpired(savedToken);

const initialState = {
    user: tokenIsValid ? parsedUser : null,
    token: tokenIsValid ? savedToken : null,
    isAuthenticated: savedAuth === "true" && !!tokenIsValid,
    isLoading: false,
    error: null,
};

export const login = createAsyncThunk(
    "auth/login",
    async (loginData, thunkAPI) => {
        try {
            return await loginAdmin(loginData);
        } catch (error) {
            const message =
                error.response?.data?.message ||
                error.response?.data?.error ||
                error.message ||
                "Login failed";
            return thunkAPI.rejectWithValue(message);
        }
    }
);

export const logoutAsync = createAsyncThunk("auth/logout", async () => {
    try {
        await logoutAdmin();
        // eslint-disable-next-line no-unused-vars
    } catch (error) {
        console.warn("Logout API failed");
    }
});

const clearSession = (state) => {
    state.user = null;
    state.token = null;
    state.isAuthenticated = false;
    state.isLoading = false;
    state.error = null;

    localStorage.removeItem("saye_auth");
    localStorage.removeItem("saye_token");
    localStorage.removeItem("saye_user");
};

const authSlice = createSlice({
    name: "auth",
    initialState,
    reducers: {
        logout: clearSession,
        clearError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(login.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(login.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isAuthenticated = true;

                const payload = action.payload;

                state.token = payload.token;
                state.user = {
                    id: payload.id,
                    username: payload.username,
                    roles: payload.roles || [],
                };

                localStorage.setItem("saye_auth", "true");
                localStorage.setItem("saye_token", payload.token);
                localStorage.setItem(
                    "saye_user",
                    JSON.stringify({
                        id: payload.id,
                        username: payload.username,
                        roles: payload.roles || [],
                    })
                );
            })
            .addCase(login.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload || "Login failed";
            })
            .addCase(logoutAsync.fulfilled, (state) => {
                clearSession(state);
            });
    },
});

export const { logout, clearError } = authSlice.actions;
export { parseJwt, isTokenExpired };
export default authSlice.reducer;