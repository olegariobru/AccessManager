import { useEffect, useState } from "react";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { Link } from "react-router-dom";

export function Landing() {
  const [showIntro, setShowIntro] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;

    setShowIntro(true);
    const timeout = window.setTimeout(() => setShowIntro(false), 1450);
    return () => window.clearTimeout(timeout);
  }, []);

  return (
    <>
      {showIntro && (
        <div className="landing-intro" role="status" aria-label="Carregando SERVNET">
          <div className="landing-intro-mark" aria-hidden="true"><span>S</span><i>N</i></div>
          <strong>SERVNET</strong>
          <span className="landing-intro-caption">Um espaço da ASJCOESP</span>
          <div className="landing-intro-track" aria-hidden="true"><span /></div>
        </div>
      )}
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">ASJCOESP · Portal de serviços</p>
            <h1>Mais próximo.<br />Mais simples.<br /><em>Todos os dias.</em></h1>
            <p className="hero-lead">O SERVNET conecta pessoas e serviços da associação. Suas solicitações, documentos e rotinas em um só lugar.</p>
            <Link className="button button-primary" to="/login">Entrar no SERVNET <ArrowRight size={18} /></Link>
            <p className="hero-note"><LockKeyhole size={14} /> Acesso exclusivo com sua conta pessoal</p>
          </div>
          <aside className="institution-panel" aria-label="SERVNET, um espaço da ASJCOESP">
            <div className="institution-monogram" aria-hidden="true">S<span>N</span></div>
            <div className="institution-panel-caption"><span>Conexão a serviço das pessoas</span><strong>SERVNET</strong><p>Um espaço da ASJCOESP.<br />Feito para o seu dia a dia.</p></div>
            <span className="institution-panel-index" aria-hidden="true">ASSOCIAÇÃO / SERVIÇOS / PESSOAS</span>
          </aside>
        </div>
      </section>

    </>
  );
}
