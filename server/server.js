// server.js
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const db = require('./db');
const path = require('path');

// 路由
const { router: authRoutes, SECRET } = require('./routes/authRoutes');
const jarRoutes = require('./routes/jarRoutes');
const msgRoutes = require('./routes/msgRoutes');

const app = express();

// 全局中间件
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// 1) 公开认证接口
app.use('/api/auth', authRoutes);

// 2) 鉴权中间件
function auth(req, res, next) {
  const raw = req.headers.authorization || '';
  const token = raw.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'no token' });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'bad token' });
  }
}

// 3) 受保护的业务接口
app.use('/api/jars', auth, jarRoutes);
app.use('/api/messages', auth, msgRoutes);

// 4) 404 兜底
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

const PORT = 3001;
app.listen(PORT, () => console.log(`⛽  API running on http://localhost:${PORT}`));

const cron = require('node-cron');
const Msg  = require('./models/msgModel');
const Mail = require('./utils/mailer');

// 每分钟扫一次需要开启的消息
cron.schedule('* * * * *', () => {
  Msg.pending((err, rows) => {
    if (err) return console.error(err);
    rows.forEach(row => {
      const to = [row.owner, row.partner_email].filter(Boolean).join(',');
      Mail.send({
        to,
        subject: `🕒「${row.jar_name}」的留言到了开启时间！`,
        html: `<p>${row.content}</p>`
      }).catch(console.error);
      Msg.markNotified(row.id);
    });
  });
});
