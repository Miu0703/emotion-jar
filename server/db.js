const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 每次删库后都会重建完整结构
const db = new sqlite3.Database(path.join(__dirname, 'emotionJar.db'));

db.serialize(() => {
  // 1. 用户表
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      email    TEXT UNIQUE,
      password TEXT
    )
  `);

  // 2. 罐子表，新增 mode 字段
  db.run(`
    CREATE TABLE IF NOT EXISTS jars (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT  NOT NULL,
      owner         TEXT  NOT NULL,
      partner_email TEXT,
      mode          TEXT  DEFAULT 'self',          -- self | partner | shared
      personality   TEXT  DEFAULT 'gentle_sister', -- AI 角色
      purpose       TEXT  DEFAULT ''               -- 创建缘由 / 期望鼓励
    )
  `);

  // 3. 消息表，一次性包含所有字段
  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      jar_id      INTEGER,
      content     TEXT,
      image_url   TEXT,
      voice_url   TEXT,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
      open_at     DATETIME,
      viewed      INTEGER DEFAULT 0,
      notified    INTEGER DEFAULT 0,
      status      TEXT    DEFAULT 'inJar',    -- inJar | drawn | shelved | deleted
      favorite    INTEGER DEFAULT 0,           -- 0=普通,1=收藏
      generated   INTEGER DEFAULT 0,           -- 0=手动,1=AI
      FOREIGN KEY(jar_id) REFERENCES jars(id)
    )
  `);
});

module.exports = db;
