/**
 * safeAsync.js - Utilitaires pour gérer les erreurs async de manière safe
 * 
 * Objectif : Éviter les rejections non gérées qui causent des pages blanches.
 * 
 * Usage:
 *   import { safeAsync, withRetry, createAbortableAsync } from '@/lib/safeAsync'
 *   
 *   const [data, error] = await safeAsync(fetchProspects())
 *   if (error) { console.error(error); return }
 */

const isDev = import.meta.env.DEV

/**
 * Wraps an async operation and returns [result, error] tuple
 * Never throws - always returns a tuple for safe destructuring
 * 
 * @template T
 * @param {Promise<T>} promise - The promise to wrap
 * @returns {Promise<[T, null] | [null, Error]>} - Tuple of [result, error]
 * 
 * @example
 * const [data, error] = await safeAsync(supabase.from('prospects').select())
 * if (error) {
 *   console.error('Failed to fetch prospects:', error)
 *   return []
 * }
 * return data
 */
export async function safeAsync(promise) {
  try {
    const result = await promise
    return [result, null]
  } catch (error) {
    // Normalize error object
    const normalizedError = error instanceof Error ? error : new Error(String(error))
    
    if (isDev) {
      console.error('[safeAsync] Caught error:', normalizedError)
    }
    
    // TODO: Send to Sentry when integrated (PR-05)
    
    return [null, normalizedError]
  }
}

/**
 * Wraps a Supabase query and handles both Supabase errors and exceptions
 * Supabase returns { data, error } - this normalizes to [data, error] tuple
 * 
 * @template T
 * @param {Promise<{ data: T, error: any }>} supabaseQuery - Supabase query promise
 * @returns {Promise<[T, null] | [null, Error]>} - Normalized tuple
 * 
 * @example
 * const [prospects, error] = await safeSupabaseQuery(
 *   supabase.from('prospects').select('*').eq('organization_id', orgId)
 * )
 */
export async function safeSupabaseQuery(supabaseQuery) {
  try {
    const { data, error } = await supabaseQuery
    
    if (error) {
      const supabaseError = new Error(error.message || 'Supabase query failed')
      supabaseError.code = error.code
      supabaseError.details = error.details
      supabaseError.hint = error.hint
      
      if (isDev) {
        console.error('[safeSupabaseQuery] Supabase error:', error)
      }
      
      return [null, supabaseError]
    }
    
    return [data, null]
  } catch (error) {
    const normalizedError = error instanceof Error ? error : new Error(String(error))
    
    if (isDev) {
      console.error('[safeSupabaseQuery] Exception:', normalizedError)
    }
    
    return [null, normalizedError]
  }
}

/**
 * Retry an async operation with exponential backoff
 * 
 * @template T
 * @param {() => Promise<T>} fn - Async function to retry
 * @param {Object} options - Retry options
 * @param {number} [options.maxAttempts=3] - Maximum number of attempts
 * @param {number} [options.baseDelay=1000] - Base delay in ms (doubles each retry)
 * @param {(error: Error, attempt: number) => boolean} [options.shouldRetry] - Custom retry condition
 * @returns {Promise<[T, null] | [null, Error]>} - Tuple of [result, error]
 * 
 * @example
 * const [data, error] = await withRetry(
 *   () => fetchFromAPI(),
 *   { maxAttempts: 3, baseDelay: 500 }
 * )
 */
export async function withRetry(fn, options = {}) {
  const {
    maxAttempts = 3,
    baseDelay = 1000,
    shouldRetry = () => true
  } = options

  let lastError = null

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await fn()
      return [result, null]
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      
      if (isDev) {
        console.warn(`[withRetry] Attempt ${attempt}/${maxAttempts} failed:`, lastError.message)
      }

      // Check if we should retry
      if (attempt === maxAttempts || !shouldRetry(lastError, attempt)) {
        break
      }

      // Exponential backoff
      const delay = baseDelay * Math.pow(2, attempt - 1)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  return [null, lastError]
}

/**
 * Creates an abortable async operation
 * Useful for cleanup in useEffect to prevent state updates on unmounted components
 * 
 * @template T
 * @param {(signal: AbortSignal) => Promise<T>} fn - Async function that receives AbortSignal
 * @returns {{ promise: Promise<[T, null] | [null, Error]>, abort: () => void }}
 * 
 * @example
 * useEffect(() => {
 *   const { promise, abort } = createAbortableAsync(async (signal) => {
 *     const response = await fetch('/api/data', { signal })
 *     return response.json()
 *   })
 *   
 *   promise.then(([data, error]) => {
 *     if (error?.name === 'AbortError') return // Ignore aborted requests
 *     if (error) console.error(error)
 *     else setData(data)
 *   })
 *   
 *   return () => abort() // Cleanup on unmount
 * }, [])
 */
export function createAbortableAsync(fn) {
  const controller = new AbortController()
  
  const promise = (async () => {
    try {
      const result = await fn(controller.signal)
      return [result, null]
    } catch (error) {
      const normalizedError = error instanceof Error ? error : new Error(String(error))
      return [null, normalizedError]
    }
  })()

  return {
    promise,
    abort: () => controller.abort()
  }
}

/**
 * Debounced async function - prevents rapid-fire calls
 * 
 * @template T
 * @param {(...args: any[]) => Promise<T>} fn - Async function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {(...args: any[]) => Promise<[T, null] | [null, Error]>}
 * 
 * @example
 * const debouncedSearch = debounceAsync(searchAPI, 300)
 * const [results, error] = await debouncedSearch(query)
 */
export function debounceAsync(fn, delay) {
  let timeoutId = null
  let pendingResolve = null

  return async (...args) => {
    // Cancel previous pending call
    if (timeoutId) {
      clearTimeout(timeoutId)
      if (pendingResolve) {
        pendingResolve([null, new Error('Debounced - newer call pending')])
      }
    }

    return new Promise((resolve) => {
      pendingResolve = resolve
      timeoutId = setTimeout(async () => {
        timeoutId = null
        pendingResolve = null
        const result = await safeAsync(fn(...args))
        resolve(result)
      }, delay)
    })
  }
}

export default safeAsync
