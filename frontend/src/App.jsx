import { useState } from 'react';
import FileDropZone from './components/FileDropZone';
import PreviewTable from './components/PreviewTable';
import { processPdfs, downloadExcel } from './api/client';
import './App.css';

export default function App() {
  const [files, setFiles] = useState([]);
  const [results, setResults] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  const handleProcess = async () => {
    if (!files.length) {
      setError('Please add at least one PDF file.');
      return;
    }
    setError('');
    setProcessing(true);
    try {
      const data = await processPdfs(files);
      setResults(data.results);
    } catch (err) {
      setError(err.message);
      setResults([]);
    } finally {
      setProcessing(false);
    }
  };

  const handleDownload = async () => {
    if (!results.length) {
      setError('Process files first to generate the Excel export.');
      return;
    }
    setError('');
    setExporting(true);
    try {
      await downloadExcel(results);
    } catch (err) {
      setError(err.message);
    } finally {
      setExporting(false);
    }
  };

  const busy = processing || exporting;

  return (
    <div className="app">
      <header className="app__header">
        <h1>PDF Measurement Extractor</h1>
        <p>
          Upload measurement PDF reports. Export Ro, Harmonic N+2/N+3, and RMS 1-L1/M1/H1
          to Excel.
        </p>
      </header>

      <main className="app__main">
        <FileDropZone
          files={files}
          onFilesChange={setFiles}
          disabled={busy}
        />

        {error && <p className="app__error" role="alert">{error}</p>}

        <div className="app__actions">
          <button
            type="button"
            className="btn btn--primary"
            disabled={busy || !files.length}
            onClick={handleProcess}
          >
            {processing ? 'Processing…' : 'Process Files'}
          </button>
          <button
            type="button"
            className="btn btn--secondary"
            disabled={busy || !results.length}
            onClick={handleDownload}
          >
            {exporting ? 'Downloading…' : 'Download Excel'}
          </button>
        </div>

        <PreviewTable results={results} />
      </main>
    </div>
  );
}
