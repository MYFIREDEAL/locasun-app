import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MessageSquare, Mail, Bot, Plus, SlidersHorizontal, ChevronDown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { toast } from '@/components/ui/use-toast';
import ProspectDetailsAdmin from '@/components/admin/ProspectDetailsAdmin';
import AddProspectModal from '@/components/admin/AddProspectModal';
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

const Contacts = () => {
  const { prospects, addProspect, updateProspect, users, activeAdminUser } = useAppContext();
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [selectedProspect, setSelectedProspect] = useState(null);
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOwnerId, setSelectedOwnerId] = useState(activeAdminUser?.id || 'user-1');
  const [selectedTag, setSelectedTag] = useState(null);
  const [userPopoverOpen, setUserPopoverOpen] = useState(false);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, prospects]);

  const filteredProspects = useMemo(() => {
    const visibleProspects = prospects.filter(prospect => {
        if (!activeAdminUser) return false;
        if (activeAdminUser.role === 'Global Admin' || activeAdminUser.role === 'Admin') return true;
        const allowedIds = [activeAdminUser.id, ...(activeAdminUser.accessRights?.users || [])];
        return allowedIds.includes(prospect.ownerId);
    });

    return visibleProspects.filter(prospect => {
      const searchMatch = prospect.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          prospect.email.toLowerCase().includes(searchQuery.toLowerCase());
      const ownerMatch = selectedOwnerId === 'all' || prospect.ownerId === selectedOwnerId;
      const tagMatch = !selectedTag || prospect.tags.includes(selectedTag);
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
    updateProspect(updatedData);
    setSelectedProspect(updatedData);
  };

  const handleAddProspect = (newProspectData) => {
    addProspect({ ...newProspectData, status: 'Intéressé', ownerId: activeAdminUser?.id || 'user-1' });
  };

  const handleBackFromDetails = () => {
    setSelectedProspect(null);
    navigate('/admin/contacts', { replace: true });
  };

  if (selectedProspect) {
    return <ProspectDetailsAdmin prospect={selectedProspect} onBack={handleBackFromDetails} onUpdate={handleUpdateProspect} />;
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="flex items-center space-x-2 bg-white">
              <span>{selectedTag || 'Tags'}</span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuCheckboxItem checked={!selectedTag} onSelect={() => setSelectedTag(null)}>
              Tous
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
            {allTags.map(tag => (
              <DropdownMenuCheckboxItem key={tag} checked={selectedTag === tag} onSelect={() => setSelectedTag(tag)}>
                {tag}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Popover open={userPopoverOpen} onOpenChange={setUserPopoverOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="flex items-center space-x-2 bg-white w-[150px] justify-between">
              <span className="truncate">{selectedOwnerId === 'all' ? 'Tous' : users[selectedOwnerId]?.name || 'Utilisateur'}</span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0">
            <Command>
              <CommandInput placeholder="Rechercher un utilisateur..." />
              <CommandList>
                <CommandEmpty>Aucun utilisateur trouvé.</CommandEmpty>
                <CommandGroup>
                  {userOptions.map((user) => (
                    <CommandItem
                      key={user.value || 'all-users'}
                      value={user.label}
                      onSelect={() => {
                        setSelectedOwnerId(user.value);
                        setUserPopoverOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedOwnerId === user.value ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {user.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
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
                  {contact.tags.map(tag => (
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
      <AddProspectModal open={isAddModalOpen} onOpenChange={setAddModalOpen} onAddProspect={handleAddProspect} />
    </motion.div>
  );
};

export default Contacts;
