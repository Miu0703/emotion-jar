const express = require('express');
const router = express.Router();
const Msg = require('../models/msgModel');
const Mail = require('../utils/mailer');
const Jar  = require('../models/jarModel');
const multer = require('multer');
const path = require('path');

// ── multer 設定：檔名 => 1639581112345-abc.jpg
const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', 'uploads'),
  filename: (_, file, cb) =>
    cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, ''))
});
const upload = multer({ storage });

// POST /api/messages  multipart/form-data
// fields: jarId, content, openAt, file(可選)
router.post('/', upload.single('file'), async (req, res) => {
  const { jarId, content, openAt } = req.body;
  // 权限校验：添加
  const jar = await new Promise(r => Jar.findById(jarId, (e, j) => r(j)));
  const user = req.user.email;
  const isOwner   = jar.owner === user;
  const isPartner = jar.partner_email === user;
  if (jar.mode === 'self' && !isOwner) 
    return res.status(403).json({ error: 'no add permission' });
  if (jar.mode === 'partner' && !isOwner)
    return res.status(403).json({ error: 'no add permission' });  
  let imageUrl = null, voiceUrl = null;
  if (req.file) {
    const url = `/uploads/${req.file.filename}`;
    if (req.file.mimetype.startsWith('image/')) imageUrl = url;
    if (req.file.mimetype.startsWith('audio/')) voiceUrl = url;
  }
  Msg.add(jarId, content, imageUrl, voiceUrl, openAt, false, async function (err) {
    if (err) return res.status(500).json(err);
    res.json({ id: this.lastID });
    // 找到收件人
    const jar = await new Promise(r =>
      Jar.findById(jarId, (e, j)=> r(j || {})));

    const recipients = [jar.owner, jar.partner_email].filter(Boolean);

    // 立即开启：openAt 为空或 ≤ 当前
    const immediate = !openAt || new Date(openAt) <= new Date();

    if (immediate) {
      Mail.send({
        to: recipients.join(','),
        subject: `🎁 有新留言放入「${jar.name}」！`,
        html: `<p>${content}</p>`
      }).catch(console.error);

      // 标记已通知
      Msg.markNotified(this.lastID);
    }

  });
});
// POST 收藏到展示架
router.post('/:id/favorite', (req, res) => {
  Msg.updateFavorite(req.params.id, true, (e) =>
    e ? res.status(500).json(e) : res.json({ok:1})
  );
});

// POST 放回罐子 (清除 shelved 状态)
router.post('/:id/putback', (req, res) => {
  Msg.updateStatus(req.params.id, 'inJar', (e) =>
    e ? res.status(500).json(e) : res.json({ok:1})
  );
});

// DELETE 删除消息
router.delete('/:id', (req, res) => {
  Msg.updateStatus(req.params.id, 'deleted', (e) =>
    e ? res.status(500).json(e) : res.json({ok:1})
  );
});
// GET /api/messages/random?jarId=1
router.get('/random', (req, res) => {
  Msg.randomOne(req.query.jarId, (err, row) =>
    err ? res.status(500).json(err) : res.json(row || {})
  );
});

// GET /api/messages/shelf?jarId=1
router.get('/shelf', (req, res) => {
  Msg.getShelf(req.query.jarId, (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows);
  });
});

module.exports = router;
