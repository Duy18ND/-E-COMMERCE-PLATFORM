/**
 * Local Offline-Proof EMVCo VietQR Payload Builder & ISO/IEC 18004 QR SVG Generator.
 * Zero external dependencies — guarantees QR payment rendering even when third-party QR CDNs fail.
 */

const BANK_BIN_MAP = {
  MB: '970422',
  VCB: '970436',
  TCB: '970407',
  ACB: '970416',
  BIDV: '970418',
  VTB: '970415',
  TPB: '970423',
  VPB: '970432'
};

// QR Versions 1..9 Error Correction Level M & L specifications (ISO/IEC 18004)
// Format: { v, align, m: [ecPerBlock, g1Blocks, g1Data, g2Blocks, g2Data], l: [...] }
const QR_SPECS = [
  { v: 1, align: [], m: [10, 1, 16, 0, 0], l: [7, 1, 19, 0, 0] },
  { v: 2, align: [6, 18], m: [16, 1, 28, 0, 0], l: [10, 1, 34, 0, 0] },
  { v: 3, align: [6, 22], m: [26, 1, 44, 0, 0], l: [15, 1, 55, 0, 0] },
  { v: 4, align: [6, 26], m: [18, 2, 32, 0, 0], l: [20, 1, 80, 0, 0] },
  { v: 5, align: [6, 30], m: [24, 2, 43, 0, 0], l: [26, 1, 108, 0, 0] },
  { v: 6, align: [6, 34], m: [16, 4, 27, 0, 0], l: [18, 2, 68, 0, 0] },
  { v: 7, align: [6, 22, 38], m: [18, 4, 31, 0, 0], l: [20, 2, 78, 0, 0] },
  { v: 8, align: [6, 24, 42], m: [22, 2, 38, 2, 39], l: [24, 2, 97, 0, 0] },
  { v: 9, align: [6, 26, 46], m: [22, 3, 36, 2, 37], l: [30, 2, 116, 0, 0] }
];

// GF(256) exponential & log tables using primitive polynomial 0x11D
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i += 1) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i += 1) {
    GF_EXP[i] = GF_EXP[i - 255];
  }
})();

const gfMul = (a, b) => (a === 0 || b === 0 ? 0 : GF_EXP[GF_LOG[a] + GF_LOG[b]]);

const buildRsGeneratorPoly = (degree) => {
  let poly = [1];
  for (let i = 0; i < degree; i += 1) {
    const next = new Array(poly.length + 1).fill(0);
    const factor = GF_EXP[i];
    for (let j = 0; j < poly.length; j += 1) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMul(poly[j], factor);
    }
    poly = next;
  }
  return poly;
};

const computeRsRemainder = (data, ecCount) => {
  const gen = buildRsGeneratorPoly(ecCount);
  const work = new Uint8Array(data.length + ecCount);
  work.set(data, 0);
  for (let i = 0; i < data.length; i += 1) {
    const coef = work[i];
    if (coef !== 0) {
      for (let j = 0; j < gen.length; j += 1) {
        work[i + j] ^= gfMul(gen[j], coef);
      }
    }
  }
  return Array.from(work.slice(data.length));
};

const formatTlv = (tag, value) => {
  const valStr = String(value ?? '');
  const len = String(valStr.length).padStart(2, '0');
  return `${tag}${len}${valStr}`;
};

/**
 * CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF) required by EMVCo Tag 63.
 */
