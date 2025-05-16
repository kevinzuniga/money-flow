import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  RadialBarChart,
  RadialBar,
  ComposedChart,
  ReferenceLine,
  Sector
} from 'recharts';
import {
  Box,
  Heading,
  Text,
  SimpleGrid,
  Flex,
  Spinner,
  Select,
  HStack,
  useColorModeValue,
  Alert,
  AlertIcon,
  Button,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Stack,
  Divider,
  VStack,
  Badge,
  CircularProgress,
  CircularProgressLabel,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
} from '@chakra-ui/react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Monthly Income vs Expenses Bar Chart
 * @param {Object} props
 * @param {Array} props.data - Financial data array
 * @param {boolean} props.loading - Loading state
 * @param {string} props.error - Error message
 * @param {boolean} props.showBalance - Show balance line
 */
export function IncomeExpenseChart({ data, loading, error, showBalance = true }) {
  const bgColor = useColorModeValue('white', 'gray.700');
  
  // Format currency for tooltip
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(value);
  };
  
  if (loading) {
    return (
      <Box p={5} borderRadius="lg" boxShadow="md" bg={bgColor} height="300px">
        <Flex height="100%" align="center" justify="center">
          <Spinner size="xl" thickness="4px" speed="0.65s" color="teal.500" />
        </Flex>
      </Box>
    );
  }
  
  if (error) {
    return (
      <Box p={5} borderRadius="lg" boxShadow="md" bg={bgColor}>
        <Alert status="error" variant="left-accent">
          <AlertIcon />
          {error}
        </Alert>
      </Box>
    );
  }
  
  if (!data || data.length === 0) {
    return (
      <Box p={5} borderRadius="lg" boxShadow="md" bg={bgColor}>
        <Alert status="info" variant="left-accent">
          <AlertIcon />
          No hay datos disponibles para mostrar en el gráfico.
        </Alert>
      </Box>
    );
  }
  
  // Format data for chart
  const chartData = data.map(item => ({
    name: item.monthName || item.month + '/' + item.year,
    Ingresos: item.ingresos,
    Egresos: item.egresos,
    Balance: item.balance
  })).reverse(); // Reverse to show oldest first
  
  return (
    <Box p={5} borderRadius="lg" boxShadow="md" bg={bgColor}>
      <Heading size="md" mb={6}>Ingresos vs Egresos</Heading>
      <Box height="300px">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip 
              formatter={(value) => formatCurrency(value)}
              labelFormatter={(label) => `Período: ${label}`}
            />
            <Legend />
            <Bar dataKey="Ingresos" fill="#38A169" />
            <Bar dataKey="Egresos" fill="#E53E3E" />
            {showBalance && (
              <Line 
                type="monotone" 
                dataKey="Balance" 
                stroke="#3182CE" 
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            )}
            <ReferenceLine y={0} stroke="#718096" />
          </ComposedChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  );
}

/**
 * Balance Trend Line Chart
 * @param {Object} props
 * @param {Array} props.data - Financial data array
 * @param {boolean} props.loading - Loading state
 * @param {string} props.error - Error message
 */
export function BalanceTrendChart({ data, loading, error }) {
  const bgColor = useColorModeValue('white', 'gray.700');
  
  // Format currency for tooltip
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(value);
  };
  
  if (loading) {
    return (
      <Box p={5} borderRadius="lg" boxShadow="md" bg={bgColor} height="300px">
        <Flex height="100%" align="center" justify="center">
          <Spinner size="xl" thickness="4px" speed="0.65s" color="teal.500" />
        </Flex>
      </Box>
    );
  }
  
  if (error) {
    return (
      <Box p={5} borderRadius="lg" boxShadow="md" bg={bgColor}>
        <Alert status="error" variant="left-accent">
          <AlertIcon />
          {error}
        </Alert>
      </Box>
    );
  }
  
  if (!data || data.length === 0) {
    return (
      <Box p={5} borderRadius="lg" boxShadow="md" bg={bgColor}>
        <Alert status="info" variant="left-accent">
          <AlertIcon />
          No hay datos disponibles para mostrar en el gráfico.
        </Alert>
      </Box>
    );
  }
  
  // Format data for chart
  const chartData = data.map(item => ({
    name: item.monthName || item.month + '/' + item.year,
    Balance: item.balance,
    Positivo: item.balance > 0 ? item.balance : 0,
    Negativo: item.balance < 0 ? item.balance : 0
  })).reverse(); // Reverse to show oldest first
  
  return (
    <Box p={5} borderRadius="lg" boxShadow="md" bg={bgColor}>
      <Heading size="md" mb={6}>Tendencia de Balance</Heading>
      <Box height="300px">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip 
              formatter={(value) => formatCurrency(value)}
              labelFormatter={(label) => `Período: ${label}`}
            />
            <Legend />
            <defs>
              <linearGradient id="colorPositive" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#38A169" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#38A169" stopOpacity={0.1}/>
              </linearGradient>
              <linearGradient id="colorNegative" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#E53E3E" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#E53E3E" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <Area 
              type="monotone" 
              dataKey="Positivo" 
              stroke="#38A169" 
              fillOpacity={1} 
              fill="url(#colorPositive)"
            />
            <Area 
              type="monotone" 
              dataKey="Negativo" 
              stroke="#E53E3E" 
              fillOpacity={1} 
              fill="url(#colorNegative)"
            />
            <ReferenceLine y={0} stroke="#718096" />
          </AreaChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  );
}

