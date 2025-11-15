import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from '@/components/ui/use-toast';

/**
 * Hook Supabase pour gérer les messages de chat entre Admin et Client
 * 
 * Fonctionnalités :
 * - Lecture des messages par prospect + projectType
 * - Envoi de messages (admin/client)
 * - Marquage des messages comme lus
 * - Envoi de formulaires dans le chat
 * - Sync real-time bidirectionnelle
 * 
 * Table Supabase : chat_messages
 * Structure : {
 *   id, prospect_id, project_type, sender (client/admin/pro),
 *   text, file, form_id, completed_form_id, prompt_id,
 *   step_index, related_message_timestamp, read, created_at
 * }
 */
export function useSupabaseChatMessages() {
  const [messages, setMessages] = useState({}); // Structure: { "chat_prospectId_projectType": [...messages] }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isLocalUpdate = useRef(false);

  /**
   * ✅ CHARGER TOUS LES MESSAGES AU MONTAGE
   */
  useEffect(() => {
    fetchAllMessages();
  }, []);

  /**
   * ✅ ÉCOUTER LES CHANGEMENTS REAL-TIME
   */
  useEffect(() => {
    const channel = supabase
      .channel('chat-messages-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages'
        },
        (payload) => {
          // Ignorer si c'est une mise à jour locale
          if (isLocalUpdate.current) {
            isLocalUpdate.current = false;
            return;
          }

          console.log('🔄 Real-time chat message change:', payload);

          if (payload.eventType === 'INSERT') {
            const newMessage = transformMessage(payload.new);
            const chatKey = `chat_${newMessage.prospectId}_${newMessage.projectType}`;

            setMessages(prev => ({
              ...prev,
              [chatKey]: [...(prev[chatKey] || []), newMessage]
            }));

            // Notification sonore ou visuelle (optionnel)
            console.log('💬 Nouveau message reçu:', newMessage);
          }

          if (payload.eventType === 'UPDATE') {
            const updatedMessage = transformMessage(payload.new);
            const chatKey = `chat_${updatedMessage.prospectId}_${updatedMessage.projectType}`;

            setMessages(prev => ({
              ...prev,
              [chatKey]: (prev[chatKey] || []).map(msg =>
                msg.id === updatedMessage.id ? updatedMessage : msg
              )
            }));
          }

          if (payload.eventType === 'DELETE') {
            const deletedMessage = transformMessage(payload.old);
            const chatKey = `chat_${deletedMessage.prospectId}_${deletedMessage.projectType}`;

            setMessages(prev => ({
              ...prev,
              [chatKey]: (prev[chatKey] || []).filter(msg => msg.id !== deletedMessage.id)
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  /**
   * ✅ RÉCUPÉRER TOUS LES MESSAGES (groupés par prospect + projet)
   */
  async function fetchAllMessages() {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('chat_messages')
        .select('*')
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;

      // Grouper les messages par chatKey
      const grouped = {};
      (data || []).forEach(msg => {
        const transformed = transformMessage(msg);
        const chatKey = `chat_${transformed.prospectId}_${transformed.projectType}`;
        if (!grouped[chatKey]) {
          grouped[chatKey] = [];
        }
        grouped[chatKey].push(transformed);
      });

      setMessages(grouped);
      console.log('✅ Chat messages loaded:', Object.keys(grouped).length, 'conversations');
    } catch (err) {
      console.error('❌ Error fetching chat messages:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  /**
   * ✅ RÉCUPÉRER LES MESSAGES D'UNE CONVERSATION
   * @param {string} prospectId - UUID du prospect
   * @param {string} projectType - Type de projet (ACC, Centrale, etc.)
   * @returns {Array} Liste des messages
   */
  function getChatMessages(prospectId, projectType) {
    const chatKey = `chat_${prospectId}_${projectType}`;
    return messages[chatKey] || [];
  }

  /**
   * ✅ AJOUTER UN MESSAGE
   * @param {string} prospectId - UUID du prospect
   * @param {string} projectType - Type de projet
   * @param {object} message - Objet message { sender, text, file, formId, ... }
   */
  async function addChatMessage(prospectId, projectType, message) {
    try {
      isLocalUpdate.current = true;

      const messageData = {
        prospect_id: prospectId,
        project_type: projectType,
        sender: message.sender || 'admin',
        text: message.text || null,
        file: message.file || null,
        form_id: message.formId || null,
        completed_form_id: message.completedFormId || null,
        prompt_id: message.promptId || null,
        step_index: message.stepIndex !== undefined ? message.stepIndex : null,
        related_message_timestamp: message.relatedMessageTimestamp || null,
        read: false
      };

      const { data, error: insertError } = await supabase
        .from('chat_messages')
        .insert([messageData])
        .select()
        .single();

      if (insertError) throw insertError;

      const newMessage = transformMessage(data);
      const chatKey = `chat_${prospectId}_${projectType}`;

      // Mise à jour locale immédiate
      setMessages(prev => ({
        ...prev,
        [chatKey]: [...(prev[chatKey] || []), newMessage]
      }));

      console.log('✅ Message sent:', newMessage);

      return { success: true, data: newMessage };
    } catch (err) {
      console.error('❌ Error adding chat message:', err);
      toast({
        title: "Erreur",
        description: err.message || "Impossible d'envoyer le message.",
        variant: "destructive"
      });
      return { success: false, error: err };
    }
  }

  /**
   * ✅ MARQUER UN MESSAGE COMME LU
   * @param {string} messageId - UUID du message
   */
  async function markMessageAsRead(messageId) {
    try {
      isLocalUpdate.current = true;

      const { error: updateError } = await supabase
        .from('chat_messages')
        .update({ read: true })
        .eq('id', messageId);

      if (updateError) throw updateError;

      // Mise à jour locale
      setMessages(prev => {
        const newMessages = { ...prev };
        Object.keys(newMessages).forEach(chatKey => {
          newMessages[chatKey] = newMessages[chatKey].map(msg =>
            msg.id === messageId ? { ...msg, read: true } : msg
          );
        });
        return newMessages;
      });

      console.log('✅ Message marked as read:', messageId);
      return { success: true };
    } catch (err) {
      console.error('❌ Error marking message as read:', err);
      return { success: false, error: err };
    }
  }

  /**
   * ✅ MARQUER TOUS LES MESSAGES D'UNE CONVERSATION COMME LUS
   * @param {string} prospectId - UUID du prospect
   * @param {string} projectType - Type de projet
   */
  async function markConversationAsRead(prospectId, projectType) {
    try {
      isLocalUpdate.current = true;

      const { error: updateError } = await supabase
        .from('chat_messages')
        .update({ read: true })
        .eq('prospect_id', prospectId)
        .eq('project_type', projectType)
        .eq('read', false);

      if (updateError) throw updateError;

      // Mise à jour locale
      const chatKey = `chat_${prospectId}_${projectType}`;
      setMessages(prev => ({
        ...prev,
        [chatKey]: (prev[chatKey] || []).map(msg => ({ ...msg, read: true }))
      }));

      console.log('✅ Conversation marked as read:', chatKey);
      return { success: true };
    } catch (err) {
      console.error('❌ Error marking conversation as read:', err);
      return { success: false, error: err };
    }
  }

  /**
   * ✅ COMPTER LES MESSAGES NON LUS PAR CONVERSATION
   * @param {string} prospectId - UUID du prospect
   * @param {string} projectType - Type de projet
   * @returns {number} Nombre de messages non lus
   */
  function getUnreadCount(prospectId, projectType) {
    const chatKey = `chat_${prospectId}_${projectType}`;
    const conversationMessages = messages[chatKey] || [];
    return conversationMessages.filter(msg => !msg.read && msg.sender !== 'admin').length;
  }

  /**
   * ✅ TRANSFORMER snake_case → camelCase
   */
  function transformMessage(msg) {
    return {
      id: msg.id,
      prospectId: msg.prospect_id,
      projectType: msg.project_type,
      sender: msg.sender,
      text: msg.text,
      file: msg.file,
      formId: msg.form_id,
      completedFormId: msg.completed_form_id,
      promptId: msg.prompt_id,
      stepIndex: msg.step_index,
      relatedMessageTimestamp: msg.related_message_timestamp,
      read: msg.read,
      timestamp: msg.created_at,
      createdAt: msg.created_at
    };
  }

  return {
    messages,
    loading,
    error,
    getChatMessages,
    addChatMessage,
    markMessageAsRead,
    markConversationAsRead,
    getUnreadCount,
    refreshMessages: fetchAllMessages
  };
}