export const computeCrc16Ccitt = (text) => {
  let crc = 0xffff;
  for (let i = 0; i < text.length; i += 1) {
    crc ^= (text.charCodeAt(i) & 0xff) << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
};

const sanitizeAsciiInfo = (text) =>
  String(text || '')
    .normalize('NFD')
    .replaceAll(/[\u0300-\u036f]/g, '')
    .replaceAll(/[đĐ]/g, 'd')
    .replaceAll(/[^a-zA-Z0-9 ._-]/g, ' ')
    .replaceAll(/\s+/g, ' ')
    .trim()
    .slice(0, 50);

/**
 * Build standard EMVCo / NAPAS 247 VietQR payload string.
 */
export const buildVietQrPayload = ({
  bankId = 'MB',
  accountNo = '0838169181',
  amount = 0,
  addInfo = ''
} = {}) => {
  const normalizedBank = String(bankId || 'MB').trim().toUpperCase();
  const bankBin = BANK_BIN_MAP[normalizedBank] || (/^\d{6}$/.test(normalizedBank) ? normalizedBank : BANK_BIN_MAP.MB);
  const cleanAccount = String(accountNo || '0838169181').trim();
  const numericAmount = Math.max(0, Math.round(Number(amount) || 0));
  const cleanInfo = sanitizeAsciiInfo(addInfo);

  const beneficiary = formatTlv('00', bankBin) + formatTlv('01', cleanAccount);
  const merchantAccountInfo =
    formatTlv('00', 'A000000727') +
    formatTlv('01', beneficiary) +
    formatTlv('02', 'QRIBFTTA');

  let payload = '';
  payload += formatTlv('00', '01');
  payload += formatTlv('01', numericAmount > 0 ? '12' : '11');
  payload += formatTlv('38', merchantAccountInfo);
  payload += formatTlv('53', '704');
  if (numericAmount > 0) {
    payload += formatTlv('54', String(numericAmount));
  }
  payload += formatTlv('58', 'VN');
  if (cleanInfo) {
    payload += formatTlv('62', formatTlv('08', cleanInfo));
  }
  payload += '6304';
  return payload + computeCrc16Ccitt(payload);
};

const selectQrSpec = (byteLength) => {
  const neededCodewords = byteLength + 2; // 4-bit Byte mode + 8-bit count + terminator
  for (const spec of QR_SPECS) {
    const [, g1B, g1D, g2B, g2D] = spec.m;
    if (g1B * g1D + g2B * g2D >= neededCodewords) {
      return { spec, level: 'm' };
    }
  }
  for (const spec of QR_SPECS) {
    const [, g1B, g1D, g2B, g2D] = spec.l;
    if (g1B * g1D + g2B * g2D >= neededCodewords) {
      return { spec, level: 'l' };
    }
  }
  return null;
};

const encodeByteDataCodewords = (bytes, totalDataCodewords) => {
  const bits = [];
  const pushBits = (val, count) => {
    for (let i = count - 1; i >= 0; i -= 1) {
      bits.push((val >> i) & 1);
    }
  };

  pushBits(0b0100, 4); // Byte mode indicator
  pushBits(bytes.length, 8); // Character count for Versions 1..9
  for (const b of bytes) {
    pushBits(b, 8);
  }

  const maxBits = totalDataCodewords * 8;
  const terminatorLen = Math.min(4, maxBits - bits.length);
  pushBits(0, terminatorLen);

  while (bits.length % 8 !== 0) {
    bits.push(0);
  }

  const codewords = [];
  for (let i = 0; i < bits.length; i += 8) {
    let val = 0;
    for (let k = 0; k < 8; k += 1) {
      val = (val << 1) | bits[i + k];
    }
    codewords.push(val);
  }

  const padBytes = [0xec, 0x11];
  let padIdx = 0;
  while (codewords.length < totalDataCodewords) {
    codewords.push(padBytes[padIdx % 2]);
    padIdx += 1;
  }
  return codewords;
};

const interleaveCodewords = (dataCodewords, ecSpec) => {
  const [ecPerBlock, g1Blocks, g1Data, g2Blocks, g2Data] = ecSpec;
  const dataBlocks = [];
  const ecBlocks = [];
  let offset = 0;

  for (let i = 0; i < g1Blocks; i += 1) {
    const slice = dataCodewords.slice(offset, offset + g1Data);
    dataBlocks.push(slice);
    ecBlocks.push(computeRsRemainder(slice, ecPerBlock));
    offset += g1Data;
  }
  for (let i = 0; i < g2Blocks; i += 1) {
    const slice = dataCodewords.slice(offset, offset + g2Data);
    dataBlocks.push(slice);
    ecBlocks.push(computeRsRemainder(slice, ecPerBlock));
    offset += g2Data;
  }

  const result = [];
  const maxDataLen = Math.max(g1Data, g2Data);
  for (let col = 0; col < maxDataLen; col += 1) {
    for (const block of dataBlocks) {
      if (col < block.length) result.push(block[col]);
    }
  }
  for (let col = 0; col < ecPerBlock; col += 1) {
    for (const ecBlock of ecBlocks) {
      if (col < ecBlock.length) result.push(ecBlock[col]);
    }
  }
  return result;
};

const createEmptyMatrix = (size) => ({
  size,
  modules: Array.from({ length: size }, () => new Uint8Array(size)),
  reserved: Array.from({ length: size }, () => new Uint8Array(size))
});

const setFunctionModule = (grid, r, c, dark) => {
  if (r < 0 || r >= grid.size || c < 0 || c >= grid.size) return;
  grid.modules[r][c] = dark ? 1 : 0;
  grid.reserved[r][c] = 1;
};

const placeFinderPattern = (grid, topRow, leftCol) => {
  for (let dr = -1; dr <= 7; dr += 1) {
    for (let dc = -1; dc <= 7; dc += 1) {
      const r = topRow + dr;
      const c = leftCol + dc;
      if (r < 0 || r >= grid.size || c < 0 || c >= grid.size) continue;
      const inBorder = dr === 0 || dr === 6 || dc === 0 || dc === 6;
      const inCore = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
      const inSeparator = dr === -1 || dr === 7 || dc === -1 || dc === 7;
      setFunctionModule(grid, r, c, !inSeparator && (inBorder || inCore));
    }
  }
};

const placeAlignmentPattern = (grid, centerR, centerC) => {
  for (let dr = -2; dr <= 2; dr += 1) {
    for (let dc = -2; dc <= 2; dc += 1) {
      const dist = Math.max(Math.abs(dr), Math.abs(dc));
      setFunctionModule(grid, centerR + dr, centerC + dc, dist === 2 || dist === 0);
    }
  }
};

const placeFunctionPatterns = (grid, spec) => {
  const { size } = grid;
  placeFinderPattern(grid, 0, 0);
  placeFinderPattern(grid, 0, size - 7);
  placeFinderPattern(grid, size - 7, 0);

  // Timing patterns
  for (let i = 8; i < size - 8; i += 1) {
    const dark = i % 2 === 0;
    if (!grid.reserved[6][i]) setFunctionModule(grid, 6, i, dark);
    if (!grid.reserved[i][6]) setFunctionModule(grid, i, 6, dark);
  }

  // Alignment patterns (skipping overlaps with finders)
  for (const r of spec.align) {
    for (const c of spec.align) {
      if ((r === 6 && c === 6) || (r === 6 && c === size - 7) || (r === size - 7 && c === 6)) {
        continue;
      }
      placeAlignmentPattern(grid, r, c);
    }
  }

  // Dark module & reserve format info areas
  setFunctionModule(grid, 4 * spec.v + 9, 8, true);
  for (let i = 0; i < 9; i += 1) {
    if (i !== 6) {
      grid.reserved[8][i] = 1;
      grid.reserved[i][8] = 1;
    }
  }
  for (let i = 0; i < 8; i += 1) {
    grid.reserved[8][size - 1 - i] = 1;
    if (i < 7) grid.reserved[size - 1 - i][8] = 1;
  }

  // Reserve & write Version Info for Versions 7..9
  if (spec.v >= 7) {
    let rem = spec.v;
    for (let i = 0; i < 12; i += 1) {
      rem = (rem << 1) ^ ((rem >> 11) * 0x1f25);
    }
    const verBits = (spec.v << 12) | rem;
    for (let i = 0; i < 18; i += 1) {
      const bit = ((verBits >> i) & 1) === 1;
      const a = size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      setFunctionModule(grid, b, a, bit);
      setFunctionModule(grid, a, b, bit);
    }
  }
};

const drawFormatBits = (grid, level, maskPattern) => {
  // Format indicator: M = 0 (00), L = 1 (01)
  const ecBits = level === 'm' ? 0 : 1;
  const data = (ecBits << 3) | maskPattern;
  let rem = data;
  for (let i = 0; i < 10; i += 1) {
    rem = (rem << 1) ^ ((rem >> 9) * 0x537);
  }
  const bits = ((data << 10) | rem) ^ 0x5412;
  const { size } = grid;

  for (let i = 0; i < 6; i += 1) {
    setFunctionModule(grid, i, 8, ((bits >> i) & 1) === 1);
  }
  setFunctionModule(grid, 7, 8, ((bits >> 6) & 1) === 1);
  setFunctionModule(grid, 8, 8, ((bits >> 7) & 1) === 1);
  setFunctionModule(grid, 8, 7, ((bits >> 8) & 1) === 1);
  for (let i = 9; i < 15; i += 1) {
    setFunctionModule(grid, 8, 14 - i, ((bits >> i) & 1) === 1);
  }

  for (let i = 0; i < 8; i += 1) {
    setFunctionModule(grid, 8, size - 1 - i, ((bits >> i) & 1) === 1);
  }
  for (let i = 8; i < 15; i += 1) {
    setFunctionModule(grid, size - 15 + i, 8, ((bits >> i) & 1) === 1);
  }
};

const MASK_FNS = [
  (r, c) => (r + c) % 2 === 0,
  (r) => r % 2 === 0,
  (_r, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0
];

const placeCodewords = (grid, allCodewords) => {
  const { size } = grid;
  let bitIdx = 0;
  const totalBits = allCodewords.length * 8;
  let upward = true;

  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let step = 0; step < size; step += 1) {
      const r = upward ? size - 1 - step : step;
      for (let dc = 0; dc < 2; dc += 1) {
        const c = right - dc;
        if (!grid.reserved[r][c]) {
          let bit = 0;
          if (bitIdx < totalBits) {
            bit = (allCodewords[bitIdx >> 3] >> (7 - (bitIdx & 7))) & 1;
            bitIdx += 1;
          }
          grid.modules[r][c] = bit;
        }
      }
    }
    upward = !upward;
  }
};

