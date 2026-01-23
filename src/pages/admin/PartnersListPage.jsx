import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '@/App';
import ModulesNavBar from '@/components/admin/ModulesNavBar';
import useSupabasePartners from '@/hooks/useSupabasePartners';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Search, 
  UserCheck, 
  UserX, 
  ChevronRight,
  Loader2,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

/**
 * Page Admin — Liste des Partenaires
 * 
 * ACCÈS: Global Admin, Manager uniquement
 * FONCTIONNALITÉS:
 * - Liste des partenaires du tenant
 * - Recherche par nom/email
 * - Affichage statut (actif/inactif)
 * - Nombre de missions par partenaire
 * - Clic pour voir la fiche détaillée
 */
const PartnersListPage = () => {
  const navigate = useNavigate();
  const { activeAdminUser } = useAppContext();
  const { partners, loading, error, refetch } = useSupabasePartners();
  const [searchQuery, setSearchQuery] = useState('');

  // Vérification des droits d'accès
  const hasAccess = useMemo(() => {
    return activeAdminUser?.role === 'Global Admin' || 
           activeAdminUser?.role === 'Admin' ||
           activeAdminUser?.role === 'platform_admin';
  }, [activeAdminUser]);

  // Filtrage des partenaires par recherche
  const filteredPartners = useMemo(() => {
    if (!searchQuery.trim()) return partners;
    
    const query = searchQuery.toLowerCase();
    return partners.filter(p => 
      p.name?.toLowerCase().includes(query) ||
      p.email?.toLowerCase().includes(query) ||
      p.specialty?.toLowerCase().includes(query)
    );
  }, [partners, searchQuery]);

  // Stats rapides
  const stats = useMemo(() => ({
    total: partners.length,
    active: partners.filter(p => p.active).length,
    inactive: partners.filter(p => !p.active).length,
    totalMissions: partners.reduce((acc, p) => acc + p.missionsCount, 0),
  }), [partners]);

  // Si pas d'accès
  if (!hasAccess) {
    return (
      <div className="flex flex-col h-[calc(100vh-80px)]">
        <ModulesNavBar activeModule="partenaires" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-4">🔒</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Accès restreint</h1>
            <p className="text-gray-600 mb-6">
              Cette page est réservée aux Global Admin et Admin.
            </p>
            <Button onClick={() => navigate('/admin/pipeline')}>
              Retour au Pipeline
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      <ModulesNavBar activeModule="partenaires" />
      
      <div className="flex-1 p-6 overflow-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Users className="h-7 w-7 text-orange-600" />
                Partenaires
              </h1>
              <p className="text-gray-500 mt-1">
                Gérez les partenaires terrain de votre organisation
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={refetch}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-sm text-gray-500">Partenaires</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <div className="text-2xl font-bold text-green-600">{stats.active}</div>
              <div className="text-sm text-gray-500">Actifs</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <div className="text-2xl font-bold text-red-600">{stats.inactive}</div>
              <div className="text-sm text-gray-500">Inactifs</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <div className="text-2xl font-bold text-blue-600">{stats.totalMissions}</div>
              <div className="text-sm text-gray-500">Missions totales</div>
            </div>
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Rechercher un partenaire..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-3 text-gray-600">Chargement des partenaires...</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-600 font-medium">Erreur: {error}</p>
              <Button variant="outline" className="mt-4" onClick={refetch}>
                Réessayer
              </Button>
            </div>
          </div>
        ) : filteredPartners.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchQuery ? 'Aucun partenaire trouvé' : 'Aucun partenaire'}
              </h3>
              <p className="text-gray-500 max-w-sm">
                {searchQuery 
                  ? 'Modifiez votre recherche pour trouver des partenaires.'
                  : 'Les partenaires apparaîtront ici une fois créés via l\'invitation.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Partenaire</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Email</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Spécialité</th>
                  <th className="text-center px-6 py-4 text-sm font-semibold text-gray-700">Statut</th>
                  <th className="text-center px-6 py-4 text-sm font-semibold text-gray-700">Missions</th>
                  <th className="text-right px-6 py-4 text-sm font-semibold text-gray-700"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredPartners.map(partner => (
                  <tr 
                    key={partner.id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/admin/partners/${partner.id}`)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                          <span className="text-orange-600 font-semibold text-sm">
                            {partner.name?.charAt(0)?.toUpperCase() || '?'}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{partner.name}</div>
                          {partner.phone && (
                            <div className="text-sm text-gray-500">{partner.phone}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{partner.email}</td>
                    <td className="px-6 py-4">
                      {partner.specialty ? (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          {partner.specialty}
                        </Badge>
                      ) : (
                        <span className="text-gray-400 text-sm">Non définie</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {partner.active ? (
                        <Badge className="bg-green-100 text-green-700 border-green-200">
                          <UserCheck className="h-3 w-3 mr-1" />
                          Actif
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                          <UserX className="h-3 w-3 mr-1" />
                          Inactif
                        </Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-700 font-medium text-sm">
                        {partner.missionsCount}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PartnersListPage;
