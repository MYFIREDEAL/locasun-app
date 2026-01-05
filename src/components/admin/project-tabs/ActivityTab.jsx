import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Calendar, Phone, CheckSquare, Video, Users, Mail, MessageCircle, MapPin, Trash2, X, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useSupabaseProjectHistory } from '@/hooks/useSupabaseProjectHistory';
import { useSupabaseAgenda } from '@/hooks/useSupabaseAgenda';
import { useSupabaseProspects } from '@/hooks/useSupabaseProspects';
import { useSupabaseUsers } from '@/hooks/useSupabaseUsers';
import { useSupabaseUser } from '@/hooks/useSupabaseUser';
import { useAppContext } from '@/App';
import { AddActivityModal } from '@/pages/admin/Agenda';
import { useNavigate } from 'react-router-dom';

const ActivityTab = ({ prospectId, projectType }) => {
  const { activeAdminUser, projectsData } = useAppContext();
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);

  // 🔥 Charger les données nécessaires pour EventDetailsPopup et AddActivityModal
  const { appointments, updateAppointment, deleteAppointment, addAppointment, addCall, addTask, updateCall, updateTask } = useSupabaseAgenda(activeAdminUser);
  const { prospects } = useSupabaseProspects(activeAdminUser);
  const { users: supabaseUsers } = useSupabaseUsers();
  const { supabaseUserId } = useSupabaseUser();

  // 🔥 Debug : Vérifier que toutes les données sont chargées
  useEffect(() => {
    if (showAddActivity) {
      console.log('📊 AddActivityModal props:', {
        prospects: prospects?.length,
        users: supabaseUsers?.length,
        projectsData: Object.keys(projectsData || {}).length,
        supabaseUserId,
        prospectId,
        projectType,
      });
    }
  }, [showAddActivity, prospects, supabaseUsers, projectsData, supabaseUserId, prospectId, projectType]);

  // 🔥 Utiliser le hook Supabase pour récupérer la vraie timeline
  const { history, loading } = useSupabaseProjectHistory({
    projectType,
    prospectId,
    enabled: !!projectType && !!prospectId
  });

  // 🔥 Filtrer uniquement les événements de type 'activity'
  const activityEvents = useMemo(() => {
    if (!history || history.length === 0) return [];
    
    return history
      .filter(event => event.event_type === 'activity')
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [history]);

  // 🔥 Grouper par appointment_id et dériver le statut courant du DERNIER event
  const activities = useMemo(() => {
    const grouped = {};
    
    activityEvents.forEach(event => {
      const appointmentId = event.metadata?.appointment_id;
      if (!appointmentId) return;
      
      if (!grouped[appointmentId]) {
        grouped[appointmentId] = [];
      }
      grouped[appointmentId].push(event);
    });
    
    // Pour chaque appointment, prendre le dernier event (statut courant)
    const result = Object.entries(grouped).map(([appointmentId, events]) => {
      const sortedEvents = events.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      const latestEvent = sortedEvents[0];
      
      console.log(`📋 Appointment ${appointmentId}:`, {
        totalEvents: events.length,
        latestTitle: latestEvent.title,
        latestStatus: latestEvent.metadata?.status,
        allTitles: events.map(e => e.title)
      });
      
      return {
        ...latestEvent,
        currentStatus: latestEvent.metadata?.status || (latestEvent.title === 'Activité supprimée' ? 'deleted' : 'pending')
      };
    });
    
    console.log('🎯 Total activités agrégées:', result.length);
    return result;
  }, [activityEvents]);

  // 🔥 Séparer EN COURS / PASSÉES selon le statut courant
  const now = new Date();
  const currentActivities = useMemo(() => {
    if (!activities) return [];
    return activities.filter(activity => {
      const status = activity.currentStatus;
      
      // EN COURS = UNIQUEMENT pending
      return status === 'pending';
    });
  }, [activities]);

  const pastActivities = useMemo(() => {
    if (!activities) return [];
    return activities.filter(activity => {
      const status = activity.currentStatus;
      
      // PASSÉES = tout sauf pending
      return status !== 'pending';
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

  // 🔥 Retrouver l'appointment complet depuis l'activité project_history
  const findAppointmentFromActivity = (activity) => {
    if (!appointments || !activity.metadata?.appointment_id) return null;
    return appointments.find(apt => apt.id === activity.metadata.appointment_id);
  };

  // 🔥 Handler pour cliquer sur une activité
  const handleActivityClick = (activity) => {
    const appointment = findAppointmentFromActivity(activity);
    if (appointment) {
      setSelectedActivity(appointment);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header avec bouton d'ajout */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Activités du projet</h3>
        <Button
          onClick={() => {
            console.log('🔍 Avant ouverture modal:', {
              prospects: !!prospects,
              prospectsLength: prospects?.length,
              supabaseUsers: !!supabaseUsers,
              usersLength: supabaseUsers?.length,
              projectsData: !!projectsData,
              projectsDataKeys: Object.keys(projectsData || {}).length,
              supabaseUserId,
            });
            setShowAddActivity(!showAddActivity);
          }}
          size="sm"
          variant="outline"
          className="text-blue-600 border-blue-600 hover:bg-blue-50"
        >
          <Plus className="h-4 w-4 mr-2" />
          Ajouter une activité
        </Button>
      </div>

      {/* 🔥 Modal Ajouter une activité - Utilisation du composant AddActivityModal de Agenda */}
      {showAddActivity && (
        <AddActivityModal
          open={showAddActivity}
          onOpenChange={setShowAddActivity}
          initialData={{
            contactId: prospectId,
            projectId: projectType,
          }}
          defaultAssignedUserId={supabaseUserId}
          addAppointment={addAppointment}
          addCall={addCall}
          addTask={addTask}
          updateAppointment={updateAppointment}
          updateCall={updateCall}
          updateTask={updateTask}
          prospects={prospects || []}
          users={supabaseUsers || []}
          projectsData={projectsData || {}}
        />
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
            {currentActivities.map((activity) => {
              // Récupérer le vrai appointment pour afficher son titre
              const appointment = findAppointmentFromActivity(activity);
              const displayTitle = appointment?.title || activity.title || 'Activité';
              const displayDate = appointment?.start ? new Date(appointment.start) : new Date(activity.created_at);
              
              return (
                <div
                  key={activity.id}
                  onClick={() => handleActivityClick(activity)}
                  className="flex items-center space-x-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer"
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getActivityColor(activity.metadata)}`}>
                    {getActivityIcon(activity.metadata)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {displayTitle}
                    </p>
                    {appointment?.notes && (
                      <p className="text-xs text-gray-600 mt-0.5">
                        {appointment.notes}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      {format(displayDate, "d MMM 'à' HH:mm", { locale: fr })}
                    </p>
                  </div>
                </div>
              );
            })}
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
            {pastActivities.map((activity) => {
              // Récupérer le vrai appointment pour afficher son titre
              const appointment = findAppointmentFromActivity(activity);
              const displayTitle = appointment?.title || activity.title || 'Activité';
              const displayDate = appointment?.start ? new Date(appointment.start) : new Date(activity.created_at);
              
              // Labels de statut clairs
              const statusLabel = {
                'effectue': '✅ Effectué',
                'annule': '❌ Annulé',
                'reporte': '📅 Reporté',
                'deleted': '🗑️ Supprimé',
                'completed': '✅ Terminé'
              }[activity.currentStatus] || activity.currentStatus;
              
              return (
                <div
                  key={activity.id}
                  onClick={() => handleActivityClick(activity)}
                  className="flex items-center space-x-3 p-3 bg-gray-50 border border-gray-100 rounded-lg opacity-75 hover:opacity-100 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer"
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getActivityColor(activity.metadata)}`}>
                    {getActivityIcon(activity.metadata)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-700">
                      {displayTitle}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {statusLabel} • {format(displayDate, "d MMM yyyy 'à' HH:mm", { locale: fr })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Popup pour afficher les détails de l'activité */}
      {selectedActivity && (
        <EventDetailsPopup
          event={selectedActivity}
          onClose={() => setSelectedActivity(null)}
          onReport={() => {}} // Pas de report depuis l'onglet activité
          onEdit={() => {}} // Pas d'édition depuis l'onglet activité
          prospects={prospects}
          supabaseUsers={supabaseUsers}
          updateAppointment={updateAppointment}
          deleteAppointment={deleteAppointment}
          projectsData={projectsData}
        />
      )}
    </div>
  );
};

// Composant EventDetailsPopup (copié depuis ProspectDetailsAdmin)
const EventDetailsPopup = ({ event, onClose, onReport, onEdit, prospects, supabaseUsers, updateAppointment, deleteAppointment, projectsData }) => {
  const [status, setStatus] = useState(event?.status || 'pending');

  useEffect(() => {
    if (event) {
      setStatus(event.status || 'pending');
    }
  }, [event]);

  // 🔥 Guard: Ne rien afficher si les données nécessaires ne sont pas chargées
  if (!event || !prospects || !supabaseUsers || !updateAppointment || !deleteAppointment || !projectsData) {
    return null;
  }

  const contact = prospects.find(p => p.id === event.contactId);
  const assignedUser = supabaseUsers.find(u => u.id === event.assignedUserId) || (contact ? supabaseUsers.find(u => u.user_id === contact.ownerId) : null);

  const capitalizeFirstLetter = (string) => {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1);
  };

  const safeFormatDate = (dateValue, formatString, options = {}) => {
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) {
        return 'Date invalide';
      }
      return format(date, formatString, options);
    } catch (error) {
      return 'Date invalide';
    }
  };

  const handleStatusChange = (newStatus) => {
    setStatus(newStatus);
    updateAppointment(event.id, { status: newStatus });
    
    setTimeout(() => {
      onClose();
      if (newStatus === 'reporte') {
        onReport(event);
      }
    }, 300);
  };

  const handleDelete = () => {
    deleteAppointment(event.id);
    toast({ title: "✅ RDV supprimé", description: "Le rendez-vous a été retiré de votre agenda." });
    onClose();
  };

  const handleActionClick = (action) => {
    if (!contact) {
      toast({ title: "Contact non trouvé", variant: "destructive" });
      return;
    }
    switch (action) {
      case 'Appel':
        if (contact.phone) window.location.href = `tel:${contact.phone}`;
        break;
      case 'Mail':
        if (contact.email) window.location.href = `mailto:${contact.email}`;
        break;
      case 'WhatsApp':
        if (contact.phone) {
          let phoneNumber = contact.phone.replace(/\D/g, '');
          if (phoneNumber.startsWith('0')) {
            phoneNumber = `33${phoneNumber.substring(1)}`;
          }
          const prefilledMessage = encodeURIComponent("Bonjour");
          window.open(`https://wa.me/${phoneNumber}?text=${prefilledMessage}`, '_blank');
        }
        break;
      case 'GPS':
        if (contact.address) {
          const encodedAddress = encodeURIComponent(contact.address);
          const isAppleDevice = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
          if (isAppleDevice) {
            window.location.href = `maps://?q=${encodedAddress}`;
          } else {
            window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank');
          }
        }
        break;
      default:
        toast({
          title: `Action: ${action}`,
          description: "🚧 Cette fonctionnalité n'est pas encore implémentée."
        });
    }
  };

  const statusConfig = {
    pending: { color: 'bg-blue-500', label: 'Qualifier votre activité' },
    effectue: { color: 'bg-green-500', label: 'Effectué' },
    annule: { color: 'bg-red-500', label: 'Annulé' },
    reporte: { color: 'bg-yellow-500', label: 'Reporté' },
  };

  return (
    <Dialog open={!!event} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md p-0">
        {/* 🔥 Bouton fermer customisé - Plus gros et plus visible */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 bg-gray-100 hover:bg-gray-200 transition-colors z-10 group"
        >
          <X className="h-6 w-6 text-gray-600 group-hover:text-gray-900" />
        </button>

        <div className="p-6 space-y-4">
          {/* 🔥 Date/Heure en haut, centré et mis en évidence */}
          <div className="text-center py-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-lg font-semibold text-blue-900">
              {capitalizeFirstLetter(safeFormatDate(event.start, "eeee d MMMM", { locale: fr }))}
            </p>
            <p className="text-2xl font-bold text-blue-600 mt-1">
              {safeFormatDate(event.start, "HH:mm", { locale: fr })} - {safeFormatDate(event.end, "HH:mm", { locale: fr })}
            </p>
          </div>

          <DialogHeader className="p-0 text-left space-y-1">
            <DialogTitle className="text-xl font-bold text-gray-900">{event.summary}</DialogTitle>
          </DialogHeader>
          
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start space-x-3 text-gray-600 flex-1">
              <Users className="h-5 w-5 text-gray-400 mt-1" />
              <div>
                <p className="font-medium">Participants</p>
                {contact && <p className="text-sm">{contact.name} (Client)</p>}
                {assignedUser && <p className="text-sm">{assignedUser.name} (Assigné)</p>}
              </div>
            </div>
            
            {/* 🔥 Bouton "Ouvrir le projet" */}
            {contact && event.projectId && (
              <Button
                onClick={() => {
                  onClose();
                  // Navigation vers le détail du projet sera géré par le composant parent
                  window.location.href = `#/admin/contacts?prospect=${contact.id}&project=${event.projectId}`;
                }}
                size="sm"
                variant="outline"
                className="flex items-center gap-2 text-blue-600 border-blue-600 hover:bg-blue-50"
              >
                <ExternalLink className="h-4 w-4" />
                Ouvrir le projet
              </Button>
            )}
          </div>
        </div>

        <div className="border-t border-gray-200 p-6 space-y-4">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Actions rapides</h3>
          <div className="grid grid-cols-4 gap-2 text-center">
            {[{ icon: Phone, label: 'Appel' }, { icon: Mail, label: 'Mail' }, { icon: MessageCircle, label: 'WhatsApp' }, { icon: MapPin, label: 'GPS' }].map(({ icon: Icon, label }) => (
              <button key={label} onClick={() => handleActionClick(label)} className="flex flex-col items-center space-y-1 text-gray-600 hover:text-blue-600 transition-colors group">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center group-hover:bg-blue-100">
                  <Icon className="h-6 w-6" />
                </div>
                <span className="text-xs font-medium">{label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className={`p-4 text-white transition-colors ${statusConfig[status].color}`}>
          <Select onValueChange={handleStatusChange} value={status}>
            <SelectTrigger className="w-full bg-transparent border-none text-white text-lg font-semibold focus:ring-0 focus:ring-offset-0 h-auto p-0 text-center justify-center" iconClassName="h-8 w-8 opacity-100">
              <SelectValue placeholder="Qualifier votre activité" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending" disabled>Qualifier votre activité</SelectItem>
              <SelectItem value="effectue">Effectué</SelectItem>
              <SelectItem value="annule">Annulé</SelectItem>
              <SelectItem value="reporte">Reporté</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="border-t border-gray-200 p-6 space-y-4">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Infos activité</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Projet</span>
              <span className="font-medium text-gray-800">{projectsData[event.projectId]?.title || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Étape</span>
              <span className="font-medium text-gray-800">{event.step || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Note</span>
              <span className="font-medium text-gray-800 text-right">{event.notes || 'Aucune'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Interlocuteur</span>
              <span className="font-medium text-gray-800">{contact?.name || 'N/A'}</span>
            </div>
          </div>
        </div>

        <DialogFooter className="p-6 bg-gray-50 sm:justify-between">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" className="text-red-600 hover:bg-red-50 hover:text-red-700">
                <Trash2 className="mr-2 h-4 w-4" />
                Supprimer
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Voulez-vous vraiment supprimer ce RDV ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Cette action est irréversible. Le rendez-vous sera définitivement supprimé.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Supprimer</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button 
            className={
              event?.status && event.status !== 'pending' 
                ? "bg-gray-400 hover:bg-gray-500 text-gray-700" 
                : "bg-blue-600 hover:bg-blue-700"
            } 
            onClick={() => onEdit(event)}
          >
            Modifier l'activité
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ActivityTab;
