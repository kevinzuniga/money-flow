import { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Text,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  SimpleGrid,
  VStack,
  HStack,
  Select,
  Spinner,
  Alert,
  AlertIcon,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Badge,
  useColorModeValue,
  Button,
  Flex,
  Divider,
} from '@chakra-ui/react';
import axios from 'axios';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowUpIcon, ArrowDownIcon, RepeatIcon } from '@chakra-ui/icons';

/**
 * Component to display financial summary statistics
 * @param {Object} props - Component props
 * @param {string} props.period - Period type ('month' or 'year')
 * @param {number} props.year - Year for filtering data
 * @param {string} props.startDate - Start date for filtering (optional)
 * @param {string} props.endDate - End date for filtering (optional)
 * @param {Function} props.onPeriodChange - Handler for period type change
 */
export default function FinancialSummary({ 
  period = 'month',
  year = new Date().getFullYear(),
  startDate = null,
  endDate = null,
  onPeriodChange = null,
}) {
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tabIndex, setTabIndex] = useState(period === 'month' ? 0 : 1);
  
  const bgColor = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  
  useEffect(() => {
    fetchSummaryData(period);
  }, [period, year, startDate, endDate]);
  
  // Update tab index when period changes
  useEffect(() => {
    setTabIndex(period === 'month' ? 0 : 1);
  }, [period]);
  
  // Fetch financial summary data
  const fetchSummaryData = async (periodType) => {
    setLoading(true);
    setError(null);
    
    try {
      // Prepare query parameters
      const params = new URLSearchParams({
        groupBy: periodType,
        year: year,
      });
      
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      // Make API request
      const { data } = await axios.get(`/api/reportes/totales?${params.toString()}`);
      
      if (data.success) {
        setSummaryData(data.data);
      } else {
        setError('Error al cargar los datos financieros');
      }
    } catch (err) {
      console.error('Error fetching financial summary:', err);
      setError('Error al cargar los datos financieros. Por favor intente de nuevo.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle period type change
  const handleTabChange = (index) => {
    setTabIndex(index);
    const newPeriod = index === 0 ? 'month' : 'year';
    
    if (onPeriodChange) {
      onPeriodChange(newPeriod);
    } else {
      fetchSummaryData(newPeriod);
    }
  };
  
  // Format currency values
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
    }).format(amount);
  };
  
  // Format percentage values
  const formatPercentage = (value) => {
    return `${(value * 100).toFixed(1)}%`;
  };
  
  // Calculate saving or spending rate
  const calculateRate = (data) => {
    if (!data || !data.totals) return 0;
    
    const { ingresos, balance } = data.totals;
    return ingresos > 0 ? balance / ingresos : 0;
  };
  
  if (loading) {
    return (
      <Box textAlign="center" py={10}>
        <Spinner size="xl" thickness="4px" speed="0.65s" color="teal.500" />
        <Text mt={4}>Cargando información financiera...</Text>
      </Box>
    );
  }
  
  if (error) {
    return (
      <Alert status="error" variant="subtle" borderRadius="md" mb={6}>
        <AlertIcon />
        {error}
      </Alert>
    );
  }
  
  if (!summaryData) {
    return (
      <Alert status="info" variant="subtle" borderRadius="md" mb={6}>
        <AlertIcon />
        No hay datos financieros disponibles para el período seleccionado.
      </Alert>
    );
  }
  
  // Get trend data
  const trendType = summaryData.trends?.trend || 'unknown';
  const trendColor = trendType === 'up' ? 'green.500' : trendType === 'down' ? 'red.500' : 'gray.500';
  const trendIcon = trendType === 'up' ? <ArrowUpIcon /> : trendType === 'down' ? <ArrowDownIcon /> : null;
  
  // Calculate savings rate
  const savingsRate = calculateRate(summaryData);
  const isPositiveSavings = savingsRate >= 0;
  
  return (
    <Box>
      <Tabs index={tabIndex} onChange={handleTabChange} colorScheme="teal" variant="enclosed" mb={6}>
        <TabList>
          <Tab>Vista Mensual</Tab>
          <Tab>Vista Anual</Tab>
        </TabList>
        
        <TabPanels>
          {/* Monthly View */}
          <TabPanel p={0} pt={4}>
            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={5} mb={8}>
              {/* Income Stat */}
              <Stat p={5} borderRadius="lg" boxShadow="md" bg={bgColor}>
                <StatLabel fontSize="sm">Ingresos Totales</StatLabel>
                <StatNumber fontSize="2xl" color="green.500">
                  {formatCurrency(summaryData.totals.ingresos)}
                </StatNumber>
                <StatHelpText>
                  Promedio: {formatCurrency(summaryData.averages.ingresos)}/mes
                </StatHelpText>
              </Stat>
              
              {/* Expenses Stat */}
              <Stat p={5} borderRadius="lg" boxShadow="md" bg={bgColor}>
                <StatLabel fontSize="sm">Egresos Totales</StatLabel>
                <StatNumber fontSize="2xl" color="red.500">
                  {formatCurrency(summaryData.totals.egresos)}
                </StatNumber>
                <StatHelpText>
                  Promedio: {formatCurrency(summaryData.averages.egresos)}/mes
                </StatHelpText>
              </Stat>
              
              {/* Balance Stat */}
              <Stat p={5} borderRadius="lg" boxShadow="md" bg={bgColor}>
                <StatLabel fontSize="sm">Balance Neto</StatLabel>
                <StatNumber fontSize="2xl" color={summaryData.totals.balance >= 0 ? "teal.500" : "red.500"}>
                  {formatCurrency(summaryData.totals.balance)}
                </StatNumber>
                <StatHelpText>
                  <StatArrow type={summaryData.totals.balance >= 0 ? 'increase' : 'decrease'} />
                  {isPositiveSavings ? 'Ahorro' : 'Déficit'}: {formatPercentage(Math.abs(savingsRate))}
                </StatHelpText>
              </Stat>
            </SimpleGrid>
            
            {/* Trends and Highlights */}
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={5} mb={8}>
              {/* Best & Worst Months */}
              <Box p={5} borderRadius="lg" boxShadow="md" bg={bgColor}>
                <Heading size="sm" mb={4}>Meses Destacados</Heading>
                
                <VStack align="stretch" spacing={4}>
                  {summaryData.trends.highestIncome && (
                    <Box>
                      <HStack>
                        <Badge colorScheme="green" py={1} px={2} borderRadius="md">Mayor Ingreso</Badge>
                        <Text fontWeight="medium">
                          {summaryData.trends.highestIncome.monthName} {summaryData.trends.highestIncome.year}
                        </Text>
                      </HStack>
                      <Text fontWeight="bold" color="green.500">
                        {formatCurrency(summaryData.trends.highestIncome.ingresos)}
                      </Text>
                    </Box>
                  )}
                  
                  {summaryData.trends.highestExpense && (
                    <Box>
                      <HStack>
                        <Badge colorScheme="red" py={1} px={2} borderRadius="md">Mayor Egreso</Badge>
                        <Text fontWeight="medium">
                          {summaryData.trends.highestExpense.monthName} {summaryData.trends.highestExpense.year}
                        </Text>
                      </HStack>
                      <Text fontWeight="bold" color="red.500">
                        {formatCurrency(summaryData.trends.highestExpense.egresos)}
                      </Text>
                    </Box>
                  )}
                  
                  <Divider />
                  
                  {summaryData.trends.bestBalance && (
                    <Box>
                      <HStack>
                        <Badge colorScheme="teal" py={1} px={2} borderRadius="md">Mejor Balance</Badge>
                        <Text fontWeight="medium">
                          {summaryData.trends.bestBalance.monthName} {summaryData.trends.bestBalance.year}
                        </Text>
                      </HStack>
                      <Text fontWeight="bold" color="teal.500">
                        {formatCurrency(summaryData.trends.bestBalance.balance)}
                      </Text>
                    </Box>
                  )}
                  
                  {summaryData.trends.worstBalance && (
                    <Box>
                      <HStack>
                        <Badge colorScheme="orange" py={1} px={2} borderRadius="md">Peor Balance</Badge>
                        <Text fontWeight="medium">
                          {summaryData.trends.worstBalance.monthName} {summaryData.trends.worstBalance.year}
                        </Text>
                      </HStack>
                      <Text fontWeight="bold" color="orange.500">
                        {formatCurrency(summaryData.trends.worstBalance.balance)}
                      </Text>
                    </Box>
                  )}
                </VStack>
              </Box>
              
              {/* Trend Analysis */}
              <Box p={5} borderRadius="lg" boxShadow="md" bg={bgColor}>
                <Heading size="sm" mb={4}>Análisis de Tendencias</Heading>
                
                <VStack align="stretch" spacing={4}>
                  <HStack>
                    <Text>Tendencia general:</Text>
                    <Text color={trendColor} fontWeight="bold">
                      {trendIcon}
                      {trendType === 'up' ? 'Mejorando' : 
                       trendType === 'down' ? 'Empeorando' : 
                       trendType === 'stable' ? 'Estable' : 'Sin datos suficientes'}
                    </Text>
                  </HStack>
                  
                  <Box>
                    <Text fontWeight="medium">Tasa de Ahorro</Text>
                    <HStack>
                      <Stat>
                        <StatLabel fontSize="sm">Tasa Actual</StatLabel>
                        <StatNumber fontSize="xl" color={isPositiveSavings ? "green.500" : "red.500"}>
                          {formatPercentage(Math.abs(savingsRate))}
                        </StatNumber>
                        <StatHelpText>
                          de tus ingresos son {isPositiveSavings ? 'ahorrados' : 'gastados en exceso'}
                        </StatHelpText>
                      </Stat>
                    </HStack>
                  </Box>
                  
                  <Box>
                    <Text fontWeight="medium">Proporción Ingresos/Egresos</Text>
                    <Text>
                      Por cada $1 que ingresa, gastas $
                      {summaryData.totals.ingresos > 0 
                        ? (summaryData.totals.egresos / summaryData.totals.ingresos).toFixed(2) 
                        : '0.00'}
                    </Text>
                  </Box>
                </VStack>
              </Box>
            </SimpleGrid>
          </TabPanel>
          
          {/* Yearly View */}
          <TabPanel p={0} pt={4}>
            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={5} mb={8}>
              {/* Annual Income Stat */}
              <Stat p={5} borderRadius="lg" boxShadow="md" bg={bgColor}>
                <StatLabel fontSize="sm">Ingresos Anuales</StatLabel>
                <StatNumber fontSize="2xl" color="green.500">
                  {formatCurrency(summaryData.totals.ingresos)}
                </StatNumber>
                <StatHelpText>
                  Promedio: {formatCurrency(summaryData.averages.ingresos)}/año
                </StatHelpText>
              </Stat>
              
              {/* Annual Expenses Stat */}
              <Stat p={5} borderRadius="lg" boxShadow="md" bg={bgColor}>
                <StatLabel fontSize="sm">Egresos Anuales</StatLabel>
                <StatNumber fontSize="2xl" color="red.500">
                  {formatCurrency(summaryData.totals.egresos)}
                </StatNumber>
                <StatHelpText>
                  Promedio: {formatCurrency(summaryData.averages.egresos)}/año
                </StatHelpText>
              </Stat>
              
              {/* Annual Balance Stat */}
              <Stat p={5} borderRadius="lg" boxShadow="md" bg={bgColor}>
                <StatLabel fontSize="sm">Balance Anual</StatLabel>
                <StatNumber fontSize="2xl" color={summaryData.totals.balance >= 0 ? "teal.500" : "red.500"}>
                  {formatCurrency(summaryData.totals.balance)}
                </StatNumber>
                <StatHelpText>
                  <StatArrow type={summaryData.totals.balance >= 0 ? 'increase' : 'decrease'} />
                  {isPositiveSavings ? 'Ahorro' : 'Déficit'}: {formatPercentage(Math.abs(savingsRate))}
                </StatHelpText>
              </Stat>
            </SimpleGrid>
            
            {/* Yearly Trends and Highlights */}
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={5} mb={8}>
              {/* Best & Worst Years */}
              <Box p={5} borderRadius="lg" boxShadow="md" bg={bgColor}>
                <Heading size="sm" mb={4}>Años Destacados</Heading>
                
                <VStack align="stretch" spacing={4}>
                  {summaryData.trends.highestIncomeYear && (
                    <Box>
                      <HStack>
                        <Badge colorScheme="green" py={1} px={2} borderRadius="md">Mayor Ingreso</Badge>
                        <Text fontWeight="medium">
                          {summaryData.trends.highestIncomeYear.year}
                        </Text>
                      </HStack>
                      <Text fontWeight="bold" color="green.500">
                        {formatCurrency(summaryData.trends.highestIncomeYear.ingresos)}
                      </Text>
                    </Box>
                  )}
                  
                  {summaryData.trends.highestExpenseYear && (
                    <Box>
                      <HStack>
                        <Badge colorScheme="red" py={1} px={2} borderRadius="md">Mayor Egreso</Badge>
                        <Text fontWeight="medium">
                          {summaryData.trends.highestExpenseYear.year}
                        </Text>
                      </HStack>
                      <Text fontWeight="bold" color="red.500">
                        {formatCurrency(summaryData.trends.highestExpenseYear.egresos)}
                      </Text>
                    </Box>
                  )}
                  
                  <Divider />
                  
                  {summaryData.trends.bestYear && (
                    <Box>
                      <HStack>
                        <Badge colorScheme="teal" py={1} px={2} borderRadius="md">Mejor Año</Badge>
                        <Text fontWeight="medium">
                          {summaryData.trends.bestYear.year}
                        </Text>
                      </HStack>
                      <Text fontWeight="bold" color="teal.500">
                        {formatCurrency(summaryData.trends.bestYear.balance)}
                      </Text>
                    </Box>
                  )}
                  
                  {summaryData.trends.worstYear && (
                    <Box>
                      <HStack>
                        <Badge colorScheme="orange" py={1} px={2} borderRadius="md">Peor Año</Badge>
                        <Text fontWeight="medium">
                          {summaryData.trends.worstYear.year}
                        </Text>
                      </HStack>
                      <Text fontWeight="bold" color="orange.500">
                        {formatCurrency(summaryData.trends.worstYear.balance)}
                      </Text>
                    </Box>
                  )}
                </VStack>
              </Box>
              
              {/* Year-over-Year Comparison */}
              <Box p={5} borderRadius="lg" boxShadow="md" bg={bgColor}>
                <Heading size="sm" mb={4}>Comparación Anual</Heading>
                
                <VStack align="stretch" spacing={4}>
                  {summaryData.items && summaryData.items.length >= 2 ? (
                    <>
                      <Box>
                        <Text fontWeight="medium">Cambio en Ingresos</Text>
                        <HStack>
                          <StatArrow type={summaryData.items[0].ingresos >= summaryData.items[1].ingresos ? 'increase' : 'decrease'} />
                          <Text fontWeight="bold" color={summaryData.items[0].ingresos >= summaryData.items[1].ingresos ? 'green.500' : 'red.500'}>
                            {formatPercentage(Math.abs((summaryData.items[0].ingresos - summaryData.items[1].ingresos) / Math.max(1, summaryData.items[1].ingresos)))}
                          </Text>
                          <Text>vs año anterior</Text>
                        </HStack>
                      </Box>
                      
                      <Box>
                        <Text fontWeight="medium">Cambio en Egresos</Text>
                        <HStack>
                          <StatArrow type={summaryData.items[0].egresos <= summaryData.items[1].egresos ? 'decrease' : 'increase'} />
                          <Text fontWeight="bold" color={summaryData.items[0].egresos <= summaryData.items[1].egresos ? 'green.500' : 'red.500'}>
                            {formatPercentage(Math.abs((summaryData.items[0].egresos - summaryData.items[1].egresos) / Math.max(1, summaryData.items[1].egresos)))}
                          </Text>
                          <Text>vs año anterior</Text>
                        </HStack>
                      </Box>
                      
                      <Box>
                        <Text fontWeight="medium">Cambio en Balance</Text>
                        <HStack>
                          <StatArrow type={summaryData.items[0].balance >= summaryData.items[1].balance ? 'increase' : 'decrease'} />
                          <Text fontWeight="bold" color={summaryData.items[0].balance >= summaryData.items[1].balance ? 'green.500' : 'red.500'}>
                            {summaryData.items[1].balance !== 0 
                              ? formatPercentage(Math.abs((summaryData.items[0].balance - summaryData.items[1].balance) / Math.max(1, Math.abs(summaryData.items[1].balance))))
                              : 'N/A'}
                          </Text>
                          <Text>vs año anterior</Text>
                        </HStack>
                      </Box>
                    </>
                  ) : (
                    <Text color="gray.500">
                      No hay suficientes datos para comparar años.
                    </Text>
                  )}
                  
                  <Divider />
                  
                  <Box>
                    <Text fontWeight="medium">Tendencia a largo plazo</Text>
                    <HStack>
                      <Text color={trendColor} fontWeight="bold">
                        {trendIcon}
                        {trendType === 'up' ? 'Positiva' : 
                         trendType === 'down' ? 'Negativa' : 
                         trendType === 'stable' ? 'Estable' : 'Sin datos suficientes'}
                      </Text>
                    </HStack>
                    <Text fontSize="sm" color="gray.600" mt={2}>
                      {trendType === 'up' 
                        ? 'Tu situación financiera está mejorando año tras año.' 
                        : trendType === 'down' 
                        ? 'Tu situación financiera está empeorando. Considera revisar tus gastos.' 
                        : trendType === 'stable' 
                        ? 'Tu situación financiera se mantiene estable.' 
                        : 'Registra más datos para ver tendencias.'}
                    </Text>
                  </Box>
                </VStack>
              </Box>
            </SimpleGrid>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
}
