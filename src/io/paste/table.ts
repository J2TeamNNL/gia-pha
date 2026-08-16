/**
 * Splits text copied out of a spreadsheet into a grid.
 * A copy from Excel or Google Sheets is tab-separated; a saved CSV is comma-
 * separated. The delimiter is decided per paste, not per line, so a comma
 * inside a single-column paste is kept as content.
 */

export function detectDelimiter(text: string): "\t" | "," {
  return text.includes("\t") ? "\t" : ",";
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < line.length; index++) {
    const character = line[index];
    if (quoted) {
      if (character !== '"') cell += character;
      else if (line[index + 1] === '"') {
        cell += '"';
        index++;
      } else quoted = false;
    } else if (character === '"') quoted = true;
    else if (character === ",") {
      cells.push(cell);
      cell = "";
    } else cell += character;
  }
  cells.push(cell);
  return cells;
}

export function parseTable(text: string): string[][] {
  const delimiter = detectDelimiter(text);
  return text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) =>
      (delimiter === "\t" ? line.split("\t") : splitCsvLine(line)).map((cell) =>
        cell.trim(),
      ),
    )
    .filter((cells) => cells.some((cell) => cell.length > 0));
}
