const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Timing API',
      version: '1.0.0',
      description: 'Node.js/Express API for order management with Firebase integration',
      contact: {
        name: 'API Support',
        email: 'support@timing-api.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      },
      {
        url: 'https://api.timing.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token (without "Bearer " prefix)'
        },
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'Authorization',
          description: 'Enter: Bearer {your-token-here}'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'string',
              example: 'Error message'
            }
          }
        },
        ValidationError: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              example: 'Validation failed'
            },
            details: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string' },
                  value: { type: 'string' },
                  msg: { type: 'string' },
                  path: { type: 'string' },
                  location: { type: 'string' }
                }
              }
            }
          }
        },
        Beverage: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              example: 1
            },
            name: {
              type: 'string',
              example: 'Espresso'
            },
            category: {
              type: 'string',
              example: 'Coffee'
            },
            base_price: {
              type: 'number',
              format: 'decimal',
              example: 3.50
            },
            customizations: {
              type: 'object',
              example: {
                sizes: ['Small', 'Medium', 'Large'],
                extras: ['Extra Shot', 'Decaf']
              }
            },
            active: {
              type: 'boolean',
              example: true
            }
          }
        },
        MenuCategory: {
          type: 'object',
          properties: {
            category: {
              type: 'string',
              example: 'Coffee'
            },
            items: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Beverage'
              }
            }
          }
        },
        OrderItem: {
          type: 'object',
          properties: {
            beverage_id: {
              type: 'integer',
              example: 1
            },
            quantity: {
              type: 'integer',
              minimum: 1,
              example: 2
            },
            price: {
              type: 'number',
              format: 'decimal',
              example: 3.50
            },
            customizations: {
              type: 'object',
              example: {
                size: 'Large',
                extras: ['Extra Shot']
              }
            }
          },
          required: ['beverage_id', 'quantity', 'price']
        },
        CustomerInfo: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              example: 'John Doe'
            },
            phone: {
              type: 'string',
              format: 'phone',
              example: '+1234567890'
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'john@example.com'
            }
          },
          required: ['name']
        },
        CreateOrderRequest: {
          type: 'object',
          properties: {
            customer_info: {
              $ref: '#/components/schemas/CustomerInfo'
            },
            items: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/OrderItem'
              },
              minItems: 1
            },
            total: {
              type: 'number',
              format: 'decimal',
              example: 7.00
            }
          },
          required: ['customer_info', 'items', 'total']
        },
        Order: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              example: 1
            },
            customer_info: {
              $ref: '#/components/schemas/CustomerInfo'
            },
            status: {
              type: 'string',
              enum: ['pending', 'preparing', 'ready', 'completed', 'cancelled'],
              example: 'pending'
            },
            total: {
              type: 'string',
              example: '7.00'
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              example: '2025-07-29T08:17:01.373Z'
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              example: '2025-07-29T08:17:01.373Z'
            },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'integer' },
                  beverage_id: { type: 'integer' },
                  beverage_name: { type: 'string' },
                  customizations: { type: 'object' },
                  quantity: { type: 'integer' },
                  price: { type: 'number' }
                }
              }
            }
          }
        },
        LoginRequest: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              example: 'admin'
            },
            password: {
              type: 'string',
              format: 'password',
              example: 'admin123'
            },
            fcm_token: {
              type: 'string',
              description: 'Firebase Cloud Messaging token for push notifications'
            }
          },
          required: ['username', 'password']
        },
        LoginResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            data: {
              type: 'object',
              properties: {
                token: {
                  type: 'string',
                  example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
                },
                user: {
                  type: 'object',
                  properties: {
                    id: { type: 'integer', example: 1 },
                    username: { type: 'string', example: 'admin' }
                  }
                }
              }
            },
            message: {
              type: 'string',
              example: 'Login successful'
            }
          }
        },
        UpdateOrderStatusRequest: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['pending', 'preparing', 'ready', 'completed', 'cancelled'],
              example: 'preparing'
            }
          },
          required: ['status']
        },
        SalesData: {
          type: 'object',
          properties: {
            date: {
              type: 'string',
              format: 'date',
              example: '2025-07-29'
            },
            total_orders: {
              type: 'integer',
              example: 5
            },
            total_revenue: {
              type: 'number',
              example: 25.50
            },
            completed_orders: {
              type: 'integer',
              example: 3
            },
            pending_orders: {
              type: 'integer',
              example: 2
            },
            completion_rate: {
              type: 'string',
              example: '60.0'
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      },
      {
        ApiKeyAuth: []
      }
    ]
  },
  apis: ['./src/routes/*.js', './src/server.js']
};

const specs = swaggerJsdoc(options);

module.exports = {
  serve: swaggerUi.serve,
  setup: swaggerUi.setup(specs, {
    explorer: true,
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .auth-wrapper { margin-bottom: 20px; }
      .swagger-ui .auth-btn-wrapper { display: block !important; }
    `,
    customSiteTitle: 'Timing API Documentation',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      tryItOutEnabled: true
    }
  }),
  specs
};