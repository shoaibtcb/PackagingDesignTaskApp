const fs = require('fs');
const path = require('path');

const files = [
  'app/layout.tsx',
  'app/api/auth/[...nextauth]/route.ts',
  'app/api/download/bat/route.ts',
  'app/api/download/reg/route.ts',
  'app/api/groups/[id]/route.ts',
  'app/api/groups/route.ts',
  'app/api/inquiries/[id]/route.ts',
  'app/api/inquiries/counts/route.ts',
  'app/api/inquiries/route.ts',
  'app/api/notes/route.ts',
  'app/api/users/[id]/route.ts',
  'app/api/users/route.ts'
];

files.forEach(file => {
  const fullPath = path.join(__dirname, file);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf-8');
    if (!content.includes("export const runtime = 'edge'")) {
      content = "export const runtime = 'edge';\n" + content;
      fs.writeFileSync(fullPath, content);
      console.log('Added edge runtime to ' + file);
    }
  } else {
    console.log('File not found: ' + file);
  }
});
