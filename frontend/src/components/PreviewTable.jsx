import { EXPORT_COLUMNS } from '../types';
import './PreviewTable.css';

export default function PreviewTable({ results }) {
  if (!results?.length) return null;

  return (
    <div className="preview-table-wrapper">
      <h2 className="preview-table__heading">Preview (Excel format)</h2>
      <div className="preview-table-scroll">
        <table className="preview-table">
          <thead>
            <tr>
              {EXPORT_COLUMNS.map((col) => (
                <th key={col.key}>{col.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {results.map((row) => (
              <tr key={row.fileName} className={row.error ? 'preview-table__row--error' : ''}>
                {EXPORT_COLUMNS.map((col) => (
                  <td key={col.key}>{row[col.key] ?? ''}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {results.some((r) => r.error) && (
        <p className="preview-table__note">
          Some files could not be parsed fully — empty cells indicate missing values.
        </p>
      )}
    </div>
  );
}
