import React, { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Toaster } from '@/components/ui/toaster';
import AdminLayout from '@/layouts/AdminLayout';
import ClientLayout from '@/layouts/ClientLayout';
import PlatformLayout from '@/layouts/PlatformLayout';
import PartnerLayout from '@/layouts/PartnerLayout';

// 🔥 PR-6: Lazy load des pages lourdes pour code splitting
const FinalPipeline = lazy(() => import('@/pages/admin/FinalPipeline'));
const Agenda = lazy(() => import('@/pages/admin/Agenda'));
const ProfilePage = lazy(() => import('@/pages/admin/ProfilePage'));
const CharlyPage = lazy(() => import('@/pages/admin/CharlyPage'));
const ConfigurationIA = lazy(() => import('@/pages/admin/ConfigurationIA'));
const ContractTemplatesPage = lazy(() => import('@/pages/admin/ContractTemplatesPage'));
const ContractTemplateEditorPage = lazy(() => import('@/pages/admin/ContractTemplateEditorPage'));
const ClientDashboardPage = lazy(() => import('@/pages/client/ClientDashboardPage'));
// 🔥 V2: Workflow V2 LIVE (lazy loaded, isolé)
const WorkflowV2Page = lazy(() => import('@/pages/admin/WorkflowV2Page'));
// 🔥 V2: Prospect Details V2 (lazy loaded, isolé)
const ProspectDetailsV2 = lazy(() => import('@/components/admin/ProspectDetailsV2'));
// 🔥 PROMPT 10: Cockpit Workflow V2 Config (lazy loaded)
const WorkflowV2ConfigPage = lazy(() => import('@/pages/admin/WorkflowV2ConfigPage'));

// Pages moins lourdes - import statique
import CompleteOriginalContacts from '@/pages/admin/CompleteOriginalContacts';
import WorkflowsCharlyPage from '@/pages/admin/WorkflowsCharlyPage';
import LandingPageConfigPage from '@/pages/admin/LandingPageConfigPage';
import ProjectsManagementPage from '@/pages/admin/ProjectsManagementPage';
import FormsManagementPage from '@/pages/admin/FormsManagementPage';
import ProjectDisplayManagementPage from '@/pages/admin/ProjectDisplayManagementPage';
import PartnersListPage from '@/pages/admin/PartnersListPage';
import PartnerDetailPage from '@/pages/admin/PartnerDetailPage';
import PartnerLoginPage from '@/pages/partner/PartnerLoginPage';
import PartnerHomePage from '@/pages/partner/PartnerHomePage';
import PartnerMissionsPage from '@/pages/partner/PartnerMissionsPage';
import PartnerMissionDetailPage from '@/pages/partner/PartnerMissionDetailPage';
import ParrainagePage from '@/pages/client/ParrainagePage';
import SettingsPage from '@/pages/client/SettingsPage';
import OffersPage from '@/pages/client/OffersPage';
import ActivationPage from '@/pages/client/ActivationPage';
import ActivateAccountPage from '@/pages/ActivateAccountPage';
import OrganizationsListPage from '@/pages/platform/OrganizationsListPage';
import OrganizationDetailPage from '@/pages/platform/OrganizationDetailPage';
import PlatformLoginPage from '@/pages/platform/PlatformLoginPage';
import PlatformHomePage from '@/pages/platform/PlatformHomePage';
import HomePage from '@/pages/HomePage';
import ClientAccessPage from '@/pages/ClientAccessPage';
import ProLoginPage from '@/pages/ProLoginPage';
import RegistrationPage from '@/pages/RegistrationPage';
import SignupPage from '@/pages/SignupPage';
import ProducerLandingPage from '@/pages/ProducerLandingPage';
import TestSupabasePage from '@/pages/TestSupabasePage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import SignaturePage from '@/pages/SignaturePage';
import CosignerSignaturePage from '@/pages/CosignerSignaturePage';
import Landing from '@/pages/landing';
import { useOrganization } from '@/contexts/OrganizationContext';
// ✅ allProjectsData maintenant chargé depuis Supabase (project_templates table)
import { toast } from '@/components/ui/use-toast';
import { slugify } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { formContactConfig as defaultFormContactConfig } from '@/config/formContactConfig';
import { supabase } from '@/lib/supabase';
import { useUsers } from '@/contexts/UsersContext';
import { useSupabaseProspects } from '@/hooks/useSupabaseProspects'; // 🔥 AJOUT PRO
import { useSupabaseAgenda } from '@/hooks/useSupabaseAgenda'; // 🔥 PR-3: Source unique agenda
import { useSupabaseCompanySettings } from '@/hooks/useSupabaseCompanySettings';
import { useSupabaseGlobalPipeline } from '@/hooks/useSupabaseGlobalPipeline';
import { useSupabaseProjectTemplates } from '@/hooks/useSupabaseProjectTemplates';
import { useSupabaseForms } from '@/hooks/useSupabaseForms';
import { useSupabasePrompts } from '@/hooks/useSupabasePrompts';
import { useSupabaseNotifications } from '@/hooks/useSupabaseNotifications';
import { useSupabaseClientNotifications } from '@/hooks/useSupabaseClientNotifications';
import { useSupabaseClientFormPanels } from '@/hooks/useSupabaseClientFormPanels'; // 🔥 AJOUT
import { useSupabaseAllProjectSteps } from '@/hooks/useSupabaseAllProjectSteps'; // 🔥 Précharger au niveau App
import { useSupabaseProjectInfos } from '@/hooks/useSupabaseProjectInfos';
import { useAutoCreateTasks } from '@/hooks/useAutoCreateTasks';
import { useAutoVerificationTasks } from '@/hooks/useAutoVerificationTasks'; // 🔥 AJOUT: Tâches de vérification
import { useFormReminderWatcher } from '@/hooks/useFormReminderWatcher'; // 🔥 AJOUT: Surveillance relances formulaires
import { usePresenceCheck } from '@/hooks/usePresenceCheck'; // 🔥 AJOUT: Message "Vous êtes toujours là ?"
import { useReminderReset } from '@/hooks/useReminderReset'; // 🔥 AJOUT: Reset relances quand client répond
import { supabase as supabaseClient } from '@/lib/supabase';

// ✅ globalPipelineSteps et projectTemplates maintenant gérés par Supabase (constantes localStorage supprimées)
const GLOBAL_PIPELINE_COLOR_PALETTE = [
  'bg-blue-100',
  'bg-yellow-100',
  'bg-green-100',
  'bg-purple-100',
  'bg-orange-100',
  'bg-indigo-100',
  'bg-teal-100',
  'bg-pink-100',
  'bg-rose-100',
  'bg-gray-100',
];
const DEFAULT_GLOBAL_PIPELINE_COLORS = {
  MARKET: 'bg-blue-100',
  ETUDE: 'bg-yellow-100',
  OFFRE: 'bg-green-100',
  CONTRAT: 'bg-blue-100',
  'CONTRAT OK': 'bg-blue-100',
  'CLIENT ACTIF': 'bg-purple-100',
};

