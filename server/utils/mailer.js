const nodemailer = require('nodemailer');
const path = require('path');                  // ✅ ⬅️ 這一行是你忘了加的
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });


const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

exports.send = async ({ to, subject, html }) =>
  transporter.sendMail({ from: `"情绪储存罐" <${process.env.SMTP_USER}>`, to, subject, html });

console.log('[DEBUG] SMTP_USER:', process.env.SMTP_USER);
