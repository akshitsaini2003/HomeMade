const crypto = require('crypto');

const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));

const hashOtp = (otp) => crypto.createHash('sha256').update(otp).digest('hex');

module.exports = {
  generateOtp,
  hashOtp
};
