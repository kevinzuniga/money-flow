import { useState } from 'react';
import {
  Table,
  Thead,
  Tbody,
  Tfoot,
  Tr,
  Th,
  Td,
  Box,
  Text,
  IconButton,
  Flex,
  useColorModeValue
} from '@chakra-ui/react';
import { ChevronUpIcon, ChevronDownIcon } from '@chakra-ui/icons';

const months = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export default function MonthlyTable({ data, totals }) {
  const [sortField, setSortField] = useState('month');
  const [sortDirection, setSortDirection] = useState('asc');
  
  const bgColor = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  
  // Format number as currency
  const formatCurrency = (number) => {
    return `$${parseFloat(number).toFixed(2)}`;
  };
  
  // Handle sort
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };
  
  // Sort the data
  const sortedData = [...data].sort((a, b) => {
    let comparison = 0;
    
    if (sortField === 'month') {
      comparison = a.month - b.month;
    } else if (sortField === 'ingresos') {
      comparison = a.ingresos - b.ingresos;
    } else if (sortField === 'egresos') {
      comparison = a.egresos - b.egresos;
    } else if (sortField === 'balance') {
      comparison = a.balance - b.balance;
    }
    
    return sortDirection === 'asc' ? comparison : -comparison;
  });
  
  // Render sort indicator
  const SortIndicator = ({ field }) => {
    if (sortField !== field) return null;
    
    return sortDirection === 'asc' ? (
      <ChevronUpIcon ml={1} />
    ) : (
      <ChevronDownIcon ml={1} />
    );
  };
  
  return (
    <Box
      boxShadow="sm"
      borderRadius="lg"
      overflow="auto"
      bg={bgColor}
      mb={8}
      borderWidth="1px"
      borderColor={borderColor}
    >
      <Table variant="simple">
        <Thead>
          <Tr>
            <Th onClick={() => handleSort('month')} cursor="pointer">
              <Flex align="center">
                Mes
                <SortIndicator field="month" />
              </Flex>
            </Th>
            <Th isNumeric onClick={() => handleSort('ingresos')} cursor="pointer">
              <Flex align="center" justify="flex-end">
                Ingresos
                <SortIndicator field="ingresos" />
              </Flex>
            </Th>
            <Th isNumeric onClick={() => handleSort('egresos')} cursor="pointer">
              <Flex align="center" justify="flex-end">
                Egresos
                <SortIndicator field="egresos" />
              </Flex>
            </Th>
            <Th isNumeric onClick={() => handleSort('balance')} cursor="pointer">
              <Flex align="center" justify="flex-end">
                Balance
                <SortIndicator field="balance" />
              </Flex>
            </Th>
          </Tr>
        </Thead>
        <Tbody>
          {sortedData.map((item) => (
            <Tr key={item.month}>
              <Td fontWeight="medium">{months[item.month - 1]}</Td>
              <Td isNumeric color="green.500" fontWeight="medium">
                {formatCurrency(item.ingresos)}
              </Td>
              <Td isNumeric color="red.500" fontWeight="medium">
                {formatCurrency(item.egresos)}
              </Td>
              <Td 
                isNumeric 
                color={item.balance >= 0 ? 'teal.500' : 'red.500'} 
                fontWeight="bold"
              >
                {formatCurrency(item.balance)}
              </Td>
            </Tr>
          ))}
        </Tbody>
        <Tfoot>
          <Tr bg={useColorModeValue('gray.50', 'gray.800')}>
            <Td fontWeight="bold">Total Anual</Td>
            <Td isNumeric color="green.500" fontWeight="bold">
              {formatCurrency(totals.ingresos)}
            </Td>
            <Td isNumeric color="red.500" fontWeight="bold">
              {formatCurrency(totals.egresos)}
            </Td>
            <Td 
              isNumeric 
              color={totals.balance >= 0 ? 'teal.500' : 'red.500'} 
              fontWeight="bold"
            >
              {formatCurrency(totals.balance)}
            </Td>
          </Tr>
        </Tfoot>
      </Table>
    </Box>
  );
}

import { useState } from 'react';
import {
  Table,
  Thead,
  Tbody,
  Tfoot,
  Tr,
  Th,
  Td,
  Box,
  Text,
  IconButton,
  Flex,
  useColorModeValue
} from '@chakra-ui/react';
import { ChevronUpIcon, ChevronDownIcon } from '@chakra-ui/icons';

