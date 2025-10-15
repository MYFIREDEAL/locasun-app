import React, { useState, useMemo } from 'react';
import { Search, Plus, Users, Mail, Phone, Tag, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAppContext } from '@/App';

const tagColors = {
  'ACC': 'bg-blue-100 text-blue-800',
  'Autonomie': 'bg-green-100 text-green-800',
  'Centrale': 'bg-orange-100 text-orange-800',
  'Investissement': 'bg-teal-100 text-teal-800',
  'ProducteurPro': 'bg-purple-100 text-purple-800',
};

const allTags = ['ACC', 'Autonomie', 'Centrale', 'Investissement', 'ProducteurPro'];

const EnhancedContacts = () => {
  const { prospects = [], users = {}, activeAdminUser } = useAppContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState(null);
  const [selectedOwnerId, setSelectedOwnerId] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [selectedProspect, setSelectedProspect] = useState(null);

  const allowedUsers = useMemo(() => {
    if (!activeAdminUser) return [];
    if (activeAdminUser.role === 'Global Admin' || activeAdminUser.role === 'Admin') {
      return Object.values(users);
    }
    const allowedIds = [activeAdminUser.id, ...(activeAdminUser.accessRights?.users || [])];
    return Object.values(users).filter(u => allowedIds.includes(u.id));
  }, [activeAdminUser, users]);

  const filteredProspects = useMemo(() => {
    const visibleProspects = prospects.filter(prospect => {
      if (!activeAdminUser) return false;
      if (activeAdminUser.role === 'Global Admin' || activeAdminUser.role === 'Admin') return true;
      const allowedIds = [activeAdminUser.id, ...(activeAdminUser.accessRights?.users || [])];
      return allowedIds.includes(prospect.ownerId);
    });

    return visibleProspects.filter(prospect => {
      const query = searchQuery.toLowerCase();
      const searchMatch = prospect.name?.toLowerCase().includes(query) ||
                         prospect.email?.toLowerCase().includes(query) ||
                         prospect.phone?.includes(query);
      
      const ownerMatch = selectedOwnerId === 'all' || prospect.ownerId === selectedOwnerId;
      const tagMatch = !selectedTag || (prospect.tags && prospect.tags.includes(selectedTag));
      
      return searchMatch && ownerMatch && tagMatch;
    });
  }, [prospects, searchQuery, selectedOwnerId, selectedTag, activeAdminUser]);

  const getOwnerName = (ownerId) => {
    const owner = users[ownerId];
    return owner ? owner.name : 'Inconnu';
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header avec filtres */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Users className="w-4 h-4" />
              <span>{filteredProspects.length} contact{filteredProspects.length > 1 ? 's' : ''}</span>
            </div>
          </div>
          
          <Button onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Ajouter un contact
          </Button>
        </div>

        {/* Filtres */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Rechercher un contact..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filtre par utilisateur */}
          <div className="relative">
            <select 
              value={selectedOwnerId}
              onChange={(e) => setSelectedOwnerId(e.target.value)}
              className="appearance-none bg-white border border-gray-300 rounded-md px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tous les utilisateurs</option>
              {allowedUsers.map(user => (
                <option key={user.id} value={user.id}>{user.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          {/* Filtre par tag */}
          <div className="relative">
            <select 
              value={selectedTag || ''}
              onChange={(e) => setSelectedTag(e.target.value || null)}
              className="appearance-none bg-white border border-gray-300 rounded-md px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tous les tags</option>
              {allTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Liste des contacts */}
      <div className="flex-1 overflow-auto p-6">
        {filteredProspects.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun contact trouvé</h3>
            <p className="text-gray-500">
              {searchQuery ? 
                "Aucun contact ne correspond à votre recherche." : 
                "Vous n'avez pas encore de contacts."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProspects.map((prospect) => (
              <div
                key={prospect.id}
                className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedProspect(prospect)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 line-clamp-1">
                      {prospect.name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {getOwnerName(prospect.ownerId)}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 mb-3">
                  {prospect.email && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="w-4 h-4" />
                      <span className="line-clamp-1">{prospect.email}</span>
                    </div>
                  )}
                  {prospect.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="w-4 h-4" />
                      <span>{prospect.phone}</span>
                    </div>
                  )}
                </div>

                {/* Tags */}
                {prospect.tags && prospect.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {prospect.tags.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          tagColors[tag] || 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {tag}
                      </span>
                    ))}
                    {prospect.tags.length > 2 && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        +{prospect.tags.length - 2}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de détails simplifié */}
      {selectedProspect && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Détails du contact</h2>
                <Button 
                  variant="outline" 
                  onClick={() => setSelectedProspect(null)}
                >
                  Fermer
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Nom</label>
                  <p className="text-gray-900">{selectedProspect.name}</p>
                </div>

                {selectedProspect.email && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Email</label>
                    <p className="text-gray-900">{selectedProspect.email}</p>
                  </div>
                )}

                {selectedProspect.phone && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Téléphone</label>
                    <p className="text-gray-900">{selectedProspect.phone}</p>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-gray-700">Propriétaire</label>
                  <p className="text-gray-900">{getOwnerName(selectedProspect.ownerId)}</p>
                </div>

                {selectedProspect.tags && selectedProspect.tags.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Tags</label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {selectedProspect.tags.map((tag) => (
                        <span
                          key={tag}
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            tagColors[tag] || 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal d'ajout simplifié */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">Ajouter un contact</h2>
              <p className="text-gray-600">
                Fonctionnalité d'ajout de contact à venir...
              </p>
              <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" onClick={() => setShowModal(false)}>
                  Annuler
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedContacts;