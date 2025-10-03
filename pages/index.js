import { useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import debounce from 'lodash/debounce';
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
  Code,
} from '@chakra-ui/react';

// Dynamic imports for components that might use portals
const DynamicAlert = dynamic(() => import('@chakra-ui/react').then(mod => mod.Alert), { ssr: false });
const DynamicAlertIcon = dynamic(() => import('@chakra-ui/react').then(mod => mod.AlertIcon), { ssr: false });

// Constants
const DEBOUNCE_MS = 500;

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
// FinancialSummary will be dynamically imported
// import FinancialSummary from '../components/FinancialSummary'; 
import YearSelector from '../components/YearSelector';
import MonthSelector from '../components/MonthSelector';

const StaticPlaceholder = ({ text, bgColor = 'white', textColor = 'gray.600' }) => (
  <Flex 
    justify="center" 
    align="center" 
    p={10} 
    borderRadius="lg" 
    boxShadow="md" 
    bg={bgColor}
    color={textColor}
  >
    <Spinner size="md" thickness="4px" speed="0.65s" color="teal.500" mr={4} />
    <Text>{text}</Text>
  </Flex>
);

const DynamicFinancialSummary = dynamic(() => import('../components/FinancialSummary'), { 
  ssr: false,
  loading: () => <StaticPlaceholder text="Cargando resumen..." /> 
});

// Safe client-side only date component
const SafeDate = ({ date, formatStr, options }) => {
  const [formattedDate, setFormattedDate] = useState('');
  
  useEffect(() => {
    if (date) {
      setFormattedDate(format(new Date(date), formatStr, options));
    }
  }, [date, formatStr, options]);
  
  // Return simple text during SSR
  if (!formattedDate) return <Text fontSize="sm" color="gray.500">Cargando fecha...</Text>;
  
  return <Text fontSize="sm" color="gray.500">{formattedDate}</Text>;
};

