import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { loginAdmin, logoutAdmin } from "../../services/authService";

const savedAuth = localStorage.getItem("saye_auth");
const savedToken = localStorage.getItem("saye_token");
const savedUser = localStorage.getItem("saye_user");

let parsedUser;

try {
    parsedUser = savedUser ? JSON.parse(savedUser) : null;
} catch (error) {
    parsedUser = savedUser || null;
}

const initialState = {
    user: parsedUser,
    token: savedToken || null,
    isAuthenticated: savedAuth === "true" && !!savedToken,
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

export const logoutAsync = createAsyncThunk(
    "auth/logout",
    async (_) => {
        try {
            await logoutAdmin();
        } catch (error) {
            console.warn("Logout API failed");
        }
    }
);

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

                const token =
                    payload.token ||
                    payload.jwt ||
                    payload.data?.token ||
                    "";

                state.token = token;
                state.user = payload;

                localStorage.setItem("saye_auth", "true");
                localStorage.setItem("saye_token", token);
                localStorage.setItem("saye_user", JSON.stringify(payload));
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
export default authSlice.reducer;