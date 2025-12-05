// Swagger/OpenAPI Configuration
const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'CineSense API',
      version: '1.0.0',
      description: 'AI-Powered Movie Recommendation System API',
      contact: {
        name: 'CineSense API Support',
      },
      license: {
        name: 'ISC',
      },
    },
    servers: [
      {
        url: process.env.API_URL || 'http://localhost:5000',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message',
            },
          },
        },
        ValidationError: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              example: 'Validation failed',
            },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string' },
                  message: { type: 'string' },
                  value: { type: 'string' },
                },
              },
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            username: { type: 'string' },
            email: { type: 'string' },
            favorite_genres: {
              type: 'array',
              items: { type: 'string' },
            },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        Movie: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            title: { type: 'string' },
            genre: { type: 'string' },
            year: { type: 'integer' },
            description: { type: 'string' },
            poster_url: { type: 'string', format: 'uri' },
            tagline: { type: 'string' },
            mini_scene: { type: 'string' },
            tags: {
              type: 'array',
              items: { type: 'string' },
            },
            isFavorited: { type: 'boolean' },
          },
        },
        Recommendation: {
          allOf: [
            { $ref: '#/components/schemas/Movie' },
            {
              type: 'object',
              properties: {
                reason: { type: 'string', description: 'Why this movie was recommended' },
              },
            },
          ],
        },
      },
    },
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication endpoints',
      },
      {
        name: 'Users',
        description: 'User profile and preferences management',
      },
      {
        name: 'Movies',
        description: 'Movie information and search endpoints',
      },
      {
        name: 'Recommendations',
        description: 'AI-powered movie recommendations',
      },
    ],
  },
  apis: ['./routes/*.js', './controllers/*.js'], // Paths to files containing OpenAPI definitions
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;

