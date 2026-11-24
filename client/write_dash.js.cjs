import fs from 'fs';
import path from 'path';

const targetPath = 'c:\\Users\\user\\Projects\\studyflow\\client\\src\\pages\\Dashboard.tsx';

// We'll read the new content from a base64 string
// to avoid any quote/escaping issues in PowerShell

const base64 = 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAABmJLR0QA/wD/AP+gvaeTAAAGW0lEQVR4nGNgYAAAAAMAAcMgK2mAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP8W8QK8XcNAAAAAElFTkSuQmCC';

try {
  const decoded = Buffer.from(base64, 'base64').toString('utf8');
  fs.writeFileSync(targetPath, decoded);
  console.log('File written successfully, length:', decoded.length);
} catch (e) {
  console.error('Error:', e.message);
}