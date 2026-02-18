import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Hook pour charger TOUS les project_steps_status
 * Utilisé dans le pipeline pour afficher les étapes correctes sur les cartes
 * @param {string} organizationId - ID de l'organisation pour filtrage multi-tenant
 * @param {boolean} enabled - Activer/désactiver le hook
 */
export function useSupabaseAllProjectSteps(organizationId, enabled = true) {
  const [allProjectSteps, setAllProjectSteps] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enabled || !organizationId) return;

    const fetchAllSteps = async () => {
      try {
        const { data, error } = await supabase
          .from('project_steps_status')
          .select('prospect_id, project_type, steps');

        if (error) throw error;

        // Transformer en Map: { 'prospectId-projectType': steps[] }
        const stepsMap = {};
        (data || []).forEach(item => {
          const key = `${item.prospect_id}-${item.project_type}`;
          stepsMap[key] = item.steps;
        });

        setAllProjectSteps(stepsMap);
      } catch (err) {
        logger.error('❌ Error loading all project steps:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllSteps();

    // Real-time listener pour les changements
    const channel = supabase
      .channel(`all-project-steps-${organizationId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'project_steps_status',
        filter: `organization_id=eq.${organizationId}`
      }, (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const key = `${payload.new.prospect_id}-${payload.new.project_type}`;
          setAllProjectSteps(prev => ({
            ...prev,
            [key]: payload.new.steps
          }));
        } else if (payload.eventType === 'DELETE') {
          const key = `${payload.old.prospect_id}-${payload.old.project_type}`;
          setAllProjectSteps(prev => {
            const { [key]: _, ...rest } = prev;
            return rest;
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, organizationId]);

  return { allProjectSteps, loading };
}
