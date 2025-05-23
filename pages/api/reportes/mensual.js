import db from '../../../lib/db';
import { authenticate } from '../../../lib/auth';

/**
 * API handler for monthly financial reports
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
    // Get query parameters for year selection
    const { year } = req.query;
    const selectedYear = year ? parseInt(year) : new Date().getFullYear();
    
    // Validate year parameter
    if (isNaN(selectedYear) || selectedYear < 2000 || selectedYear > 2100) {
      return res.status(400).json({
        success: false,
        message: 'Año inválido. Debe ser un número entre 2000 y 2100.'
      });
    }
    
    // Query to get monthly aggregated data
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
          user_id = $1 AND
          EXTRACT(YEAR FROM fecha) = $2
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
          user_id = $1 AND
          EXTRACT(YEAR FROM fecha) = $2
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
      ORDER BY year, month
    `;
    
    const result = await db.query(query, [userId, selectedYear]);
    
    // Format the response to include all months (even empty ones)
    const monthlyData = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      year: selectedYear,
      ingresos: 0,
      egresos: 0,
      balance: 0
    }));
    
    // Fill in actual data
    result.rows.forEach(row => {
      const monthIndex = parseInt(row.month) - 1;
      monthlyData[monthIndex] = {
        month: parseInt(row.month),
        year: parseInt(row.year),
        ingresos: parseFloat(row.ingresos) || 0,
        egresos: parseFloat(row.egresos) || 0,
        balance: parseFloat(row.balance) || 0
      };
    });
    
    // Calculate yearly totals
    const totals = {
      ingresos: monthlyData.reduce((sum, month) => sum + month.ingresos, 0),
      egresos: monthlyData.reduce((sum, month) => sum + month.egresos, 0),
      balance: monthlyData.reduce((sum, month) => sum + month.balance, 0)
    };
    
    // Add month names for display
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    
    const formattedData = monthlyData.map((item, index) => ({
      ...item,
      monthName: monthNames[index]
    }));
    
    // Calculate average monthly income and expenses
    const averages = {
      ingresos: totals.ingresos / 12,
      egresos: totals.egresos / 12,
      balance: totals.balance / 12
    };
    
    // Get highest and lowest months
    const highestIncome = [...formattedData].sort((a, b) => b.ingresos - a.ingresos)[0];
    const highestExpense = [...formattedData].sort((a, b) => b.egresos - a.egresos)[0];
    const bestBalance = [...formattedData].sort((a, b) => b.balance - a.balance)[0];
    const worstBalance = [...formattedData].sort((a, b) => a.balance - b.balance)[0];
    
    // Return comprehensive report
    res.status(200).json({
      success: true,
      data: {
        year: selectedYear,
        monthlyData: formattedData,
        totals,
        averages,
        insights: {
          highestIncome: {
            month: highestIncome.month,
            monthName: highestIncome.monthName,
            amount: highestIncome.ingresos
          },
          highestExpense: {
            month: highestExpense.month,
            monthName: highestExpense.monthName,
            amount: highestExpense.egresos
          },
          bestBalance: {
            month: bestBalance.month,
            monthName: bestBalance.monthName,
            amount: bestBalance.balance
          },
          worstBalance: {
            month: worstBalance.month,
            monthName: worstBalance.monthName,
            amount: worstBalance.balance
          }
        }
      }
    });
  } catch (error) {
    console.error('Error generating monthly report:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al generar el reporte mensual',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
