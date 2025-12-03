import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { logger } from '@/lib/logger';

/**
 * Hook pour gérer les prompts Charly AI via Supabase
 * Table: prompts
 */
export function useSupabasePrompts() {
  const [prompts, setPrompts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Transformation Supabase → App (object avec prompt_id comme clé)
  const transformFromDB = (dbPrompts) => {
    const promptsObject = {};
    dbPrompts.forEach(prompt => {
      promptsObject[prompt.prompt_id] = {
        id: prompt.prompt_id,
        name: prompt.name,
        tone: prompt.tone,
        projectId: prompt.project_id,
        stepsConfig: prompt.steps_config || {},
        createdAt: new Date(prompt.created_at).getTime(),
        updatedAt: new Date(prompt.updated_at).getTime(),
      };
    });
    return promptsObject;
  };

  // Charger les prompts
  useEffect(() => {
    const fetchPrompts = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('prompts')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        const transformed = transformFromDB(data || []);
        logger.debug('Prompts loaded', { count: Object.keys(transformed).length });
        setPrompts(transformed);
        setError(null);
      } catch (err) {
        console.error('❌ Error loading prompts:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPrompts();

    // Real-time subscription
    logger.debug('Setting up real-time subscription for prompts');
    const channel = supabase
      .channel(`prompts-changes-${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'prompts',
        },
        (payload) => {
          logger.debug('Real-time prompts event', { eventType: payload.eventType });

          if (payload.eventType === 'INSERT') {
            const newPrompt = payload.new;
            setPrompts((prev) => ({
              ...prev,
              [newPrompt.prompt_id]: {
                id: newPrompt.prompt_id,
                name: newPrompt.name,
                tone: newPrompt.tone,
                projectId: newPrompt.project_id,
                stepsConfig: newPrompt.steps_config || {},
                createdAt: new Date(newPrompt.created_at).getTime(),
                updatedAt: new Date(newPrompt.updated_at).getTime(),
              },
            }));
          } else if (payload.eventType === 'UPDATE') {
            const updatedPrompt = payload.new;
            setPrompts((prev) => ({
              ...prev,
              [updatedPrompt.prompt_id]: {
                id: updatedPrompt.prompt_id,
                name: updatedPrompt.name,
                tone: updatedPrompt.tone,
                projectId: updatedPrompt.project_id,
                stepsConfig: updatedPrompt.steps_config || {},
                createdAt: new Date(updatedPrompt.created_at).getTime(),
                updatedAt: new Date(updatedPrompt.updated_at).getTime(),
              },
            }));
          } else if (payload.eventType === 'DELETE') {
            setPrompts((prev) => {
              const updated = { ...prev };
              delete updated[payload.old.prompt_id];
              return updated;
            });
          }
        }
      )
      .subscribe((status) => {
        logger.debug('Prompts subscription status', { status });
      });

    return () => {
      logger.debug('Unsubscribing from prompts real-time');
      supabase.removeChannel(channel);
    };
  }, []);

  // Ajouter/mettre à jour un prompt
  const savePrompt = async (promptId, promptData) => {
    try {
      const dbPayload = {
        prompt_id: promptId,
        name: promptData.name,
        tone: promptData.tone,
        project_id: promptData.projectId,
        steps_config: promptData.stepsConfig || {},
      };

      const { data, error } = await supabase
        .from('prompts')
        .upsert(dbPayload, { onConflict: 'prompt_id' })
        .select()
        .single();

      if (error) throw error;

      logger.debug('Prompt saved to Supabase', { promptId: data?.prompt_id });
      return { success: true, data };
    } catch (err) {
      console.error('Error saving prompt:', err);
      return { success: false, error: err.message };
    }
  };

  // Supprimer un prompt
  const deletePrompt = async (promptId) => {
    try {
      const { error } = await supabase
        .from('prompts')
        .delete()
        .eq('prompt_id', promptId);

      if (error) throw error;

      logger.debug('Prompt deleted from Supabase', { promptId });
      return { success: true };
    } catch (err) {
      console.error('❌ Error deleting prompt:', err);
      return { success: false, error: err.message };
    }
  };

  return {
    prompts,
    loading,
    error,
    savePrompt,
    deletePrompt,
  };
}
