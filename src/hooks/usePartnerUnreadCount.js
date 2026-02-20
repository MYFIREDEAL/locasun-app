import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

/**
 * Hook pour compter en temps réel les messages admin non lus
 * destinés au partenaire (channel='partner', sender != 'partner', read=false)
 * 
 * Retourne:
 * - totalUnread: nombre total de messages non lus toutes conversations confondues
 * - unreadByConversation: Map<"prospectId__projectType", count>
 * - loading: boolean
 * 
 * Le compteur se met à jour en temps réel:
 * - INSERT d'un message admin → +1
 * - UPDATE read=true (markAsRead) → -1
 */
export function usePartnerUnreadCount() {
  const [totalUnread, setTotalUnread] = useState(0);
  const [unreadByConversation, setUnreadByConversation] = useState({});
  const [loading, setLoading] = useState(true);
  const partnerIdRef = useRef(null);
  const missionProspectIdsRef = useRef([]);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        // 1. Get current user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          setLoading(false);
          return;
        }

        // 2. Get partner
        const { data: partner, error: partnerError } = await supabase
          .from('partners')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (partnerError || !partner) {
          setLoading(false);
          return;
        }

        partnerIdRef.current = partner.id;

        // 3. Get missions (active) pour connaître les prospect_id associés
        const { data: missions, error: missionsError } = await supabase
          .from('missions')
          .select('prospect_id, project_type')
          .eq('partner_id', partner.id)
          .in('status', ['pending', 'in_progress']);

        if (missionsError) throw missionsError;

        const missionKeys = (missions || []).map(m => ({
          prospectId: m.prospect_id,
          projectType: m.project_type,
        }));

        // Stocker les prospect_ids uniques pour le filtre real-time
        const uniqueProspectIds = [...new Set(missionKeys.map(m => m.prospectId))];
        missionProspectIdsRef.current = uniqueProspectIds;

        if (missionKeys.length === 0) {
          if (mounted) {
            setTotalUnread(0);
            setUnreadByConversation({});
            setLoading(false);
          }
          return;
        }

        // 4. Compter les messages non lus pour chaque conversation
        // On fait une requête globale puis on regroupe côté client
        const { data: unreadMessages, error: unreadError } = await supabase
          .from('chat_messages')
          .select('id, prospect_id, project_type')
          .eq('channel', 'partner')
          .neq('sender', 'partner')
          .eq('read', false)
          .in('prospect_id', uniqueProspectIds);

        if (unreadError) throw unreadError;

        if (!mounted) return;

        // Filtrer aux conversations exactes (prospect_id + project_type)
        const missionKeySet = new Set(missionKeys.map(m => `${m.prospectId}__${m.projectType}`));
        const relevantMessages = (unreadMessages || []).filter(
          msg => missionKeySet.has(`${msg.prospect_id}__${msg.project_type}`)
        );

        // Compter par conversation
        const byConvo = {};
        for (const msg of relevantMessages) {
          const key = `${msg.prospect_id}__${msg.project_type}`;
          byConvo[key] = (byConvo[key] || 0) + 1;
        }

        setUnreadByConversation(byConvo);
        setTotalUnread(relevantMessages.length);
        setLoading(false);
      } catch (err) {
        logger.error('usePartnerUnreadCount: erreur init', { err: err.message });
        if (mounted) setLoading(false);
      }
    };

    init();

    // 5. Real-time: écouter INSERT et UPDATE sur chat_messages channel='partner'
    const realtimeChannel = supabase
      .channel(`partner-unread-${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages',
        },
        (payload) => {
          if (!mounted) return;

          const msg = payload.new;
          if (!msg) return;

          // On ne s'intéresse qu'au channel 'partner'
          if (msg.channel !== 'partner') return;

          // Vérifier que c'est un prospect de nos missions
          if (!missionProspectIdsRef.current.includes(msg.prospect_id)) return;

          const convoKey = `${msg.prospect_id}__${msg.project_type}`;

          if (payload.eventType === 'INSERT') {
            // Nouveau message d'admin → incrémenter si non lu et pas du partenaire
            if (msg.sender !== 'partner' && msg.read === false) {
              setUnreadByConversation(prev => ({
                ...prev,
                [convoKey]: (prev[convoKey] || 0) + 1,
              }));
              setTotalUnread(prev => prev + 1);
            }
          } else if (payload.eventType === 'UPDATE') {
            // Message marqué comme lu → décrémenter
            // On ne peut pas savoir exactement combien, donc on re-fetch
            // Mais pour l'optimisation, si read passe à true et sender != partner
            if (msg.read === true && msg.sender !== 'partner') {
              // Re-calculer pour cette conversation
              setUnreadByConversation(prev => {
                const current = prev[convoKey] || 0;
                if (current <= 1) {
                  const next = { ...prev };
                  delete next[convoKey];
                  return next;
                }
                return { ...prev, [convoKey]: current - 1 };
              });
              setTotalUnread(prev => Math.max(0, prev - 1));
            }
          }
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(realtimeChannel);
    };
  }, []);

  return {
    totalUnread,
    unreadByConversation,
    loading,
  };
}
