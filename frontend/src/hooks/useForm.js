import { useState } from "react";

export function useForm(initialValues, validate) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});

  function handleChange(event) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: "" }));
  }

  function isValid() {
    const nextErrors = validate(values);
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  return { values, errors, handleChange, isValid, setValues };
}