/**
 * Expense Distribution Pie Chart
 * @param {Object} props
 * @param {Array} props.data - Expense data array by category
 * @param {boolean} props.loading - Loading state
 * @param {string} props.error - Error message
 */
export function ExpenseDistributionChart({ data, loading, error }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const bgColor = useColorModeValue('white', 'gray.700');
  
  // Chart colors
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#E53E3E', '#805AD5', '#D69E2E'];
  
  // Format currency
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(value);
  };
  
  // Format percentage
  const formatPercentage = (value, total) => {
    return ((value / total) * 100).toFixed(1) + '%';
  };
  
  // Handle mouse enter for active slice
  const onPieEnter = (_, index) => {
    setActiveIndex(index);
  };
  
  // Render active shape with additional details
  const renderActiveShape = (props) => {
    const {
      cx, cy, innerRadius, outerRadius, startAngle, endAngle,
      fill, payload, percent, value, total
    } = props;
    
    return (
      <g>
        <text x={cx} y={cy} dy={-20} textAnchor="middle" fill={fill}>
          {payload.name}
        </text>
        <text x={cx} y={cy} dy={10} textAnchor="middle" fill="#999">
          {formatCurrency(value)}
        </text>
        <text x={cx} y={cy} dy={30} textAnchor="middle" fill="#999">
          {(percent * 100).toFixed(1)}%
        </text>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 10}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
        <Sector
          cx={cx}
          cy={cy}
          startAngle={startAngle}
          endAngle={endAngle}
          innerRadius={outerRadius + 12}
          outerRadius={outerRadius + 16}
          fill={fill}
        />
      </g>
    );
  };
  
  if (loading) {
    return (
      <Box p={5} borderRadius="lg" boxShadow="md" bg={bgColor} height="350px">
        <Flex height="100%" align="center" justify="center">
          <Spinner size="xl" thickness="4px" speed="0.65s" color="teal.500" />
        </Flex>
      </Box>
    );
  }
  
  if (error) {
    return (
      <Box p={5} borderRadius="lg" boxShadow="md" bg={bgColor}>
        <Alert status="error" variant="left-accent">
          <AlertIcon />
          {error}
        </Alert>
      </Box>
    );
  }
  
  if (!data || data.length === 0) {
    return (
      <Box p={5} borderRadius="lg" boxShadow="md" bg={bgColor}>
        <Alert status="info" variant="left-accent">
          <AlertIcon />
          No hay datos de categorías de gastos disponibles.
        </Alert>
      </Box>
    );
  }
  
  // Calculate total for percentages
  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  return (
    <Box p={5} borderRadius="lg" boxShadow="md" bg={bgColor}>
      <Heading size="md" mb={6}>Distribución de Gastos</Heading>
      <Box height="350px">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              activeIndex={activeIndex}
              activeShape={renderActiveShape}
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
              onMouseEnter={onPieEnter}
              total={total}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => [formatCurrency(value), 'Monto']}
            />
          </PieChart>
        </ResponsiveContainer>
      </Box>
      
      {/* Legend */}
      <SimpleGrid columns={{ base: 2, md: 3 }} spacing={4} mt={4}>
        {data.map((item, index) => (
          <HStack key={index} spacing={2}>
            <Box width="12px" height="12px" borderRadius="sm" bg={COLORS[index % COLORS.length]} />
            <Text fontSize="sm">
              {item.name} ({formatPercentage(item.value, total)})
            </Text>
          </HStack>
        ))}
      </SimpleGrid>
    </Box>
  );
}

