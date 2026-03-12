import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Paperclip, FileText, Download, CheckCircle, HelpCircle, ClipboardList } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import { useAppContext } from '@/App';
import { supabase } from '@/lib/supabase';
import { useSupabaseChatMessages } from '@/hooks/useSupabaseChatMessages';
import { useSupabaseProjectFiles } from '@/hooks/useSupabaseProjectFiles';
import { logger } from '@/lib/logger';
import MobileFormModal from '@/components/client/MobileFormModal';

/**
 * Page chat mobile pour un projet spécifique
 * Route: /dashboard/chat/:projectType
 * Affiche le chat + bouton "Remplir le formulaire" si form pending
 */
const MobileChatProjectPage = () => {
  const { projectType } = useParams();
  const navigate = useNavigate();
  const {
    currentUser,
    projectsData,
    addChatMessage,
    forms,
    clientFormPanels,
    clientNotifications,
    markClientNotificationAsRead,
  } = useAppContext();

  const project = projectsData[projectType];
  const prospectId = currentUser?.id;

  // Hook chat
  const { messages, loading: messagesLoading, loadMore, hasMore, loadingMore } = useSupabaseChatMessages(prospectId, projectType, 'client');

  // Hook upload
  const { uploadFile, uploading } = useSupabaseProjectFiles({
    projectType,
    prospectId,
    organizationId: currentUser?.organization_id,
    enabled: true,
  });

  const [newMessage, setNewMessage] = useState('');
  const [attachedFile, setAttachedFile] = useState(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const chatEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const isInitialLoadRef = useRef(true);
  const fileInputRef = useRef(null);

  // Panel statuses pour boutons MESSAGE
  const [panelStatuses, setPanelStatuses] = useState({});
  const [buttonLoading, setButtonLoading] = useState(null);

  // Formulaires pending pour ce projet (bouton "Remplir le formulaire")
  const pendingForms = useMemo(() => {
    if (!clientFormPanels || !currentUser) return [];
    return clientFormPanels.filter(
      p => p.prospectId === currentUser.id &&
           p.projectType === projectType &&
           (p.status === 'pending' || p.status === 'rejected') &&
           p.formId // Uniquement les panels avec un formId (pas MESSAGE)
    );
  }, [clientFormPanels, currentUser, projectType]);

  // Marquer les notifs comme lues à l'ouverture
  useEffect(() => {
    if (!clientNotifications || !markClientNotificationAsRead) return;
    clientNotifications
      .filter(n => !n.read && n.projectType === projectType)
      .forEach(n => markClientNotificationAsRead(n.id));
  }, [clientNotifications, markClientNotificationAsRead, projectType]);

  // Panel statuses pour boutons d'action MESSAGE
  useEffect(() => {
    const panelIds = messages
      .filter(msg => msg.metadata?.actionButtons && msg.metadata?.panelId)
      .map(msg => msg.metadata.panelId);

    if (panelIds.length === 0) return;

    const fetchStatuses = async () => {
      const { data, error } = await supabase
        .from('client_form_panels')
        .select('panel_id, status')
        .in('panel_id', panelIds);

      if (!error && data) {
        const statuses = {};
        data.forEach(panel => { statuses[panel.panel_id] = panel.status; });
        setPanelStatuses(statuses);
      }
    };

    fetchStatuses();

    const channel = supabase
      .channel(`mobile-chat-panels-${projectType}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'client_form_panels',
      }, (payload) => {
        if (panelIds.includes(payload.new.panel_id)) {
          setPanelStatuses(prev => ({ ...prev, [payload.new.panel_id]: payload.new.status }));
        }
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [messages, projectType]);

  // Scroll
  useEffect(() => {
    if (!messages.length) return;
    requestAnimationFrame(() => {
      if (isInitialLoadRef.current) {
        chatEndRef.current?.scrollIntoView({ behavior: 'instant', block: 'end' });
        isInitialLoadRef.current = false;
      } else {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
    });
  }, [messages]);

  const handleChatScroll = useCallback(async (e) => {
    const container = e.target;
    if (container.scrollTop < 80 && hasMore && !loadingMore) {
      const prevScrollHeight = container.scrollHeight;
      await loadMore();
      requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight - prevScrollHeight;
      });
    }
  }, [hasMore, loadingMore, loadMore]);

  // Envoyer message
  const handleSendMessage = async () => {
    if (!newMessage.trim() && !attachedFile) return;
    try {
      let fileData = null;
      if (attachedFile) {
        if (attachedFile.size > 10 * 1024 * 1024) {
          toast({ title: '❌ Fichier trop volumineux', description: 'Max 10 MB.', variant: 'destructive' });
          return;
        }
        const uploadedFile = await uploadFile({ file: attachedFile, uploadedBy: currentUser?.id });
        if (uploadedFile) {
          fileData = {
            id: uploadedFile.id,
            name: uploadedFile.file_name,
            size: uploadedFile.file_size,
            type: uploadedFile.file_type,
            storagePath: uploadedFile.storage_path,
          };
        }
      }
      addChatMessage(prospectId, projectType, { sender: 'client', text: newMessage, file: fileData });
      setNewMessage('');
      setAttachedFile(null);
      requestAnimationFrame(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }));
    } catch (error) {
      logger.error('❌ Error sending message', error);
      toast({ title: '❌ Erreur', description: "Impossible d'envoyer le message.", variant: 'destructive' });
    }
  };

  // Bouton Valider (MESSAGE)
  const handleActionValidate = async (panelId, proceedLabel) => {
    setButtonLoading(panelId);
    try {
      await supabase.from('client_form_panels').update({ status: 'approved' }).eq('panel_id', panelId);
      addChatMessage(prospectId, projectType, {
        sender: 'client',
        text: `✅ ${proceedLabel || 'Validé'}`,
        metadata: { actionResponse: 'validated', panelId },
      });
      setPanelStatuses(prev => ({ ...prev, [panelId]: 'approved' }));
      toast({ title: '✅ Confirmé', description: 'Votre réponse a été enregistrée.' });
    } catch (error) {
      logger.error('❌ Error validating', error);
      toast({ title: '❌ Erreur', variant: 'destructive' });
    } finally {
      setButtonLoading(null);
    }
  };

  // Bouton Besoin d'infos (MESSAGE)
  const handleActionNeedInfo = async (panelId, needDataLabel) => {
    setButtonLoading(panelId);
    try {
      addChatMessage(prospectId, projectType, {
        sender: 'client',
        text: `❓ ${needDataLabel || "J'ai besoin de plus d'informations"}`,
        metadata: { actionResponse: 'need_info', panelId },
      });
      toast({ title: '📩 Message envoyé' });
    } catch (error) {
      logger.error('❌ Error', error);
    } finally {
      setButtonLoading(null);
    }
  };

  // Télécharger fichier
  const handleFileClick = async (file) => {
    if (!file?.storagePath) return;
    try {
      const { data, error } = await supabase.storage.from('project-files').createSignedUrl(file.storagePath, 3600);
      if (error) throw error;
      window.open(data.signedUrl, '_blank');
    } catch (error) {
      logger.error('❌ Error downloading', error);
      toast({ title: '❌ Erreur', variant: 'destructive' });
    }
  };

  if (!project || !currentUser) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bottom-16 z-40 flex flex-col bg-white">
      {/* Header fixe */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-white flex-shrink-0">
        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/chat')} className="rounded-full flex-shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className={`w-10 h-10 ${project.color} rounded-full flex items-center justify-center flex-shrink-0`}>
          <span className="text-lg">{project.icon}</span>
        </div>
        <div className="min-w-0">
          <h2 className="font-semibold text-sm text-gray-900 truncate">{project.clientTitle || project.title}</h2>
          <p className="text-xs text-gray-500">Votre conseiller</p>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={chatContainerRef}
        onScroll={handleChatScroll}
        className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50"
      >
        {loadingMore && (
          <div className="flex items-center justify-center py-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500" />
          </div>
        )}
        {hasMore && !loadingMore && messages.length > 0 && (
          <button onClick={loadMore} className="w-full text-center text-xs text-blue-500 py-1">
            ↑ Charger les messages précédents
          </button>
        )}

        {messagesLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            Aucun message pour le moment. Écrivez à votre conseiller !
          </div>
        ) : (
          messages.map((msg, index) => {
            if (msg.formId && !msg.text) return null;
            return (
              <div key={msg.id || index} className={`flex items-end gap-2 ${msg.sender === 'client' ? 'justify-end' : 'justify-start'}`}>
                {(msg.sender === 'pro' || msg.sender === 'admin') && (
                  <img alt="Conseiller" className="w-7 h-7 rounded-full flex-shrink-0" src="https://horizons-cdn.hostinger.com/43725989-d002-4543-b65c-278701925e7e/4e3f809791e357819f31c585852d3a99.png" />
                )}
                <div className={`max-w-[75%] rounded-2xl ${msg.sender === 'client' ? 'bg-blue-500 text-white rounded-br-none p-2.5' : 'bg-white text-gray-800 rounded-bl-none p-3 shadow-sm'}`}>
                  {msg.text && (
                    (msg.sender === 'pro' || msg.sender === 'admin') && msg.text.includes('<a ') ? (
                      <p className="text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: msg.text }} />
                    ) : (
                      <p className="text-sm leading-relaxed">{msg.text}</p>
                    )
                  )}
                  {msg.file && (
                    <button onClick={() => handleFileClick(msg.file)} className="mt-2 flex items-center gap-2 text-xs bg-white/20 hover:bg-white/30 p-2 rounded-lg w-full text-left">
                      <FileText className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{msg.file.name}</span>
                      <Download className="w-3 h-3 ml-auto flex-shrink-0" />
                    </button>
                  )}

                  {/* Boutons MESSAGE (Valider / Besoin d'infos) */}
                  {msg.metadata?.actionButtons && msg.metadata?.panelId && (() => {
                    const panelId = msg.metadata.panelId;
                    const isApproved = panelStatuses[panelId] === 'approved';
                    const isLoading = buttonLoading === panelId;
                    const proceedLabel = msg.metadata.proceedLabel || 'Valider ✓';
                    const needDataLabel = msg.metadata.needDataLabel || "Besoin d'infos";

                    return (
                      <div className="mt-3 space-y-2">
                        {isApproved ? (
                          <div className="flex items-center gap-2 text-green-700 bg-green-50 rounded-lg p-2 text-xs">
                            <CheckCircle className="w-4 h-4" />
                            <span className="font-medium">Réponse validée ✓</span>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button onClick={() => handleActionValidate(panelId, proceedLabel)} disabled={isLoading}
                              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-medium disabled:opacity-50">
                              {isLoading ? <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                              {proceedLabel}
                            </button>
                            <button onClick={() => handleActionNeedInfo(panelId, needDataLabel)} disabled={isLoading}
                              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-xl text-sm font-medium disabled:opacity-50">
                              <HelpCircle className="w-4 h-4" />
                              {needDataLabel}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  <p className={`text-[10px] mt-1 ${msg.sender === 'client' ? 'text-blue-200' : 'text-gray-400'}`}>
                    {formatDistanceToNow(new Date(msg.timestamp), { addSuffix: true, locale: fr })}
                  </p>
                </div>
                {msg.sender === 'client' && (
                  <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                    {currentUser?.name?.charAt(0) || '?'}
                  </div>
                )}
              </div>
            );
          })
        )}
        {/* Carte(s) formulaire en attente — dans le flux du chat */}
        {pendingForms.map(panel => {
          const formDef = forms[panel.formId];
          const formName = formDef?.name || 'Formulaire';
          const isRejected = panel.status === 'rejected';
          return (
            <motion.div
              key={panel.panelId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className={`max-w-[85%] rounded-2xl rounded-bl-none p-4 shadow-sm ${isRejected ? 'bg-red-50 border border-red-200' : 'bg-white border border-orange-200'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <ClipboardList className={`h-5 w-5 ${isRejected ? 'text-red-500' : 'text-orange-500'}`} />
                  <span className="font-semibold text-sm text-gray-900">{formName}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isRejected ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                    {isRejected ? 'Rejeté' : 'En attente'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-3">
                  {isRejected ? 'Votre formulaire a été refusé. Veuillez le modifier et renvoyer.' : 'Votre conseiller vous a envoyé un formulaire à compléter.'}
                </p>
                <button
                  onClick={() => setShowFormModal(true)}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white ${isRejected ? 'bg-red-500 hover:bg-red-600' : 'bg-orange-500 hover:bg-orange-600'} active:scale-[0.97] transition-all`}
                >
                  <ClipboardList className="h-4 w-4" />
                  {isRejected ? 'Modifier le formulaire' : 'Remplir le formulaire'}
                </button>
              </div>
            </motion.div>
          );
        })}
        <div ref={chatEndRef} />
      </div>

      {/* Input fixe en bas */}
      <div className="px-4 py-3 border-t bg-white flex-shrink-0">
        {attachedFile && (
          <div className="mb-2 text-sm text-gray-600 flex items-center gap-2">
            <Paperclip className="w-4 h-4" />
            <span className="truncate">{attachedFile.name}</span>
            <button onClick={() => setAttachedFile(null)} className="text-red-500 ml-auto">&times;</button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="flex-shrink-0">
            <Paperclip className={`h-5 w-5 ${uploading ? 'text-gray-300' : 'text-gray-500'}`} />
          </Button>
          <input type="file" ref={fileInputRef} onChange={(e) => e.target.files?.[0] && setAttachedFile(e.target.files[0])} className="hidden" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" />
          <Input
            placeholder="Écrire à votre conseiller..."
            className="flex-1 h-10"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          />
          <Button onClick={handleSendMessage} size="icon" className="bg-green-500 hover:bg-green-600 flex-shrink-0" disabled={uploading}>
            {uploading ? <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Modal formulaire plein écran */}
      {showFormModal && (
        <MobileFormModal
          projectType={projectType}
          onClose={() => setShowFormModal(false)}
        />
      )}
    </div>
  );
};

export default MobileChatProjectPage;
