import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import logger from '../lib/logger';

/**
 * Hook pour gérer les messages chat via Supabase
 * Table: chat_messages
 * Real-time bidirectionnel admin ↔ client / admin ↔ partner
 * 
 * @param {string} prospectId - UUID du prospect
 * @param {string} projectType - Type de projet (ACC, Centrale, etc.)
 * @param {string|null} chatChannel - Canal de chat: 'client' | 'partner' | 'internal' | null (tous)
 *   - 'client'  → Messages client ↔ admin (vue client)
 *   - 'partner' → Messages partner ↔ admin (vue partner)
 *   - null       → Tous les canaux (vue admin)
 */
export function useSupabaseChatMessages(prospectId = null, projectType = null, chatChannel = null) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Transformation Supabase → App
  const transformFromDB = (dbMessage) => ({
    id: dbMessage.id,
    sender: dbMessage.sender,
    channel: dbMessage.channel,
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

  // Charger les messages
  useEffect(() => {
    if (!prospectId || !projectType) {
      setLoading(false);
      return;
    }

    const fetchMessages = async () => {
      try {
        setLoading(true);
        let query = supabase
          .from('chat_messages')
          .select('*')
          .eq('prospect_id', prospectId)
          .eq('project_type', projectType);

        // Filtrer par channel si spécifié (client/partner ne voient que leur canal)
        // Si null (admin), on récupère TOUT
        if (chatChannel) {
          query = query.eq('channel', chatChannel);
        }

        const { data, error: fetchError } = await query.order('created_at', { ascending: true });

        if (fetchError) throw fetchError;

        const transformed = (data || []).map(transformFromDB);
        setMessages(transformed);
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
    const realtimeChannel = supabase
      .channel(`chat-${prospectId}-${projectType}${channelSuffix}-${Math.random().toString(36).slice(2)}`)
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
  }, [prospectId, projectType, chatChannel]);

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
    error,
    sendMessage,
    markAsRead,
  };
}
