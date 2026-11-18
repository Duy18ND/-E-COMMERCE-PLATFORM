/**
 * Pure NLP & query parsing helpers for ShopMart AI Chatbot fallback & client utilities.
 * Zero framework or network dependencies so they execute cleanly in browser and Node unit tests.
 */

export const CHAT_STOP_WORDS = new Set([
  'tôi', 'mình', 'muốn', 'cần', 'tìm', 'mua', 'gợi', 'ý', 'tư', 'vấn',
  'cho', 'hỏi', 'xem', 'kiểm', 'tra', 'tồn', 'kho', 'còn', 'hàng',
  'so', 'sánh', 'dưới', 'trên', 'từ', 'tầm', 'khoảng', 'giá', 'mức',
  'ngân', 'sách', 'sản', 'phẩm', 'triệu', 'tr', 'nghìn', 'ngàn', 'k',
  'shop', 'ad', 'ơi', 'nhé', 'ạ', 'nào', 'gì', 'không', 'có', 'của',
  'bên', 'đang', 'bán', 'giúp', 'với', 'rẻ', 'nhất', 'đắt', 'tốt'
]);

const PRICE_PHRASE_REGEX =
  /(?:dưới|trên|từ|tầm|khoảng|tối đa|tối thiểu|ngân sách|giá)?\s*\d+(?:[.,]\d+)?\s*(?:triệu|tr|nghìn|ngàn|k|đ|vnd)(?=$|[\s?!.,;:#()[\]])/gi;

const parsePositiveFloat = (rawToken) => {
  const num = Number.parseFloat(String(rawToken || '').replace(',', '.'));
  return Number.isFinite(num) && num > 0 ? num : null;
};

const parsePriceMatchToVnd = (numStr, unitStr) => {
  const val = parsePositiveFloat(numStr);
  if (val === null) return null;
  const u = String(unitStr || '').toLowerCase();
  if (u === 'triệu' || u === 'tr') return Math.round(val * 1_000_000);
  if (u === 'nghìn' || u === 'ngàn' || u === 'k') return Math.round(val * 1_000);
  return Math.round(val);
};

export const extractMaxPriceFromText = (lowerText) => {
  const text = String(lowerText || '');
  const boundMatch = text.match(
    /(?:dưới|tối đa|không quá|<=?|<|tầm|khoảng)\s*(\d+(?:[.,]\d+)?)\s*(triệu|tr|nghìn|ngàn|k|đ|vnd)?(?=$|[\s?!.,;:#()[\]])/i
  );
  if (boundMatch) {
    const parsed = parsePriceMatchToVnd(boundMatch[1], boundMatch[2] || (boundMatch[1].length <= 3 ? 'tr' : ''));
    if (parsed !== null && parsed >= 1_000) return parsed;
  }

  const standaloneUnitMatch = text.match(
    /(?<!trên\s)(?<!từ\s)(?:^|\s)(\d+(?:[.,]\d+)?)\s*(triệu|tr|nghìn|ngàn|k)(?=$|[\s?!.,;:#()[\]])/i
  );
  if (standaloneUnitMatch) {
    return parsePriceMatchToVnd(standaloneUnitMatch[1], standaloneUnitMatch[2]) ?? undefined;
  }
  return undefined;
};

export const extractMinPriceFromText = (lowerText) => {
  const text = String(lowerText || '');
  const minMatch = text.match(
    /(?:trên|từ|tối thiểu|>=?|>)\s*(\d+(?:[.,]\d+)?)\s*(triệu|tr|nghìn|ngàn|k|đ|vnd)?(?=$|[\s?!.,;:#()[\]])/i
  );
  if (minMatch) {
    const parsed = parsePriceMatchToVnd(minMatch[1], minMatch[2] || (minMatch[1].length <= 3 ? 'tr' : ''));
    if (parsed !== null && parsed >= 1_000) return parsed;
  }
  return undefined;
};

export const extractCleanSearchKeyword = (cleanMsg) =>
  String(cleanMsg || '')
    .replaceAll(PRICE_PHRASE_REGEX, ' ')
    .replaceAll(/[?!.,;:#()[\]]/g, ' ')
    .split(/\s+/)
    .filter((token) => {
      if (!token) return false;
      const lowerToken = token.toLowerCase();
      if (CHAT_STOP_WORDS.has(lowerToken)) return false;
      return true;
    })
    .join(' ')
    .trim();

export const extractOrderIdFromQuestion = (cleanMsg) => {
  const str = String(cleanMsg || '');
  const idMatch = str.match(/#(\d+)/) || str.match(/đơn(?:\s+hàng)?\s+(?:số|mã)?\s*(\d+)/i);
  return idMatch ? Number(idMatch[1]) : null;
};

export const extractComparisonTerms = (cleanMsg) => {
  const afterCompare = String(cleanMsg || '').replace(/^.*?so\s*sánh\s*/i, '').trim();
  const parts = afterCompare
    .split(/\s+(?:và|với|vs\.?|hay)\s+/i)
    .map((s) => extractCleanSearchKeyword(s) || s.trim())
    .filter((s) => s.length >= 2)
    .slice(0, 3);
  if (parts.length > 0) return parts;
  const fallbackKw = extractCleanSearchKeyword(cleanMsg);
  return fallbackKw ? [fallbackKw] : [];
};