/**
 * Savings Rate Progress Indicator
 * @param {Object} props
 * @param {number} props.savingsRate - Savings rate as decimal (e.g., 0.25 for 25%)
 * @param {number} props.goal - Target savings rate as decimal
 * @param {boolean} props.loading - Loading state
 * @param {string} props.error - Error message
 * @param {Object} props.previousRate - Previous period savings rate for comparison
 */
export function SavingsRateProgress({ 
  savingsRate = 0, 
  goal = 0.2, 
  loading = false, 
  error = null,
  previousRate = null 
}) {
  const bgColor = useColorModeValue('white', 'gray.700');
  const textColor = useColorModeValue('gray.800', 'white');
  
  // Format percentage
  const formatPercentage = (value) => {
    return (value * 100).toFixed(1) + '%';
  };
  
  // Determine color based on savings rate
  const getColorScheme = (rate) => {
    if (rate >= goal) return 'green';
    if (rate >= goal * 0.75) return 'teal';
    if (rate >= goal * 0.5) return 'blue';
    if (rate >= goal * 0.25) return 'yellow';
    if (rate >= 0) return 'orange';
    return 'red';
  };
  
  // Determine progress status text
  const getStatusText = (rate) => {
    if (rate >= goal * 1.5) return 'Excelente';
    if (rate >= goal) return 'Meta alcanzada';
    if (rate >= goal * 0.75) return 'Muy bien';
    if (rate >= goal * 0.5) return 'Bien';
    if (rate >= goal * 0.25) return 'Regular';
    if (rate >= 0) return 'Necesita mejorar';
    return 'Déficit';
  };
  
  // Calculate trend with previous rate
  const getTrend = () => {
    if (previousRate === null || savingsRate === previousRate) return 'stable';
    return savingsRate > previousRate ? 'up' : 'down';
  };
  
  // Get trend text
  const getTrendText = () => {
    const trend = getTrend();
    if (trend === 'stable') return 'Estable';
    if (trend === 'up') return 'Mejorando';
    return 'Empeorando';
  };
  
  // Get trend color
  const getTrendColor = () => {
    const trend = getTrend();
    if (trend === 'stable') return 'gray.500';
    if (trend === 'up') return 'green.500';
    return 'red.500';
  };
  
  // Calculate progress for circular indicator
  const progressValue = Math.min(Math.max(savingsRate / goal, 0), 1) * 100;
  
  // Determine color scheme based on savings rate
  const colorScheme = getColorScheme(savingsRate);
  
  if (loading) {
    return (
      <Box p={5} borderRadius="lg" boxShadow="md" bg={bgColor} height="200px">
        <Flex height="100%" align="center" justify="center">
          <Spinner size="xl" thickness="4px" speed="0.65s" color="teal.500" />
        </Flex>
      </Box>
    );
  }
  
  if (error) {
    return (
      <Box p={5} borderRadius="lg" boxShadow="md" bg={bgColor}>
        <Alert status="error" variant="left-accent">
          <AlertIcon />
          {error}
        </Alert>
      </Box>
    );
  }
  
  return (
    <Box p={5} borderRadius="lg" boxShadow="md" bg={bgColor}>
      <Heading size="md" mb={6}>Tasa de Ahorro</Heading>
      
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
        {/* Circular Progress */}
        <Flex direction="column" align="center" justify="center">
          <CircularProgress 
            value={progressValue} 
            size="180px" 
            thickness="12px"
            color={`${colorScheme}.500`}
          >
            <CircularProgressLabel fontSize="xl" fontWeight="bold">
              {formatPercentage(savingsRate)}
            </CircularProgressLabel>
          </CircularProgress>
          
          <Text mt={4} fontWeight="medium" color={`${colorScheme}.500`}>
            {getStatusText(savingsRate)}
          </Text>
          
          {previousRate !== null && (
            <HStack mt={2} spacing={1}>
              <StatArrow type={getTrend() === 'up' ? 'increase' : getTrend() === 'down' ? 'decrease' : 'none'} />
              <Text fontSize="sm" color={getTrendColor()}>
                {getTrendText()}
              </Text>
              {getTrend() !== 'stable' && (
                <Text fontSize="sm" color={getTrendColor()}>
                  ({formatPercentage(Math.abs(savingsRate - previousRate))})
                </Text>
              )}
            </HStack>
          )}
        </Flex>
        
        {/* Goal and Status */}
        <VStack align="stretch" spacing={4} justify="center">
          <Box>
            <Text fontWeight="medium" mb={1}>Meta de ahorro</Text>
            <HStack>
              <Text fontSize="2xl" fontWeight="bold">{formatPercentage(goal)}</Text>
              <Text>de tus ingresos</Text>
            </HStack>
          </Box>
          
          <Box>
            <Text fontWeight="medium" mb={1}>Progreso hacia la meta</Text>
            <HStack>
              <Text 
                fontSize="lg" 
                fontWeight="bold" 
                color={savingsRate >= goal ? 'green.500' : 'orange.500'}
              >
                {Math.min(Math.round(savingsRate / goal * 100), 100)}%
              </Text>
              <Text>completado</Text>
            </HStack>
          </Box>
          
          {savingsRate >= 0 ? (
            <Text color="green.500" fontWeight="medium">
              Estás ahorrando {formatPercentage(savingsRate)} de tus ingresos
            </Text>
          ) : (
            <Text color="red.500" fontWeight="medium">
              Estás gastando {formatPercentage(Math.abs(savingsRate))} más que tus ingresos
            </Text>
          )}
          
          <Text fontSize="sm" color="gray.500" mt={2}>
            Se recomienda ahorrar entre un 20% y 30% de tus ingresos mensuales.
          </Text>
        </VStack>
      </SimpleGrid>
    </Box>
  );
}

