/**
 * Client-side file export. Nothing reaches the network: the file is built in
 * memory and handed to the browser through an object URL.
 */

export type ExportFormat = "csv" | "tsv" | "json" | "txt";

export const EXPORT_MIME: Record<ExportFormat, string> = {
  csv: "text/csv;charset=utf-8",
  tsv: "text/tab-separated-values;charset=utf-8",
  json: "application/json;charset=utf-8",
  txt: "text/plain;charset=utf-8",
};

function escapeCsvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function toDelimited(
  rows: readonly (readonly string[])[],
  format: "csv" | "tsv",
): string {
  const delimiter = format === "csv" ? "," : "\t";
  return rows
    .map((cells) =>
      cells
        .map((cell) =>
          format === "csv" ? escapeCsvCell(cell) : cell.replace(/[\t\n]/g, " "),
        )
        .join(delimiter),
    )
    .join("\n");
}

export function downloadText(
  fileName: string,
  contents: string,
  format: ExportFormat,
): void {
  // Excel needs the BOM to read UTF-8 Vietnamese correctly.
  const payload = format === "csv" ? `\ufeff${contents}` : contents;
  const url = URL.createObjectURL(
    new Blob([payload], { type: EXPORT_MIME[format] }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
