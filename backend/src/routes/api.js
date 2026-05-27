import { Router } from 'express';
import multer from 'multer';
import { processPdfFiles } from '../services/pdfService.js';
import { buildExcelBuffer } from '../exporters/excelExporter.js';
import pdfParse from 'pdf-parse';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: 50 },
  fileFilter(_req, file, cb) {
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
});

router.post('/process', upload.array('pdfs', 50), async (req, res) => {
  try {
    const files = req.files;
    if (!files?.length) {
      return res.status(400).json({ error: 'No PDF files uploaded' });
    }

    const results = await processPdfFiles(files);
    return res.json({ results });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Processing failed' });
  }
});

router.post('/export', (req, res) => {
  try {
    const { results } = req.body;
    if (!Array.isArray(results) || results.length === 0) {
      return res.status(400).json({ error: 'No results to export' });
    }

    const buffer = buildExcelBuffer(results);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="measurements.xlsx"'
    );
    return res.send(buffer);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Export failed' });
  }
});

/**
 * POST /api/debug-text — returns PDF text snippets around RMS (for troubleshooting).
 * Optional single file upload field: pdf
 */
router.post('/debug-text', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({ error: 'Upload one PDF as field "pdf"' });
    }
    const { text } = await pdfParse(req.file.buffer);
    const lines = text.replace(/\r\n/g, '\n').split('\n');
    const rmsLines = lines
      .map((line, index) => ({ index, line: line.trim() }))
      .filter(({ line }) => /\bRMS\b/i.test(line));

    return res.json({
      fileName: req.file.originalname,
      rmsLines,
      textPreview: text.slice(0, 4000),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Debug failed' });
  }
});

router.use((err, _req, res, next) => {
  if (err instanceof multer.MulterError || err.message?.includes('PDF')) {
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

export default router;
