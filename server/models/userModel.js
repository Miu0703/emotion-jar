const db = require('../db');
exports.create = (email, hash, cb) =>
  db.run('INSERT INTO users (email, password) VALUES (?,?)', [email, hash], cb);

exports.findByEmail = (email, cb) =>
  db.get('SELECT * FROM users WHERE email = ?', [email], cb);
