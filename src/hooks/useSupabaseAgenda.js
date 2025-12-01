import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';

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
      console.error('Erreur chargement appointments:', err);
      throw err;
    }
  };

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError(null);
      await fetchAppointments();
    } catch (err) {
      console.error('Erreur chargement agenda:', err);
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
          assigned_user_id: assignedUserId,  // 🔥 users.id (UUID PK) - FK vers users(id)
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

      return transformed;
    } catch (err) {
      console.error('Erreur ajout appointment:', err);
      console.error('Détails erreur:', JSON.stringify(err, null, 2));
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

      return data;
    } catch (err) {
      console.error('Erreur update appointment:', err);
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
    } catch (err) {
      console.error('Erreur suppression appointment:', err);
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
