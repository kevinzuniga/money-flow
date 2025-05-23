import { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Text,
  SimpleGrid,
  Flex,
  Spinner,
  useColorModeValue,
  ButtonGroup,
  Button,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  IconButton,
  HStack,
  VStack,
  Divider,
  Alert,
  AlertIcon,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  CircularProgress,
  CircularProgressLabel,
  Badge,
} from '@chakra-ui/react';
import { ChevronDownIcon, DownloadIcon, SettingsIcon } from '@chakra-ui/icons';
import { useAuth } from '../contexts/AuthContext';
import useFinancialData from '../hooks/useFinancialData';
import YearSelector from '../components/YearSelector';
import MonthSelector from '../components/MonthSelector';
import {
  IncomeExpenseChart,
  BalanceTrendChart,
  ExpenseDistributionChart,
  SavingsRateProgress,
  YearOverYearChart
} from '../components/charts/FinancialCharts';

export default function Reportes() {
  // State management
  const [period, setPeriod] = useState('month');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [previousYear, setPreviousYear] = useState(selectedYear - 1);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [tabIndex, setTabIndex] = useState(0);
  
  // Hooks
  const { user } = useAuth();
  const bgColor = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  
  // Fetch current period financial data
  const { 
    data: financialData,
    loading: isLoading,
    error: dataError,
    refetch: refetchData
  } = useFinancialData(
    '/api/reportes/totales',
    {
      groupBy: period,
      year: selectedYear,
      month: period === 'month' ? selectedMonth : undefined
    }
  );
  
  // Fetch previous year data for comparison
  const {
    data: previousYearData,
    loading: isPrevYearLoading,
    error: prevYearError
  } = useFinancialData(
    '/api/reportes/totales',
    {
      groupBy: period,
      year: previousYear
    }
  );
  
  // Fetch expense distribution data
  const {
    data: expenseData,
    loading: isExpenseLoading,
    error: expenseError
  } = useFinancialData(
    '/api/egresos/categorias',
    {
      year: selectedYear,
      month: period === 'month' ? selectedMonth : undefined
    }
  );
  
  // Format expense data for pie chart
  const expenseDistributionData = expenseData?.items?.map(item => ({
    name: item.categoria,
    value: parseFloat(item.total)
  })) || [];
  
  // Calculate savings rate
  const calculateSavingsRate = (data) => {
    if (!data?.data?.totals) return 0;
    const { ingresos, balance } = data.data.totals;
    return ingresos > 0 ? balance / ingresos : 0;
  };
  
  const savingsRate = calculateSavingsRate(financialData);
  const previousSavingsRate = calculateSavingsRate(previousYearData);
  
  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
    }).format(amount);
  };
  
  // Handle period change
  const handlePeriodChange = (index) => {
    setPeriod(index === 0 ? 'month' : 'year');
    setTabIndex(index);
  };
  
  // Handle year change
  const handleYearChange = (year) => {
    setSelectedYear(year);
    setPreviousYear(year - 1);
  };
  
  // Handle month change
  const handleMonthChange = (month) => {
    setSelectedMonth(month);
  };
  
  // Full page loading state
  if (isLoading && isPrevYearLoading && isExpenseLoading) {
    return (
      <Flex justify="center" align="center" height="70vh">
        <Spinner size="xl" thickness="4px" speed="0.65s" color="teal.500" />
      </Flex>
    );
  }
  
  // Check if data is loaded for summary calculations
  const hasData = financialData?.data?.totals;
  const hasPrevData = previousYearData?.data?.totals;
  
  // Calculate year-over-year changes
  const calculateChange = (current, previous, metric) => {
    if (!current?.data?.totals || !previous?.data?.totals) return { value: 0, percentage: 0 };
    
    const currentValue = current.data.totals[metric];
    const previousValue = previous.data.totals[metric];
    
    if (previousValue === 0) return { value: currentValue, percentage: currentValue > 0 ? 100 : 0 };
    
    const change = currentValue - previousValue;
    const percentage = (change / Math.abs(previousValue)) * 100;
    
    return { value: change, percentage };
  };
  
  const incomeChange = calculateChange(financialData, previousYearData, 'ingresos');
  const expenseChange = calculateChange(financialData, previousYearData, 'egresos');
  const balanceChange = calculateChange(financialData, previousYearData, 'balance');
  
  return (
    <Box pb={10}>
      {/* Page Header */}
      <Flex 
        direction={{ base: "column", md: "row" }} 
        justify="space-between" 
        align={{ base: "flex-start", md: "center" }} 
        mb={6}
      >
        <Box mb={{ base: 4, md: 0 }}>
          <Heading as="h1" size="xl">
            Reportes Financieros
          </Heading>
          <Text fontSize="lg" mt={1}>
            Análisis detallado de tus finanzas
          </Text>
        </Box>
        
        <HStack spacing={4}>
          <Menu>
            <MenuButton 
              as={Button} 
              rightIcon={<ChevronDownIcon />} 
              size="sm" 
              colorScheme="teal"
              variant="outline"
            >
              Exportar
            </MenuButton>
            <MenuList>
              <MenuItem icon={<DownloadIcon />}>PDF</MenuItem>
              <MenuItem icon={<DownloadIcon />}>Excel</MenuItem>
              <MenuItem icon={<DownloadIcon />}>CSV</MenuItem>
            </MenuList>
          </Menu>
          
          <IconButton
            icon={<SettingsIcon />}
            aria-label="Configuración de reportes"
            size="sm"
            colorScheme="gray"
            variant="outline"
          />
        </HStack>
      </Flex>
      
      {/* Period Selection */}
      <Flex 
        direction={{ base: "column", md: "row" }} 
        justify="space-between" 
        align="center" 
        mb={8}
      >
        <Tabs 
          index={tabIndex} 
          onChange={handlePeriodChange} 
          variant="soft-rounded" 
          colorScheme="teal" 
          mb={{ base: 4, md: 0 }}
        >
          <TabList>
            <Tab>Vista Mensual</Tab>
            <Tab>Vista Anual</Tab>
          </TabList>
        </Tabs>
        
        <HStack spacing={4}>
          {period === 'month' && (
            <MonthSelector
              selectedMonth={selectedMonth}
              onChange={handleMonthChange}
            />
          )}
          <YearSelector 
            selectedYear={selectedYear} 
            onChange={handleYearChange}
          />
        </HStack>
      </Flex>
      
      {/* Data Errors */}
      {dataError && (
        <Alert status="error" variant="left-accent" mb={6}>
          <AlertIcon />
          Error al cargar los datos financieros. Por favor intenta nuevamente.
        </Alert>
      )}
      
      {/* Financial Summary */}
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6} mb={8}>
        {/* Income Summary */}
        <Stat p={5} borderRadius="lg" boxShadow="md" bg={bgColor}>
          <StatLabel fontSize="sm">Ingresos Totales</StatLabel>
          <StatNumber fontSize="2xl" color="green.500">
            {hasData ? formatCurrency(financialData.data.totals.ingresos) : '-'}
          </StatNumber>
          {hasPrevData && (
            <StatHelpText>
              <StatArrow type={incomeChange.value >= 0 ? 'increase' : 'decrease'} />
              {incomeChange.percentage.toFixed(1)}% vs período anterior
            </StatHelpText>
          )}
        </Stat>
        
        {/* Expense Summary */}
        <Stat p={5} borderRadius="lg" boxShadow="md" bg={bgColor}>
          <StatLabel fontSize="sm">Egresos Totales</StatLabel>
          <StatNumber fontSize="2xl" color="red.500">
            {hasData ? formatCurrency(financialData.data.totals.egresos) : '-'}
          </StatNumber>
          {hasPrevData && (
            <StatHelpText>
              <StatArrow type={expenseChange.value <= 0 ? 'decrease' : 'increase'} />
              {Math.abs(expenseChange.percentage).toFixed(1)}% vs período anterior
            </StatHelpText>
          )}
        </Stat>
        
        {/* Balance Summary */}
        <Stat p={5} borderRadius="lg" boxShadow="md" bg={bgColor}>
          <StatLabel fontSize="sm">Balance Neto</StatLabel>
          <StatNumber fontSize="2xl" color={hasData && financialData.data.totals.balance >= 0 ? "teal.500" : "red.500"}>
            {hasData ? formatCurrency(financialData.data.totals.balance) : '-'}
          </StatNumber>
          {hasPrevData && (
            <StatHelpText>
              <StatArrow type={balanceChange.value >= 0 ? 'increase' : 'decrease'} />
              {balanceChange.percentage.toFixed(1)}% vs período anterior
            </StatHelpText>
          )}
        </Stat>
      </SimpleGrid>
      
      {/* Charts Section */}
      <SimpleGrid columns={{ base: 1, xl: 2 }} spacing={8} mb={8}>
        {/* Income vs Expense Chart */}
        <IncomeExpenseChart
          data={financialData?.data?.items || []}
          loading={isLoading}
          error={dataError}
        />
        
        {/* Balance Trend Chart */}
        <BalanceTrendChart
          data={financialData?.data?.items || []}
          loading={isLoading}
          error={dataError}
        />
      </SimpleGrid>
      
      <SimpleGrid columns={{ base: 1, xl: 2 }} spacing={8} mb={8}>
        {/* Expense Distribution */}
        <ExpenseDistributionChart
          data={expenseDistributionData}
          loading={isExpenseLoading}
          error={expenseError}
        />
        
        {/* Savings Rate */}
        <SavingsRateProgress
          savingsRate={savingsRate}
          goal={0.2} // 20% savings target
          loading={isLoading}
          error={dataError}
          previousRate={previousSavingsRate}
        />
      </SimpleGrid>
      
      {/* Year-over-Year Comparison */}
      <Box mb={8}>
        <YearOverYearChart
          currentYearData={financialData?.data?.items || []}
          previousYearData={previousYearData?.data?.items || []}
          metric="balance"
          loading={isLoading || isPrevYearLoading}
          error={dataError || prevYearError}
        />
      </Box>
      
      {/* Advanced Metrics */}
      <Accordion allowToggle mb={8}>
        <AccordionItem>
          <h2>
            <AccordionButton>
              <Box flex="1" textAlign="left" fontWeight="medium">
                Métricas Avanzadas
              </Box>
              <AccordionIcon />
            </AccordionButton>
          </h2>
          <AccordionPanel pb={4}>
            <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6}>
              <Box p={4} borderWidth="1px" borderRadius="md">
                <Text fontSize="sm" color="gray.500">Tasa de Ahorro</Text>
                <Text fontSize="xl" fontWeight="bold">
                  {hasData ? `${(savingsRate * 100).toFixed(1)}%` : '-'}
                </Text>
                <Text fontSize="xs" color="gray.500">
                  Porcentaje de tus ingresos que ahorras
                </Text>
              </Box>
              
              <Box p={4} borderWidth="1px" borderRadius="md">
                <Text fontSize="sm" color="gray.500">Proporción Ingresos/Egresos</Text>
                <Text fontSize="xl" fontWeight="bold">
                  {hasData && financialData.data.totals.ingresos > 0 
                    ? (financialData.data.totals.egresos / financialData.data.totals.ingresos).toFixed(2)
                    : '-'
                  }
                </Text>
                <Text fontSize="xs" color="gray.500">
                  Por cada $1 que ingresa, cuánto gastas
                </Text>
              </Box>
              
              <Box p={4} borderWidth="1px" borderRadius="md">
                <Text fontSize="sm" color="gray.500">Ingreso Promedio</Text>
                <Text fontSize="xl" fontWeight="bold">
                  {hasData ? formatCurrency(financialData.data.averages.ingresos) : '-'}
                </Text>
                <Text fontSize="xs" color="gray.500">
                  Promedio {period === 'month' ? 'mensual' : 'anual'}
                </Text>
              </Box>
              
              <Box p={4} borderWidth="1px" borderRadius="md">
                <Text fontSize="sm" color="gray.500">Egreso Promedio</Text>
                <Text fontSize="xl" fontWeight="bold">
                  {hasData ? formatCurrency(financialData.data.averages.egresos) : '-'}
                </Text>
                <Text fontSize="xs" color="gray.500">
                  Promedio {period === 'month' ? 'mensual' : 'anual'}
                </Text>
              </Box>
            </SimpleGrid>
          </AccordionPanel>
        </AccordionItem>
      </Accordion>
      
      {/* Chart Type Selector */}
      <Box mb={6}>
        <Flex justify="space-between" align="center" mb={4}>
          <Heading as="h2" size="md">
            Detalle Mensual
          </Heading>
          <ButtonGroup size="sm" isAttached variant="outline">
            <Button
              colorScheme="teal"
              variant={period === 'month' ? 'solid' : 'outline'}
              onClick={() => handlePeriodChange(0)}
            >
              Mensual
            </Button>
            <Button
              colorScheme="teal"
              variant={period === 'year' ? 'solid' : 'outline'}
              onClick={() => handlePeriodChange(1)}
            >
              Anual
            </Button>
          </ButtonGroup>
        </Flex>
        
        {/* Financial Performance Alerts */}
        {hasData && (
          <Box mb={6}>
            {financialData.data.totals.balance >= 0 ? (
              <Alert status="success" variant="left-accent" borderRadius="md">
                <AlertIcon />
                ¡Buen trabajo! Has mantenido un balance positivo durante este {period === 'month' ? 'mes' : 'año'}.
                {financialData.data.totals.balance > financialData.data.totals.ingresos * 0.2 && 
                  " Tu tasa de ahorro es excelente (superior al 20% de tus ingresos)."}
              </Alert>
            ) : (
              <Alert status="warning" variant="left-accent" borderRadius="md">
                <AlertIcon />
                Tus gastos han superado tus ingresos este {period === 'month' ? 'mes' : 'año'}. 
                Considera revisar tu presupuesto para mejorar tu situación financiera.
              </Alert>
            )}
          </Box>
        )}
        
        {/* Monthly/Yearly Detail Tabs */}
        <Tabs isFitted variant="enclosed" colorScheme="teal" bg={bgColor} borderRadius="lg" boxShadow="md">
          <TabList mb="1em">
            <Tab>Detalle {period === 'month' ? 'Mensual' : 'Anual'}</Tab>
            <Tab>Comparativa</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>
              {/* Table with monthly/yearly data would go here */}
              {!hasData ? (
                <Box textAlign="center" p={10}>
                  <Text fontSize="lg" color="gray.500">
                    No hay datos disponibles para el período seleccionado.
                  </Text>
                </Box>
              ) : (
                <Box>
                  <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} mb={4}>
                    <Box p={3} borderWidth="1px" borderRadius="md">
                      <Text fontWeight="bold">Ingresos Totales</Text>
                      <Text fontSize="xl" color="green.500">{formatCurrency(financialData.data.totals.ingresos)}</Text>
                    </Box>
                    <Box p={3} borderWidth="1px" borderRadius="md">
                      <Text fontWeight="bold">Egresos Totales</Text>
                      <Text fontSize="xl" color="red.500">{formatCurrency(financialData.data.totals.egresos)}</Text>
                    </Box>
                    <Box p={3} borderWidth="1px" borderRadius="md">
                      <Text fontWeight="bold">Balance Neto</Text>
                      <Text 
                        fontSize="xl" 
                        color={financialData.data.totals.balance >= 0 ? "green.500" : "red.500"}
                      >
                        {formatCurrency(financialData.data.totals.balance)}
                      </Text>
                    </Box>
                  </SimpleGrid>
                  
                  {/* Monthly/Yearly Details Table */}
                  <Box overflowX="auto">
                    <Box as="table" width="100%" mb={4}>
                      <Box as="thead">
                        <Box as="tr" bg={useColorModeValue('gray.50', 'gray.700')}>
                          <Box as="th" p={3} textAlign="left">{period === 'month' ? 'Mes' : 'Año'}</Box>
                          <Box as="th" p={3} textAlign="right">Ingresos</Box>
                          <Box as="th" p={3} textAlign="right">Egresos</Box>
                          <Box as="th" p={3} textAlign="right">Balance</Box>
                          <Box as="th" p={3} textAlign="right">% Ahorro</Box>
                        </Box>
                      </Box>
                      <Box as="tbody">
                        {financialData.data.items.map((item, index) => {
                          const savingRate = item.ingresos > 0 
                            ? (item.balance / item.ingresos) * 100 
                            : 0;
                            
                          return (
                            <Box 
                              as="tr" 
                              key={index}
                              borderBottom="1px solid"
                              borderColor={borderColor}
                              _hover={{ bg: useColorModeValue('gray.50', 'gray.700') }}
                            >
                              <Box as="td" p={3}>
                                {period === 'month' 
                                  ? item.monthName 
                                  : item.year
                                }
                              </Box>
                              <Box as="td" p={3} textAlign="right" fontWeight="medium">
                                {formatCurrency(item.ingresos)}
                              </Box>
                              <Box as="td" p={3} textAlign="right" fontWeight="medium">
                                {formatCurrency(item.egresos)}
                              </Box>
                              <Box 
                                as="td" 
                                p={3} 
                                textAlign="right" 
                                fontWeight="bold"
                                color={item.balance >= 0 ? "green.500" : "red.500"}
                              >
                                {formatCurrency(item.balance)}
                              </Box>
                              <Box 
                                as="td" 
                                p={3} 
                                textAlign="right"
                                color={savingRate >= 20 
                                  ? "green.500" 
                                  : savingRate >= 0 
                                    ? "yellow.500" 
                                    : "red.500"
                                }
                              >
                                {savingRate.toFixed(1)}%
                              </Box>
                            </Box>
                          );
                        })}
                      </Box>
                      {/* Table Footer with Totals */}
                      <Box as="tfoot">
                        <Box 
                          as="tr" 
                          bg={useColorModeValue('gray.50', 'gray.700')}
                          fontWeight="bold"
                        >
                          <Box as="td" p={3}>Total</Box>
                          <Box as="td" p={3} textAlign="right">
                            {formatCurrency(financialData.data.totals.ingresos)}
                          </Box>
                          <Box as="td" p={3} textAlign="right">
                            {formatCurrency(financialData.data.totals.egresos)}
                          </Box>
                          <Box 
                            as="td" 
                            p={3} 
                            textAlign="right"
                            color={financialData.data.totals.balance >= 0 ? "green.500" : "red.500"}
                          >
                            {formatCurrency(financialData.data.totals.balance)}
                          </Box>
                          <Box 
                            as="td" 
                            p={3} 
                            textAlign="right"
                            color={savingsRate >= 0.2 
                              ? "green.500" 
                              : savingsRate >= 0 
                                ? "yellow.500" 
                                : "red.500"
                            }
                          >
                            {(savingsRate * 100).toFixed(1)}%
                          </Box>
                        </Box>
                      </Box>
                    </Box>
                  </Box>
                </Box>
              )}
            </TabPanel>
            
            {/* Comparison Tab Panel */}
            <TabPanel>
              {!hasData || !hasPrevData ? (
                <Box textAlign="center" p={10}>
                  <Text fontSize="lg" color="gray.500">
                    No hay suficientes datos para realizar una comparación.
                    {!hasPrevData && hasData && " Se requieren datos del período anterior."}
                  </Text>
                </Box>
              ) : (
                <Box>
                  <Heading size="md" mb={4}>
                    Comparativa de {period === 'month' ? 'Meses' : 'Años'}
                  </Heading>
                  
                  {/* Change Summary Cards */}
                  <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6} mb={8}>
                    <Box p={4} borderRadius="lg" boxShadow="sm" bg={bgColor}>
                      <Flex justify="space-between" align="flex-start">
                        <Box>
                          <Text color="gray.500" fontSize="sm">Cambio en Ingresos</Text>
                          <Text fontSize="2xl" fontWeight="bold" color={incomeChange.value >= 0 ? "green.500" : "red.500"}>
                            {incomeChange.value >= 0 ? "+" : ""}{formatCurrency(incomeChange.value)}
                          </Text>
                        </Box>
                        <HStack>
                          <Stat display="inline-block">
                            <StatHelpText>
                              <StatArrow type={incomeChange.value >= 0 ? 'increase' : 'decrease'} boxSize={6} />
                            </StatHelpText>
                          </Stat>
                          <Text fontSize="lg" fontWeight="medium" color={incomeChange.value >= 0 ? "green.500" : "red.500"}>
                            {incomeChange.value >= 0 ? "+" : ""}{incomeChange.percentage.toFixed(1)}%
                          </Text>
                        </HStack>
                      </Flex>
                    </Box>
                    
                    <Box p={4} borderRadius="lg" boxShadow="sm" bg={bgColor}>
                      <Flex justify="space-between" align="flex-start">
                        <Box>
                          <Text color="gray.500" fontSize="sm">Cambio en Egresos</Text>
                          <Text fontSize="2xl" fontWeight="bold" color={expenseChange.value <= 0 ? "green.500" : "red.500"}>
                            {expenseChange.value >= 0 ? "+" : ""}{formatCurrency(expenseChange.value)}
                          </Text>
                        </Box>
                        <HStack>
                          <Stat display="inline-block">
                            <StatHelpText>
                              <StatArrow type={expenseChange.value <= 0 ? 'decrease' : 'increase'} boxSize={6} />
                            </StatHelpText>
                          </Stat>
                          <Text fontSize="lg" fontWeight="medium" color={expenseChange.value <= 0 ? "green.500" : "red.500"}>
                            {expenseChange.value >= 0 ? "+" : ""}{expenseChange.percentage.toFixed(1)}%
                          </Text>
                        </HStack>
                      </Flex>
                    </Box>
                    
                    <Box p={4} borderRadius="lg" boxShadow="sm" bg={bgColor}>
                      <Flex justify="space-between" align="flex-start">
                        <Box>
                          <Text color="gray.500" fontSize="sm">Cambio en Balance</Text>
                          <Text fontSize="2xl" fontWeight="bold" color={balanceChange.value >= 0 ? "green.500" : "red.500"}>
                            {balanceChange.value >= 0 ? "+" : ""}{formatCurrency(balanceChange.value)}
                          </Text>
                        </Box>
                        <HStack>
                          <Stat display="inline-block">
                            <StatHelpText>
                              <StatArrow type={balanceChange.value >= 0 ? 'increase' : 'decrease'} boxSize={6} />
                            </StatHelpText>
                          </Stat>
                          <Text fontSize="lg" fontWeight="medium" color={balanceChange.value >= 0 ? "green.500" : "red.500"}>
                            {balanceChange.value >= 0 ? "+" : ""}{balanceChange.percentage.toFixed(1)}%
                          </Text>
                        </HStack>
                      </Flex>
                    </Box>
                  </SimpleGrid>
                  
                  {/* Trend Analysis */}
                  <Box p={5} borderRadius="lg" boxShadow="md" bg={bgColor} mb={6}>
                    <Heading size="sm" mb={4}>Análisis de Tendencias</Heading>
                    
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                      <Box>
                        <VStack align="start" spacing={3}>
                          <HStack>
                            <Text fontWeight="medium">Tendencia de Ingresos:</Text>
                            <Text 
                              fontWeight="bold" 
                              color={incomeChange.value >= 0 ? "green.500" : "red.500"}
                            >
                              {incomeChange.value >= 0 ? "En aumento" : "En descenso"}
                              {Math.abs(incomeChange.percentage) < 5 && " (estable)"}
                            </Text>
                          </HStack>
                          
                          <HStack>
                            <Text fontWeight="medium">Tendencia de Egresos:</Text>
                            <Text 
                              fontWeight="bold" 
                              color={expenseChange.value <= 0 ? "green.500" : "red.500"}
                            >
                              {expenseChange.value <= 0 ? "En descenso" : "En aumento"}
                              {Math.abs(expenseChange.percentage) < 5 && " (estable)"}
                            </Text>
                          </HStack>
                          
                          <HStack>
                            <Text fontWeight="medium">Tendencia de Balance:</Text>
                            <Text 
                              fontWeight="bold" 
                              color={balanceChange.value >= 0 ? "green.500" : "red.500"}
                            >
                              {balanceChange.value >= 0 ? "Mejorando" : "Empeorando"}
                              {Math.abs(balanceChange.percentage) < 5 && " (estable)"}
                            </Text>
                          </HStack>
                        </VStack>
                      </Box>
                      
                      <Box>
                        <VStack align="start" spacing={3}>
                          <HStack>
                            <Text fontWeight="medium">Cambio en Tasa de Ahorro:</Text>
                            <Text 
                              fontWeight="bold" 
                              color={(savingsRate - previousSavingsRate) >= 0 ? "green.500" : "red.500"}
                            >
                              {(savingsRate - previousSavingsRate) >= 0 ? "+" : ""}
                              {((savingsRate - previousSavingsRate) * 100).toFixed(1)}%
                            </Text>
                          </HStack>
                          
                          <Text>{period === 'month' ? 'Este mes' : 'Este año'} has 
                            {savingsRate >= 0 
                              ? ` ahorrado un ${(savingsRate * 100).toFixed(1)}% de tus ingresos` 
                              : ` gastado un ${(Math.abs(savingsRate) * 100).toFixed(1)}% más que tus ingresos`
                            }, mientras que el período anterior 
                            {previousSavingsRate >= 0 
                              ? ` ahorraste un ${(previousSavingsRate * 100).toFixed(1)}%` 
                              : ` gastaste un ${(Math.abs(previousSavingsRate) * 100).toFixed(1)}% más`
                            }.
                          </Text>
                        </VStack>
                      </Box>
                    </SimpleGrid>
                  </Box>
                  
                  {/* Key Performance Indicators */}
                  <Box p={5} borderRadius="lg" boxShadow="md" bg={bgColor} mb={6}>
                    <Heading size="sm" mb={4}>Indicadores Clave de Desempeño</Heading>
                    
                    <SimpleGrid columns={{ base: 1, md: 3, lg: 5 }} spacing={4}>
                      <Box p={3} borderWidth="1px" borderRadius="md">
                        <Text fontSize="sm" color="gray.500">Promedio de Ingresos</Text>
                        <HStack spacing={1} mt={1} align="baseline">
                          <Text fontSize="lg" fontWeight="bold">
                            {formatCurrency(financialData.data.averages.ingresos)}
                          </Text>
                          <Text fontSize="sm" color="gray.500">/ {period === 'month' ? 'mes' : 'año'}</Text>
                        </HStack>
                      </Box>
                      
                      <Box p={3} borderWidth="1px" borderRadius="md">
                        <Text fontSize="sm" color="gray.500">Promedio de Egresos</Text>
                        <HStack spacing={1} mt={1} align="baseline">
                          <Text fontSize="lg" fontWeight="bold">
                            {formatCurrency(financialData.data.averages.egresos)}
                          </Text>
                          <Text fontSize="sm" color="gray.500">/ {period === 'month' ? 'mes' : 'año'}</Text>
                        </HStack>
                      </Box>
                      
                      <Box p={3} borderWidth="1px" borderRadius="md">
                        <Text fontSize="sm" color="gray.500">Tasa de Ahorro</Text>
                        <Text fontSize="lg" fontWeight="bold" color={savingsRate >= 0.2 ? "green.500" : savingsRate >= 0 ? "yellow.500" : "red.500"}>
                          {(savingsRate * 100).toFixed(1)}%
                        </Text>
                        <Text fontSize="xs" color="gray.500">
                          {savingsRate >= 0.2 
                            ? "Excelente" 
                            : savingsRate >= 0.1 
                              ? "Buena" 
                              : savingsRate >= 0 
                                ? "Regular" 
                                : "Deficitaria"}
                        </Text>
                      </Box>
                      
                      <Box p={3} borderWidth="1px" borderRadius="md">
                        <Text fontSize="sm" color="gray.500">Ratio Ingreso/Egreso</Text>
                        <Text fontSize="lg" fontWeight="bold">
                          {financialData.data.totals.ingresos > 0 
                            ? (financialData.data.totals.egresos / financialData.data.totals.ingresos).toFixed(2)
                            : "N/A"}
                        </Text>
                        <Text fontSize="xs" color="gray.500">
                          Por cada $1 de ingreso
                        </Text>
                      </Box>
                      
                      <Box p={3} borderWidth="1px" borderRadius="md">
                        <Text fontSize="sm" color="gray.500">Cambio vs. Período Anterior</Text>
                        <HStack spacing={1}>
                          <Stat display="inline-block">
                            <StatHelpText>
                              <StatArrow type={balanceChange.value >= 0 ? 'increase' : 'decrease'} />
                            </StatHelpText>
                          </Stat>
                          <Text fontSize="lg" fontWeight="bold" color={balanceChange.value >= 0 ? "green.500" : "red.500"}>
                            {balanceChange.percentage.toFixed(1)}%
                          </Text>
                        </HStack>
                        <Text fontSize="xs" color="gray.500">
                          En balance neto
                        </Text>
                      </Box>
                    </SimpleGrid>
                  </Box>
                </Box>
              )}
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>
      
      {/* Performance Insights Section */}
      {hasData && (
        <Box mb={8}>
          <Heading as="h2" size="md" mb={4}>
            Insights y Recomendaciones
          </Heading>
          
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
            {/* Recommendations based on trends */}
            <Box p={5} borderRadius="lg" boxShadow="md" bg={bgColor}>
              <Heading size="sm" mb={4}>Recomendaciones</Heading>
              
              <VStack align="stretch" spacing={4}>
                {/* Income Recommendations */}
                <Box>
                  <Text fontWeight="bold" color="blue.500" mb={1}>Ingresos</Text>
                  
                  {incomeChange.value < 0 ? (
                    <Text>
                      Tus ingresos han disminuido un {Math.abs(incomeChange.percentage).toFixed(1)}% respecto al período anterior.
                      Considera buscar formas de aumentar tus fuentes de ingresos.
                    </Text>
                  ) : incomeChange.value === 0 ? (
                    <Text>
                      Tus ingresos se han mantenido estables. Para mejorar tu situación financiera,
                      podrías explorar nuevas fuentes de ingresos o formas de aumentar los actuales.
                    </Text>
                  ) : (
                    <Text>
                      ¡Buen trabajo! Tus ingresos han aumentado un {incomeChange.percentage.toFixed(1)}%. 
                      Continúa con las estrategias que te han ayudado a incrementar tus ingresos.
                    </Text>
                  )}
                </Box>
                
                {/* Expense Recommendations */}
                <Box>
                  <Text fontWeight="bold" color="red.500" mb={1}>Egresos</Text>
                  
                  {expenseChange.value > 0 && expenseChange.percentage > 10 ? (
                    <Text>
                      Tus gastos han aumentado significativamente ({expenseChange.percentage.toFixed(1)}%). 
                      Revisa tus categorías de gastos principales para identificar áreas donde podrías reducir.
                    </Text>
                  ) : expenseChange.value > 0 ? (
                    <Text>
                      Tus gastos han aumentado ligeramente. Mantén un seguimiento cercano para evitar que
                      la tendencia continúe en los próximos meses.
                    </Text>
                  ) : (
                    <Text>
                      Has logrado reducir tus gastos en un {Math.abs(expenseChange.percentage).toFixed(1)}%. 
                      Continúa manteniendo un control sobre tus gastos para mejorar tu situación financiera.
                    </Text>
                  )}
                </Box>
                
                {/* Savings Recommendations */}
                <Box>
                  <Text fontWeight="bold" color="green.500" mb={1}>Ahorros</Text>
                  
                  {savingsRate < 0 ? (
                    <Text>
                      Actualmente estás en déficit, gastando más de lo que ingresas. Considera crear un
                      presupuesto estricto y reducir gastos no esenciales hasta equilibrar tu situación.
                    </Text>
                  ) : savingsRate < 0.1 ? (
                    <Text>
                      Tu tasa de ahorro es baja ({(savingsRate * 100).toFixed(1)}%). Intenta incrementarla 
                      gradualmente, comenzando por reducir gastos no esenciales o aumentar tus ingresos.
                    </Text>
                  ) : savingsRate < 0.2 ? (
                    <Text>
                      Tu tasa de ahorro ({(savingsRate * 100).toFixed(1)}%) es buena, pero podrías mejorarla. 
                      Considera establecer metas de ahorro específicas para cada mes.
                    </Text>
                  ) : (
                    <Text>
                      ¡Excelente tasa de ahorro! Estás ahorrando un {(savingsRate * 100).toFixed(1)}% de tus ingresos,
                      lo cual es superior al objetivo recomendado del 20%. Considera invertir parte de estos ahorros.
                    </Text>
                  )}
                </Box>
              </VStack>
            </Box>
            
            {/* Action Items for Improvement */}
            <Box p={5} borderRadius="lg" boxShadow="md" bg={bgColor}>
              <Heading size="sm" mb={4}>Acciones Recomendadas</Heading>
              
              <VStack align="stretch" spacing={3}>
                {savingsRate < 0 && (
                  <HStack align="flex-start" spacing={3}>
                    <Box color="red.500" fontWeight="bold" fontSize="lg">1.</Box>
                    <Text>Establece un presupuesto de emergencia para recortar gastos no esenciales y equilibrar tus finanzas.</Text>
                  </HStack>
                )}
                
                {(expenseChange.value > 0 || financialData.data.totals.egresos > financialData.data.totals.ingresos * 0.8) && (
                  <HStack align="flex-start" spacing={3}>
                    <Box color="orange.500" fontWeight="bold" fontSize="lg">{savingsRate < 0 ? "2." : "1."}</Box>
                    <Text>Revisa tus mayores categorías de gastos e identifica al menos 3 áreas donde puedas reducir.</Text>
                  </HStack>
                )}
                
                {incomeChange.value <= 0 && (
                  <HStack align="flex-start" spacing={3}>
                    <Box color="blue.500" fontWeight="bold" fontSize="lg">{savingsRate < 0 || expenseChange.value > 0 ? "3." : "1."}</Box>
                    <Text>Explora oportunidades para aumentar tus ingresos, ya sea mediante un ascenso, trabajo adicional o nuevas fuentes.</Text>
                  </HStack>
                )}
                
                {savingsRate >= 0 && savingsRate < 0.2 && (
                  <HStack align="flex-start" spacing={3}>
                    <Box color="teal.500" fontWeight="bold" fontSize="lg">
                      {(savingsRate < 0 || expenseChange.value > 0 || incomeChange.value <= 0) ? "4." : "1."}
                    </Box>
                    <Text>Establece una meta para aumentar tu tasa de ahorro en un 2-5% adicional cada mes hasta alcanzar el 20%.</Text>
                  </HStack>
                )}
                
                {savingsRate >= 0.2 && (
                  <HStack align="flex-start" spacing={3}>
                    <Box color="green.500" fontWeight="bold" fontSize="lg">1.</Box>
                    <Text>Considera opciones de inversión para hacer crecer tu dinero, como fondos indexados o planes de retiro.</Text>
                  </HStack>
                )}
                
                <HStack align="flex-start" spacing={3}>
                  <Box color="purple.500" fontWeight="bold" fontSize="lg">
                    {savingsRate >= 0.2 ? "2." : "5."}
                  </Box>
                  <Text>Establece metas financieras específicas para los próximos 3, 6 y 12 meses.</Text>
                </HStack>
                
                <HStack align="flex-start" spacing={3}>
                  <Box color="cyan.500" fontWeight="bold" fontSize="lg">
                    {savingsRate >= 0.2 ? "3." : "6."}
                  </Box>
                  <Text>Programa una revisión mensual de tus finanzas para mantener el control y ajustar tu estrategia según sea necesario.</Text>
                </HStack>
              </VStack>
            </Box>
          </SimpleGrid>
          
          {/* Goal Progress Tracking */}
          <Box p={5} mt={6} borderRadius="lg" boxShadow="md" bg={bgColor}>
            <Flex justify="space-between" align="center" mb={4}>
              <Heading size="sm">Seguimiento de Objetivos Financieros</Heading>
              <Button size="xs" colorScheme="teal" variant="outline">
                Editar Objetivos
              </Button>
            </Flex>
            
            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
              {/* Savings Goal */}
              <Box p={4} borderWidth="1px" borderRadius="md">
                <Text fontWeight="bold" mb={2}>Objetivo de Ahorro</Text>
                <Flex justify="space-between" mb={2}>
                  <Text>Meta: 20% de ingresos</Text>
                  <Text fontWeight="medium">{(savingsRate * 100).toFixed(1)}%</Text>
                </Flex>
                <Box bg="gray.100" h="8px" w="100%" borderRadius="full" mb={2}>
                  <Box 
                    bg={savingsRate >= 0.2 ? "green.500" : savingsRate >= 0.1 ? "yellow.500" : savingsRate >= 0 ? "orange.500" : "red.500"} 
                    h="8px" 
                    w={`${Math.min(Math.max(savingsRate / 0.2 * 100, 0), 100)}%`} 
                    borderRadius="full"
                  />
                </Box>
                <Text fontSize="xs" color="gray.500">
                  {savingsRate >= 0.2 
                    ? "¡Meta alcanzada!" 
                    : savingsRate < 0 
                      ? "Actualmente en déficit" 
                      : `${Math.round(savingsRate / 0.2 * 100)}% completado`}
                </Text>
              </Box>
              
              {/* Expense Reduction Goal */}
              <Box p={4} borderWidth="1px" borderRadius="md">
                <Text fontWeight="bold" mb={2}>Reducción de Gastos</Text>
                <Flex justify="space-between" mb={2}>
                  <Text>Meta: -5% vs período anterior</Text>
                  <Text fontWeight="medium" color={expenseChange.value <= 0 ? "green.500" : "red.500"}>
                    {expenseChange.value >= 0 ? "+" : ""}{expenseChange.percentage.toFixed(1)}%
                  </Text>
                </Flex>
                <Box bg="gray.100" h="8px" w="100%" borderRadius="full" mb={2}>
                  <Box 
                    bg={expenseChange.value <= -5 ? "green.500" : expenseChange.value <= 0 ? "yellow.500" : "red.500"} 
                    h="8px" 
                    w={`${expenseChange.value <= 0 ? Math.min(Math.abs(expenseChange.value) / 5 * 100, 100) : 0}%`} 
                    borderRadius="full"
                  />
                </Box>
                <Text fontSize="xs" color="gray.500">
                  {expenseChange.value <= -5 
                    ? "¡Meta alcanzada!" 
                    : expenseChange.value <= 0 
                      ? `${Math.round(Math.abs(expenseChange.value) / 5 * 100)}% completado` 
                      : "Sin progreso"}
                </Text>
              </Box>
              
              {/* Income Growth Goal */}
              <Box p={4} borderWidth="1px" borderRadius="md">
                <Text fontWeight="bold" mb={2}>Crecimiento de Ingresos</Text>
                <Flex justify="space-between" mb={2}>
                  <Text>Meta: +10% vs período anterior</Text>
                  <Text fontWeight="medium" color={incomeChange.value >= 10 ? "green.500" : incomeChange.value >= 0 ? "blue.500" : "red.500"}>
                    {incomeChange.value >= 0 ? "+" : ""}{incomeChange.percentage.toFixed(1)}%
                  </Text>
                </Flex>
                <Box bg="gray.100" h="8px" w="100%" borderRadius="full" mb={2}>
                  <Box 
                    bg={incomeChange.value >= 10 ? "green.500" : incomeChange.value >= 0 ? "blue.500" : "red.500"} 
                    h="8px" 
                    w={`${incomeChange.value >= 0 ? Math.min(incomeChange.value / 10 * 100, 100) : 0}%`} 
                    borderRadius="full"
                  />
                </Box>
                <Text fontSize="xs" color="gray.500">
                  {incomeChange.value >= 10 
                    ? "¡Meta alcanzada!" 
                    : incomeChange.value <= 0 
                      ? "Sin progreso" 
                      : `${Math.round(incomeChange.value / 10 * 100)}% completado`}
                </Text>
              </Box>
            </SimpleGrid>
          </Box>
          
          {/* Financial Health Summary */}
          <Box p={5} mt={6} borderRadius="lg" boxShadow="md" bg={bgColor}>
            <Heading size="sm" mb={4}>Resumen de Salud Financiera</Heading>
            
            {/* Financial Health Score */}
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6} mb={6}>
              <Box>
                {/* Calculate financial health score based on multiple factors */}
                {(() => {
                  let score = 0;
                  
                  // Score based on savings rate (40% of total)
                  if (savingsRate >= 0.3) score += 40;
                  else if (savingsRate >= 0.2) score += 35;
                  else if (savingsRate >= 0.1) score += 25;
                  else if (savingsRate >= 0) score += 15;
                  else score += 5;
                  
                  // Score based on expense trend (30% of total)
                  if (expenseChange.value <= -10) score += 30;
                  else if (expenseChange.value <= -5) score += 25;
                  else if (expenseChange.value <= 0) score += 20;
                  else if (expenseChange.value <= 5) score += 15;
                  else if (expenseChange.value <= 10) score += 10;
                  else score += 5;
                  
                  // Score based on income trend (30% of total)
                  if (incomeChange.value >= 10) score += 30;
                  else if (incomeChange.value >= 5) score += 25;
                  else if (incomeChange.value >= 0) score += 20;
                  else if (incomeChange.value >= -5) score += 15;
                  else if (incomeChange.value >= -10) score += 10;
                  else score += 5;
                  
                  // Health status levels
                  let healthStatus = "";
                  let healthColor = "";
                  
                  if (score >= 85) {
                    healthStatus = "Excelente";
                    healthColor = "green.500";
                  } else if (score >= 70) {
                    healthStatus = "Buena";
                    healthColor = "teal.500";
                  } else if (score >= 50) {
                    healthStatus = "Regular";
                    healthColor = "yellow.500";
                  } else if (score >= 30) {
                    healthStatus = "En riesgo";
                    healthColor = "orange.500";
                  } else {
                    healthStatus = "Crítica";
                    healthColor = "red.500";
                  }
                  
                  return (
                    <Flex direction="column" align="center" justify="center" py={4}>
                      <Box position="relative" height="160px" width="160px">
                        <CircularProgress
                          value={score}
                          size="160px"
                          thickness="12px"
                          color={healthColor}
                        >
                          <CircularProgressLabel>
                            <Text fontSize="2xl" fontWeight="bold">{score}</Text>
                            <Text fontSize="sm">de 100</Text>
                          </CircularProgressLabel>
                        </CircularProgress>
                      </Box>
                      <Text fontWeight="bold" fontSize="lg" mt={3} color={healthColor}>
                        Salud Financiera: {healthStatus}
                      </Text>
                      <Text fontSize="sm" mt={1}>
                        Basado en tus tendencias de ahorro, ingresos y gastos
                      </Text>
                    </Flex>
                  );
                })()}
              </Box>
              
              <Box>
                <Heading size="xs" mb={3}>Factores Clave</Heading>
                <VStack align="stretch" spacing={3}>
                  <HStack justify="space-between">
                    <Text fontSize="sm">Tasa de Ahorro</Text>
                    <HStack>
                      <Text fontSize="sm" fontWeight="medium">
                        {(savingsRate * 100).toFixed(1)}%
                      </Text>
                      <Badge 
                        colorScheme={savingsRate >= 0.2 
                          ? "green" 
                          : savingsRate >= 0.1 
                            ? "blue" 
                            : savingsRate >= 0 
                              ? "yellow" 
                              : "red"
                        }
                      >
                        {savingsRate >= 0.2 
                          ? "Excelente" 
                          : savingsRate >= 0.1 
                            ? "Buena" 
                            : savingsRate >= 0 
                              ? "Regular" 
                              : "Deficitaria"
                        }
                      </Badge>
                    </HStack>
                  </HStack>
                  
                  <HStack justify="space-between">
                    <Text fontSize="sm">Tendencia de Gastos</Text>
                    <HStack>
                      <Text fontSize="sm" fontWeight="medium">
                        {expenseChange.value >= 0 ? "+" : ""}{expenseChange.percentage.toFixed(1)}%
                      </Text>
                      <Badge 
                        colorScheme={expenseChange.value <= -5 
                          ? "green" 
                          : expenseChange.value <= 0 
                            ? "blue" 
                            : expenseChange.value <= 5 
                              ? "yellow" 
                              : "red"
                        }
                      >
                        {expenseChange.value <= -5 
                          ? "Excelente" 
                          : expenseChange.value <= 0 
                            ? "Buena" 
                            : expenseChange.value <= 5 
                              ? "Regular" 
                              : "Preocupante"
                        }
                      </Badge>
                    </HStack>
                  </HStack>
                  
                  <HStack justify="space-between">
                    <Text fontSize="sm">Tendencia de Ingresos</Text>
                    <HStack>
                      <Text fontSize="sm" fontWeight="medium">
                        {incomeChange.value >= 0 ? "+" : ""}{incomeChange.percentage.toFixed(1)}%
                      </Text>
                      <Badge 
                        colorScheme={incomeChange.value >= 5 
                          ? "green" 
                          : incomeChange.value >= 0 
                            ? "blue" 
                            : incomeChange.value >= -5 
                              ? "yellow" 
                              : "red"
                        }
                      >
                        {incomeChange.value >= 5 
                          ? "Excelente" 
                          : incomeChange.value >= 0 
                            ? "Buena" 
                            : incomeChange.value >= -5 
                              ? "Regular" 
                              : "Preocupante"
                        }
                      </Badge>
                    </HStack>
                  </HStack>
                  
                  <Divider />
                  
                  <Box pt={2}>
                    <Heading size="xs" mb={2}>Próximos Pasos Recomendados:</Heading>
                    <VStack align="stretch" spacing={2}>
                      {savingsRate < 0 && (
                        <Text fontSize="sm">• Prioriza equilibrar tu presupuesto lo antes posible</Text>
                      )}
                      {savingsRate >= 0 && savingsRate < 0.1 && (
                        <Text fontSize="sm">• Aumenta gradualmente tu tasa de ahorro</Text>
                      )}
                      {expenseChange.value > 0 && (
                        <Text fontSize="sm">• Identifica y reduce gastos no esenciales</Text>
                      )}
                      {incomeChange.value < 0 && (
                        <Text fontSize="sm">• Explora fuentes adicionales de ingresos</Text>
                      )}
                      <Text fontSize="sm">• Establece metas financieras específicas para cada período</Text>
                      {savingsRate >= 0.2 && (
                        <Text fontSize="sm">• Considera opciones de inversión para tu excedente</Text>
                      )}
                    </VStack>
                  </Box>
                </VStack>
              </Box>
            </SimpleGrid>
            
            {/* Key Takeaways */}
            <Box mb={6}>
              <Heading size="xs" mb={3}>Conclusiones Clave</Heading>
              <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                <Box p={3} borderWidth="1px" borderRadius="md">
                  <Text fontWeight="bold" mb={1} color={savingsRate >= 0 ? "green.500" : "red.500"}>
                    Balance Financiero
                  </Text>
                  <Text fontSize="sm">
                    {savingsRate >= 0.2 
                      ? "Excelente balance. Continúa manteniendo un alto nivel de ahorro." 
                      : savingsRate >= 0 
                        ? "Balance positivo pero con margen de mejora." 
                        : "Déficit que requiere acción inmediata."}
                  </Text>
                </Box>
                
                <Box p={3} borderWidth="1px" borderRadius="md">
                  <Text fontWeight="bold" mb={1} color="blue.500">
                    Tendencias
                  </Text>
                  <Text fontSize="sm">
                    {balanceChange.value > 0 
                      ? "Tendencia positiva. Tu situación financiera está mejorando." 
                      : balanceChange.value === 0 
                        ? "Situación estable sin cambios significativos." 
                        : "Tendencia negativa que debe ser abordada."}
                  </Text>
                </Box>
                
                <Box p={3} borderWidth="1px" borderRadius="md">
                  <Text fontWeight="bold" mb={1} color="purple.500">
                    Recomendación General
                  </Text>
                  <Text fontSize="sm">
                    {savingsRate >= 0.2 
                      ? "Considera inversiones para hacer crecer tu patrimonio." 
                      : savingsRate >= 0.1 
                        ? "Mantén el rumbo y busca incrementar ligeramente tu tasa de ahorro." 
                        : savingsRate >= 0 
                          ? "Enfócate en incrementar tu tasa de ahorro y reducir gastos." 
                          : "Establece un plan de emergencia para equilibrar tus finanzas."}
                  </Text>
                </Box>
              </SimpleGrid>
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
}