const cloneAndApplyMask = (baseGrid, level, maskId) => {
  const size = baseGrid.size;
  const grid = {
    size,
    modules: baseGrid.modules.map((row) => new Uint8Array(row)),
    reserved: baseGrid.reserved
  };
  const maskFn = MASK_FNS[maskId];
  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) {
      if (!grid.reserved[r][c] && maskFn(r, c)) {
        grid.modules[r][c] ^= 1;
      }
    }
  }
  drawFormatBits(grid, level, maskId);
  return grid;
};

const computePenalty = (grid) => {
  const { size, modules } = grid;
  let penalty = 0;

  // Rule 1: 5+ consecutive same-color modules in rows/cols
  for (let r = 0; r < size; r += 1) {
    let runRow = 1;
    let runCol = 1;
    for (let c = 1; c < size; c += 1) {
      if (modules[r][c] === modules[r][c - 1]) {
        runRow += 1;
        if (runRow === 5) penalty += 3;
        else if (runRow > 5) penalty += 1;
      } else {
        runRow = 1;
      }
      if (modules[c][r] === modules[c - 1][r]) {
        runCol += 1;
        if (runCol === 5) penalty += 3;
        else if (runCol > 5) penalty += 1;
      } else {
        runCol = 1;
      }
    }
  }

  // Rule 2: 2x2 same-color blocks
  for (let r = 0; r < size - 1; r += 1) {
    for (let c = 0; c < size - 1; c += 1) {
      const val = modules[r][c];
      if (val === modules[r][c + 1] && val === modules[r + 1][c] && val === modules[r + 1][c + 1]) {
        penalty += 3;
      }
    }
  }

  // Rule 3: 1:1:3:1:1 finder-like patterns with 4 light modules
  const checkPattern = (arr) => {
    let count = 0;
    for (let i = 0; i <= arr.length - 11; i += 1) {
      if (
        (arr[i] === 1 &&
          arr[i + 1] === 0 &&
          arr[i + 2] === 1 &&
          arr[i + 3] === 1 &&
          arr[i + 4] === 1 &&
          arr[i + 5] === 0 &&
          arr[i + 6] === 1 &&
          arr[i + 7] === 0 &&
          arr[i + 8] === 0 &&
          arr[i + 9] === 0 &&
          arr[i + 10] === 0) ||
        (arr[i] === 0 &&
          arr[i + 1] === 0 &&
          arr[i + 2] === 0 &&
          arr[i + 3] === 0 &&
          arr[i + 4] === 1 &&
          arr[i + 5] === 0 &&
          arr[i + 6] === 1 &&
          arr[i + 7] === 1 &&
          arr[i + 8] === 1 &&
          arr[i + 9] === 0 &&
          arr[i + 10] === 1)
      ) {
        count += 40;
      }
    }
    return count;
  };
  for (let r = 0; r < size; r += 1) {
    penalty += checkPattern(modules[r]);
    const col = new Uint8Array(size);
    for (let c = 0; c < size; c += 1) col[c] = modules[c][r];
    penalty += checkPattern(col);
  }

  // Rule 4: Dark/light ratio balance
  let darkCount = 0;
  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) {
      if (modules[r][c]) darkCount += 1;
    }
  }
  const percent = (darkCount * 100) / (size * size);
  const k = Math.floor(Math.abs(percent - 50) / 5);
  penalty += k * 10;

  return penalty;
};

