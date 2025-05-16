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

export default function EgresosPage() {
  // State for expenses data and pagination
  const [egresos, setEgresos] = useState([]);
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

  // Modal for adding new expense
  const { isOpen, onOpen, onClose } = useDisclosure();
  
  // UI theme colors
  const bgColor = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  // Fetch expenses with current filters and pagination
  const fetchEgresos = async () => {
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
      const { data } = await axios.get(`/api/egresos?${params.toString()}`);
      
      // Update state with fetched data
      setEgresos(data.data);
      setPagination({
        page: data.pagination.page,
        limit: data.pagination.limit,
        totalItems: data.pagination.totalItems,
        totalPages: data.pagination.totalPages,
      });
    } catch (err) {
      console.error('Error fetching egresos:', err);
      setError('Error al cargar los egresos. Por favor intente de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  // Initial load of data
  useEffect(() => {
    fetchEgresos();
  }, [pagination.page, filters.sortBy, filters.sortDir]);

  // Handle filter form submission
  const handleFilterSubmit = (e) => {
    e.preventDefault();
    // Reset to first page when applying new filters
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchEgresos();
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
    fetchEgresos();
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
    fetchEgresos();
  };

  return (
    <Box>
      {/* Header with title and add button */}
      <Flex justifyContent="space-between" alignItems="center" mb={6}>
        <Heading as="h1" size="xl">
          Egresos
        </Heading>
        <Button colorScheme="red" onClick={onOpen}>
          Nuevo Egreso
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
          <Spinner size="xl" thickness="4px" speed="0.65s" color="red.500" />
        </Flex>
      ) : egresos.length === 0 ? (
        <Box textAlign="center" my={10} p={6} bg={bgColor} borderRadius="md" boxShadow="sm">
          <Text fontSize="lg" color="gray.500">
            No hay egresos registrados para los filtros seleccionados.
          </Text>
          <Button mt={4} colorScheme="red" onClick={onOpen}>
            Registrar mi primer egreso
          </Button>
        </Box>
      ) : (
        <>
          {/* Expenses table */}
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
                {egresos.map((egreso) => (
                  <Tr key={egreso.id}>
                    <Td>{format(new Date(egreso.fecha), 'dd/MM/yyyy', { locale: es })}</Td>
                    <Td>{egreso.descripcion || '(Sin descripción)'}</Td>
                    <Td isNumeric fontWeight="bold" color="red.500">
                      ${parseFloat(egreso.monto).toFixed(2)}
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
                    fetchEgresos();
                  }}
                >
                  <option value="10">10 por página</option>
                  <option value="25">25 por página</option>
                  <option value="50">50 por página</option>
                  <option value="100">100 por página</option>
                </Select>
              </FormControl>
              <Text fontSize="sm" color="gray.600">
                Mostrando {egresos.length} de {pagination.totalItems} registros
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
          <ModalHeader>Registrar Nuevo Egreso</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <TransactionForm type="egreso" onSuccess={handleSuccess} />
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
}
