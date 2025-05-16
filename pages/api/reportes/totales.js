import db from '../../../lib/db';
import { authenticate } from '../../../lib/auth';
import { handleApiError } from '../../../lib/errorHandler';

/**
 * API handler for fetching summary statistics
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 */
export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      message: 'Method not allowed' 
    });
  }
  
  // Authenticate user
  const userId = await authenticate(req, res);
  if (!userId) {
    return; // Response already sent in authenticate function
  }

  try {
    // Parse query parameters
    const { 
      groupBy = 'month', // 'month' or 'year'
      year = new Date().getFullYear(), 
      startDate,
      endDate,
      limit = 12 // Default to last 12 months/years
    } = req.query;
    
    // Validate groupBy parameter
    if (groupBy !== 'month' && groupBy !== 'year') {
      return res.status(400).json({
        success: false,
        message: 'El parámetro groupBy debe ser "month" o "year"'
      });
    }
    
    // Get summary data based on grouping
    if (groupBy === 'month') {
      await getMonthlyTotals(req, res, userId);
    } else {
      await getYearlyTotals(req, res, userId);
    }
  } catch (error) {
    handleApiError(error, res, 'Error al generar las estadísticas');
  }
}

/**
 * Get monthly totals for income and expenses
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 * @param {number} userId - The authenticated user ID
 */
async function getMonthlyTotals(req, res, userId) {
  // Parse query parameters
  const { 
    year = new Date().getFullYear(),
    startDate,
    endDate,
    limit = 12
  } = req.query;
  
  // Validate parameters
  const yearNum = parseInt(year);
  const limitNum = parseInt(limit);
  
  if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
    return res.status(400).json({
      success: false,
      message: 'Año inválido. Debe ser un número entre 2000 y 2100.'
    });
  }
  
  if (isNaN(limitNum) || limitNum < 1 || limitNum > 36) { // Max 3 years worth of months
    return res.status(400).json({
      success: false,
      message: 'Límite inválido. Debe ser un número entre 1 y 36.'
    });
  }
  
  try {
    // Base query for fetching monthly data
    const query = `
      WITH monthly_data AS (
        -- Ingresos por mes
        SELECT 
          EXTRACT(MONTH FROM fecha)::INTEGER AS month,
          EXTRACT(YEAR FROM fecha)::INTEGER AS year,
          SUM(monto) AS total_ingresos,
          0 AS total_egresos
        FROM ingresos
        WHERE 
          user_id = $1
          ${startDate ? 'AND fecha >= $3' : ''}
          ${endDate ? `AND fecha <= ${startDate ? '$4' : '$3'}` : ''}
          ${!startDate && !endDate ? 'AND EXTRACT(YEAR FROM fecha) = $2' : ''}
        GROUP BY 
          EXTRACT(MONTH FROM fecha),
          EXTRACT(YEAR FROM fecha)
          
        UNION ALL
        
        -- Egresos por mes
        SELECT 
          EXTRACT(MONTH FROM fecha)::INTEGER AS month,
          EXTRACT(YEAR FROM fecha)::INTEGER AS year,
          0 AS total_ingresos,
          SUM(monto) AS total_egresos
        FROM egresos
        WHERE 
          user_id = $1
          ${startDate ? 'AND fecha >= $3' : ''}
          ${endDate ? `AND fecha <= ${startDate ? '$4' : '$3'}` : ''}
          ${!startDate && !endDate ? 'AND EXTRACT(YEAR FROM fecha) = $2' : ''}
        GROUP BY 
          EXTRACT(MONTH FROM fecha),
          EXTRACT(YEAR FROM fecha)
      )
      
      SELECT 
        month,
        year,
        SUM(total_ingresos) AS ingresos,
        SUM(total_egresos) AS egresos,
        SUM(total_ingresos - total_egresos) AS balance
      FROM monthly_data
      GROUP BY month, year
      ORDER BY year DESC, month DESC
      LIMIT $${startDate && endDate ? '5' : startDate || endDate ? '4' : '3'}
    `;
    
    // Prepare query parameters
    let queryParams = [userId];
    
    if (!startDate && !endDate) {
      queryParams.push(yearNum);
    }
    
    if (startDate) {
      queryParams.push(startDate);
    }
    
    if (endDate) {
      queryParams.push(endDate);
    }
    
    queryParams.push(limitNum);
    
    // Execute query
    const result = await db.query(query, queryParams);
    
    // Process results
    const monthlyData = result.rows.map(row => ({
      month: parseInt(row.month),
      year: parseInt(row.year),
      ingresos: parseFloat(row.ingresos) || 0,
      egresos: parseFloat(row.egresos) || 0,
      balance: parseFloat(row.balance) || 0
    }));
    
    // Add month names
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    
    const formattedData = monthlyData.map(item => ({
      ...item,
      monthName: monthNames[item.month - 1]
    }));
    
    // Calculate total statistics
    const totals = {
      ingresos: formattedData.reduce((sum, month) => sum + month.ingresos, 0),
      egresos: formattedData.reduce((sum, month) => sum + month.egresos, 0),
      balance: formattedData.reduce((sum, month) => sum + month.balance, 0)
    };
    
    // Calculate averages
    const numMonths = formattedData.length || 1; // Avoid division by zero
    const averages = {
      ingresos: totals.ingresos / numMonths,
      egresos: totals.egresos / numMonths,
      balance: totals.balance / numMonths
    };
    
    // Identify trends
    const trends = {
      highestIncome: [...formattedData].sort((a, b) => b.ingresos - a.ingresos)[0] || null,
      highestExpense: [...formattedData].sort((a, b) => b.egresos - a.egresos)[0] || null,
      bestBalance: [...formattedData].sort((a, b) => b.balance - a.balance)[0] || null,
      worstBalance: [...formattedData].sort((a, b) => a.balance - b.balance)[0] || null,
      trend: formattedData.length > 1 ? 
        (formattedData[0].balance > formattedData[1].balance ? 'up' : 
         formattedData[0].balance < formattedData[1].balance ? 'down' : 'stable') : 'unknown'
    };
    
    // Return final response
    res.status(200).json({
      success: true,
      data: {
        periodType: 'monthly',
        year: yearNum,
        items: formattedData,
        totals,
        averages,
        trends
      }
    });
  } catch (error) {
    handleApiError(error, res, 'Error al obtener los totales mensuales');
  }
}

