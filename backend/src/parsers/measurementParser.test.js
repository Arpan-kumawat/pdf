import { parseMeasurements } from './measurementParser.js';

function assertEqual(name, expected, actual) {
  if (actual !== expected) {
    console.error(`FAIL ${name}: expected "${expected}", got "${actual}"`);
    return false;
  }
  console.log(`OK ${name}`);
  return true;
}

let failed = 0;

const REPORT_EMB = `
Roundness<> : 0.820μm
Velocity Analysis[ Roundness<> ]
0.1100.0890.2480.0450.0090.0170.0230.0090.007
[2 - 16]25.129μm/s70μm/s [Pass]RMS1 [1100rpm]
[17 - 98]15.084μm/s50μm/s [Pass]RMS2 [1100rpm]
[99 - 512]7.284μm/s40μm/s [Pass]RMS3 [183rpm]
`;

const p = parseMeasurements(REPORT_EMB);
const checks = [
  ['roundness', '0.820', p.roundness],
  ['harmonicN2', '0.089', p.harmonicN2],
  ['harmonicN3', '0.248', p.harmonicN3],
  ['rms1L1', '25.129', p.rms1L1],
  ['rms1M1', '15.084', p.rms1M1],
  ['rms1H1', '7.284', p.rms1H1],
];

for (const [name, expected, actual] of checks) {
  if (!assertEqual(name, expected, actual)) failed++;
}

process.exit(failed > 0 ? 1 : 0);
