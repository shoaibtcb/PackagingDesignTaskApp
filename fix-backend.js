const fs = require('fs');
const glob = require('glob');
const path = require('path');

const files = [
  'app/api/users/[id]/route.ts',
  'app/api/users/route.ts',
  'app/api/notes/route.ts',
  'app/api/inquiries/[id]/route.ts',
  'app/api/inquiries/route.ts',
  'app/api/groups/[id]/route.ts',
  'app/api/groups/route.ts'
];

files.forEach(file => {
  const p = path.join(__dirname, file);
  if (!fs.existsSync(p)) return;
  
  let content = fs.readFileSync(p, 'utf-8');
  
  // Fix body TS error
  content = content.replace(/const body = await req\.json\(\)/g, "const body: any = await req.json()");
  content = content.replace(/const \{ name, color \} = await req\.json\(\)/g, "const { name, color }: any = await req.json()");
  content = content.replace(/const \{ inquiryId, content \} = await req\.json\(\)/g, "const { inquiryId, content: reqContent }: any = await req.json()");
  // Also need to fix 'content' -> 'reqContent' in notes/route.ts
  if (file === 'app/api/notes/route.ts') {
    content = content.replace(/data: \{ inquiryId, content \},/g, "data: { inquiryId, content: reqContent },");
  }

  // Fix bcryptjs -> bcrypt-ts
  if (content.includes("import bcrypt from 'bcryptjs'")) {
    content = content.replace(/import bcrypt from 'bcryptjs'/g, "import { hash } from 'bcrypt-ts'");
    content = content.replace(/await bcrypt\.hash\(/g, "await hash(");
  }
  
  fs.writeFileSync(p, content);
  console.log('Fixed ' + file);
});
