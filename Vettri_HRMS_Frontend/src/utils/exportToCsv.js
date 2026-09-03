/**
 * Converts an array of flat objects to a CSV file and triggers a download.
 * Opens cleanly in Excel/Sheets - this is the "Excel Export" feature for
 * report tables. Deliberately client-side: every report payload is already
 * JSON in the browser, so round-tripping to the server to generate a file
 * would just be slower for the same result.
 */
export function exportToCsv(filename, rows) {
  if (!rows || rows.length === 0) return;

  const headers = Object.keys(rows[0]);
  const escape = (value) => {
    const str = String(value ?? '');
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };

  const csvLines = [headers.join(','), ...rows.map((row) => headers.map((h) => escape(row[h])).join(','))];

  const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
