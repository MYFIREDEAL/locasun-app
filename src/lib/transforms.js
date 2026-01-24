/**
 * PR-4: Transforms centralisés Supabase ↔ App
 * 
 * Ce module définit les mappings de champs entre :
 * - Supabase (snake_case) : company_name, owner_id, start_time, etc.
 * - App (camelCase) : companyName, ownerId, start, etc.
 * 
 * CHAMPS SENSIBLES VÉRIFIÉS :
 * - company_name ↔ companyName (+ alias "company" pour compatibilité)
 * - owner_id ↔ ownerId
 * - contact_id ↔ contactId
 * - start_time ↔ start (PAS startTime - l'app utilise "start")
 * - end_time ↔ end (PAS endTime - l'app utilise "end")
 * - assigned_user_id ↔ assignedUserId
 * - project_id ↔ projectId
 * - created_at ↔ createdAt
 * - updated_at ↔ updatedAt
 * - has_appointment ↔ hasAppointment
 * - affiliate_name ↔ affiliateName
 * - form_data ↔ formData (+ alias form_data pour compatibilité)
 * - rescheduled_from_id ↔ rescheduledFromId
 */

// ============================================================
// PROSPECT TRANSFORMS
// ============================================================

/**
 * Mapping explicite des champs prospects Supabase → App
 * Les clés sont les noms Supabase, les valeurs sont les noms App
 */
const PROSPECT_FIELD_MAP = {
  id: 'id',
  name: 'name',
  email: 'email',
  phone: 'phone',
  address: 'address',
  status: 'status',
  tags: 'tags',
  notes: 'notes',
  // Champs sensibles avec transformation
  company_name: 'companyName',
  owner_id: 'ownerId',
  has_appointment: 'hasAppointment',
  affiliate_name: 'affiliateName',
  form_data: 'formData',
  created_at: 'createdAt',
  updated_at: 'updatedAt',
  user_id: 'userId',
  organization_id: 'organizationId',
};

/**
 * Transforme un prospect Supabase (snake_case) vers format App (camelCase)
 * @param {Object} dbProspect - Prospect depuis Supabase
 * @returns {Object} Prospect pour l'app
 */
export const prospectToCamel = (dbProspect) => {
  if (!dbProspect) return null;
  
  const result = {};
  
  // Appliquer le mapping
  for (const [dbKey, appKey] of Object.entries(PROSPECT_FIELD_MAP)) {
    if (dbProspect[dbKey] !== undefined) {
      result[appKey] = dbProspect[dbKey];
    }
  }
  
  // Alias spéciaux pour compatibilité
  result.company = dbProspect.company_name; // Alias legacy
  result.form_data = dbProspect.form_data || {}; // Double pour compatibilité
  
  // Valeurs par défaut
  result.tags = result.tags || [];
  result.formData = result.formData || {};
  result.hasAppointment = result.hasAppointment || false;
  
  return result;
};

/**
 * Transforme un prospect App (camelCase) vers format Supabase (snake_case)
 * @param {Object} appProspect - Prospect depuis l'app
 * @returns {Object} Prospect pour Supabase
 */
export const prospectToSnake = (appProspect) => {
  if (!appProspect) return null;
  
  const result = {};
  
  // Mapping inverse
  const reverseMap = {
    id: 'id',
    name: 'name',
    email: 'email',
    phone: 'phone',
    address: 'address',
    status: 'status',
    tags: 'tags',
    notes: 'notes',
    companyName: 'company_name',
    company: 'company_name', // Alias
    ownerId: 'owner_id',
    hasAppointment: 'has_appointment',
    affiliateName: 'affiliate_name',
    formData: 'form_data',
    form_data: 'form_data', // Passthrough
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    userId: 'user_id',
    organizationId: 'organization_id',
  };
  
  for (const [appKey, dbKey] of Object.entries(reverseMap)) {
    if (appProspect[appKey] !== undefined) {
      result[dbKey] = appProspect[appKey];
    }
  }
  
  return result;
};

// ============================================================
// APPOINTMENT TRANSFORMS
// ============================================================

/**
 * Mapping explicite des champs appointments Supabase → App
 * ATTENTION : start_time → start (pas startTime !)
 */
const APPOINTMENT_FIELD_MAP = {
  id: 'id',
  title: 'title',
  type: 'type',
  status: 'status',
  notes: 'notes',
  location: 'location',
  share: 'share',
  step: 'step',
  // Champs sensibles avec transformation
  start_time: 'start',      // CRITIQUE: L'app utilise "start" pas "startTime"
  end_time: 'end',          // CRITIQUE: L'app utilise "end" pas "endTime"
  contact_id: 'contactId',
  assigned_user_id: 'assignedUserId',
  project_id: 'projectId',
  rescheduled_from_id: 'rescheduledFromId',
  created_at: 'createdAt',
  updated_at: 'updatedAt',
  organization_id: 'organizationId',
};

