const templates = require('../utils/emailTemplates');
const { sendEmail } = require('../utils/email');

const sendTemplatedEmail = async (templateName, to, payload) => {
  const templateFn = templates[templateName];
  if (!templateFn) {
    throw new Error(`Unknown email template: ${templateName}`);
  }

  const { subject, html } = templateFn(payload);
  await sendEmail({ to, subject, html });
};

module.exports = {
  sendTemplatedEmail
};
