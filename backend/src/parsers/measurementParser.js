/**
 * Extracts machine measurement fields from PDF text content.
 * Tuned for machine reports like EMB IR TRK (RMS1/2/3 velocity lines, harmonic tables).
 */

const UM = '(?:µm|um|μm|µ m|mm)';
const UMS = '(?:µm/s|um/s|μm/s|µ m/s)';
const NUM = '(-?[\\d.]+(?:[eE][+-]?\\d+)?)';

/**
 * @typedef {{ headers: string[], values: string[], rows?: { label: string, values: string[] }[] }} HarmonicTable
 */

export function parseMeasurements(text) {
  if (!text || typeof text !== 'string') {
    return emptyResult();
  }

  const raw = text.replace(/\r\n/g, '\n');
  const normalized = raw.replace(/\s+/g, ' ');

  const rms = extractAllRms(raw, normalized);
  const harmonics = extractHarmonicTable(raw, normalized);
  const row1Values =
    harmonics.rows[0]?.values ?? harmonics.values ?? [];
  const harmonicMap = mapHarmonicsWithEmptyN0(row1Values);

  return {
    roundness: extractRoundness(normalized),
    harmonicN2: harmonicMap['N+2'] ?? '',
    harmonicN3: harmonicMap['N+3'] ?? '',
    // RMS1/2/3 velocity bands → L1 (low), M1 (mid), H1 (high)
    rms1L1: rms.rms1,
    rms1M1: rms.rms2,
    rms1H1: rms.rms3,
  };
}

function emptyResult() {
  return {
    roundness: '',
    harmonicN2: '',
    harmonicN3: '',
    rms1L1: '',
    rms1M1: '',
    rms1H1: '',
  };
}

/**
 * PDF Row 1 has no N+0 value — first amplitude maps to N+1, second to N+2, etc.
 */
function mapHarmonicsWithEmptyN0(values) {
  const map = { 'N+0': '' };
  values.forEach((v, i) => {
    map[`N+${i + 1}`] = v ?? '';
  });
  return map;
}

function extractRoundness(text) {
  const patterns = [
    new RegExp(`Roundness\\s*(?:<>|\\([^)]+\\))?\\s*:\\s*([\\d.]+)\\s*${UM}`, 'i'),
    new RegExp(`Roundness\\s*(?:\\([^)]+\\)|<>|[^:]*?)?:\\s*([\\d.]+)\\s*${UM}`, 'i'),
    new RegExp(`Roundness[^\\d]*([\\d.]+)\\s*${UM}`, 'i'),
  ];

  for (const re of patterns) {
    const m = text.match(re);
    if (m?.[1]) return m[1];
  }
  return '';
}

/**
 * RMS 1/2/3 — velocity evaluation lines first (e.g. "25.129μm/s ... RMS1 [1100rpm]").
 */
function extractAllRms(rawText, normalized) {
  const result = { rms1: '', rms2: '', rms3: '' };

  const fromVelocity = extractRmsFromVelocityLines(rawText);
  Object.assign(result, fromVelocity);

  const fromTable = extractRmsTableBlock(rawText);
  for (const n of [1, 2, 3]) {
    const key = `rms${n}`;
    if (!result[key] && fromTable[key]) result[key] = fromTable[key];
    if (!result[key]) result[key] = extractRmsFromLabelLine(rawText, n);
    if (!result[key]) result[key] = extractRmsInline(normalized, n);
  }

  return result;
}

/**
 * Report format: [2 - 16]25.129μm/s70μm/s [Pass]RMS1 [1100rpm]
 * → use first μm/s value (25.129), not rpm (1100).
 */
function extractRmsFromVelocityLines(rawText) {
  const result = { rms1: '', rms2: '', rms3: '' };
  const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    // EMB report: one RMS per line with freq. band, e.g. [2-16]25.129μm/s...RMS1 [1100rpm]
    if (!isVelocityEvaluationLine(line)) continue;

    for (const n of [1, 2, 3]) {
      const key = `rms${n}`;
      if (result[key]) continue;
      if (!hasRmsLabel(line, n)) continue;

      const value = extractFirstUmsValue(line);
      if (value) result[key] = value;
    }
  }

  return result;
}

/** First velocity value in µm/s on the line */
function extractFirstUmsValue(line) {
  const m = line.match(new RegExp(`([\\d.]+)\\s*${UMS}`, 'i'));
  if (m?.[1]) return m[1];

  const m2 = line.match(new RegExp(`([\\d.]+)\\s*${UM}\\s*/\\s*s`, 'i'));
  return m2?.[1] ?? '';
}

