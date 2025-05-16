/**
 * API handler for transaction category management
 * 
 * This module provides endpoints for creating, listing, updating and deleting
 * transaction categories, with filtering and proper validation.
 */

import db from '../../lib/db';
import { BadRequestError, ValidationError, NotFoundError } from '../../lib/middleware/error';
import { 
  registerRoutes,
  formatSuccess,
  formatPaginated,
  extractQueryParams
} from '../../lib/api/router';

/**
 * Validates category data
 * 
 * @param {Object} data - The category data to validate
 * @returns {Object} Validation result with isValid flag and any errors
 */
function validateCategory(data) {
  const errors = {};
  
  // Check required fields
  if (!data.nombre || typeof data.nombre !== 'string' || data.nombre.trim().length < 2) {
    errors.nombre = 'El nombre de la categoría debe tener al menos 2 caracteres';
  }
  
  if (!data.tipo || typeof data.tipo !== 'string') {
    errors.tipo = 'El tipo de categoría es requerido';
  } else if (!['ingreso', 'egreso', 'ambos'].includes(data.tipo)) {
    errors.tipo = 'El tipo de categoría debe ser ingreso, egreso o ambos';
  }
  
  // Check optional fields
  if (data.color && typeof data.color !== 'string') {
    errors.color = 'El color debe ser una cadena de texto';
  }
  
  if (data.icono && typeof data.icono !== 'string') {
    errors.icono = 'El icono debe ser una cadena de texto';
  }
  
  if (data.descripcion && typeof data.descripcion !== 'string') {
    errors.descripcion = 'La descripción debe ser una cadena de texto';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Handle GET request to fetch categories with filters
 * 
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 */
async function getCategorias(req, res) {
  // Extract and validate query parameters
  const params = extractQueryParams(req.query, {
    page: 1,
    limit: 50,
    sortBy: 'nombre',
    sortDir: 'asc'
  });
  
  // Validate pagination limits
  if (params.limit > 100) {
    throw new BadRequestError('El límite máximo es 100 registros por página');
  }
  
  // Calculate offset for pagination
  const offset = (params.page - 1) * params.limit;
  
  // Build query parts
  let countQuery = 'SELECT COUNT(*) FROM categorias WHERE user_id = $1 OR user_id IS NULL';
  let query = 'SELECT * FROM categorias WHERE user_id = $1 OR user_id IS NULL';
  const queryParams = [req.userId];
  const filterConditions = [];
  
  // Add tipo filter if provided
  if (params.tipo) {
    if (['ingreso', 'egreso', 'ambos'].includes(params.tipo)) {
      filterConditions.push('(tipo = $' + (queryParams.length + 1) + ' OR tipo = \'ambos\')');
      queryParams.push(params.tipo);
    } else {
      throw new BadRequestError('El tipo de categoría debe ser ingreso, egreso o ambos');
    }
  }
  
  // Add search filter if provided
  if (params.search) {
    filterConditions.push('nombre ILIKE $' + (queryParams.length + 1));
    queryParams.push(`%${params.search}%`);
  }
  
  // Add filter for system vs. custom categories
  if (params.custom === 'true') {
    filterConditions.push('user_id = $1'); // Only user-defined categories
  } else if (params.custom === 'false') {
    filterConditions.push('user_id IS NULL'); // Only system categories
  }
  
  // Append filter conditions to queries
  if (filterConditions.length > 0) {
    const filterClause = ' AND ' + filterConditions.join(' AND ');
    countQuery += filterClause;
    query += filterClause;
  }
  
  // Add sorting
  const validSortFields = ['nombre', 'tipo', 'created_at'];
  const validSortDirs = ['asc', 'desc'];
  
  const actualSortBy = validSortFields.includes(params.sortBy) ? params.sortBy : 'nombre';
  const actualSortDir = validSortDirs.includes(params.sortDir) ? params.sortDir : 'asc';
  
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
      'Categorías recuperadas exitosamente'
    )
  );
}

/**
 * Handle POST request to create a new category
 * 
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 */
async function createCategoria(req, res) {
  const { nombre, tipo, color, icono, descripcion } = req.body;
  
  // Validate input
  const validation = validateCategory(req.body);
  if (!validation.isValid) {
    throw new ValidationError('Datos de categoría inválidos', validation.errors);
  }
  
  // Check if category already exists
  const existingCategory = await db.query(
    'SELECT * FROM categorias WHERE nombre = $1 AND (user_id = $2 OR user_id IS NULL)',
    [nombre, req.userId]
  );
  
  if (existingCategory.rows.length > 0) {
    throw new BadRequestError('Ya existe una categoría con ese nombre');
  }
  
  // Insert into database
  const result = await db.query(
    `INSERT INTO categorias 
     (nombre, tipo, color, icono, descripcion, user_id) 
     VALUES ($1, $2, $3, $4, $5, $6) 
     RETURNING *`,
    [nombre, tipo, color || null, icono || null, descripcion || null, req.userId]
  );
  
  // Return success response
  return res.status(201).json(
    formatSuccess(
      result.rows[0],
      'Categoría creada correctamente'
    )
  );
}

