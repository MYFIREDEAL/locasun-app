import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';

/**
 * Hook pour gérer les paramètres de l'entreprise (logo, nom, etc.)
 * avec real-time sync depuis Supabase
 * 
 * Structure de la table company_settings:
 * - id: UUID (singleton, une seule ligne)
 * - logo_url: TEXT (URL ou base64 du logo)
 * - company_name: TEXT
 * - settings: JSONB (config formulaire contact, etc.)
 */
export const useSupabaseCompanySettings = () => {
  const [companySettings, setCompanySettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ID fixe du singleton (une seule ligne dans la table)
  const COMPANY_SETTINGS_ID = '9769af46-b3ac-4909-8810-a8cf3fd6e307';

  // Charger les paramètres au montage
  const fetchCompanySettings = async () => {
    try {
      setLoading(true);
      
      const { data, error: fetchError } = await supabase
        .from('company_settings')
        .select('*')
        .eq('id', COMPANY_SETTINGS_ID)
        .single();

      if (fetchError) throw fetchError;

      console.log('✅ Company settings chargés:', data);
      setCompanySettings(data);
      setError(null);
    } catch (err) {
      console.error('❌ Erreur chargement company settings:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanySettings();
  }, []);

  // 🔥 REAL-TIME : Écouter les changements en temps réel
  useEffect(() => {
    console.log('🔥 Setting up real-time subscription for company_settings...');

    const channel = supabase
      .channel('company-settings-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'company_settings',
          filter: `id=eq.${COMPANY_SETTINGS_ID}`
        },
        (payload) => {
          console.log('🔥 Real-time company settings change detected:', payload.new);
          setCompanySettings(payload.new);
          
          toast({
            title: "Paramètres mis à jour",
            description: "Les paramètres de l'entreprise ont été synchronisés.",
            className: "bg-blue-500 text-white",
          });
        }
      )
      .subscribe((status) => {
        console.log('📡 Company settings subscription status:', status);
      });

    return () => {
      console.log('🔌 Unsubscribing from company settings real-time...');
      supabase.removeChannel(channel);
    };
  }, []);

  /**
   * ✅ METTRE À JOUR LE LOGO
   * @param {string} logoData - URL ou base64 du logo
   */
  const updateLogo = async (logoData) => {
    try {
      console.log('🔧 Updating company logo...');

      const { data, error: updateError } = await supabase
        .from('company_settings')
        .update({ 
          logo_url: logoData,
          updated_at: new Date().toISOString()
        })
        .eq('id', COMPANY_SETTINGS_ID)
        .select()
        .single();

      if (updateError) throw updateError;

      console.log('✅ Logo updated in DB, waiting for real-time sync...');

      toast({
        title: "Logo mis à jour !",
        description: "Le logo de l'entreprise a été modifié.",
        className: "bg-green-500 text-white",
      });

      return data;
    } catch (err) {
      console.error('❌ Erreur update logo:', err);
      toast({
        title: "Erreur",
        description: err.message || "Impossible de mettre à jour le logo.",
        variant: "destructive",
      });
      throw err;
    }
  };

  /**
   * ✅ SUPPRIMER LE LOGO
   */
  const removeLogo = async () => {
    try {
      console.log('🔧 Removing company logo...');

      const { data, error: updateError } = await supabase
        .from('company_settings')
        .update({ 
          logo_url: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', COMPANY_SETTINGS_ID)
        .select()
        .single();

      if (updateError) throw updateError;

      console.log('✅ Logo removed, waiting for real-time sync...');

      toast({
        title: "Logo supprimé",
        description: "Le logo de l'entreprise a été supprimé.",
        className: "bg-orange-500 text-white",
      });

      return data;
    } catch (err) {
      console.error('❌ Erreur suppression logo:', err);
      toast({
        title: "Erreur",
        description: err.message || "Impossible de supprimer le logo.",
        variant: "destructive",
      });
      throw err;
    }
  };

  /**
   * ✅ METTRE À JOUR LES SETTINGS (formulaire contact, etc.)
   * @param {Object} newSettings - Nouvel objet settings
   */
  const updateSettings = async (newSettings) => {
    try {
      console.log('🔧 Updating company settings...');

      const { data, error: updateError } = await supabase
        .from('company_settings')
        .update({ 
          settings: newSettings,
          updated_at: new Date().toISOString()
        })
        .eq('id', COMPANY_SETTINGS_ID)
        .select()
        .single();

      if (updateError) throw updateError;

      console.log('✅ Settings updated, waiting for real-time sync...');

      return data;
    } catch (err) {
      console.error('❌ Erreur update settings:', err);
      toast({
        title: "Erreur",
        description: err.message || "Impossible de mettre à jour les paramètres.",
        variant: "destructive",
      });
      throw err;
    }
  };

  return {
    companySettings,
    loading,
    error,
    updateLogo,
    removeLogo,
    updateSettings,
    refetch: fetchCompanySettings,
  };
};
