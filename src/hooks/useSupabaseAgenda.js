import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { toast } from '@/components/ui/use-toast';
import { useSupabaseProjectHistory } from '@/hooks/useSupabaseProjectHistory';

/**
 * Hook personnalisé pour gérer l'agenda via Supabase
 * Tout est unifié dans la table appointments avec filtrage par type :
 * - type: "physical" ou "virtual" → RDV affichés dans le calendrier
 * - type: "call" → Appels affichés dans la sidebar uniquement
 * - type: "task" → Tâches affichées dans la sidebar uniquement
 */
export const useSupabaseAgenda = (activeAdminUser) => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [realtimeChannel, setRealtimeChannel] = useState(null);

  // 🔥 Hook pour journaliser les activités dans project_history
  // UTILISER addProjectEvent qui accepte projectType et prospectId en paramètres
  const { addProjectEvent } = useSupabaseProjectHistory({
    projectType: null, // Pas de filtre sur le hook
    enabled: false, // Pas besoin de charger l'historique, juste d'écrire
  });

  // ==================== FETCH DATA ====================

  const fetchAppointments = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('appointments')
        .select('*')
        .order('start_time', { ascending: true });

      if (fetchError) throw fetchError;

      // Transformer vers le format attendu par l'app
      const transformed = (data || []).map(apt => ({
        id: apt.id,
        title: apt.title,
        start: apt.start_time,  // Le code attend "start" pas "startTime"
        end: apt.end_time,      // Le code attend "end" pas "endTime"
        contactId: apt.contact_id,
        assignedUserId: apt.assigned_user_id,
        projectId: apt.project_id,
        step: apt.step,
        type: apt.type,
        status: apt.status,
        rescheduledFromId: apt.rescheduled_from_id,
        share: apt.share,
        notes: apt.notes,
        location: apt.location,
        createdAt: apt.created_at,
        updatedAt: apt.updated_at,
      }));
      
      setAppointments(transformed);
      return transformed;
    } catch (err) {
      logger.error('Erreur chargement appointments:', { error: err.message });
      throw err;
    }
  };

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError(null);
      await fetchAppointments();
    } catch (err) {
      logger.error('Erreur chargement agenda:', { error: err.message });
      setError(err.message);
      toast({
        title: "Erreur",
        description: "Impossible de charger l'agenda.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Charger au montage
  useEffect(() => {
    if (activeAdminUser) {
      fetchAllData();
    }
  }, [activeAdminUser]);

  // ==================== REAL-TIME SYNC ====================
  useEffect(() => {
    if (!activeAdminUser) return;

    // Créer un canal unique pour l'agenda
    const channel = supabase
      .channel('agenda-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments'
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newApt = {
              id: payload.new.id,
              title: payload.new.title,
              start: payload.new.start_time,
              end: payload.new.end_time,
              contactId: payload.new.contact_id,
              assignedUserId: payload.new.assigned_user_id,
              projectId: payload.new.project_id,
              step: payload.new.step,
              type: payload.new.type,
              status: payload.new.status,
              share: payload.new.share,
              notes: payload.new.notes,
              location: payload.new.location,
              createdAt: payload.new.created_at,
              updatedAt: payload.new.updated_at,
            };
            setAppointments(prev => {
              // Éviter les doublons
              if (prev.some(a => a.id === newApt.id)) return prev;
              return [...prev, newApt];
            });
          }
          
          if (payload.eventType === 'UPDATE') {
            setAppointments(prev => prev.map(apt => 
              apt.id === payload.new.id ? {
                ...apt,
                title: payload.new.title,
                start: payload.new.start_time,
                end: payload.new.end_time,
                contactId: payload.new.contact_id,
                assignedUserId: payload.new.assigned_user_id,
                projectId: payload.new.project_id,
                step: payload.new.step,
                type: payload.new.type,
                status: payload.new.status,
                share: payload.new.share,
                notes: payload.new.notes,
                location: payload.new.location,
                updatedAt: payload.new.updated_at,
              } : apt
            ));
          }
          
          if (payload.eventType === 'DELETE') {
            setAppointments(prev => prev.filter(apt => apt.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    setRealtimeChannel(channel);

    // Cleanup
    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeAdminUser]);

  // ==================== APPOINTMENTS ====================

  const addAppointment = async (appointmentData) => {
    try {
      // Récupérer l'UUID du user authentifié
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      // 🔥 CRITICAL: assigned_user_id doit contenir users.user_id (auth UUID), comme prospects.owner_id
      // Les RLS policies utilisent auth.uid() qui retourne users.user_id
      
      // Valider que contact_id est un UUID valide ou null
      const contactId = appointmentData.contactId && 
                       appointmentData.contactId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
                       ? appointmentData.contactId 
                       : null;

      // 🔥 Si assignedUserId fourni, l'utiliser directement
      // Sinon, utiliser auth.uid() du user connecté (users.user_id, pas users.id!)
      let assignedUserId = appointmentData.assignedUserId;
      
      if (!assignedUserId) {
        // Utiliser l'auth UUID directement (comme prospects.owner_id)
        assignedUserId = user.id;  // auth.uid() = users.user_id
      }

      // 🔧 Valeurs par défaut pour colonnes NOT NULL
      const now = new Date();
      const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

      const { data, error: insertError } = await supabase
        .from('appointments')
        .insert([{
          title: appointmentData.title || 'Rendez-vous',
          start_time: appointmentData.startTime || now.toISOString(),  // 🔧 Défaut: maintenant
          end_time: appointmentData.endTime || oneHourLater.toISOString(),  // 🔧 Défaut: +1h
          contact_id: contactId,
          assigned_user_id: assignedUserId,  // 🔥 users.user_id (auth UUID) pour RLS policies
          project_id: appointmentData.projectId || null,
          step: appointmentData.step || null,
          type: appointmentData.type || 'physical',
          status: appointmentData.status || 'pending',
          share: appointmentData.share || false,
          notes: appointmentData.notes || null,
          location: appointmentData.location || null,
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      const transformed = {
        id: data.id,
        title: data.title,
        start: data.start_time,  // Utiliser "start" pas "startTime"
        end: data.end_time,      // Utiliser "end" pas "endTime"
        contactId: data.contact_id,
        assignedUserId: data.assigned_user_id,
        projectId: data.project_id,
        step: data.step,
        type: data.type,
        status: data.status,
        share: data.share,
        notes: data.notes,
        location: data.location,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      setAppointments(prev => [...prev, transformed]);

      toast({
        title: "Succès",
        description: "Rendez-vous ajouté avec succès !",
        className: "bg-green-500 text-white",
      });

      // 🔥 Journalisation dans project_history
      if (data.project_id && data.contact_id) {
        try {
          const activityTypeLabel = data.type === 'physical' ? 'RDV Physique' : 
                                   data.type === 'virtual' ? 'RDV Visio' :
                                   data.type === 'call' ? 'Appel' : 'Tâche';
          
          const startDate = new Date(data.start_time);
          const formattedDate = startDate.toLocaleDateString('fr-FR', { 
            day: '2-digit', 
            month: 'long', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });

          // 🔥 Utiliser addProjectEvent qui accepte projectType et prospectId en paramètres
          await addProjectEvent({
            prospectId: data.contact_id,
            projectType: data.project_id,
            title: 'Activité planifiée',
            description: `${activityTypeLabel} programmé pour le ${formattedDate}`,
            metadata: {
              event_type: 'activity',
              activity_type: data.type,
              appointment_id: data.id,
              start_time: data.start_time,
              end_time: data.end_time,
              status: data.status,
              step: data.step,
              source: 'agenda',
            },
            createdBy: user?.id || null,
            createdByName: activeAdminUser?.name || 'Système',
          });
          
          logger.debug('✅ Activité journalisée dans project_history', {
            appointmentId: data.id,
            projectId: data.project_id,
            type: data.type,
          });
        } catch (historyError) {
          logger.error('⚠️ Erreur journalisation project_history (non-bloquant)', {
            error: historyError.message,
            appointmentId: data.id,
          });
        }
      }

      return transformed;
    } catch (err) {
      logger.error('Erreur ajout appointment', { error: err.message });
      logger.error('Détails erreur', { details: JSON.stringify(err, null, 2) });
      toast({
        title: "Erreur",
        description: err.message || "Impossible d'ajouter le rendez-vous.",
        variant: "destructive",
      });
      throw err;
    }
  };

  const updateAppointment = async (id, updates) => {
    try {
      // 🔥 Récupérer l'appointment actuel pour comparer les changements
      const currentAppointment = appointments.find(apt => apt.id === id);
      
      const dbUpdates = {};
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.startTime !== undefined) dbUpdates.start_time = updates.startTime;
      if (updates.endTime !== undefined) dbUpdates.end_time = updates.endTime;
      if (updates.contactId !== undefined) dbUpdates.contact_id = updates.contactId;
      // � updates.assignedUserId est un auth UUID (users.user_id) - pas de conversion nécessaire
      if (updates.assignedUserId !== undefined) dbUpdates.assigned_user_id = updates.assignedUserId;
      if (updates.projectId !== undefined) dbUpdates.project_id = updates.projectId;
      if (updates.step !== undefined) dbUpdates.step = updates.step;
      if (updates.type !== undefined) dbUpdates.type = updates.type;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.share !== undefined) dbUpdates.share = updates.share;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
      if (updates.location !== undefined) dbUpdates.location = updates.location;

      const { data, error: updateError } = await supabase
        .from('appointments')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      setAppointments(prev =>
        prev.map(apt =>
          apt.id === id
            ? {
                id: data.id,
                title: data.title,
                start: data.start_time,  // Utiliser "start" pas "startTime"
                end: data.end_time,      // Utiliser "end" pas "endTime"
                contactId: data.contact_id,
                assignedUserId: data.assigned_user_id,
                projectId: data.project_id,
                step: data.step,
                type: data.type,
                status: data.status,
                share: data.share,
                notes: data.notes,
                location: data.location,
                createdAt: data.created_at,
                updatedAt: data.updated_at,
              }
            : apt
        )
      );

      // 🔥 Journalisation dans project_history (uniquement si changement métier)
      if (data.project_id && data.contact_id && currentAppointment) {
        try {
          // Détecter les changements métier (pas juste des updates techniques)
          const hasStatusChange = updates.status !== undefined && 
                                 currentAppointment.status !== data.status;
          const hasDateChange = (updates.startTime !== undefined || updates.endTime !== undefined) &&
                               (currentAppointment.start !== data.start_time || 
                                currentAppointment.end !== data.end_time);
          const hasOtherChange = updates.step !== undefined || 
                                updates.notes !== undefined ||
                                updates.location !== undefined;

          // 🔥 CRITICAL: Mettre à jour l'entrée project_history existante avec le nouveau statut
          if (hasStatusChange) {
            try {
              const { error: updateHistoryError } = await supabase
                .from('project_history')
                .update({
                  metadata: supabase.raw(`
                    jsonb_set(
                      metadata,
                      '{status}',
                      '"${data.status}"'::jsonb,
                      true
                    )
                  `)
                })
                .eq('prospect_id', data.contact_id)
                .eq('project_type', data.project_id)
                .contains('metadata', { appointment_id: id });

              if (updateHistoryError) {
                logger.error('⚠️ Erreur update metadata.status dans project_history', {
                  error: updateHistoryError.message,
                });
              } else {
                logger.debug('✅ Metadata.status synchronisé dans project_history existant', {
                  appointmentId: id,
                  newStatus: data.status,
                });
              }
            } catch (syncError) {
              logger.error('⚠️ Erreur sync status dans project_history (non-bloquant)', {
                error: syncError.message,
              });
            }
          }

          // Ne journaliser que si changement significatif
          if (hasStatusChange || hasDateChange || hasOtherChange) {
            let description = 'Activité mise à jour : ';
            const changes = [];

            if (hasStatusChange) {
              const statusLabels = {
                'pending': 'En attente',
                'effectue': 'Effectué',
                'annule': 'Annulé',
                'reporte': 'Reporté',
              };
              changes.push(`statut changé en "${statusLabels[data.status] || data.status}"`);
            }

            if (hasDateChange) {
              const newDate = new Date(data.start_time);
              const formattedDate = newDate.toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: 'long',
                hour: '2-digit',
                minute: '2-digit'
              });
              changes.push(`reprogrammé le ${formattedDate}`);
            }

            if (hasOtherChange && !hasStatusChange && !hasDateChange) {
              changes.push('informations modifiées');
            }

            description += changes.join(', ');

            const { data: { user } } = await supabase.auth.getUser();

            // 🔥 Utiliser addProjectEvent qui accepte projectType et prospectId en paramètres
            await addProjectEvent({
              prospectId: data.contact_id,
              projectType: data.project_id,
              title: 'Activité mise à jour',
              description,
              metadata: {
                event_type: 'activity',
                activity_type: data.type,
                appointment_id: data.id,
                start_time: data.start_time,
                end_time: data.end_time,
                status: data.status,
                step: data.step,
                changes: {
                  status: hasStatusChange ? { 
                    from: currentAppointment.status, 
                    to: data.status 
                  } : undefined,
                  date: hasDateChange ? {
                    from: currentAppointment.start,
                    to: data.start_time
                  } : undefined,
                },
                source: 'agenda',
              },
              createdBy: user?.id || null,
              createdByName: activeAdminUser?.name || 'Système',
            });

            logger.debug('✅ Modification activité journalisée dans project_history', {
              appointmentId: data.id,
              changes: { hasStatusChange, hasDateChange, hasOtherChange },
            });
          }
        } catch (historyError) {
          logger.error('⚠️ Erreur journalisation project_history (non-bloquant)', {
            error: historyError.message,
            appointmentId: data.id,
          });
        }
      }

      return data;
    } catch (err) {
      logger.error('Erreur update appointment:', { error: err.message });
      toast({
        title: "Erreur",
        description: err.message || "Impossible de modifier le rendez-vous.",
        variant: "destructive",
      });
      throw err;
    }
  };

  const deleteAppointment = async (id) => {
    try {
      // 🔥 Récupérer l'appointment avant suppression pour la journalisation
      const appointmentToDelete = appointments.find(apt => apt.id === id);
      
      const { error: deleteError } = await supabase
        .from('appointments')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setAppointments(prev => prev.filter(apt => apt.id !== id));

      toast({
        title: "Succès",
        description: "Rendez-vous supprimé avec succès !",
        className: "bg-green-500 text-white",
      });

      // 🔥 Journalisation dans project_history
      if (appointmentToDelete?.projectId && appointmentToDelete?.contactId) {
        try {
          const activityTypeLabel = appointmentToDelete.type === 'physical' ? 'RDV Physique' : 
                                   appointmentToDelete.type === 'virtual' ? 'RDV Visio' :
                                   appointmentToDelete.type === 'call' ? 'Appel' : 'Tâche';

          const { data: { user } } = await supabase.auth.getUser();

          // 🔥 Utiliser addProjectEvent qui accepte projectType et prospectId en paramètres
          await addProjectEvent({
            prospectId: appointmentToDelete.contactId,
            projectType: appointmentToDelete.projectId,
            title: 'Activité supprimée',
            description: `${activityTypeLabel} supprimé de l'agenda`,
            metadata: {
              event_type: 'activity',
              activity_type: appointmentToDelete.type,
              appointment_id: id,
              deleted_at: new Date().toISOString(),
              source: 'agenda',
            },
            createdBy: user?.id || null,
            createdByName: activeAdminUser?.name || 'Système',
          });

          logger.debug('✅ Suppression activité journalisée dans project_history', {
            appointmentId: id,
            type: appointmentToDelete.type,
          });
        } catch (historyError) {
          logger.error('⚠️ Erreur journalisation project_history (non-bloquant)', {
            error: historyError.message,
            appointmentId: id,
          });
        }
      }
    } catch (err) {
      logger.error('Erreur suppression appointment:', { error: err.message });
      toast({
        title: "Erreur",
        description: err.message || "Impossible de supprimer le rendez-vous.",
        variant: "destructive",
      });
      throw err;
    }
  };

  // ==================== COMPUTED VALUES ====================
  // Filtrer appointments par type pour retrocompatibilité
  const calls = appointments.filter(apt => apt.type === 'call');
  const tasks = appointments.filter(apt => apt.type === 'task');

  return {
    // Data
    appointments,
    calls, // Filtrés depuis appointments (type === 'call')
    tasks, // Filtrés depuis appointments (type === 'task')
    loading,
    error,
    
    // CRUD unifié via appointments
    addAppointment,
    updateAppointment,
    deleteAppointment,
    
    // Aliases pour retrocompatibilité (utilisent addAppointment en interne)
    addCall: addAppointment,
    updateCall: updateAppointment,
    deleteCall: deleteAppointment,
    addTask: addAppointment,
    updateTask: updateAppointment,
    deleteTask: deleteAppointment,
    
    // Refetch
    refetchAll: fetchAllData,
  };
};
