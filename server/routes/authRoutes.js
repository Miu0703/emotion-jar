const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const router = express.Router();
const SECRET = 'super-secret-key'; // 生产环境请用 env
const Mail = require('../utils/mailer');

router.post('/register', async (req, res) => {
  const { email, password } = req.body;
  const hash = await bcrypt.hash(password, 10);
  if (!email || !password) return res.status(400).json({ error: 'empty' });
  User.create(email, hash, function (err) {
    if (err) return res.status(400).json(err);
   // 发送欢迎邮件（异步，无需阻塞响应）
    Mail.send({
        to: email,
        subject: '欢迎加入情绪储存罐 😊',
        html: `<p>Hi，欢迎使用情绪储存罐！</p>
            <p>现在就登录写下第一条鼓励吧！</p>`
   }).catch(console.error);    
    res.json({ ok: 1 });
  });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'empty' });
  User.findByEmail(email, async (err, user) => {
    if (err || !user) return res.status(400).json({ error: 'invalid' });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ error: 'invalid' });
    const token = jwt.sign({ uid: user.id, email }, SECRET, { expiresIn: '7d' });
    res.json({ token });
  });
});

module.exports = { router, SECRET };
