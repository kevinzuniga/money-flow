/**
 * API Route for individual category management by ID
 * 
 * This route handles GET, PUT, and DELETE operations for single category records
 * identified by their unique ID.
 */

import { handleCategoriaById } from '../categorias';

/**
 * Next.js API Route handler for individual category records
 * 
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 * @returns {Promise<void>}
 */
export default async function handler(req, res) {
  // Call the pre-configured handler from the main categorias.js file
  return handleCategoriaById(req, res);
}

