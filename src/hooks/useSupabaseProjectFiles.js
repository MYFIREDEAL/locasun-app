import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { v4 as uuidv4 } from "uuid";

export function useSupabaseProjectFiles({ projectId, prospectId, enabled = true }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);

  const fetchFiles = useCallback(async () => {
    if (!projectId || !enabled) return;

    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from("project_files")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (prospectId) {
        query = query.eq("prospect_id", prospectId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setFiles(data || []);

    } catch (err) {
      console.error("Error fetching project files:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [projectId, prospectId, enabled]);

  useEffect(() => {
    if (!projectId || !enabled) return;

    fetchFiles();

    const channel = supabase
      .channel(`project-files-${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "project_files",
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          setFiles((current) => {
            const { eventType, new: newRow, old: oldRow } = payload;

            if (eventType === "INSERT") return [newRow, ...current];
            if (eventType === "DELETE") return current.filter((f) => f.id !== oldRow.id);
            return current;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, enabled, fetchFiles]);


  // Upload
  const uploadFile = useCallback(
    async ({ file, uploadedBy }) => {
      if (!file || !projectId) return;

      try {
        setUploading(true);
        setError(null);

        const ext = file.name.split(".").pop();
        const newName = `${uuidv4()}.${ext}`;
        const storagePath = `${projectId}/${newName}`;

        // 1. Upload dans Storage
        const { error: uploadError } = await supabase.storage
          .from("project-files")
          .upload(storagePath, file);

        if (uploadError) throw uploadError;

        // 2. Insert dans la table
        const { data, error } = await supabase
          .from("project_files")
          .insert([
            {
              project_id: projectId,
              prospect_id: prospectId || null,
              file_name: file.name,
              file_type: file.type,
              file_size: file.size,
              storage_path: storagePath,
              uploaded_by: uploadedBy || null,
            },
          ])
          .select()
          .single();

        if (error) throw error;
        return data;

      } catch (err) {
        console.error("Error uploading file:", err);
        setError(err.message);
        throw err;
      } finally {
        setUploading(false);
      }
    },
    [projectId, prospectId]
  );


  // Delete
  const deleteFile = useCallback(
    async (id, storagePath) => {
      if (!id || !storagePath) return;

      try {
        setDeleting(true);
        setError(null);

        // 1. Delete dans storage
        const { error: storageError } = await supabase.storage
          .from("project-files")
          .remove([storagePath]);

        if (storageError) throw storageError;

        // 2. Delete dans la table
        const { error } = await supabase
          .from("project_files")
          .delete()
          .eq("id", id);

        if (error) throw error;

      } catch (err) {
        console.error("Error deleting file:", err);
        setError(err.message);
        throw err;
      } finally {
        setDeleting(false);
      }
    },
    []
  );

  return {
    files,
    loading,
    uploading,
    deleting,
    error,
    uploadFile,
    deleteFile,
    refetch: fetchFiles,
  };
}
