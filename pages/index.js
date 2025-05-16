import { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Text,
  SimpleGrid,
  Flex,
  Spinner,
  useColorModeValue,
  Button,
  HStack,
  VStack,
  ButtonGroup,
  IconButton,
  Alert,
  AlertIcon,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Badge,
  useDisclosure,
  Link,
  Divider,
  useToast,
} from '@chakra-ui/react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useRouter } from 'next/router';
import NextLink from 'next/link';
import { 
  AddIcon, 
  RepeatIcon, 
  ChevronLeftIcon, 
  ChevronRightIcon
} from '@chakra-ui/icons';
import { useAuth } from '../contexts/AuthContext';
import useFinancialData from '../hooks/useFinancialData';
import FinancialSummary from '../components/FinancialSummary';
import YearSelector from '../components/YearSelector';
import MonthSelector from '../components/MonthSelector';

export default function Dashboard() {
  // State management
  const [period, setPeriod] = useState('month');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [tabIndex, setTabIndex] = useState(0);
  
  // Hooks
  const { user } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const cardBg = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  
  // Fetch summary data using the custom hook
  const { 
    data: summaryData, 
    loading: summaryLoading, 
    error: summaryError,
    refetch: refetchSummary
  } = useFinancialData(
    '/api/reportes/totales', 
    { 
      groupBy: period, 
      year: selectedYear,
      month: period === 'month' ? selectedMonth : undefined
    }
  );
  
  // Fetch recent income transactions with pagination
  const { 
    data: incomesData, 
    loading: incomesLoading, 
    error: incomesError
  } = useFinancialData(
    '/api/ingresos', 
    { 
      limit: 5,
      page: 1,
      sortBy: 'fecha',
      sortDir: 'desc'
    }
  );
  
  // Fetch recent expense transactions with pagination
  const { 
    data: expensesData, 
    loading: expensesLoading, 
    error: expensesError
  } = useFinancialData(
    '/api/egresos', 
    { 
      limit: 5,
      page: 1,
      sortBy: 'fecha',
      sortDir: 'desc'
    }
  );
  
  // Handle period change (month/year)
  const handlePeriodChange = (newPeriod) => {
    setPeriod(newPeriod);
  };
  
  // Handle year change
  const handleYearChange = (year) => {
    setSelectedYear(year);
  };
  
  // Handle month change
  const handleMonthChange = (month) => {
    setSelectedMonth(month);
  };
  
  // Handle tab change
  const handleTabChange = (index) => {
    setTabIndex(index);
  };
  
  // Format date to Spanish locale
  const formatDate = (dateString) => {
    return format(new Date(dateString), 'PPP', { locale: es });
  };
  
  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
    }).format(amount);
  };
  
  // Handle refresh data
  const handleRefresh = () => {
    refetchSummary(true); // Force refetch ignoring cache
    toast({
      title: "Actualizando datos",
      description: "Los datos financieros están siendo actualizados",
      status: "info",
      duration: 3000,
      isClosable: true,
    });
  };
  
  // Navigate to register income page
  const navigateToAddIncome = () => {
    router.push('/ingresos/nuevo');
  };
  
  // Navigate to register expense page
  const navigateToAddExpense = () => {
    router.push('/egresos/nuevo');
  };
  
  // Current period display text
  const currentPeriodText = period === 'month' 
    ? `${format(new Date(selectedYear, selectedMonth - 1), 'MMMM yyyy', { locale: es })}`
    : `${selectedYear}`;
  
  // Show loading state if all data is loading
  if (summaryLoading && incomesLoading && expensesLoading) {
    return (
      <Flex justify="center" align="center" height="60vh">
        <Spinner size="xl" thickness="4px" speed="0.65s" color="teal.500" />
      </Flex>
    );
  }
  
  return (
    <Box>
      {/* Dashboard Header */}
      <Flex 
        direction={{ base: "column", md: "row" }} 
        justify="space-between" 
        align={{ base: "flex-start", md: "center" }} 
        mb={6}
      >
        <Box mb={{ base: 4, md: 0 }}>
          <Heading as="h1" size="xl">
            Dashboard
          </Heading>
          <Text fontSize="lg" mt={1}>
            Bienvenido, {user?.nombre || 'Usuario'}. Aquí está el resumen de tus finanzas.
          </Text>
        </Box>
        
        <HStack spacing={4}>
          <IconButton
            icon={<RepeatIcon />}
            aria-label="Refrescar datos"
            onClick={handleRefresh}
            colorScheme="teal"
            variant="outline"
            size="sm"
          />
          <ButtonGroup size="sm" isAttached variant="outline">
            <Button 
              colorScheme="green" 
              leftIcon={<AddIcon />}
              onClick={navigateToAddIncome}
            >
              Ingreso
            </Button>
            <Button 
              colorScheme="red" 
              leftIcon={<AddIcon />}
              onClick={navigateToAddExpense}
            >
              Egreso
            </Button>
          </ButtonGroup>
        </HStack>
      </Flex>
      
      {/* Period Selectors */}
      <Flex 
        direction={{ base: "column", md: "row" }} 
        justify="space-between" 
        align="center" 
        mb={8}
      >
        <Tabs index={period === 'month' ? 0 : 1} onChange={(index) => setPeriod(index === 0 ? 'month' : 'year')} variant="soft-rounded" colorScheme="teal" mb={{ base: 4, md: 0 }}>
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
      
      {/* Financial Summary */}
      {summaryError && (
        <Alert status="error" variant="left-accent" mb={6}>
          <AlertIcon />
          Error al cargar la información financiera. Por favor intenta nuevamente.
        </Alert>
      )}
      
      <Box mb={8}>
        <FinancialSummary 
          period={period}
          year={selectedYear}
          month={selectedMonth}
          onPeriodChange={handlePeriodChange}
        />
      </Box>
      
      {/* Quick Stats */}
      <Heading as="h2" size="md" mb={4}>
        Transacciones Recientes
      </Heading>
      
      {/* Error alerts for transactions */}
      {(incomesError || expensesError) && (
        <Alert status="error" variant="left-accent" mb={6}>
          <AlertIcon />
          Error al cargar las transacciones recientes. Por favor intenta nuevamente.
        </Alert>
      )}
      
      {/* Recent Transactions */}
      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6} mb={8}>
        {/* Recent Incomes */}
        <Box p={5} borderRadius="lg" boxShadow="md" bg={cardBg}>
          <Flex justify="space-between" align="center" mb={4}>
            <Heading as="h3" size="md">
              Ingresos Recientes
            </Heading>
            <NextLink href="/ingresos" passHref>
              <Button as="a" size="sm" colorScheme="green" variant="outline">
                Ver todos
              </Button>
            </NextLink>
          </Flex>
          
          {incomesLoading ? (
            <Flex justify="center" py={6}>
              <Spinner size="md" color="green.500" />
            </Flex>
          ) : incomesData?.items?.length > 0 ? (
            <VStack spacing={0} align="stretch">
              {incomesData.items.map((ingreso) => (
                <Flex 
                  key={ingreso.id} 
                  justify="space-between" 
                  p={3} 
                  borderBottom="1px solid" 
                  borderColor={borderColor}
                  _hover={{ bg: useColorModeValue('gray.50', 'gray.700') }}
                >
                  <Box>
                    <Text fontWeight="medium">
                      {ingreso.descripcion || 'Sin descripción'}
                    </Text>
                    <Text fontSize="sm" color="gray.500">
                      {formatDate(ingreso.fecha)}
                    </Text>
                  </Box>
                  <Text fontWeight="bold" color="green.500">
                    +{formatCurrency(parseFloat(ingreso.monto))}
                  </Text>
                </Flex>
              ))}
            </VStack>
          ) : (
            <Text color="gray.500" py={4} textAlign="center">
              No hay ingresos registrados
            </Text>
          )}
          
          <Flex justify="center" mt={4}>
            <Button
              size="sm"
              colorScheme="green"
              variant="solid"
              leftIcon={<AddIcon />}
              onClick={navigateToAddIncome}
            >
              Registrar nuevo ingreso
            </Button>
          </Flex>
        </Box>
        
        {/* Recent Expenses */}
        <Box p={5} borderRadius="lg" boxShadow="md" bg={cardBg}>
          <Flex justify="space-between" align="center" mb={4}>
            <Heading as="h3" size="md">
              Egresos Recientes
            </Heading>
            <NextLink href="/egresos" passHref>
              <Button as="a" size="sm" colorScheme="red" variant="outline">
                Ver todos
              </Button>
            </NextLink>
          </Flex>
          
          {expensesLoading ? (
            <Flex justify="center" py={6}>
              <Spinner size="md" color="red.500" />
            </Flex>
          ) : expensesData?.items?.length > 0 ? (
            <VStack spacing={0} align="stretch">
              {expensesData.items.map((egreso) => (
                <Flex 
                  key={egreso.id} 
                  justify="space-between" 
                  p={3} 
                  borderBottom="1px solid" 
                  borderColor={borderColor}
                  _hover={{ bg: useColorModeValue('gray.50', 'gray.700') }}
                >
                  <Box>
                    <Text fontWeight="medium">
                      {egreso.descripcion || 'Sin descripción'}
                    </Text>
                    <Text fontSize="sm" color="gray.500">
                      {formatDate(egreso.fecha)}
                    </Text>
                  </Box>
                  <Text fontWeight="bold" color="red.500">
                    -{formatCurrency(parseFloat(egreso.monto))}
                  </Text>
                </Flex>
              ))}
            </VStack>
          ) : (
            <Text color="gray.500" py={4} textAlign="center">
              No hay egresos registrados
            </Text>
          )}
          
          <Flex justify="center" mt={4}>
            <Button
              size="sm"
              colorScheme="red"
              variant="solid"
              leftIcon={<AddIcon />}
              onClick={navigateToAddExpense}
            >
              Registrar nuevo egreso
            </Button>
          </Flex>
        </Box>
      </SimpleGrid>
      
      {/* Quick Actions */}
      <Box mb={8}>
        <Heading as="h2" size="md" mb={4}>
          Acciones Rápidas
        </Heading>
        <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4}>
          <Button 
            height="100px"
            colorScheme="green" 
            leftIcon={<AddIcon />}
            onClick={navigateToAddIncome}
            variant="outline"
          >
            Registrar Ingreso
          </Button>
          <Button 
            height="100px"
            colorScheme="red" 
            leftIcon={<AddIcon />}
            onClick={navigateToAddExpense}
            variant="outline"
          >
            Registrar Egreso
          </Button>
          <NextLink href="/reportes" passHref>
            <Button 
              as="a"
              height="100px"
              colorScheme="blue" 
              variant="outline"
            >
              Ver Reportes Detallados
            </Button>
          </NextLink>
          <NextLink href="/settings" passHref>
            <Button 
              as="a"
              height="100px"
              colorScheme="gray" 
              variant="outline"
            >
              Configuraciones
            </Button>
          </NextLink>
        </SimpleGrid>
      </Box>
    </Box>
  );
}
