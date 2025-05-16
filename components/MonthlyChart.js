            {showBalance && (
              <Line 
                type="monotone" 
                dataKey="balance" 
                name="Balance" 
                stroke="#319795" 
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </Box>
    );
  }
  
  // Fallback to default chart
  return (
    <Box bg={chartBg} p={4} borderRadius="lg" boxShadow="md" mb={8} height="400px">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={formattedData}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar dataKey="ingresos" name="Ingresos" fill="#48BB78" />
          <Bar dataKey="egresos" name="Egresos" fill="#F56565" />
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
}

import { Box, Flex, Select, Text, useColorModeValue } from '@chakra-ui/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Line,
  LineChart,
  ComposedChart 
} from 'recharts';

const months = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

// Custom tooltip component for the chart
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <Box bg="white" p={3} borderRadius="md" boxShadow="lg" border="1px solid" borderColor="gray.200">
        <Text fontWeight="bold" mb={2}>{months[label - 1]}</Text>
        
        {payload.map((entry, index) => {
          let color = 'inherit';
          let prefix = '';
          
          if (entry.name === 'Ingresos') {
            color = 'green.500';
            prefix = '+';
          } else if (entry.name === 'Egresos') {
            color = 'red.500';
            prefix = '-';
          } else if (entry.name === 'Balance') {
            color = entry.value >= 0 ? 'teal.500' : 'red.500';
            prefix = entry.value >= 0 ? '+' : '';
          }
          
          return (
            <Flex key={`item-${index}`} justifyContent="space-between" my={1}>
              <Text color={color} fontWeight="medium">
                {entry.name}:
              </Text>
              <Text color={color} fontWeight="bold" ml={4}>
                {prefix}${Math.abs(entry.value).toFixed(2)}
              </Text>
            </Flex>
          );
        })}
      </Box>
    );
  }
  
  return null;
};

export default function MonthlyChart({ data, type = 'bars', showBalance = true }) {
  const chartBg = useColorModeValue('white', 'gray.700');
  
  // Format month names for X-axis
  const formattedData = data.map(item => ({
    ...item,
    name: months[item.month - 1].substring(0, 3),
  }));
  
  if (type === 'bars') {
    return (
      <Box bg={chartBg} p={4} borderRadius="lg" boxShadow="md" mb={8} height="400px">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={formattedData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar dataKey="ingresos" name="Ingresos" fill="#48BB78" />
            <Bar dataKey="egresos" name="Egresos" fill="#F56565" />
            {showBalance && (
              <Bar dataKey="balance" name="Balance" fill="#319795" />
            )}
          </BarChart>
        </ResponsiveContainer>
      </Box>
    );
  }
  
  if (type === 'line') {
    return (
      <Box bg={chartBg} p={4} borderRadius="lg" boxShadow="md" mb={8} height="400px">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={formattedData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar dataKey="ingresos" name="Ingresos" fill="#48BB78" />
            <Bar dataKey="egresos" name="Egresos" fill="#F56565" />
            {showBalance && (
              <Line 
                type="monotone" 
                dataKey="balance" 
                name="Balance" 
                stroke="#319795" 
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </Box>
    );
  }
  
  // Fallback to default chart
  return (
    <Box bg={chartBg} p={4} borderRadius="lg" boxShadow="md" mb={8} height="400px">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={formattedData}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar dataKey="ingresos" name="Ingresos" fill="#48BB78" />
          <Bar dataKey="egresos" name="Egresos" fill="#F56565" />
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
}
