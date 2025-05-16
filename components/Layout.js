import { Box, Flex, Stack, Heading, Text, Button, useColorModeValue } from '@chakra-ui/react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';

export default function Layout({ children }) {
  const { isAuthenticated, user, logout } = useAuth();
  const router = useRouter();
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const navBg = useColorModeValue('white', 'gray.800');

  // Skip layout for login page
  if (router.pathname === '/login') {
    return <Box>{children}</Box>;
  }

  // Redirect to login if not authenticated (client-side protection)
  if (!isAuthenticated && typeof window !== 'undefined') {
    router.push('/login');
    return null;
  }

  return (
    <Box minH="100vh" bg={bgColor}>
      {/* Navigation */}
      <Flex
        as="nav"
        align="center"
        justify="space-between"
        wrap="wrap"
        padding={4}
        bg={navBg}
        color="gray.600"
        borderBottomWidth="1px"
        borderColor="gray.200"
        boxShadow="sm"
      >
        <Flex align="center" mr={5}>
          <Heading as="h1" size="lg" letterSpacing="tight">
            Money Flow
          </Heading>
        </Flex>

        <Stack direction="row" spacing={4} align="center">
          {isAuthenticated ? (
            <>
              <Link href="/" passHref>
                <Button as="a" variant="ghost" colorScheme="teal">
                  Dashboard
                </Button>
              </Link>
              <Link href="/ingresos" passHref>
                <Button as="a" variant="ghost" colorScheme="green">
                  Ingresos
                </Button>
              </Link>
              <Link href="/egresos" passHref>
                <Button as="a" variant="ghost" colorScheme="red">
                  Egresos
                </Button>
              </Link>
              <Link href="/reportes" passHref>
                <Button as="a" variant="ghost" colorScheme="blue">
                  Reportes
                </Button>
              </Link>
              <Button onClick={logout} colorScheme="gray">
                Cerrar Sesión
              </Button>
            </>
          ) : (
            <Link href="/login" passHref>
              <Button as="a" colorScheme="teal">
                Iniciar Sesión
              </Button>
            </Link>
          )}
        </Stack>
      </Flex>

      {/* Page Content */}
      <Box p={4}>
        {children}
      </Box>
    </Box>
  );
}

