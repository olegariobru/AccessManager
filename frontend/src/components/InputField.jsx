import { useId } from "react";

export function InputField({ label, error, id, ...props }) {
  const generatedId = useId();
  const fieldId = id || generatedId;
  return (
    <label className="field" htmlFor={fieldId}>
      <span id={`${fieldId}-label`}>{label}</span>
      <input id={fieldId} aria-labelledby={`${fieldId}-label`} aria-invalid={Boolean(error)} aria-describedby={error ? `${fieldId}-error` : undefined} {...props} />
      {error && <small className="field-error" id={`${fieldId}-error`}>{error}</small>}
    </label>
  );
}