/**
 * Get yearly totals for income and expenses
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 * @param {number} userId - The authenticated user ID
 */
async function getYearlyTotals(req, res, userId) {
  // Parse query parameters
  const { 
    startYear = new Date().getFullYear() - 3, // Default to last 3 years
    endYear = new Date().getFullYear(),
    limit = 5 // Default to last 5 years
  } = req.query;
  
  // Validate parameters
  const startYearNum = parseInt(startYear);
  const endYearNum = parseInt(endYear);
  const limitNum = parseInt(limit);
  
  if (isNaN(startYearNum) || isNaN(endYearNum) || 
      startYearNum < 2000 || startYearNum > 2100 ||
      endYearNum < 2000 || endYearNum > 2100) {
    return res.status(400).json({
      success: false,
      message: 'Años inválidos. Deben ser números entre 2000 y 2100.'
    });
  }
  
  if (isNaN(limitNum) || limitNum < 1 || limitNum > 10) { // Max 10 years
    return res.status(400).json({
      success: false,
      message: 'Límite inválido. Debe ser un número entre 1 y 10.'
    });
  }
  
  try {
    // Query for fetching yearly data
    const query = `
      WITH yearly_data AS (
        -- Ingresos por año
        SELECT 
          EXTRACT(YEAR FROM fecha)::INTEGER AS year,
          SUM(monto) AS total_ingresos,
          0 AS total_egresos
        FROM ingresos
        WHERE 
          user_id = $1 AND
          EXTRACT(YEAR FROM fecha) BETWEEN $2 AND $3
        GROUP BY 
          EXTRACT(YEAR FROM fecha)
          
        UNION ALL
        
        -- Egresos por año
        SELECT 
          EXTRACT(YEAR FROM fecha)::INTEGER AS year,
          0 AS total_ingresos,
          SUM(monto) AS total_egresos
        FROM egresos
        WHERE 
          user_id = $1 AND
          EXTRACT(YEAR FROM fecha) BETWEEN $2 AND $3
        GROUP BY 
          EXTRACT(YEAR FROM fecha)
      )
      
      SELECT 
        year,
        SUM(total_ingresos) AS ingresos,
        SUM(total_egresos) AS egresos,
        SUM(total_ingresos - total_egresos) AS balance
      FROM yearly_data
      GROUP BY year
      ORDER BY year DESC
      LIMIT $4
    `;
    
    // Execute query
    const result = await db.query(query, [userId, startYearNum, endYearNum, limitNum]);
    
    // Process results
    const yearlyData = result.rows.map(row => ({
      year: parseInt(row.year),
      ingresos: parseFloat(row.ingresos) || 0,
      egresos: parseFloat(row.egresos) || 0,
      balance: parseFloat(row.balance) || 0
    }));
    
    // Calculate total statistics
    const totals = {
      ingresos: yearlyData.reduce((sum, year) => sum + year.ingresos, 0),
      egresos: yearlyData.reduce((sum, year) => sum + year.egresos, 0),
      balance: yearlyData.reduce((sum, year) => sum + year.balance, 0)
    };
    
    // Calculate averages
    const numYears = yearlyData.length || 1; // Avoid division by zero
    const averages = {
      ingresos: totals.ingresos / numYears,
      egresos: totals.egresos / numYears,
      balance: totals.balance / numYears
    };
    
    // Identify trends
    const trends = {
      bestYear: [...yearlyData].sort((a, b) => b.balance - a.balance)[0] || null,
      worstYear: [...yearlyData].sort((a, b) => a.balance - b.balance)[0] || null,
      highestIncomeYear: [...yearlyData].sort((a, b) => b.ingresos - a.ingresos)[0] || null,
      highestExpenseYear: [...yearlyData].sort((a, b) => b.egresos - a.egresos)[0] || null,
      trend: yearlyData.length > 1 ? 
        (yearlyData[0].balance > yearlyData[1].balance ? 'up' : 
         yearlyData[0].balance < yearlyData[1].balance ? 'down' : 'stable') : 'unknown'
    };
    
    // Return final response
    res.status(200).json({
      success: true,
      data: {
        periodType: 'yearly',
        items: yearlyData,
        totals,
        averages,
        trends
      }
    });
  } catch (error) {
    handleApiError(error, res, 'Error al obtener los totales anuales');
  }
}

