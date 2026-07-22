import { Outlet } from "react-router-dom";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";

export function PublicLayout() {
  return (
    <div className="app-shell">
      <Header />
      <main className="main-content"><Outlet /></main>
      <Footer />
    </div>
  );
}
