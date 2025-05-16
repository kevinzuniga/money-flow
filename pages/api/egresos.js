/**
 * API handler for expense management
 * 
 * This module provides endpoints for creating and retrieving expense records,
 * with filtering, pagination, and proper validation.
 */

import db from '../../lib/db';
import { validateTransaction } from '../../lib/auth';
import { BadRequestError, ValidationError, NotFoundError } from '../../lib/middleware/error';
import { 
  registerRoutes,
  formatSuccess,
  formatPaginated,
  extractQueryParams
} from '../../lib/api/router';

/**
 * Handle GET request to fetch expense records with pagination and filters
 * 
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 */
async function getEgresos(req, res) {
  // Extract and validate query parameters
  const params = extractQueryParams(req.query, {
    page: 1,
    limit: 10,
    sortBy: 'fecha',
    sortDir: 'desc'
  });
  
  // Validate pagination limits
  if (params.limit > 100) {
    throw new BadRequestError('El límite máximo es 100 registros por página');
  }
  
  // Calculate offset for pagination
  const offset = (params.page - 1) * params.limit;
  
  // Build query parts
  let countQuery = 'SELECT COUNT(*) FROM egresos WHERE user_id = $1';
  let query = 'SELECT * FROM egresos WHERE user_id = $1';
  const queryParams = [req.userId];
  const filterConditions = [];
  
  // Add date range filter
  if (params.startDate && params.endDate) {
    filterConditions.push('fecha BETWEEN $' + (queryParams.length + 1) + ' AND $' + (queryParams.length + 2));
    queryParams.push(params.startDate, params.endDate);
  } else if (params.startDate) {
    filterConditions.push('fecha >= $' + (queryParams.length + 1));
    queryParams.push(params.startDate);
  } else if (params.endDate) {
    filterConditions.push('fecha <= $' + (queryParams.length + 1));
    queryParams.push(params.endDate);
  }
  
  // Add month and year filters if provided
  if (params.month && params.year) {
    filterConditions.push('EXTRACT(MONTH FROM fecha) = $' + (queryParams.length + 1));
    filterConditions.push('EXTRACT(YEAR FROM fecha) = $' + (queryParams.length + 2));
    queryParams.push(parseInt(params.month), parseInt(params.year));
  } else if (params.year) {
    filterConditions.push('EXTRACT(YEAR FROM fecha) = $' + (queryParams.length + 1));
    queryParams.push(parseInt(params.year));
  }
  
  // Add amount range filter
  if (params.minAmount !== undefined) {
    filterConditions.push('monto >= $' + (queryParams.length + 1));
    queryParams.push(parseFloat(params.minAmount));
  }
  
  if (params.maxAmount !== undefined) {
    filterConditions.push('monto <= $' + (queryParams.length + 1));
    queryParams.push(parseFloat(params.maxAmount));
  }
  
  // Add category filter if provided
  if (params.categoria) {
    filterConditions.push('categoria = $' + (queryParams.length + 1));
    queryParams.push(params.categoria);
  }
  
  // Append filter conditions to queries
  if (filterConditions.length > 0) {
    const filterClause = ' AND ' + filterConditions.join(' AND ');
    countQuery += filterClause;
    query += filterClause;
  }
  
  // Add sorting
  const validSortFields = ['fecha', 'monto', 'descripcion', 'id', 'categoria'];
  const validSortDirs = ['asc', 'desc'];
  
  const actualSortBy = validSortFields.includes(params.sortBy) ? params.sortBy : 'fecha';
  const actualSortDir = validSortDirs.includes(params.sortDir) ? params.sortDir : 'desc';
  
  query += ` ORDER BY ${actualSortBy} ${actualSortDir}`;
  
  // Add pagination
  query += ` LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
  queryParams.push(params.limit, offset);
  
  // Execute the queries
  const [countResult, dataResult] = await Promise.all([
    db.query(countQuery, queryParams.slice(0, -2)), // Exclude LIMIT and OFFSET params
    db.query(query, queryParams)
  ]);
  
  const totalItems = parseInt(countResult.rows[0].count);
  
  // Return paginated response
  return res.status(200).json(
    formatPaginated(
      dataResult.rows,
      params.page,
      params.limit,
      totalItems,
      'Egresos recuperados exitosamente'
    )
  );
}

/**
 * Handle POST request to create a new expense record
 * 
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 */
async function createEgreso(req, res) {
  const { monto, descripcion, fecha, categoria } = req.body;
  
  // Validate input
  const validation = validateTransaction(req.body);
  if (!validation.isValid) {
    throw new ValidationError('Datos de egreso inválidos', validation.errors);
  }
  
  // Insert into database
  const result = await db.query(
    'INSERT INTO egresos (monto, descripcion, fecha, categoria, user_id) VALUES ($1, $2, $3, $4, $5) RETURNING id',
    [monto, descripcion || null, fecha, categoria || null, req.userId]
  );
  
  // Return success response
  return res.status(201).json(
    formatSuccess(
      { id: result.rows[0].id },
      'Egreso registrado correctamente'
    )
  );
}

/**
 * Handle GET request for a single expense record by ID
 * 
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 */
async function getEgresoById(req, res) {
  const { id } = req.query;
  
  // Validate ID
  if (!id) {
    throw new BadRequestError('ID de egreso no proporcionado');
  }
  
  // Get expense record
  const result = await db.query(
    'SELECT * FROM egresos WHERE id = $1 AND user_id = $2',
    [id, req.userId]
  );
  
  // Check if record exists
  if (result.rows.length === 0) {
    throw new NotFoundError('Egreso no encontrado');
  }
  
  // Return record
  return res.status(200).json(
    formatSuccess(
      result.rows[0],
      'Egreso recuperado exitosamente'
    )
  );
}

/**
 * Handle PUT request to update an expense record
 * 
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 */
async function updateEgreso(req, res) {
  const { id } = req.query;
  const { monto, descripcion, fecha, categoria } = req.body;
  
  // Validate ID
  if (!id) {
    throw new BadRequestError('ID de egreso no proporcionado');
  }
  
  // Validate input
  const validation = validateTransaction(req.body);
  if (!validation.isValid) {
    throw new ValidationError('Datos de egreso inválidos', validation.errors);
  }
  
  // Update record
  const result = await db.query(
    `UPDATE egresos 
     SET monto = $1, descripcion = $2, fecha = $3, categoria = $4, updated_at = NOW() 
     WHERE id = $5 AND user_id = $6 
     RETURNING *`,
    [monto, descripcion || null, fecha, categoria || null, id, req.userId]
  );
  
  // Check if record exists
  if (result.rows.length === 0) {
    throw new NotFoundError('Egreso no encontrado');
  }
  
  // Return updated record
  return res.status(200).json(
    formatSuccess(
      result.rows[0],
      'Egreso actualizado correctamente'
    )
  );
}

/**
 * Handle DELETE request to remove an expense record
 * 
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 */
async function deleteEgreso(req, res) {
  const { id } = req.query;
  
  // Validate ID
  if (!id) {
    throw new BadRequestError('ID de egreso no proporcionado');
  }
  
  // Delete record
  const result = await db.query(
    'DELETE FROM egresos WHERE id = $1 AND user_id = $2 RETURNING id',
    [id, req.userId]
  );
  
  // Check if record exists
  if (result.rows.length === 0) {
    throw new NotFoundError('Egreso no encontrado');
  }
  
  // Return success response
  return res.status(200).json(
    formatSuccess(
      null,
      'Egreso eliminado correctamente'
    )
  );
}

// Register API routes with middleware
export default registerRoutes(
  {
    // List and create endpoints (collection)
    GET: getEgresos,
    POST: createEgreso,
  },
  // Apply auth middleware and rate limiting
  {
    auth: true,
    rateLimit: {
      maxRequests: 100,
      windowMs: 60 * 1000 // 1 minute
    }
  }
);

/**
 * API handler for individual expense records by ID
 * Supports GET, PUT, DELETE operations on specific records
 * 
 * @type {function} 
 */
export const handleEgresoById = registerRoutes(
  {
    GET: getEgresoById,
    PUT: updateEgreso,
    DELETE: deleteEgreso,
  },
  {
    auth: true,
    rateLimit: {
      maxRequests: 100,
      windowMs: 60 * 1000 // 1 minute
    }
  }
);

// Re-export the default handler for compatibility
/**
 * Default API handler for expense collection
 * Supports GET (list) and POST (create) operations
 * 
 * @type {function}
 */
