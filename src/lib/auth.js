export function getStoredUser() {
    const rawUser = localStorage.getItem("saye_user");

    if (!rawUser) return null;

    try {
        return JSON.parse(rawUser);
    } catch {
        return null;
    }
}

export function getLoggedInAdminId() {
    const user = getStoredUser();
    return user?.id || "";
}

export function getLoggedInAdminUsername() {
    const user = getStoredUser();
    return user?.username || "";
}