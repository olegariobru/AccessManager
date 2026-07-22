export function InputField({ label, error, id, ...props }) {
  return (
    <label className="field" htmlFor={id}>
      <span>{label}</span>
      <input id={id} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} {...props} />
      {error && <small className="field-error" id={`${id}-error`}>{error}</small>}
    </label>
  );
}
