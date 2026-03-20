const jwt = require('jsonwebtoken');
const env = require('../config/env');

const generateAccessToken = (payload) => jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtAccessExpires });
const generateRefreshToken = (payload) => jwt.sign(payload, env.jwtRefreshSecret, { expiresIn: env.jwtRefreshExpires });

const verifyAccessToken = (token) => jwt.verify(token, env.jwtSecret);
const verifyRefreshToken = (token) => jwt.verify(token, env.jwtRefreshSecret);

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken
};
