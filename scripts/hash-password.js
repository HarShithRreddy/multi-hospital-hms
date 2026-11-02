// Generate a bcrypt hash for a new App_User password.
// Usage:  node scripts/hash-password.js "MyPassword@123"
const bcrypt = require('bcryptjs');

const pw = process.argv[2];
if (!pw) {
  console.error('Usage: node scripts/hash-password.js "<password>"');
  process.exit(1);
}
const hash = bcrypt.hashSync(pw, 10);
console.log(hash);
