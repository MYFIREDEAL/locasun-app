import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '@/App';
import { useOrganization } from '@/contexts/OrganizationContext';
import ModulesNavBar from '@/components/admin/ModulesNavBar';
import useSupabasePartners from '@/hooks/useSupabasePartners';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/use-toast';
import { 
  ArrowLeft,
  User,
  Mail,
  Phone,
  Briefcase,
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  Loader2,
  AlertCircle
} from 'lucide-react';

/**
 * Page Admin — Fiche Partenaire
 * 
 * ACCÈS: Global Admin, Manager uniquement
 * FONCTIONNALITÉS:
 * - Affichage détail partenaire
 * - Activer/Désactiver le partenaire
 * - Liste des missions (lecture seule)
 */
const PartnerDetailPage = () => {
  const { partnerId } = useParams();
  const navigate = useNavigate();
  const { activeAdminUser } = useAppContext();
  const { organizationId } = useOrganization();
  const { togglePartnerActive, getPartnerWithMissions } = useSupabasePartners(organizationId);
  
  const [partner, setPartner] = useState(null);
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [togglingActive, setTogglingActive] = useState(false);

  // Vérification des droits d'accès
  const hasAccess = useMemo(() => {
    return activeAdminUser?.role === 'Global Admin' || 
           activeAdminUser?.role === 'Admin' ||
           activeAdminUser?.role === 'platform_admin';
  }, [activeAdminUser]);

  // Charger le partenaire et ses missions
  useEffect(() => {
    const loadPartner = async () => {
      if (!partnerId) return;
      
      setLoading(true);
      setError(null);
      
      const result = await getPartnerWithMissions(partnerId);
      
      if (result.error) {
        setError(result.error);
      } else {
        setPartner(result.partner);
        setMissions(result.missions);
      }
      
      setLoading(false);
    };

    loadPartner();
  }, [partnerId, getPartnerWithMissions]);

  // Gérer l'activation/désactivation
  const handleToggleActive = async () => {
    if (!partner) return;
    
    setTogglingActive(true);
    const newActive = !partner.active;
    
    const result = await togglePartnerActive(partner.id, newActive);
    
    if (result.success) {
      setPartner(prev => ({ ...prev, active: newActive }));
      toast({
        title: newActive ? "✅ Partenaire activé" : "⏸️ Partenaire désactivé",
        description: newActive 
          ? `${partner.name} peut maintenant recevoir des missions.`
          : `${partner.name} ne recevra plus de nouvelles missions.`,
        className: newActive ? "bg-green-500 text-white" : "bg-orange-500 text-white"
      });
    } else {
      toast({
        title: "❌ Erreur",
        description: result.error || "Impossible de modifier le statut.",
        variant: "destructive"
      });
    }
    
    setTogglingActive(false);
  };

  // Helper pour le badge de statut mission
  const getMissionStatusBadge = (status) => {
    const statusConfig = {
      pending: { label: 'En attente', icon: Clock, className: 'bg-gray-100 text-gray-700' },
      in_progress: { label: 'En cours', icon: Loader2, className: 'bg-blue-100 text-blue-700' },
      completed: { label: 'Terminée', icon: CheckCircle, className: 'bg-green-100 text-green-700' },
      blocked: { label: 'Bloquée', icon: AlertTriangle, className: 'bg-red-100 text-red-700' },
      cancelled: { label: 'Annulée', icon: XCircle, className: 'bg-gray-100 text-gray-500' },
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;
    
    return (
      <Badge className={config.className}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

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

  // Chargement
  if (loading) {
    return (
      <div className="flex flex-col h-[calc(100vh-80px)]">
        <ModulesNavBar activeModule="partenaires" />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-3 text-gray-600">Chargement du partenaire...</span>
        </div>
      </div>
    );
  }

  // Erreur
  if (error || !partner) {
    return (
      <div className="flex flex-col h-[calc(100vh-80px)]">
        <ModulesNavBar activeModule="partenaires" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 font-medium mb-4">
              {error || 'Partenaire non trouvé'}
            </p>
            <Button variant="outline" onClick={() => navigate('/admin/partners')}>
              Retour à la liste
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
        {/* Back button */}
        <Button 
          variant="ghost" 
          className="mb-4"
          onClick={() => navigate('/admin/partners')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour à la liste
        </Button>

        <div className="grid grid-cols-3 gap-6">
          {/* Colonne gauche - Infos partenaire */}
          <div className="col-span-1">
            <div className="bg-white rounded-xl shadow-sm border p-6">
              {/* Avatar et nom */}
              <div className="text-center mb-6">
                <div className="w-20 h-20 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-4">
                  <span className="text-orange-600 font-bold text-2xl">
                    {partner.name?.charAt(0)?.toUpperCase() || '?'}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-gray-900">{partner.name}</h2>
                {partner.specialty && (
                  <Badge variant="outline" className="mt-2 bg-blue-50 text-blue-700">
                    {partner.specialty}
                  </Badge>
                )}
              </div>

              {/* Infos de contact */}
              <div className="space-y-4 border-t pt-4">
                <div className="flex items-center gap-3 text-gray-600">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">{partner.email}</span>
                </div>
                {partner.phone && (
                  <div className="flex items-center gap-3 text-gray-600">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">{partner.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-3 text-gray-600">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">
                    Créé le {new Date(partner.createdAt).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              </div>

              {/* Actions admin */}
              <div className="border-t pt-4 mt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">Statut</div>
                    <div className="text-sm text-gray-500">
                      {partner.active ? 'Peut recevoir des missions' : 'Ne reçoit plus de missions'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={partner.active}
                      onCheckedChange={handleToggleActive}
                      disabled={togglingActive}
                    />
                    {togglingActive && <Loader2 className="h-4 w-4 animate-spin" />}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Colonne droite - Missions */}
          <div className="col-span-2">
            <div className="bg-white rounded-xl shadow-sm border">
              <div className="px-6 py-4 border-b">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-blue-600" />
                  Missions ({missions.length})
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Historique des missions assignées à ce partenaire (lecture seule)
                </p>
              </div>

              {missions.length === 0 ? (
                <div className="p-12 text-center">
                  <Briefcase className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Aucune mission assignée</p>
                </div>
              ) : (
                <div className="divide-y max-h-[500px] overflow-y-auto">
                  {missions.map(mission => (
                    <div key={mission.id} className="px-6 py-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{mission.title}</div>
                          <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                            <Badge variant="outline" className="text-xs">
                              {mission.projectType}
                            </Badge>
                            {mission.stepName && (
                              <span>• {mission.stepName}</span>
                            )}
                            <span>• {mission.source}</span>
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            Créée le {new Date(mission.createdAt).toLocaleDateString('fr-FR')}
                            {mission.dueDate && (
                              <> • Échéance: {new Date(mission.dueDate).toLocaleDateString('fr-FR')}</>
                            )}
                          </div>
                        </div>
                        <div>
                          {getMissionStatusBadge(mission.status)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PartnerDetailPage;
