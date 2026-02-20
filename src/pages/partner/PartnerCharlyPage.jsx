import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useSupabaseChatMessages } from '@/hooks/useSupabaseChatMessages';
import { useSupabaseProjectFiles } from '@/hooks/useSupabaseProjectFiles';
import { Send, ArrowLeft, Loader2, MessageCircle, ChevronRight, Plus, Camera, Image as ImageIcon, FileText, X, Download } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { logger } from '@/lib/logger';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

/**
 * /partner/charly
 * Chat partenaire ↔ admin via Charly
 * - Liste des conversations (1 par prospect+project_type lié aux missions)
 * - Vue chat real-time avec channel='partner'
 * - Multi-tenant strict via RLS
 */

// ─────────────────────────────────────────────
// Sous-composant: Vue Chat pour une conversation
// ─────────────────────────────────────────────
const ChatView = ({ prospectId, projectType, prospectName, onBack }) => {
  const { messages, loading, sendMessage, markAsRead } = useSupabaseChatMessages(prospectId, projectType, 'partner');
  const { uploadFile, uploading } = useSupabaseProjectFiles({ projectType, prospectId, enabled: true });
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const photoInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  // Auto-scroll en bas
  useEffect(() => {
    requestAnimationFrame(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    });
  }, [messages]);

  // 🔥 iOS: Scroll to input when keyboard opens
  const handleFocus = useCallback(() => {
    setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 300);
  }, []);

  // Marquer les messages admin comme lus à l'ouverture
  useEffect(() => {
    if (!messages.length) return;
    const unread = messages.filter(m => m.sender !== 'partner' && !m.read).map(m => m.id);
    if (unread.length > 0) {
      markAsRead(unread);
    }
  }, [messages]);

  // Fermer le menu quand on clique ailleurs
  useEffect(() => {
    if (!showAttachMenu) return;
    const close = () => setShowAttachMenu(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [showAttachMenu]);

  // 📤 Upload et envoi d'un fichier/photo
  const handleFileUpload = async (file) => {
    if (!file) return;
    
    const maxSize = 10 * 1024 * 1024; // 10 MB
    if (file.size > maxSize) {
      toast({ title: '❌ Fichier trop volumineux', description: 'Maximum 10 MB.', variant: 'destructive' });
      return;
    }

    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const uploadedFile = await uploadFile({
        file,
        uploadedBy: user?.id,
        fieldLabel: 'chat-partner',
      });

      if (uploadedFile) {
        const fileData = {
          id: uploadedFile.id,
          name: uploadedFile.file_name,
          size: uploadedFile.file_size,
          type: uploadedFile.file_type,
          storagePath: uploadedFile.storage_path,
        };

        const isImage = file.type.startsWith('image/');
        const result = await sendMessage({
          sender: 'partner',
          channel: 'partner',
          text: isImage ? '📷 Photo' : `📎 ${file.name}`,
          file: fileData,
        });

        if (result.success) {
          toast({ title: '✅ Envoyé', description: file.name, className: 'bg-green-500 text-white' });
        }
      }
    } catch (err) {
      logger.error('PartnerChat: erreur upload fichier', { err: err.message });
      toast({ title: 'Erreur', description: "Impossible d'envoyer le fichier.", variant: 'destructive' });
    } finally {
      setSending(false);
      setShowAttachMenu(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    try {
      const result = await sendMessage({
        sender: 'partner',
        channel: 'partner',
        text: input.trim(),
      });
      if (result.success) {
        setInput('');
      } else {
        toast({ title: 'Erreur', description: "Message non envoyé.", variant: 'destructive' });
      }
    } catch (err) {
      logger.error('PartnerCharlyPage: erreur envoi message', { err: err.message });
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  // 🖼️ Ouvrir un fichier (signed URL)
  const handleFileClick = async (file) => {
    if (!file?.storagePath) return;
    try {
      const { data, error } = await supabase.storage
        .from('project-files')
        .createSignedUrl(file.storagePath, 3600);
      if (error) throw error;
      window.open(data.signedUrl, '_blank');
    } catch (err) {
      toast({ title: 'Erreur', description: "Impossible d'ouvrir le fichier.", variant: 'destructive' });
    }
  };

  // 🖼️ Obtenir URL signée pour preview image
  const [imageUrls, setImageUrls] = useState({});
  useEffect(() => {
    const loadImageUrls = async () => {
      const filesWithImages = messages.filter(m => m.file?.storagePath && m.file?.type?.startsWith('image/'));
      const newUrls = {};
      for (const msg of filesWithImages) {
        if (imageUrls[msg.file.storagePath]) continue;
        try {
          const { data } = await supabase.storage
            .from('project-files')
            .createSignedUrl(msg.file.storagePath, 3600);
          if (data?.signedUrl) newUrls[msg.file.storagePath] = data.signedUrl;
        } catch (e) { /* ignore */ }
      }
      if (Object.keys(newUrls).length > 0) {
        setImageUrls(prev => ({ ...prev, ...newUrls }));
      }
    };
    if (messages.length > 0) loadImageUrls();
  }, [messages]);

  return (
    <div 
      className="fixed inset-0 bottom-16 flex flex-col bg-white z-40"
      style={{ height: 'calc(100dvh - 4rem)', top: 0 }}
    >
      {/* Header avec bouton retour */}
      <div className="px-4 pt-4 pb-3 flex items-center gap-3 border-b border-gray-200 shrink-0">
        <button onClick={onBack} className="p-1.5 rounded-full hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="w-9 h-9 rounded-full bg-gray-900 flex items-center justify-center text-white font-bold text-sm">
          C
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-bold text-gray-900 truncate">{prospectName}</h2>
          <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide">{projectType}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 px-4 py-4 overflow-y-auto overscroll-contain">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-400">
            <MessageCircle className="w-10 h-10 mb-2" />
            <p className="text-sm">Aucun message. Commencez la conversation !</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isPartner = msg.sender === 'partner';
            const hasFile = msg.file?.storagePath;
            const isImage = hasFile && msg.file?.type?.startsWith('image/');
            const imgUrl = isImage ? imageUrls[msg.file.storagePath] : null;

            return (
              <div
                key={msg.id}
                className={`flex items-end gap-2 mb-3 ${isPartner ? 'justify-end' : 'justify-start'}`}
              >
                {!isPartner && (
                  <div className="w-7 h-7 rounded-full bg-gray-900 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    C
                  </div>
                )}
                <div
                  className={`max-w-[75%] rounded-2xl overflow-hidden ${
                    isPartner
                      ? 'bg-blue-600 text-white rounded-br-none'
                      : 'bg-gray-100 text-gray-900 rounded-bl-none'
                  }`}
                >
                  {/* 🖼️ Image preview */}
                  {isImage && imgUrl && (
                    <button onClick={() => handleFileClick(msg.file)} className="block w-full">
                      <img 
                        src={imgUrl} 
                        alt={msg.file.name} 
                        className="w-full max-h-52 object-cover"
                        loading="lazy"
                      />
                    </button>
                  )}
                  
                  {/* 📎 Fichier (non-image) */}
                  {hasFile && !isImage && (
                    <button 
                      onClick={() => handleFileClick(msg.file)} 
                      className={`flex items-center gap-2 px-4 pt-3 pb-1 w-full text-left ${
                        isPartner ? 'hover:bg-blue-700' : 'hover:bg-gray-200'
                      } transition-colors`}
                    >
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                        isPartner ? 'bg-blue-500' : 'bg-gray-300'
                      }`}>
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{msg.file.name}</p>
                        <p className={`text-xs ${isPartner ? 'text-blue-200' : 'text-gray-400'}`}>
                          {(msg.file.size / 1024).toFixed(0)} KB
                        </p>
                      </div>
                      <Download className={`w-4 h-4 shrink-0 ${isPartner ? 'text-blue-200' : 'text-gray-400'}`} />
                    </button>
                  )}

                  {/* Texte du message */}
                  <div className="px-4 py-2.5">
                    {(!hasFile || !isImage) && (
                      <p className="text-sm leading-relaxed">{msg.text}</p>
                    )}
                    <p className={`text-xs mt-1 ${isPartner ? 'text-blue-200' : 'text-gray-400'}`}>
                      {formatDistanceToNow(new Date(msg.timestamp), { addSuffix: true, locale: fr })}
                    </p>
                  </div>
                </div>
                {isPartner && (
                  <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    P
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input — sticky en bas */}
      <div className="px-3 pb-3 pt-2 border-t border-gray-100 bg-white shrink-0" ref={inputRef}>
        {/* Menu pièces jointes */}
        {showAttachMenu && (
          <div className="flex gap-4 justify-center py-3 mb-2 bg-gray-50 rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="flex flex-col items-center gap-1.5"
            >
              <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center text-white shadow-md">
                <Camera className="w-6 h-6" />
              </div>
              <span className="text-xs text-gray-600 font-medium">Photo</span>
            </button>
            <button
              onClick={() => photoInputRef.current?.click()}
              className="flex flex-col items-center gap-1.5"
            >
              <div className="w-12 h-12 rounded-full bg-purple-500 flex items-center justify-center text-white shadow-md">
                <ImageIcon className="w-6 h-6" />
              </div>
              <span className="text-xs text-gray-600 font-medium">Galerie</span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center gap-1.5"
            >
              <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white shadow-md">
                <FileText className="w-6 h-6" />
              </div>
              <span className="text-xs text-gray-600 font-medium">Fichier</span>
            </button>
          </div>
        )}

        {/* Hidden file inputs */}
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])} />
        <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])} />
        <input ref={fileInputRef} type="file" accept="*/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])} />

        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} autoComplete="off" className="flex items-center gap-2">
          {/* Bouton + */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setShowAttachMenu(!showAttachMenu); }}
            disabled={sending || uploading}
            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all ${
              showAttachMenu 
                ? 'bg-gray-900 text-white rotate-45' 
                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
            }`}
          >
            <Plus className="w-5 h-5" />
          </button>

          {/* Input texte */}
          <div className="flex-1 flex items-center gap-2 bg-gray-100 rounded-full px-4 py-2.5">
            <input
              type="text"
              name="chat-message-input"
              id="chat-message-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onFocus={handleFocus}
              enterKeyHint="send"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              data-form-type="other"
              data-lpignore="true"
              aria-autocomplete="none"
              placeholder="Écrire au bureau..."
              className="flex-1 bg-transparent text-base focus:outline-none"
              style={{ fontSize: '16px' }}
              disabled={sending || uploading}
            />
          </div>

          {/* Bouton envoyer */}
          <button
            type="submit"
            disabled={(sending || uploading) || !input.trim()}
            className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white shrink-0 disabled:opacity-40 transition-opacity"
          >
            {(sending || uploading) ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// Page principale: Liste des conversations
// ─────────────────────────────────────────────
const PartnerCharlyPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);

  // 🔥 Si on arrive depuis "Signaler un problème", ouvrir directement le chat
  useEffect(() => {
    if (location.state?.openChat && !selectedConversation) {
      const { prospectId, projectType, prospectName } = location.state.openChat;
      setSelectedConversation({ prospectId, projectType, prospectName });
      // Nettoyer le state pour éviter de re-ouvrir au retour
      window.history.replaceState({}, '');
    }
  }, [location.state]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);

        // 1. Auth check
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          navigate('/partner/login');
          return;
        }

        // 2. Récupérer le partner
        const { data: partnerData, error: partnerError } = await supabase
          .from('partners')
          .select('id, active')
          .eq('user_id', user.id)
          .single();

        if (partnerError || !partnerData || !partnerData.active) {
          navigate('/partner/login');
          return;
        }

        // 3. Charger les missions (pending + in_progress = conversations actives)
        const { data: missionsData, error: missionsError } = await supabase
          .from('missions')
          .select('id, prospect_id, project_type, title, status, client_name, step_name, created_at')
          .eq('partner_id', partnerData.id)
          .in('status', ['pending', 'in_progress'])
          .order('created_at', { ascending: false });

        if (missionsError) throw missionsError;
        if (!mounted) return;

        // 4. Dédupliquer par prospect_id + project_type (1 conversation = 1 couple unique)
        const seen = new Set();
        const uniqueConvos = [];
        for (const m of (missionsData || [])) {
          const key = `${m.prospect_id}__${m.project_type}`;
          if (!seen.has(key)) {
            seen.add(key);
            uniqueConvos.push({
              prospectId: m.prospect_id,
              projectType: m.project_type,
              prospectName: m.client_name || 'Client',
              stepName: m.step_name,
              missionTitle: m.title,
              missionId: m.id,
              status: m.status,
            });
          }
        }

        // 5. Pour chaque conversation, compter les messages non lus (envoyés par admin)
        const convosWithUnread = await Promise.all(
          uniqueConvos.map(async (convo) => {
            const { count, error: countError } = await supabase
              .from('chat_messages')
              .select('id', { count: 'exact', head: true })
              .eq('prospect_id', convo.prospectId)
              .eq('project_type', convo.projectType)
              .eq('channel', 'partner')
              .neq('sender', 'partner')
              .eq('read', false);

            return {
              ...convo,
              unreadCount: countError ? 0 : (count || 0),
            };
          })
        );

        setConversations(convosWithUnread);
      } catch (err) {
        logger.error('PartnerCharlyPage load error', { err: err.message });
        toast({ title: 'Erreur', description: "Impossible de charger les conversations.", variant: 'destructive' });
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, [navigate, selectedConversation]);

  // Vue chat ouverte
  if (selectedConversation) {
    return (
      <ChatView
        prospectId={selectedConversation.prospectId}
        projectType={selectedConversation.projectType}
        prospectName={selectedConversation.prospectName}
        onBack={() => setSelectedConversation(null)}
      />
    );
  }

  // Vue liste des conversations
  return (
    <div className="flex flex-col h-full min-h-[calc(100vh-5rem)]">
      {/* Header */}
      <div className="px-4 pt-6 pb-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center text-white font-bold text-sm">
          C
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Charly</h1>
          <p className="text-xs text-blue-600 font-bold tracking-wide uppercase">Assistant Direction</p>
        </div>
      </div>

      {/* Liste conversations */}
      <div className="flex-1 px-4 py-2 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400">
            <MessageCircle className="w-12 h-12 mb-3" />
            <p className="text-sm font-medium">Aucune conversation active</p>
            <p className="text-xs mt-1">Les conversations apparaîtront ici quand vous aurez des missions.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {conversations.map((convo) => (
              <button
                key={`${convo.prospectId}-${convo.projectType}`}
                onClick={() => setSelectedConversation(convo)}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all text-left"
              >
                {/* Avatar client */}
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-sm shrink-0">
                  {convo.prospectName.charAt(0).toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900 truncate">{convo.prospectName}</p>
                    {convo.unreadCount > 0 && (
                      <span className="bg-blue-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shrink-0">
                        {convo.unreadCount}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    {convo.projectType} {convo.stepName ? `· ${convo.stepName}` : ''}
                  </p>
                </div>

                <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PartnerCharlyPage;