function extractRmsTableBlock(rawText) {
  const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);
  const result = { rms1: '', rms2: '', rms3: '' };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!hasRmsLabel(line, 1) || !hasRmsLabel(line, 2) || !hasRmsLabel(line, 3)) {
      continue;
    }

    const sameLine = extractNumbersAfterRmsLabels(line);
    if (sameLine.length >= 3) {
      result.rms1 = sameLine[0];
      result.rms2 = sameLine[1];
      result.rms3 = sameLine[2];
      return result;
    }

    for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
      const next = lines[j];
      if (hasAnyRmsLabel(next) || /^N\+/i.test(next)) continue;

      const nums = next.match(/-?[\d.]+(?:[eE][+-]?\d+)?/g) || [];
      if (nums.length >= 3) {
        result.rms1 = nums[0];
        result.rms2 = nums[1];
        result.rms3 = nums[2];
        return result;
      }
    }
  }

  return result;
}

function extractRmsFromLabelLine(rawText, number) {
  const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);
  const labelRe = new RegExp(`\\bRMS\\s*${number}\\b(?!\\d)`, 'i');

  for (const line of lines) {
    if (!labelRe.test(line)) continue;

    const ums = extractFirstUmsValue(line);
    if (ums) return ums;

    const afterLabel = line.replace(
      new RegExp(`^.*?\\bRMS\\s*${number}\\b(?!\\d)\\s*[:=]?\\s*`, 'i'),
      ''
    );
    const direct = afterLabel.match(new RegExp(`^${NUM}`));
    if (direct?.[1] && !isRpmContext(direct[1], line)) return direct[1];
  }

  return '';
}

function isRpmContext(value, line) {
  const idx = line.indexOf(value);
  const after = line.slice(idx + value.length, idx + value.length + 10);
  return /\s*rpm/i.test(after) || /\[\s*\d+\s*rpm\s*\]/i.test(line);
}

function extractRmsInline(text, number) {
  const patterns = [
    new RegExp(
      `\\bRMS\\s*${number}\\b(?!\\d)[^\\d]{0,30}?${NUM}\\s*${UMS}`,
      'i'
    ),
    new RegExp(
      `${NUM}\\s*${UMS}[^\\d]{0,80}?\\bRMS\\s*${number}\\b(?!\\d)`,
      'i'
    ),
    new RegExp(
      `\\bRMS\\s*${number}\\b(?!\\d)\\s*[:=]?\\s*${NUM}\\s*${UM}\\s*/\\s*s`,
      'i'
    ),
  ];

  for (const re of patterns) {
    const m = text.match(re);
    if (m?.[1] && m[1] !== String(number)) return m[1];
  }
  return '';
}

function isVelocityEvaluationLine(line) {
  return (
    /\[[\d.\s-]+\]/.test(line) &&
    new RegExp(UMS, 'i').test(line) &&
    countRmsLabels(line) === 1
  );
}

function countRmsLabels(line) {
  return (line.match(/\bRMS\s*[123]\b(?!\\d)/gi) || []).length;
}

function hasRmsLabel(text, number) {
  return new RegExp(`\\bRMS\\s*${number}\\b(?!\\d)`, 'i').test(text);
}

function hasAnyRmsLabel(text) {
  return /\bRMS\s*[123]\b(?!\\d)/i.test(text);
}

function extractNumbersAfterRmsLabels(line) {
  const stripped = line.replace(/\bRMS\s*\d+\b/gi, ' ');
  return stripped.match(/-?[\d.]+(?:[eE][+-]?\d+)?/g) || [];
}

function extractHarmonicTable(rawText, normalized) {
  const fromConcatenated = extractHarmonicFromConcatenated(rawText);
  if (fromConcatenated.headers.length) return fromConcatenated;

  const fromLines = extractHarmonicFromLines(rawText);
  if (fromLines.headers.length) return fromLines;

  return extractHarmonicFromNormalized(normalized);
}

/**
 * PDFs where amplitudes are glued: "0.1100.0890.2480.045..."
 * Often appears under Velocity Analysis before Harmonic[Amplitude] header.
 */
