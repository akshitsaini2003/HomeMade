const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const hpp = require('hpp');
const morgan = require('morgan');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const swaggerUi = require('swagger-ui-express');
const env = require('./config/env');
const routes = require('./routes');
const swaggerSpec = require('./config/swagger');
const notFound = require('./middlewares/notFound');
const errorHandler = require('./middlewares/errorHandler');
const { globalLimiter } = require('./middlewares/rateLimiter');

const app = express();

app.use(
  cors({
    origin: env.frontendUrl,
    credentials: true
  })
);
app.use(helmet());
app.use(hpp());
app.use(compression());
app.use(cookieParser());
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));
app.use(
  express.json({
    limit: '2mb',
    verify: (req, _res, buf) => {
      if (req.originalUrl.includes('/api/v1/payments/webhook')) {
        req.rawBody = buf.toString();
      }
    }
  })
);
app.use(express.urlencoded({ extended: true }));
app.use(globalLimiter);

app.get('/health', (_req, res) => {
  res.json({ success: true, message: 'HomeMade API is healthy' });
});

app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/api/v1', routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
