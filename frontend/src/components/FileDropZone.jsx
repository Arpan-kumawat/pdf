import { useCallback, useRef, useState } from 'react';
import './FileDropZone.css';

/**
 * Drag-and-drop zone for multiple PDF uploads.
 */
export default function FileDropZone({ files, onFilesChange, disabled }) {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const addFiles = useCallback(
    (incoming) => {
      const pdfs = Array.from(incoming).filter(
        (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
      );
      if (!pdfs.length) return;
      const names = new Set(files.map((f) => f.name));
      const merged = [...files];
      pdfs.forEach((f) => {
        if (!names.has(f.name)) merged.push(f);
      });
      onFilesChange(merged);
    },
    [files, onFilesChange]
  );

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      setIsDragging(false);
      if (disabled) return;
      addFiles(e.dataTransfer.files);
    },
    [addFiles, disabled]
  );

  const removeFile = (name) => {
    onFilesChange(files.filter((f) => f.name !== name));
  };

  return (
    <div className="drop-zone-wrapper">
      <div
        className={`drop-zone ${isDragging ? 'drop-zone--active' : ''} ${disabled ? 'drop-zone--disabled' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          multiple
          hidden
          disabled={disabled}
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = '';
          }}
        />
        <p className="drop-zone__title">Drop PDF files here</p>
        <p className="drop-zone__hint">or click to browse — multiple files supported</p>
      </div>

      {files.length > 0 && (
        <ul className="file-list">
          {files.map((file) => (
            <li key={file.name} className="file-list__item">
              <span>{file.name}</span>
              <button
                type="button"
                className="file-list__remove"
                disabled={disabled}
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(file.name);
                }}
                aria-label={`Remove ${file.name}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
