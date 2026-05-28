import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import apiRoutes from './routes/api.js';

const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');
const frontendIndexPath = path.join(frontendDistPath, 'index.html');
const serveFrontend =
  NODE_ENV === 'production' && fs.existsSync(frontendIndexPath);

app.use(
  cors({
    origin: NODE_ENV === 'production' ? FRONTEND_ORIGIN : true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use('/api', apiRoutes);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

if (serveFrontend) {
  app.use(express.static(frontendDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(frontendIndexPath);
  });
} else {
  app.get('/', (_req, res) => {
    res.json({ status: 'ok', message: 'PDF Measurement Extractor API' });
  });
}

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(
    `PDF Measurement Extractor API running on http://localhost:${PORT} (${NODE_ENV})`
  );
});
