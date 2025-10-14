import React, { useState, useEffect, useMemo } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Toaster } from '@/components/ui/toaster';
import AdminLayout from '@/layouts/AdminLayout';
import ClientLayout from '@/layouts/ClientLayout';
import Pipeline from '@/pages/admin/Pipeline';
import Agenda from '@/pages/admin/Agenda';
import Contacts from '@/pages/admin/Contacts';
import CharlyPage from '@/pages/admin/CharlyPage';
import ProfilePage from '@/pages/admin/ProfilePage';
import ClientDashboardPage from '@/pages/client/ClientDashboardPage';
import DocumentsPage from '@/pages/client/DocumentsPage';
import SettingsPage from '@/pages/client/SettingsPage';
import OffersPage from '@/pages/client/OffersPage';
import HomePage from '@/pages/HomePage';
import RegistrationPage from '@/pages/RegistrationPage';
import ProducerLandingPage from '@/pages/ProducerLandingPage';
import { allProjectsData } from '@/data/projects';
import { toast } from '@/components/ui/use-toast';
import { slugify } from '@/lib/utils';
import { formContactConfig as defaultFormContactConfig } from '@/config/formContactConfig';

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
  const [users, setUsers] = useState({});
  const [chatMessages, setChatMessages] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [forms, setForms] = useState({});
  const [prompts, setPrompts] = useState({});
  const [formContactConfig, setFormContactConfig] = useState([]);
  const [activeAdminUser, setActiveAdminUser] = useState(null);

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
      setProspects(JSON.parse(storedProspects));
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
          status: 'lead'
        },
        {
          id: 'prospect-2',
          name: 'Marie Martin',
          email: 'marie.martin@example.com',
          phone: '09 87 65 43 21',
          company: 'Martin & Co',
          address: '456 Avenue des Champs, 69000 Lyon',
          ownerId: 'user-1',
          status: 'qualified'
        },
        {
          id: 'prospect-3',
          name: 'Pierre Durand',
          email: 'pierre.durand@example.com',
          phone: '04 56 78 90 12',
          company: 'Durand Industries',
          address: '789 Boulevard du Commerce, 13000 Marseille',
          ownerId: 'user-1',
          status: 'opportunity'
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

    const storedUsers = localStorage.getItem('evatime_users');
    let initialUsersObject;
    if (storedUsers) {
      initialUsersObject = JSON.parse(storedUsers);
      setUsers(initialUsersObject);
    } else {
      const initialUsers = [
        { id: 'user-1', name: 'Jack Luc', email: 'jack.luc@icloud.com', role: 'Global Admin', manager: '', accessRights: { modules: ['Pipeline', 'Agenda', 'Contacts'], users: [] } },
        { id: 'user-2', name: 'Charly', email: 'charly.rosca.ai@gmail.com', role: 'Manager', manager: '', accessRights: { modules: ['Pipeline', 'Agenda', 'Contacts'], users: [] } },
        { id: 'user-3', name: 'Lucas', email: 'luca23@yopmail.com', role: 'Commercial', manager: 'Charly', accessRights: { modules: ['Pipeline', 'Agenda', 'Contacts'], users: [] } },
        { id: 'user-4', name: 'Joe', email: 'lucjeanjacques@gmail.com', role: 'Commercial', manager: 'Charly', accessRights: { modules: ['Pipeline', 'Agenda', 'Contacts'], users: [] } },
        { id: 'user-5', name: 'Marie', email: 'marie@example.com', role: 'Commercial', manager: 'Charly', accessRights: { modules: ['Pipeline', 'Agenda', 'Contacts'], users: [] } },
        { id: 'user-6', name: 'Pierre', email: 'pierre@example.com', role: 'Manager', manager: '', accessRights: { modules: ['Pipeline', 'Agenda', 'Contacts'], users: [] } },
      ];
      initialUsersObject = initialUsers.reduce((acc, user) => {
        acc[user.id] = user;
        return acc;
      }, {});
      setUsers(initialUsersObject);
      localStorage.setItem('evatime_users', JSON.stringify(initialUsersObject));
    }

    const storedActiveAdminUser = localStorage.getItem('activeAdminUser');
    if (storedActiveAdminUser) {
        setActiveAdminUser(JSON.parse(storedActiveAdminUser));
    } else if (initialUsersObject && initialUsersObject['user-1']) {
        const defaultAdmin = initialUsersObject['user-1'];
        setActiveAdminUser(defaultAdmin);
        localStorage.setItem('activeAdminUser', JSON.stringify(defaultAdmin));
    }
    
    const storedChatMessages = localStorage.getItem('evatime_chat_messages');
    setChatMessages(storedChatMessages ? JSON.parse(storedChatMessages) : {});

    const storedNotifications = localStorage.getItem('evatime_notifications');
    setNotifications(storedNotifications ? JSON.parse(storedNotifications) : []);

    const storedForms = localStorage.getItem('evatime_forms');
    setForms(storedForms ? JSON.parse(storedForms) : {});

    const storedPrompts = localStorage.getItem('evatime_prompts');
    setPrompts(storedPrompts ? JSON.parse(storedPrompts) : {});

    const storedFormContactConfig = localStorage.getItem('evatime_form_contact_config');
    if (storedFormContactConfig) {
      setFormContactConfig(JSON.parse(storedFormContactConfig));
    } else {
      setFormContactConfig(defaultFormContactConfig);
      localStorage.setItem('evatime_form_contact_config', JSON.stringify(defaultFormContactConfig));
    }

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

  const handleSetFormContactConfig = (newConfig) => {
    setFormContactConfig(newConfig);
    localStorage.setItem('evatime_form_contact_config', JSON.stringify(newConfig));
  };

  const addChatMessage = (prospectId, projectType, message) => {
    const chatKey = `chat_${prospectId}_${projectType}`;
    const newMessage = { ...message, timestamp: new Date().toISOString() };

    setChatMessages(prev => {
      const newMessages = { ...prev };
      if (!newMessages[chatKey]) {
        newMessages[chatKey] = [];
      }
      newMessages[chatKey].push(newMessage);
      localStorage.setItem('evatime_chat_messages', JSON.stringify(newMessages));
      return newMessages;
    });

    if (message.file && message.sender === 'client') {
        const projectInfoKey = `prospect_${prospectId}_project_${projectType}`;
        const storedData = localStorage.getItem(projectInfoKey);
        const projectInfo = storedData ? JSON.parse(storedData) : {};
        
        if(projectType === 'ACC' && !projectInfo.ribFile) {
          projectInfo.ribFile = message.file.name;
          localStorage.setItem(projectInfoKey, JSON.stringify(projectInfo));
        }
    }

    if (message.sender === 'client') {
      const prospect = prospects.find(p => p.id === prospectId);
      if (prospect) {
        const newNotification = {
          id: Date.now(),
          prospectId,
          projectType,
          prospectName: prospect.name,
          projectName: projectsData[projectType]?.title || projectType,
          read: false,
          timestamp: new Date().toISOString(),
        };
        setNotifications(prev => {
          const updated = [newNotification, ...prev];
          localStorage.setItem('evatime_notifications', JSON.stringify(updated));
          return updated;
        });
      }
    }
  };

  const markNotificationAsRead = (notificationId) => {
    setNotifications(prev => {
      const updated = prev.map(n => n.id === notificationId ? { ...n, read: true } : n);
      localStorage.setItem('evatime_notifications', JSON.stringify(updated));
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

  const updateUsers = (newUsersObject) => {
    setUsers(newUsersObject);
    localStorage.setItem('evatime_users', JSON.stringify(newUsersObject));
  };

  const deleteUser = (userIdToDelete) => {
    const userToDelete = users[userIdToDelete];
    if (!userToDelete) return;

    let newOwnerId = 'user-1'; 
    if (userToDelete.manager) {
        const manager = Object.values(users).find(u => u.name === userToDelete.manager);
        if (manager) {
            newOwnerId = manager.id;
        }
    }

    const updatedProspects = prospects.map(prospect => {
        if (prospect.ownerId === userIdToDelete) {
            return { ...prospect, ownerId: newOwnerId };
        }
        return prospect;
    });
    setProspects(updatedProspects);
    localStorage.setItem('evatime_prospects', JSON.stringify(updatedProspects));

    const updatedUsers = { ...users };
    delete updatedUsers[userIdToDelete];
    updateUsers(updatedUsers);
  };

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

  const switchActiveAdminUser = (userId) => {
    const newActiveUser = users[userId];
    if (newActiveUser) {
        setActiveAdminUser(newActiveUser);
        localStorage.setItem('activeAdminUser', JSON.stringify(newActiveUser));
        toast({
            title: `Connecté en tant que ${newActiveUser.name}`,
            description: `Vous naviguez maintenant avec le profil de ${newActiveUser.name}.`,
            className: "bg-blue-600 text-white"
        });
    }
  };

  const getAdminById = (userId) => {
    return users[userId] || null;
  };
  
  const appState = { 
    userProjects, setUserProjects, addProject, 
    projectsData, setProjectsData: handleSetProjectsData,
    prospects, setProspects, addProspect, updateProspect, 
    currentUser, setCurrentUser: handleSetCurrentUser, 
    appointments, addAppointment, updateAppointment, deleteAppointment, getSharedAppointments,
    getProjectSteps, updateProjectSteps, completeStepAndProceed,
    calls, addCall, updateCall, deleteCall,
    tasks, addTask, updateTask, deleteTask,
    users, updateUsers, deleteUser, getAdminById,
    chatMessages, addChatMessage, getChatMessages,
    notifications, markNotificationAsRead,
    forms, setForms: handleSetForms,
    prompts, setPrompts: handleSetPrompts,
    formContactConfig, setFormContactConfig: handleSetFormContactConfig,
    activeAdminUser, switchActiveAdminUser,
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
        <Route path="/dashboard" element={<ClientLayout />}>
          <Route index element={<ClientDashboardPage />} />
          <Route path="documents" element={<DocumentsPage />} />
          <Route path="profil" element={<SettingsPage />} />
          <Route path="offres" element={<OffersPage />} />
        </Route>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Pipeline />} />
          <Route path="pipeline" element={<Pipeline />} />
          <Route path="agenda" element={<Agenda />} />
          <Route path="contacts" element={<Contacts />} />
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