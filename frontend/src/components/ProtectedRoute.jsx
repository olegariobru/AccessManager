import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { api } from "../services/api";
import {
  getSession,
  normalizeRole,
  roleDestination,
  updateSessionUser,
} from "../utils/auth";

export function ProtectedRoute({ allowedRoles, requireHr = false }) {
  const location = useLocation();
  const [session, setSession] = useState(() => getSession());
  const [checking, setChecking] = useState(Boolean(session));
  const sessionToken = session?.token;

  useEffect(() => {
    if (!sessionToken) {
      setChecking(false);
      return undefined;
    }
    let active = true;
    api.get("/auth/me")
      .then(({ data }) => {
        if (!active) return;
        updateSessionUser(data.user);
        setSession((current) => ({ ...current, user: data.user }));
      })
      .catch(() => {
        if (active) setSession(null);
      })
      .finally(() => {
        if (active) setChecking(false);
      });
    return () => { active = false; };
  }, [sessionToken]);

  if (checking) return <p className="route-loading" role="status">Validando sessão...</p>;
  if (!session) return <Navigate to="/login" replace state={{ from: location }} />;

  const userRole = normalizeRole(session.user.role);
  if (session.user.mustChangePassword && location.pathname !== "/alterar-senha") {
    return <Navigate to="/alterar-senha" replace />;
  }
  const roles = allowedRoles?.map(normalizeRole);
  if (roles?.length && !roles.includes(userRole)) {
    return <Navigate to={roleDestination(session.user)} replace />;
  }
  if (requireHr && !session.user.isHr && userRole !== "ADMIN") {
    return <Navigate to={roleDestination(session.user)} replace />;
  }
  return <Outlet />;
}
