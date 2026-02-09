/**
 * Global Axios interceptor for error handling and request correlation
 * Provides consistent error handling, logging, and user feedback
 */

import axios from "axios";
import { toast } from "sonner";

let requestId = 0;

/**
 * Setup axios interceptors for all requests
 */
export function setupAxiosInterceptors() {
  // Request interceptor - add correlation ID
  axios.interceptors.request.use(
    (config) => {
      const id = ++requestId;
      config.headers["X-Request-ID"] = `req-${id}`;
      
      // Dev logging only
      if (process.env.NODE_ENV === "development") {
        console.log(`[REQ-${id}] ${config.method.toUpperCase()} ${config.url}`, {
          params: config.params,
          // Don't log sensitive data
          hasData: !!config.data,
        });
      }
      
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor - handle errors
  axios.interceptors.response.use(
    (response) => {
      const id = response.config.headers["X-Request-ID"];
      if (process.env.NODE_ENV === "development") {
        console.log(`[RES-${id}] ${response.status}`, {
          url: response.config.url,
        });
      }
      return response;
    },
    (error) => {
      const id = error.config?.headers?.["X-Request-ID"] || "unknown";
      const status = error.response?.status;
      const data = error.response?.data;
      
      // Log full error in dev
      if (process.env.NODE_ENV === "development") {
        console.error(`[ERR-${id}] ${status}`, {
          url: error.config?.url,
          message: error.message,
          responseData: data,
          stack: error.stack,
        });
      }

      // Map status to user-friendly message
      let userMessage = "We hit an unexpected error. Please try again.";
      let showRequestId = false;

      if (status === 400) {
        userMessage = data?.message || "Invalid request. Please check your input.";
      } else if (status === 401) {
        userMessage = "Your session expired. Please log in again.";
      } else if (status === 403) {
        userMessage = "You don't have permission to perform this action.";
      } else if (status === 404) {
        userMessage = data?.message || "Resource not found.";
      } else if (status === 409) {
        userMessage = "This resource already exists or there's a conflict.";
      } else if (status === 500 || status === 502 || status === 503) {
        userMessage = "Server error. Our team has been notified. Try again later.";
        showRequestId = true;
      }

      // Show toast to user (non-dev)
      if (process.env.NODE_ENV !== "development") {
        if (showRequestId) {
          toast.error(userMessage, {
            description: `Request ID: ${id}`,
            duration: 5000,
          });
        } else {
          toast.error(userMessage, { duration: 3000 });
        }
      }

      return Promise.reject(error);
    }
  );
}

/**
 * Utility to safely retry only idempotent GET requests
 */
export async function safeRetryGet(url, config = {}, maxRetries = 1) {
  let lastError;
  
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await axios.get(url, config);
    } catch (error) {
      lastError = error;
      
      // Only retry on network errors, not 4xx/5xx
      if (error.response) {
        throw error; // Don't retry if we got a response
      }
      
      if (i < maxRetries) {
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 100));
      }
    }
  }
  
  throw lastError;
}