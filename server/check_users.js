const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, 'game.db'));
const users = db.prepare('SELECT id, username, role FROM users').all();
console.log('Users in DB:', JSON.stringify(users, null, 2));
db.close();