const normalizeGlobalPipelineLabel = (label) => (label || '').toString().trim().toUpperCase();
const buildGlobalPipelineStep = (label, id, color, index = 0) => {
  const normalizedLabel = normalizeGlobalPipelineLabel(label);
  const fallbackColor =
    DEFAULT_GLOBAL_PIPELINE_COLORS[normalizedLabel] ||
    GLOBAL_PIPELINE_COLOR_PALETTE[index % GLOBAL_PIPELINE_COLOR_PALETTE.length];

  return {
    id: id || `global-pipeline-step-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    label: normalizedLabel,
    color: typeof color === 'string' && color.trim() ? color : fallbackColor,
  };
};

const buildDefaultGlobalPipelineSteps = () =>
  DEFAULT_GLOBAL_PIPELINE_STEPS.map((label, index) =>
    buildGlobalPipelineStep(label, `default-global-pipeline-step-${index}`, undefined, index)
  );

const sanitizeGlobalPipelineSteps = (steps) => {
  if (!Array.isArray(steps)) return [];
  return steps
    .map((step, index) => {
      if (typeof step === 'string') {
        const label = normalizeGlobalPipelineLabel(step);
        return label ? buildGlobalPipelineStep(label, `legacy-global-pipeline-${index}`, undefined, index) : null;
      }
      if (step && typeof step === 'object' && 'label' in step) {
        const label = normalizeGlobalPipelineLabel(step.label);
        if (!label) return null;
        const color = typeof step.color === 'string' ? step.color : undefined;
        return buildGlobalPipelineStep(label, step.id || `legacy-global-pipeline-${index}`, color, index);
      }
      return null;
    })
    .filter(Boolean);
};

// 🔥 PHASE 2: Constante obsolète - project_infos géré par useSupabaseProjectInfos()
// const PROJECT_INFO_STORAGE_KEY = 'evatime_project_infos';

const areFormConfigsEqual = (a = [], b = []) => {
  if (a === b) return true;
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    const fieldA = a[i];
    const fieldB = b[i];
    if (!fieldA || !fieldB) return false;
    if (
      fieldA.id !== fieldB.id ||
      fieldA.name !== fieldB.name ||
      fieldA.type !== fieldB.type ||
      fieldA.placeholder !== fieldB.placeholder ||
      Boolean(fieldA.required) !== Boolean(fieldB.required)
    ) {
      return false;
    }
  }
  return true;
};

const areGlobalPipelineStepsEqual = (a = [], b = []) => {
  if (a === b) return true;
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    const stepA = a[i];
    const stepB = b[i];
    if (!stepA || !stepB) return false;
    if (
      stepA.id !== stepB.id ||
      stepA.label !== stepB.label ||
      stepA.color !== stepB.color
    ) {
      return false;
    }
  }
  return true;
};

const scheduleDeferredWrite = (callback) => {
  if (typeof window === 'undefined') {
    callback();
    return () => {};
  }

  if (typeof window.requestIdleCallback === 'function') {
    const idleId = window.requestIdleCallback(() => callback());
    return () => {
      if (typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(idleId);
      }
    };
  }

  const timeoutId = window.setTimeout(() => callback(), 120);
  return () => window.clearTimeout(timeoutId);
};

const AppContext = React.createContext();
export const useAppContext = () => React.useContext(AppContext);

/**
 * 🔥 PR-1: Boot Status Machine
 * 
 * États possibles (ordre linéaire) :
 * - 'init'          : App vient de monter
 * - 'resolving_org' : Résolution hostname → organization_id en cours
 * - 'auth'          : Vérification session Supabase
 * - 'loading_user'  : Chargement profil admin/client depuis Supabase
 * - 'ready'         : ✅ Tout est prêt, app peut fonctionner
 * - 'error'         : ❌ Échec (timeout, réseau, etc.)
 * 
 * Transitions :
 * init → resolving_org (automatique au mount)
 * resolving_org → auth (quand organizationReady = true)
 * resolving_org → error (timeout 10s)
 * auth → loading_user (quand session trouvée)
 * auth → ready (si route publique ou pas de session)
 * loading_user → ready (quand admin/client chargé)
 * loading_user → error (échec DB)
 */
const BOOT_STATUS = {
  INIT: 'init',
  RESOLVING_ORG: 'resolving_org',
  AUTH: 'auth',
  LOADING_USER: 'loading_user',
  READY: 'ready',
  ERROR: 'error'
};

function App() {
  const location = useLocation();
  
  // 🔥 ISOLATION: Landing page ne doit jamais exécuter la logique app
  if (location.pathname === '/landing') {
    return <Landing />;
  }
  
  const navigate = useNavigate();
  const isAdminRoute = location.pathname.startsWith('/admin');
  
  // 🔥 PR-1: Boot status unifié remplaçant les booléens dispersés
  const [bootStatus, setBootStatus] = useState(BOOT_STATUS.INIT);
  const [bootError, setBootError] = useState(null);
  
  // 🔥 RÉCUPÉRATION DE L'ORGANIZATION + BRANDING DEPUIS LE CONTEXT
  const { 
    organizationId, 
    organizationLoading, 
    organizationError,
    organizationReady, // 🔥 FIX BOUCLE #310: Flag pour gater les hooks Supabase
    brandName,
    logoUrl,
    primaryColor,
    secondaryColor,
    brandingLoading,
    brandingError
  } = useOrganization();
  
  const [userProjects, setUserProjects] = useState([]);
  // ✅ projectsData maintenant géré par useSupabaseProjectTemplates (plus de localStorage)
  const [prospects, setProspects] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [projectStepsStatus, setProjectStepsStatus] = useState({});
  const [calls, setCalls] = useState([]);
  const [tasks, setTasks] = useState([]);
  // ❌ SUPPRIMÉ: users localStorage - Maintenant géré par useSupabaseUsers() et useSupabaseUsersCRUD()
  // const [users, setUsers] = useState({});
  // ❌ SUPPRIMÉ: chatMessages localStorage - Maintenant géré par Supabase real-time (useSupabaseChatMessages dans composants)
  // const [chatMessages, setChatMessages] = useState({});
  // ❌ SUPPRIMÉ: notifications localStorage - Maintenant géré par Supabase real-time (useSupabaseNotifications)
  // const [notifications, setNotifications] = useState([]);
  // const [clientNotifications, setClientNotifications] = useState([]);
  // 🔥 forms maintenant synchronisé depuis Supabase (useSupabaseForms) - Pas de localStorage
  const [forms, setForms] = useState({});
  const [prompts, setPrompts] = useState({});
  // 🔥 PHASE 2: Double lecture form_contact_config (organization_settings prioritaire, fallback company_settings)
  const [orgFormContactConfig, setOrgFormContactConfig] = useState(null);
  // formContactConfig est maintenant géré par useSupabaseCompanySettings (plus besoin de useState)
  // ❌ SUPPRIMÉ: const [projectInfos, setProjectInfos] = useState({}) - Utiliser supabaseProjectInfos du hook
  // ✅ globalPipelineSteps maintenant géré par useSupabaseGlobalPipeline (plus de localStorage)
  const [activeAdminUser, setActiveAdminUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true); // 🔥 État de chargement auth
  const [adminReady, setAdminReady] = useState(false); // 🔥 Flag pour activer les hooks Supabase
  const [session, setSession] = useState(null); // 🔥 Session Supabase
  const [unlinkedInOrg, setUnlinkedInOrg] = useState(false); // 🔥 Multi-tenant: compte non lié à l'orga du hostname
  // ❌ SUPPRIMÉ : const [clientFormPanels, setClientFormPanels] = useState([]);
  const hasHydratedGlobalPipelineSteps = useRef(false);

  // 🔥 PR-1: Machine d'état bootStatus - transitions automatiques
  useEffect(() => {
    // Transition: INIT → RESOLVING_ORG (au mount)
    if (bootStatus === BOOT_STATUS.INIT) {
      setBootStatus(BOOT_STATUS.RESOLVING_ORG);
      return;
    }

    // Transition: RESOLVING_ORG → AUTH (quand org résolue)
    if (bootStatus === BOOT_STATUS.RESOLVING_ORG) {
      if (organizationError) {
        logger.error('[Boot] Organization resolution failed', { error: organizationError });
        setBootError(organizationError);
        setBootStatus(BOOT_STATUS.ERROR);
        return;
      }
      if (organizationReady) {
        logger.info('[Boot] Organization resolved, moving to auth', { organizationId });
        setBootStatus(BOOT_STATUS.AUTH);
        return;
      }
      // Sinon, attendre...
    }

    // Transition: AUTH → LOADING_USER ou READY
    if (bootStatus === BOOT_STATUS.AUTH) {
      if (!authLoading) {
        // Auth terminé
        if (session) {
          logger.info('[Boot] Session found, loading user profile');
          setBootStatus(BOOT_STATUS.LOADING_USER);
        } else {
          // Pas de session = route publique ou non connecté
          logger.info('[Boot] No session, boot complete');
          setBootStatus(BOOT_STATUS.READY);
        }
        return;
      }
      // Sinon, attendre auth...
    }

    // Transition: LOADING_USER → READY
    if (bootStatus === BOOT_STATUS.LOADING_USER) {
      // On est ready quand on a soit un admin, soit un client, soit aucun (timeout géré ailleurs)
      if (adminReady || currentUser || (!activeAdminUser && !currentUser && !authLoading)) {
        logger.info('[Boot] User loaded, boot complete', { 
          isAdmin: !!activeAdminUser, 
          isClient: !!currentUser 
        });
        setBootStatus(BOOT_STATUS.READY);
      }
    }
  }, [bootStatus, organizationReady, organizationError, organizationId, authLoading, session, adminReady, activeAdminUser, currentUser]);

  // 🔥 FIX: TOUJOURS appeler les hooks (React règle des hooks)
  // mais on désactive la logique interne via les paramètres
  
  // 🔥 Charger les utilisateurs Supabase (via cache global UsersContext)
  const { users: supabaseUsers } = useUsers();
  
  // 🔥 ÉTAPE PRO : Charger les prospects depuis Supabase avec le hook qui utilise la RPC
  const { 
    prospects: supabaseProspects,
    addProspect: addProspectSupabase, // 🔥 PR-4.1: Récupérer addProspect du hook
    updateProspect: updateProspectSupabase,
    loading: prospectsLoading 
  } = useSupabaseProspects(authLoading ? null : activeAdminUser); // ✅ Ne charger que si auth ready
  
  // 🔥 PR-3: SOURCE UNIQUE AGENDA - Appeler useSupabaseAgenda UNE SEULE FOIS ici
  const {
    appointments: supabaseAppointments,
    calls: supabaseCalls,
    tasks: supabaseTasks,
    loading: agendaLoading,
    error: agendaError,
    addAppointment: addAppointmentSupabase,
    updateAppointment: updateAppointmentSupabase,
    deleteAppointment: deleteAppointmentSupabase,
    addCall: addCallSupabase,
    updateCall: updateCallSupabase,
    deleteCall: deleteCallSupabase,
    addTask: addTaskSupabase,
    updateTask: updateTaskSupabase,
    deleteTask: deleteTaskSupabase,
    refresh: refreshAgenda,
  } = useSupabaseAgenda(authLoading ? null : activeAdminUser); // ✅ Ne charger que si auth ready
  
  // Synchroniser prospects dans le state pour compatibilité avec le code existant
  useEffect(() => {
    if (!authLoading && !prospectsLoading && supabaseProspects) {
      setProspects(supabaseProspects);
    }
  }, [supabaseProspects, prospectsLoading, authLoading]);
  
  // 🔥 Charger les panneaux de formulaires clients depuis Supabase avec real-time
  // ⚠️ Si client: charger ses formulaires. Si admin: charger TOUS les formulaires (null = tous)
  const isClientRoute = location.pathname.startsWith('/dashboard');
  const prospectIdForForms = (authLoading || !isClientRoute) ? null : currentUser?.id;
  
  // 🔥 Logs seulement si session active (éviter spam lors de l'inscription)
  if (session && !authLoading) {
    logger.debug('App routing info', { 
      isClientRoute, 
      activeAdmin: activeAdminUser?.name,
      currentUser: currentUser?.name,
      prospectIdForForms 
    });
  }
  
  // 🔥 FIX BOOT: Gater avec organizationReady pour éviter appel avant org chargée
  const {
    formPanels: clientFormPanels,
    createFormPanel: registerClientForm,
    updateFormPanel: updateClientFormPanel,
    deleteFormPanelsByProspect: clearClientFormsFor
  } = useSupabaseClientFormPanels(organizationReady ? prospectIdForForms : '__DISABLED__');
  
  // 🔥 Charger les company settings (logo, formulaire contact, etc.) depuis Supabase avec real-time
  // 🔥 SYNC: Passe organizationId pour synchroniser le logo vers organization_settings (Landing Page)
  // 🔥 FIX BOOT: Gater avec organizationReady pour éviter appel avant org chargée
  const { 
    companySettings, 
    updateLogo, 
    removeLogo,
    updateFormContactConfig,
    getFormContactConfig 
  } = useSupabaseCompanySettings({ organizationId, enabled: organizationReady });

  // 🔥 PHASE 2: Charger form_contact_config depuis organization_settings (double lecture)
  useEffect(() => {
    if (!organizationId) {
      setOrgFormContactConfig(null);
      return;
    }

    const loadOrgFormContactConfig = async () => {
      try {
        const { data, error } = await supabase
          .from('organization_settings')
          .select('form_contact_config')
          .eq('organization_id', organizationId)
          .single();

        if (error) {
          // Table ou colonne peut ne pas exister, fallback silencieux
          logger.debug('[App] organization_settings.form_contact_config non trouvé, fallback vers company_settings');
          setOrgFormContactConfig(null);
          return;
        }

        setOrgFormContactConfig(data?.form_contact_config || null);
      } catch (err) {
        logger.debug('[App] Erreur chargement org form_contact_config, fallback vers company_settings');
        setOrgFormContactConfig(null);
      }
    };

    loadOrgFormContactConfig();
  }, [organizationId]);

  // 🔥 Charger les colonnes du pipeline global depuis Supabase avec real-time
  // 🔥 MULTI-TENANT: Passe organizationId pour filtrer par org
  // 🔥 FIX BOOT: Gater avec organizationReady pour éviter appel avant org chargée
  const { 
    globalPipelineSteps,
    loading: pipelineLoading,
    addStep: addPipelineStep,
    updateStep: updatePipelineStep,
    deleteStep: deletePipelineStep,
    reorderSteps: reorderPipelineSteps
  } = useSupabaseGlobalPipeline(organizationReady ? organizationId : null);

  // 🔥 Précharger TOUS les project steps au niveau App pour éviter race conditions
  const { allProjectSteps, loading: allStepsLoading } = useSupabaseAllProjectSteps();

  // 🔥 Synchroniser allProjectSteps (Supabase) avec projectStepsStatus (state local)
  useEffect(() => {
    if (!authLoading && !allStepsLoading && allProjectSteps) {
      setProjectStepsStatus(prev => {
        const updated = { ...prev };
        // Convertir le format "prospectId-projectType" en "prospect_prospectId_project_projectType"
        Object.entries(allProjectSteps).forEach(([key, steps]) => {
          const [prospectId, projectType] = key.split('-');
          const appKey = `prospect_${prospectId}_project_${projectType}`;
          updated[appKey] = steps;
        });
        return updated;
      });
    }
  }, [allProjectSteps, allStepsLoading, authLoading]);

  // 🔥 Charger les modèles de projets depuis Supabase avec real-time
  // 🔥 MULTI-TENANT: Passe organizationId pour filtrer par org
  // 🔥 FIX BOUCLE #310: Gater avec organizationReady
  const {
    projectTemplates,
    loading: templatesLoading,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    getPublicTemplates
  } = useSupabaseProjectTemplates({ organizationId, enabled: organizationReady });

  // 🔥 Charger les formulaires depuis Supabase avec real-time (pour le chat)
  // 🔥 MULTI-TENANT: Passe organizationId pour filtrer par org
  const {
    forms: supabaseForms,
    loading: formsLoading
  } = useSupabaseForms(organizationId);

  // Synchroniser forms dans le state pour compatibilité avec le code existant (chat)
  useEffect(() => {
    if (!authLoading && !formsLoading) {
      setForms(supabaseForms);
    }
  }, [supabaseForms, formsLoading, authLoading]);

  // 🔥 Charger les prompts depuis Supabase avec real-time (pour Charly AI)
  // 🔥 MULTI-TENANT: Passe organizationId pour filtrer par org
  // 🔥 FIX BOUCLE #310: Gater avec organizationReady
  const {
    prompts: supabasePrompts,
    loading: promptsLoading
  } = useSupabasePrompts({ organizationId, enabled: organizationReady });

  // Synchroniser prompts dans le state pour compatibilité avec le code existant
  useEffect(() => {
    if (!authLoading && !promptsLoading) {
      setPrompts(supabasePrompts);
    }
  }, [supabasePrompts, promptsLoading, authLoading]);

  // 🔥 Système de création automatique de tâches (écoute les changements d'étape)
  // ⚠️ Ne s'active que côté admin (les clients n'ont pas les droits RLS pour insérer dans appointments)
  useAutoCreateTasks(supabasePrompts, !authLoading && adminReady);
  
  // 🔥 Système de création automatique de tâches de vérification (écoute les soumissions client)
  // ⚠️ Ne s'active que côté admin (les clients n'ont pas les droits RLS pour insérer dans appointments)
  useAutoVerificationTasks(supabasePrompts, !authLoading && adminReady);
  
  // 🔥 Système de surveillance relances formulaires (crée tâche au seuil atteint)
  useFormReminderWatcher(!authLoading && adminReady);
  
  // 🔥 Système de message "Vous êtes toujours là ?" après 45 min de silence client
  usePresenceCheck(!authLoading && adminReady);
  
  // 🔥 Système de reset des relances quand le client répond
  useReminderReset(!authLoading && adminReady);

  // 🔥 Charger les notifications admin depuis Supabase avec real-time
  // 🔥 FIX: Activer quand adminReady ET qu'on a un activeAdminUser
  const {
    notifications,
    createOrUpdateNotification,
    markAsRead: markAdminNotificationAsRead
  } = useSupabaseNotifications(
    activeAdminUser?.user_id || null, 
    !authLoading && adminReady && !!activeAdminUser
  );

  // 🔥 Charger les notifications client depuis Supabase avec real-time
  // Note: currentUser.id est le prospect_id dans la table prospects
  // 🔥 FIX: Activer quand on a un currentUser (client connecté), pas besoin de adminReady
  const {
    notifications: clientNotifications,
    createOrUpdateNotification: createOrUpdateClientNotification,
    markAsRead: markClientNotificationAsRead
  } = useSupabaseClientNotifications(
    currentUser?.id || null, 
    !authLoading && !!currentUser
  );

  const {
    projectInfos: supabaseProjectInfos,
    getProjectInfo: getSupabaseProjectInfo,
    updateProjectInfo: updateSupabaseProjectInfo
  } = useSupabaseProjectInfos();

  // Convertir projectTemplates en format compatible avec le code existant
  // Format attendu : { ACC: {...}, Centrale: {...}, etc. }
  // IMPORTANT: useMemo pour que projectsData se recalcule quand projectTemplates change (real-time)
  const projectsData = useMemo(() => {
    const result = projectTemplates.reduce((acc, template) => {
      acc[template.type] = template;
      return acc;
    }, {});
    return result;
  }, [projectTemplates]);
  
  // 🔥 MULTI-TENANT: Exposer le logo pour le contexte
  // Priorité : organization_settings.logo_url (via logoUrl du contexte) > company_settings.logo_url (fallback)
  const companyLogo = logoUrl || companySettings?.logo_url || '';
  const setCompanyLogo = updateLogo;
  
  // 🔥 PHASE 2: Double lecture form_contact_config
  // Priorité : organization_settings.form_contact_config > company_settings.settings.form_contact_config > default
  const formContactConfig = 
    (orgFormContactConfig && orgFormContactConfig.length > 0)
      ? orgFormContactConfig
      : (getFormContactConfig().length > 0 
          ? getFormContactConfig() 
          : defaultFormContactConfig);

  // � 1 — Simplifier onAuthStateChange : juste stocker la session
  // ---------------------------------------------
  // EVATIME AUTH — VERSION BROWSERROUTER (PRO)
  // Supabase gère automatiquement les tokens du Magic Link
  // ---------------------------------------------
  useEffect(() => {
    // 🔥 GÉRER LE PARAMÈTRE ?code= (Magic Link avec PKCE flow)
    const handleCodeExchange = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      
      if (code) {
        logger.debug('Magic Link code detected, exchanging for session', { code });
        
        try {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          
          if (error) {
            logger.error('Error exchanging code for session', { error: error.message });
          } else if (data.session) {
            logger.debug('Session established from code', { email: data.session.user?.email });
            setSession(data.session);
            
            // Nettoyer l'URL (enlever le ?code=xxx)
            window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
          }
        } catch (err) {
          logger.error('Exception during code exchange', { error: err.message });
        }
        
        return; // Ne pas continuer avec getSession si on a un code
      }
    };
    
    handleCodeExchange();
    
    // Supabase gère maintenant automatiquement les tokens du Magic Link
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        logger.debug('Auth event', { event, email: session?.user?.email });
        setSession(session ?? null);
      }
    );

    // Session initiale (au démarrage)
    // 🔥 WAIT FOR SESSION (CRUCIAL POUR MAGIC LINK)
    supabase.auth.getSession().then(({ data }) => {
      const initialSession = data.session;
      
      if (!initialSession) {
        logger.debug('No initial session - waiting for auth event');
        // ❌ Ne pas setSession(null) ici, on attend l'événement SIGNED_IN
        // Le listener onAuthStateChange ci-dessus gérera la session
        return;
      }
      
      // ✅ Session trouvée immédiatement (reconnexion ou session existante)
      logger.debug('Initial session found', { email: initialSession.user?.email });
      setSession(initialSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 🟣 3 — Fonction loadAuthUser stable (version industrielle)
  const isLoadingAuthRef = useRef(false);

  async function loadAuthUser(userId) {
    // 🔥 MULTI-TENANT GUARD:
    // Ne jamais faire le lookup client tant que l'orga (hostname) n'est pas résolue.
    // Sinon, on peut poser à tort unlinkedInOrg=true (faux négatif transitoire).
    // Admin lookup reste OK sans organizationId.
    if (isLoadingAuthRef.current) return;
    isLoadingAuthRef.current = true;

    try {
      setAuthLoading(true);

      // 1) ADMIN ?
      const { data: admin } = await supabase
        .from("users")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (admin) {
        // 🔥 PR-5: Vérifier si l'organisation est suspendue
        if (admin.organization_id) {
          const { data: orgStatus } = await supabase.rpc(
            'platform_get_org_status',
            { p_org_id: admin.organization_id }
          );

          if (orgStatus?.status === 'suspended') {
            logger.info('Organization suspended, logging out admin');
            await supabase.auth.signOut();
            setAuthLoading(false);
            isLoadingAuthRef.current = false;
            // 🔥 Stocker le message pour affichage
            sessionStorage.setItem('org_suspended_message', 'Votre organisation est temporairement suspendue. Contactez le support.');
            return;
          }
        }

        // 🔥 FIX : Transformer snake_case → camelCase pour cohérence
        // Garder les 2 versions (snake_case + camelCase) pour compatibilité
        const transformedAdmin = {
          id: admin.id,
          user_id: admin.user_id,  // ✅ Garder snake_case (utilisé par Agenda, FinalPipeline)
          userId: admin.user_id,   // ✅ Ajouter camelCase
          name: admin.name,
          email: admin.email,
          role: admin.role,
          phone: admin.phone,
          avatar_url: admin.avatar_url,  // ✅ Garder snake_case
          avatarUrl: admin.avatar_url,   // ✅ Ajouter camelCase
          manager_id: admin.manager_id,  // ✅ Garder snake_case
          managerId: admin.manager_id,   // ✅ Ajouter camelCase
          organization_id: admin.organization_id,  // ✅ AJOUTÉ : Garder snake_case
          organizationId: admin.organization_id,   // ✅ AJOUTÉ : Ajouter camelCase
          access_rights: admin.access_rights,  // ✅ Garder snake_case (utilisé partout)
          accessRights: admin.access_rights,   // ✅ Ajouter camelCase
          created_at: admin.created_at,  // ✅ Garder snake_case
          createdAt: admin.created_at,   // ✅ Ajouter camelCase
          updated_at: admin.updated_at,  // ✅ Garder snake_case
          updatedAt: admin.updated_at,   // ✅ Ajouter camelCase
        };
        setActiveAdminUser(transformedAdmin);
        
        setAdminReady(true);
        setCurrentUser(null);
        // 🔥 FIX React Error #310: Attendre un tick pour que activeAdminUser
        // soit bien appliqué AVANT de désactiver authLoading
        setTimeout(() => {
          setAuthLoading(false);
          isLoadingAuthRef.current = false;
        }, 0);
        return;
      }

      // 🔥 CLIENT - Charger le prospect depuis Supabase (scopé à l'orga du hostname)
      // ⚠️ IMPORTANT: Ne pas exécuter ce lookup si l'orga n'est pas prête.
      // On retournera "authLoading=false" sans poser unlinkedInOrg.
      if (!organizationReady || !organizationId) {
        logger.debug('Client lookup skipped: organization context not ready', {
          userId,
          organizationReady,
          organizationId,
        });
        setTimeout(() => {
          setAuthLoading(false);
          isLoadingAuthRef.current = false;
        }, 0);
        return;
      }

      // Étape 1 : Chercher par user_id + organization_id (aucun fallback cross-tenant)
      let prospect = null;

      const { data: prospectByUser } = await supabase
        .from("prospects")
        .select("*")
        .eq("user_id", userId)
        .eq("organization_id", organizationId)
        .maybeSingle();

      prospect = prospectByUser || null;

      // Aucun prospect lié dans cette organisation : ne pas lier par email (multi-tenant)
      if (!prospect) {
        logger.debug('No prospect linked in this organization for user', { userId, organizationId });
        setUnlinkedInOrg(true);
        setCurrentUser(null);
        // 🔥 Ne pas changer d'organisation ni rediriger
        setTimeout(() => {
          setAuthLoading(false);
          isLoadingAuthRef.current = false;
        }, 0);
        return;
      }

      // Prospect trouvé dans l'orga courante : reset flag
      setUnlinkedInOrg(false);

      if (prospect) {
        // 🔥 PR-5: Vérifier si l'organisation est suspendue
        if (prospect.organization_id) {
          const { data: orgStatus } = await supabase.rpc(
            'platform_get_org_status',
            { p_org_id: prospect.organization_id }
          );

          if (orgStatus?.status === 'suspended') {
            logger.info('Organization suspended, logging out client');
            await supabase.auth.signOut();
            setAuthLoading(false);
            isLoadingAuthRef.current = false;
            // 🔥 Stocker le message pour affichage
            sessionStorage.setItem('org_suspended_message', 'Votre organisation est temporairement suspendue. Contactez le support.');
            return;
          }
        }

        // 🔥 FIX: Transformer les données Supabase (snake_case → camelCase)
        const transformedProspect = {
          id: prospect.id,
          name: prospect.name,
          email: prospect.email,
          phone: prospect.phone,
          address: prospect.address,
          companyName: prospect.company_name, // ✅ FIX: Mapper company_name → companyName
          tags: prospect.tags || [],
          userId: prospect.user_id,
          ownerId: prospect.owner_id,
          status: prospect.status,
          hasAppointment: prospect.has_appointment,
          affiliateName: prospect.affiliate_name,
          formData: prospect.form_data || {},
          createdAt: prospect.created_at,
          updatedAt: prospect.updated_at,
        };
        
        setCurrentUser(transformedProspect);
        setActiveAdminUser(null);
        
        // Synchroniser userProjects avec les tags du prospect
        if (prospect.tags && Array.isArray(prospect.tags)) {
          setUserProjects(prospect.tags);
        }
        
        // 🔥 FIX React Error #310: Attendre un tick pour batch state updates
        setTimeout(() => {
          setAuthLoading(false);
          isLoadingAuthRef.current = false;
        }, 0);
        return;
      }

      // Aucun rôle trouvé
      setCurrentUser(null);
      setActiveAdminUser(null);
      // 🔥 FIX React Error #310: Attendre un tick pour batch state updates
      setTimeout(() => {
        setAuthLoading(false);
      }, 0);

    } catch (err) {
      logger.error('Erreur chargement utilisateur authentifié', { error: err.message });
      // 🔥 FIX React Error #310: Attendre un tick pour batch state updates
      setTimeout(() => {
        setAuthLoading(false);
      }, 0);
    } finally {
      isLoadingAuthRef.current = false;
    }
  }

  // 🟣 4 — Déclencher loadAuthUser quand la session change
  useEffect(() => {
    // 🔥 ISOLATION: Ne jamais charger activeAdminUser sur les routes publiques
    const isPublicRoute =
      location.pathname.startsWith("/inscription") ||
      location.pathname.startsWith("/register") ||
      location.pathname === "/" ||
      location.pathname.startsWith("/platform-login") ||
      location.pathname.startsWith("/platform");

    if (isPublicRoute) {
      setActiveAdminUser(null);
      setUnlinkedInOrg(false);
      // 🔥 FIX React Error #310: Attendre un tick pour batch state updates
      setTimeout(() => {
        setAuthLoading(false);
      }, 0);
      return;
    }

    if (!session) {
      setActiveAdminUser(null);
      setCurrentUser(null);
      setUnlinkedInOrg(false);
      // 🔥 FIX React Error #310: Attendre un tick pour batch state updates
      setTimeout(() => {
        setAuthLoading(false);
      }, 0);
      return;
    }

    // 🔥 IMPORTANT: Réinitialiser l'état "non rattaché" pendant les transitions
    // (ex: org en cours de résolution / changement) pour éviter un flash UI.
    setUnlinkedInOrg(false);

    setAuthLoading(true); // 🔥 Mettre loading AVANT de charger
    loadAuthUser(session.user.id);
    
    // 🔥 Rediriger vers /dashboard après Magic Link si on est sur la page d'accueil
    if (location.pathname === '/' && !currentUser && !activeAdminUser) {
      setTimeout(() => {
        // Attendre que loadAuthUser finisse pour savoir si c'est un client
        if (currentUser) navigate('/dashboard');
      }, 1000);
    }
  }, [session]);

  // 🔥 MULTI-TENANT: Relancer le chargement utilisateur dès que l'orga devient prête.
  // Cas: session déjà établie (Magic Link), mais organizationId pas encore résolue.
  // Sans ça, on peut rester sans currentUser et afficher "non rattaché" à tort.
  useEffect(() => {
    if (!session) return;
    if (!organizationReady || !organizationId) return;

    // Éviter de relancer si un admin est déjà chargé (les routes admin n'ont pas besoin de ce gating)
    if (activeAdminUser) return;

    // Si on n'a pas encore de client chargé et qu'on n'est pas déjà en train de charger,
    // relancer le lookup maintenant que l'orga est stable.
    if (!currentUser && !isLoadingAuthRef.current) {
      logger.debug('Organization ready - triggering deferred user load', {
        organizationId,
        userId: session.user?.id,
      });
      setAuthLoading(true);
      loadAuthUser(session.user.id);
    }
  }, [organizationReady, organizationId, session, activeAdminUser, currentUser]);

  // 🔥 REAL-TIME POUR LE CLIENT : Écouter les mises à jour du prospect du client connecté
  useEffect(() => {
    if (!currentUser?.id) return; // Seulement si un client est connecté
    
    logger.debug('Setting up real-time channel for currentUser prospect', { prospectId: currentUser.id });
    
    const channel = supabase
      .channel(`client-prospect-${currentUser.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'prospects',
        filter: `id=eq.${currentUser.id}`
      }, (payload) => {
        logger.debug('Real-time UPDATE received for currentUser', { prospectId: payload.new?.id });
        
        // Transformer les données Supabase (snake_case → camelCase)
        const updatedProspect = {
          id: payload.new.id,
          name: payload.new.name,
          email: payload.new.email,
          phone: payload.new.phone,
          address: payload.new.address,
          companyName: payload.new.company_name,
          tags: payload.new.tags || [],
          userId: payload.new.user_id,
          ownerId: payload.new.owner_id,
          status: payload.new.status,
          hasAppointment: payload.new.has_appointment,
          affiliateName: payload.new.affiliate_name,
          formData: payload.new.form_data || {},
          createdAt: payload.new.created_at,
          updatedAt: payload.new.updated_at,
        };
        
        setCurrentUser(updatedProspect);
        logger.debug('currentUser updated in real-time');
        
        // 🔥 PHASE 3: localStorage supprimé - currentUser géré uniquement par Supabase
      })
      .subscribe();
    
    return () => {
      logger.debug('Cleaning up real-time channel for currentUser');
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id]); // Se réabonne si le client change

  // 🔥 SYNCHRONISER currentUser avec prospects (pour les updates côté admin)
  useEffect(() => {
    if (!currentUser?.id || !prospects.length) return;
    
    // Chercher le prospect mis à jour dans la liste
    const updatedProspect = prospects.find(p => p.id === currentUser.id);
    
    if (updatedProspect) {
      // Vérifier si form_data a changé (comparaison shallow)
      const currentFormData = JSON.stringify(currentUser.formData || currentUser.form_data);
      const newFormData = JSON.stringify(updatedProspect.formData || updatedProspect.form_data);
      
      if (currentFormData !== newFormData) {
        logger.debug('Synchronizing currentUser from prospects (form_data changed)');
        setCurrentUser({
          ...currentUser,
          formData: updatedProspect.formData || updatedProspect.form_data,
          form_data: updatedProspect.formData || updatedProspect.form_data,
        });
      }
    }
  }, [prospects, currentUser?.id]);

  // ✅ projectsData est maintenant chargé en temps réel depuis Supabase (project_templates table)
  // Plus besoin de localStorage pour evatime_projects_data

  // 🔥 PHASE 4: userProjects supprimé de localStorage - Utiliser currentUser.tags
  useEffect(() => {
    // userProjects est maintenant géré par currentUser.tags (source: Supabase prospects table)
    // Plus de chargement localStorage nécessaire

    // 🔥 PHASE 6: Prospects maintenant gérés 100% par useSupabaseProspects() - localStorage supprimé
    // Les prospects sont synchronisés automatiquement depuis Supabase (voir ligne ~210)

    // ✅ currentUser et activeAdminUser sont maintenant chargés dans le useEffect principal ci-dessus
    
    // 🔥 PHASE 5: Agenda (appointments/calls/tasks) maintenant géré par useSupabaseAgenda() - localStorage supprimé
    // Les données sont chargées automatiquement par le hook Supabase avec real-time sync
    
    // ✅ projectStepsStatus maintenant chargé depuis Supabase via useSupabaseProjectStepsStatus
    // Plus besoin de localStorage pour 'evatime_project_steps_status'

    // ✅ activeAdminUser et currentUser sont maintenant chargés depuis Supabase Auth uniquement
    // Pas de localStorage loading au montage, tout est géré par le useEffect Auth ci-dessus
    
    // hasHydratedFormContactConfig n'est plus nécessaire (géré par Supabase)
    hasHydratedGlobalPipelineSteps.current = true;
  }, []);
  
  // ✅ Nouvelle fonction qui met à jour les templates dans Supabase
  // 🔥 OPTIMISÉ: Ne met à jour QUE les templates qui ont changé
  const handleSetProjectsData = async (newProjectsData) => {
    try {
      // 🔥 OPTIMISATION: Paralléliser les updates + skip les templates inchangés
      const updatePromises = [];
      
      for (const [type, templateData] of Object.entries(newProjectsData)) {
        const existingTemplate = projectTemplates.find(t => t.type === type);
        
        // ⚠️ IMPORTANT: Convertir camelCase → snake_case pour Supabase
        const supabaseData = {
          title: templateData.title,
          client_title: templateData.clientTitle || templateData.client_title,
          icon: templateData.icon,
          color: templateData.color,
          steps: templateData.steps,
          is_public: templateData.isPublic !== undefined ? templateData.isPublic : templateData.is_public,
          image_url: templateData.coverImage || templateData.image_url,
          client_description: templateData.clientDescription || templateData.client_description,
          cta_text: templateData.ctaText || templateData.cta_text
        };
        
        if (existingTemplate) {
          // 🔥 OPTIMISATION: Vérifier si le template a vraiment changé
          const hasChanged = 
            existingTemplate.title !== supabaseData.title ||
            existingTemplate.client_title !== supabaseData.client_title ||
            existingTemplate.icon !== supabaseData.icon ||
            existingTemplate.color !== supabaseData.color ||
            JSON.stringify(existingTemplate.steps) !== JSON.stringify(supabaseData.steps) ||
            existingTemplate.is_public !== supabaseData.is_public ||
            existingTemplate.image_url !== supabaseData.image_url ||
            existingTemplate.client_description !== supabaseData.client_description ||
            existingTemplate.cta_text !== supabaseData.cta_text;
          
          if (hasChanged) {
            // Mise à jour du template existant (ajouté à la liste de promesses)
            updatePromises.push(updateTemplate(existingTemplate.id, supabaseData));
          }
          // Si pas de changement, on skip (pas d'appel réseau)
        } else {
          // Ajout d'un nouveau template
          updatePromises.push(addTemplate({
            type: type,
            ...supabaseData
          }));
        }
      }
      
      // 🔥 Exécuter toutes les updates en parallèle
      if (updatePromises.length > 0) {
        await Promise.all(updatePromises);
      }
    } catch (error) {
      logger.error('Erreur handleSetProjectsData', { error: error.message });
      throw error;
    }
  };

  const handleSetFormContactConfig = async (updater) => {
    // 🔥 MULTI-TENANT: Utiliser formContactConfig (qui lit depuis organization_settings en priorité)
    // au lieu de getFormContactConfig() qui lit depuis company_settings (singleton partagé)
    const prevConfig = formContactConfig || [];
    const nextConfig = typeof updater === 'function' ? updater(prevConfig) : updater;
    
    if (!Array.isArray(nextConfig)) {
      logger.warn('Invalid form contact config, using default', { received: typeof nextConfig });
      return;
    }
    
    // Ne mettre à jour que si différent
    if (areFormConfigsEqual(prevConfig, nextConfig)) {
      return;
    }
    
    // Mettre à jour dans Supabase (organization_settings avec real-time automatique)
    try {
      await updateFormContactConfig(nextConfig);
      // 🔥 Mettre à jour immédiatement l'état local pour éviter d'attendre le real-time
      setOrgFormContactConfig(nextConfig);
    } catch (error) {
      logger.error('Erreur update config formulaire contact', { error: error.message });
    }
  };

  // 🔥 PHASE 2: setProjectInfosState supprimé - Utiliser updateSupabaseProjectInfo() du hook
  // ❌ SUPPRIMÉ: localStorage.setItem(PROJECT_INFO_STORAGE_KEY, ...) - Hook Supabase gère tout

  const getProjectInfo = (prospectId, projectType) => {
    if (!prospectId || !projectType) return {};
    return supabaseProjectInfos?.[prospectId]?.[projectType] || {};
  };

  // 🔥 UTILISER DIRECTEMENT LE HOOK - Il gère le real-time automatiquement
  const updateProjectInfo = updateSupabaseProjectInfo;

  // ✅ Fonction wrapper pour compatibilité avec le code existant
  // Maintenant les modifications passent par useSupabaseGlobalPipeline
  const handleSetGlobalPipelineSteps = async (updater) => {
    const current = globalPipelineSteps;
    const next = typeof updater === 'function' ? updater(current) : updater;
    
    // Comparer et mettre à jour via Supabase
    const sanitized = sanitizeGlobalPipelineSteps(next);
    
    if (areGlobalPipelineStepsEqual(current, sanitized)) {
      return; // Pas de changement
    }

    try {
      // Détecter les ajouts, suppressions, modifications
      const currentIds = new Set(current.map(s => s.id));
      const nextIds = new Set(sanitized.map(s => s.id));

      // 1. Supprimer les colonnes qui n'existent plus
      for (const step of current) {
        if (!nextIds.has(step.id)) {
          await deletePipelineStep(step.id);
        }
      }

      // 2. Ajouter les nouvelles colonnes
      for (const step of sanitized) {
        if (!currentIds.has(step.id)) {
          await addPipelineStep(step.label, step.color || 'bg-gray-100');
        }
      }

      // 3. Mettre à jour les colonnes modifiées et réorganiser
      const stepsToUpdate = sanitized.filter(s => currentIds.has(s.id));
      for (let i = 0; i < stepsToUpdate.length; i++) {
        const step = stepsToUpdate[i];
        const oldStep = current.find(s => s.id === step.id);
        
        if (oldStep && (oldStep.label !== step.label || oldStep.color !== step.color || oldStep.position !== i)) {
          await updatePipelineStep(step.id, {
            label: step.label,
            color: step.color,
            position: i
          });
        }
      }
    } catch (error) {
      logger.error('Erreur update pipeline steps', { error: error.message });
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour les colonnes du pipeline.",
        variant: "destructive",
      });
    }
  };

  // 🔥 Migration : Charger formContactConfig depuis localStorage et migrer vers Supabase
  // 🔥 MULTI-TENANT: Migre maintenant vers organization_settings (isolé par org)
  useEffect(() => {
    const migrateFormContactConfig = async () => {
      // Exiger organizationId pour la migration multi-tenant
      if (!organizationId) return;
      
      const storedConfig = localStorage.getItem('evatime_form_contact_config');
      
      if (storedConfig) {
        const parsedConfig = JSON.parse(storedConfig);
        
        // 🔥 MULTI-TENANT: Vérifier organization_settings ET company_settings
        // orgFormContactConfig est déjà chargé depuis organization_settings
        const hasOrgConfig = orgFormContactConfig && orgFormContactConfig.length > 0;
        const hasCompanyConfig = companySettings?.settings?.form_contact_config?.length > 0;
        
        // Si organization_settings est vide, migrer depuis localStorage
        if (!hasOrgConfig) {
          await updateFormContactConfig(parsedConfig);
          // Mettre à jour l'état local immédiatement
          setOrgFormContactConfig(parsedConfig);
          // Nettoyer le localStorage après migration
          localStorage.removeItem('evatime_form_contact_config');
          logger.info('FormContactConfig migré de localStorage vers organization_settings', { organizationId });
        } else {
          // organization_settings a déjà des données, supprimer localStorage
          localStorage.removeItem('evatime_form_contact_config');
        }
      }
    };
    
    migrateFormContactConfig();
  }, [organizationId, orgFormContactConfig]); // Exécuter quand organizationId et orgFormContactConfig sont chargés

  // ✅ globalPipelineSteps maintenant géré par Supabase (plus de localStorage)
  // Plus besoin de sauvegarder dans localStorage à chaque changement

  // 🔥 Le logo est maintenant géré par Supabase (useSupabaseCompanySettings)
  // Plus besoin de localStorage - Migration : nettoyer l'ancien logo
  useEffect(() => {
    const oldLogo = localStorage.getItem('evatime_company_logo');
    if (oldLogo) {
      localStorage.removeItem('evatime_company_logo');
    }
  }, []);

  // ✅ Migration Supabase: addChatMessage maintenant envoie directement à Supabase
  // Le real-time synchronise automatiquement tous les clients/admins connectés
  const addChatMessage = async (prospectId, projectType, message) => {
    try {
      // Vérification des doublons pour les formulaires complétés
      if (message.completedFormId && message.sender === 'client') {
        const { data: existingMessages } = await supabaseClient
          .from('chat_messages')
          .select('id')
          .eq('prospect_id', prospectId)
          .eq('project_type', projectType)
          .eq('sender', 'client')
          .eq('completed_form_id', message.completedFormId)
          .eq('related_message_timestamp', message.relatedMessageTimestamp || '');

        if (existingMessages && existingMessages.length > 0) {
          return;
        }
      }

      // Vérification des doublons pour les prompts
      if (message.promptId) {
        const { data: existingMessages } = await supabaseClient
          .from('chat_messages')
          .select('id')
          .eq('prospect_id', prospectId)
          .eq('project_type', projectType)
          .eq('sender', message.sender)
          .eq('prompt_id', message.promptId)
          .eq('step_index', message.stepIndex || 0)
          .eq('text', message.text || '');

        if (existingMessages && existingMessages.length > 0) {
          return;
        }
      }

      // Insérer le message dans Supabase
      const dbPayload = {
        prospect_id: prospectId,
        project_type: projectType,
        sender: message.sender,
        text: message.text || null,
        file: message.file || null,
        form_id: message.formId || null,
        completed_form_id: message.completedFormId || null,
        prompt_id: message.promptId || null,
        step_index: message.stepIndex !== undefined ? message.stepIndex : null,
        related_message_timestamp: message.relatedMessageTimestamp || null,
        read: false,
      };

      const { error } = await supabaseClient
        .from('chat_messages')
        .insert([dbPayload]);

      if (error) throw error;

      // Gestion du fichier RIB pour projet ACC
      if (message.file && message.sender === 'client') {
        updateProjectInfo(prospectId, projectType, (prev) => {
          if (projectType === 'ACC' && !prev?.ribFile) {
            return { ...prev, ribFile: message.file.name };
          }
          return prev || {};
        });
      }

      // 🔥 Notification admin quand un client envoie un message (Supabase)
      if (message.sender === 'client') {
        // Charger le prospect depuis Supabase (car prospects[] est vide côté client)
        const { data: prospectData, error: prospectError } = await supabaseClient
          .from('prospects')
          .select('name, owner_id')
          .eq('id', prospectId)
          .single();

        if (prospectError) {
          logger.error('Error loading prospect for notification', { error: prospectError });
          toast({
            title: "Erreur",
            description: "Impossible de charger les informations du prospect.",
            variant: "destructive"
          });
          return;
        }

        if (prospectData) {
          await createOrUpdateNotification({
            prospectId,
            ownerId: prospectData.owner_id, // 🔥 CRITICAL pour le filter real-time
            projectType,
            prospectName: prospectData.name,
            projectName: projectsData[projectType]?.title || projectType
          });
        } else {
          logger.warn('No prospect data found for notification', { prospectId });
        }
      }

      // 🔥 Notification client quand l'admin/pro répond (Supabase)
      if (message.sender === 'admin' || message.sender === 'pro') {
        await createOrUpdateClientNotification({
          prospectId,
          projectType,
          projectName: projectsData[projectType]?.title || projectType,
          message: message.text?.substring(0, 50) || 'Nouveau message'
        });
      }
    } catch (err) {
      logger.error('Erreur envoi message', { error: err.message });
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer le message. Vérifiez votre connexion.",
        variant: "destructive",
      });
    }
  };

  // ❌ SUPPRIMÉ: markNotificationAsRead et markClientNotificationAsRead localStorage
  // Maintenant géré par les hooks Supabase (markAdminNotificationAsRead, markClientNotificationAsRead)
  // Les fonctions sont fournies par useSupabaseNotifications et useSupabaseClientNotifications

  // Wrapper pour markNotificationAsRead (admin) pour compatibilité avec le contexte existant
  const markNotificationAsRead = (notificationId) => {
    markAdminNotificationAsRead(notificationId);
  };

  const getSharedAppointments = (contactId, projectType, stepName) => {
    return appointments.filter(appointment => 
      appointment.share === true &&
      appointment.contactId === contactId &&
      appointment.projectId === projectType &&
      appointment.step === stepName
    );
  };

  // ❌ SUPPRIMÉ: registerClientForm, updateClientFormPanel, clearClientFormsFor
  // ✅ Maintenant géré par useSupabaseClientFormPanels() hook avec real-time sync

  // ❌ SUPPRIMÉ: updateUsers() et deleteUser() - Maintenant dans useSupabaseUsersCRUD()
  // Utiliser le hook useSupabaseUsersCRUD() pour toutes les opérations CRUD sur les utilisateurs
  // - addUser(userData) pour créer
  // - updateUser(userId, updates) pour modifier
  // - deleteUser(userId) pour supprimer (avec réassignation automatique des prospects)

  // 🔥 PHASE 5: Fonctions CRUD Agenda simplifiées - localStorage supprimé, Supabase uniquement via hooks
  // Note: Ces fonctions sont maintenant des wrappers vers useSupabaseAgenda()
  // Le hook gère automatiquement le state + real-time + Supabase
  
  const addAppointment = async (newAppointment) => {
    // 🔥 PHASE 5: Appel direct au hook Supabase (plus de localStorage)
    // Note: Le hook useSupabaseAgenda expose déjà addAppointment, cette fonction peut être deprecated
    console.warn('⚠️ addAppointment (App.jsx) est deprecated, utiliser le hook useSupabaseAgenda directement');
    // Pour backward compatibility, on pourrait appeler le hook ici, mais il vaut mieux refactoriser les composants
  };

  const updateAppointment = async (updatedAppointment) => {
    // 🔥 PHASE 5: localStorage supprimé - Utiliser useSupabaseAgenda().updateAppointment()
    console.warn('⚠️ updateAppointment (App.jsx) est deprecated, utiliser le hook useSupabaseAgenda directement');
  };

  const deleteAppointment = async (appointmentId) => {
    // 🔥 PHASE 5: localStorage supprimé - Utiliser useSupabaseAgenda().deleteAppointment()
    console.warn('⚠️ deleteAppointment (App.jsx) est deprecated, utiliser le hook useSupabaseAgenda directement');
  };

  const addCall = async (newCall) => {
    // 🔥 PHASE 5: localStorage supprimé - Calls gérés par useSupabaseAgenda (type: 'call')
    console.warn('⚠️ addCall (App.jsx) est deprecated, utiliser le hook useSupabaseAgenda directement');
  };

  const updateCall = async (updatedCall) => {
    // 🔥 PHASE 5: localStorage supprimé - Utiliser useSupabaseAgenda().updateAppointment()
    console.warn('⚠️ updateCall (App.jsx) est deprecated, utiliser le hook useSupabaseAgenda directement');
  };

  const deleteCall = async (callId) => {
    // 🔥 PHASE 5: localStorage supprimé - Utiliser useSupabaseAgenda().deleteAppointment()
    console.warn('⚠️ deleteCall (App.jsx) est deprecated, utiliser le hook useSupabaseAgenda directement');
  };

  const addTask = async (newTask) => {
    // 🔥 PHASE 5: localStorage supprimé - Tasks gérés par useSupabaseAgenda (type: 'task')
    console.warn('⚠️ addTask (App.jsx) est deprecated, utiliser le hook useSupabaseAgenda directement');
  };

  const updateTask = async (updatedTask) => {
    // 🔥 PHASE 5: localStorage supprimé - Utiliser useSupabaseAgenda().updateAppointment()
    console.warn('⚠️ updateTask (App.jsx) est deprecated, utiliser le hook useSupabaseAgenda directement');
  };

  const deleteTask = async (taskId) => {
    // 🔥 PHASE 5: localStorage supprimé - Utiliser useSupabaseAgenda().deleteAppointment()
    console.warn('⚠️ deleteTask (App.jsx) est deprecated, utiliser le hook useSupabaseAgenda directement');
  };
  
  const updateProjectSteps = async (prospectId, projectType, newSteps) => {
    const key = `prospect_${prospectId}_project_${projectType}`;
    
    // 1️⃣ Mettre à jour l'état local immédiatement pour UI réactive
    setProjectStepsStatus(prev => {
        const updated = { ...prev, [key]: newSteps };
        // ✅ Plus de localStorage, tout en Supabase
        return updated;
    });

    // 2️⃣ Sauvegarder dans Supabase (real-time sync)
    try {
      if (!organizationId) {
        // Ne pas lancer d'exception basée sur le domaine.
        // La mise à jour côté client a déjà été appliquée localement.
        logger.warn('updateProjectSteps: organisation manquante — skip server save');
        return;
      }

      const { data, error } = await supabase
        .from('project_steps_status')
        .upsert(
          {
            prospect_id: prospectId,
            project_type: projectType,
            steps: newSteps,
            organization_id: organizationId, // 🔥 AJOUT
            updated_at: new Date().toISOString()
          },
          {
            onConflict: 'prospect_id,project_type'
          }
        )
        .select()
        .single();

      if (error) {
        logger.error('Erreur sauvegarde Supabase', { error: error.message });
        toast({
          title: "Erreur",
          description: "Impossible de sauvegarder les étapes",
          variant: "destructive",
        });
        // Ne pas rethrower pour éviter blocage basé sur l'organisation
        return;
      }
    } catch (err) {
      logger.error('Erreur sauvegarde project steps', { error: err.message });
    }
  };
  
   const getProjectSteps = (prospectId, projectType) => {
    const key = `prospect_${prospectId}_project_${projectType}`;
    const savedSteps = projectStepsStatus[key];
    const templateSteps = projectsData[projectType]?.steps;

    // TOUJOURS utiliser la structure du template Supabase (ordre à jour)
    if (!templateSteps || templateSteps.length === 0) {
      return [];
    }

    // Créer une copie des steps du template
    const currentSteps = JSON.parse(JSON.stringify(templateSteps));

    // Si des steps ont déjà été sauvegardés dans le state, restaurer les statuts
    if (savedSteps && savedSteps.length > 0) {
      // Matcher les steps par name pour préserver les statuts
      currentSteps.forEach((step, index) => {
        const savedStep = savedSteps.find(s => s.name === step.name);
        if (savedStep) {
          step.status = savedStep.status;
        }
      });
    } else {
      // Nouveau prospect : initialiser UNIQUEMENT si première étape est pending
      if (currentSteps.length > 0 && currentSteps[0].status === 'pending') {
        currentSteps[0].status = 'in_progress';
      }
    }
    
    return currentSteps;
  };

  const completeStepAndProceed = async (prospectId, projectType, currentStepIndex, currentSteps) => {
    logger.debug('completeStepAndProceed START', { prospectId, projectType, currentStepIndex });
    
    // 🔥 FIX SOLUTION A: Recevoir les steps en paramètre au lieu d'appeler getProjectSteps
    // Évite d'utiliser le state global vide et garantit d'avoir les vraies données depuis Supabase
    if (!currentSteps || currentSteps.length === 0) {
      logger.error('No steps provided', { prospectId, projectType });
      return;
    }
    
    logger.debug('Steps received from caller', { count: currentSteps.length });
    
    if (currentStepIndex < 0 || currentStepIndex >= currentSteps.length) {
      logger.error('Index étape invalide', { currentStepIndex, stepsLength: currentSteps.length });
      return;
    }

    const newSteps = JSON.parse(JSON.stringify(currentSteps));
    const currentStep = newSteps[currentStepIndex];

    // ─────────────────────────────────────────────────────────────
    // SOUS-ÉTAPES : progression interne avant de passer à l'étape suivante
    // ─────────────────────────────────────────────────────────────
    if (currentStep?.subSteps && Array.isArray(currentStep.subSteps) && currentStep.subSteps.length > 0) {
      // Trouver la sous-étape active (in_progress) ou la première pending
      let activeSubIndex = currentStep.subSteps.findIndex(s => s.status === 'in_progress');
      if (activeSubIndex === -1) {
        activeSubIndex = currentStep.subSteps.findIndex(s => s.status === 'pending');
        if (activeSubIndex !== -1) {
          currentStep.subSteps[activeSubIndex].status = 'in_progress';
        }
      }

      if (activeSubIndex !== -1) {
        // Marquer la sous-étape courante comme complétée
        currentStep.subSteps[activeSubIndex].status = 'completed';

        // Activer la suivante si elle existe
        const nextSub = currentStep.subSteps.findIndex(s => s.status === 'pending');
        if (nextSub !== -1) {
          currentStep.subSteps[nextSub].status = 'in_progress';
          currentStep.status = 'in_progress';
          newSteps[currentStepIndex] = currentStep;

          logger.debug('Substep completed, staying in same step', {
            completedSub: activeSubIndex,
            nextSub,
            stepName: currentStep.name,
          });

          await updateProjectSteps(prospectId, projectType, newSteps);
          return; // Ne pas passer à l'étape suivante tant que des sous-étapes restent
        }
      }

      // Si toutes les sous-étapes sont complétées, on peut compléter l'étape principale
      const allSubStepsCompleted = currentStep.subSteps.every(s => s.status === 'completed');
      if (!allSubStepsCompleted) {
        logger.warn('Sous-étapes incomplètes détectées alors que aucune active trouvée', {
          stepName: currentStep.name,
          subSteps: currentStep.subSteps,
        });
        currentStep.status = 'in_progress';
        newSteps[currentStepIndex] = currentStep;
        await updateProjectSteps(prospectId, projectType, newSteps);
        return;
      }

      // Toutes les sous-étapes sont terminées, on peut clore l'étape
      currentStep.status = 'completed';
      newSteps[currentStepIndex] = currentStep;
    } else {
      // Pas de sous-étapes : comportement legacy
      currentStep.status = 'completed';
      newSteps[currentStepIndex] = currentStep;
    }
    
    const completedStepName = newSteps[currentStepIndex].name;
    
    let nextStepName = null;
    if (currentStepIndex + 1 < newSteps.length) {
      newSteps[currentStepIndex + 1].status = 'in_progress';
      nextStepName = newSteps[currentStepIndex + 1].name;
    }
    
    logger.debug('Step completed', { 
      completedStep: completedStepName,
      nextStep: nextStepName 
    });
    
    await updateProjectSteps(prospectId, projectType, newSteps);
    
    // TODO: Ajouter événement dans project_history
    logger.debug('project_history event not yet implemented');
  };

  const addProject = async (projectType) => {
    if (userProjects.includes(projectType)) {
      return false;
    }
    const updatedProjects = [...userProjects, projectType];
    setUserProjects(updatedProjects);
    // 🔥 PHASE 4: localStorage.setItem('userProjects') supprimé - currentUser.tags est la source

    if (currentUser) {
      // 🔥 FIX: Sauvegarder les tags dans Supabase (pas seulement en mémoire)
      const updatedTags = [...(currentUser.tags || []), projectType];
      
      // Mettre à jour le prospect dans Supabase (via RPC update_prospect_safe)
      try {
        await updateProspect({
          id: currentUser.id,
          tags: updatedTags,
        });
        
        logger.debug('✅ Tags updated in Supabase', { projectType, updatedTags });
      } catch (error) {
        logger.error('❌ Failed to update tags in Supabase', error);
        toast({
          title: "Erreur",
          description: "Impossible d'ajouter le projet. Veuillez réessayer.",
          variant: "destructive",
        });
        return false;
      }

      // Initialiser les étapes avec première étape en "in_progress"
      const defaultSteps = projectsData[projectType]?.steps;
      if (defaultSteps && defaultSteps.length > 0) {
        const newSteps = JSON.parse(JSON.stringify(defaultSteps));
        newSteps[0].status = 'in_progress';
        updateProjectSteps(currentUser.id, projectType, newSteps);
      }
    }

    return true;
  };

  // 🔥 PR-4.1: addProspect est maintenant addProspectSupabase du hook useSupabaseProspects
  // La fonction locale a été supprimée car elle ne faisait que modifier le state local

  const updateProspect = async (updatedProspect) => {
    // 🔥 ÉTAPE PRO : Appeler la RPC update_prospect_safe() via le hook Supabase
    try {
      await updateProspectSupabase(updatedProspect.id, updatedProspect);
      
      // Real-time Supabase se charge de la synchronisation automatique du state
      // Mais on met à jour currentUser si c'est le prospect connecté
      if (currentUser && currentUser.id === updatedProspect.id) {
        // 🔥 FIX: Merger avec currentUser au lieu d'écraser
        setCurrentUser({
          ...currentUser,
          ...updatedProspect
        });
        
        // Synchroniser userProjects avec les tags du prospect
        if (updatedProspect.tags) {
          setUserProjects(updatedProspect.tags);
        }
      }
    } catch (error) {
      logger.error('Erreur update prospect', { error: error.message });
      toast({
        title: "Erreur",
        description: error.message || "Impossible de modifier le prospect.",
        variant: "destructive",
      });
    }
  };

  // 🔥 PHASE 3: handleSetCurrentUser simplifié - localStorage supprimé pour currentUser
  const handleSetCurrentUser = (user, affiliateName) => {
    const userWithAffiliate = user ? { ...user, affiliateName } : null;
    setCurrentUser(userWithAffiliate);
    if (userWithAffiliate) {
      // 🔥 PHASE 3: localStorage.setItem('currentUser') supprimé - Supabase gère tout
      
      // 🔥 PHASE 4: Synchroniser userProjects avec les tags du prospect/user (source unique: Supabase)
      if (userWithAffiliate.tags && Array.isArray(userWithAffiliate.tags)) {
        setUserProjects(userWithAffiliate.tags);
        // 🔥 PHASE 4: localStorage.setItem('userProjects') supprimé - currentUser.tags est la source
      }
    } else {
      // 🔥 PHASE 3: Pas besoin de removeItem car plus jamais écrit
      navigate('/');
    }
  };

  const switchActiveAdminUser = (userObject) => {
    // ⚠️ Modifié: Prend maintenant un objet user complet au lieu d'un userId
    // Les composants doivent utiliser useSupabaseUsers() et passer l'objet complet
    if (userObject && userObject.id) {
        setActiveAdminUser(userObject);
        // 🔥 SUPPRIMÉ: localStorage.setItem - Cause des réapparitions sur routes publiques
        // localStorage.setItem('activeAdminUser', JSON.stringify(userObject));
        toast({
            title: `Connecté en tant que ${userObject.name}`,
            description: `Vous naviguez maintenant avec le profil de ${userObject.name}.`,
            className: "bg-blue-600 text-white"
        });
    }
  };

  // ❌ SUPPRIMÉ: getAdminById() - Utiliser useSupabaseUsers() pour récupérer les utilisateurs
  // const getAdminById = (userId) => {
  //   const { users } = useSupabaseUsers();
  //   return users.find(u => u.id === userId) || null;
  // };
  
  const appState = { 
    userProjects, setUserProjects, addProject, 
    projectsData, setProjectsData: handleSetProjectsData,
    deleteProjectTemplate: deleteTemplate, // 🔥 Exposer deleteTemplate pour suppression directe
    prospects: supabaseProspects, // 🔥 Utiliser directement supabaseProspects au lieu du state legacy
    prospectsLoading, // 🔥 État de chargement des prospects pour skeleton screens
    setProspects, addProspect: addProspectSupabase, updateProspect, // 🔥 PR-4.1: Exposer addProspect du hook Supabase 
    currentUser, setCurrentUser: handleSetCurrentUser, 
    // 🔥 PR-3: SOURCE UNIQUE AGENDA - Données et fonctions du hook centralisé
    appointments: supabaseAppointments || [],
    addAppointment: addAppointmentSupabase,
    updateAppointment: updateAppointmentSupabase,
    deleteAppointment: deleteAppointmentSupabase,
    getSharedAppointments,
    getProjectSteps, updateProjectSteps, completeStepAndProceed,
    calls: supabaseCalls || [],
    addCall: addCallSupabase,
    updateCall: updateCallSupabase,
    deleteCall: deleteCallSupabase,
    tasks: supabaseTasks || [],
    addTask: addTaskSupabase,
    updateTask: updateTaskSupabase,
    deleteTask: deleteTaskSupabase,
    agendaLoading, // 🔥 PR-3: État de chargement agenda
    refreshAgenda, // 🔥 PR-3: Forcer refresh agenda si nécessaire
    // ❌ SUPPRIMÉ: users, updateUsers, deleteUser, getAdminById - Utiliser useSupabaseUsers() ou useSupabaseUsersCRUD()
    addChatMessage, // ✅ Conservé pour compatibilité - Envoie maintenant vers Supabase
    notifications, markNotificationAsRead,
    clientNotifications, markClientNotificationAsRead,
    // 🔥 forms synchronisé depuis Supabase (read-only pour chat, édition via useSupabaseForms dans ProfilePage)
    forms,
    // 🔥 prompts synchronisé depuis Supabase (read-only pour Charly AI, édition via useSupabasePrompts dans ProfilePage)
    prompts,
    formContactConfig, setFormContactConfig: handleSetFormContactConfig,
    projectInfos: supabaseProjectInfos, getProjectInfo, updateProjectInfo,
    supabaseProjectInfos, getSupabaseProjectInfo, updateSupabaseProjectInfo,
    globalPipelineSteps, setGlobalPipelineSteps: handleSetGlobalPipelineSteps,
    pipelineLoading, // 🔥 État de chargement des colonnes du pipeline
    allProjectSteps, // 🔥 Tous les project steps préchargés pour éviter race conditions
    allStepsLoading, // 🔥 État de chargement des project steps
    activeAdminUser, setActiveAdminUser, switchActiveAdminUser,
    authLoading, // 🔥 Exposer l'état de chargement auth
    adminReady, // 🔥 Exposer le flag pour activer les hooks Supabase
    // 🔥 PR-1: Boot status unifié
    bootStatus,
    bootError,
    BOOT_STATUS, // Exposer les constantes pour comparaison
    clientFormPanels, registerClientForm, updateClientFormPanel, clearClientFormsFor,
    companyLogo, setCompanyLogo, removeLogo,
    // 🔥 WHITE-LABEL: Branding dynamique depuis organization_settings
    brandName,
    logoUrl,
    primaryColor,
    secondaryColor,
  };

  const getPageTitle = () => {
    // 🔥 Utiliser le brandName dynamique si disponible
    const brand = brandName || 'Application';
    if (location.pathname === '/') return `${brand} - Économisez sur votre électricité`;
    if (location.pathname.startsWith('/inscription')) return `${brand} - Démarrez votre projet`;
    if (location.pathname === '/producteurs') return `${brand} - Vendez mieux votre électricité`;
    if (location.pathname.startsWith('/dashboard/offres')) return `${brand} - Nos Offres Exclusives`;
    if (location.pathname.startsWith('/dashboard/profil')) return `${brand} - Votre Profil`;
    if (location.pathname.startsWith('/dashboard')) return `${brand} - Votre Espace Client`;
    if (location.pathname.startsWith('/admin/profil')) return `${brand} Pro - Mon Profil`;
    if (location.pathname.startsWith('/admin/charly')) return `${brand} Pro - Charly AI`;
    if (isAdminRoute) return `${brand} Pro - Espace Admin`;
    return brand;
  };

  const getPageDescription = () => {
    if (location.pathname === '/') return 'Dépensez 35 % de moins sur votre électricité, garanti 10 ans.';
    if (location.pathname.startsWith('/inscription')) return `Choisissez vos projets et rejoignez ${brandName || 'notre plateforme'}.`;
    if (location.pathname === '/producteurs') return 'Optimisez la rentabilité de vos centrales solaires avec l\'autoconsommation collective.';
    if (location.pathname.startsWith('/dashboard/offres')) return 'Découvrez nos offres pour l\'autonomie énergétique, la production solaire et l\'investissement.';
    if (location.pathname.startsWith('/dashboard/profil')) return 'Gérez vos informations personnelles et vos préférences.';
    if (location.pathname.startsWith('/dashboard')) return 'Suivez l\'avancement de vos projets énergétiques ACC, solaire, et plus.';
    if (location.pathname.startsWith('/admin/profil')) return 'Gérez vos informations, utilisateurs et clients.';
    if (location.pathname.startsWith('/admin/charly')) return 'Gérez vos campagnes et scripts avec votre assistant IA Charly.';
    if (isAdminRoute) return `Gérez vos prospects, projets et agenda avec ${brandName || 'la plateforme'} Pro.`;
    return 'La solution pour vos projets énergétiques.';
  };


  // NOTE: Ne pas bloquer le rendu si l'organisation n'est pas encore résolue.
  // Le fallback plateforme est géré dans OrganizationContext et l'app
  // doit pouvoir fonctionner même si organizationId === null.
  
  // 🔥 PR-1: Écran d'erreur si boot échoue (timeout, réseau, etc.)
  if (bootStatus === BOOT_STATUS.ERROR) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-red-100 rounded-full p-4">
              <svg className="h-12 w-12 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Connexion impossible
          </h1>
          
          <p className="text-gray-600 mb-4">
            {bootError || 'Le serveur ne répond pas. Vérifiez votre connexion internet.'}
          </p>
          
          <div className="bg-gray-50 rounded-lg p-3 mb-6 text-left">
            <p className="text-xs text-gray-500">
              <strong>Détails techniques :</strong><br />
              Boot status: {bootStatus}<br />
              Organization: {organizationId || 'non résolue'}
            </p>
          </div>

          <div className="flex gap-3 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Réessayer
            </button>
            
            <button
              onClick={() => window.location.href = '/'}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
            >
              Retour à l'accueil
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // 🔥 PR-1: Écran de chargement intelligent basé sur bootStatus
  // 🔥 PR-5: SKELETON FIRST PAINT - Ne plus bloquer le rendu, afficher le layout avec placeholders
  // On ne bloque QUE pour INIT et RESOLVING_ORG (besoin de l'org pour les routes)
  // Les autres états permettent d'afficher le layout avec des données en chargement
  if (bootStatus === BOOT_STATUS.INIT || bootStatus === BOOT_STATUS.RESOLVING_ORG) {
    const loadingMessages = {
      [BOOT_STATUS.INIT]: 'Initialisation...',
      [BOOT_STATUS.RESOLVING_ORG]: 'Connexion au serveur...',
    };
    
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">{loadingMessages[bootStatus] || 'Chargement...'}</p>
          <p className="text-xs text-gray-400 mt-2">
            {bootStatus === BOOT_STATUS.RESOLVING_ORG && 'Cela peut prendre quelques secondes...'}
          </p>
        </div>
      </div>
    );
  }
  
  // 🔥 PR-5: À partir de AUTH/LOADING_USER/READY, on affiche le layout
  // Les composants gèrent leur propre état de chargement via prospectsLoading, agendaLoading, etc.

  return (
    <AppContext.Provider value={appState}>
      <Helmet>
        <title>{getPageTitle()}</title>
        <meta name="description" content={getPageDescription()} />
        <meta property="og:title" content={getPageTitle()} />
        <meta property="og:description" content={getPageDescription()} />
      </Helmet>

      {unlinkedInOrg && !authLoading && (
        (
          console.log('[DEBUG ORG]', {
            hostname: window.location.hostname,
            organizationIdFromContext: organizationId,
            sessionUserId: session?.user?.id ?? null,
            prospectFound: Boolean(currentUser),
            unlinkedInOrg,
          }),
          (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-900 px-4 py-3 text-sm flex items-center gap-2">
              <span className="font-semibold">Compte non rattaché à cette organisation.</span>
              <span>Demandez une invitation.</span>
            </div>
          )
        )
      )}
      
      {/* 🔥 PR-6: Suspense pour les composants lazy-loaded */}
      <Suspense fallback={
        <div className="flex items-center justify-center h-screen bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500 text-sm">Chargement...</p>
          </div>
        </div>
      }>
      <Routes>
        {/* ⚠️ IMPORTANT : Routes spécifiques AVANT la route wildcard /:slugUser */}
        {/* 🔒 PLATFORM ADMIN ROUTES */}
        <Route path="/platform-login" element={<PlatformLoginPage />} />
        <Route path="/platform" element={<PlatformLayout />}>
          <Route index element={<PlatformHomePage />} />
          <Route path="organizations" element={<OrganizationsListPage />} />
          <Route path="organizations/:id" element={<OrganizationDetailPage />} />
        </Route>
        {/* 🌍 PUBLIC ROUTES */}
        <Route path="/" element={<Landing />} />
        <Route path="/landing" element={<Landing />} />
        <Route path="/solaire" element={<HomePage />} />
        <Route path="/login" element={<ProLoginPage />} />
        <Route path="/activate-account" element={<ActivateAccountPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/client-access" element={<ClientAccessPage />} />
        <Route path="/inscription" element={<RegistrationPage />} />
        <Route path="/inscription/:slugUser" element={<RegistrationPage />} />
        <Route path="/producteurs" element={<ProducerLandingPage />} />
        <Route path="/test-supabase" element={<TestSupabasePage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/signature/:signatureProcedureId" element={<SignaturePage />} />
        <Route path="/sign/cosigner" element={<CosignerSignaturePage />} />
        {/* 🤝 PARTNER ROUTES */}
        <Route path="/partner/login" element={<PartnerLoginPage />} />
        <Route path="/partner" element={<PartnerLayout />}>
          <Route index element={<PartnerMissionsPage />} />
          <Route path="missions" element={<PartnerMissionsPage />} />
          <Route path="missions/:missionId" element={<PartnerMissionDetailPage />} />
        </Route>
        {/* Route wildcard pour les liens d'affiliation HomePage (doit être APRÈS les routes spécifiques) */}
        <Route path="/:slugUser" element={<HomePage />} />
        <Route path="/client/activation" element={<ActivationPage />} />
        <Route path="/client/dashboard" element={<ClientLayout />}>
          <Route index element={<ClientDashboardPage />} />
          <Route path="parrainage" element={<ParrainagePage />} />
          <Route path="profil" element={<SettingsPage />} />
          <Route path="offres" element={<OffersPage />} />
        </Route>
        <Route path="/dashboard" element={<ClientLayout />}>
          <Route index element={<ClientDashboardPage />} />
          <Route path="parrainage" element={<ParrainagePage />} />
          <Route path="profil" element={<SettingsPage />} />
          <Route path="offres" element={<OffersPage />} />
        </Route>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<FinalPipeline />} />
          <Route path="pipeline" element={<FinalPipeline />} />
          <Route path="agenda" element={<Agenda />} />
          <Route path="contacts" element={<CompleteOriginalContacts />} />
          <Route path="charly" element={<CharlyPage />} />
          <Route path="configuration-ia" element={<ConfigurationIA />} />
          <Route path="workflows-charly" element={<WorkflowsCharlyPage />} />
          <Route path="workflow-v2/:prospectId/:projectType" element={<WorkflowV2Page />} />
          {/* 🔥 PROMPT 10: Cockpit Workflow V2 Config (sans prospect) */}
          <Route path="workflow-v2-config" element={<WorkflowV2ConfigPage />} />
          {/* 🔥 V2: Prospect Details V2 (isolé, sans import V1) */}
          <Route path="prospect-v2/:prospectId" element={<ProspectDetailsV2 />} />
          <Route path="landing-page" element={<LandingPageConfigPage />} />
          <Route path="projects-management" element={<ProjectsManagementPage />} />
          <Route path="forms-management" element={<FormsManagementPage />} />
          <Route path="contract-templates" element={<ContractTemplatesPage />} />
          <Route path="contract-templates/editor" element={<ContractTemplateEditorPage />} />
          <Route path="project-display" element={<ProjectDisplayManagementPage />} />
          <Route path="partners" element={<PartnersListPage />} />
          <Route path="partners/:partnerId" element={<PartnerDetailPage />} />
          <Route path="profil" element={<ProfilePage />} />
          <Route path="parametres" element={<SettingsPage />} />
        </Route>
      </Routes>
      </Suspense>
      
      <Toaster />
    </AppContext.Provider>
  );
}

export default App;
// Force rebuild Mon Nov 17 17:52:18 CET 2025
