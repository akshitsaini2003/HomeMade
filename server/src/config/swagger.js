const swaggerJsdoc = require('swagger-jsdoc');

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'HomeMade API',
      version: '1.0.0',
      description: 'REST API for HomeMade meal pre-ordering platform'
    },
    servers: [
      {
        url: '/api/v1'
      }
    ]
  },
  apis: ['./src/routes/*.js']
});

module.exports = swaggerSpec;
