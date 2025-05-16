import { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Text,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  HStack,
  VStack,
  Flex,
  Grid,
  GridItem,
  Input,
  Select,
  FormControl,
  FormLabel,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Spinner,
  Alert,
  AlertIcon,
  useColorModeValue,
  Badge,
  IconButton,
} from '@chakra-ui/react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import axios from 'axios';
import { ChevronLeftIcon, ChevronRightIcon, SearchIcon, RepeatIcon } from '@chakra-ui/icons';
import TransactionForm from '../components/TransactionForm';

export default function IngresosPage() {
  // State for income data and pagination
  const [ingresos, setIngresos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalItems: 0,
    totalPages: 0,
  });

  // State for filters
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    minAmount: '',
    maxAmount: '',
    sortBy: 'fecha',
    sortDir: 'desc',
  });

  // Modal for adding new income
  const { isOpen, onOpen, onClose } = useDisclosure();
  
  // UI theme colors
  const bgColor = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  // Fetch incomes with current filters and pagination
  const fetchIngresos = async () => {
    setLoading(true);
    setError(null);

    try {
      // Build query parameters
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        sortBy: filters.sortBy,
        sortDir: filters.sortDir,
      });

      // Add optional filters if they exist
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.minAmount) params.append('minAmount', filters.minAmount);
      if (filters.maxAmount) params.append('maxAmount', filters.maxAmount);

      // Make API request
      const { data } = await axios.get(`/api/ingresos?${params.toString()}`);
      
      // Update state with fetched data
      setIngresos(data.data);
      setPagination({
        page: data.pagination.page,
        limit: data.pagination.limit,
        totalItems: data.pagination.totalItems,
        totalPages: data.pagination.totalPages,
      });
    } catch (err) {
      console.error('Error fetching ingresos:', err);
      setError('Error al cargar los ingresos. Por favor intente de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  // Initial load of data
  useEffect(() => {
    fetchIngresos();
  }, [pagination.page, filters.sortBy, filters.sortDir]);

  // Handle filter form submission
  const handleFilterSubmit = (e) => {
    e.preventDefault();
    // Reset to first page when applying new filters
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchIngresos();
  };

  // Reset all filters
  const handleResetFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      minAmount: '',
      maxAmount: '',
      sortBy: 'fecha',
      sortDir: 'desc',
    });
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchIngresos();
  };

  // Pagination handlers
  const handlePreviousPage = () => {
    if (pagination.page > 1) {
      setPagination(prev => ({ ...prev, page: prev.page - 1 }));
    }
  };

  const handleNextPage = () => {
    if (pagination.page < pagination.totalPages) {
      setPagination(prev => ({ ...prev, page: prev.page + 1 }));
    }
  };

  // Form success handler
  const handleSuccess = () => {
    onClose();
    fetchIngresos();
  };

  return (
    <Box>
      {/* Header with title and add button */}
      <Flex justifyContent="space-between" alignItems="center" mb={6}>
        <Heading as="h1" size="xl">
          Ingresos
        </Heading>
        <Button colorScheme="green" onClick={onOpen}>
          Nuevo Ingreso
        </Button>
      </Flex>

      {/* Error alert */}
      {error && (
        <Alert status="error" mb={4}>
          <AlertIcon />
          {error}
        </Alert>
      )}

      {/* Filters section */}
      <Box mb={6} p={4} bg={bgColor} borderRadius="md" boxShadow="sm">
        <form onSubmit={handleFilterSubmit}>
          <Grid templateColumns={{ base: "repeat(1, 1fr)", md: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" }} gap={4}>
            <GridItem>
              <FormControl>
                <FormLabel fontSize="sm">Fecha Inicio</FormLabel>
                <Input 
                  type="date" 
                  value={filters.startDate}
                  onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                  size="sm"
                />
              </FormControl>
            </GridItem>
            
            <GridItem>
              <FormControl>
                <FormLabel fontSize="sm">Fecha Fin</FormLabel>
                <Input 
                  type="date" 
                  value={filters.endDate}
                  onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                  size="sm"
                />
              </FormControl>
            </GridItem>
            
            <GridItem>
              <FormControl>
                <FormLabel fontSize="sm">Monto Mínimo</FormLabel>
                <Input 
                  type="number" 
                  placeholder="0.00"
                  value={filters.minAmount}
                  onChange={(e) => setFilters(prev => ({ ...prev, minAmount: e.target.value }))}
                  size="sm"
                />
              </FormControl>
            </GridItem>
            
            <GridItem>
              <FormControl>
                <FormLabel fontSize="sm">Monto Máximo</FormLabel>
                <Input 
                  type="number" 
                  placeholder="0.00"
                  value={filters.maxAmount}
                  onChange={(e) => setFilters(prev => ({ ...prev, maxAmount: e.target.value }))}
                  size="sm"
                />
              </FormControl>
            </GridItem>
          </Grid>
          
          <Flex mt={4} justifyContent="space-between">
            <HStack>
              <FormControl width="auto">
                <Select 
                  size="sm"
                  value={filters.sortBy}
                  onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                >
                  <option value="fecha">Ordenar por Fecha</option>
                  <option value="monto">Ordenar por Monto</option>
                  <option value="descripcion">Ordenar por Descripción</option>
                </Select>
              </FormControl>
              
              <FormControl width="auto">
                <Select 
                  size="sm"
                  value={filters.sortDir}
                  onChange={(e) => setFilters(prev => ({ ...prev, sortDir: e.target.value }))}
                >
                  <option value="desc">Descendente</option>
                  <option value="asc">Ascendente</option>
                </Select>
              </FormControl>
            </HStack>
            
            <HStack>
              <Button leftIcon={<RepeatIcon />} onClick={handleResetFilters} size="sm" variant="ghost">
                Limpiar
              </Button>
              <Button leftIcon={<SearchIcon />} type="submit" colorScheme="blue" size="sm">
                Filtrar
              </Button>
            </HStack>
          </Flex>
        </form>
      </Box>

      {/* Loading state */}
      {loading ? (
        <Flex justify="center" my={10}>
          <Spinner size="xl" thickness="4px" speed="0.65s" color="green.500" />
        </Flex>
      ) : ingresos.length === 0 ? (
        <Box textAlign="center" my={10} p={6} bg={bgColor} borderRadius="md" boxShadow="sm">
          <Text fontSize="lg" color="gray.500">
            No hay ingresos registrados para los filtros seleccionados.
          </Text>
          <Button mt={4} colorScheme="green" onClick={onOpen}>
            Registrar mi primer ingreso
          </Button>
        </Box>
      ) : (
        <>
          {/* Income table */}
          <Box overflowX="auto" bg={bgColor} borderRadius="md" boxShadow="sm">
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>Fecha</Th>
                  <Th>Descripción</Th>
                  <Th isNumeric>Monto</Th>
                </Tr>
              </Thead>
              <Tbody>
                {ingresos.map((ingreso) => (
                  <Tr key={ingreso.id}>
                    <Td>{format(new Date(ingreso.fecha), 'dd/MM/yyyy', { locale: es })}</Td>
                    <Td>{ingreso.descripcion || '(Sin descripción)'}</Td>
                    <Td isNumeric fontWeight="bold" color="green.500">
                      ${parseFloat(ingreso.monto).toFixed(2)}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
          
          {/* Pagination controls */}
          <Flex justify="space-between" align="center" mt={4} mb={8}>
            <HStack>
              <FormControl width="auto">
                <Select
                  size="sm"
                  value={pagination.limit}
                  onChange={(e) => {
                    setPagination(prev => ({ 
                      ...prev, 
                      limit: Number(e.target.value),
                      page: 1 // Reset to first page when changing limit
                    }));
                    fetchIngresos();
                  }}
                >
                  <option value="10">10 por página</option>
                  <option value="25">25 por página</option>
                  <option value="50">50 por página</option>
                  <option value="100">100 por página</option>
                </Select>
              </FormControl>
              <Text fontSize="sm" color="gray.600">
                Mostrando {ingresos.length} de {pagination.totalItems} registros
              </Text>
            </HStack>
            
            <HStack>
              <IconButton
                icon={<ChevronLeftIcon />}
                onClick={handlePreviousPage}
                isDisabled={pagination.page <= 1}
                aria-label="Página anterior"
                size="sm"
              />
              <Text fontSize="sm" fontWeight="medium">
                Página {pagination.page} de {pagination.totalPages || 1}
              </Text>
              <IconButton
                icon={<ChevronRightIcon />}
                onClick={handleNextPage}
                isDisabled={pagination.page >= pagination.totalPages}
                aria-label="Página siguiente"
                size="sm"
              />
            </HStack>
          </Flex>
        </>
      )}

      <Modal isOpen={isOpen} onClose={onClose} size="md">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Registrar Nuevo Ingreso</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <TransactionForm type="ingreso" onSuccess={handleSuccess} />
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
}
