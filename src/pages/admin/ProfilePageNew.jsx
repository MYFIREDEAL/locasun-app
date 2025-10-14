import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SearchableSelect from '@/components/ui/SearchableSelect';
import MultiSelectSearch from '@/components/ui/MultiSelectSearch';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { useAppContext } from '@/App';
import { Trash2, Copy, Phone, Plus, GripVertical, Building, Upload, FileText, Bot, ChevronDown, ChevronRight, Edit, Image as ImageIcon, Settings, Users, FolderOpen, FileCheck, Brain, User } from 'lucide-react';
import { slugify } from '@/lib/utils';
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Textarea } from '@/components/ui/textarea';

const ProfilePage = () => {
  const {
    users,
    updateUsers,
    deleteUser,
    projectsData,
    setProjectsData,
    forms,
    setForms,
    prompts,
    setPrompts,
    formContactConfig,
    setFormContactConfig,
    activeAdminUser
  } = useAppContext();
  
  const [activeModule, setActiveModule] = useState('profile'); // Module actif par défaut
  const [googleClientId, setGoogleClientId] = useState(() => localStorage.getItem('googleClientId') || '');

  // Configuration des modules de la sidebar
  const modules = [
    { id: 'profile', name: 'Mon profil', icon: User },
    { id: 'users', name: 'Gestion des utilisateurs', icon: Users },
    { id: 'projects', name: 'Types de projets', icon: FolderOpen },
    { id: 'forms', name: 'Formulaires', icon: FileCheck },
    { id: 'prompts', name: 'Prompts IA', icon: Brain },
    { id: 'config', name: 'Configuration', icon: Settings },
  ];

  // États existants (à copier de l'ancien fichier)
  const [userInfo, setUserInfo] = useState({
    name: activeAdminUser?.name || '',
    email: activeAdminUser?.email || '',
    phone: '',
    role: activeAdminUser?.role || ''
  });

  const handleSaveGoogleClientId = () => {
    localStorage.setItem('googleClientId', googleClientId);
    toast({
      title: "Client ID Google Agenda enregistré",
      description: "Ce code sera utilisé pour la synchronisation Google Agenda.",
      className: "bg-green-500 text-white"
    });
  };

  const handleUserInfoChange = (e) => {
    const { name, value } = e.target;
    setUserInfo(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveUserInfo = () => {
    toast({
      title: "Profil mis à jour",
      description: "Vos informations ont été sauvegardées.",
      className: "bg-green-500 text-white"
    });
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { 
        duration: 0.5,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut",
        stiffness: 100
      }
    }
  };

  const renderModuleContent = () => {
    switch (activeModule) {
      case 'profile':
        return (
          <motion.div variants={itemVariants} className="bg-white p-6 sm:p-8 rounded-2xl shadow-card">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">Informations personnelles</h2>
            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nom">Nom</Label>
                  <Input id="nom" name="name" value={userInfo.name} onChange={handleUserInfoChange} />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" value={userInfo.email} onChange={handleUserInfoChange} />
                </div>
              </div>
              <div>
                <Label htmlFor="phone">Téléphone</Label>
                <div className="relative mt-1">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input id="phone" name="phone" value={userInfo.phone} onChange={handleUserInfoChange} className="pl-10" />
                </div>
              </div>
              <div>
                <Label htmlFor="role">Rôle</Label>
                <Input id="role" name="role" value={userInfo.role} onChange={handleUserInfoChange} disabled className="bg-gray-100" />
              </div>
              <div>
                <Label htmlFor="google-client-id">Client ID Google Agenda</Label>
                <div className="flex space-x-2">
                  <Input
                    id="google-client-id"
                    type="text"
                    placeholder="Votre Client ID Google..."
                    value={googleClientId}
                    onChange={(e) => setGoogleClientId(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={handleSaveGoogleClientId} className="bg-green-600 hover:bg-green-700">
                    Enregistrer
                  </Button>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Ce Client ID sera utilisé pour synchroniser votre agenda Google avec l'application.
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button onClick={handleSaveUserInfo} className="flex-1">
                Sauvegarder les modifications
              </Button>
            </div>
          </motion.div>
        );
      
      case 'users':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800">Gestion des utilisateurs</h2>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Ajouter un utilisateur
              </Button>
            </div>
            <div className="bg-white p-6 rounded-lg border">
              <p className="text-gray-500">
                Module de gestion des utilisateurs - Ici vous pourrez inviter des utilisateurs, gérer les rôles et permissions.
              </p>
              <div className="mt-4 text-sm text-blue-600">
                💡 Les fonctionnalités complètes seront intégrées depuis l'ancien code
              </div>
            </div>
          </div>
        );

      case 'projects':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800">Types de projets</h2>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Nouveau type de projet
              </Button>
            </div>
            <div className="bg-white p-6 rounded-lg border">
              <p className="text-gray-500">
                Module de gestion des types de projets - Créez et configurez vos modèles de projets.
              </p>
              <div className="mt-4 text-sm text-blue-600">
                💡 Les fonctionnalités complètes seront intégrées depuis l'ancien code
              </div>
            </div>
          </div>
        );

      case 'forms':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800">Formulaires</h2>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Nouveau formulaire
              </Button>
            </div>
            <div className="bg-white p-6 rounded-lg border">
              <p className="text-gray-500">
                Module de gestion des formulaires - Créez des formulaires personnalisés pour vos projets.
              </p>
              <div className="mt-4 text-sm text-blue-600">
                💡 Les fonctionnalités complètes seront intégrées depuis l'ancien code
              </div>
            </div>
          </div>
        );

      case 'prompts':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800">Prompts IA</h2>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Nouveau prompt
              </Button>
            </div>
            <div className="bg-white p-6 rounded-lg border">
              <p className="text-gray-500">
                Module de gestion des prompts IA - Configurez l'intelligence artificielle pour vos projets.
              </p>
              <div className="mt-4 text-sm text-blue-600">
                💡 Les fonctionnalités complètes seront intégrées depuis l'ancien code
              </div>
            </div>
          </div>
        );

      case 'config':
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-800">Configuration générale</h2>
            <div className="bg-white p-6 rounded-lg border">
              <p className="text-gray-500">
                Module de configuration générale - Paramètres avancés, logos, intégrations.
              </p>
              <div className="mt-4 text-sm text-blue-600">
                💡 Les fonctionnalités complètes seront intégrées depuis l'ancien code
              </div>
            </div>
          </div>
        );

      default:
        return <div>Module non trouvé</div>;
    }
  };

  return (
    <motion.div 
      className="flex min-h-screen bg-gray-50" 
      variants={containerVariants} 
      initial="hidden" 
      animate="visible"
    >
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">Configuration</h1>
          <p className="text-sm text-gray-500 mt-1">Gestion de l'espace admin</p>
        </div>
        
        <nav className="p-4 space-y-2">
          {modules.map((module) => {
            const IconComponent = module.icon;
            return (
              <button
                key={module.id}
                onClick={() => setActiveModule(module.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 text-left rounded-lg transition-colors ${
                  activeModule === module.id
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <IconComponent className="h-5 w-5" />
                <span className="font-medium">{module.name}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Contenu principal */}
      <div className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          {renderModuleContent()}
        </div>
      </div>
    </motion.div>
  );
};

export default ProfilePage;