const env = require('../config/env');

const errorHandler = (err, _req, res, _next) => {
  const status = err.statusCode || 500;
  const response = {
    success: false,
    message: err.message || 'Internal server error'
  };

  if (err.details) {
    response.details = err.details;
  }

  if (env.nodeEnv !== 'production' && err.stack) {
    response.stack = err.stack;
  }

  res.status(status).json(response);
};

module.exports = errorHandler;
