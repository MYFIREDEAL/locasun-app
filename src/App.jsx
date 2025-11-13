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
import HomePage from '@/pages/HomePage';
import RegistrationPage from '@/pages/RegistrationPage';
import ProducerLandingPage from '@/pages/ProducerLandingPage';
import TestSupabasePage from '@/pages/TestSupabasePage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import { allProjectsData } from '@/data/projects';
import { toast } from '@/components/ui/use-toast';
import { slugify } from '@/lib/utils';
import { formContactConfig as defaultFormContactConfig } from '@/config/formContactConfig';
import { supabase } from '@/lib/supabase';
import { useSupabaseUsers } from '@/hooks/useSupabaseUsers';

const GLOBAL_PIPELINE_STORAGE_KEY = 'global_pipeline_steps';
const DEFAULT_GLOBAL_PIPELINE_STEPS = ['MARKET', 'ETUDE', 'OFFRE'];
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

const PROJECT_INFO_STORAGE_KEY = 'evatime_project_infos';

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
  const [projectsData, setProjectsData] = useState({});
  const [prospects, setProspects] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [projectStepsStatus, setProjectStepsStatus] = useState({});
  const [calls, setCalls] = useState([]);
  const [tasks, setTasks] = useState([]);
  // ❌ SUPPRIMÉ: users localStorage - Maintenant géré par useSupabaseUsers() et useSupabaseUsersCRUD()
  // const [users, setUsers] = useState({});
  const [chatMessages, setChatMessages] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [clientNotifications, setClientNotifications] = useState([]);
  const [forms, setForms] = useState({});
  const [prompts, setPrompts] = useState({});
  const [formContactConfig, setFormContactConfig] = useState(defaultFormContactConfig);
  const [projectInfos, setProjectInfos] = useState({});
  const [globalPipelineSteps, setGlobalPipelineSteps] = useState([]);
  const [activeAdminUser, setActiveAdminUser] = useState(null);
  const [clientFormPanels, setClientFormPanels] = useState([]);
  const [companyLogo, setCompanyLogo] = useState('');
  const hasHydratedFormContactConfig = useRef(false);
  const hasHydratedGlobalPipelineSteps = useRef(false);

  // 🔥 Charger les utilisateurs Supabase pour synchroniser activeAdminUser
  const { users: supabaseUsers } = useSupabaseUsers();

  // 🔥 Synchroniser activeAdminUser avec l'utilisateur Supabase connecté (UNE SEULE FOIS au chargement)
  useEffect(() => {
    const syncActiveAdmin = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setActiveAdminUser(null);
          localStorage.removeItem('activeAdminUser');
          return;
        }

        // Trouver l'utilisateur dans supabaseUsers par user_id
        const matchedUser = supabaseUsers.find(u => u.user_id === user.id);
        if (matchedUser) {
          console.log('🔄 Synchronisation activeAdminUser:', matchedUser.name);
          setActiveAdminUser(matchedUser);
          localStorage.setItem('activeAdminUser', JSON.stringify(matchedUser));
        }
      } catch (error) {
        console.error('❌ Erreur sync activeAdminUser:', error);
      }
    };

    // Ne synchroniser que si supabaseUsers est chargé ET qu'on n'a pas encore d'activeAdminUser
    if (supabaseUsers.length > 0 && !activeAdminUser) {
      syncActiveAdmin();
    }
  }, [supabaseUsers, activeAdminUser]);

  useEffect(() => {
    const storedProjectsData = localStorage.getItem('evatime_projects_data');
    if (storedProjectsData) {
        setProjectsData(JSON.parse(storedProjectsData));
    } else {
        setProjectsData(allProjectsData);
        localStorage.setItem('evatime_projects_data', JSON.stringify(allProjectsData));
    }

    const storedProjects = localStorage.getItem('userProjects');
    if (storedProjects) {
      const parsedProjects = JSON.parse(storedProjects);
      const validProjects = parsedProjects.filter(pId => projectsData[pId]);
      if (parsedProjects.length !== validProjects.length) {
         localStorage.setItem('userProjects', JSON.stringify(validProjects));
      }
      setUserProjects(validProjects);
    } else {
      const defaultProjects = ['ACC'];
      localStorage.setItem('userProjects', JSON.stringify(defaultProjects));
      setUserProjects(defaultProjects);
    }

    const storedProspects = localStorage.getItem('evatime_prospects');
    if (storedProspects) {
      const parsedProspects = JSON.parse(storedProspects);
      const normalizedProspects = parsedProspects.map((prospect) => {
        const normalizedTags = Array.isArray(prospect.tags)
          ? prospect.tags
          : typeof prospect.tags === 'string' && prospect.tags.trim()
            ? [prospect.tags.trim()]
            : prospect.projectType
              ? [prospect.projectType]
              : [];

        return {
          ...prospect,
          tags: normalizedTags,
        };
      });
      setProspects(normalizedProspects);
      localStorage.setItem('evatime_prospects', JSON.stringify(normalizedProspects));
    } else {
      // Prospects par défaut pour les activités de test
      const defaultProspects = [
        {
          id: 'prospect-1',
          name: 'Jean Dupont',
          email: 'jean.dupont@example.com',
          phone: '01 23 45 67 89',
          company: 'Dupont SA',
          address: '123 Rue de la Paix, 75001 Paris',
          ownerId: 'user-1',
          status: 'lead',
          tags: ['ACC'],
        },
        {
          id: 'prospect-2',
          name: 'Marie Martin',
          email: 'marie.martin@example.com',
          phone: '09 87 65 43 21',
          company: 'Martin & Co',
          address: '456 Avenue des Champs, 69000 Lyon',
          ownerId: 'user-1',
          status: 'qualified',
          tags: ['Centrale'],
        },
        {
          id: 'prospect-3',
          name: 'Pierre Durand',
          email: 'pierre.durand@example.com',
          phone: '04 56 78 90 12',
          company: 'Durand Industries',
          address: '789 Boulevard du Commerce, 13000 Marseille',
          ownerId: 'user-1',
          status: 'opportunity',
          tags: ['Investissement'],
        }
      ];
      setProspects(defaultProspects);
      localStorage.setItem('evatime_prospects', JSON.stringify(defaultProspects));
    }

    const storedUser = localStorage.getItem('currentUser');
    const parsedUser = storedUser ? JSON.parse(storedUser) : null;
    setCurrentUser(parsedUser);
    
    // Synchroniser userProjects avec les tags du currentUser au chargement
    if (parsedUser && parsedUser.tags && Array.isArray(parsedUser.tags)) {
      setUserProjects(parsedUser.tags);
      localStorage.setItem('userProjects', JSON.stringify(parsedUser.tags));
    }
    
    const storedAppointments = localStorage.getItem('evatime_appointments');
    if (storedAppointments) {
      const parsedAppointments = JSON.parse(storedAppointments).map(app => ({
        ...app,
        start: new Date(app.start),
        end: new Date(app.end),
        status: app.status || 'pending',
      }));
      setAppointments(parsedAppointments);
    }
    
    const storedStepsStatus = localStorage.getItem('evatime_project_steps_status');
    setProjectStepsStatus(storedStepsStatus ? JSON.parse(storedStepsStatus) : {});

    const storedCalls = localStorage.getItem('evatime_calls');
    if (storedCalls) {
      setCalls(JSON.parse(storedCalls));
    } else {
      // Données de test par défaut avec des activités en retard
      const defaultCalls = [
        {
          id: 'call-overdue-1',
          name: 'Appel commercial urgent',
          date: '2025-10-10', // 3 jours en retard
          time: '14:30',
          contactId: 'prospect-1',
          assignedUserId: 'user-1',
          status: 'pending'
        },
        {
          id: 'call-overdue-2',
          name: 'Suivi client important',
          date: '2025-10-11', // 2 jours en retard
          time: '10:00',
          contactId: 'prospect-2',
          assignedUserId: 'user-1',
          status: 'pending'
        },
        {
          id: 'call-today-1',
          name: 'Appel de suivi',
          date: '2025-10-13', // Aujourd'hui
          time: '16:00',
          contactId: 'prospect-3',
          assignedUserId: 'user-1',
          status: 'pending'
        }
      ];
      setCalls(defaultCalls);
      localStorage.setItem('evatime_calls', JSON.stringify(defaultCalls));
    }

    const storedTasks = localStorage.getItem('evatime_tasks');
    if (storedTasks) {
      setTasks(JSON.parse(storedTasks));
    } else {
      // Données de test par défaut avec des tâches en retard
      const defaultTasks = [
        {
          id: 'task-overdue-1',
          text: 'Préparer devis pour client VIP',
          date: '2025-10-09', // 4 jours en retard
          contactId: 'prospect-1',
          assignedUserId: 'user-1',
          done: false
        },
        {
          id: 'task-overdue-2',
          text: 'Envoyer documentation technique',
          date: '2025-10-10', // 3 jours en retard
          contactId: 'prospect-2',
          assignedUserId: 'user-1',
          done: false
        },
        {
          id: 'task-today-1',
          text: 'Finaliser présentation',
          date: '2025-10-13', // Aujourd'hui
          contactId: 'prospect-3',
          assignedUserId: 'user-1',
          done: false
        }
      ];
      setTasks(defaultTasks);
      localStorage.setItem('evatime_tasks', JSON.stringify(defaultTasks));
    }

    // ❌ SUPPRIMÉ: Chargement users localStorage - Maintenant géré par useSupabaseUsers()
    // Les utilisateurs sont stockés dans Supabase (auth.users + public.users)
    // Utiliser useSupabaseUsers() pour lecture ou useSupabaseUsersCRUD() pour CRUD

    const storedActiveAdminUser = localStorage.getItem('activeAdminUser');
    if (storedActiveAdminUser) {
        setActiveAdminUser(JSON.parse(storedActiveAdminUser));
    }
    // Note: activeAdminUser sera chargé via HomePage.jsx après authentification
    
    const storedChatMessages = localStorage.getItem('evatime_chat_messages');
    setChatMessages(storedChatMessages ? JSON.parse(storedChatMessages) : {});

    const storedNotifications = localStorage.getItem('evatime_notifications');
    setNotifications(storedNotifications ? JSON.parse(storedNotifications) : []);
    
    const storedClientNotifications = localStorage.getItem('evatime_client_notifications');
    setClientNotifications(storedClientNotifications ? JSON.parse(storedClientNotifications) : []);

    const storedForms = localStorage.getItem('evatime_forms');
    setForms(storedForms ? JSON.parse(storedForms) : {});

    const storedPrompts = localStorage.getItem('evatime_prompts');
    setPrompts(storedPrompts ? JSON.parse(storedPrompts) : {});

    let initialProjectInfos = {};
    const storedProjectInfos = localStorage.getItem(PROJECT_INFO_STORAGE_KEY);
    if (storedProjectInfos) {
      try {
        const parsedProjectInfos = JSON.parse(storedProjectInfos);
        if (parsedProjectInfos && typeof parsedProjectInfos === 'object') {
          initialProjectInfos = parsedProjectInfos;
        }
      } catch {
        // ignore malformed data
      }
    }

    const legacyProjectKeys = Object.keys(localStorage).filter((key) => key.startsWith('prospect_') && key.includes('_project_'));
    if (legacyProjectKeys.length > 0) {
      legacyProjectKeys.forEach((legacyKey) => {
        try {
          const storedValue = localStorage.getItem(legacyKey);
          if (!storedValue) return;
          const parsedValue = JSON.parse(storedValue);
          const match = legacyKey.match(/^prospect_(.+)_project_(.+)$/);
          if (match && parsedValue && typeof parsedValue === 'object') {
            const [, legacyProspectId, legacyProjectType] = match;
            if (!initialProjectInfos[legacyProspectId]) {
              initialProjectInfos[legacyProspectId] = {};
            }
            initialProjectInfos[legacyProspectId][legacyProjectType] = {
              ...initialProjectInfos[legacyProspectId][legacyProjectType],
              ...parsedValue,
            };
          }
        } catch {
          // ignore malformed legacy data
        } finally {
          localStorage.removeItem(legacyKey);
        }
      });
    }

    if (Object.keys(initialProjectInfos).length > 0) {
      setProjectInfos(initialProjectInfos);
      localStorage.setItem(PROJECT_INFO_STORAGE_KEY, JSON.stringify(initialProjectInfos));
    }

    const storedGlobalPipelineSteps = localStorage.getItem(GLOBAL_PIPELINE_STORAGE_KEY);

    if (storedGlobalPipelineSteps) {
      try {
        const parsedSteps = JSON.parse(storedGlobalPipelineSteps);
        const sanitized = sanitizeGlobalPipelineSteps(parsedSteps);
        if (sanitized.length > 0) {
          setGlobalPipelineSteps(sanitized);
        } else {
          const defaults = buildDefaultGlobalPipelineSteps();
          setGlobalPipelineSteps(defaults);
          localStorage.setItem(GLOBAL_PIPELINE_STORAGE_KEY, JSON.stringify(defaults));
        }
      } catch {
        const defaults = buildDefaultGlobalPipelineSteps();
        setGlobalPipelineSteps(defaults);
        localStorage.setItem(GLOBAL_PIPELINE_STORAGE_KEY, JSON.stringify(defaults));
      }
    } else {
      const defaults = buildDefaultGlobalPipelineSteps();
      setGlobalPipelineSteps(defaults);
      localStorage.setItem(GLOBAL_PIPELINE_STORAGE_KEY, JSON.stringify(defaults));
    }

    hasHydratedFormContactConfig.current = true;
    hasHydratedGlobalPipelineSteps.current = true;
  }, []);
  
  const handleSetProjectsData = (newProjectsData) => {
      setProjectsData(newProjectsData);
      localStorage.setItem('evatime_projects_data', JSON.stringify(newProjectsData));
  };

  const handleSetForms = (newForms) => {
    setForms(newForms);
    localStorage.setItem('evatime_forms', JSON.stringify(newForms));
  };
  
  const handleSetPrompts = (newPrompts) => {
    setPrompts(newPrompts);
    localStorage.setItem('evatime_prompts', JSON.stringify(newPrompts));
  };

  const handleSetFormContactConfig = (updater) => {
    setFormContactConfig(prevConfig => {
      const nextConfig = typeof updater === 'function' ? updater(prevConfig) : updater;
      if (!Array.isArray(nextConfig)) {
        return prevConfig;
      }
      return areFormConfigsEqual(prevConfig, nextConfig) ? prevConfig : nextConfig;
    });
  };

  const setProjectInfosState = (updater) => {
    setProjectInfos(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      localStorage.setItem(PROJECT_INFO_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const getProjectInfo = (prospectId, projectType) => {
    if (!prospectId || !projectType) return {};
    return projectInfos?.[prospectId]?.[projectType] || {};
  };

  const updateProjectInfo = (prospectId, projectType, updater) => {
    if (!prospectId || !projectType) return;
    setProjectInfosState(prev => {
      const prevForProspect = prev[prospectId] || {};
      const prevInfo = prevForProspect[projectType] || {};
      const nextInfoRaw = typeof updater === 'function' ? updater(prevInfo) : { ...prevInfo, ...updater };
      const nextInfo = nextInfoRaw && typeof nextInfoRaw === 'object'
        ? Object.fromEntries(Object.entries(nextInfoRaw).filter(([_, value]) => value !== undefined))
        : {};

      if (Object.keys(nextInfo).length === 0) {
        const { [projectType]: _, ...restProjects } = prevForProspect;
        const nextState = { ...prev };
        if (Object.keys(restProjects).length > 0) {
          nextState[prospectId] = restProjects;
        } else {
          delete nextState[prospectId];
        }
        return nextState;
      }

      if (
        Object.keys(nextInfo).length === Object.keys(prevInfo).length &&
        Object.entries(nextInfo).every(([key, value]) => prevInfo[key] === value)
      ) {
        return prev;
      }

      return {
        ...prev,
        [prospectId]: {
          ...prevForProspect,
          [projectType]: nextInfo,
        },
      };
    });
  };

  const handleSetGlobalPipelineSteps = (updater) => {
    setGlobalPipelineSteps(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      const sanitized = sanitizeGlobalPipelineSteps(next);
      if (areGlobalPipelineStepsEqual(prev, sanitized)) {
        return prev;
      }
      return sanitized;
    });
  };

  useEffect(() => {
    if (!hasHydratedFormContactConfig.current) {
      hasHydratedFormContactConfig.current = true;
      return undefined;
    }
    const cancel = scheduleDeferredWrite(() => {
      try {
        localStorage.setItem('evatime_form_contact_config', JSON.stringify(formContactConfig));
      } catch {
        /* ignore storage errors */
      }
    });
    return () => cancel();
  }, [formContactConfig]);

  useEffect(() => {
    if (!hasHydratedGlobalPipelineSteps.current) {
      hasHydratedGlobalPipelineSteps.current = true;
      return undefined;
    }
    const cancel = scheduleDeferredWrite(() => {
      try {
        localStorage.setItem(GLOBAL_PIPELINE_STORAGE_KEY, JSON.stringify(globalPipelineSteps));
      } catch {
        /* ignore storage errors */
      }
    });
    return () => cancel();
  }, [globalPipelineSteps]);

  // Load company logo from localStorage
  useEffect(() => {
    const storedLogo = localStorage.getItem('evatime_company_logo');
    if (storedLogo) {
      setCompanyLogo(storedLogo);
    }
  }, []);

  // Save company logo to localStorage
  useEffect(() => {
    if (companyLogo) {
      localStorage.setItem('evatime_company_logo', companyLogo);
    }
  }, [companyLogo]);

  const addChatMessage = (prospectId, projectType, message) => {
    const chatKey = `chat_${prospectId}_${projectType}`;
    const newMessage = { ...message, timestamp: new Date().toISOString() };

    setChatMessages(prev => {
      const newMessages = { ...prev };
      if (!newMessages[chatKey]) {
        newMessages[chatKey] = [];
      }
      const existingMessages = newMessages[chatKey];

      if (
        newMessage.completedFormId &&
        newMessage.sender === 'client'
      ) {
        const alreadyCompleted = existingMessages.some(msg =>
          msg.sender === 'client' &&
          msg.completedFormId === newMessage.completedFormId &&
          (msg.relatedMessageTimestamp || '') === (newMessage.relatedMessageTimestamp || '')
        );
        if (alreadyCompleted) {
          return prev;
        }
      }

      if (newMessage.promptId) {
        const alreadySentFromPrompt = existingMessages.some(msg =>
          msg.sender === newMessage.sender &&
          msg.promptId === newMessage.promptId &&
          (msg.stepIndex || 0) === (newMessage.stepIndex || 0) &&
          (msg.text || '') === (newMessage.text || '') &&
          (msg.formId || null) === (newMessage.formId || null)
        );
        if (alreadySentFromPrompt) {
          return prev;
        }
      }

      newMessages[chatKey].push(newMessage);
      localStorage.setItem('evatime_chat_messages', JSON.stringify(newMessages));
      return newMessages;
    });

    if (message.file && message.sender === 'client') {
      updateProjectInfo(prospectId, projectType, (prev) => {
        if (projectType === 'ACC' && !prev?.ribFile) {
          return { ...prev, ribFile: message.file.name };
        }
        return prev || {};
      });
    }

    // Notification admin quand un client envoie un message (groupée par projet)
    if (message.sender === 'client') {
      const prospect = prospects.find(p => p.id === prospectId);
      if (prospect) {
        setNotifications(prev => {
          // Chercher si une notification existe déjà pour ce prospect + projet
          const existingIndex = prev.findIndex(
            n => n.prospectId === prospectId && n.projectType === projectType && !n.read
          );

          let updated;
          if (existingIndex !== -1) {
            // Notification existe déjà : incrémenter le compteur
            updated = [...prev];
            updated[existingIndex] = {
              ...updated[existingIndex],
              count: (updated[existingIndex].count || 1) + 1,
              timestamp: new Date().toISOString(), // Mettre à jour le timestamp
            };
          } else {
            // Créer une nouvelle notification avec count = 1
            const newNotification = {
              id: Date.now(),
              prospectId,
              projectType,
              prospectName: prospect.name,
              projectName: projectsData[projectType]?.title || projectType,
              count: 1,
              read: false,
              timestamp: new Date().toISOString(),
            };
            updated = [newNotification, ...prev];
          }
          
          localStorage.setItem('evatime_notifications', JSON.stringify(updated));
          return updated;
        });
      }
    }

    // Notification client quand l'admin/pro répond (groupée par projet)
    if (message.sender === 'admin' || message.sender === 'pro') {
      setClientNotifications(prev => {
        // Chercher si une notification existe déjà pour ce projet
        const existingIndex = prev.findIndex(
          n => n.projectType === projectType && !n.read
        );

        let updated;
        if (existingIndex !== -1) {
          // Notification existe déjà : incrémenter le compteur
          updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
            count: (updated[existingIndex].count || 1) + 1,
            message: message.text?.substring(0, 50) || 'Nouveau message',
            timestamp: new Date().toISOString(), // Mettre à jour le timestamp
          };
        } else {
          // Créer une nouvelle notification avec count = 1
          const newClientNotification = {
            id: Date.now(),
            projectType,
            projectName: projectsData[projectType]?.title || projectType,
            message: message.text?.substring(0, 50) || 'Nouveau message',
            count: 1,
            read: false,
            timestamp: new Date().toISOString(),
          };
          updated = [newClientNotification, ...prev];
        }
        
        localStorage.setItem('evatime_client_notifications', JSON.stringify(updated));
        return updated;
      });
    }
  };

  const markNotificationAsRead = (notificationId) => {
    setNotifications(prev => {
      const updated = prev.map(n => n.id === notificationId ? { ...n, read: true } : n);
      localStorage.setItem('evatime_notifications', JSON.stringify(updated));
      return updated;
    });
  };

  const markClientNotificationAsRead = (notificationId) => {
    setClientNotifications(prev => {
      const updated = prev.map(n => n.id === notificationId ? { ...n, read: true } : n);
      localStorage.setItem('evatime_client_notifications', JSON.stringify(updated));
      return updated;
    });
  };

  const getChatMessages = (prospectId, projectType) => {
    const key = `chat_${prospectId}_${projectType}`;
    return chatMessages[key] || [];
  };

  const getSharedAppointments = (contactId, projectType, stepName) => {
    return appointments.filter(appointment => 
      appointment.share === true &&
      appointment.contactId === contactId &&
      appointment.projectId === projectType &&
      appointment.step === stepName
    );
  };

  const registerClientForm = useCallback((formPayload) => {
    setClientFormPanels(prev => {
      const panelId = formPayload.messageTimestamp || `${formPayload.prospectId}_${formPayload.projectType}_${formPayload.formId}`;
      const normalized = {
        status: formPayload.status || 'pending',
        createdAt: formPayload.messageTimestamp ? new Date(formPayload.messageTimestamp).getTime() : Date.now(),
        ...formPayload,
        panelId,
        userOverride: typeof formPayload.userOverride !== 'undefined' ? formPayload.userOverride : null,
      };
      const existingIndex = prev.findIndex(item => item.panelId === panelId);
      if (existingIndex !== -1) {
        const updated = [...prev];
        const existingItem = updated[existingIndex];
        const merged = {
          ...existingItem,
          ...normalized,
        };
        if (typeof formPayload.userOverride === 'undefined') {
          merged.userOverride = existingItem.userOverride || null;
        }
        const nextStatus = merged.userOverride
          ? merged.userOverride
          : (normalized.status || existingItem.status);
        merged.status = nextStatus;
        updated[existingIndex] = merged;
        return updated;
      }
      return [normalized, ...prev];
    });
  }, []);

  const updateClientFormPanel = useCallback((panelId, updates) => {
    setClientFormPanels(prev => prev.map(item => item.panelId === panelId ? { ...item, ...updates } : item));
  }, []);

  const clearClientFormsFor = useCallback((prospectId, projectType) => {
    setClientFormPanels(prev => prev.filter(item => !(item.prospectId === prospectId && item.projectType === projectType)));
  }, []);

  // ❌ SUPPRIMÉ: updateUsers() et deleteUser() - Maintenant dans useSupabaseUsersCRUD()
  // Utiliser le hook useSupabaseUsersCRUD() pour toutes les opérations CRUD sur les utilisateurs
  // - addUser(userData) pour créer
  // - updateUser(userId, updates) pour modifier
  // - deleteUser(userId) pour supprimer (avec réassignation automatique des prospects)

  const addAppointment = (newAppointment) => {
    setAppointments(prev => {
      const updated = [...prev, { ...newAppointment, status: 'pending' }];
      localStorage.setItem('evatime_appointments', JSON.stringify(updated));
      return updated;
    });
  };

  const updateAppointment = (updatedAppointment) => {
    setAppointments(prev => {
      const updated = prev.map(app => app.id === updatedAppointment.id ? updatedAppointment : app);
      localStorage.setItem('evatime_appointments', JSON.stringify(updated));
      return updated;
    });
  };

  const deleteAppointment = (appointmentId) => {
    setAppointments(prev => {
      const updated = prev.filter(app => app.id !== appointmentId);
      localStorage.setItem('evatime_appointments', JSON.stringify(updated));
      return updated;
    });
  };

  const addCall = (newCall) => {
    setCalls(prev => {
      const updated = [...prev, { ...newCall, status: 'pending' }];
      localStorage.setItem('evatime_calls', JSON.stringify(updated));
      return updated;
    });
  };

  const updateCall = (updatedCall) => {
    setCalls(prev => {
      const updated = prev.map(call => call.id === updatedCall.id ? updatedCall : call);
      localStorage.setItem('evatime_calls', JSON.stringify(updated));
      return updated;
    });
  };

  const deleteCall = (callId) => {
    setCalls(prev => {
      const updated = prev.filter(call => call.id !== callId);
      localStorage.setItem('evatime_calls', JSON.stringify(updated));
      return updated;
    });
  };

  const addTask = (newTask) => {
    setTasks(prev => {
      const updated = [...prev, { ...newTask, done: false }];
      localStorage.setItem('evatime_tasks', JSON.stringify(updated));
      return updated;
    });
  };

  const updateTask = (updatedTask) => {
    setTasks(prev => {
      const updated = prev.map(task => task.id === updatedTask.id ? updatedTask : task);
      localStorage.setItem('evatime_tasks', JSON.stringify(updated));
      return updated;
    });
  };

  const deleteTask = (taskId) => {
    setTasks(prev => {
      const updated = prev.filter(task => task.id !== taskId);
      localStorage.setItem('evatime_tasks', JSON.stringify(updated));
      return updated;
    });
  };
  
  const updateProjectSteps = (prospectId, projectType, newSteps) => {
    const key = `prospect_${prospectId}_project_${projectType}`;
    setProjectStepsStatus(prev => {
        const updated = { ...prev, [key]: newSteps };
        localStorage.setItem('evatime_project_steps_status', JSON.stringify(updated));
        return updated;
    });
  };
  
   const getProjectSteps = (prospectId, projectType) => {
    const key = `prospect_${prospectId}_project_${projectType}`;
    const specificSteps = projectStepsStatus[key];
    const defaultSteps = projectsData[projectType]?.steps;

    if (specificSteps) {
      return specificSteps;
    }
    if (defaultSteps) {
      const initializedSteps = JSON.parse(JSON.stringify(defaultSteps));
      const keyExists = Object.keys(projectStepsStatus).includes(key);

      if(!keyExists) {
        if (initializedSteps.length > 0) {
          initializedSteps[0].status = 'in_progress';
        }
      }
      
      updateProjectSteps(prospectId, projectType, initializedSteps);
      return initializedSteps;
    }
    return [];
  };

  const completeStepAndProceed = (prospectId, projectType, currentStepIndex) => {
    const steps = getProjectSteps(prospectId, projectType);
    if (currentStepIndex < 0 || currentStepIndex >= steps.length) return;

    const newSteps = JSON.parse(JSON.stringify(steps));
    
    newSteps[currentStepIndex].status = 'completed';
    if (currentStepIndex + 1 < newSteps.length) {
      newSteps[currentStepIndex + 1].status = 'in_progress';
    }
    
    updateProjectSteps(prospectId, projectType, newSteps);
  };

  const addProject = (projectType) => {
    if (userProjects.includes(projectType)) {
      return false;
    }
    const updatedProjects = [...userProjects, projectType];
    setUserProjects(updatedProjects);
    localStorage.setItem('userProjects', JSON.stringify(updatedProjects));

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
        localStorage.setItem('evatime_prospects', JSON.stringify(updatedProspects));
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
      localStorage.setItem('evatime_prospects', JSON.stringify(updatedProspects));
      return updatedProspects;
    });
  };

  const updateProspect = (updatedProspect) => {
    setProspects(prevProspects => {
      const updatedProspects = prevProspects.map(p => p.id === updatedProspect.id ? updatedProspect : p);
      localStorage.setItem('evatime_prospects', JSON.stringify(updatedProspects));
      return updatedProspects;
    });

    if (currentUser && currentUser.id === updatedProspect.id) {
      setCurrentUser(updatedProspect);
      localStorage.setItem('currentUser', JSON.stringify(updatedProspect));
      
      // Synchroniser userProjects avec les tags du prospect
      if (updatedProspect.tags) {
        setUserProjects(updatedProspect.tags);
        localStorage.setItem('userProjects', JSON.stringify(updatedProspect.tags));
      }
    }
  };

  const handleSetCurrentUser = (user, affiliateName) => {
    const userWithAffiliate = user ? { ...user, affiliateName } : null;
    setCurrentUser(userWithAffiliate);
    if (userWithAffiliate) {
      localStorage.setItem('currentUser', JSON.stringify(userWithAffiliate));
      
      // Synchroniser userProjects avec les tags du prospect/user
      if (userWithAffiliate.tags && Array.isArray(userWithAffiliate.tags)) {
        setUserProjects(userWithAffiliate.tags);
        localStorage.setItem('userProjects', JSON.stringify(userWithAffiliate.tags));
      }
    } else {
      localStorage.removeItem('currentUser');
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
    prospects, setProspects, addProspect, updateProspect, 
    currentUser, setCurrentUser: handleSetCurrentUser, 
    appointments, addAppointment, updateAppointment, deleteAppointment, getSharedAppointments,
    getProjectSteps, updateProjectSteps, completeStepAndProceed,
    calls, addCall, updateCall, deleteCall,
    tasks, addTask, updateTask, deleteTask,
    // ❌ SUPPRIMÉ: users, updateUsers, deleteUser, getAdminById - Utiliser useSupabaseUsers() ou useSupabaseUsersCRUD()
    chatMessages, addChatMessage, getChatMessages,
    notifications, markNotificationAsRead,
    clientNotifications, markClientNotificationAsRead,
    forms, setForms: handleSetForms,
    prompts, setPrompts: handleSetPrompts,
    formContactConfig, setFormContactConfig: handleSetFormContactConfig,
    projectInfos, getProjectInfo, updateProjectInfo,
    globalPipelineSteps, setGlobalPipelineSteps: handleSetGlobalPipelineSteps,
    activeAdminUser, switchActiveAdminUser,
    clientFormPanels, registerClientForm, updateClientFormPanel, clearClientFormsFor,
    companyLogo, setCompanyLogo,
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
        <Route path="/inscription" element={<RegistrationPage />} />
        <Route path="/inscription/:slugUser" element={<RegistrationPage />} />
        <Route path="/producteurs" element={<ProducerLandingPage />} />
        <Route path="/test-supabase" element={<TestSupabasePage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
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
