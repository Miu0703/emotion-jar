const db = require('../db');

// models/msgModel.js
exports.add = (jarId, content, img, voice, openAt, generated, cb) =>
    db.run(
        `INSERT INTO messages
             (jar_id, content, image_url, voice_url, open_at, generated)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
            jarId,
            content,
            img || null,
            voice || null,
            openAt || null,
            generated ? 1 : 0
        ],
        cb
    );

// 更新状态
exports.updateStatus = (id, status, cb) =>
  db.run('UPDATE messages SET status = ? WHERE id = ?', [status, id], cb);
// 收藏
exports.updateFavorite = (id, fav, cb) =>
  db.run('UPDATE messages SET favorite = ? WHERE id = ?', [fav ? 1 : 0, id], cb);
// 获取展示架

exports.getShelf = (jarId, cb) =>
  db.all(
    `SELECT * FROM messages
     WHERE jar_id = ?
       AND favorite = 1
       AND status != 'deleted'
     ORDER BY id DESC`,   
    [jarId], cb
  );

exports.randomOne = (jarId, cb) =>
  db.get(
    `SELECT * FROM messages
     WHERE jar_id = ? AND (open_at IS NULL OR open_at <= datetime('now'))
     ORDER BY RANDOM() LIMIT 1`,
    [jarId],
    cb
  );
exports.markNotified = id =>
  db.run('UPDATE messages SET notified = 1 WHERE id = ?', [id]);

exports.pending = cb =>
  db.all(
    `SELECT m.*, j.name AS jar_name, j.owner, j.partner_email
       FROM messages m
       JOIN jars j ON j.id = m.jar_id
      WHERE m.open_at IS NOT NULL
        AND m.open_at <= datetime('now')
        AND m.notified = 0`,
    cb
  );