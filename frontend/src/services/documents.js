import { api } from "./api";

export const MAX_PDF_BYTES = 10 * 1024 * 1024;

export function validatePdfFile(file) {
  if (!file) return "Selecione um arquivo PDF.";
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return "O arquivo deve estar no formato PDF.";
  }
  if (file.size > MAX_PDF_BYTES) return "O arquivo PDF deve ter no máximo 10 MB.";
  return "";
}

export async function downloadProtectedFile(endpoint, fileName) {
  const response = await api.get(endpoint, { responseType: "blob" });
  const url = URL.createObjectURL(response.data);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName || "documento.pdf";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
