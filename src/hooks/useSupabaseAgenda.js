import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';

/**
 * Hook personnalisé pour gérer l'agenda via Supabase
 * Gère les appointments, calls et tasks
 */
export const useSupabaseAgenda = (activeAdminUser) => {
  const [appointments, setAppointments] = useState([]);
  const [calls, setCalls] = useState([]);
  const [tasks, setTasks] = useState([]);
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

  const fetchCalls = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('calls')
        .select('*')
        .order('date', { ascending: true });

      if (fetchError) throw fetchError;

      const transformed = (data || []).map(call => ({
        id: call.id,
        name: call.name,
        date: call.date,
        time: call.time,
        contactId: call.contact_id,
        assignedUserId: call.assigned_user_id,
        status: call.status,
        notes: call.notes,
        createdAt: call.created_at,
        updatedAt: call.updated_at,
      }));

      setCalls(transformed);
      return transformed;
    } catch (err) {
      console.error('Erreur chargement calls:', err);
      throw err;
    }
  };

  const fetchTasks = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('tasks')
        .select('*')
        .order('date', { ascending: true });

      if (fetchError) throw fetchError;

      const transformed = (data || []).map(task => ({
        id: task.id,
        text: task.text,
        date: task.date,
        contactId: task.contact_id,
        assignedUserId: task.assigned_user_id,
        done: task.done,
        notes: task.notes,
        createdAt: task.created_at,
        updatedAt: task.updated_at,
      }));

      setTasks(transformed);
      return transformed;
    } catch (err) {
      console.error('Erreur chargement tasks:', err);
      throw err;
    }
  };

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError(null);
      await Promise.all([
        fetchAppointments(),
        fetchCalls(),
        fetchTasks(),
      ]);
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
      // Récupérer l'UUID du user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!userData) throw new Error("User introuvable");

      // Valider que contact_id est un UUID valide ou null
      const contactId = appointmentData.contactId && 
                       appointmentData.contactId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
                       ? appointmentData.contactId 
                       : null;

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
          assigned_user_id: userData.id,  // 🔧 Toujours présent via userData
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

  // ==================== CALLS ====================

  const addCall = async (callData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!userData) throw new Error("User introuvable");

      const { data, error: insertError } = await supabase
        .from('calls')
        .insert([{
          name: callData.name,
          date: callData.date,
          time: callData.time,
          contact_id: callData.contactId || null,
          assigned_user_id: userData.id,
          status: callData.status || 'pending',
          notes: callData.notes || null,
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      const transformed = {
        id: data.id,
        name: data.name,
        date: data.date,
        time: data.time,
        contactId: data.contact_id,
        assignedUserId: data.assigned_user_id,
        status: data.status,
        notes: data.notes,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      setCalls(prev => [...prev, transformed]);

      toast({
        title: "Succès",
        description: "Appel ajouté avec succès !",
        className: "bg-green-500 text-white",
      });

      return transformed;
    } catch (err) {
      console.error('Erreur ajout call:', err);
      toast({
        title: "Erreur",
        description: err.message || "Impossible d'ajouter l'appel.",
        variant: "destructive",
      });
      throw err;
    }
  };

  const updateCall = async (id, updates) => {
    try {
      const dbUpdates = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.date !== undefined) dbUpdates.date = updates.date;
      if (updates.time !== undefined) dbUpdates.time = updates.time;
      if (updates.contactId !== undefined) dbUpdates.contact_id = updates.contactId;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes;

      const { data, error: updateError } = await supabase
        .from('calls')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      setCalls(prev =>
        prev.map(call =>
          call.id === id
            ? {
                id: data.id,
                name: data.name,
                date: data.date,
                time: data.time,
                contactId: data.contact_id,
                assignedUserId: data.assigned_user_id,
                status: data.status,
                notes: data.notes,
                createdAt: data.created_at,
                updatedAt: data.updated_at,
              }
            : call
        )
      );

      return data;
    } catch (err) {
      console.error('Erreur update call:', err);
      toast({
        title: "Erreur",
        description: err.message || "Impossible de modifier l'appel.",
        variant: "destructive",
      });
      throw err;
    }
  };

  const deleteCall = async (id) => {
    try {
      const { error: deleteError } = await supabase
        .from('calls')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setCalls(prev => prev.filter(call => call.id !== id));

      toast({
        title: "Succès",
        description: "Appel supprimé avec succès !",
        className: "bg-green-500 text-white",
      });
    } catch (err) {
      console.error('Erreur suppression call:', err);
      toast({
        title: "Erreur",
        description: err.message || "Impossible de supprimer l'appel.",
        variant: "destructive",
      });
      throw err;
    }
  };

  // ==================== TASKS ====================

  const addTask = async (taskData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!userData) throw new Error("User introuvable");

      const { data, error: insertError } = await supabase
        .from('tasks')
        .insert([{
          text: taskData.text,
          date: taskData.date,
          contact_id: taskData.contactId || null,
          assigned_user_id: userData.id,
          done: taskData.done || false,
          notes: taskData.notes || null,
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      const transformed = {
        id: data.id,
        text: data.text,
        date: data.date,
        contactId: data.contact_id,
        assignedUserId: data.assigned_user_id,
        done: data.done,
        notes: data.notes,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      setTasks(prev => [...prev, transformed]);

      toast({
        title: "Succès",
        description: "Tâche ajoutée avec succès !",
        className: "bg-green-500 text-white",
      });

      return transformed;
    } catch (err) {
      console.error('Erreur ajout task:', err);
      toast({
        title: "Erreur",
        description: err.message || "Impossible d'ajouter la tâche.",
        variant: "destructive",
      });
      throw err;
    }
  };

  const updateTask = async (id, updates) => {
    try {
      const dbUpdates = {};
      if (updates.text !== undefined) dbUpdates.text = updates.text;
      if (updates.date !== undefined) dbUpdates.date = updates.date;
      if (updates.contactId !== undefined) dbUpdates.contact_id = updates.contactId;
      if (updates.done !== undefined) dbUpdates.done = updates.done;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes;

      const { data, error: updateError } = await supabase
        .from('tasks')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      setTasks(prev =>
        prev.map(task =>
          task.id === id
            ? {
                id: data.id,
                text: data.text,
                date: data.date,
                contactId: data.contact_id,
                assignedUserId: data.assigned_user_id,
                done: data.done,
                notes: data.notes,
                createdAt: data.created_at,
                updatedAt: data.updated_at,
              }
            : task
        )
      );

      return data;
    } catch (err) {
      console.error('Erreur update task:', err);
      toast({
        title: "Erreur",
        description: err.message || "Impossible de modifier la tâche.",
        variant: "destructive",
      });
      throw err;
    }
  };

  const deleteTask = async (id) => {
    try {
      const { error: deleteError } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setTasks(prev => prev.filter(task => task.id !== id));

      toast({
        title: "Succès",
        description: "Tâche supprimée avec succès !",
        className: "bg-green-500 text-white",
      });
    } catch (err) {
      console.error('Erreur suppression task:', err);
      toast({
        title: "Erreur",
        description: err.message || "Impossible de supprimer la tâche.",
        variant: "destructive",
      });
      throw err;
    }
  };

  return {
    // Data
    appointments,
    calls,
    tasks,
    loading,
    error,
    
    // Appointments
    addAppointment,
    updateAppointment,
    deleteAppointment,
    
    // Calls
    addCall,
    updateCall,
    deleteCall,
    
    // Tasks
    addTask,
    updateTask,
    deleteTask,
    
    // Refetch
    refetchAll: fetchAllData,
  };
};
