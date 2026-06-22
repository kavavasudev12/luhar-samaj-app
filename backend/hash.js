// hash.js
const bcrypt = require('bcryptjs');

async function createHash() {
  // 1. Put the password you want to use here
  const newPassword = 'Vasudev@1204'; 

  // 2. This creates the hash (12 is a good salt round)
  const hashedPassword = await bcrypt.hash(newPassword, 12);

  console.log('--- Your New Hash (Copy this): ---');
  console.log(hashedPassword);
  console.log('------------------------------------');
}

createHash();