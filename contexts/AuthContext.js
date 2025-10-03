import { createContext, useState, useContext, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';

// Create a reusable axios instance with defaults
const api = axios.create({
  headers: {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  }
});

// Request tracking to prevent duplicates
const pendingRequests = new Map();

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  
  // Use refs to track the authentication state without triggering re-renders
  const authStateRef = useRef({
    user: null,
    isLoading: true,
    lastChecked: null,
    currentRequest: null
  });

  // Function to cancel any existing request with the same URL
  const cancelPendingRequests = (url) => {
    if (pendingRequests.has(url)) {
      const controller = pendingRequests.get(url);
      controller.abort();
      pendingRequests.delete(url);
      console.log(`Cancelled pending request to ${url}`);
    }
  };

  // Debounce function to prevent rapid successive calls
  const debounce = (func, delay) => {
    let timeoutId;
    return (...args) => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        func(...args);
      }, delay);
    };
  };

  // Load user with proper request deduplication
  const loadUserFromCookies = async (force = false) => {
    // Skip if already loading or recently checked (within last 2 seconds) unless forced
    const now = Date.now();
    if (!force && 
        (authStateRef.current.isLoading || 
         (authStateRef.current.lastChecked && now - authStateRef.current.lastChecked < 2000))) {
      console.log('Skipping auth check - too soon or already in progress');
      return;
    }
    
    // Update loading state
    authStateRef.current.isLoading = true;
    setLoading(true);
    
    // Create abort controller for this request
    const controller = new AbortController();
    const url = '/api/auth/me';
    
    // Cancel any existing request to the same URL
    cancelPendingRequests(url);
    
    // Register this request
    pendingRequests.set(url, controller);
    
    try {
      // Add cache-busting timestamp parameter
      const timestamp = new Date().getTime();
      const { data } = await api.get(`${url}?_t=${timestamp}`, {
        signal: controller.signal
      });
      
      console.log('Auth response:', { 
        success: !!data.user, 
        timestamp: data.timestamp,
        requestId: data.requestId
      });
      
      // Update auth state
      if (data.user) {
        authStateRef.current.user = data.user;
        setUser(data.user);
      } else {
        authStateRef.current.user = null;
        setUser(null);
      }
      
      // Mark as last checked
      authStateRef.current.lastChecked = now;
    } catch (error) {
      // Don't report errors for aborted requests
      if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
        console.log('Request was cancelled');
        return;
      }
      
      console.error('Error loading user:', error.message);
      console.error('Response status:', error.response?.status);
      console.error('Response data:', error.response?.data);
      
      // Clear user on auth errors
      if (error.response?.status === 401) {
        authStateRef.current.user = null;
        setUser(null);
      }
    } finally {
      // Clean up request tracking
      pendingRequests.delete(url);
      authStateRef.current.isLoading = false;
      setLoading(false);
    }
  };
  
  // Debounced version to prevent rapid calls
  const debouncedLoadUser = useRef(debounce(loadUserFromCookies, 300)).current;
  
  // Initialize auth state on component mount
  useEffect(() => {
    loadUserFromCookies(true); // Force initial load
    
    // Set up interval to periodically check auth status (every 5 minutes)
    const intervalId = setInterval(() => {
      loadUserFromCookies();
    }, 5 * 60 * 1000);
    
    // Clean up on unmount
    return () => {
      clearInterval(intervalId);
      // Cancel any pending requests
      pendingRequests.forEach(controller => controller.abort());
      pendingRequests.clear();
    };
  }, []);

  // Handle login with proper request tracking
  const login = async (email, password) => {
    const url = '/api/auth/login';
    
    // Cancel any pending auth requests
    cancelPendingRequests(url);
    cancelPendingRequests('/api/auth/me');
    
    // Create abort controller for this request
    const controller = new AbortController();
    pendingRequests.set(url, controller);
    
    try {
      setLoading(true);
      authStateRef.current.isLoading = true;
      
      const { data } = await api.post(url, 
        { email, password }, 
        { signal: controller.signal }
      );
      
      // Update auth state
      authStateRef.current.user = data.user;
      authStateRef.current.lastChecked = Date.now();
      setUser(data.user);
      
      // Navigate to home page
      router.push('/');
      return { success: true };
    } catch (error) {
      // Don't report errors for aborted requests
      if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
        console.log('Login request was cancelled');
        return { success: false, error: 'Request cancelled' };
      }
      
      console.error('Login error:', error.message);
      console.error('Response data:', error.response?.data);
      return { 
        success: false, 
        error: error.response?.data?.message || 'An error occurred',
        status: error.response?.status
      };
    } finally {
      pendingRequests.delete(url);
      setLoading(false);
      authStateRef.current.isLoading = false;
    }
  };

  // Handle logout with proper request tracking
  const logout = async () => {
    const url = '/api/auth/logout';
    
    // Cancel any pending auth requests
    cancelPendingRequests(url);
    cancelPendingRequests('/api/auth/me');
    
    // Create abort controller for this request
    const controller = new AbortController();
    pendingRequests.set(url, controller);
    
    try {
      // Immediately update local state for better UX
      authStateRef.current.user = null;
      setUser(null);
      
      // Add cache-busting timestamp parameter
      const timestamp = new Date().getTime();
      await api.post(`${url}?_t=${timestamp}`, {}, {
        signal: controller.signal
      });
      
      // Navigate to login page
      router.push('/login');
    } catch (error) {
      // Don't report errors for aborted requests
      if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
        console.log('Logout request was cancelled');
        return;
      }
      
      console.error('Logout error:', error.message);
      console.error('Response status:', error.response?.status);
      console.error('Response data:', error.response?.data);
      
      // Force navigation to login even on error
      router.push('/login');
    } finally {
      pendingRequests.delete(url);
    }
  };

  // Setup a global axios interceptor to add cache-busting for all requests
  useEffect(() => {
    const requestInterceptor = axios.interceptors.request.use(
      (config) => {
        // Don't modify requests to external domains
        if (!config.url || !config.url.startsWith('/api/')) {
          return config;
        }
        
        // Add cache busting for GET requests
        if (config.method === 'get') {
          const separator = config.url.includes('?') ? '&' : '?';
          config.url = `${config.url}${separator}_t=${new Date().getTime()}`;
        }
        
        // Add cache control headers
        config.headers = {
          ...config.headers,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        };
        
        return config;
      },
      (error) => Promise.reject(error)
    );
    
    // Clean up interceptor on unmount
    return () => {
      axios.interceptors.request.eject(requestInterceptor);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated: !!user, 
      user, 
      login, 
      logout, 
      loading,
      refreshAuth: () => loadUserFromCookies(true) // Expose method to force auth refresh
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
