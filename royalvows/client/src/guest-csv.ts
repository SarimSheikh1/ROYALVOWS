export type Guest = { name: string; table: string };
export function parseGuestCsv(input: string): Guest[] {
  const rows: string[][] = [];
  let row: string[] = [],
    value = "",
    quoted = false,
    ended = false;
  const text = input.replace(/^\uFEFF/, "");
  const cell = () => {
    row.push(value);
    value = "";
    ended = false;
  };
  const line = () => {
    cell();
    if (row.some((v) => v.trim())) rows.push(row);
    row = [];
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          value += '"';
          i++;
        } else {
          quoted = false;
          ended = true;
        }
      } else value += c;
    } else if (c === '"') {
      if (value || ended) throw new Error("Unexpected quote in CSV");
      quoted = true;
    } else if (c === ",") cell();
    else if (c === "\r" || c === "\n") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      line();
    } else {
      if (ended) throw new Error("Unexpected text after quoted CSV value");
      value += c;
    }
    if (value.length > 500) throw new Error("CSV field is too long");
    if (rows.length > 2001) throw new Error("Maximum 2000 guests");
  }
  if (quoted) throw new Error("Unclosed CSV quote");
  if (value || row.length || ended) line();
  const header = rows.shift();
  if (
    header?.length !== 2 ||
    header[0].trim().toLowerCase() !== "name" ||
    header[1].trim().toLowerCase() !== "table"
  )
    throw new Error("Use the header name,table");
  if (rows.length > 2000) throw new Error("Maximum 2000 guests");
  return rows.map((cells, i) => {
    if (cells.length !== 2)
      throw new Error("Guest row " + (i + 2) + " must have two columns");
    const name = cells[0].trim(),
      table = cells[1].trim();
    if (!name || name.length > 100 || table.length > 50)
      throw new Error("Invalid guest row " + (i + 2));
    return { name, table };
  });
}
export function exportGuestCsv(guests: Guest[]) {
  const safe = (s: string) => {
    if (/^[\s]*[=+@-]/.test(s) || /^[\t\r\n]/.test(s)) s = "'" + s;
    return '"' + s.replaceAll('"', '""') + '"';
  };
  return (
    "name,table\r\n" +
    guests.map((g) => safe(g.name) + "," + safe(g.table)).join("\r\n")
  );
}
