import { Navigate, Outlet, useLocation } from "react-router-dom";
import { getSession, normalizeRole, roleDestination } from "../utils/auth";

export function ProtectedRoute({ allowedRoles }) {
  const location = useLocation();
  const session = getSession();

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const userRole = normalizeRole(session.user.role);
  const roles = allowedRoles?.map(normalizeRole);

  if (roles?.length && !roles.includes(userRole)) {
    return <Navigate to={roleDestination(userRole)} replace />;
  }

  return <Outlet />;
}