/**
 * Encode any UTF-8 text into a QR matrix (`modules[r][c] = 0 | 1`).
 */
export const createQrMatrix = (text) => {
  const bytes = Array.from(new TextEncoder().encode(String(text || '')));
  const selected = selectQrSpec(bytes.length);
  if (!selected) {
    throw new Error('QR payload exceeds maximum supported capacity.');
  }
  const { spec, level } = selected;
  const ecSpec = spec[level];
  const [, g1B, g1D, g2B, g2D] = ecSpec;
  const totalData = g1B * g1D + g2B * g2D;

  const dataCodewords = encodeByteDataCodewords(bytes, totalData);
  const allCodewords = interleaveCodewords(dataCodewords, ecSpec);

  const size = 4 * spec.v + 17;
  const baseGrid = createEmptyMatrix(size);
  placeFunctionPatterns(baseGrid, spec);
  placeCodewords(baseGrid, allCodewords);

  let bestGrid = null;
  let bestPenalty = Infinity;
  for (let mask = 0; mask < 8; mask += 1) {
    const candidate = cloneAndApplyMask(baseGrid, level, mask);
    const penalty = computePenalty(candidate);
    if (penalty < bestPenalty) {
      bestPenalty = penalty;
      bestGrid = candidate;
    }
  }
  return bestGrid;
};

/**
 * Render QR matrix to a crisp SVG string with quiet zone.
 */
export const generateQrSvg = (text, { quietZone = 3, darkColor = '#0f172a', lightColor = '#ffffff' } = {}) => {
  const grid = createQrMatrix(text);
  const fullSize = grid.size + quietZone * 2;
  const paths = [];
  for (let r = 0; r < grid.size; r += 1) {
    let runStart = -1;
    for (let c = 0; c <= grid.size; c += 1) {
      const dark = c < grid.size && grid.modules[r][c] === 1;
      if (dark && runStart === -1) {
        runStart = c;
      } else if (!dark && runStart !== -1) {
        paths.push(`M${runStart + quietZone},${r + quietZone}h${c - runStart}v1h-${c - runStart}z`);
        runStart = -1;
      }
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${fullSize} ${fullSize}" shape-rendering="crispEdges"><rect width="${fullSize}" height="${fullSize}" fill="${lightColor}"/><path d="${paths.join('')}" fill="${darkColor}"/></svg>`;
};

/**
 * Render QR matrix directly to an inline SVG Data URI (`data:image/svg+xml;charset=utf-8,...`).
 */
export const generateQrSvgDataUri = (text, options = {}) => {
  const svg = generateQrSvg(text, options);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};
