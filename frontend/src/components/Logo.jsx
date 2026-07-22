import { ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

export function Logo() {
  return (
    <Link className="logo" to="/" aria-label="AccessManager — início">
      <span className="logo-mark"><ShieldCheck size={21} /></span>
      <span>Access<span>Manager</span></span>
    </Link>
  );
}