export default function Dashboard() {
  // State management - prioritize isClient initialization
  const [isClient, setIsClient] = useState(false);
  const [period, setPeriod] = useState('month');
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [tabIndex, setTabIndex] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [errorInfo, setErrorInfo] = useState(null);
  const [welcomeMessage, setWelcomeMessage] = useState('Cargando bienvenida...'); // Static initial message
  // Hooks
  const { user } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const cardBg = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const hoverBg = useColorModeValue('gray.50', 'gray.700');
  
  // Memoize request parameters to prevent recreating on every render
  const requestParams = useMemo(() => ({
    limit: 5,
    page: 1,
    sortBy: 'fecha',
    sortDir: 'desc'
  }), []); // Empty dependency array since these values never change
  
  // Initialize client-side only state with window check
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const now = new Date();
      setSelectedYear(now.getFullYear());
      setSelectedMonth(now.getMonth() + 1);
      setIsClient(true);
    }
  }, []); 

  useEffect(() => {
    if (isClient) { // Only run this effect on the client
      if (user) {
        setWelcomeMessage(`Bienvenido, ${user.nombre || 'Usuario'}`);
      } else {
        // If user is null after client initialization, you might want a different message
        // or stick to a generic loading/guest message.
        setWelcomeMessage('Bienvenido Visitante'); 
      }
    }
  }, [isClient, user]); // Depend on isClient and user state
  // Flag for API enablement - prevents unnecessary API calls during SSR or initial render
  const fetchEnabled = isClient && selectedYear !== null;
  
  // Shared configuration for all data fetching hooks
  const sharedHookConfig = useMemo(() => ({
    enabled: fetchEnabled,
    cacheTime: 1000 * 60 * 10, // Cache for 10 minutes
    staleTime: 1000 * 60 * 5,  // Consider data stale after 5 minutes
    dedupingInterval: 800,     // Prevent duplicate requests within 800ms - increased to ensure better deduplication
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnReconnect: false,   // Don't refetch on reconnect
    retryCount: 1,              // Only retry once to prevent excessive requests
    retryDelay: 2000,           // Wait 2 seconds before retrying
  }), [fetchEnabled]);
  
  // Memoize date params for summary data
  const dateParams = useMemo(() => ({
    groupBy: period,
    year: selectedYear,
    month: period === 'month' ? selectedMonth : undefined,
    _requestId: `${period}-${selectedYear}-${selectedMonth}` // Add a unique identifier to prevent duplicate requests
  }), [period, selectedYear, selectedMonth]);
  
  // Single effect to update date params when period changes
  const handlePeriodChangeDebounced = useCallback(
    debounce((newPeriod) => {
      console.log(`Period changed to ${newPeriod}`);
      setPeriod(newPeriod);
    }, DEBOUNCE_MS),
    []
  );
  
  // Handle year change with debounce
  const handleYearChangeDebounced = useCallback(
    debounce((year) => {
      console.log(`Year changed to ${year}`);
      setSelectedYear(year);
    }, DEBOUNCE_MS),
    []
  );
  
  // Handle month change with debounce
  const handleMonthChangeDebounced = useCallback(
    debounce((month) => {
      console.log(`Month changed to ${month}`);
      setSelectedMonth(month);
    }, DEBOUNCE_MS),
    []
  );
  
  // Clean up debounce handlers on unmount
  useEffect(() => {
    return () => {
      handlePeriodChangeDebounced.cancel();
      handleYearChangeDebounced.cancel();
      handleMonthChangeDebounced.cancel();
    };
  }, [handlePeriodChangeDebounced, handleYearChangeDebounced, handleMonthChangeDebounced]);
  
  // Fetch financial summary data
  const { 
    data: summaryData, 
    loading: summaryLoading, 
    error: summaryError,
    status: summaryStatus,
    refetch: refetchSummary,
    invalidateCache: invalidateSummaryCache
  } = useFinancialData(
    '/api/reportes/totales', 
    dateParams,
    sharedHookConfig
  );
  
  // Fetch recent income transactions with pagination - using different fetch timing
  const { 
    data: incomesData, 
    loading: incomesLoading, 
    error: incomesError,
    status: incomesStatus,
    refetch: refetchIncomes
  } = useFinancialData(
    '/api/ingresos', 
    requestParams,
    {
      ...sharedHookConfig,
      // Only fetch after summary data is loaded to prevent simultaneous requests
      enabled: fetchEnabled && (summaryStatus === 'success' || summaryStatus === 'error'),
      // Add a small delay to stagger requests and prevent simultaneous loading
      initialFetchDelay: 300
    }
  );
  
  // Fetch recent expense transactions with pagination - using different fetch timing
  const { 
    data: expensesData, 
    loading: expensesLoading, 
    error: expensesError,
    status: expensesStatus,
    refetch: refetchExpenses
  } = useFinancialData(
    '/api/egresos', 
    requestParams,
    {
      ...sharedHookConfig,
      // Only fetch after incomes data is loaded to create a sequence of requests
      enabled: fetchEnabled && (incomesStatus === 'success' || incomesStatus === 'error'),
      // Add a small delay to stagger requests and prevent simultaneous loading
      initialFetchDelay: 600
    }
  );
  
  // Handle period change (month/year) with debouncing
  const handlePeriodChange = (newPeriod) => {
    // Avoid unnecessary updates if period hasn't changed
    if (newPeriod === period) return;
    
    // Use debounced version to prevent rapid changes
    handlePeriodChangeDebounced(newPeriod);
  };
  
  // Handle year change with debouncing
  const handleYearChange = (year) => {
    // Avoid unnecessary updates if year hasn't changed
    if (year === selectedYear) return;
    
    // Use debounced version to prevent rapid changes
    handleYearChangeDebounced(year);
  };
  
  // Handle month change with debouncing
  const handleMonthChange = (month) => {
    // Avoid unnecessary updates if month hasn't changed
    if (month === selectedMonth) return;
    
    // Use debounced version to prevent rapid changes
    handleMonthChangeDebounced(month);
  };
  
  // Handle tab change
  const handleTabChange = (index) => {
    setTabIndex(index);
  };
  
  // Format date to Spanish locale - use only for client-side pre-rendering
  const formatDate = (dateString) => {
    if (!isClient) return 'Cargando...';
    try {
      return format(new Date(dateString), 'PPP', { locale: es });
    } catch (error) {
      return 'Fecha inválida';
    }
  };
  
  // Format currency - safe for SSR
  const formatCurrency = (amount) => {
    if (!isClient) return '...';
    try {
      return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
        minimumFractionDigits: 2,
      }).format(amount);
    } catch (error) {
      console.error('Error formatting currency:', error, 'Amount:', amount);
      return 'Error';
    }
  };
  
  // Client-side only period text component
  const PeriodText = () => {
    const [text, setText] = useState('');
    
    useEffect(() => {
      if (period === 'month' && selectedYear && selectedMonth) {
        setText(format(new Date(selectedYear, selectedMonth - 1), 'MMMM yyyy', { locale: es }));
      } else if (selectedYear) {
        setText(selectedYear.toString());
      }
    }, [period, selectedYear, selectedMonth]);
    
    if (!text) return <Text>Cargando...</Text>;
    return <Text>{text}</Text>;
  };
  
  // Enhanced refresh function that updates all data with proper sequencing
  const handleRefresh = useCallback(() => {
    if (fetchEnabled) {
      // Show toast notification
      toast({
        title: "Actualizando datos",
        description: "Los datos financieros están siendo actualizados",
        status: "info",
        duration: 3000,
        isClosable: true,
      });
      
      // Reset error states
      setHasError(false);
      setErrorInfo(null);
      
      // First invalidate and refetch summary data
      invalidateSummaryCache()
        // Add delay between requests to prevent flooding the server
        .then(() => new Promise(resolve => setTimeout(() => resolve(), 500)))
        .then(() => {
          // Then refetch transactions data sequentially to prevent simultaneous requests
          return refetchIncomes({ force: true });
        })
        // Add delay between requests to prevent flooding the server
        .then(() => new Promise(resolve => setTimeout(() => resolve(), 500)))
        .then(() => {
          return refetchExpenses({ force: true });
        })
        .then(() => {
          toast({
            title: "Datos actualizados",
            description: "La información financiera ha sido actualizada correctamente",
            status: "success",
            duration: 3000,
            isClosable: true,
          });
        })
        .catch(error => {
          console.error("Error refreshing data:", error);
          toast({
            title: "Error al actualizar",
            description: "No se pudieron actualizar todos los datos. Intente nuevamente.",
            status: "error",
            duration: 4000,
            isClosable: true,
          });
        });
    }
  }, [
    fetchEnabled, 
    toast, 
    invalidateSummaryCache, 
    refetchIncomes, 
    refetchExpenses
  ]);
  
  // Navigate to register income page
  const navigateToAddIncome = () => {
    router.push('/ingresos/nuevo');
  };
  
  // Navigate to register expense page
  const navigateToAddExpense = () => {
    router.push('/egresos/nuevo');
  };
  
  // Memoize styles to prevent recreating objects on every render
  const memoizedStyles = useMemo(() => ({
    itemHoverStyle: {
      bg: hoverBg
    },
    loadingFlexStyle: {
      justify: "center",
      align: "center",
      height: "60vh",
      direction: "column"
    }
  }), [hoverBg]);

  // Render functions for list items
  const renderIncomeItem = (ingreso) => (
    <Flex 
      key={ingreso.id} 
      justify="space-between" 
      p={3} 
      borderBottom="1px solid" 
      borderColor={borderColor}
      _hover={memoizedStyles.itemHoverStyle}
    >
      <Box>
        <Text fontWeight="medium">
          {ingreso.descripcion || 'Sin descripción'}
        </Text>
        <SafeDate 
          date={ingreso.fecha} 
          formatStr="PPP" 
          options={{ locale: es }} 
        />
      </Box>
      <Text fontWeight="bold" color="green.500">
        +{formatCurrency(parseFloat(ingreso.monto))}
      </Text>
    </Flex>
  );

  const renderExpenseItem = (egreso) => (
    <Flex 
      key={egreso.id} 
      justify="space-between" 
      p={3} 
      borderBottom="1px solid" 
      borderColor={borderColor}
      _hover={memoizedStyles.itemHoverStyle}
    >
      <Box>
        <Text fontWeight="medium">
          {egreso.descripcion || 'Sin descripción'}
        </Text>
        <SafeDate 
          date={egreso.fecha} 
          formatStr="PPP" 
          options={{ locale: es }} 
        />
      </Box>
      <Text fontWeight="bold" color="red.500">
        -{formatCurrency(parseFloat(egreso.monto))}
      </Text>
    </Flex>
  );
  
  // Memoized loading and error states to prevent unnecessary rerenders
  const loadingStates = useMemo(() => ({
    anySummaryLoading: summaryLoading,
    anyTransactionsLoading: incomesLoading || expensesLoading,
    anyLoading: summaryLoading || incomesLoading || expensesLoading,
    allLoaded: !summaryLoading && !incomesLoading && !expensesLoading && summaryData !== null
  }), [summaryLoading, incomesLoading, expensesLoading, summaryData]);
  
  // Consolidated error handling 
  useEffect(() => {
    if (fetchEnabled) {
      const anyError = summaryError || incomesError || expensesError;
      
      if (anyError) {
        setHasError(true);
        // Determine which error to display based on priority
        const errorToShow = summaryError || incomesError || expensesError;
        setErrorInfo(typeof errorToShow === 'string' 
          ? errorToShow 
          : errorToShow?.message || 'Error desconocido en la carga de datos');

        // Log detailed error information for debugging
        console.error('Dashboard error details:', {
          summaryError,
          incomesError,
          expensesError,
          timestamp: new Date().toISOString()
        });

        // Show error toast only once
        toast({
          title: 'Error al cargar datos',
          description: 'Algunos datos no pudieron ser cargados correctamente',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      } else {
        // Reset error state if all data loads successfully
        setHasError(false);
        setErrorInfo(null);
      }
    }
  }, [fetchEnabled, summaryError, incomesError, expensesError, toast]);

  // Primary Guard: Handles SSR. Server sends this, client's first paint matches this.
  if (!isClient) {
    return (
      <Flex {...memoizedStyles.loadingFlexStyle}>
        <Spinner size="xl" thickness="4px" speed="0.65s" color="teal.500" mb={4} />
        <Text>Cargando...</Text> {/* Server-rendered content */}
      </Flex>
    );
  }

  // Secondary Guard: Client is active, but essential date state for fetching might not be ready yet.
  // (selectedYear is set in useEffect, so fetchEnabled will be false on the first render after isClient becomes true)
  if (!fetchEnabled) { 
    return (
      <Flex {...memoizedStyles.loadingFlexStyle}>
        <Spinner size="xl" thickness="4px" speed="0.65s" color="teal.500" mb={4} />
        <Text>Configurando dashboard...</Text> {/* Placeholder until dates are set */}
      </Flex>
    );
  }

  // Tertiary Guard: Client active, dates set, but critical summary data is loading.
  // This ensures the main structure doesn't try to render without summary info.
  if (summaryLoading) {
    return (
      <Flex {...memoizedStyles.loadingFlexStyle}>
        <Spinner size="xl" thickness="4px" speed="0.65s" color="teal.500" mb={4} />
        <Text>Cargando información financiera...</Text>
      </Flex>
    );
  }

  // Global Error Fallback for critical summary data:
  // If summaryError occurred and we have no summaryData, it's a critical failure.
  if (summaryError && !summaryData) {
    return (
      <Flex direction="column" align="center" justify="center" height="60vh">
        <DynamicAlert status="error" variant="left-accent" mb={6} width="100%" maxWidth="800px">
          <DynamicAlertIcon />
          <VStack align="start" spacing={2}>
            <Text fontWeight="bold">Error Crítico al Cargar Datos del Dashboard</Text>
            <Text>No se pudo cargar la información esencial. Por favor, intente recargar la página.</Text>
            {errorInfo && ( // errorInfo should be set by the useEffect for errors
              <Code p={2} width="100%">
                {typeof errorInfo === 'object' ? JSON.stringify(errorInfo, null, 2) : errorInfo.toString()}
              </Code>
            )}
            <Button colorScheme="red" onClick={() => window.location.reload()} mt={4}>
              Reintentar
            </Button>
          </VStack>
        </DynamicAlert>
      </Flex>
    );
  }
  
  // If we reach here:
  // - isClient is true
  // - fetchEnabled is true (selectedYear and selectedMonth are set)
  // - summaryData is NOT loading (either loaded or errored but with some old data potentially)

  // Main dashboard content:
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
            {welcomeMessage}
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
          <Box>
            {isClient ? <PeriodText /> : <Text>Cargando...</Text>}
          </Box>
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
      {isClient && summaryError && (
        <DynamicAlert status="error" variant="left-accent" mb={6}>
          <DynamicAlertIcon />
          <VStack align="start" spacing={1} width="100%">
            <Text fontWeight="bold">Error al cargar la información financiera</Text>
            <Text>Por favor intenta nuevamente.</Text>
            <Code fontSize="xs" p={1} mt={2} width="100%">
              {summaryError.toString()}
            </Code>
          </VStack>
        </DynamicAlert>
      )}
      
      <Box mb={8}>
      {!fetchEnabled ? (
        // Case 1: Not client-side yet, or selectedYear is null (fetch not enabled)
        // Server renders this, client initial render matches this.
        <StaticPlaceholder text="Seleccione un período para ver el resumen." />
      ) : summaryLoading ? (
        // Case 2: Client-side, fetch enabled, and summary is loading
        <StaticPlaceholder text="Cargando datos del resumen..." />
      ) : summaryError ? (
        // Case 3: Client-side, fetch enabled, and there's an error
        <DynamicAlert status="error" variant="left-accent" mb={6}>
          <DynamicAlertIcon />
          <VStack align="start" spacing={1} width="100%">
            <Text fontWeight="bold">Error al cargar la información financiera</Text>
            <Text>Por favor intenta nuevamente.</Text>
            <Code fontSize="xs" p={1} mt={2} width="100%">
              {summaryError.toString()}
            </Code>
          </VStack>
        </DynamicAlert>
      ) : summaryData ? (
        // Case 4: Client-side, fetch enabled, no error, data available
        <Box 
          position="relative" 
          onError={(e) => {
            console.error('Error in FinancialSummary container:', e);
            setHasError(true); 
            setErrorInfo(e);
          }}
        >
          <DynamicFinancialSummary 
            period={period}
            year={selectedYear}
            month={selectedMonth}
            onPeriodChange={handlePeriodChange}
          />
        </Box>
      ) : (
        // Case 5: Client-side, fetch enabled, not loading, no error, but no data (e.g. API returned empty)
        <StaticPlaceholder text="No hay datos de resumen disponibles para el período seleccionado." />
      )}
    </Box>
      
      {/* Quick Stats */}
      <Heading as="h2" size="md" mb={4}>
        Transacciones Recientes
      </Heading>
      
      {/* Error alerts for transactions */}
      {isClient && (incomesError || expensesError) && (
        <DynamicAlert status="error" variant="left-accent" mb={6}>
          <DynamicAlertIcon />
          <VStack align="start" spacing={1} width="100%">
            <Text fontWeight="bold">Error al cargar las transacciones recientes</Text>
            <Text>Por favor intenta nuevamente.</Text>
            {incomesError && (
              <Code fontSize="xs" p={1} mt={1} width="100%">
                Ingresos: {incomesError.toString()}
              </Code>
            )}
            {expensesError && (
              <Code fontSize="xs" p={1} mt={1} width="100%">
                Egresos: {expensesError.toString()}
              </Code>
            )}
          </VStack>
        </DynamicAlert>
      )}
      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6} mb={8}>
        {/* Recent Incomes */}
        <Box p={5} borderRadius="lg" boxShadow="md" bg={cardBg}>
          <Flex justify="space-between" align="center" mb={4}>
            <Heading as="h3" size="md">Ingresos Recientes</Heading>
            <NextLink href="/ingresos" passHref><Button as="a" size="sm" colorScheme="green" variant="outline">Ver todos</Button></NextLink>
          </Flex>
          {incomesLoading ? (
            <Flex justify="center" py={6}><Spinner size="md" color="green.500" /></Flex>
          ) : incomesData?.items?.length > 0 ? (
            <VStack spacing={0} align="stretch">{incomesData.items.map(renderIncomeItem)}</VStack>
          ) : (
            <Text color="gray.500" py={4} textAlign="center">No hay ingresos registrados</Text>
          )}
          <Flex justify="center" mt={4}><Button size="sm" colorScheme="green" variant="solid" leftIcon={<AddIcon />} onClick={navigateToAddIncome}>Registrar nuevo ingreso</Button></Flex>
        </Box>
        
        {/* Recent Expenses */}
        <Box p={5} borderRadius="lg" boxShadow="md" bg={cardBg}>
          <Flex justify="space-between" align="center" mb={4}>
            <Heading as="h3" size="md">Egresos Recientes</Heading>
            <NextLink href="/egresos" passHref><Button as="a" size="sm" colorScheme="red" variant="outline">Ver todos</Button></NextLink>
          </Flex>
          {expensesLoading ? (
            <Flex justify="center" py={6}><Spinner size="md" color="red.500" /></Flex>
          ) : expensesData?.items?.length > 0 ? (
            <VStack spacing={0} align="stretch">{expensesData.items.map(renderExpenseItem)}</VStack>
          ) : (
            <Text color="gray.500" py={4} textAlign="center">No hay egresos registrados</Text>
          )}
          <Flex justify="center" mt={4}><Button size="sm" colorScheme="red" variant="solid" leftIcon={<AddIcon />} onClick={navigateToAddExpense}>Registrar nuevo egreso</Button></Flex>
        </Box>
      </SimpleGrid>
      
      {/* Quick Actions */}
      <Box mb={8}>
        <Heading as="h2" size="md" mb={4}>Acciones Rápidas</Heading>
        <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4}>
          <Button height="100px" colorScheme="green" leftIcon={<AddIcon />} onClick={navigateToAddIncome} variant="outline">Registrar Ingreso</Button>
          <Button height="100px" colorScheme="red" leftIcon={<AddIcon />} onClick={navigateToAddExpense} variant="outline">Registrar Egreso</Button>
          <NextLink href="/reportes" passHref><Button as="a" height="100px" colorScheme="blue" variant="outline">Ver Reportes Detallados</Button></NextLink>
          <NextLink href="/settings" passHref><Button as="a" height="100px" colorScheme="gray" variant="outline">Configuraciones</Button></NextLink>
        </SimpleGrid>
      </Box>
    </Box>
  );
}
