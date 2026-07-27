import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { api } from "../services/api";
import { getSession, normalizeRole, roleDestination, updateSessionUser } from "../utils/auth";

export function ProtectedRoute({ allowedRoles }) {
  const location = useLocation();
  const [session, setSession] = useState(() => getSession());
  const [checking, setChecking] = useState(Boolean(session));
  const sessionToken = session?.token;

  useEffect(() => {
    if (!sessionToken) return;

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

    return () => {
      active = false;
    };
  }, [sessionToken]);

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (checking) {
    return <p className="route-loading" role="status">Validando sessão...</p>;
  }

  const userRole = normalizeRole(session.user.role);
  const roles = allowedRoles?.map(normalizeRole);

  if (roles?.length && !roles.includes(userRole)) {
    return <Navigate to={roleDestination(userRole)} replace />;
  }

  return <Outlet />;
}
