import * as XLSX from 'xlsx';

/** Excel columns matching the required report format */
export const EXPORT_HEADERS = [
  'File Name',
  'Ro (μm)\n(Harmonic/Waviness)',
  'Harmonic N+2',
  'Harmonic N+3',
  'RMS 1-L1',
  'RMS 1-M1',
  'RMS 1-H1',
];

function resultToRow(row) {
  return [
    row.fileName ?? '',
    row.roundness ?? '',
    row.harmonicN2 ?? '',
    row.harmonicN3 ?? '',
    row.rms1L1 ?? '',
    row.rms1M1 ?? '',
    row.rms1H1 ?? '',
  ];
}

export function buildExcelBuffer(results) {
  const sheetData = [EXPORT_HEADERS, ...results.map(resultToRow)];
  const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

  worksheet['!cols'] = EXPORT_HEADERS.map((header, colIndex) => ({
    wch: Math.min(
      Math.max(
        header.replace('\n', ' ').length,
        ...sheetData.map((r) => String(r[colIndex] ?? '').length)
      ) + 2,
      28
    ),
  }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Measurements');

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}
