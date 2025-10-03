import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import debounce from 'lodash/debounce';

// Create a reusable axios instance
const api = axios.create();

// Global request tracking to prevent duplicates
const pendingRequests = new Map();

// Cache structure to store API responses
const cache = new Map();

// Default options
const DEFAULT_OPTIONS = {
  enabled: true,            // Whether the request should run automatically
  cacheTime: 15 * 60 * 1000, // Cache TTL in milliseconds (15 minutes)
  staleTime: 5 * 60 * 1000,  // Time until data is considered stale (5 minutes)
  retryCount: 3,             // Number of times to retry failed requests
  retryDelay: 1000,          // Base delay between retries in milliseconds
  dedupingInterval: 200,     // Time window for deduplicating requests in milliseconds
  refetchOnWindowFocus: true, // Whether to refetch when window regains focus
  refetchOnReconnect: true,   // Whether to refetch when network reconnects
};

/**
 * Custom hook for fetching and managing financial data with advanced caching and request deduplication
 * @param {string} endpoint - The API endpoint to fetch data from
 * @param {Object} params - Query parameters for the API request
 * @param {Object} options - Configuration options for the hook
 * @param {boolean} options.enabled - Whether requests are enabled (default: true)
 * @param {number} options.cacheTime - Time in ms to keep data in cache (default: 15min)
 * @param {number} options.staleTime - Time in ms until data is considered stale (default: 5min)
 * @param {boolean} options.refetchOnWindowFocus - Whether to refetch when window regains focus
 * @param {boolean} options.refetchOnReconnect - Whether to refetch on network reconnect
 * @returns {Object} - Object containing data, loading state, error state, and utility functions
 */
