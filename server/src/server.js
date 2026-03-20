const http = require('http');
const app = require('./app');
const connectDB = require('./config/db');
const env = require('./config/env');
const { startPendingPaymentAutoCancelScheduler } = require('./controllers/orderController');

const start = async () => {
  await connectDB();
  startPendingPaymentAutoCancelScheduler();

  const server = http.createServer(app);
  server.listen(env.port, () => {
    console.log(`Server running on port ${env.port}`);
  });
};

start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