const months = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export default function MonthlyTable({ data, totals }) {
  const [sortField, setSortField] = useState('month');
  const [sortDirection, setSortDirection] = useState('asc');
  
  const bgColor = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  
  // Format number as currency
  const formatCurrency = (number) => {
    return `$${parseFloat(number).toFixed(2)}`;
  };
  
  // Handle sort
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };
  
  // Sort the data
  const sortedData = [...data].sort((a, b) => {
    let comparison = 0;
    
    if (sortField === 'month') {
      comparison = a.month - b.month;
    } else if (sortField === 'ingresos') {
      comparison = a.ingresos - b.ingresos;
    } else if (sortField === 'egresos') {
      comparison = a.egresos - b.egresos;
    } else if (sortField === 'balance') {
      comparison = a.balance - b.balance;
    }
    
    return sortDirection === 'asc' ? comparison : -comparison;
  });
  
  // Render sort indicator
  const SortIndicator = ({ field }) => {
    if (sortField !== field) return null;
    
    return sortDirection === 'asc' ? (
      <ChevronUpIcon ml={1} />
    ) : (
      <ChevronDownIcon ml={1} />
    );
  };
  
  return (
    <Box
      boxShadow="sm"
      borderRadius="lg"
      overflow="auto"
      bg={bgColor}
      mb={8}
      borderWidth="1px"
      borderColor={borderColor}
    >
      <Table variant="simple">
        <Thead>
          <Tr>
            <Th onClick={() => handleSort('month')} cursor="pointer">
              <Flex align="center">
                Mes
                <SortIndicator field="month" />
              </Flex>
            </Th>
            <Th isNumeric onClick={() => handleSort('ingresos')} cursor="pointer">
              <Flex align="center" justify="flex-end">
                Ingresos
                <SortIndicator field="ingresos" />
              </Flex>
            </Th>
            <Th isNumeric onClick={() => handleSort('egresos')} cursor="pointer">
              <Flex align="center" justify="flex-end">
                Egresos
                <SortIndicator field="egresos" />
              </Flex>
            </Th>
            <Th isNumeric onClick={() => handleSort('balance')} cursor="pointer">
              <Flex align="center" justify="flex-end">
                Balance
                <SortIndicator field="balance" />
              </Flex>
            </Th>
          </Tr>
        </Thead>
        <Tbody>
          {sortedData.map((item) => (
            <Tr key={item.month}>
              <Td fontWeight="medium">{months[item.month - 1]}</Td>
              <Td isNumeric color="green.500" fontWeight="medium">
                {formatCurrency(item.ingresos)}
              </Td>
              <Td isNumeric color="red.500" fontWeight="medium">
                {formatCurrency(item.egresos)}
              </Td>
              <Td 
                isNumeric 
                color={item.balance >= 0 ? 'teal.500' : 'red.500'} 
                fontWeight="bold"
              >
                {formatCurrency(item.balance)}
              </Td>
            </Tr>
          ))}
        </Tbody>
        <Tfoot>
          <Tr bg={useColorModeValue('gray.50', 'gray.800')}>
            <Td fontWeight="bold">Total Anual</Td>
            <Td isNumeric color="green.500" fontWeight="bold">
              {formatCurrency(totals.ingresos)}
            </Td>
            <Td isNumeric color="red.500" fontWeight="bold">
              {formatCurrency(totals.egresos)}
            </Td>
            <Td 
              isNumeric 
              color={totals.balance >= 0 ? 'teal.500' : 'red.500'} 
              fontWeight="bold"
            >
              {formatCurrency(totals.balance)}
            </Td>
          </Tr>
        </Tfoot>
      </Table>
    </Box>
  );
}

import {
  Table,
  Thead,
  Tbody,
  Tfoot,
  Tr,
  Th,
  Td,
  Box,
  Text,
  useColorModeValue
} from '@chakra-ui/react';

const months = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export default function MonthlyTable({ data, totals }) {
  const bgColor = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  
  // Format number as currency
  const formatCurrency = (number) => {
    return `$${parseFloat(number).toFixed(2)}`;
  };
  
  return (
    <Box
      boxShadow="sm"
      borderRadius="lg"
      overflow="hidden"
      bg={bgColor}
      mb={8}
      borderWidth="1px"
      borderColor={borderColor}
    >
      <Table variant="simple">
        <Thead>
          <Tr>
            <Th>Mes</Th>
            <Th isNumeric>Ingresos</Th>
            <Th isNumeric>Egresos</Th>
            <Th isNumeric>Balance</Th>
          </Tr>
        </Thead>
        <Tbody>
          {data.map((item) => (
            <Tr key={item.month}>
              <Td fontWeight="medium">{months[item.month - 1]}</Td>
              <Td isNumeric color="green.500" fontWeight="medium">
                {formatCurrency(item.ingresos)}
              </Td>
              <Td isNumeric color="red.500" fontWeight="medium">
                {formatCurrency(item.egresos)}
              </Td>
              <Td 
                isNumeric 
                color={item.balance >= 0 ? 'teal.500' : 'red.500'} 
                fontWeight="bold"
              >
                {formatCurrency(item.balance)}
              </Td>
            </Tr>
          ))}
        </Tbody>
        <Tfoot>
          <Tr bg={useColorModeValue('gray.50', 'gray.800')}>
            <Td fontWeight="bold">Total Anual</Td>
            <Td isNumeric color="green.500" fontWeight="bold">
              {formatCurrency(totals.ingresos)}
            </Td>
            <Td isNumeric color="red.500" fontWeight="bold">
              {formatCurrency(totals.egresos)}
            </Td>
            <Td 
              isNumeric 
              color={totals.balance >= 0 ? 'teal.500' : 'red.500'} 
              fontWeight="bold"
            >
              {formatCurrency(totals.balance)}
            </Td>
          </Tr>
        </Tfoot>
      </Table>
    </Box>
  );
}

