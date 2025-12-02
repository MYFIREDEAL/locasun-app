import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Toaster } from '@/components/ui/toaster';
import AdminLayout from '@/layouts/AdminLayout';
import ClientLayout from '@/layouts/ClientLayout';
import FinalPipeline from '@/pages/admin/FinalPipeline';
import CompleteOriginalContacts from '@/pages/admin/CompleteOriginalContacts';
import Agenda from '@/pages/admin/Agenda';
import CharlyPage from '@/pages/admin/CharlyPage';
import ProfilePage from '@/pages/admin/ProfilePage';
import ClientDashboardPage from '@/pages/client/ClientDashboardPage';
import ParrainagePage from '@/pages/client/ParrainagePage';
import SettingsPage from '@/pages/client/SettingsPage';
import OffersPage from '@/pages/client/OffersPage';
import ActivationPage from '@/pages/client/ActivationPage';
import HomePage from '@/pages/HomePage';
import ClientAccessPage from '@/pages/ClientAccessPage';
import RegistrationPage from '@/pages/RegistrationPage';
import ProducerLandingPage from '@/pages/ProducerLandingPage';
import TestSupabasePage from '@/pages/TestSupabasePage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
// ✅ allProjectsData maintenant chargé depuis Supabase (project_templates table)
import { toast } from '@/components/ui/use-toast';
import { slugify } from '@/lib/utils';
import { formContactConfig as defaultFormContactConfig } from '@/config/formContactConfig';
import { supabase } from '@/lib/supabase';
import { useSupabaseUsers } from '@/hooks/useSupabaseUsers';
import { useSupabaseProspects } from '@/hooks/useSupabaseProspects'; // 🔥 AJOUT PRO
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

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const isAdminRoute = location.pathname.startsWith('/admin');
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
  // formContactConfig est maintenant géré par useSupabaseCompanySettings (plus besoin de useState)
  const [projectInfos, setProjectInfos] = useState({});
  // ✅ globalPipelineSteps maintenant géré par useSupabaseGlobalPipeline (plus de localStorage)
  const [activeAdminUser, setActiveAdminUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true); // 🔥 État de chargement auth
  const [adminReady, setAdminReady] = useState(false); // 🔥 Flag pour activer les hooks Supabase
  const [session, setSession] = useState(null); // 🔥 Session Supabase
  // ❌ SUPPRIMÉ : const [clientFormPanels, setClientFormPanels] = useState([]);
  const hasHydratedGlobalPipelineSteps = useRef(false);

  // 🔥 Charger les utilisateurs Supabase pour synchroniser activeAdminUser
  const { users: supabaseUsers } = useSupabaseUsers(adminReady);
  
  // 🔥 ÉTAPE PRO : Charger les prospects depuis Supabase avec le hook qui utilise la RPC
  const { 
    prospects: supabaseProspects, 
    updateProspect: updateProspectSupabase,
    loading: prospectsLoading 
  } = useSupabaseProspects(activeAdminUser);
  
  // Synchroniser prospects dans le state pour compatibilité avec le code existant
  useEffect(() => {
    if (!prospectsLoading && supabaseProspects) {
      setProspects(supabaseProspects);
    }
  }, [supabaseProspects, prospectsLoading]);
  
  // 🔥 Charger les panneaux de formulaires clients depuis Supabase avec real-time
  // ⚠️ Si client: charger ses formulaires. Si admin: charger TOUS les formulaires (null = tous)
  const isClientRoute = location.pathname.startsWith('/dashboard');
  const prospectIdForForms = isClientRoute ? currentUser?.id : null;
  
  // 🔥 Logs seulement si session active (éviter spam lors de l'inscription)
  if (session) {
    console.log('🔍 [App.jsx] isClientRoute:', isClientRoute);
    console.log('🔍 [App.jsx] activeAdminUser:', activeAdminUser?.user_id, activeAdminUser?.name, activeAdminUser?.role);
    console.log('🔍 [App.jsx] currentUser pour forms:', currentUser?.id, currentUser?.name);
    console.log('🔍 [App.jsx] prospectIdForForms:', prospectIdForForms);
  }
  
  const {
    formPanels: clientFormPanels,
    createFormPanel: registerClientForm,
    updateFormPanel: updateClientFormPanel,
    deleteFormPanelsByProspect: clearClientFormsFor
  } = useSupabaseClientFormPanels(prospectIdForForms); // 🔥 Admin voit tout !
  
  // 🔥 Charger les company settings (logo, formulaire contact, etc.) depuis Supabase avec real-time
  const { 
    companySettings, 
    updateLogo, 
    removeLogo,
    updateFormContactConfig,
    getFormContactConfig 
  } = useSupabaseCompanySettings();

  // 🔥 Charger les colonnes du pipeline global depuis Supabase avec real-time
  const { 
    globalPipelineSteps,
    loading: pipelineLoading,
    addStep: addPipelineStep,
    updateStep: updatePipelineStep,
    deleteStep: deletePipelineStep,
    reorderSteps: reorderPipelineSteps
  } = useSupabaseGlobalPipeline(adminReady);

  // 🔥 Précharger TOUS les project steps au niveau App pour éviter race conditions
  const { allProjectSteps, loading: allStepsLoading } = useSupabaseAllProjectSteps();

  // 🔥 Synchroniser allProjectSteps (Supabase) avec projectStepsStatus (state local)
  useEffect(() => {
    if (!allStepsLoading && allProjectSteps) {
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
  }, [allProjectSteps, allStepsLoading]);

  // 🔥 Charger les modèles de projets depuis Supabase avec real-time
  const {
    projectTemplates,
    loading: templatesLoading,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    getPublicTemplates
  } = useSupabaseProjectTemplates(adminReady);

  // 🔥 Charger les formulaires depuis Supabase avec real-time (pour le chat)
  const {
    forms: supabaseForms,
    loading: formsLoading
  } = useSupabaseForms(adminReady);

  // Synchroniser forms dans le state pour compatibilité avec le code existant (chat)
  useEffect(() => {
    if (!formsLoading) {
      setForms(supabaseForms);
    }
  }, [supabaseForms, formsLoading]);

  // 🔥 Charger les prompts depuis Supabase avec real-time (pour Charly AI)
  const {
    prompts: supabasePrompts,
    loading: promptsLoading
  } = useSupabasePrompts(adminReady);

  // Synchroniser prompts dans le state pour compatibilité avec le code existant
  useEffect(() => {
    if (!promptsLoading) {
      setPrompts(supabasePrompts);
    }
  }, [supabasePrompts, promptsLoading]);

  // 🔥 Charger les notifications admin depuis Supabase avec real-time
  const {
    notifications,
    createOrUpdateNotification,
    markAsRead: markAdminNotificationAsRead
  } = useSupabaseNotifications(activeAdminUser?.user_id, adminReady);

  // 🔥 Charger les notifications client depuis Supabase avec real-time
  // Note: currentUser.id est le prospect_id dans la table prospects
  const {
    notifications: clientNotifications,
    createOrUpdateNotification: createOrUpdateClientNotification,
    markAsRead: markClientNotificationAsRead
  } = useSupabaseClientNotifications(currentUser?.id, adminReady);

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
  
  // Exposer le logo pour le contexte (compatibilité avec le code existant)
  const companyLogo = companySettings?.logo_url || '';
  const setCompanyLogo = updateLogo;
  
  // 🔥 Formulaire contact depuis Supabase (au lieu de localStorage)
  const formContactConfig = getFormContactConfig().length > 0 
    ? getFormContactConfig() 
    : defaultFormContactConfig;

  // � 1 — Simplifier onAuthStateChange : juste stocker la session
  // ---------------------------------------------
  // EVATIME AUTH — VERSION BROWSERROUTER (PRO)
  // Supabase gère automatiquement les tokens du Magic Link
  // ---------------------------------------------
  useEffect(() => {
    // Supabase gère maintenant automatiquement les tokens du Magic Link
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log("🔐 AUTH EVENT:", event, session?.user?.email || "aucune");
        setSession(session ?? null);
      }
    );

    // Session initiale (au démarrage)
    // 🔥 WAIT FOR SESSION (CRUCIAL POUR MAGIC LINK)
    supabase.auth.getSession().then(({ data }) => {
      const initialSession = data.session;
      
      if (!initialSession) {
        console.log("⏳ SESSION INITIALE: aucune - Attente évènement AUTH...");
        // ❌ Ne pas setSession(null) ici, on attend l'événement SIGNED_IN
        // Le listener onAuthStateChange ci-dessus gérera la session
        return;
      }
      
      // ✅ Session trouvée immédiatement (reconnexion ou session existante)
      console.log("🔐 SESSION INITIALE:", initialSession.user?.email || "aucune");
      setSession(initialSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 🟣 3 — Fonction loadAuthUser stable (version industrielle)
  const isLoadingAuthRef = useRef(false);

  async function loadAuthUser(userId) {
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
        setAuthLoading(false);
        isLoadingAuthRef.current = false;
        return;
      }

      // 🔥 FLUX 2 - ONBOARDING VIA ADMIN (Magic Link)
      // Étape A : Récupérer les données d'inscription en attente
      const pendingSignup = JSON.parse(localStorage.getItem('pendingSignup') || 'null');

      // 2) CLIENT - Étape B : Vérifier si prospect existe via user_id
      let { data: prospect } = await supabase
        .from("prospects")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      // Étape C : Si pas de prospect avec user_id, chercher par email
      if (!prospect) {
        const email = session?.user?.email;
        if (email) {
          const { data: byEmail } = await supabase
            .from("prospects")
            .select("*")
            .eq("email", email)
            .maybeSingle();

          // Étape D : Si prospect trouvé par email → associer user_id
          if (byEmail) {
            console.log('✅ Prospect trouvé par email, association user_id:', userId);
            await supabase
              .from("prospects")
              .update({ user_id: userId })
              .eq("id", byEmail.id);
            
            prospect = { ...byEmail, user_id: userId };
          } 
          // Étape E : Si aucun prospect n'existe → créer automatiquement
          else if (pendingSignup || !byEmail) {
            console.log('🔥 Aucun prospect trouvé, création automatique...');
            
            // Récupérer le step_id de la première colonne du pipeline
            const { data: firstStepId } = await supabase.rpc('get_first_pipeline_step_id');
            const DEFAULT_JACK_USER_ID = '82be903d-9600-4c53-9cd4-113bfaaac12e';

            const { data: newProspect, error: insertError } = await supabase
              .from('prospects')
              .insert([{
                name: pendingSignup?.firstname || email.split('@')[0],
                email: email,
                user_id: userId,
                owner_id: DEFAULT_JACK_USER_ID,
                status: firstStepId || 'default-global-pipeline-step-0',
                tags: pendingSignup?.projects || [],
                has_appointment: false,
              }])
              .select()
              .single();

            if (insertError) {
              console.error('❌ Erreur création prospect:', insertError);
            } else {
              console.log('✅ Prospect créé automatiquement:', newProspect);
              prospect = newProspect;
            }
          }
        }
      }

      // Nettoyer le localStorage après traitement
      if (pendingSignup) {
        localStorage.removeItem('pendingSignup');
        console.log('🧹 pendingSignup nettoyé du localStorage');
      }

      if (prospect) {
        setCurrentUser(prospect);
        setActiveAdminUser(null);
        
        // Synchroniser userProjects avec les tags du prospect
        if (prospect.tags && Array.isArray(prospect.tags)) {
          setUserProjects(prospect.tags);
        }
        
        setAuthLoading(false);
        isLoadingAuthRef.current = false;
        return;
      }

      // Aucun rôle trouvé
      setCurrentUser(null);
      setActiveAdminUser(null);
      setAuthLoading(false);

    } catch (err) {
      console.error("loadAuthUser error:", err);
      setAuthLoading(false);
    } finally {
      isLoadingAuthRef.current = false;
    }
  }

  // 🟣 4 — Déclencher loadAuthUser quand la session change
  useEffect(() => {
    if (!session) {
      setActiveAdminUser(null);
      setCurrentUser(null);
      setAuthLoading(false);
      return;
    }

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

  // 🔥 REAL-TIME POUR LE CLIENT : Écouter les mises à jour du prospect du client connecté
  useEffect(() => {
    if (!currentUser?.id) return; // Seulement si un client est connecté
    
    console.log('🔌 [App.jsx] Setting up real-time channel for currentUser prospect:', currentUser.id);
    
    const channel = supabase
      .channel(`client-prospect-${currentUser.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'prospects',
        filter: `id=eq.${currentUser.id}`
      }, (payload) => {
        console.log('📡 [App.jsx] Real-time UPDATE received for currentUser:', payload);
        
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
        console.log('✅ [App.jsx] currentUser mis à jour en temps réel');
        
        // 🔥 PHASE 3: localStorage supprimé - currentUser géré uniquement par Supabase
      })
      .subscribe();
    
    return () => {
      console.log('🔌 [App.jsx] Cleaning up real-time channel for currentUser');
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
        console.log('🔄 [App.jsx] Synchronisation currentUser depuis prospects (form_data changé)');
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
  const handleSetProjectsData = async (newProjectsData) => {
    try {
      // Convertir l'objet projectsData en array de templates pour Supabase
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
          // Mise à jour du template existant
          await updateTemplate(existingTemplate.id, supabaseData);
        } else {
          // Ajout d'un nouveau template
          await addTemplate({
            type: type,
            ...supabaseData
          });
        }
      }
    } catch (error) {
      console.error('❌ Erreur handleSetProjectsData:', error);
      throw error;
    }
  };

  const handleSetFormContactConfig = async (updater) => {
    // Récupérer la config actuelle depuis Supabase
    const prevConfig = getFormContactConfig();
    const nextConfig = typeof updater === 'function' ? updater(prevConfig) : updater;
    
    if (!Array.isArray(nextConfig)) {
      console.warn('⚠️ Invalid form contact config (not an array)');
      return;
    }
    
    // Ne mettre à jour que si différent
    if (areFormConfigsEqual(prevConfig, nextConfig)) {
      return;
    }
    
    // Mettre à jour dans Supabase (avec real-time automatique)
    try {
      await updateFormContactConfig(nextConfig);
    } catch (error) {
      console.error('❌ Error updating form contact config:', error);
    }
  };

  // 🔥 PHASE 2: setProjectInfosState supprimé - Utiliser updateSupabaseProjectInfo() du hook
  // ❌ SUPPRIMÉ: localStorage.setItem(PROJECT_INFO_STORAGE_KEY, ...) - Hook Supabase gère tout

  const getProjectInfo = (prospectId, projectType) => {
    if (!prospectId || !projectType) return {};
    return projectInfos?.[prospectId]?.[projectType] || {};
  };

  // 🔥 PHASE 2: updateProjectInfo maintenant wrapper vers le hook Supabase
  // Le hook gère le state local via real-time - pas besoin de setProjectInfosState
  const updateProjectInfo = async (prospectId, projectType, updater) => {
    if (!prospectId || !projectType) return;
    
    // Calculer finalInfo depuis le state actuel (pour backward compatibility)
    const prevInfo = projectInfos?.[prospectId]?.[projectType] || {};
    const nextInfoRaw = typeof updater === 'function' ? updater(prevInfo) : { ...prevInfo, ...updater };
    const finalInfo = nextInfoRaw && typeof nextInfoRaw === 'object'
      ? Object.fromEntries(Object.entries(nextInfoRaw).filter(([_, value]) => value !== undefined))
      : {};
    
    // Sauvegarder directement dans Supabase (le hook mettra à jour le state via real-time)
    try {
      const { error } = await supabase
        .from('project_infos')
        .upsert({
          prospect_id: prospectId,
          project_type: projectType,
          data: finalInfo || {}
        }, {
          onConflict: 'prospect_id,project_type'
        });
      
      if (error) {
        console.error('Erreur sauvegarde project_infos:', error);
      }
    } catch (err) {
      console.error('Erreur updateProjectInfo Supabase:', err);
    }
  };

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
      console.error('❌ Error updating pipeline steps:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour les colonnes du pipeline.",
        variant: "destructive",
      });
    }
  };

  // 🔥 Migration : Charger formContactConfig depuis localStorage et migrer vers Supabase
  useEffect(() => {
    const migrateFormContactConfig = async () => {
      const storedConfig = localStorage.getItem('evatime_form_contact_config');
      
      if (storedConfig && companySettings) {
        const parsedConfig = JSON.parse(storedConfig);
        const currentConfig = companySettings?.settings?.form_contact_config;
        
        // Si Supabase est vide mais localStorage a des données, migrer
        if (!currentConfig || currentConfig.length === 0) {
          await updateFormContactConfig(parsedConfig);
          // Nettoyer le localStorage après migration
          localStorage.removeItem('evatime_form_contact_config');
        } else {
          // Supabase a déjà des données, supprimer localStorage
          localStorage.removeItem('evatime_form_contact_config');
        }
      }
    };
    
    migrateFormContactConfig();
  }, [companySettings]); // Exécuter uniquement quand companySettings est chargé

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
          console.error('❌ Error loading prospect:', prospectError);
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
          console.warn('⚠️ No prospect data found');
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
      console.error('❌ Erreur lors de l\'envoi du message:', err);
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

  // ✅ getChatMessages - Version Supabase (requête synchrone pour compatibilité)
  // Note: Préférer useSupabaseChatMessages() pour real-time dans les composants chat
  // Cette fonction est gardée pour les composants qui ont besoin d'une vérification rapide (ClientFormPanel)
  const getChatMessages = (prospectId, projectType) => {
    // Retour vide pour l'instant - le composant ClientFormPanel devra être refactorisé
    // pour utiliser le hook useSupabaseChatMessages ou une méthode async
    console.warn('⚠️ getChatMessages appelé mais obsolète - Utiliser useSupabaseChatMessages() pour real-time');
    return [];
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
      const { data, error } = await supabase
        .from('project_steps_status')
        .upsert(
          {
            prospect_id: prospectId,
            project_type: projectType,
            steps: newSteps,
            updated_at: new Date().toISOString()
          },
          {
            onConflict: 'prospect_id,project_type'
          }
        )
        .select()
        .single();

      if (error) {
        console.error('❌ Error saving to Supabase:', error);
        toast({
          title: "Erreur",
          description: "Impossible de sauvegarder les étapes",
          variant: "destructive",
        });
        throw error;
      }
    } catch (err) {
      console.error('❌ Failed to save project steps:', err);
    }
  };
  
   const getProjectSteps = (prospectId, projectType) => {
    const key = `prospect_${prospectId}_project_${projectType}`;
    const savedSteps = projectStepsStatus[key];
    const templateSteps = projectsData[projectType]?.steps;

    console.log('🔍 [getProjectSteps] Appelé avec:', { prospectId, projectType, key });
    console.log('🔍 [getProjectSteps] savedSteps:', savedSteps);
    console.log('🔍 [getProjectSteps] templateSteps count:', templateSteps?.length);

    // ✅ TOUJOURS utiliser la structure du template Supabase (ordre à jour)
    if (!templateSteps || templateSteps.length === 0) {
      return [];
    }

    // Créer une copie des steps du template
    const currentSteps = JSON.parse(JSON.stringify(templateSteps));

    // Si des steps ont déjà été sauvegardés dans le state, restaurer les statuts
    if (savedSteps && savedSteps.length > 0) {
      console.log('✅ [getProjectSteps] Restauration des statuts depuis savedSteps');
      // Matcher les steps par name pour préserver les statuts
      currentSteps.forEach((step, index) => {
        const savedStep = savedSteps.find(s => s.name === step.name);
        if (savedStep) {
          step.status = savedStep.status;
        }
      });
    } else {
      // Nouveau prospect : initialiser la première étape avec status 'pending'
      // ⚠️ NE PAS sauvegarder automatiquement pour éviter les multiples appels
      // La sauvegarde sera faite uniquement quand l'utilisateur modifie explicitement une étape
      if (currentSteps.length > 0) {
        currentSteps[0].status = 'in_progress';
      }
    }
    
    return currentSteps;
  };

  const completeStepAndProceed = (prospectId, projectType, currentStepIndex) => {
    console.log('🎯 [completeStepAndProceed] DÉBUT:', { prospectId, projectType, currentStepIndex });
    
    const steps = getProjectSteps(prospectId, projectType);
    console.log('📋 [completeStepAndProceed] Steps récupérés:', steps);
    
    if (currentStepIndex < 0 || currentStepIndex >= steps.length) {
      console.error('❌ [completeStepAndProceed] Index invalide:', currentStepIndex, 'steps.length:', steps.length);
      return;
    }

    const newSteps = JSON.parse(JSON.stringify(steps));
    
    const completedStepName = newSteps[currentStepIndex].name;
    newSteps[currentStepIndex].status = 'completed';
    
    let nextStepName = null;
    if (currentStepIndex + 1 < newSteps.length) {
      newSteps[currentStepIndex + 1].status = 'in_progress';
      nextStepName = newSteps[currentStepIndex + 1].name;
    }
    
    console.log('✅ [completeStepAndProceed] Étape complétée:', completedStepName);
    console.log('▶️ [completeStepAndProceed] Prochaine étape:', nextStepName);
    console.log('💾 [completeStepAndProceed] Mise à jour des steps:', newSteps);
    
    updateProjectSteps(prospectId, projectType, newSteps);
    
    // TODO: Ajouter événement dans project_history
    console.log('⚠️ [completeStepAndProceed] Événement project_history pas encore implémenté');
  };

  const addProject = (projectType) => {
    if (userProjects.includes(projectType)) {
      return false;
    }
    const updatedProjects = [...userProjects, projectType];
    setUserProjects(updatedProjects);
    // 🔥 PHASE 4: localStorage.setItem('userProjects') supprimé - currentUser.tags est la source

    if (currentUser) {
      setProspects(prevProspects => {
        const updatedProspects = prevProspects.map(prospect => {
          if (prospect.id === currentUser.id) {
            if (prospect.tags.includes(projectType)) {
              return prospect;
            }
            const newTags = [...prospect.tags, projectType];
            return { ...prospect, tags: newTags };
          }
          return prospect;
        });
        // 🔥 PHASE 6: localStorage supprimé - prospects synchronisés automatiquement via useSupabaseProspects()
        return updatedProspects;
      });

      const defaultSteps = projectsData[projectType]?.steps;
      if (defaultSteps && defaultSteps.length > 0) {
        const newSteps = JSON.parse(JSON.stringify(defaultSteps));
        newSteps[0].status = 'in_progress';
        updateProjectSteps(currentUser.id, projectType, newSteps);
      }
    }

    return true;
  };

  const addProspect = (newProspect) => {
    setProspects(prevProspects => {
      const updatedProspects = [newProspect, ...prevProspects];
      // 🔥 PHASE 6: localStorage supprimé - prospects synchronisés automatiquement via useSupabaseProspects()
      return updatedProspects;
    });
  };

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
      console.error('❌ Error update prospect:', error);
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
        localStorage.setItem('activeAdminUser', JSON.stringify(userObject));
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
    setProspects, addProspect, updateProspect, 
    currentUser, setCurrentUser: handleSetCurrentUser, 
    appointments, addAppointment, updateAppointment, deleteAppointment, getSharedAppointments,
    getProjectSteps, updateProjectSteps, completeStepAndProceed,
    calls, addCall, updateCall, deleteCall,
    tasks, addTask, updateTask, deleteTask,
    // ❌ SUPPRIMÉ: users, updateUsers, deleteUser, getAdminById - Utiliser useSupabaseUsers() ou useSupabaseUsersCRUD()
    // ⚠️ LEGACY: chatMessages supprimé - getChatMessages gardé temporairement pour ClientFormPanel
    addChatMessage, // ✅ Conservé pour compatibilité - Envoie maintenant vers Supabase
    getChatMessages, // ⚠️ Version stub - À remplacer par useSupabaseChatMessages() dans les composants
    notifications, markNotificationAsRead,
    clientNotifications, markClientNotificationAsRead,
    // 🔥 forms synchronisé depuis Supabase (read-only pour chat, édition via useSupabaseForms dans ProfilePage)
    forms,
    // 🔥 prompts synchronisé depuis Supabase (read-only pour Charly AI, édition via useSupabasePrompts dans ProfilePage)
    prompts,
    formContactConfig, setFormContactConfig: handleSetFormContactConfig,
    projectInfos, getProjectInfo, updateProjectInfo,
    supabaseProjectInfos, getSupabaseProjectInfo, updateSupabaseProjectInfo,
    globalPipelineSteps, setGlobalPipelineSteps: handleSetGlobalPipelineSteps,
    pipelineLoading, // 🔥 État de chargement des colonnes du pipeline
    allProjectSteps, // 🔥 Tous les project steps préchargés pour éviter race conditions
    allStepsLoading, // 🔥 État de chargement des project steps
    activeAdminUser, setActiveAdminUser, switchActiveAdminUser,
    authLoading, // 🔥 Exposer l'état de chargement auth
    adminReady, // 🔥 Exposer le flag pour activer les hooks Supabase
    clientFormPanels, registerClientForm, updateClientFormPanel, clearClientFormsFor,
    companyLogo, setCompanyLogo, removeLogo,
  };

  const getPageTitle = () => {
    if (location.pathname === '/') return 'Evatime - Économisez sur votre électricité';
    if (location.pathname.startsWith('/inscription')) return 'Evatime - Démarrez votre projet';
    if (location.pathname === '/producteurs') return 'Evatime - Vendez mieux votre électricité';
    if (location.pathname.startsWith('/dashboard/offres')) return 'Evatime - Nos Offres Exclusives';
    if (location.pathname.startsWith('/dashboard/profil')) return 'Evatime - Votre Profil';
    if (location.pathname.startsWith('/dashboard')) return 'Evatime - Votre Espace Client';
    if (location.pathname.startsWith('/admin/profil')) return 'Evatime Pro - Mon Profil';
    if (location.pathname.startsWith('/admin/charly')) return 'Evatime Pro - Charly AI';
    if (isAdminRoute) return 'Evatime Pro - Espace Admin';
    return 'Evatime';
  };

  const getPageDescription = () => {
    if (location.pathname === '/') return 'Dépensez 35 % de moins sur votre électricité, garanti 10 ans.';
    if (location.pathname.startsWith('/inscription')) return 'Choisissez vos projets et rejoignez Evatime.';
    if (location.pathname === '/producteurs') return 'Optimisez la rentabilité de vos centrales solaires avec l\'autoconsommation collective.';
    if (location.pathname.startsWith('/dashboard/offres')) return 'Découvrez nos offres pour l\'autonomie énergétique, la production solaire et l\'investissement.';
    if (location.pathname.startsWith('/dashboard/profil')) return 'Gérez vos informations personnelles et vos préférences.';
    if (location.pathname.startsWith('/dashboard')) return 'Suivez l\'avancement de vos projets énergétiques ACC, solaire, et plus.';
    if (location.pathname.startsWith('/admin/profil')) return 'Gérez vos informations, utilisateurs et clients.';
    if (location.pathname.startsWith('/admin/charly')) return 'Gérez vos campagnes et scripts avec votre assistant IA Charly.';
    if (isAdminRoute) return 'Gérez vos prospects, projets et agenda avec Evatime Pro.';
    return 'La solution pour vos projets énergétiques.';
  };


  // 🔥 BLOQUER LE RENDU TANT QUE L'AUTH N'EST PAS COMPLÈTE
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Chargement de l'application...</p>
        </div>
      </div>
    );
  }

  return (
    <AppContext.Provider value={appState}>
      <Helmet>
        <title>{getPageTitle()}</title>
        <meta name="description" content={getPageDescription()} />
        <meta property="og:title" content={getPageTitle()} />
        <meta property="og:description" content={getPageDescription()} />
      </Helmet>
      
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/:slugUser" element={<HomePage />} />
        <Route path="/client-access" element={<ClientAccessPage />} />
        <Route path="/inscription" element={<RegistrationPage />} />
        <Route path="/inscription/:slugUser" element={<RegistrationPage />} />
        <Route path="/producteurs" element={<ProducerLandingPage />} />
        <Route path="/test-supabase" element={<TestSupabasePage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/client/activation" element={<ActivationPage />} />
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
          <Route path="profil" element={<ProfilePage />} />
          <Route path="parametres" element={<SettingsPage />} />
        </Route>
      </Routes>
      
      <Toaster />
    </AppContext.Provider>
  );
}

export default App;
// Force rebuild Mon Nov 17 17:52:18 CET 2025
