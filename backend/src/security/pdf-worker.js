const { parentPort, workerData } = require("node:worker_threads");
const { PDFDocument, PDFName, PDFDict } = require("pdf-lib");
(async () => {
  try {
    const pdf = await PDFDocument.load(workerData, {
      ignoreEncryption: false,
      throwOnInvalidObject: true,
    });
    if (pdf.getPageCount() < 1) throw new Error("empty");
    const forbidden = new Set([
      "JS",
      "JavaScript",
      "Launch",
      "EmbeddedFiles",
      "EmbeddedFile",
      "FileAttachment",
      "EF",
      "Rendition",
      "GoToR",
      "Sound",
      "Movie",
      "RichMedia",
      "XFA",
      "SubmitForm",
      "ImportData",
    ]);
    for (const [, object] of pdf.context.enumerateIndirectObjects()) {
      const inspect = (value, depth = 0) => {
        if (depth > 40) throw new Error("nested");
        if (value instanceof PDFDict) {
          for (const [key, item] of value.entries()) {
            if (
              forbidden.has(key.decodeText()) ||
              (item instanceof PDFName && forbidden.has(item.decodeText()))
            )
              throw new Error("active");
            inspect(item, depth + 1);
          }
        } else if (typeof value?.asArray === "function") {
          for (const item of value.asArray()) inspect(item, depth + 1);
        } else if (value?.dict) inspect(value.dict, depth + 1);
      };
      inspect(object);
    }
    parentPort.postMessage(true);
  } catch {
    parentPort.postMessage(false);
  }
})();
