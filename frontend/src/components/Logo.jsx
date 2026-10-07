import { Link } from "react-router-dom";

export function Logo() {
  return (
    <Link className="logo" to="/" aria-label="SERVNET / ASJCOESP — início">
      <svg className="logo-mark" viewBox="0 0 40 40" fill="none" aria-hidden="true">
        <path d="M8 10h24v7H15v6h17v7H8v-7h17v-6H8z" fill="currentColor" />
        <path d="M32 3v5M32 32v5" stroke="currentColor" strokeWidth="3" />
      </svg>
      <span className="logo-wordmark">SERVNET<small>ASJCOESP</small></span>
    </Link>
  );
}
