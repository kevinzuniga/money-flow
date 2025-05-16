/**
 * API Documentation Endpoint
 * 
 * This endpoint serves as documentation for the API,
 * providing information about available endpoints,
 * authentication requirements, and more.
 */

/**
 * API Index Handler
 * 
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 */
export default function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      message: 'Method not allowed'
    });
  }
  
  // API Documentation
  const apiDocs = {
    name: 'Money Flow API',
    version: '1.0.0',
    baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
    description: 'API para gestionar finanzas personales',
    authentication: {
      type: 'JWT',
      endpoint: '/api/auth/login',
      method: 'POST',
      headers: {
        Authorization: 'Bearer {token}'
      },
      cookieAuth: true,
      tokenExpiration: '8h'
    },
    rateLimiting: {
      enabled: true,
      limit: process.env.API_RATE_LIMIT || '100 requests per minute',
      note: 'Exceeding rate limits will result in 429 Too Many Requests responses'
    },
    endpoints: {
      auth: {
        login: {
          path: '/api/auth/login',
          method: 'POST',
          description: 'Iniciar sesión en la aplicación',
          requiresAuth: false,
          requestBody: {
            email: 'string (required)',
            password: 'string (required)'
          },
          responses: {
            200: 'Login exitoso',
            401: 'Credenciales inválidas',
            422: 'Validación fallida'
          }
        },
        logout: {
          path: '/api/auth/logout',
          method: 'POST',
          description: 'Cerrar sesión',
          requiresAuth: true,
          responses: {
            200: 'Logout exitoso',
            401: 'No autorizado'
          }
        },
        me: {
          path: '/api/auth/me',
          method: 'GET',
          description: 'Obtener información del usuario actual',
          requiresAuth: true,
          responses: {
            200: 'Información del usuario',
            401: 'No autorizado'
          }
        }
      },
      ingresos: {
        list: {
          path: '/api/ingresos',
          method: 'GET',
          description: 'Listar ingresos',
          requiresAuth: true,
          queryParams: {
            page: 'number (optional, default: 1)',
            limit: 'number (optional, default: 10)',
            startDate: 'YYYY-MM-DD (optional)',
            endDate: 'YYYY-MM-DD (optional)',
            minAmount: 'number (optional)',
            maxAmount: 'number (optional)',
            sortBy: 'string (optional, default: fecha)',
            sortDir: 'asc/desc (optional, default: desc)'
          },
          responses: {
            200: 'Lista de ingresos',
            401: 'No autorizado'
          }
        },
        create: {
          path: '/api/ingresos',
          method: 'POST',
          description: 'Crear un nuevo ingreso',
          requiresAuth: true,
          requestBody: {
            monto: 'number (required)',
            fecha: 'YYYY-MM-DD (required)',
            descripcion: 'string (optional)',
            categoria: 'string (optional)'
          },
          responses: {
            201: 'Ingreso creado',
            400: 'Datos inválidos',
            401: 'No autorizado',
            422: 'Validación fallida'
          }
        },
        get: {
          path: '/api/ingresos/{id}',
          method: 'GET',
          description: 'Obtener un ingreso específico',
          requiresAuth: true,
          pathParams: {
            id: 'string (required)'
          },
          responses: {
            200: 'Información del ingreso',
            401: 'No autorizado',
            404: 'Ingreso no encontrado'
          }
        },
        update: {
          path: '/api/ingresos/{id}',
          method: 'PUT',
          description: 'Actualizar un ingreso',
          requiresAuth: true,
          pathParams: {
            id: 'string (required)'
          },
          requestBody: {
            monto: 'number (optional)',
            fecha: 'YYYY-MM-DD (optional)',
            descripcion: 'string (optional)',
            categoria: 'string (optional)'
          },
          responses: {
            200: 'Ingreso actualizado',
            400: 'Datos inválidos',
            401: 'No autorizado',
            404: 'Ingreso no encontrado',
            422: 'Validación fallida'
          }
        },
        delete: {
          path: '/api/ingresos/{id}',
          method: 'DELETE',
          description: 'Eliminar un ingreso',
          requiresAuth: true,
          pathParams: {
            id: 'string (required)'
          },
          responses: {
            200: 'Ingreso eliminado',
            401: 'No autorizado',
            404: 'Ingreso no encontrado'
          }
        }
      },
      egresos: {
        list: {
          path: '/api/egresos',
          method: 'GET',
          description: 'Listar egresos',
          requiresAuth: true,
          queryParams: {
            page: 'number (optional, default: 1)',
            limit: 'number (optional, default: 10)',
            startDate: 'YYYY-MM-DD (optional)',
            endDate: 'YYYY-MM-DD (optional)',
            minAmount: 'number (optional)',
            maxAmount: 'number (optional)',
            sortBy: 'string (optional, default: fecha)',
            sortDir: 'asc/desc (optional, default: desc)'
          },
          responses: {
            200: 'Lista de egresos',
            401: 'No autorizado'
          }
        },
        create: {
          path: '/api/egresos',
          method: 'POST',
          description: 'Crear un nuevo egreso',
          requiresAuth: true,
          requestBody: {
            monto: 'number (required)',
            fecha: 'YYYY-MM-DD (required)',
            descripcion: 'string (optional)',
            categoria: 'string (optional)'
          },
          responses: {
            201: 'Egreso creado',
            400: 'Datos inválidos',
            401: 'No autorizado',
            422: 'Validación fallida'
          }
        },
        get: {
          path: '/api/egresos/{id}',
          method: 'GET',
          description: 'Obtener un egreso específico',
          requiresAuth: true,
          pathParams: {
            id: 'string (required)'
          },
          responses: {
            200: 'Información del egreso',
            401: 'No autorizado',
            404: 'Egreso no encontrado'
          }
        },
        update: {
          path: '/api/egresos/{id}',
          method: 'PUT',
          description: 'Actualizar un egreso',
          requiresAuth: true,
          pathParams: {
            id: 'string (required)'
          },
          requestBody: {
            monto: 'number (optional)',
            fecha: 'YYYY-MM-DD (optional)',
            descripcion: 'string (optional)',
            categoria: 'string (optional)'
          },
          responses: {
            200: 'Egreso actualizado',
            400: 'Datos inválidos',
            401: 'No autorizado',
            404: 'Egreso no encontrado',
            422: 'Validación fallida'
          }
        },
        delete: {
          path: '/api/egresos/{id}',
          method: 'DELETE',
          description: 'Eliminar un egreso',
          requiresAuth: true,
          pathParams: {
            id: 'string (required)'
          },
          responses: {
            200: 'Egreso eliminado',
            401: 'No autorizado',
            404: 'Egreso no encontrado'
          }
        }
      },
      reportes: {
        totales: {
          path: '/api/reportes/totales',
          method: 'GET',
          description: 'Obtener totales de ingresos y egresos',
          requiresAuth: true,
          queryParams: {
            groupBy: 'month/year (optional, default: month)',
            year: 'YYYY (optional, default: current year)',
            startDate: 'YYYY-MM-DD (optional)',
            endDate: 'YYYY-MM-DD (optional)',
            limit: 'number (optional, default: 12)'
          },
          responses: {
            200: 'Reporte de totales',
            401: 'No autorizado',
            400: 'Parámetros inválidos'
          }
        }
      },
      health: {
        status: {
          path: '/api/health',
          method: 'GET',
          description: 'Verificar estado de la API',
          requiresAuth: false,
          responses: {
            200: 'API en funcionamiento',
            503: 'API degradada o no disponible'
          }
        }
      }
    },
    errorResponses: {
      format: {
        success: 'boolean',
        message: 'string',
        errors: 'object (optional)',
        data: 'object (optional)'
      },
      commonCodes: {
        400: 'Bad Request - Solicitud mal formada',
        401: 'Unauthorized - Autenticación requerida',
        403: 'Forbidden - Sin permisos suficientes',
        404: 'Not Found - Recurso no encontrado',
        422: 'Unprocessable Entity - Validación fallida',
        429: 'Too Many Requests - Límite de tasa excedido',
        500: 'Internal Server Error - Error del servidor'
      }
    }
  };
  
  // Return API documentation
  res.status(200).json({
    success: true,
    data: apiDocs
  });
}

