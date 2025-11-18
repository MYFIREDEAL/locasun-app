import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Hook Supabase pour gérer les colonnes du pipeline global (Kanban)
 * 
 * Fonctionnalités :
 * - Lecture des colonnes du pipeline (MARKET, ETUDE, OFFRE, etc.)
 * - Création/modification/suppression de colonnes (Global Admin uniquement)
 * - Réorganisation des colonnes (drag & drop)
 * - Sync real-time entre tous les admins connectés
 * 
 * Table Supabase : global_pipeline_steps
 * Structure : { id, step_id, label, color, position, created_at, updated_at }
 */
export function useSupabaseGlobalPipeline() {
  const [globalPipelineSteps, setGlobalPipelineSteps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isLocalUpdate = useRef(false);

  /**
   * ✅ CHARGER LES COLONNES DU PIPELINE AU MONTAGE
   */
  useEffect(() => {
    fetchGlobalPipelineSteps();
  }, []);

  /**
   * ✅ ÉCOUTER LES CHANGEMENTS REAL-TIME
   */
  useEffect(() => {
    const channel = supabase
      .channel('global-pipeline-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'global_pipeline_steps'
        },
        (payload) => {
          // Ignorer si c'est une mise à jour locale
          if (isLocalUpdate.current) {
            isLocalUpdate.current = false;
            return;
          }

          if (payload.eventType === 'INSERT') {
            setGlobalPipelineSteps(prev => {
              const exists = prev.find(s => s.id === payload.new.id);
              if (exists) return prev;
              return [...prev, payload.new].sort((a, b) => a.position - b.position);
            });
          } else if (payload.eventType === 'UPDATE') {
            setGlobalPipelineSteps(prev =>
              prev.map(step =>
                step.id === payload.new.id ? payload.new : step
              ).sort((a, b) => a.position - b.position)
            );
          } else if (payload.eventType === 'DELETE') {
            setGlobalPipelineSteps(prev =>
              prev.filter(step => step.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  /**
   * 📥 RÉCUPÉRER TOUTES LES COLONNES DU PIPELINE
   */
  const fetchGlobalPipelineSteps = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('global_pipeline_steps')
        .select('*')
        .order('position', { ascending: true });

      if (fetchError) throw fetchError;

      setGlobalPipelineSteps(data || []);
    } catch (err) {
      console.error('❌ Erreur fetch global pipeline steps:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * ➕ CRÉER UNE NOUVELLE COLONNE
   * @param {string} label - Nom de la colonne (ex: "SIGNATURE")
   * @param {string} color - Classe CSS Tailwind (ex: "bg-purple-100")
   * @returns {Promise<object>} - La colonne créée
   */
  const addStep = async (label, color = 'bg-gray-100') => {
    try {
      isLocalUpdate.current = true;

      // Calculer la prochaine position
      const maxPosition = globalPipelineSteps.length > 0
        ? Math.max(...globalPipelineSteps.map(s => s.position))
        : -1;
      const newPosition = maxPosition + 1;

      // Générer un step_id unique
      const step_id = `global-pipeline-step-${Date.now()}`;

      const { data, error: insertError } = await supabase
        .from('global_pipeline_steps')
        .insert([
          {
            step_id,
            label,
            color,
            position: newPosition
          }
        ])
        .select()
        .single();

      if (insertError) throw insertError;

      // Mise à jour immédiate du state local
      setGlobalPipelineSteps(prev => [...prev, data].sort((a, b) => a.position - b.position));

      return data;
    } catch (err) {
      console.error('❌ Erreur création colonne pipeline:', err);
      isLocalUpdate.current = false;
      throw err;
    }
  };

  /**
   * ✏️ MODIFIER UNE COLONNE EXISTANTE
   * @param {string} id - UUID de la colonne
   * @param {object} updates - { label?, color?, position? }
   * @returns {Promise<object>} - La colonne modifiée
   */
  const updateStep = async (id, updates) => {
    try {
      isLocalUpdate.current = true;

      const { data, error: updateError } = await supabase
        .from('global_pipeline_steps')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Mise à jour immédiate du state local
      setGlobalPipelineSteps(prev =>
        prev.map(step => (step.id === id ? data : step)).sort((a, b) => a.position - b.position)
      );

      return data;
    } catch (err) {
      console.error('❌ Erreur modification colonne pipeline:', err);
      isLocalUpdate.current = false;
      throw err;
    }
  };

  /**
   * 🗑️ SUPPRIMER UNE COLONNE
   * @param {string} id - UUID de la colonne
   * @returns {Promise<void>}
   */
  const deleteStep = async (id) => {
    try {
      isLocalUpdate.current = true;

      const { error: deleteError } = await supabase
        .from('global_pipeline_steps')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      // Mise à jour immédiate du state local
      setGlobalPipelineSteps(prev => prev.filter(step => step.id !== id));
    } catch (err) {
      console.error('❌ Erreur suppression colonne pipeline:', err);
      isLocalUpdate.current = false;
      throw err;
    }
  };

  /**
   * 🔄 RÉORGANISER LES COLONNES (drag & drop)
   * @param {Array<object>} newOrder - Tableau des colonnes avec nouvelles positions
   * @returns {Promise<void>}
   */
  const reorderSteps = async (newOrder) => {
    try {
      isLocalUpdate.current = true;

      // Mettre à jour toutes les positions en batch
      const updates = newOrder.map((step, index) => ({
        id: step.id,
        position: index
      }));

      // Supabase ne supporte pas les updates en batch, on fait une boucle
      for (const update of updates) {
        const { error: updateError } = await supabase
          .from('global_pipeline_steps')
          .update({ position: update.position })
          .eq('id', update.id);

        if (updateError) throw updateError;
      }

      // Mise à jour immédiate du state local
      setGlobalPipelineSteps(newOrder);
    } catch (err) {
      console.error('❌ Erreur réorganisation colonnes pipeline:', err);
      isLocalUpdate.current = false;
      throw err;
    }
  };

  return {
    globalPipelineSteps,
    loading,
    error,
    addStep,
    updateStep,
    deleteStep,
    reorderSteps,
    refresh: fetchGlobalPipelineSteps
  };
}
