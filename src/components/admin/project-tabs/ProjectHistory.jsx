import React from 'react';
import { CheckCircle, Calendar, FileText, GitBranch, Tag, User } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const ProjectHistory = ({ prospectId, projectType }) => {
  // TODO: Récupérer l'historique réel depuis Supabase
  // Sources possibles:
  // - project_steps_status (changements d'étapes)
  // - client_form_panels (formulaires complétés)
  // - appointments (rdv ajoutés/passés)
  // - tasks (tâches terminées)
  // - project_notes (notes ajoutées)
  
  // Mock data pour l'instant
  const historyEvents = [
    {
      id: '1',
      type: 'step_change',
      title: 'Étape complétée',
      description: 'Passage à l\'étape "Visite technique"',
      timestamp: new Date(2025, 10, 18, 14, 30),
      user: 'Jack LUC',
      icon: GitBranch,
      color: 'text-green-600 bg-green-50',
    },
    {
      id: '2',
      type: 'form_completed',
      title: 'Formulaire complété',
      description: 'Le client a rempli le formulaire "Questionnaire technique"',
      timestamp: new Date(2025, 10, 17, 10, 15),
      user: 'Client (Sophie Martin)',
      icon: FileText,
      color: 'text-blue-600 bg-blue-50',
    },
    {
      id: '3',
      type: 'appointment_added',
      title: 'Rendez-vous planifié',
      description: 'RDV de suivi prévu le 20 nov. à 14h00',
      timestamp: new Date(2025, 10, 16, 16, 45),
      user: 'Jack LUC',
      icon: Calendar,
      color: 'text-purple-600 bg-purple-50',
    },
    {
      id: '4',
      type: 'task_completed',
      title: 'Tâche terminée',
      description: 'Envoyer le devis au client',
      timestamp: new Date(2025, 10, 15, 9, 0),
      user: 'Jack LUC',
      icon: CheckCircle,
      color: 'text-green-600 bg-green-50',
    },
    {
      id: '5',
      type: 'project_tag_added',
      title: 'Type de projet modifié',
      description: 'Ajout du tag "ACC"',
      timestamp: new Date(2025, 10, 10, 11, 20),
      user: 'Jack LUC',
      icon: Tag,
      color: 'text-orange-600 bg-orange-50',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Historique du projet
        </h3>
        <span className="text-xs text-gray-500">
          {historyEvents.length} événement{historyEvents.length > 1 ? 's' : ''}
        </span>
      </div>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

        {/* Timeline events */}
        <div className="space-y-6">
          {historyEvents.map((event, index) => {
            const IconComponent = event.icon;
            
            return (
              <div key={event.id} className="relative flex items-start space-x-4">
                {/* Icon */}
                <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center ${event.color}`}>
                  <IconComponent className="h-4 w-4" />
                </div>

                {/* Content */}
                <div className="flex-1 bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-1">
                    <h4 className="text-sm font-semibold text-gray-900">
                      {event.title}
                    </h4>
                    <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                      {format(event.timestamp, 'd MMM, HH:mm', { locale: fr })}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-2">
                    {event.description}
                  </p>
                  
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <User className="h-3 w-3" />
                    <span>{event.user}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="text-center py-4 text-sm text-gray-400 border-t border-gray-100">
        <p>L'historique sera alimenté depuis plusieurs tables Supabase :</p>
        <p className="text-xs mt-1">
          project_steps_status, client_form_panels, appointments, tasks, project_notes
        </p>
      </div>
    </div>
  );
};

export default ProjectHistory;