/**
 * Handle GET request for a single category by ID
 * 
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 */
async function getCategoriaById(req, res) {
  const { id } = req.query;
  
  // Validate ID
  if (!id) {
    throw new BadRequestError('ID de categoría no proporcionado');
  }
  
  // Get category record
  const result = await db.query(
    'SELECT * FROM categorias WHERE id = $1 AND (user_id = $2 OR user_id IS NULL)',
    [id, req.userId]
  );
  
  // Check if record exists
  if (result.rows.length === 0) {
    throw new NotFoundError('Categoría no encontrada');
  }
  
  // Return record
  return res.status(200).json(
    formatSuccess(
      result.rows[0],
      'Categoría recuperada exitosamente'
    )
  );
}

/**
 * Handle PUT request to update a category
 * 
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 */
async function updateCategoria(req, res) {
  const { id } = req.query;
  const { nombre, tipo, color, icono, descripcion } = req.body;
  
  // Validate ID
  if (!id) {
    throw new BadRequestError('ID de categoría no proporcionado');
  }
  
  // First check if it's a system category (user_id is NULL)
  const categoryCheck = await db.query(
    'SELECT * FROM categorias WHERE id = $1',
    [id]
  );
  
  if (categoryCheck.rows.length === 0) {
    throw new NotFoundError('Categoría no encontrada');
  }
  
  // Don't allow editing system categories
  if (categoryCheck.rows[0].user_id === null) {
    throw new BadRequestError('No se pueden modificar las categorías del sistema');
  }
  
  // Also check if it belongs to the current user
  if (categoryCheck.rows[0].user_id !== req.userId) {
    throw new BadRequestError('No tienes permiso para editar esta categoría');
  }
  
  // Validate input
  const validation = validateCategory(req.body);
  if (!validation.isValid) {
    throw new ValidationError('Datos de categoría inválidos', validation.errors);
  }
  
  // Check for duplicate name
  if (nombre !== categoryCheck.rows[0].nombre) {
    const existingCategory = await db.query(
      'SELECT * FROM categorias WHERE nombre = $1 AND id != $2 AND (user_id = $3 OR user_id IS NULL)',
      [nombre, id, req.userId]
    );
    
    if (existingCategory.rows.length > 0) {
      throw new BadRequestError('Ya existe una categoría con ese nombre');
    }
  }
  
  // Update record
  const result = await db.query(
    `UPDATE categorias 
     SET nombre = $1, tipo = $2, color = $3, icono = $4, descripcion = $5, updated_at = NOW() 
     WHERE id = $6 AND user_id = $7
     RETURNING *`,
    [nombre, tipo, color || null, icono || null, descripcion || null, id, req.userId]
  );
  
  // Check if record was updated
  if (result.rows.length === 0) {
    throw new NotFoundError('Categoría no encontrada o no puede ser modificada');
  }
  
  // Return updated record
  return res.status(200).json(
    formatSuccess(
      result.rows[0],
      'Categoría actualizada correctamente'
    )
  );
}

/**
 * Handle DELETE request to remove a category
 * 
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 */
async function deleteCategoria(req, res) {
  const { id } = req.query;
  
  // Validate ID
  if (!id) {
    throw new BadRequestError('ID de categoría no proporcionado');
  }
  
  // First check if it's a system category (user_id is NULL)
  const categoryCheck = await db.query(
    'SELECT * FROM categorias WHERE id = $1',
    [id]
  );
  
  if (categoryCheck.rows.length === 0) {
    throw new NotFoundError('Categoría no encontrada');
  }
  
  // Don't allow deleting system categories
  if (categoryCheck.rows[0].user_id === null) {
    throw new BadRequestError('No se pueden eliminar las categorías del sistema');
  }
  
  // Also check if it belongs to the current user
  if (categoryCheck.rows[0].user_id !== req.userId) {
    throw new BadRequestError('No tienes permiso para eliminar esta categoría');
  }
  
  // Check if the category is in use
  const [ingresoUse, egresoUse] = await Promise.all([
    db.query('SELECT COUNT(*) FROM ingresos WHERE categoria = $1 AND user_id = $2', [id, req.userId]),
    db.query('SELECT COUNT(*) FROM egresos WHERE categoria = $1 AND user_id = $2', [id, req.userId])
  ]);
  
  const totalUse = parseInt(ingresoUse.rows[0].count) + parseInt(egresoUse.rows[0].count);
  
  if (totalUse > 0) {
    throw new BadRequestError(
      `No se puede eliminar esta categoría porque está en uso en ${totalUse} transacciones`
    );
  }
  
  // Delete record
  const result = await db.query(
    'DELETE FROM categorias WHERE id = $1 AND user_id = $2 RETURNING id',
    [id, req.userId]
  );
  
  // Return success response
  return res.status(200).json(
    formatSuccess(
      null,
      'Categoría eliminada correctamente'
    )
  );
}

// Register API routes with middleware
export default registerRoutes(
  {
    // List and create endpoints (collection)
    GET: getCategorias,
    POST: createCategoria,
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
 * API handler for individual category records by ID
 * Supports GET, PUT, DELETE operations on specific records
 * 
 * @type {function} 
 */
export const handleCategoriaById = registerRoutes(
  {
    GET: getCategoriaById,
    PUT: updateCategoria,
    DELETE: deleteCategoria,
  },
  {
    auth: true,
    rateLimit: {
      maxRequests: 100,
      windowMs: 60 * 1000 // 1 minute
    }
  }
);

/**
 * Default API handler for category collection
 * Supports GET (list) and POST (create) operations
 * 
 * @type {function}
 */

