const nodemailer = require('nodemailer');
const env = require('../config/env');

let transporter;

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.email.host,
      port: env.email.port,
      secure: false,
      auth: env.email.user && env.email.password ? { user: env.email.user, pass: env.email.password } : undefined
    });
  }
  return transporter;
};

const sendEmail = async ({ to, subject, html }) => {
  if (!env.email.host || !env.email.user || !env.email.password) {
    console.warn(`Email skipped (SMTP not configured): ${subject} -> ${to}`);
    return;
  }

  await getTransporter().sendMail({
    from: env.email.from,
    to,
    subject,
    html
  });
};

module.exports = {
  sendEmail
};
