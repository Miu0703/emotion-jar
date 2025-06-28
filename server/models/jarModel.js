// models/jarModel.js
const db = require('../db');

exports.getAll = (email, cb) =>
  db.all(
    `SELECT * FROM jars
     WHERE owner = ? OR partner_email = ?`,
    [email, email],
    cb
  );

exports.create = (name, owner, partner, mode, personality, purpose, cb) =>
    db.run(
        `INSERT INTO jars (name, owner, partner_email, mode, personality, purpose)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [name,
            owner,
            partner || null,
            mode || 'self',
            personality || 'gentle_sister',
            purpose || ''],
        cb
    );

 // 根据 id 查罐子
 exports.findById = (id, cb) =>
   db.get(
     `SELECT * FROM jars WHERE id = ?`,
     [id],
     cb
   );

// 更新 partner_email，保证只有 owner 能改
exports.updatePartner = (id, owner, partner_email, cb) =>
  db.run(
    `UPDATE jars 
     SET partner_email = ?
     WHERE id = ? AND owner = ?`,
    [partner_email, id, owner],
    cb
  );

// ★ 新增：根據 id 取單一罐子
exports.findById = (id, cb) =>
  db.get(
    'SELECT * FROM jars WHERE id = ?',
    [id],
    cb
  );