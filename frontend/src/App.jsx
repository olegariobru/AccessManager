import { Navigate, Route, Routes } from "react-router-dom";
import { PublicLayout } from "./layouts/PublicLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AdminDashboard } from "./pages/AdminDashboard";
import { ForgotPassword } from "./pages/ForgotPassword";
import { Landing } from "./pages/Landing";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { UserDashboard } from "./pages/UserDashboard";
import { CoordinatorDashboard } from "./pages/CoordinatorDashboard";
import { HrDashboard } from "./pages/HrDashboard";
import { ChangePassword } from "./pages/ChangePassword";

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<Register />} />
        <Route path="/esqueci-minha-senha" element={<ForgotPassword />} />
      </Route>
      <Route element={<ProtectedRoute allowedRoles={["ADMIN"]} />}>
        <Route path="/admin" element={<AdminDashboard />} />
      </Route>
      <Route element={<ProtectedRoute allowedRoles={["USER", "COORDINATOR", "ADMIN"]} />}>
        <Route path="/usuario" element={<UserDashboard />} />
        <Route path="/alterar-senha" element={<ChangePassword />} />
      </Route>
      <Route element={<ProtectedRoute allowedRoles={["USER", "COORDINATOR", "ADMIN"]} requireHr />}>
        <Route path="/rh" element={<HrDashboard />} />
      </Route>
      <Route element={<ProtectedRoute allowedRoles={["COORDINATOR", "ADMIN"]} />}>
        <Route path="/coordenador" element={<CoordinatorDashboard />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
