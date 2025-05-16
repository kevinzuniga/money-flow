/**
 * API Route for individual income management by ID
 * 
 * This route handles GET, PUT, and DELETE operations for single income records
 * identified by their unique ID.
 */

import { handleIngresoById } from '../ingresos';

/**
 * Next.js API Route handler for individual income records
 * 
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 * @returns {Promise<void>}
 */
export default async function handler(req, res) {
  // Call the pre-configured handler from the main ingresos.js file
  return handleIngresoById(req, res);
}

