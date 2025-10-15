import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Plus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAppContext } from '@/App';

const WorkingContacts = () => {
  const { prospects = [], activeAdminUser } = useAppContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);

  const filteredProspects = useMemo(() => {
    if (!searchQuery) return prospects;
    
    return prospects.filter(prospect => {
      const query = searchQuery.toLowerCase();
      const fullName = `${prospect.firstName} ${prospect.lastName}`.toLowerCase();
      return fullName.includes(query) || 
             prospect.email?.toLowerCase().includes(query) ||
             prospect.phone?.includes(query);
    });
  }, [prospects, searchQuery]);

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Users className="w-4 h-4" />
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
            
            <Button onClick={() => setShowModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nouveau Contact
            </Button>
          </div>
        </div>
      </div>

      {/* Liste des contacts */}
      <div className="flex-1 p-6">
        {filteredProspects.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500">
              {searchQuery ? 'Aucun contact trouvé' : 'Aucun contact'}
            </p>
            {searchQuery && (
              <p className="text-gray-400 text-sm mt-1">
                Essayez un autre terme de recherche
              </p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProspects.map((prospect) => (
              <div
                key={prospect.id}
                className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => alert(`Clic sur ${prospect.firstName} ${prospect.lastName}`)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">
                      {prospect.firstName} {prospect.lastName}
                    </h3>
                    <p className="text-sm text-gray-600">{prospect.email}</p>
                    <p className="text-sm text-gray-500">{prospect.phone}</p>
                  </div>
                </div>
                
                {/* Tags simplifié */}
                {prospect.tags && prospect.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {prospect.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {tag}
                      </span>
                    ))}
                    {prospect.tags.length > 3 && (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        +{prospect.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal simple */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h2 className="text-xl font-bold mb-4">Ajouter un contact</h2>
            <p className="text-gray-600 mb-4">Fonctionnalité en construction...</p>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowModal(false)}
                className="flex-1"
              >
                Fermer
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Info utilisateur */}
      <div className="bg-white border-t p-4 text-sm text-gray-600">
        <strong>Utilisateur actif:</strong> {activeAdminUser?.name || 'Non défini'} | 
        <strong> Total prospects:</strong> {prospects.length}
      </div>
    </div>
  );
};

export default WorkingContacts;