export default function useFinancialData(endpoint, params = {}, options = {}) {
  // Merge provided options with defaults
  const config = { ...DEFAULT_OPTIONS, ...options };
  
  // State management
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(config.enabled);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('idle'); // 'idle', 'loading', 'success', 'error'
  
  // Refs to track internal state without triggering re-renders
  const stateRef = useRef({
    data: null,
    error: null,
    loading: config.enabled,
    timestamp: null,
    retryCount: 0,
    controller: null, // AbortController for request cancellation
    requestId: null,  // To track the current request
    lastRefetchAttempt: 0, // Track when we last attempted to refetch
  });
  
  // Generate a cache key based on endpoint and params
  const cacheKey = generateCacheKey(endpoint, params);
  
  /**
   * Function to cancel any pending request for this hook instance
   */
  const cancelRequest = useCallback(() => {
    if (stateRef.current.controller) {
      stateRef.current.controller.abort();
      stateRef.current.controller = null;
      console.log(`Cancelled request for ${cacheKey}`);
    }
    
    if (stateRef.current.requestId && pendingRequests.has(cacheKey)) {
      pendingRequests.delete(cacheKey);
    }
  }, [cacheKey]);
  
  /**
   * Enhanced refetch function with deduplication, cancellation, and retry logic
   * @param {Object} options - Options for this specific refetch
   * @param {boolean} options.force - Whether to force a fresh request ignoring cache
   * @param {boolean} options.throwOnError - Whether to throw errors instead of just setting error state
   */
  const refetch = useCallback(async (options = {}) => {
    const { force = false, throwOnError = false } = options;
    
    // Skip if requests are disabled
    if (!config.enabled && !force) {
      console.log(`Request skipped for ${endpoint} (disabled)`);
      return;
    }
    
    // Generate a unique ID for this request
    const requestId = Date.now().toString();
    stateRef.current.requestId = requestId;
    
    // Check for duplicate requests in the deduping interval
    if (pendingRequests.has(cacheKey)) {
      console.log(`Request deduped for ${cacheKey}`);
      return; // Skip duplicate requests
    }
    
    // Mark request as pending for deduplication
    pendingRequests.set(cacheKey, requestId);
    
    // Set loading state
    setLoading(true);
    setStatus('loading');
    stateRef.current.loading = true;
    
    // Cancel any previous request
    cancelRequest();
    
    // Create a new abort controller for this request
    const controller = new AbortController();
    stateRef.current.controller = controller;
    
    try {
      // Check cache first unless forced refetch
      if (!force) {
        const cachedData = getCachedData(cacheKey, config.staleTime);
        if (cachedData) {
          setData(cachedData);
          setLoading(false);
          setStatus('success');
          stateRef.current.loading = false;
          stateRef.current.data = cachedData;
          
          // Clean up this request
          setTimeout(() => {
            if (pendingRequests.get(cacheKey) === requestId) {
              pendingRequests.delete(cacheKey);
            }
          }, config.dedupingInterval);
          
          return cachedData;
        }
      }
      
      // Add cache-busting parameter to prevent browser caching
      const queryParams = { ...params, _t: Date.now() };
      
      // If no cached data or forcing refetch, fetch from API
      const response = await fetchData(endpoint, queryParams, controller.signal);
      
      // Reset retry count on successful request
      stateRef.current.retryCount = 0;
      
      if (response.success) {
        // Update state with fetched data
        setData(response.data);
        setError(null);
        setStatus('success');
        
        // Update ref state
        stateRef.current.data = response.data;
        stateRef.current.error = null;
        stateRef.current.timestamp = Date.now();
        
        // Store in cache
        setCachedData(cacheKey, response.data, config.cacheTime);
        
        return response.data;
      } else {
        const errorMessage = response.message || 'Error fetching financial data';
        throw new Error(errorMessage);
      }
    } catch (err) {
      // Don't handle aborted requests as errors
      if (err.name === 'AbortError' || err.code === 'ERR_CANCELED') {
        console.log(`Request for ${endpoint} was cancelled`);
        return;
      }
      
      console.error('Error in useFinancialData:', err);
      
      // Handle retry logic
      if (stateRef.current.retryCount < config.retryCount) {
        stateRef.current.retryCount++;
        const delay = config.retryDelay * Math.pow(2, stateRef.current.retryCount - 1);
        
        console.log(`Retrying request for ${endpoint} in ${delay}ms (attempt ${stateRef.current.retryCount}/${config.retryCount})`);
        
        setTimeout(() => {
          refetch(options);
        }, delay);
        
        return;
      }
      
      // Update error state
      const errorMessage = err.message || 'An error occurred while fetching data';
      setError(errorMessage);
      setStatus('error');
      stateRef.current.error = errorMessage;
      
      // Throw error if requested
      if (throwOnError) {
        throw err;
      }
    } finally {
      // Only update loading state if this is still the current request
      if (stateRef.current.requestId === requestId) {
        setLoading(false);
        stateRef.current.loading = false;
        stateRef.current.controller = null;
        
        // Clean up this request after deduping interval
        setTimeout(() => {
          if (pendingRequests.get(cacheKey) === requestId) {
            pendingRequests.delete(cacheKey);
          }
        }, config.dedupingInterval);
      }
    }
  }, [endpoint, cacheKey, params, config, cancelRequest]);
  
  /**
   * Function to invalidate cache entries
   */
  const invalidateCache = useCallback(() => {
    cache.delete(cacheKey);
    return refetch({ force: true });
  }, [cacheKey, refetch]);
  
  // Create a debounced refetch function that only triggers if minimum time has passed
  const debouncedRefetch = useCallback(
    debounce((reason) => {
      try {
        const now = Date.now();
        const lastUpdate = stateRef.current.timestamp || 0;
        const lastRefetchAttempt = stateRef.current.lastRefetchAttempt || 0;
      
      // Calculate time since last update and last refetch attempt
      const timeSinceUpdate = now - lastUpdate;
      const timeSinceLastAttempt = now - lastRefetchAttempt;
      
      // Set a minimum window between refetch attempts (3 seconds)
      const MIN_REFETCH_WINDOW = 3000;
      
      // Only refetch if:
      // 1. We have a previous successful fetch (lastUpdate exists)
      // 2. Data is stale (beyond staleTime)
      // 3. We haven't attempted a refetch recently (within MIN_REFETCH_WINDOW)
      // 4. We're not currently loading data
      
      const shouldRefetch = 
        lastUpdate > 0 && 
        timeSinceUpdate > config.staleTime && 
        timeSinceLastAttempt > MIN_REFETCH_WINDOW && 
        !stateRef.current.loading;
      
      console.log(`[${cacheKey}] Refetch check (${reason}):`, {
        shouldRefetch,
        timeSinceUpdate: `${Math.round(timeSinceUpdate/1000)}s`,
        staleTime: `${Math.round(config.staleTime/1000)}s`,
        timeSinceLastAttempt: `${Math.round(timeSinceLastAttempt/1000)}s`,
        isLoading: stateRef.current.loading
      });
      
      if (shouldRefetch) {
        console.log(`[${cacheKey}] Refetching due to ${reason}`);
        stateRef.current.lastRefetchAttempt = now;
        refetch();
      }
    } catch (error) {
      console.error('Error in debouncedRefetch:', error);
      // Still attempt to refetch if debounce logic fails
      refetch();
    }
  }, 500, { maxWait: 2000 }), // 500ms debounce with 2s max wait time
    [refetch, config.staleTime, cacheKey]
  );
  
  /**
   * Fetch data on mount or when dependencies change
   */
  useEffect(() => {
    if (config.enabled) {
      // If initialFetchDelay is specified, delay the initial fetch
      if (config.initialFetchDelay && typeof window !== 'undefined') {
        const timer = setTimeout(() => {
          refetch();
        }, config.initialFetchDelay);
        return () => clearTimeout(timer);
      } else {
        refetch();
      }
    }
  }, [config.enabled, refetch, config.initialFetchDelay]);
  
  /**
   * Set up event listeners for refetching
   */
  useEffect(() => {
    // Only set up listeners if we're in a browser and the feature is enabled
    if (typeof window === 'undefined') return;
    
    const eventHandlers = [];
    
    // Set up window focus handler
    if (config.refetchOnWindowFocus) {
      const handleFocus = () => {
        debouncedRefetch('window focus');
      };
      
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          debouncedRefetch('visibility change');
        }
      };
      
      window.addEventListener('focus', handleFocus);
      document.addEventListener('visibilitychange', handleVisibilityChange);
      
      eventHandlers.push(() => {
        window.removeEventListener('focus', handleFocus);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      });
    }
    
    // Set up network reconnect handler
    if (config.refetchOnReconnect) {
      const handleReconnect = () => {
        debouncedRefetch('network reconnect');
      };
      
      window.addEventListener('online', handleReconnect);
      
      eventHandlers.push(() => {
        window.removeEventListener('online', handleReconnect);
      });
    }
    
    // Clean up all event handlers
    return () => {
      eventHandlers.forEach(cleanup => cleanup());
      // Only call cancel if it exists (defensive programming)
      if (debouncedRefetch && typeof debouncedRefetch.cancel === 'function') {
        debouncedRefetch.cancel();
      }
      cancelRequest();
    };
  }, [config.refetchOnWindowFocus, config.refetchOnReconnect, debouncedRefetch, cancelRequest]);
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      cancelRequest();
    };
  }, [cancelRequest]);
  
  return { 
    data, 
    loading, 
    error, 
    status,
    refetch,
    invalidateCache
  };
}

