import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

// Cache structure to store API responses
const cache = new Map();

// Cache TTL in milliseconds (15 minutes)
const CACHE_TTL = 15 * 60 * 1000;

/**
 * Custom hook for fetching and managing financial data
 * @param {string} endpoint - The API endpoint to fetch data from
 * @param {Object} params - Query parameters for the API request
 * @param {boolean} skipCache - Whether to skip checking the cache (default: false)
 * @returns {Object} - Object containing data, loading state, error state, and refetch function
 */
export default function useFinancialData(endpoint, params = {}, skipCache = false) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Generate a cache key based on endpoint and params
  const cacheKey = generateCacheKey(endpoint, params);
  
  /**
   * Refetch data function that can be called manually
   * @param {boolean} ignoreCache - Whether to ignore the cache
   */
  const refetch = useCallback(async (ignoreCache = false) => {
    setLoading(true);
    setError(null);
    
    try {
      // Check cache first unless skipCache or ignoreCache is true
      if (!skipCache && !ignoreCache) {
        const cachedData = getCachedData(cacheKey);
        if (cachedData) {
          setData(cachedData);
          setLoading(false);
          return;
        }
      }
      
      // If no cached data or ignoring cache, fetch from API
      const response = await fetchData(endpoint, params);
      
      if (response.success) {
        // Update state with fetched data
        setData(response.data);
        
        // Store in cache unless skipCache is true
        if (!skipCache) {
          setCachedData(cacheKey, response.data);
        }
      } else {
        throw new Error(response.message || 'Error fetching financial data');
      }
    } catch (err) {
      console.error('Error in useFinancialData:', err);
      setError(err.message || 'An error occurred while fetching data');
    } finally {
      setLoading(false);
    }
  }, [endpoint, cacheKey, skipCache, ...Object.values(params)]);
  
  // Fetch data on mount or when dependencies change
  useEffect(() => {
    refetch();
    
    // Optional: Set up cache invalidation timer
    const invalidateTimer = !skipCache 
      ? setTimeout(() => {
          // Remove item from cache after TTL expires
          cache.delete(cacheKey);
        }, CACHE_TTL) 
      : null;
    
    return () => {
      if (invalidateTimer) clearTimeout(invalidateTimer);
    };
  }, [refetch]);
  
  return { data, loading, error, refetch };
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
 * @returns {Object|null} - Cached data or null
 */
function getCachedData(key) {
  if (!cache.has(key)) return null;
  
  const { data, timestamp } = cache.get(key);
  const isExpired = Date.now() - timestamp > CACHE_TTL;
  
  if (isExpired) {
    cache.delete(key);
    return null;
  }
  
  return data;
}

/**
 * Store data in cache with current timestamp
 * @param {string} key - Cache key
 * @param {Object} data - Data to cache
 */
function setCachedData(key, data) {
  cache.set(key, {
    data,
    timestamp: Date.now()
  });
}

/**
 * Fetch data from API
 * @param {string} endpoint - API endpoint
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} - API response
 */
async function fetchData(endpoint, params) {
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
    
    const { data } = await axios.get(url);
    return data;
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

