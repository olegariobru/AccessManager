import { ShieldCheck } from "lucide-react";

export function Landing() {
  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <p className="eyebrow"><ShieldCheck size={16} /> SERVNET</p>
            <h1>Associação dos Serventuários <br /><span></span></h1>
            <p className="hero-note">ASJCOESP</p>
           </div>
          <div className="hero-visual" aria-label="Painel ilustrativo do AccessManager">
            <div className="visual-glow" />
            <div className="dashboard-card">
              <div className="dashboard-top"><span /><span /><span /></div>
              <div className="dashboard-body">
                <div className="dashboard-sidebar"><b /><i /><i /><i /></div>
                <div className="dashboard-content">
                  <div className="dashboard-heading"><b /><span /></div>
                  <div className="stat-grid"><i /><i /><i /></div>
                  <div className="table-mock"><span /><span /><span /><span /></div>
                </div>
              </div>
            </div>
             <div className="security-badge"><ShieldCheck size={24} /><span><b>Ambiente protegido</b><small>Todos os sistemas operando</small></span></div>
          </div>
        </div>
      </section>
    </>
  );
}
