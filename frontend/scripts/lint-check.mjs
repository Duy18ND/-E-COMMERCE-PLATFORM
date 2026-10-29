import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, '../src');

const collectFiles = (dir, acc = []) => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectFiles(fullPath, acc);
    } else if (/\.(js|jsx|mjs)$/.test(entry.name)) {
      acc.push(fullPath);
    }
  }
  return acc;
};

const files = collectFiles(srcDir);
let errorCount = 0;

for (const file of files) {
  const rel = path.relative(path.resolve(__dirname, '..'), file);
  const content = fs.readFileSync(file, 'utf8');

  // 1. Check for merge conflict markers
  if (/^(<<<<<<<|=======|>>>>>>>)/m.test(content)) {
    console.error(`[LINT ERROR] ${rel}: Phát hiện dấu vết merge conflict.`);
    errorCount++;
  }

  // 2. Check for invalid Java-style imports or broken relative paths
  const importRegex = /from\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const specifier = match[1];
    if (specifier.startsWith('.')) {
      const baseResolved = path.resolve(path.dirname(file), specifier);
      const candidates = [
        baseResolved,
        `${baseResolved}.js`,
        `${baseResolved}.jsx`,
        `${baseResolved}.mjs`,
        `${baseResolved}.json`,
        path.join(baseResolved, 'index.js'),
        path.join(baseResolved, 'index.jsx')
      ];
      if (!candidates.some((c) => fs.existsSync(c))) {
        console.error(`[LINT ERROR] ${rel}: Import không tồn tại '${specifier}'`);
        errorCount++;
      }
    }
  }
}

if (errorCount > 0) {
  console.error(`\n[LINT FAILED] Phát hiện ${errorCount} lỗi trong ${files.length} file.`);
  process.exit(1);
} else {
  console.log(`[LINT PASS] Đã kiểm tra ${files.length} file nguồn trong src/ — 0 lỗi cú pháp/import.`);
}
