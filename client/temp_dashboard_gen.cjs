const fs = require('fs');
const path = 'c:\\Users\\user\\Projects\\studyflow\\client\\src\\pages\\Dashboard.tsx';

// The new Dashboard.tsx content
const content = `// New Dashboard.tsx will be written here`;

// Read existing file to get line count
try {
  const existing = fs.readFileSync(path, 'utf8');
  console.log('Existing file length:', existing.length);
  console.log('Can read existing file');
} catch (e) {
  console.error('Error reading existing file:', e.message);
}

// Write new file
fs.writeFileSync(path, content, 'utf8');
console.log('File written successfully');