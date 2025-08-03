const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Timing API',
      version: '1.0.0',
      description: 'Node.js/Express API for order management with Firebase authentication and push notifications',
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
        MenuItem: {
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
                $ref: '#/components/schemas/MenuItem'
              }
            }
          }
        },
        OrderItem: {
          type: 'object',
          properties: {
            menu_id: {
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
          required: ['menu_id', 'quantity', 'price']
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
                  menu_id: { type: 'integer' },
                  menu_name: { type: 'string' },
                  customizations: { type: 'object' },
                  quantity: { type: 'integer' },
                  price: { type: 'number' }
                }
              }
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
        },
        FcmTokenRequest: {
          type: 'object',
          properties: {
            fcm_token: {
              type: 'string',
              description: 'Firebase Cloud Messaging token from client device',
              example: 'cJ4lN5zGSyq1MKp8mF7wXR:APA91bH2vY6pN8wGq4sL9dF3kXmYe1nR7tUv9cA8bK6hJ5mP2qI4oE7zC3fT1nW9xS8TestToken',
              minLength: 10
            }
          },
          required: ['fcm_token']
        },
        FcmTokenResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            data: {
              type: 'object',
              properties: {
                token_id: {
                  type: 'integer',
                  description: 'Database ID of the stored FCM token',
                  example: 1
                },
                user: {
                  type: 'object',
                  properties: {
                    uid: {
                      type: 'string',
                      description: 'Firebase user ID',
                      example: 'sN9lEvuseyU039vgn2ZpA2Tq6zm2'
                    },
                    email: {
                      type: 'string',
                      format: 'email',
                      example: 'timing.2025@gmail.com'
                    },
                    email_verified: {
                      type: 'boolean',
                      example: false
                    }
                  }
                }
              }
            },
            message: {
              type: 'string',
              example: 'FCM token stored successfully'
            }
          }
        },
        TestNotificationRequest: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Notification title',
              example: 'Test Notification'
            },
            body: {
              type: 'string',
              description: 'Notification body text',
              example: 'This is a test notification from the API'
            }
          }
        },
        DebugTokenResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            message: {
              type: 'string',
              example: 'Token is valid'
            },
            user: {
              type: 'object',
              properties: {
                uid: {
                  type: 'string',
                  example: 'sN9lEvuseyU039vgn2ZpA2Tq6zm2'
                },
                email: {
                  type: 'string',
                  format: 'email',
                  example: 'timing.2025@gmail.com'
                },
                email_verified: {
                  type: 'boolean',
                  example: false
                }
              }
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2025-07-31T13:22:47.017Z'
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