// routes/jarRoutes.js
const express = require('express');
const router = express.Router();
const Jar = require('../models/jarModel');
const Msg  = require('../models/msgModel');
const fetch = (...args) => import('cross-fetch').then(({ default: f }) => f(...args));

// OpenRouter 配置
const OPENROUTER_KEY   = process.env.OPENROUTER_KEY;
const OPENROUTER_URL   = process.env.OPENROUTER_URL;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL;
// GET /api/jars
// 只取 owner 或者 partner_email 匹配的
router.get('/', (req, res) => {
  const uid = req.user.email;  // 假设我们用 email 作为标识
  Jar.getAll(uid, (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows);
  });
});

// POST /api/jars  { name, partner_email? }
router.post('/', (req, res) => {
  const owner = req.user.email;
  const {name, partner_email, mode, personality, purpose} = req.body;
  if (!name) return res.status(400).json({error: 'name is required'});
  Jar.create(name, owner, partner_email, mode, personality, purpose, function (err) {
    if (err) return res.status(500).json(err);
    res.json({id: this.lastID});
  });
});

// PUT /api/jars/:id/share  { partner_email }
// 给现有罐子加/改 partner_email
router.put('/:id/share', (req, res) => {
  const owner = req.user.email;
  const {partner_email} = req.body;
  Jar.updatePartner(req.params.id, owner, partner_email, (err) => {
    if (err) return res.status(500).json(err);
    res.json({ok: 1});
  });
});

// POST /api/jars/:id/generate   生成一句鼓励并写入罐子
router.post('/:id/generate', async (req, res) => {
  const uid = req.user.email;
  const jar = await new Promise(r => Jar.findById(req.params.id, (e, j) => r(j)));
  if (!jar) return res.status(404).json({error: 'jar not found'});
  if (![jar.owner, jar.partner_email].includes(uid))
    return res.status(403).json({error: 'no permission'});

  // Prompt 组合
  const personaMap = {
    gentle_sister: '温柔的大姐姐',
    parent_empathy: '像父母一样温暖的长辈',
    strict_mentor: '严格但关心你的师傅',
    playful_friend: '活泼幽默的朋友',
    wise_philosopher: '富有智慧的哲人'
  };
  const prompt = `你是一位${personaMap[jar.personality] || '温柔的大姐姐'}。用户创建此罐子的原因/期待：“${jar.purpose || '暂无'}”。请直接给出 **一句** 简短、积极的鼓励，不要添加任何括号、解释或分析。`;

  try {
    // 调用 OpenRouter API
    const orRes = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [{role: 'user', content: prompt}]
      })
    });
    const orData = await orRes.json();
    // 检查返回格式并取出回答
    const sentence = orData.choices?.[0]?.message?.content?.trim();

    if (!sentence) {
      console.error('[OpenRouter] no response', orData);
      return res.status(503).json({error: 'OpenRouter no response'});
    }
    // 存为一条 message，generated=1
    Msg.add(jar.id, sentence, null, null, null, true, (err) => {
      if (err) return res.status(500).json(err);
      res.json({message: sentence});
    });
  } catch (err) {
    res.status(500).json(err);
  }
});

module.exports = router;
