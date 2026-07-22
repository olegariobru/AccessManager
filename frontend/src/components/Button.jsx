export function Button({ children, className = "", loading = false, ...props }) {
  return (
    <button className={`button button-primary ${className}`} disabled={loading || props.disabled} {...props}>
      {loading ? <span className="spinner" aria-label="Carregando" /> : children}
    </button>
  );
}