function extractHarmonicFromConcatenated(rawText) {
  const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);

  let headers = [];
  for (const line of lines) {
    const matches = line.match(/N\+\d+/gi);
    if (matches && matches.length >= 5) {
      headers = uniqueOrdered(matches);
      break;
    }
  }
  if (!headers.length) {
    headers = Array.from({ length: 10 }, (_, i) => `N+${i}`);
  }

  // Prefer amplitude block under Velocity Analysis (before header in PDF layout)
  let sliceStart = 0;
  let sliceEnd = lines.length;
  for (let i = 0; i < lines.length; i++) {
    if (/Velocity\s+Analysis/i.test(lines[i])) sliceStart = i;
    if (sliceStart && /Harmonic\s*\[?\s*Amplitude/i.test(lines[i]) && i > sliceStart) {
      sliceEnd = i;
      break;
    }
  }

  const section = lines.slice(sliceStart, sliceEnd);
  const dataLines = section.filter(isConcatenatedAmplitudeLine).map(splitConcatenatedAmplitudes);

  if (!dataLines.length) {
    return { headers: [], values: [], rows: [] };
  }

  const rowLabels = section
    .filter((l) => /^N=\d+$/i.test(l))
    .map((l) => l.replace(/\s/g, ''));

  // Only Row 1 (first amplitude row, typically N=0)
  const firstValues = padValues(headers, dataLines[0]);
  const firstRow = {
    label: rowLabels[0] ?? 'Row 1',
    values: firstValues,
  };

  return {
    headers,
    values: firstValues,
    rows: [firstRow],
  };
}

function isConcatenatedAmplitudeLine(line) {
  if (!/^0\.\d/.test(line)) return false;
  if (/UPR|Harmonic|Roundness|RMS|Velocity|Parameter|μm\(/i.test(line)) return false;
  const withoutNumbers = line.replace(/0\.\d+/g, '');
  return !/[a-zA-Z]/.test(withoutNumbers);
}

/** Report uses fixed 3 decimal places: 0.110, 0.089, 0.248, … */
function splitConcatenatedAmplitudes(line) {
  const three = line.match(/0\.\d{3}/g);
  if (three && three.length >= 3) return three;
  return line.match(/0\.\d+/g) || [];
}

function uniqueOrdered(items) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const key = item.toUpperCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(item);
    }
  }
  return out.sort((a, b) => {
    const na = parseInt(a.replace(/\D/g, ''), 10);
    const nb = parseInt(b.replace(/\D/g, ''), 10);
    return na - nb;
  });
}

function extractHarmonicFromLines(rawText) {
  const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);

  for (let i = 0; i < lines.length; i++) {
    const headerLine = lines[i];
    if (!/N\+0/i.test(headerLine) || !/N\+1/i.test(headerLine)) continue;

    const headers = headerLine.match(/N\+\d+/gi) || [];
    if (!headers.length) continue;

    for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
      const valueLine = lines[j];
      if (/N\+\d/i.test(valueLine)) continue;
      if (/Harmonic|Amplitude|Roundness/i.test(valueLine) && !/[\d.]+\s+[\d.]+/.test(valueLine)) {
        continue;
      }
      if (hasAnyRmsLabel(valueLine)) continue;

      const values = valueLine.match(/-?[\d.]+(?:[eE][+-]?\d+)?/g) || [];
      if (values.length >= headers.length) {
        const v = values.slice(0, headers.length);
        return { headers, values: v, rows: [{ label: 'N+0', values: v }] };
      }
      if (values.length >= 2) {
        const v = padValues(headers, values);
        return { headers, values: v, rows: [{ label: 'N+0', values: v }] };
      }
    }
  }

  return { headers: [], values: [], rows: [] };
}

function extractHarmonicFromNormalized(text) {
  const rowMatch = text.match(
    /(?:Harmonic\s+)?Amplitude[^N]*?(N\+0(?:\s+N\+\d+)+)\s+((?:-?[\d.]+\s*)+)/i
  );

  if (rowMatch?.[1] && rowMatch?.[2]) {
    const headers = rowMatch[1].match(/N\+\d+/gi) || [];
    const values = rowMatch[2].trim().split(/\s+/).filter((v) => /^-?[\d.]+$/.test(v));
    if (headers.length && values.length) {
      const v = padValues(headers, values);
      return { headers, values: v, rows: [{ label: 'N+0', values: v }] };
    }
  }

  return { headers: [], values: [], rows: [] };
}

function padValues(headers, values) {
  const out = [];
  for (let i = 0; i < headers.length; i++) {
    out.push(values[i] ?? '');
  }
  return out;
}

export function collectHarmonicHeaders(results) {
  const seen = new Set();
  const headers = [];
  for (const row of results) {
    for (const h of row.harmonics?.headers ?? []) {
      if (!seen.has(h)) {
        seen.add(h);
        headers.push(h);
      }
    }
  }
  return headers.sort((a, b) => {
    const na = parseInt(a.replace(/\D/g, ''), 10);
    const nb = parseInt(b.replace(/\D/g, ''), 10);
    return na - nb;
  });
}

export function harmonicRowToMap(harmonics) {
  const map = {};
  const headers = harmonics?.headers ?? [];
  const values = harmonics?.values ?? [];
  headers.forEach((h, i) => {
    map[h] = values[i] ?? '';
  });
  return map;
}
