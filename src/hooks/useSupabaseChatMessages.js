import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import logger from '../lib/logger';

const PAGE_SIZE = 25;

/**
 * Hook pour gérer les messages chat via Supabase
 * Table: chat_messages
 * Real-time bidirectionnel admin ↔ client / admin ↔ partner
 * 
 * Pagination: charge les 25 derniers messages au départ.
 * loadMore() charge les 25 précédents (scroll infini vers le haut).
 * 
 * @param {string} prospectId - UUID du prospect
 * @param {string} projectType - Type de projet (ACC, Centrale, etc.)
 * @param {string|null} chatChannel - Canal de chat: 'client' | 'partner' | 'internal' | null (tous)
 *   - 'client'  → Messages client ↔ admin (vue client)
 *   - 'partner' → Messages partner ↔ admin (vue partner)
 *   - null       → Tous les canaux (vue admin)
 * @param {string|null} partnerId - UUID du partenaire (pour isolation multi-partenaire en channel='partner')
 *   - Côté partenaire: auto-renseigné depuis partners.user_id = auth.uid()
 *   - Côté admin: sélectionné via dropdown dans l'onglet Partenaire
 *   - null → pas de filtrage par partenaire (tous les messages partner)
 */
export function useSupabaseChatMessages(prospectId = null, projectType = null, chatChannel = null, partnerId = null) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  const oldestTimestampRef = useRef(null);

  // Transformation Supabase → App
  const transformFromDB = (dbMessage) => ({
    id: dbMessage.id,
    sender: dbMessage.sender,
    channel: dbMessage.channel,
    partnerId: dbMessage.partner_id || null,
    text: dbMessage.text,
    file: dbMessage.file,
    formId: dbMessage.form_id,
    completedFormId: dbMessage.completed_form_id,
    promptId: dbMessage.prompt_id,
    stepIndex: dbMessage.step_index,
    relatedMessageTimestamp: dbMessage.related_message_timestamp,
    metadata: dbMessage.metadata || null,
    read: dbMessage.read,
    timestamp: dbMessage.created_at,
    createdAt: dbMessage.created_at,
  });

  // Helper pour construire la query de base
  const buildBaseQuery = () => {
    let query = supabase
      .from('chat_messages')
      .select('*')
      .eq('prospect_id', prospectId)
      .eq('project_type', projectType);

    if (chatChannel) {
      query = query.eq('channel', chatChannel);
    }
    if (partnerId && chatChannel === 'partner') {
      query = query.eq('partner_id', partnerId);
    }
    return query;
  };

  // Charger les messages (25 derniers)
  useEffect(() => {
    if (!prospectId || !projectType) {
      // ⚠️ Ne PAS mettre loading=false ici — prospectId peut être undefined
      // au cold start PWA (currentUser pas encore chargé).
      // Garder loading=true évite le flash "Aucun message" avant que le fetch ne se lance.
      return;
    }

    const fetchMessages = async () => {
      try {
        setLoading(true);
        setHasMore(true);
        oldestTimestampRef.current = null;

        // Charger les PAGE_SIZE derniers (desc) puis reverse
        const query = buildBaseQuery()
          .order('created_at', { ascending: false })
          .limit(PAGE_SIZE);

        const { data, error: fetchError } = await query;

        if (fetchError) throw fetchError;

        // Reverse pour afficher dans l'ordre chronologique
        const sorted = (data || []).reverse();
        const transformed = sorted.map(transformFromDB);
        setMessages(transformed);

        // Stocker le timestamp du plus ancien message pour loadMore
        if (sorted.length > 0) {
          oldestTimestampRef.current = sorted[0].created_at;
        }
        // S'il y a moins que PAGE_SIZE, il n'y a pas de messages plus anciens
        if ((data || []).length < PAGE_SIZE) {
          setHasMore(false);
        }

        setError(null);
      } catch (err) {
        logger.error('❌ Error loading chat messages:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();

    // Real-time subscription
    const channelSuffix = chatChannel ? `-${chatChannel}` : '-all';
    const partnerSuffix = partnerId ? `-p${partnerId.slice(0,8)}` : '';
    const realtimeChannel = supabase
      .channel(`chat-${prospectId}-${projectType}${channelSuffix}${partnerSuffix}-${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages',
          filter: `prospect_id=eq.${prospectId}`,
        },
        (payload) => {
          // Filtrer par project_type (le filter Supabase ne supporte qu'un seul filtre)
          if (payload.new && payload.new.project_type !== projectType) {
            return;
          }

          // Filtrer par channel si spécifié
          if (chatChannel && payload.new && payload.new.channel !== chatChannel) {
            return;
          }

          // 🟠 Filtrer par partner_id pour isolation multi-partenaire
          if (partnerId && chatChannel === 'partner' && payload.new && payload.new.partner_id !== partnerId) {
            return;
          }

          if (payload.eventType === 'INSERT') {
            const newMessage = transformFromDB(payload.new);
            setMessages((prev) => {
              // Éviter les doublons
              if (prev.some(m => m.id === newMessage.id)) {
                return prev;
              }
              return [...prev, newMessage];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedMessage = transformFromDB(payload.new);
            setMessages((prev) =>
              prev.map((m) => (m.id === updatedMessage.id ? updatedMessage : m))
            );
          } else if (payload.eventType === 'DELETE') {
            setMessages((prev) =>
              prev.filter((m) => m.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(realtimeChannel);
    };
  }, [prospectId, projectType, chatChannel, partnerId]);

  // Charger les messages plus anciens (pagination vers le haut)
  const loadMore = useCallback(async () => {
    if (!prospectId || !projectType || !hasMore || loadingMore || !oldestTimestampRef.current) {
      return [];
    }

    try {
      setLoadingMore(true);

      const query = buildBaseQuery()
        .lt('created_at', oldestTimestampRef.current)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE);

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      if (!data || data.length === 0) {
        setHasMore(false);
        return [];
      }

      // Reverse pour l'ordre chronologique
      const sorted = data.reverse();
      const transformed = sorted.map(transformFromDB);

      // Mettre à jour le oldest timestamp
      oldestTimestampRef.current = sorted[0].created_at;

      // S'il y a moins que PAGE_SIZE, plus rien à charger
      if (data.length < PAGE_SIZE) {
        setHasMore(false);
      }

      // Prepend les anciens messages
      setMessages((prev) => {
        // Dédoublonner
        const existingIds = new Set(prev.map(m => m.id));
        const newMsgs = transformed.filter(m => !existingIds.has(m.id));
        return [...newMsgs, ...prev];
      });

      return transformed;
    } catch (err) {
      logger.error('❌ Error loading more messages:', err);
      return [];
    } finally {
      setLoadingMore(false);
    }
  }, [prospectId, projectType, chatChannel, partnerId, hasMore, loadingMore]);

  // Envoyer un message
  const sendMessage = async (messageData) => {
    try {
      // Vérifier les doublons côté client avant d'envoyer
      const isDuplicate = messages.some(msg => {
        // Vérifier si un message identique existe déjà
        if (messageData.promptId) {
          return (
            msg.promptId === messageData.promptId &&
            msg.stepIndex === messageData.stepIndex &&
            msg.text === messageData.text &&
            msg.sender === messageData.sender
          );
        }
        if (messageData.completedFormId) {
          return (
            msg.completedFormId === messageData.completedFormId &&
            msg.sender === messageData.sender &&
            msg.relatedMessageTimestamp === messageData.relatedMessageTimestamp
          );
        }
        return false;
      });

      if (isDuplicate) {
        return { success: true, duplicate: true };
      }

      const dbPayload = {
        prospect_id: prospectId,
        project_type: projectType,
        sender: messageData.sender,
        text: messageData.text || null,
        file: messageData.file || null,
        form_id: messageData.formId || null,
        completed_form_id: messageData.completedFormId || null,
        prompt_id: messageData.promptId || null,
        step_index: messageData.stepIndex !== undefined ? messageData.stepIndex : null,
        related_message_timestamp: messageData.relatedMessageTimestamp || null,
        channel: messageData.channel || chatChannel || 'client',
        metadata: messageData.metadata || null,
        partner_id: messageData.partnerId || partnerId || null,
        read: false,
      };

      const { data, error: insertError } = await supabase
        .from('chat_messages')
        .insert([dbPayload])
        .select()
        .single();

      if (insertError) throw insertError;

      return { success: true, data: transformFromDB(data) };
    } catch (err) {
      logger.error('❌ Error sending message:', err);
      return { success: false, error: err.message };
    }
  };

  // Marquer des messages comme lus
  const markAsRead = async (messageIds) => {
    try {
      const { error: updateError } = await supabase
        .from('chat_messages')
        .update({ read: true })
        .in('id', messageIds);

      if (updateError) throw updateError;

      return { success: true };
    } catch (err) {
      logger.error('❌ Error marking messages as read:', err);
      return { success: false, error: err.message };
    }
  };

  return {
    messages,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    error,
    sendMessage,
    markAsRead,
  };
}
