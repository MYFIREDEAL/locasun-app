import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { logger } from '@/lib/logger';

export function useSupabaseProjectHistory({ projectType, prospectId, enabled = true }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const fetchHistory = useCallback(async () => {
    if (!projectType || !enabled) return;

    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from("project_history")
        .select("*")
        .eq("project_type", projectType)
        .order("created_at", { ascending: false });

      if (prospectId) {
        query = query.eq("prospect_id", prospectId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setHistory(data || []);

    } catch (err) {
      logger.error('Erreur récupération project history:', { error: err.message });
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [projectType, prospectId, enabled]);

  useEffect(() => {
    if (!projectType || !enabled) return;

    fetchHistory();

    const channel = supabase
      .channel(`project-history-${projectType}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "project_history",
          filter: `project_type=eq.${projectType}`,
        },
        (payload) => {
          setHistory((current) => [payload.new, ...current]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectType, enabled, fetchHistory]);


  const addHistoryEvent = useCallback(
    async ({ event_type, title, description, metadata, createdBy, createdByName }) => {
      if (!projectType || !event_type) return;

      try {
        setSaving(true);
        setError(null);

        const { data, error } = await supabase
          .from("project_history")
          .insert([
            {
              project_type: projectType,
              prospect_id: prospectId || null,
              event_type,
              title,
              description,
              metadata,
              created_by: createdBy || null,
              created_by_name: createdByName || null,
            },
          ])
          .select()
          .single();

        if (error) throw error;
        return data;

      } catch (err) {
        logger.error('Erreur ajout history event:', { error: err.message });
        setError(err.message);
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [projectType, prospectId]
  );

  // 🔥 AJOUT: Fonction simplifiée pour ajouter un événement projet
  const addProjectEvent = useCallback(
    async ({ prospectId, projectType, title, description, metadata, createdBy, createdByName }) => {
      if (!projectType || !prospectId) {
        logger.error('prospectId and projectType required');
        return { success: false, error: 'Paramètres manquants' };
      }

      try {
        logger.debug('Adding project event', { prospectId, projectType, title });

        // 🔥 Extraire event_type depuis metadata si présent, sinon utiliser 'form_event' par défaut
        const eventType = metadata?.event_type || 'form_event';

        const { data, error } = await supabase
          .from("project_history")
          .insert([
            {
              project_type: projectType,
              prospect_id: prospectId,
              event_type: eventType,
              title,
              description,
              metadata: metadata || null,
              created_by: createdBy || null,
              created_by_name: createdByName || createdBy || null,
            },
          ])
          .select()
          .single();

        if (error) {
          logger.error('Supabase error:', error.message);
          throw error;
        }

        logger.debug('Project event created', { eventId: data.id });
        return { success: true, data };

      } catch (err) {
        logger.error('[addProjectEvent] Exception:', { error: err.message || err });
        return { success: false, error: err.message || 'Erreur inconnue' };
      }
    },
    []
  );

  return {
    history,
    loading,
    saving,
    error,
    addHistoryEvent,
    addProjectEvent, // 🔥 AJOUT: Nouvelle fonction simplifiée
    refetch: fetchHistory,
  };
}
