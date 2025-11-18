import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";

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
      console.error("Error fetching project history:", err);
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
    async ({ event_type, title, description, metadata, createdBy }) => {
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
    [projectType, prospectId]
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
