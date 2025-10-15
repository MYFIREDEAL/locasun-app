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

const SafeContacts = () => {
  // Gestion d'erreur pour le contexte
  let contextData;
  try {
    contextData = useAppContext();
  } catch (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Contacts - Erreur</h1>
        <p className="text-red-600">Erreur contexte: {error.message}</p>
        <Button onClick={() => window.location.reload()} className="mt-4">
          Recharger la page
        </Button>
      </div>
    );
  }

  if (!contextData) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Contacts - Chargement</h1>
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <p>Chargement des contacts...</p>
        </div>
      </div>
    );
  }

  const { prospects = [], addProspect, updateProspect, users = {}, activeAdminUser } = contextData;
  
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

  const filteredProspects = useMemo(() => {
    return prospects.filter(prospect => {
      // Filtre par utilisateur autorisé
      if (!activeAdminUser) return false;
      if (activeAdminUser.role !== 'Global Admin' && activeAdminUser.role !== 'Admin') {
        const allowedIds = [activeAdminUser.id, ...(activeAdminUser.accessRights?.users || [])];
        if (!allowedIds.includes(prospect.ownerId)) return false;
      }

      // Filtre par recherche
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const fullName = `${prospect.firstName} ${prospect.lastName}`.toLowerCase();
        if (!fullName.includes(query) && 
            !prospect.email?.toLowerCase().includes(query) && 
            !prospect.phone?.includes(query)) {
          return false;
        }
      }

      // Filtre par propriétaire
      if (selectedOwnerId !== 'all' && prospect.ownerId !== selectedOwnerId) {
        return false;
      }

      // Filtre par tag
      if (selectedTag && !prospect.tags?.includes(selectedTag)) {
        return false;
      }

      return true;
    });
  }, [prospects, searchQuery, selectedOwnerId, selectedTag, activeAdminUser]);

  const handleProspectClick = (prospect) => {
    setSelectedProspect(prospect);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('prospectId', prospect.id);
    setSearchParams(newParams);
  };

  const handleBack = () => {
    setSelectedProspect(null);
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('prospectId');
    setSearchParams(newParams);
  };

  const handleAddProspect = (newProspect) => {
    try {
      if (addProspect) {
        addProspect({
          ...newProspect,
          ownerId: activeAdminUser?.id || 'user-1',
          createdAt: new Date().toISOString()
        });
        toast({
          title: "Contact ajouté",
          description: "Le nouveau contact a été créé avec succès.",
        });
      }
      setAddModalOpen(false);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter le contact.",
        variant: "destructive"
      });
    }
  };

  const handleUpdateProspect = (updatedProspect) => {
    try {
      if (updateProspect) {
        updateProspect(updatedProspect);
        setSelectedProspect(updatedProspect);
        toast({
          title: "Contact mis à jour",
          description: "Les informations ont été sauvegardées.",
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le contact.",
        variant: "destructive"
      });
    }
  };

  // Vue détail d'un prospect
  if (selectedProspect) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="h-full"
      >
        <ProspectDetailsAdmin 
          prospect={selectedProspect} 
          onBack={handleBack}
          onUpdate={handleUpdateProspect}
        />
      </motion.div>
    );
  }

  // Vue principale des contacts
  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>{filteredProspects.length} contact{filteredProspects.length > 1 ? 's' : ''}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Rechercher un contact..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
            
            <Button onClick={() => setAddModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nouveau Contact
            </Button>
          </div>
        </div>

        {/* Filtres */}
        <div className="flex items-center gap-4 mt-4">
          <Popover open={userPopoverOpen} onOpenChange={setUserPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-between">
                {selectedOwnerId === 'all' ? 'Tous les utilisateurs' : 
                 allowedUsers.find(u => u.id === selectedOwnerId)?.name || 'Utilisateur'}
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0">
              <Command>
                <CommandInput placeholder="Rechercher un utilisateur..." />
                <CommandEmpty>Aucun utilisateur trouvé.</CommandEmpty>
                <CommandList>
                  <CommandGroup>
                    <CommandItem onSelect={() => {
                      setSelectedOwnerId('all');
                      setUserPopoverOpen(false);
                    }}>
                      <Check className={cn("mr-2 h-4 w-4", selectedOwnerId === 'all' ? "opacity-100" : "opacity-0")} />
                      Tous les utilisateurs
                    </CommandItem>
                    {allowedUsers.map((user) => (
                      <CommandItem key={user.id} onSelect={() => {
                        setSelectedOwnerId(user.id);
                        setUserPopoverOpen(false);
                      }}>
                        <Check className={cn("mr-2 h-4 w-4", selectedOwnerId === user.id ? "opacity-100" : "opacity-0")} />
                        {user.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                {selectedTag || 'Tous les tags'}
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuCheckboxItem
                checked={!selectedTag}
                onCheckedChange={(checked) => { console.log('SafeContacts: Tous clicked, checked=', checked); if (checked) setSelectedTag(null); }}
              >
                Tous les tags
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              {allTags.map((tag) => (
                <DropdownMenuCheckboxItem
                  key={tag}
                  checked={selectedTag === tag}
                  onCheckedChange={(checked) => { console.log('SafeContacts: tag=', tag, 'checked=', checked); if (checked) setSelectedTag(tag); else setSelectedTag(null); }}
                >
                  {tag}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Liste des contacts */}
      <div className="flex-1 p-6">
        {filteredProspects.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500">Aucun contact trouvé</p>
            <p className="text-gray-400 text-sm mt-1">Essayez de modifier vos filtres</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProspects.map((prospect) => (
              <motion.div
                key={prospect.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md cursor-pointer"
                onClick={() => handleProspectClick(prospect)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{prospect.firstName} {prospect.lastName}</h3>
                    <p className="text-sm text-gray-600">{prospect.email}</p>
                    <p className="text-sm text-gray-500">{prospect.phone}</p>
                  </div>
                </div>
                
                {prospect.tags && prospect.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {prospect.tags.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className={`px-2 py-1 rounded-full text-xs font-medium ${tagColors[tag] || 'bg-gray-100 text-gray-800'}`}
                      >
                        {tag}
                      </span>
                    ))}
                    {prospect.tags.length > 2 && (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        +{prospect.tags.length - 2}
                      </span>
                    )}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Add Contact Modal */}
      <AddProspectModal
        open={isAddModalOpen}
        onOpenChange={setAddModalOpen}
        onAddProspect={handleAddProspect}
      />

      {/* Debug Info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-gray-100 p-4 text-xs text-gray-600 border-t">
          <strong>Debug:</strong> {prospects.length} prospects totaux | 
          {filteredProspects.length} filtrés | 
          Utilisateur: {activeAdminUser?.name || 'N/A'}
        </div>
      )}
    </div>
  );
};

export default SafeContacts;