import { useState } from 'react';
import {
  Flex,
  Button,
  IconButton,
  Text,
  Select,
  HStack,
  useColorModeValue
} from '@chakra-ui/react';
import { ChevronLeftIcon, ChevronRightIcon } from '@chakra-ui/icons';

export default function MonthSelector({ selectedMonth, onChange }) {
  const bgColor = useColorModeValue('white', 'gray.700');
  
  // Month names in Spanish
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  
  const handlePreviousMonth = () => {
    const prevMonth = selectedMonth === 1 ? 12 : selectedMonth - 1;
    onChange(prevMonth);
  };
  
  const handleNextMonth = () => {
    const nextMonth = selectedMonth === 12 ? 1 : selectedMonth + 1;
    onChange(nextMonth);
  };
  
  const handleChange = (e) => {
    onChange(parseInt(e.target.value));
  };
  
  return (
    <Flex 
      align="center" 
      justify="center" 
      bg={bgColor}
      p={3}
      borderRadius="lg"
      boxShadow="sm"
      mb={4}
    >
      <HStack spacing={3}>
        <IconButton
          icon={<ChevronLeftIcon />}
          onClick={handlePreviousMonth}
          aria-label="Mes anterior"
          variant="ghost"
          colorScheme="teal"
        />
        
        <Select 
          value={selectedMonth} 
          onChange={handleChange}
          variant="filled"
          width="auto"
          fontWeight="bold"
        >
          {monthNames.map((month, index) => (
            <option key={index + 1} value={index + 1}>
              {month}
            </option>
          ))}
        </Select>
        
        <IconButton
          icon={<ChevronRightIcon />}
          onClick={handleNextMonth}
          aria-label="Mes siguiente"
          variant="ghost"
          colorScheme="teal"
        />
      </HStack>
    </Flex>
  );
}