/**
 * Transforme un appointment Supabase (snake_case) vers format App (camelCase)
 * @param {Object} dbAppointment - Appointment depuis Supabase
 * @returns {Object} Appointment pour l'app
 */
export const appointmentToCamel = (dbAppointment) => {
  if (!dbAppointment) return null;
  
  const result = {};
  
  for (const [dbKey, appKey] of Object.entries(APPOINTMENT_FIELD_MAP)) {
    if (dbAppointment[dbKey] !== undefined) {
      result[appKey] = dbAppointment[dbKey];
    }
  }
  
  return result;
};

/**
 * Transforme un appointment App (camelCase) vers format Supabase (snake_case)
 * @param {Object} appAppointment - Appointment depuis l'app
 * @returns {Object} Appointment pour Supabase
 */
export const appointmentToSnake = (appAppointment) => {
  if (!appAppointment) return null;
  
  const result = {};
  
  const reverseMap = {
    id: 'id',
    title: 'title',
    type: 'type',
    status: 'status',
    notes: 'notes',
    location: 'location',
    share: 'share',
    step: 'step',
    start: 'start_time',      // CRITIQUE
    end: 'end_time',          // CRITIQUE
    startTime: 'start_time',  // Alias si quelqu'un utilise startTime
    endTime: 'end_time',      // Alias si quelqu'un utilise endTime
    contactId: 'contact_id',
    assignedUserId: 'assigned_user_id',
    projectId: 'project_id',
    rescheduledFromId: 'rescheduled_from_id',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    organizationId: 'organization_id',
  };
  
  for (const [appKey, dbKey] of Object.entries(reverseMap)) {
    if (appAppointment[appKey] !== undefined) {
      result[dbKey] = appAppointment[appKey];
    }
  }
  
  return result;
};

// ============================================================
// USER TRANSFORMS
// ============================================================

/**
 * Mapping explicite des champs users Supabase → App
 */
const USER_FIELD_MAP = {
  id: 'id',
  name: 'name',
  email: 'email',
  role: 'role',
  avatar: 'avatar',
  // Champs sensibles
  user_id: 'userId',
  auth_id: 'authId',
  organization_id: 'organizationId',
  manager_id: 'managerId',
  created_at: 'createdAt',
  updated_at: 'updatedAt',
  last_login: 'lastLogin',
};

/**
 * Transforme un user Supabase (snake_case) vers format App (camelCase)
 * @param {Object} dbUser - User depuis Supabase
 * @returns {Object} User pour l'app
 */
export const userToCamel = (dbUser) => {
  if (!dbUser) return null;
  
  const result = {};
  
  for (const [dbKey, appKey] of Object.entries(USER_FIELD_MAP)) {
    if (dbUser[dbKey] !== undefined) {
      result[appKey] = dbUser[dbKey];
    }
  }
  
  // Garder user_id aussi pour compatibilité
  result.user_id = dbUser.user_id;
  
  return result;
};

/**
 * Transforme un user App (camelCase) vers format Supabase (snake_case)
 * @param {Object} appUser - User depuis l'app
 * @returns {Object} User pour Supabase
 */
export const userToSnake = (appUser) => {
  if (!appUser) return null;
  
  const result = {};
  
  const reverseMap = {
    id: 'id',
    name: 'name',
    email: 'email',
    role: 'role',
    avatar: 'avatar',
    userId: 'user_id',
    user_id: 'user_id', // Passthrough
    authId: 'auth_id',
    organizationId: 'organization_id',
    managerId: 'manager_id',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    lastLogin: 'last_login',
  };
  
  for (const [appKey, dbKey] of Object.entries(reverseMap)) {
    if (appUser[appKey] !== undefined) {
      result[dbKey] = appUser[appKey];
    }
  }
  
  return result;
};

// ============================================================
// HELPERS GÉNÉRIQUES
// ============================================================

/**
 * Transforme un tableau d'objets avec une fonction de transformation
 * @param {Array} items - Tableau d'objets à transformer
 * @param {Function} transformFn - Fonction de transformation
 * @returns {Array} Tableau transformé
 */
export const transformArray = (items, transformFn) => {
  if (!Array.isArray(items)) return [];
  return items.map(transformFn).filter(Boolean);
};
