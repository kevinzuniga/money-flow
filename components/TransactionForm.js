import { useState } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  FormErrorMessage,
  Stack,
  useToast,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';

/**
 * Form validation schema using Zod
 */
const transactionSchema = z.object({
  monto: z
    .number({ invalid_type_error: 'El monto debe ser un número' })
    .positive('El monto debe ser mayor a cero'),
  fecha: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)')
    .refine((date) => !isNaN(new Date(date).getTime()), {
      message: 'Fecha inválida',
    }),
  descripcion: z.string().optional(),
});

/**
 * Reusable form component for both income and expense transactions
 * @param {Object} props - Component props
 * @param {string} props.type - Type of transaction ('ingreso' or 'egreso')
 * @param {function} props.onSuccess - Callback function to execute after successful submission
 * @param {Object} props.initialValues - Initial values for the form fields
 * @param {boolean} props.isEditing - Whether we're editing an existing transaction
 * @param {number} props.id - ID of the transaction being edited
 */
export default function TransactionForm({ 
  type = 'ingreso',  // 'ingreso' or 'egreso'
  onSuccess,
  initialValues = { 
    monto: '', 
    descripcion: '', 
    fecha: new Date().toISOString().split('T')[0] 
  },
  isEditing = false,
  id = null,
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState(null);
  const toast = useToast();
  
  // Form configuration with validation
  const {
    handleSubmit,
    register,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: initialValues,
    resolver: zodResolver(transactionSchema),
  });

  // Get label and color based on transaction type
  const typeInfo = {
    ingreso: {
      label: 'Ingreso',
      color: 'green',
      endpoint: '/api/ingresos',
    },
    egreso: {
      label: 'Egreso',
      color: 'red',
      endpoint: '/api/egresos',
    },
  };

  const { label, color, endpoint } = typeInfo[type] || typeInfo.ingreso;

  // Form submission handler
  const onSubmit = async (data) => {
    setIsSubmitting(true);
    setApiError(null);
    
    try {
      // Ensure monto is a number
      const payload = {
        ...data,
        monto: Number(data.monto),
      };
      
      // If editing, use PUT/PATCH endpoint with ID, otherwise use POST
      const url = isEditing ? `${endpoint}/${id}` : endpoint;
      const method = isEditing ? 'put' : 'post';
      
      await axios[method](url, payload);
      
      // Show success message
      toast({
        title: 'Transacción guardada',
        description: `${label} ${isEditing ? 'actualizado' : 'registrado'} exitosamente.`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      // Reset form if not editing
      if (!isEditing) {
        reset(initialValues);
      }
      
      // Execute success callback
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error(`Error ${isEditing ? 'updating' : 'saving'} ${type}:`, error);
      
      // Set error message from API or fallback
      setApiError(
        error.response?.data?.message || 
        `Ha ocurrido un error al ${isEditing ? 'actualizar' : 'guardar'} la transacción.`
      );
      
      // Also show toast for immediate feedback
      toast({
        title: 'Error',
        description: error.response?.data?.message || `Ha ocurrido un error al ${isEditing ? 'actualizar' : 'guardar'} la transacción.`,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box as="form" onSubmit={handleSubmit(onSubmit)} width="100%">
      {/* API Error Alert */}
      {apiError && (
        <Alert status="error" mb={4} borderRadius="md">
          <AlertIcon />
          {apiError}
        </Alert>
      )}
      
      <Stack spacing={4}>
        {/* Amount Field */}
        <FormControl isInvalid={!!errors.monto} isRequired>
          <FormLabel>Monto</FormLabel>
          <Input
            type="number"
            step="0.01"
            placeholder="0.00"
            {...register('monto', {
              valueAsNumber: true,
            })}
          />
          <FormErrorMessage>{errors.monto?.message}</FormErrorMessage>
        </FormControl>

        {/* Date Field */}
        <FormControl isInvalid={!!errors.fecha} isRequired>
          <FormLabel>Fecha</FormLabel>
          <Input
            type="date"
            {...register('fecha')}
          />
          <FormErrorMessage>{errors.fecha?.message}</FormErrorMessage>
        </FormControl>

        {/* Description Field */}
        <FormControl isInvalid={!!errors.descripcion}>
          <FormLabel>Descripción</FormLabel>
          <Textarea
            placeholder="Descripción opcional"
            {...register('descripcion')}
          />
          <FormErrorMessage>{errors.descripcion?.message}</FormErrorMessage>
        </FormControl>

        {/* Submit Button */}
        <Button
          mt={4}
          colorScheme={color}
          isLoading={isSubmitting}
          loadingText={isEditing ? 'Actualizando...' : 'Guardando...'}
          type="submit"
          width="full"
        >
          {isEditing ? 'Actualizar' : 'Guardar'} {label}
        </Button>
      </Stack>
    </Box>
  );
}

import { useState } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  FormErrorMessage,
  Stack,
  useToast,
} from '@chakra-ui/react';
import { useForm } from 'react-hook-form';
import axios from 'axios';

/**
 * Reusable form component for both income and expense transactions
 * @param {string} type - Type of transaction ('ingreso' or 'egreso')
 * @param {function} onSuccess - Callback function to execute after successful submission
 * @param {object} initialValues - Initial values for the form fields
 */
export default function TransactionForm({ 
  type = 'ingreso',  // 'ingreso' or 'egreso'
  onSuccess,
  initialValues = { 
    monto: '', 
    descripcion: '', 
    fecha: new Date().toISOString().split('T')[0] 
  } 
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();
  
  const {
    handleSubmit,
    register,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: initialValues
  });

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      const endpoint = type === 'ingreso' ? '/api/ingresos' : '/api/egresos';
      await axios.post(endpoint, {
        ...data,
        monto: Number(data.monto),
      });
      
      toast({
        title: 'Transacción guardada',
        description: `${type === 'ingreso' ? 'Ingreso' : 'Egreso'} registrado exitosamente.`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      reset(initialValues);
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error(`Error saving ${type}:`, error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Ha ocurrido un error al guardar la transacción.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box as="form" onSubmit={handleSubmit(onSubmit)} width="100%">
      <Stack spacing={4}>
        <FormControl isInvalid={errors.monto} isRequired>
          <FormLabel>Monto</FormLabel>
          <Input
            type="number"
            step="0.01"
            placeholder="0.00"
            {...register('monto', {
              required: 'El monto es requerido',
              min: { value: 0.01, message: 'El monto debe ser mayor a cero' },
              valueAsNumber: true,
            })}
          />
          <FormErrorMessage>{errors.monto?.message}</FormErrorMessage>
        </FormControl>

        <FormControl isInvalid={errors.fecha} isRequired>
          <FormLabel>Fecha</FormLabel>
          <Input
            type="date"
            {...register('fecha', {
              required: 'La fecha es requerida',
            })}
          />
          <FormErrorMessage>{errors.fecha?.message}</FormErrorMessage>
        </FormControl>

        <FormControl isInvalid={errors.descripcion}>
          <FormLabel>Descripción</FormLabel>
          <Textarea
            placeholder="Descripción opcional"
            {...register('descripcion')}
          />
          <FormErrorMessage>{errors.descripcion?.message}</FormErrorMessage>
        </FormControl>

        <Button
          mt={4}
          colorScheme={type === 'ingreso' ? 'green' : 'red'}
          isLoading={isSubmitting}
          type="submit"
          width="full"
        >
          Guardar {type === 'ingreso' ? 'Ingreso' : 'Egreso'}
        </Button>
      </Stack>
    </Box>
  );
}
