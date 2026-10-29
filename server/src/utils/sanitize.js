export function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function escapeCsvCell(value) {
  let text = value === null || value === undefined ? '' : String(value);
  // Mitigate CSV formula injection in spreadsheet applications.
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}
