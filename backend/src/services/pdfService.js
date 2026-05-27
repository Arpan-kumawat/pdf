import pdfParse from 'pdf-parse';
import { parseMeasurements } from '../parsers/measurementParser.js';

const EMPTY_FIELDS = {
  roundness: '',
  harmonicN2: '',
  harmonicN3: '',
  rms1L1: '',
  rms1M1: '',
  rms1H1: '',
};

export async function processPdfBuffer(buffer, fileName) {
  try {
    const { text } = await pdfParse(buffer);
    const fields = parseMeasurements(text);

    return {
      fileName,
      ...fields,
    };
  } catch (err) {
    return {
      fileName,
      ...EMPTY_FIELDS,
      error: err.message || 'Failed to parse PDF',
    };
  }
}

export async function processPdfFiles(files) {
  const tasks = files.map((file) =>
    processPdfBuffer(file.buffer, file.originalname)
  );
  return Promise.all(tasks);
}
