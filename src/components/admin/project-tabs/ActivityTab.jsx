import React, { useState } from 'react';
import { Plus, Calendar, Phone, CheckSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const ActivityTab = ({ prospectId, projectId }) => {
  const [showAddActivity, setShowAddActivity] = useState(false);

  // TODO: Récupérer les vraies activités depuis useSupabaseAgenda
  // Pour l'instant, données mockées
  const currentActivities = [
    {
      id: '1',
      type: 'appointment',
      name: 'Rendez-vous de suivi',
      date: new Date(2025, 10, 20, 14, 0),
      status: 'pending',
    },
    {
      id: '2',
      type: 'call',
      name: 'Appel de relance',
      date: new Date(2025, 10, 19, 10, 30),
      status: 'pending',
    },
  ];

  const pastActivities = [
    {
      id: '3',
      type: 'task',
      name: 'Envoyer le devis',
      date: new Date(2025, 10, 15, 9, 0),
      status: 'completed',
    },
    {
      id: '4',
      type: 'appointment',
      name: 'RDV de découverte',
      date: new Date(2025, 10, 10, 15, 0),
      status: 'completed',
    },
  ];

  const getActivityIcon = (type) => {
    switch (type) {
      case 'appointment':
        return <Calendar className="h-4 w-4" />;
      case 'call':
        return <Phone className="h-4 w-4" />;
      case 'task':
        return <CheckSquare className="h-4 w-4" />;
      default:
        return <Calendar className="h-4 w-4" />;
    }
  };

  const getActivityColor = (type, status) => {
    if (status === 'completed') return 'text-green-600 bg-green-50';
    switch (type) {
      case 'appointment':
        return 'text-blue-600 bg-blue-50';
      case 'call':
        return 'text-purple-600 bg-purple-50';
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
        <div className="space-y-2">
          {currentActivities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-center space-x-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer"
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getActivityColor(activity.type, activity.status)}`}>
                {getActivityIcon(activity.type)}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{activity.name}</p>
                <p className="text-xs text-gray-500">
                  {format(activity.date, "d MMM 'à' HH:mm", { locale: fr })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Activités passées */}
      <div>
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Passées ({pastActivities.length})
        </h4>
        <div className="space-y-2">
          {pastActivities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-center space-x-3 p-3 bg-gray-50 border border-gray-100 rounded-lg opacity-75"
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getActivityColor(activity.type, activity.status)}`}>
                {getActivityIcon(activity.type)}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700">{activity.name}</p>
                <p className="text-xs text-gray-400">
                  {format(activity.date, "d MMM 'à' HH:mm", { locale: fr })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="text-center py-4 text-sm text-gray-400">
        <p>Les activités seront synchronisées avec useSupabaseAgenda</p>
      </div>
    </div>
  );
};

export default ActivityTab;
