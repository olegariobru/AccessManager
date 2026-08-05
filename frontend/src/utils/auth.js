const TOKEN_KEY = "accessmanager:token";
const USER_KEY = "accessmanager:user";

function storage() {
  return globalThis.localStorage;
}

export function normalizeRole(role) {
  return String(role || "USER").toUpperCase();
}

export function roleDestination(userOrRole) {
  const user = typeof userOrRole === "object" ? userOrRole : { role: userOrRole };
  if (user.mustChangePassword) return "/alterar-senha";
  const destinations = {
    ADMIN: "/admin",
    COORDINATOR: "/coordenador",
    USER: "/usuario",
  };
  const role = normalizeRole(user.role);
  if (["USER", "COORDINATOR"].includes(role) && user.isHr) return "/rh";
  return destinations[role] || "/usuario";
}

export function saveSession(token, user) {
  if (!token || !user?.id || !user?.role) throw new Error("Sessão inválida");
  storage().setItem(TOKEN_KEY, token);
  storage().setItem(USER_KEY, JSON.stringify(user));
}

export function updateSessionUser(user) {
  const token = storage().getItem(TOKEN_KEY);
  if (!token) return;
  storage().setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  storage().removeItem(TOKEN_KEY);
  storage().removeItem(USER_KEY);
}

export function getAccessToken() {
  return storage().getItem(TOKEN_KEY);
}

export function getSession() {
  const token = storage().getItem(TOKEN_KEY);
  const rawUser = storage().getItem(USER_KEY);
  if (!token || !rawUser) return null;
  try {
    const user = JSON.parse(rawUser);
    if (!user || typeof user !== "object" || !user.id || !user.role) {
      clearSession();
      return null;
    }
    return { token, user };
  } catch {
    clearSession();
    return null;
  }
}

export function apiErrorMessage(error, fallback = "Não foi possível concluir a operação.") {
  return error.response?.data?.error?.message
    || error.response?.data?.message
    || (typeof error.response?.data?.error === "string" ? error.response.data.error : "")
    || fallback;
}
