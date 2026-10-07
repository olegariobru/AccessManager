import { Outlet } from "react-router-dom";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";

export function PublicLayout() {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#public-content">Ir para o conteúdo</a>
      <Header />
      <main id="public-content" className="main-content" tabIndex={-1}><Outlet /></main>
      <Footer />
    </div>
  );
}
