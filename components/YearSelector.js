import { useState, useEffect } from 'react';
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

export default function YearSelector({ selectedYear, onChange }) {
  const [availableYears, setAvailableYears] = useState([]);
  const bgColor = useColorModeValue('white', 'gray.700');
  
  // Generate available years (current year plus 5 years back)
  useEffect(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    
    for (let i = 0; i < 6; i++) {
      years.push(currentYear - i);
    }
    
    setAvailableYears(years);
  }, []);
  
  const handlePreviousYear = () => {
    const prevYear = parseInt(selectedYear) - 1;
    onChange(prevYear);
  };
  
  const handleNextYear = () => {
    const nextYear = parseInt(selectedYear) + 1;
    const currentYear = new Date().getFullYear();
    
    if (nextYear <= currentYear) {
      onChange(nextYear);
    }
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
      mb={6}
    >
      <HStack spacing={3}>
        <IconButton
          icon={<ChevronLeftIcon />}
          onClick={handlePreviousYear}
          aria-label="Año anterior"
          variant="ghost"
          colorScheme="teal"
        />
        
        <Select 
          value={selectedYear} 
          onChange={handleChange}
          variant="filled"
          width="auto"
          fontWeight="bold"
        >
          {availableYears.map(year => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </Select>
        
        <IconButton
          icon={<ChevronRightIcon />}
          onClick={handleNextYear}
          aria-label="Año siguiente"
          variant="ghost"
          colorScheme="teal"
          isDisabled={parseInt(selectedYear) >= new Date().getFullYear()}
        />
      </HStack>
    </Flex>
  );
}
