import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Hook pour gérer les partenaires (ADMIN ONLY)
 * 
 * RÈGLES:
 * - Lecture seule des partenaires du tenant
 * - Activation/désactivation des partenaires
 * - Comptage des missions par partenaire
 * - Real-time sync
 * 
 * SÉCURITÉ:
 * - RLS filtre automatiquement par organization_id
 * - Seuls Global Admin et Manager peuvent voir les partenaires
 */
export const useSupabasePartners = () => {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Charger les partenaires avec le count des missions
  const fetchPartners = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Récupérer les partenaires
      const { data: partnersData, error: partnersError } = await supabase
        .from('partners')
        .select('*')
        .order('created_at', { ascending: false });

      if (partnersError) throw partnersError;

      // Récupérer le count des missions par partenaire
      const { data: missionsCount, error: missionsError } = await supabase
        .from('missions')
        .select('partner_id');

      if (missionsError) throw missionsError;

      // Calculer le nombre de missions par partenaire
      const missionsByPartner = (missionsCount || []).reduce((acc, m) => {
        acc[m.partner_id] = (acc[m.partner_id] || 0) + 1;
        return acc;
      }, {});

      // Transformer les données (snake_case → camelCase)
      const transformedPartners = (partnersData || []).map(p => ({
        id: p.id,
        userId: p.user_id,
        organizationId: p.organization_id,
        companyName: p.company_name,
        contactFirstName: p.contact_first_name,
        contactLastName: p.contact_last_name,
        contactEmail: p.email,
        name: p.company_name, // Alias pour compatibilité
        email: p.email,
        phone: p.phone,
        avatarUrl: p.avatar_url,
        specialty: p.specialty,
        active: p.active,
        isActive: p.active, // Alias pour compatibilité workflow
        createdAt: p.created_at,
        updatedAt: p.updated_at,
        missionsCount: missionsByPartner[p.id] || 0,
      }));

      setPartners(transformedPartners);
    } catch (err) {
      console.error('[useSupabasePartners] Erreur:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Activer/Désactiver un partenaire
  const togglePartnerActive = useCallback(async (partnerId, active) => {
    try {
      const { error } = await supabase
        .from('partners')
        .update({ active, updated_at: new Date().toISOString() })
        .eq('id', partnerId);

      if (error) throw error;

      // Mise à jour optimiste locale
      setPartners(prev => prev.map(p => 
        p.id === partnerId ? { ...p, active } : p
      ));

      return { success: true };
    } catch (err) {
      console.error('[useSupabasePartners] Erreur toggle:', err);
      return { success: false, error: err.message };
    }
  }, []);

  // Récupérer un partenaire par ID avec ses missions
  const getPartnerWithMissions = useCallback(async (partnerId) => {
    try {
      // Récupérer le partenaire
      const { data: partner, error: partnerError } = await supabase
        .from('partners')
        .select('*')
        .eq('id', partnerId)
        .single();

      if (partnerError) throw partnerError;

      // Récupérer ses missions
      const { data: missions, error: missionsError } = await supabase
        .from('missions')
        .select(`
          id,
          title,
          status,
          source,
          project_type,
          step_name,
          due_date,
          completed_at,
          created_at
        `)
        .eq('partner_id', partnerId)
        .order('created_at', { ascending: false });

      if (missionsError) throw missionsError;

      // Transformer les données
      return {
        partner: {
          id: partner.id,
          userId: partner.user_id,
          organizationId: partner.organization_id,
          name: partner.name,
          email: partner.email,
          phone: partner.phone,
          avatarUrl: partner.avatar_url,
          specialty: partner.specialty,
          active: partner.active,
          createdAt: partner.created_at,
          updatedAt: partner.updated_at,
        },
        missions: (missions || []).map(m => ({
          id: m.id,
          title: m.title,
          status: m.status,
          source: m.source,
          projectType: m.project_type,
          stepName: m.step_name,
          dueDate: m.due_date,
          completedAt: m.completed_at,
          createdAt: m.created_at,
        })),
      };
    } catch (err) {
      console.error('[useSupabasePartners] Erreur getPartnerWithMissions:', err);
      return { partner: null, missions: [], error: err.message };
    }
  }, []);

  // Real-time subscription
  useEffect(() => {
    fetchPartners();

    const channel = supabase
      .channel('partners-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'partners' }, 
        () => {
          fetchPartners();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPartners]);

  return {
    partners,
    loading,
    error,
    refetch: fetchPartners,
    togglePartnerActive,
    getPartnerWithMissions,
  };
};

export default useSupabasePartners;
