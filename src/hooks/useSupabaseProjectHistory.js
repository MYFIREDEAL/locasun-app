import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";

export function useSupabaseProjectHistory({ projectId, prospectId, enabled = true }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const fetchHistory = useCallback(async () => {
    if (!projectId || !enabled) return;

    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from("project_history")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (prospectId) {
        query = query.eq("prospect_id", prospectId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setHistory(data || []);

    } catch (err) {
      console.error("Error fetching project history:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [projectId, prospectId, enabled]);

  useEffect(() => {
    if (!projectId || !enabled) return;

    fetchHistory();

    const channel = supabase
      .channel(`project-history-${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "project_history",
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          setHistory((current) => [payload.new, ...current]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, enabled, fetchHistory]);


  const addHistoryEvent = useCallback(
    async ({ event_type, title, description, metadata, createdBy }) => {
      if (!projectId || !event_type) return;

      try {
        setSaving(true);
        setError(null);

        const { data, error } = await supabase
          .from("project_history")
          .insert([
            {
              project_id: projectId,
              prospect_id: prospectId || null,
              event_type,
              title,
              description,
              metadata,
              created_by: createdBy || null,
            },
          ])
          .select()
          .single();

        if (error) throw error;
        return data;

      } catch (err) {
        console.error("Error adding history event:", err);
        setError(err.message);
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [projectId, prospectId]
  );

  return {
    history,
    loading,
    saving,
    error,
    addHistoryEvent,
    refetch: fetchHistory,
  };
}
