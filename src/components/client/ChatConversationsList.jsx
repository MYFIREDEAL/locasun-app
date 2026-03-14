import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAppContext } from '@/App';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import { useState, useEffect } from 'react';

/**
 * Liste des conversations style WhatsApp — onglet Chat mobile
 * Affiche un projet par ligne avec dernier message + pastille non lu
 */
const ChatConversationsList = () => {
  const { currentUser, projectsData, clientNotifications, clientFormPanels } = useAppContext();
  const navigate = useNavigate();
  const [lastMessages, setLastMessages] = useState({});

  // Projets actifs du client
  const clientProjects = useMemo(() => {
    if (!currentUser?.tags || !projectsData) return [];
    return currentUser.tags
      .map(tag => projectsData[tag])
      .filter(Boolean);
  }, [currentUser?.tags, projectsData]);

  // Charger le dernier message de chaque projet
  useEffect(() => {
    if (!currentUser?.id || clientProjects.length === 0) return;

    const fetchLastMessages = async () => {
      const results = {};
      
      for (const project of clientProjects) {
        const { data } = await supabase
          .from('chat_messages')
          .select('text, sender, created_at')
          .eq('prospect_id', currentUser.id)
          .eq('project_type', project.type)
          .eq('channel', 'client')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (data) {
          results[project.type] = data;
        }
      }
      
      setLastMessages(results);
    };

    fetchLastMessages();

    // Real-time : écouter les nouveaux messages pour mettre à jour
    const channel = supabase
      .channel(`chat-list-${currentUser.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `prospect_id=eq.${currentUser.id}`
        },
        (payload) => {
          const msg = payload.new;
          if (msg.channel === 'client') {
            setLastMessages(prev => ({
              ...prev,
              [msg.project_type]: {
                text: msg.text,
                sender: msg.sender,
                created_at: msg.created_at
              }
            }));
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [currentUser?.id, clientProjects]);

  // Nombre de notifs non lues par projet
  const unreadByProject = useMemo(() => {
    if (!clientNotifications) return {};
    const result = {};
    clientNotifications
      .filter(n => !n.read)
      .forEach(n => {
        result[n.projectType] = (result[n.projectType] || 0) + n.count;
      });
    return result;
  }, [clientNotifications]);

  // Actions requises par projet (forms pending/rejected)
  const actionsByProject = useMemo(() => {
    if (!clientFormPanels || !currentUser) return {};
    const result = {};
    clientFormPanels
      .filter(p => p.prospectId === currentUser.id && (p.status === 'pending' || p.status === 'rejected'))
      .forEach(p => {
        result[p.projectType] = (result[p.projectType] || 0) + 1;
      });
    return result;
  }, [clientFormPanels, currentUser]);

  // Trier : non lus en premier, puis par date du dernier message
  const sortedProjects = useMemo(() => {
    return [...clientProjects].sort((a, b) => {
      const aUnread = unreadByProject[a.type] || 0;
      const bUnread = unreadByProject[b.type] || 0;
      if (aUnread > 0 && bUnread === 0) return -1;
      if (bUnread > 0 && aUnread === 0) return 1;
      
      const aDate = lastMessages[a.type]?.created_at || '';
      const bDate = lastMessages[b.type]?.created_at || '';
      return bDate.localeCompare(aDate);
    });
  }, [clientProjects, unreadByProject, lastMessages]);

  // 📱 Si un seul projet → aller directement sur le chat (pas besoin de liste)
  useEffect(() => {
    if (clientProjects.length === 1) {
      navigate(`/dashboard/chat/${clientProjects[0].type}`, { replace: true });
    }
  }, [clientProjects, navigate]);

  if (clientProjects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
          <MessageCircle className="h-8 w-8 text-blue-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Aucune conversation</h2>
        <p className="text-gray-500 text-sm max-w-xs">
          Vos conversations avec votre conseiller apparaîtront ici quand un projet sera actif.
        </p>
      </div>
    );
  }

  return (
    <div className="pb-4">
      <div className="px-4 py-3">
        <h1 className="text-xl font-bold text-gray-900">Messages</h1>
      </div>
      
      <div className="divide-y divide-gray-100">
        {sortedProjects.map((project, index) => {
          const lastMsg = lastMessages[project.type];
          const unread = unreadByProject[project.type] || 0;
          const actions = actionsByProject[project.type] || 0;
          const hasNotif = unread > 0 || actions > 0;

          // Texte du dernier message
          let previewText = 'Aucun message pour le moment';
          if (lastMsg?.text) {
            const senderLabel = lastMsg.sender === 'client' ? 'Vous' : 'Conseiller';
            previewText = `${senderLabel} : ${lastMsg.text}`;
            if (previewText.length > 60) previewText = previewText.substring(0, 57) + '...';
          }

          // Timestamp
          let timeLabel = '';
          if (lastMsg?.created_at) {
            timeLabel = formatDistanceToNow(new Date(lastMsg.created_at), { addSuffix: false, locale: fr });
          }

          return (
            <motion.div
              key={project.type}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => navigate(`/dashboard/chat/${project.type}`)}
              className="flex items-center px-4 py-3 hover:bg-gray-50 active:bg-gray-100 cursor-pointer transition-colors"
            >
              {/* Icône projet */}
              <div className={`w-12 h-12 ${project.color} rounded-full flex items-center justify-center flex-shrink-0`}>
                <span className="text-xl">{project.icon}</span>
              </div>

              {/* Contenu */}
              <div className="flex-1 ml-3 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className={`font-semibold text-sm truncate ${hasNotif ? 'text-gray-900' : 'text-gray-700'}`}>
                    {project.clientTitle || project.title}
                  </h3>
                  <span className="text-xs text-gray-400 flex-shrink-0 ml-2">{timeLabel}</span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <p className={`text-xs truncate ${hasNotif ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                    {actions > 0 ? `📋 Action requise • ${previewText}` : previewText}
                  </p>
                  {hasNotif && (
                    <span className="bg-red-500 text-white text-xs font-bold min-w-[20px] h-5 rounded-full flex items-center justify-center flex-shrink-0 ml-2 px-1.5">
                      {unread + actions}
                    </span>
                  )}
                </div>
              </div>

              <ChevronRight className="h-4 w-4 text-gray-300 flex-shrink-0 ml-2" />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default ChatConversationsList;
