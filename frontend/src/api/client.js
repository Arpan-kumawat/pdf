const API_BASE = '/api';

/**
 * Upload PDF files for measurement extraction.
 * @param {File[]} files
 * @returns {Promise<{ results: import('../types').MeasurementRow[] }>}
 */
export async function processPdfs(files) {
  const formData = new FormData();
  files.forEach((file) => formData.append('pdfs', file));

  const response = await fetch(`${API_BASE}/process`, {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to process PDFs');
  }
  return data;
}

/**
 * Download Excel file from parsed results.
 * @param {import('../types').MeasurementRow[]} results
 */
export async function downloadExcel(results) {
  const response = await fetch(`${API_BASE}/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ results }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to export Excel');
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'measurements.xlsx';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
