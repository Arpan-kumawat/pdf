/**
 * @typedef {Object} MeasurementRow
 * @property {string} fileName
 * @property {string} roundness
 * @property {string} harmonicN2
 * @property {string} harmonicN3
 * @property {string} rms1L1
 * @property {string} rms1M1
 * @property {string} rms1H1
 * @property {string} [error]
 */

export const EXPORT_COLUMNS = [
  { key: 'fileName', label: 'File Name' },
  { key: 'roundness', label: 'Ro (μm) (Harmonic/Waviness)' },
  { key: 'harmonicN2', label: 'Harmonic N+2' },
  { key: 'harmonicN3', label: 'Harmonic N+3' },
  { key: 'rms1L1', label: 'RMS 1-L1' },
  { key: 'rms1M1', label: 'RMS 1-M1' },
  { key: 'rms1H1', label: 'RMS 1-H1' },
];
