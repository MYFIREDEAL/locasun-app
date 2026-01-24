/**
 * invariant.js - Assertions de développement pour EVATIME
 * 
 * Usage:
 *   import { invariant, softInvariant } from '@/lib/invariant'
 *   
 *   invariant(user.id, 'User ID is required')           // Throws if falsy
 *   softInvariant(data.length > 0, 'Empty data array')  // Logs warning, returns false
 * 
 * En production, les assertions ne crashent pas l'app mais loggent l'erreur.
 * Quand Sentry sera intégré (PR-05), les violations seront capturées.
 */

const isDev = import.meta.env.DEV

/**
 * Hard invariant - Lance une erreur si la condition est fausse
 * 
 * @param {unknown} condition - Condition qui doit être truthy
 * @param {string} message - Message d'erreur descriptif
 * @throws {Error} En développement, lance toujours. En production, log seulement.
 * 
 * @example
 * invariant(organizationId, 'organizationId is required to fetch prospects')
 * invariant(typeof fn === 'function', `Expected function, got ${typeof fn}`)
 */
export function invariant(condition, message) {
  if (condition) {
    return
  }

  const errorMessage = `[INVARIANT VIOLATION] ${message}`

  if (isDev) {
    // En dev, on crash pour forcer la correction
    throw new Error(errorMessage)
  } else {
    // En prod, on log mais on ne crash pas
    // TODO: Envoyer à Sentry quand intégré (PR-05)
    console.error(errorMessage)
    console.trace('Invariant violation stack:')
  }
}

/**
 * Soft invariant - Log un warning si la condition est fausse, ne crash jamais
 * 
 * @param {unknown} condition - Condition qui devrait être truthy
 * @param {string} message - Message de warning descriptif
 * @returns {boolean} - true si la condition est truthy, false sinon
 * 
 * @example
 * if (!softInvariant(data.length > 0, 'Received empty data array')) {
 *   return [] // Handle gracefully
 * }
 */
export function softInvariant(condition, message) {
  if (condition) {
    return true
  }

  const warningMessage = `[SOFT INVARIANT] ${message}`
  
  if (isDev) {
    console.warn(warningMessage)
    console.trace('Soft invariant stack:')
  } else {
    // En prod, on log discrètement
    // TODO: Envoyer à Sentry comme warning quand intégré (PR-05)
    console.warn(warningMessage)
  }

  return false
}

/**
 * Assert type helper - Vérifie le type d'une valeur
 * 
 * @param {unknown} value - Valeur à vérifier
 * @param {string} expectedType - Type attendu ('string', 'number', 'object', 'array', 'function')
 * @param {string} name - Nom de la variable pour le message d'erreur
 * 
 * @example
 * assertType(userId, 'string', 'userId')
 * assertType(callback, 'function', 'callback')
 */
export function assertType(value, expectedType, name) {
  let actualType
  let isValid = false

  switch (expectedType) {
    case 'array':
      isValid = Array.isArray(value)
      actualType = Array.isArray(value) ? 'array' : typeof value
      break
    case 'null':
      isValid = value === null
      actualType = value === null ? 'null' : typeof value
      break
    default:
      isValid = typeof value === expectedType
      actualType = typeof value
  }

  invariant(
    isValid,
    `Expected ${name} to be ${expectedType}, got ${actualType}`
  )
}

/**
 * Assert defined - Vérifie qu'une valeur n'est pas undefined ou null
 * 
 * @param {unknown} value - Valeur à vérifier
 * @param {string} name - Nom de la variable pour le message d'erreur
 * 
 * @example
 * assertDefined(response.data, 'response.data')
 */
export function assertDefined(value, name) {
  invariant(
    value !== undefined && value !== null,
    `${name} must be defined, got ${value === undefined ? 'undefined' : 'null'}`
  )
}

/**
 * Assert UUID - Vérifie qu'une string est un UUID valide
 * 
 * @param {string} value - Valeur à vérifier
 * @param {string} name - Nom de la variable pour le message d'erreur
 * 
 * @example
 * assertUUID(prospectId, 'prospectId')
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function assertUUID(value, name) {
  invariant(
    typeof value === 'string' && UUID_REGEX.test(value),
    `${name} must be a valid UUID, got "${value}"`
  )
}

export default invariant
