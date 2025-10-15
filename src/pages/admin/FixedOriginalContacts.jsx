import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MessageSquare, Mail, Bot, Plus, SlidersHorizontal, ChevronDown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/components/ui/use-toast';
import { useAppContext } from '@/App';
import { cn } from '@/lib/utils';

const tagColors = {
  'ACC': 'bg-blue-100 text-blue-800',
  'Autonomie': 'bg-green-100 text-green-800',
  'Centrale': 'bg-orange-100 text-orange-800',
  'Investissement': 'bg-teal-100 text-teal-800',
  'ProducteurPro': 'bg-purple-100 text-purple-800',
};

const allTags = ['ACC', 'Autonomie', 'Centrale', 'Investissement', 'ProducteurPro'];

// Composant DropdownMenu simplifié qui fonctionne
const SimpleDropdownMenu = ({ children, trigger, onSelect }) => {
  const [open, setOpen] = useState(false);
  
  return (
    <div className="relative">
      <div onClick={() => setOpen(!open)}>
        {trigger}
      </div>
      {open && (
        <div className="absolute z-50 mt-1 bg-white border border-gray-200 rounded-md shadow-lg min-w-[120px]">
          <div className="py-1">
            {React.Children.map(children, (child, index) => (
              <div
                key={index}
                className="px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  if (child.props.onSelect) child.props.onSelect();
                  setOpen(false);
                }}
              >
                {child.props.children}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Composant Popover simplifié
const SimplePopover = ({ children, trigger, open, onOpenChange }) => {
  return (
    <div className="relative">
      <div onClick={() => onOpenChange(!open)}>
        {trigger}
      </div>
      {open && (
        <div className="absolute z-50 mt-1 bg-white border border-gray-200 rounded-md shadow-lg min-w-[200px]">
          {children}
        </div>
      )}
    </div>
  );
};

// Composant Command simplifié
const SimpleCommand = ({ children }) => {
  return <div className="p-2">{children}</div>;
};

const SimpleCommandInput = ({ placeholder, value, onChange }) => {
  return (
    <Input
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className="mb-2"
    />
  );
};

const SimpleCommandItem = ({ children, onSelect, selected }) => {
  return (
    <div
      className={`px-2 py-1 text-sm hover:bg-gray-100 cursor-pointer flex items-center ${selected ? 'bg-blue-50' : ''}`}
      onClick={onSelect}
    >
      {children}
    </div>
  );
};

// Modal de détails simplifié
const SimpleProspectDetails = ({ prospect, onBack, onUpdate }) => {
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

// Modal d'ajout simplifié
const SimpleAddModal = ({ open, onOpenChange, onAddProspect }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.name && formData.email) {
      onAddProspect(formData);
      setFormData({ name: '', email: '', phone: '' });
      onOpenChange(false);
      toast({
        title: "Contact ajouté",
        description: "Le nouveau contact a été ajouté avec succès.",
      });
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h2 className="text-xl font-bold mb-4">Ajouter un contact</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
            <Input
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" className="bg-green-600 hover:bg-green-700">
              Ajouter
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

const FixedOriginalContacts = () => {
  const context = useAppContext();
  const { prospects = [], addProspect, updateProspect, users = {}, activeAdminUser } = context || {};
  
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [selectedProspect, setSelectedProspect] = useState(null);
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOwnerId, setSelectedOwnerId] = useState(activeAdminUser?.id || 'user-1');
  const [selectedTag, setSelectedTag] = useState(null);
  const [userPopoverOpen, setUserPopoverOpen] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const allowedUsers = useMemo(() => {
    if (!activeAdminUser) return [];
    if (activeAdminUser.role === 'Global Admin' || activeAdminUser.role === 'Admin') {
      return Object.values(users);
    }
    const allowedIds = [activeAdminUser.id, ...(activeAdminUser.accessRights?.users || [])];
    return Object.values(users).filter(u => allowedIds.includes(u.id));
  }, [activeAdminUser, users]);

  const userOptions = useMemo(() => [
    { value: 'all', label: 'Tous les utilisateurs' },
    ...allowedUsers.map(user => ({ value: user.id, label: user.name }))
  ], [allowedUsers]);

  const filteredUserOptions = useMemo(() => {
    if (!userSearchQuery) return userOptions;
    return userOptions.filter(user => 
      user.label.toLowerCase().includes(userSearchQuery.toLowerCase())
    );
  }, [userOptions, userSearchQuery]);

  useEffect(() => {
    if (activeAdminUser) {
      if (!allowedUsers.some(u => u.id === selectedOwnerId) && selectedOwnerId !== 'all') {
        setSelectedOwnerId(activeAdminUser.id);
      }
    }
  }, [activeAdminUser, selectedOwnerId, allowedUsers]);

  useEffect(() => {
    const prospectId = searchParams.get('prospectId');
    if (prospectId && prospects.length > 0) {
      const prospect = prospects.find(p => p.id === prospectId);
      if (prospect) {
        setSelectedProspect(prospect);
      } else {
        handleBackFromDetails();
      }
    } else {
      setSelectedProspect(null);
    }
  }, [searchParams, prospects]);

  const filteredProspects = useMemo(() => {
    const visibleProspects = prospects.filter(prospect => {
      if (!activeAdminUser) return false;
      if (activeAdminUser.role === 'Global Admin' || activeAdminUser.role === 'Admin') return true;
      const allowedIds = [activeAdminUser.id, ...(activeAdminUser.accessRights?.users || [])];
      return allowedIds.includes(prospect.ownerId);
    });

    return visibleProspects.filter(prospect => {
      const searchMatch = prospect.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          prospect.email?.toLowerCase().includes(searchQuery.toLowerCase());
      const ownerMatch = selectedOwnerId === 'all' || prospect.ownerId === selectedOwnerId;
      const tagMatch = !selectedTag || (prospect.tags && prospect.tags.includes(selectedTag));
      return searchMatch && ownerMatch && tagMatch;
    });
  }, [prospects, searchQuery, selectedOwnerId, selectedTag, activeAdminUser]);

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
  
  const handleRowClick = (contact) => {
    setSelectedProspect(contact);
    navigate(`/admin/contacts?prospectId=${contact.id}`);
  };

  const handleUpdateProspect = (updatedData) => {
    if (updateProspect) {
      updateProspect(updatedData);
      setSelectedProspect(updatedData);
    }
  };

  const handleAddProspect = (newProspectData) => {
    if (addProspect) {
      addProspect({ 
        ...newProspectData, 
        status: 'Intéressé', 
        ownerId: activeAdminUser?.id || 'user-1',
        tags: [],
        id: `prospect-${Date.now()}`
      });
    }
  };

  const handleBackFromDetails = () => {
    setSelectedProspect(null);
    navigate('/admin/contacts', { replace: true });
  };

  // Affichage du détail du prospect
  if (selectedProspect) {
    return <SimpleProspectDetails 
      prospect={selectedProspect} 
      onBack={handleBackFromDetails} 
      onUpdate={handleUpdateProspect} 
    />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <h1 className="text-3xl font-bold text-gray-900">Contacts</h1>
        <div className="flex items-center space-x-2">
          <div className="relative w-full md:w-64">
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

      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
        <Button variant="outline" className="flex items-center space-x-2 bg-white">
          <SlidersHorizontal className="h-4 w-4" />
          <span>Filtres</span>
        </Button>
        
        <SimpleDropdownMenu
          trigger={
            <Button variant="outline" className="flex items-center space-x-2 bg-white">
              <span>{selectedTag || 'Tags'}</span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          }
        >
          <div onSelect={() => setSelectedTag(null)}>Tous</div>
          {allTags.map(tag => (
            <div key={tag} onSelect={() => setSelectedTag(tag)}>{tag}</div>
          ))}
        </SimpleDropdownMenu>

        <SimplePopover 
          open={userPopoverOpen} 
          onOpenChange={setUserPopoverOpen}
          trigger={
            <Button variant="outline" className="flex items-center space-x-2 bg-white w-[150px] justify-between">
              <span className="truncate">{selectedOwnerId === 'all' ? 'Tous' : users[selectedOwnerId]?.name || 'Utilisateur'}</span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          }
        >
          <SimpleCommand>
            <SimpleCommandInput 
              placeholder="Rechercher un utilisateur..." 
              value={userSearchQuery}
              onChange={(e) => setUserSearchQuery(e.target.value)}
            />
            {filteredUserOptions.map((user) => (
              <SimpleCommandItem
                key={user.value || 'all-users'}
                selected={selectedOwnerId === user.value}
                onSelect={() => {
                  setSelectedOwnerId(user.value);
                  setUserPopoverOpen(false);
                  setUserSearchQuery('');
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    selectedOwnerId === user.value ? "opacity-100" : "opacity-0"
                  )}
                />
                {user.label}
              </SimpleCommandItem>
            ))}
          </SimpleCommand>
        </SimplePopover>
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
      
      <SimpleAddModal 
        open={isAddModalOpen} 
        onOpenChange={setAddModalOpen} 
        onAddProspect={handleAddProspect} 
      />
    </motion.div>
  );
};

export default FixedOriginalContacts;