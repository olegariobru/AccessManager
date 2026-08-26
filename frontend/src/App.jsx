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
import { ClientPortal } from "./pages/ClientPortal";
import { DocumentCapture } from "./pages/DocumentCapture";
import { ClientAdmin } from "./pages/ClientAdmin";

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
        <Route path="/admin/clientes" element={<ClientAdmin />} />
      </Route>
      <Route element={<ProtectedRoute allowedRoles={["USER", "COORDINATOR", "ADMIN"]} />}>
        <Route path="/usuario" element={<UserDashboard />} />
      </Route>
      <Route element={<ProtectedRoute allowedRoles={["CLIENT"]} />}>
        <Route path="/cliente" element={<ClientPortal />} />
      </Route>
      <Route element={<ProtectedRoute allowedRoles={["USER", "COORDINATOR", "ADMIN", "CLIENT"]} />}>
        <Route path="/alterar-senha" element={<ChangePassword />} />
      </Route>
      <Route element={<ProtectedRoute allowedRoles={["USER", "COORDINATOR", "ADMIN"]} requireHr />}>
        <Route path="/rh" element={<HrDashboard />} />
      </Route>
      <Route element={<ProtectedRoute allowedRoles={["COORDINATOR", "ADMIN"]} />}>
        <Route path="/coordenador" element={<CoordinatorDashboard />} />
      </Route>
      <Route element={<ProtectedRoute allowedRoles={["USER", "COORDINATOR", "ADMIN"]} requireDocumentPublisher />}>
        <Route path="/documentos" element={<DocumentCapture />} />
        <Route path="/admin/documentos" element={<Navigate to="/documentos" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
