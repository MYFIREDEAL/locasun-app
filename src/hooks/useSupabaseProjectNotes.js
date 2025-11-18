import { useEffect, useState, useCallback } from "react";
import { supabase } from "../supabaseClient";

export function useSupabaseProjectNotes({ projectId, prospectId, enabled = true }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const fetchNotes = useCallback(async () => {
    if (!projectId || !enabled) return;

    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from("project_notes")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (prospectId) {
        query = query.eq("prospect_id", prospectId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setNotes(data || []);
    } catch (err) {
      console.error("Error fetching project notes:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [projectId, prospectId, enabled]);

  useEffect(() => {
    if (!projectId || !enabled) return;

    fetchNotes();

    const channel = supabase
      .channel(`project-notes-${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "project_notes",
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          setNotes((current) => {
            const { eventType, new: newRow, old: oldRow } = payload;

            if (eventType === "INSERT") {
              return [newRow, ...current];
            }

            if (eventType === "UPDATE") {
              return current.map((note) =>
                note.id === newRow.id ? newRow : note
              );
            }

            if (eventType === "DELETE") {
              return current.filter((note) => note.id !== oldRow.id);
            }

            return current;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, enabled, fetchNotes]);

  const addNote = useCallback(
    async ({ content, createdBy }) => {
      if (!projectId || !content?.trim()) return;

      try {
        setSaving(true);
        setError(null);

        const { data, error } = await supabase
          .from("project_notes")
          .insert([
            {
              project_id: projectId,
              prospect_id: prospectId || null,
              content: content.trim(),
              created_by: createdBy || null,
            },
          ])
          .select()
          .single();

        if (error) throw error;
        setNotes((prev) => [data, ...prev]);
        return data;
      } catch (err) {
        console.error("Error adding project note:", err);
        setError(err.message);
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [projectId, prospectId]
  );

  const updateNote = useCallback(async (id, { content }) => {
    if (!id || !content?.trim()) return;

    try {
      setSaving(true);
      setError(null);

      const { data, error } = await supabase
        .from("project_notes")
        .update({
          content: content.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      setNotes((prev) => prev.map((n) => (n.id === id ? data : n)));
      return data;
    } catch (err) {
      console.error("Error updating project note:", err);
      setError(err.message);
      throw err;
    } finally {
      setSaving(false);
    }
  }, []);

  const deleteNote = useCallback(async (id) => {
    if (!id) return;

    try {
      setSaving(true);
      setError(null);

      const { error } = await supabase
        .from("project_notes")
        .delete()
        .eq("id", id);

      if (error) throw error;
      setNotes((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error("Error deleting project note:", err);
      setError(err.message);
      throw err;
    } finally {
      setSaving(false);
    }
  }, []);

  return {
    notes,
    loading,
    saving,
    error,
    addNote,
    updateNote,
    deleteNote,
    refetch: fetchNotes,
  };
}
