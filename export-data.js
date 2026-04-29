const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

async function main() {
  const prisma = new PrismaClient();
  const users = await prisma.user.findMany();
  
  let sql = '';
  for (const user of users) {
    const name = user.name.replace(/'/g, "''");
    const email = user.email.replace(/'/g, "''");
    const password = user.password.replace(/'/g, "''");
    const role = user.role;
    
    const isActive = user.isActive ? 1 : 0;
    const createdAt = user.createdAt.toISOString();
    const updatedAt = user.updatedAt.toISOString();
    
    sql += `INSERT INTO User (id, name, email, password, role, isActive, createdAt, updatedAt) VALUES ('${user.id}', '${name}', '${email}', '${password}', '${role}', ${isActive}, '${createdAt}', '${updatedAt}');\n`;
  }
  
  fs.writeFileSync('seed.sql', sql);
  console.log('Generated seed.sql with updatedAt');
  await prisma.$disconnect();
}

main().catch(console.error);
