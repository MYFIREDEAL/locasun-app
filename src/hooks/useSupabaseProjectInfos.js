/**
 * 🔥 Hook Supabase pour gérer les informations de projets (project_infos)
 * 
 * Gère uniquement amount et status :
 * - amount: number (montant du deal en €)
 * - status: "actif" | "abandon" | "archive"
 * 
 * ⚠️ Les autres champs (ribFile, documents, notes, etc.) sont ignorés pour l'instant
 * 
 * @returns {Object} { projectInfos, getProjectInfo, updateProjectInfo, isLoading, error }
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export const useSupabaseProjectInfos = () => {
  // État local : structure { [prospectId]: { [projectType]: { amount, status } } }
  const [projectInfos, setProjectInfos] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Transforme les données Supabase (lignes plates) en structure imbriquée
   * @param {Array} rows - Lignes Supabase [{ prospect_id, project_type, data }]
   * @returns {Object} Structure { prospectId: { projectType: { amount, status } } }
   */
  const transformSupabaseToLocal = useCallback((rows) => {
    if (!rows || rows.length === 0) return {};

    const transformed = {};
    
    rows.forEach((row) => {
      const { prospect_id, project_type, data } = row;
      
      if (!prospect_id || !project_type) return;

      // Initialiser le prospect si nécessaire
      if (!transformed[prospect_id]) {
        transformed[prospect_id] = {};
      }

      // Extraire UNIQUEMENT amount et status du JSONB
      const projectData = {};
      if (data?.amount !== undefined && data.amount !== null) {
        projectData.amount = data.amount;
      }
      if (data?.status !== undefined && data.status !== null) {
        projectData.status = data.status;
      }

      transformed[prospect_id][project_type] = projectData;
    });

    return transformed;
  }, []);

  /**
   * Charge les project_infos depuis Supabase au montage
   */
  useEffect(() => {
    const fetchProjectInfos = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from('project_infos')
          .select('prospect_id, project_type, data')
          .order('created_at', { ascending: false });

        if (fetchError) {
          console.error('❌ Erreur chargement project_infos:', fetchError);
          setError(fetchError);
          return;
        }

        const transformed = transformSupabaseToLocal(data || []);
        setProjectInfos(transformed);
        console.log('✅ project_infos chargés depuis Supabase:', Object.keys(transformed).length, 'prospects');

      } catch (err) {
        console.error('❌ Erreur fetchProjectInfos:', err);
        setError(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjectInfos();
  }, [transformSupabaseToLocal]);

  /**
   * Écoute les changements en temps réel sur la table project_infos
   */
  useEffect(() => {
    const channel = supabase
      .channel('project_infos-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_infos'
        },
        (payload) => {
          console.log('🔄 Real-time project_infos:', payload.eventType, payload);

          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const { prospect_id, project_type, data } = payload.new;

            setProjectInfos((prev) => {
              const newState = { ...prev };
              
              if (!newState[prospect_id]) {
                newState[prospect_id] = {};
              }

              // Extraire UNIQUEMENT amount et status
              const projectData = {};
              if (data?.amount !== undefined && data.amount !== null) {
                projectData.amount = data.amount;
              }
              if (data?.status !== undefined && data.status !== null) {
                projectData.status = data.status;
              }

              newState[prospect_id][project_type] = projectData;
              
              return newState;
            });
          } else if (payload.eventType === 'DELETE') {
            const { prospect_id, project_type } = payload.old;

            setProjectInfos((prev) => {
              const newState = { ...prev };
              
              if (newState[prospect_id]?.[project_type]) {
                delete newState[prospect_id][project_type];
                
                // Supprimer le prospect si plus aucun projet
                if (Object.keys(newState[prospect_id]).length === 0) {
                  delete newState[prospect_id];
                }
              }
              
              return newState;
            });
          }
        }
      )
      .subscribe();

    return () => {
      console.log('🔌 Nettoyage canal real-time project_infos');
      supabase.removeChannel(channel);
    };
  }, []);

  /**
   * Récupère les infos d'un projet spécifique
   * @param {string} prospectId - UUID du prospect
   * @param {string} projectType - Type de projet (ex: "ACC", "Centrale")
   * @returns {Object} { amount?, status? } ou {} si aucune donnée
   */
  const getProjectInfo = useCallback((prospectId, projectType) => {
    if (!prospectId || !projectType) return {};
    return projectInfos?.[prospectId]?.[projectType] || {};
  }, [projectInfos]);

  /**
   * Met à jour les infos d'un projet dans Supabase
   * @param {string} prospectId - UUID du prospect
   * @param {string} projectType - Type de projet
   * @param {Function|Object} updater - Fonction (prev) => next ou objet direct
   */
  const updateProjectInfo = useCallback(async (prospectId, projectType, updater) => {
    if (!prospectId || !projectType) {
      console.warn('⚠️ updateProjectInfo: prospectId ou projectType manquant');
      return;
    }

    try {
      // 1. Calculer les nouvelles données
      const prevInfo = projectInfos?.[prospectId]?.[projectType] || {};
      const nextInfoRaw = typeof updater === 'function' 
        ? updater(prevInfo) 
        : { ...prevInfo, ...updater };

      // 2. Filtrer pour ne garder QUE amount et status
      const nextInfo = {};
      if (nextInfoRaw?.amount !== undefined) {
        nextInfo.amount = nextInfoRaw.amount;
      }
      if (nextInfoRaw?.status !== undefined) {
        nextInfo.status = nextInfoRaw.status;
      }

      // 3. Mettre à jour immédiatement le state local (optimistic update)
      setProjectInfos((prev) => {
        const newState = { ...prev };
        
        if (!newState[prospectId]) {
          newState[prospectId] = {};
        }

        // Si l'objet est vide, supprimer la clé
        if (Object.keys(nextInfo).length === 0) {
          delete newState[prospectId][projectType];
          
          // Supprimer le prospect si plus aucun projet
          if (Object.keys(newState[prospectId]).length === 0) {
            delete newState[prospectId];
          }
        } else {
          newState[prospectId][projectType] = nextInfo;
        }
        
        return newState;
      });

      // 4. Sauvegarder dans Supabase (upsert)
      const { error: upsertError } = await supabase
        .from('project_infos')
        .upsert(
          {
            prospect_id: prospectId,
            project_type: projectType,
            data: nextInfo
          },
          {
            onConflict: 'prospect_id,project_type'
          }
        );

      if (upsertError) {
        console.error('❌ Erreur upsert project_infos:', upsertError);
        throw upsertError;
      }

      console.log('✅ project_info mis à jour:', prospectId, projectType, nextInfo);

    } catch (err) {
      console.error('❌ Erreur updateProjectInfo:', err);
      
      // En cas d'erreur, recharger depuis Supabase pour synchroniser
      const { data } = await supabase
        .from('project_infos')
        .select('prospect_id, project_type, data')
        .eq('prospect_id', prospectId)
        .eq('project_type', projectType)
        .single();

      if (data) {
        setProjectInfos((prev) => {
          const newState = { ...prev };
          if (!newState[prospectId]) {
            newState[prospectId] = {};
          }
          
          const projectData = {};
          if (data.data?.amount !== undefined) projectData.amount = data.data.amount;
          if (data.data?.status !== undefined) projectData.status = data.data.status;
          
          newState[prospectId][projectType] = projectData;
          return newState;
        });
      }
      
      throw err;
    }
  }, [projectInfos]);

  return {
    projectInfos,
    getProjectInfo,
    updateProjectInfo,
    isLoading,
    error
  };
};

export default useSupabaseProjectInfos;