/**
 * Year-over-Year Comparison Chart
 * @param {Object} props
 * @param {Array} props.currentYearData - Current year financial data
 * @param {Array} props.previousYearData - Previous year financial data
 * @param {string} props.metric - Metric to compare ('ingresos', 'egresos', or 'balance')
 * @param {boolean} props.loading - Loading state
 * @param {string} props.error - Error message
 */
export function YearOverYearChart({ 
  currentYearData = [], 
  previousYearData = [], 
  metric = 'balance',
  loading = false, 
  error = null 
}) {
  const [selectedMetric, setSelectedMetric] = useState(metric);
  const bgColor = useColorModeValue('white', 'gray.700');
  
  // Map metric to display name
  const metricLabels = {
    ingresos: 'Ingresos',
    egresos: 'Egresos',
    balance: 'Balance Neto'
  };
  
  // Format currency for tooltip
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(value);
  };
  
  // Format percentage for tooltip
  const formatPercentage = (value) => {
    return value.toFixed(1) + '%';
  };
  
  // Handle metric change
  const handleMetricChange = (event) => {
    setSelectedMetric(event.target.value);
  };
  
  if (loading) {
    return (
      <Box p={5} borderRadius="lg" boxShadow="md" bg={bgColor} height="400px">
        <Flex height="100%" align="center" justify="center">
          <Spinner size="xl" thickness="4px" speed="0.65s" color="teal.500" />
        </Flex>
      </Box>
    );
  }
  
  if (error) {
    return (
      <Box p={5} borderRadius="lg" boxShadow="md" bg={bgColor}>
        <Alert status="error" variant="left-accent">
          <AlertIcon />
          {error}
        </Alert>
      </Box>
    );
  }
  
  if (!currentYearData || currentYearData.length === 0) {
    return (
      <Box p={5} borderRadius="lg" boxShadow="md" bg={bgColor}>
        <Alert status="info" variant="left-accent">
          <AlertIcon />
          No hay datos disponibles para el año actual.
        </Alert>
      </Box>
    );
  }
  
  // Month names in Spanish
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  
  // Create a structured dataset with both years
  const chartData = Array.from({ length: 12 }, (_, index) => {
    // Find month data in current year
    const currentYearMonth = currentYearData.find(item => item.month === index + 1) || {
      [selectedMetric]: 0
    };
    
    // Find month data in previous year
    const previousYearMonth = previousYearData.find(item => item.month === index + 1) || {
      [selectedMetric]: 0
    };
    
    // Calculate percentage change
    const currentValue = currentYearMonth[selectedMetric] || 0;
    const previousValue = previousYearMonth[selectedMetric] || 0;
    
    let percentChange = 0;
    if (previousValue !== 0) {
      percentChange = ((currentValue - previousValue) / Math.abs(previousValue)) * 100;
    } else if (currentValue !== 0) {
      percentChange = 100; // If previous was 0 and current is not, that's a 100% increase
    }
    
    return {
      name: monthNames[index],
      month: index + 1,
      [`${currentYearData[0]?.year || new Date().getFullYear()}`]: currentValue,
      [`${previousYearData[0]?.year || new Date().getFullYear() - 1}`]: previousValue,
      percentChange
    };
  });
  
  // Determine chart colors based on metric
  let currentYearColor, previousYearColor;
  
  switch (selectedMetric) {
    case 'ingresos':
      currentYearColor = '#38A169'; // green
      previousYearColor = '#9AE6B4'; // light green
      break;
    case 'egresos':
      currentYearColor = '#E53E3E'; // red
      previousYearColor = '#FC8181'; // light red
      break;
    case 'balance':
    default:
      currentYearColor = '#3182CE'; // blue
      previousYearColor = '#90CDF4'; // light blue
      break;
  }
  
  const currentYear = currentYearData[0]?.year || new Date().getFullYear();
  const previousYear = previousYearData[0]?.year || currentYear - 1;
  
  return (
    <Box p={5} borderRadius="lg" boxShadow="md" bg={bgColor}>
      <Flex justify="space-between" align="center" mb={6}>
        <Heading size="md">Comparativa Anual: {metricLabels[selectedMetric]}</Heading>
        <Select 
          value={selectedMetric} 
          onChange={handleMetricChange} 
          maxW="200px"
          size="sm"
        >
          <option value="ingresos">Ingresos</option>
          <option value="egresos">Egresos</option>
          <option value="balance">Balance</option>
        </Select>
      </Flex>
      
      <Box height="400px">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 10,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => `${value}%`} />
            <Tooltip 
              formatter={(value, name) => {
                if (name === 'percentChange') {
                  return [`${value > 0 ? '+' : ''}${formatPercentage(value)}`, 'Cambio %'];
                }
                return [formatCurrency(value), `${name}`];
              }}
              labelFormatter={(label) => `Mes: ${label}`}
            />
            <Legend />
            <Bar 
              yAxisId="left" 
              dataKey={`${currentYear}`} 
              fill={currentYearColor} 
              name={`${currentYear}`} 
            />
            <Bar 
              yAxisId="left" 
              dataKey={`${previousYear}`} 
              fill={previousYearColor} 
              name={`${previousYear}`} 
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="percentChange"
              stroke="#8884d8"
              strokeWidth={2}
              name="Cambio %"
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
            <ReferenceLine y={0} yAxisId="right" stroke="#666" />
          </ComposedChart>
        </ResponsiveContainer>
      </Box>
      
      {/* Month-by-month comparison */}
      <Heading size="sm" mt={8} mb={4}>Detalle Mensual</Heading>
      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
        {chartData.map((month, index) => {
          const currentValue = month[`${currentYear}`];
          const previousValue = month[`${previousYear}`];
          const change = month.percentChange;
          const isPositive = change > 0;
          const isZero = change === 0;
          
          return (
            <Box 
              key={index}
              p={3}
              borderWidth="1px"
              borderRadius="md"
              borderColor={borderColor => useColorModeValue('gray.200', 'gray.600')}
            >
              <Text fontWeight="bold">{month.name}</Text>
              <HStack justify="space-between" mt={2}>
                <Text fontSize="sm">{currentYear}:</Text>
                <Text fontSize="sm" fontWeight="medium">{formatCurrency(currentValue)}</Text>
              </HStack>
              <HStack justify="space-between">
                <Text fontSize="sm">{previousYear}:</Text>
                <Text fontSize="sm" fontWeight="medium">{formatCurrency(previousValue)}</Text>
              </HStack>
              <HStack justify="space-between" mt={2}>
                <Text fontSize="sm">Cambio:</Text>
                <HStack>
                  <StatArrow type={isPositive ? 'increase' : isZero ? 'none' : 'decrease'} />
                  <Text 
                    fontSize="sm" 
                    fontWeight="bold"
                    color={isPositive 
                      ? (selectedMetric === 'egresos' ? 'red.500' : 'green.500') 
                      : isZero 
                        ? 'gray.500' 
                        : (selectedMetric === 'egresos' ? 'green.500' : 'red.500')
                    }
                  >
                    {isZero ? '0%' : `${change > 0 ? '+' : ''}${formatPercentage(change)}`}
                  </Text>
                </HStack>
              </HStack>
            </Box>
          );
        })}
      </SimpleGrid>
    </Box>
  );
}
