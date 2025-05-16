/**
 * API Route for individual expense management by ID
 * 
 * This route handles GET, PUT, and DELETE operations for single expense records
 * identified by their unique ID.
 */

import { handleEgresoById } from '../egresos';

/**
 * Next.js API Route handler for individual expense records
 * 
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 * @returns {Promise<void>}
 */
export default async function handler(req, res) {
  // Call the pre-configured handler from the main egresos.js file
  return handleEgresoById(req, res);
}

