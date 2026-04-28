const fs = require('fs');
const files = [
  'app/api/users/[id]/route.ts',
  'app/api/users/route.ts',
  'app/api/notes/route.ts',
  'app/api/inquiries/[id]/route.ts',
  'app/api/inquiries/route.ts',
  'app/api/inquiries/counts/route.ts',
  'app/api/groups/[id]/route.ts',
  'app/api/groups/route.ts'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf-8');
  // Update import. Handle 'import prisma' or 'import { prisma }'
  content = content.replace(/import\s+(?:\{\s*prisma\s*\}|prisma)\s+from\s+['"]@\/lib\/db['"]/, "import { getPrisma } from '@/lib/db'");
  
  // Inject const prisma = getPrisma() in every export async function
  content = content.replace(/(export\s+async\s+function\s+(GET|POST|PATCH|DELETE)\([^)]*\)\s*\{)/g, function(match) {
    return match + '\n  const prisma = getPrisma();';
  });
  
  fs.writeFileSync(file, content);
  console.log('Fixed ' + file);
});
