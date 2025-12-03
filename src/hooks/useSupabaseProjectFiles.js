import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { v4 as uuidv4 } from "uuid";
import { logger } from '@/lib/logger';

export function useSupabaseProjectFiles({ projectType, prospectId, enabled = true }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);

  const fetchFiles = useCallback(async () => {
    if (!projectType || !enabled) return;

    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from("project_files")
        .select("*")
        .eq("project_type", projectType)
        .order("created_at", { ascending: false });

      if (prospectId) {
        query = query.eq("prospect_id", prospectId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setFiles(data || []);

    } catch (err) {
      logger.error("Error fetching project files:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [projectType, prospectId, enabled]);

  useEffect(() => {
    if (!projectType || !enabled) return;

    fetchFiles();

    const channel = supabase
      .channel(`project-files-${projectType}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "project_files",
          filter: `project_type=eq.${projectType}`,
        },
        (payload) => {
          logger.debug('Realtime event', { eventType: payload.eventType });
          
          setFiles((current) => {
            const { eventType, new: newRow, old: oldRow } = payload;

            if (eventType === "INSERT") {
              return [newRow, ...current];
            }
            
            if (eventType === "DELETE") {
              const idToDelete = oldRow?.id || payload.old?.id;
              logger.debug('Deleting file', { id: idToDelete });
              return current.filter((f) => f.id !== idToDelete);
            }
            
            if (eventType === "UPDATE") {
              return current.map((f) => (f.id === newRow.id ? newRow : f));
            }
            
            return current;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectType, enabled, fetchFiles]);


  // Upload
  const uploadFile = useCallback(
    async ({ file, uploadedBy }) => {
      if (!file || !projectType) return;

      try {
        setUploading(true);
        setError(null);

        const ext = file.name.split(".").pop();
        const newName = `${uuidv4()}.${ext}`;
        const storagePath = `${projectType}/${newName}`;

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
              project_type: projectType,
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
        logger.error("Error uploading file:", err);
        setError(err.message);
        throw err;
      } finally {
        setUploading(false);
      }
    },
    [projectType, prospectId]
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
        logger.error("Error deleting file:", err);
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
