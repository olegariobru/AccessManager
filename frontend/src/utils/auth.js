let currentUser = null;
let csrfToken = null;

// Remove credentials left by older versions; never persist the new session.
try {
  globalThis.localStorage?.removeItem("accessmanager:token");
  globalThis.localStorage?.removeItem("accessmanager:user");
} catch { /* Storage may be unavailable. */ }

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
    CLIENT: "/cliente",
  };
  const role = normalizeRole(user.role);
  if (["USER", "COORDINATOR"].includes(role) && user.isHr) return "/rh";
  return destinations[role] || "/usuario";
}

export function saveSession(user) {
  if (!user?.id || !user?.role) throw new Error("Sessão inválida");
  currentUser = user;
}
export function updateSessionUser(user) { saveSession(user); }
export function clearSession() {
  currentUser = null; csrfToken = null;
  globalThis.dispatchEvent?.(new Event("accessmanager:session-ended"));
}
export function getSession() { return currentUser ? { user: currentUser } : null; }
export function setCsrfToken(value) { csrfToken = value; }
export function getCsrfToken() { return csrfToken; }

export function apiErrorMessage(error, fallback = "Não foi possível concluir a operação.") {
  return error.response?.data?.error?.message
    || error.response?.data?.message
    || (typeof error.response?.data?.error === "string" ? error.response.data.error : "")
    || fallback;
}
