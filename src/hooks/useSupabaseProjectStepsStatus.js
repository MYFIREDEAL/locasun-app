import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Hook Supabase pour gérer les étapes de projets par prospect
 * 
 * Fonctionnalités :
 * - Lecture des steps d'un prospect pour un projet donné
 * - Mise à jour des steps (avancement, statut)
 * - Sync real-time entre admins
 * 
 * Table Supabase : project_steps_status
 * Clé unique : (prospect_id, project_type)
 * Remplace : localStorage 'evatime_project_steps_status'
 */
export function useSupabaseProjectStepsStatus(prospectId) {
  const [projectStepsStatus, setProjectStepsStatus] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isLocalUpdate = useRef(false);

  /**
   * ✅ CHARGER LES STEPS AU MONTAGE
   */
  useEffect(() => {
    if (prospectId) {
      fetchProjectStepsStatus();
    }
  }, [prospectId]);

  /**
   * ✅ ÉCOUTER LES CHANGEMENTS REAL-TIME
   */
  useEffect(() => {
    if (!prospectId) return;

    const channel = supabase
      .channel(`project-steps-${prospectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_steps_status',
          filter: `prospect_id=eq.${prospectId}`
        },
        (payload) => {
          if (isLocalUpdate.current) {
            isLocalUpdate.current = false;
            return;
          }

          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            setProjectStepsStatus(prev => ({
              ...prev,
              [payload.new.project_type]: payload.new.steps
            }));
          } else if (payload.eventType === 'DELETE') {
            setProjectStepsStatus(prev => {
              const { [payload.old.project_type]: _, ...rest } = prev;
              return rest;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [prospectId]);

  /**
   * 📥 RÉCUPÉRER TOUS LES STEPS D'UN PROSPECT
   */
  const fetchProjectStepsStatus = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('project_steps_status')
        .select('*')
        .eq('prospect_id', prospectId);

      if (fetchError) throw fetchError;

      // Transformer en objet { projectType: steps[] }
      const stepsMap = (data || []).reduce((acc, item) => {
        acc[item.project_type] = item.steps;
        return acc;
      }, {});

      setProjectStepsStatus(stepsMap);
    } catch (err) {
      console.error('❌ Erreur fetch project steps:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * ✏️ METTRE À JOUR LES STEPS D'UN PROJET
   */
  const updateProjectSteps = async (projectType, steps) => {
    try {
      isLocalUpdate.current = true;

      // Upsert (INSERT ou UPDATE selon si existe déjà)
      const { data, error: upsertError } = await supabase
        .from('project_steps_status')
        .upsert(
          {
            prospect_id: prospectId,
            project_type: projectType,
            steps: steps,
            updated_at: new Date().toISOString()
          },
          {
            onConflict: 'prospect_id,project_type'
          }
        )
        .select()
        .single();

      if (upsertError) throw upsertError;

      setProjectStepsStatus(prev => ({
        ...prev,
        [projectType]: steps
      }));

      return data;
    } catch (err) {
      console.error('❌ Erreur update project steps:', err);
      isLocalUpdate.current = false;
      throw err;
    }
  };

  /**
   * 🗑️ SUPPRIMER LES STEPS D'UN PROJET
   */
  const deleteProjectSteps = async (projectType) => {
    try {
      isLocalUpdate.current = true;

      const { error: deleteError } = await supabase
        .from('project_steps_status')
        .delete()
        .eq('prospect_id', prospectId)
        .eq('project_type', projectType);

      if (deleteError) throw deleteError;

      setProjectStepsStatus(prev => {
        const { [projectType]: _, ...rest } = prev;
        return rest;
      });
    } catch (err) {
      console.error('❌ Erreur delete project steps:', err);
      isLocalUpdate.current = false;
      throw err;
    }
  };

  /**
   * 🔄 REFRESH MANUEL
   */
  const refresh = () => {
    if (prospectId) {
      fetchProjectStepsStatus();
    }
  };

  return {
    projectStepsStatus,
    loading,
    error,
    updateProjectSteps,
    deleteProjectSteps,
    refresh
  };
}
