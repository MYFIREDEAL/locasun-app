import React, { useState, useMemo } from 'react';
import { Plus, Calendar, Phone, CheckSquare, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useSupabaseProjectHistory } from '@/hooks/useSupabaseProjectHistory';

const ActivityTab = ({ prospectId, projectType }) => {
  const [showAddActivity, setShowAddActivity] = useState(false);

  // 🔥 Utiliser le hook Supabase pour récupérer la vraie timeline
  const { history, loading } = useSupabaseProjectHistory({
    projectType,
    prospectId,
    enabled: !!projectType && !!prospectId
  });

  // 🔥 Filtrer uniquement les événements de type 'activity' et trier par date
  const activities = useMemo(() => {
    if (!history || history.length === 0) return [];
    
    return history
      .filter(event => event.event_type === 'activity')
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [history]);

  // 🔥 Séparer les activités futures et passées
  const now = new Date();
  const currentActivities = useMemo(() => {
    return activities.filter(activity => {
      const activityDate = new Date(activity.created_at);
      return activityDate >= now || activity.metadata?.status === 'pending';
    });
  }, [activities]);

  const pastActivities = useMemo(() => {
    return activities.filter(activity => {
      const activityDate = new Date(activity.created_at);
      return activityDate < now && activity.metadata?.status !== 'pending';
    });
  }, [activities]);

  // 🔥 Déterminer l'icône selon le type d'activité (depuis metadata.activity_type)
  const getActivityIcon = (metadata) => {
    const activityType = metadata?.activity_type || 'appointment';
    
    switch (activityType) {
      case 'physical':
      case 'appointment':
        return <Calendar className="h-4 w-4" />;
      case 'virtual':
        return <Video className="h-4 w-4" />;
      case 'call':
        return <Phone className="h-4 w-4" />;
      case 'task':
        return <CheckSquare className="h-4 w-4" />;
      default:
        return <Calendar className="h-4 w-4" />;
    }
  };

  // 🔥 Déterminer la couleur selon le type et le statut
  const getActivityColor = (metadata) => {
    const activityType = metadata?.activity_type || 'appointment';
    const status = metadata?.status;
    
    if (status === 'effectue' || status === 'completed') return 'text-green-600 bg-green-50';
    if (status === 'annule') return 'text-red-600 bg-red-50';
    if (status === 'reporte') return 'text-yellow-600 bg-yellow-50';
    
    switch (activityType) {
      case 'physical':
      case 'appointment':
        return 'text-blue-600 bg-blue-50';
      case 'virtual':
        return 'text-purple-600 bg-purple-50';
      case 'call':
        return 'text-green-600 bg-green-50';
      case 'task':
        return 'text-orange-600 bg-orange-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header avec bouton d'ajout */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Activités du projet</h3>
        <Button
          onClick={() => setShowAddActivity(!showAddActivity)}
          size="sm"
          variant="outline"
          className="text-blue-600 border-blue-600 hover:bg-blue-50"
        >
          <Plus className="h-4 w-4 mr-2" />
          Ajouter une activité
        </Button>
      </div>

      {showAddActivity && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-700">
            🚧 Modal d'ajout d'activité à venir (utilisation de AddActivityModal)
          </p>
        </div>
      )}

      {/* Activités en cours */}
      <div>
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          En cours ({currentActivities.length})
        </h4>
        {loading ? (
          <p className="text-sm text-gray-400 italic">Chargement des activités...</p>
        ) : currentActivities.length === 0 ? (
          <p className="text-sm text-gray-400 italic">Aucune activité en cours</p>
        ) : (
          <div className="space-y-2">
            {currentActivities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center space-x-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer"
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getActivityColor(activity.metadata)}`}>
                  {getActivityIcon(activity.metadata)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {activity.title || 'Activité'}
                  </p>
                  {activity.description && (
                    <p className="text-xs text-gray-600 mt-0.5">
                      {activity.description}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    {format(new Date(activity.created_at), "d MMM 'à' HH:mm", { locale: fr })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Activités passées */}
      <div>
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Passées ({pastActivities.length})
        </h4>
        {loading ? (
          <p className="text-sm text-gray-400 italic">Chargement...</p>
        ) : pastActivities.length === 0 ? (
          <p className="text-sm text-gray-400 italic">Aucune activité passée</p>
        ) : (
          <div className="space-y-2">
            {pastActivities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center space-x-3 p-3 bg-gray-50 border border-gray-100 rounded-lg opacity-75"
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getActivityColor(activity.metadata)}`}>
                  {getActivityIcon(activity.metadata)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700">
                    {activity.title || 'Activité'}
                  </p>
                  {activity.description && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {activity.description}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {format(new Date(activity.created_at), "d MMM 'à' HH:mm", { locale: fr })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityTab;