/**
 * Generate a cache key from endpoint and params
 * @param {string} endpoint - API endpoint
 * @param {Object} params - Query parameters
 * @returns {string} - Cache key
 */
function generateCacheKey(endpoint, params) {
  const sortedParams = Object.entries(params)
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
  
  return `${endpoint}?${sortedParams}`;
}

/**
 * Get data from cache if it exists and is not expired
 * @param {string} key - Cache key
 * @param {number} staleTime - Time in ms until data is considered stale
 * @returns {Object|null} - Cached data or null
 */
function getCachedData(key, staleTime = DEFAULT_OPTIONS.staleTime) {
  if (!cache.has(key)) return null;
  
  const { data, timestamp } = cache.get(key);
  const isExpired = Date.now() - timestamp > staleTime;
  
  if (isExpired) {
    console.log(`Cache expired for ${key}`);
    return null; // Return null but don't delete - let cache cleanup handle it
  }
  
  console.log(`Cache hit for ${key}`);
  return data;
}

/**
 * Store data in cache with current timestamp
 * @param {string} key - Cache key
 * @param {Object} data - Data to cache
 * @param {number} cacheTime - Time in ms to keep data in cache
 */
function setCachedData(key, data, cacheTime = DEFAULT_OPTIONS.cacheTime) {
  console.log(`Caching data for ${key}`);
  
  // Store data in cache
  cache.set(key, {
    data,
    timestamp: Date.now()
  });
  
  // Set up cache invalidation timer
  setTimeout(() => {
    console.log(`Cache expired for ${key}, removing`);
    cache.delete(key);
  }, cacheTime);
}

/**
 * Fetch data from API
 * @param {string} endpoint - API endpoint
 * @param {Object} params - Query parameters
 * @param {AbortSignal} signal - AbortController signal for cancellation
 * @returns {Promise<Object>} - API response
 */
async function fetchData(endpoint, params, signal) {
  try {
    // Prepare query parameters
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, value);
      }
    });
    
    // Make API request
    const queryString = queryParams.toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    
    console.log(`Fetching data from ${url}`);
    const { data } = await api.get(url, { signal });
    
    return {
      success: true,
      data: data.data || data, // Handle both { data: {...} } and direct data formats
      message: 'Success'
    };
  } catch (error) {
    console.error('API request error:', error);
    
    // Handle error response
    if (error.response) {
      // Server responded with a status outside the 2xx range
      return {
        success: false,
        message: error.response.data?.message || 'Error de servidor',
        status: error.response.status
      };
    } else if (error.request) {
      // Request was made but no response received
      return {
        success: false,
        message: 'No se recibió respuesta del servidor'
      };
    } else {
      // Error setting up the request
      return {
        success: false,
        message: error.message || 'Error desconocido'
      };
    }
  }
}

