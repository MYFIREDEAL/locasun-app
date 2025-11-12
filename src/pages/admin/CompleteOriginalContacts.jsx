import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MessageSquare, Mail, Bot, Plus, ChevronDown, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/components/ui/use-toast';
import { useAppContext } from '@/App';
import SafeAddProspectModal from '@/components/admin/SafeAddProspectModal';
import SafeProspectDetailsAdmin from '@/components/admin/SafeProspectDetailsAdmin';
import { useSupabaseProspects } from '@/hooks/useSupabaseProspects';

// Import des composants originaux avec gestion d'erreur
let ProspectDetailsAdmin;
let AddProspectModal;

// Utiliser directement les composants sécurisés
ProspectDetailsAdmin = SafeProspectDetailsAdmin;
AddProspectModal = SafeAddProspectModal;

const tagColors = {
  'ACC': 'bg-blue-100 text-blue-800',
  'Autonomie': 'bg-green-100 text-green-800',
  'Centrale': 'bg-orange-100 text-orange-800',
  'Investissement': 'bg-teal-100 text-teal-800',
  'ProducteurPro': 'bg-purple-100 text-purple-800',
};

const allTags = ['ACC', 'Autonomie', 'Centrale', 'Investissement', 'ProducteurPro'];

const FallbackProspectDetails = ({ prospect, onBack, onUpdate }) => {
  const { users = {} } = useAppContext();
  
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Détails du contact</h1>
        <Button onClick={onBack} variant="outline">
          ← Retour
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow-soft p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
            <p className="text-gray-900">{prospect.name}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <p className="text-gray-900">{prospect.email}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
            <p className="text-gray-900">{prospect.phone}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Propriétaire</label>
            <p className="text-gray-900">{users[prospect.ownerId]?.name || 'Non assigné'}</p>
          </div>
        </div>

        {prospect.tags && prospect.tags.length > 0 && (
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
            <div className="flex flex-wrap gap-2">
              {prospect.tags.map(tag => (
                <span key={tag} className={`px-2 py-1 text-xs font-medium rounded-full ${tagColors[tag] || 'bg-gray-100 text-gray-800'}`}>
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

const FallbackAddModal = ({ open, onOpenChange, onAddProspect }) => {
  const { formContactConfig = [], projectsData = {}, activeAdminUser } = useAppContext();
  const [formData, setFormData] = useState({});
  const [tags, setTags] = useState([]);

  const projectOptions = Object.values(projectsData).filter(p => p.isPublic);

  useEffect(() => {
    if (open) {
      const initialData = {};
      formContactConfig.forEach(field => {
        initialData[field.id] = '';
      });
      setFormData(initialData);
      setTags([]);
    }
  }, [open, formContactConfig]);

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleTagChange = (tag) => {
    setTags(prev => {
      const newTags = prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag];
      return newTags;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email) {
      toast({
        title: "Champs requis",
        description: "Le nom et l'email sont obligatoires.",
        variant: "destructive",
      });
      return;
    }

    const newProspect = {
      id: `prospect-${Date.now()}`,
      ...formData,
      tags,
      hasAppointment: false,
      ownerId: activeAdminUser?.id || 'user-1',
    };

    onAddProspect(newProspect);
    
    toast({
      title: "✅ Prospect ajouté !",
      description: `${newProspect.name} a été ajouté à la colonne "Intéressé".`,
    });

    onOpenChange(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-auto">
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">Ajouter un nouveau prospect</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {formContactConfig.map(field => (
              <div key={field.id}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {field.name}
                </label>
                <Input
                  id={field.id}
                  type={field.type}
                  value={formData[field.id] || ''}
                  onChange={handleInputChange}
                  placeholder={field.placeholder}
                  required={field.required}
                />
              </div>
            ))}

            {projectOptions.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Projets</label>
                <div className="grid grid-cols-2 gap-2">
                  {projectOptions.map(project => (
                    <div key={project.type} className="flex items-center space-x-2">
                      <Checkbox
                        id={`tag-${project.type}`}
                        checked={tags.includes(project.type)}
                        onCheckedChange={() => handleTagChange(project.type)}
                      />
                      <label htmlFor={`tag-${project.type}`} className="text-sm">{project.title}</label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button type="submit">
                Créer le prospect
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const CompleteOriginalContacts = () => {
  const context = useAppContext();
  const { users = {}, activeAdminUser } = context || {};
  
  // Utiliser le hook Supabase pour les prospects
  const {
    prospects: supabaseProspects,
    loading: prospectsLoading,
    addProspect: addSupabaseProspect,
    updateProspect: updateSupabaseProspect,
    deleteProspect: deleteSupabaseProspect,
  } = useSupabaseProspects(activeAdminUser);
  
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [selectedProspect, setSelectedProspect] = useState(null);
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [isTagMenuOpen, setTagMenuOpen] = useState(false);
  const [isUserMenuOpen, setUserMenuOpen] = useState(false);
  const tagMenuRef = useRef(null);
  const userMenuRef = useRef(null);
  const tagFilterLabel = selectedTags.length === 0 
    ? 'Tags' 
    : selectedTags.length === 1 
      ? selectedTags[0] 
      : `${selectedTags.length} tags`;
  const navigate = useNavigate();
  const location = useLocation();

  const allowedUsers = useMemo(() => {
    if (!activeAdminUser) return [];
    if (activeAdminUser.role === 'Global Admin' || activeAdminUser.role === 'Admin') {
      return Object.values(users);
    }
    const allowedIds = [activeAdminUser.id, ...(activeAdminUser.accessRights?.users || [])];
    return Object.values(users).filter(u => allowedIds.includes(u.id));
  }, [activeAdminUser, users]);

  const userFilterLabel = useMemo(() => {
    if (!selectedUserId) {
      // Si un seul utilisateur autorisé, ne pas afficher "Tous les utilisateurs"
      return allowedUsers.length === 1 ? allowedUsers[0].name : 'Tous les utilisateurs';
    }
    return users[selectedUserId]?.name || allowedUsers.find(u => u.id === selectedUserId)?.name || 'Utilisateur inconnu';
  }, [selectedUserId, users, allowedUsers]);

  // Initialiser selectedUserId selon le nombre d'utilisateurs autorisés
  useEffect(() => {
    if (activeAdminUser && selectedUserId === null) {
      if (allowedUsers.length === 1) {
        // Un seul utilisateur : le sélectionner automatiquement
        setSelectedUserId(allowedUsers[0].id);
      } else if (allowedUsers.length > 1) {
        // Plusieurs utilisateurs : ne rien sélectionner (affichera "Tous")
        setSelectedUserId(null);
      }
    }
  }, [activeAdminUser, selectedUserId, allowedUsers]);

  const tagOptions = useMemo(() => {
    const prospectTags = new Set();
    supabaseProspects.forEach(prospect => {
      (prospect.tags || []).forEach(tag => prospectTags.add(tag));
    });
    const derivedTags = Array.from(prospectTags);
    return derivedTags.length > 0 ? derivedTags : allTags;
  }, [supabaseProspects]);

  const filteredProspects = useMemo(() => {
    const visibleProspects = supabaseProspects.filter(prospect => {
      if (!activeAdminUser) return false;
      if (activeAdminUser.role === 'Global Admin' || activeAdminUser.role === 'Admin') return true;
      const allowedIds = [activeAdminUser.id, ...(activeAdminUser.accessRights?.users || [])];
      return allowedIds.includes(prospect.ownerId);
    });

    return visibleProspects.filter(prospect => {
      const searchMatch = prospect.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          prospect.email?.toLowerCase().includes(searchQuery.toLowerCase());
      // Si au moins un tag sélectionné, le prospect doit avoir au moins un de ces tags
      const tagMatch = selectedTags.length === 0 || 
        (prospect.tags && selectedTags.some(tag => prospect.tags.includes(tag)));
      const userMatch = !selectedUserId || prospect.ownerId === selectedUserId;
      return searchMatch && tagMatch && userMatch;
    });
  }, [supabaseProspects, searchQuery, selectedTags, selectedUserId, activeAdminUser]);

  useEffect(() => {
    if (!isTagMenuOpen && !isUserMenuOpen) return;

    const handleClickOutside = (event) => {
      const clickedInsideTagMenu = tagMenuRef.current?.contains(event.target);
      const clickedInsideUserMenu = userMenuRef.current?.contains(event.target);

      if (!clickedInsideTagMenu) {
        setTagMenuOpen(false);
      }

      if (!clickedInsideUserMenu) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isTagMenuOpen, isUserMenuOpen]);

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedContacts(filteredProspects.map(c => c.id));
    } else {
      setSelectedContacts([]);
    }
  };

  const handleSelectContact = (id, checked) => {
    if (checked) {
      setSelectedContacts([...selectedContacts, id]);
    } else {
      setSelectedContacts(selectedContacts.filter(contactId => contactId !== id));
    }
  };

  const handleBulkAction = (action) => {
    toast({
      title: `🚧 L'action "${action}" n'est pas encore implémentée.`,
      description: "Ceci est une maquette cliquable. La fonctionnalité peut être demandée. 🚀",
    });
  };
  
  const handleTagToggle = (tag) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const handleUserSelect = (userId) => {
    setSelectedUserId(userId);
    setUserMenuOpen(false);
  };

  const resetFilters = () => {
    setSelectedTags([]);
    setSelectedUserId(null);
  };
  
  const handleRowClick = (contact) => {
    // Trouver le premier tag/projet du contact pour la navigation
    const projectTag = contact.tags && contact.tags.length > 0 ? contact.tags[0] : 'ACC';
    
    // Rediriger vers la pipeline avec les paramètres project et prospect
    navigate(`/admin/pipeline?project=${projectTag}&prospect=${contact.id}`);
  };

  const handleUpdateProspect = async (updatedData) => {
    try {
      await updateSupabaseProspect(updatedData);
      setSelectedProspect(updatedData);
      toast({
        title: "✅ Contact mis à jour !",
        description: "Les modifications ont été sauvegardées.",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le contact.",
        variant: "destructive"
      });
    }
  };

  const handleAddProspect = async (newProspectData) => {
    try {
      await addSupabaseProspect({ 
        ...newProspectData, 
        status: 'Intéressé', 
        ownerId: activeAdminUser?.id
      });
      setAddModalOpen(false);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter le contact.",
        variant: "destructive"
      });
    }
  };

  const handleBackFromDetails = () => {
    setSelectedProspect(null);
    navigate('/admin/contacts', { replace: true });
  };

  // Utiliser le composant original si disponible, sinon le fallback
  const AddModal = AddProspectModal || FallbackAddModal;

  // Afficher un loader pendant le chargement
  if (prospectsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="bg-white border-b border-gray-200 px-6 py-4 rounded-lg shadow-soft">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Users className="w-4 h-4" />
              <span>{filteredProspects.length} contact{filteredProspects.length > 1 ? 's' : ''}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div ref={tagMenuRef} className="relative inline-block text-left">
              <Button
                type="button"
                variant="outline"
                className="flex items-center space-x-2 bg-white"
                onClick={() => setTagMenuOpen(prev => !prev)}
              >
                <span>{tagFilterLabel}</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
              {isTagMenuOpen && (
                <div className="absolute z-50 mt-1 w-44 origin-top-right rounded-md border border-gray-200 bg-white shadow-soft">
                  <div className="py-1">
                    {tagOptions.map(tag => (
                      <label
                        key={tag}
                        className="flex items-center px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedTags.includes(tag)}
                          onChange={() => handleTagToggle(tag)}
                          className="mr-3 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span>{tag}</span>
                      </label>
                    ))}
                    {selectedTags.length > 0 && (
                      <>
                        <div className="border-t border-gray-200 my-1"></div>
                        <button
                          onClick={() => setSelectedTags([])}
                          className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-gray-100"
                        >
                          Effacer la sélection
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div ref={userMenuRef} className="relative inline-block text-left">
              <Button
                type="button"
                variant="outline"
                className="flex items-center space-x-2 bg-white"
                onClick={() => setUserMenuOpen(prev => !prev)}
                disabled={!allowedUsers.length}
              >
                <span>{userFilterLabel}</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
              {isUserMenuOpen && (
                <div className="absolute z-50 mt-1 w-52 origin-top-right rounded-md border border-gray-200 bg-white shadow-soft">
                  <div className="py-1">
                    {allowedUsers.length > 1 && (
                      <>
                        <button
                          type="button"
                          className={`block w-full px-3 py-2 text-left text-sm hover:bg-gray-100 ${!selectedUserId ? 'bg-gray-50 font-medium' : ''}`}
                          onClick={() => handleUserSelect(null)}
                        >
                          Tous les utilisateurs
                        </button>
                        <div className="border-t border-gray-100 my-1" />
                      </>
                    )}
                    {allowedUsers.map(user => (
                      <button
                        key={user.id}
                        type="button"
                        className={`block w-full px-3 py-2 text-left text-sm hover:bg-gray-100 ${selectedUserId === user.id ? 'bg-gray-50 font-medium' : ''}`}
                        onClick={() => handleUserSelect(user.id)}
                      >
                        {user.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input 
                placeholder="Rechercher..." 
                className="pl-10 bg-white" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <Button onClick={() => setAddModalOpen(true)} className="bg-green-600 hover:bg-green-700">
              <Plus className="mr-2 h-4 w-4" /> Nouveau
            </Button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selectedContacts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white p-3 rounded-lg shadow-soft flex flex-col sm:flex-row items-center justify-between"
          >
            <span className="text-sm font-medium text-gray-700 mb-2 sm:mb-0">{selectedContacts.length} contact{selectedContacts.length > 1 ? 's' : ''} sélectionné{selectedContacts.length > 1 ? 's' : ''}</span>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={() => handleBulkAction('Envoyer SMS')}>
                <MessageSquare className="h-4 w-4 sm:mr-2" /> <span className="hidden sm:inline">SMS</span>
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleBulkAction('Envoyer Email')}>
                <Mail className="h-4 w-4 sm:mr-2" /> <span className="hidden sm:inline">Email</span>
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleBulkAction('Appel par Charly')}>
                <Bot className="h-4 w-4 sm:mr-2" /> <span className="hidden sm:inline">Appel IA</span>
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-lg shadow-soft overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-500">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50">
            <tr>
              <th scope="col" className="p-4">
                <Checkbox
                  onCheckedChange={handleSelectAll}
                  checked={selectedContacts.length === filteredProspects.length && filteredProspects.length > 0}
                  aria-label="Select all contacts"
                />
              </th>
              <th scope="col" className="px-6 py-3">Nom</th>
              <th scope="col" className="px-6 py-3 hidden md:table-cell">Téléphone</th>
              <th scope="col" className="px-6 py-3 hidden lg:table-cell">Email</th>
              <th scope="col" className="px-6 py-3 hidden sm:table-cell">Tags</th>
              <th scope="col" className="px-6 py-3 hidden md:table-cell">Utilisateur</th>
            </tr>
          </thead>
          <tbody>
            {filteredProspects.map((contact) => (
              <tr key={contact.id} className="bg-white border-b hover:bg-gray-50 cursor-pointer" onClick={() => handleRowClick(contact)}>
                <td className="w-4 p-4" onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    onCheckedChange={(checked) => handleSelectContact(contact.id, checked)}
                    checked={selectedContacts.includes(contact.id)}
                    aria-labelledby={`contact-name-${contact.id}`}
                  />
                </td>
                <td id={`contact-name-${contact.id}`} className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">{contact.name}</td>
                <td className="px-6 py-4 hidden md:table-cell">{contact.phone}</td>
                <td className="px-6 py-4 hidden lg:table-cell">{contact.email}</td>
                <td className="px-6 py-4 hidden sm:table-cell">
                  <div className="flex flex-wrap gap-1">
                    {(contact.tags || []).map(tag => (
                      <span key={tag} className={`px-2 py-1 text-xs font-medium rounded-full ${tagColors[tag] || 'bg-gray-100 text-gray-800'}`}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4 hidden md:table-cell">
                  {users[contact.ownerId]?.name || 'Non assigné'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <AddModal 
        open={isAddModalOpen} 
        onOpenChange={setAddModalOpen} 
        onAddProspect={handleAddProspect} 
      />
    </motion.div>
  );
};

export default CompleteOriginalContacts;
