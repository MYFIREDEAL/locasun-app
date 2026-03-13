import { logger } from '@/lib/logger';
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ArrowLeft, UploadCloud, Lock, Send, Paperclip, Download, FileText, Calendar, Clock, MapPin, Video, X, Phone, Mail, User, CheckCircle, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import { useAppContext } from '@/App';
import { supabase } from '@/lib/supabase';
import { useSupabaseChatMessages } from '@/hooks/useSupabaseChatMessages';
import { useSupabaseProjectFiles } from '@/hooks/useSupabaseProjectFiles';
import ClientFormPanel from '@/components/client/ClientFormPanel';
import useWindowSize from '@/hooks/useWindowSize';

const STATUS_COMPLETED = 'completed';
const STATUS_CURRENT = 'in_progress';
const STATUS_PENDING = 'pending';

const statusConfig = {
  [STATUS_COMPLETED]: { label: 'Terminé', badge: 'bg-green-100 text-green-700', icon: 'bg-green-500 text-white shadow-soft', text: 'text-gray-900', iconOnly: 'bg-green-100 text-green-600' },
  [STATUS_CURRENT]: { label: 'En cours', badge: 'bg-blue-100 text-blue-700', icon: 'bg-blue-500 text-white shadow-soft ring-4 ring-blue-200', text: 'text-blue-900', iconOnly: 'bg-blue-100 text-blue-600' },
  [STATUS_PENDING]: { label: 'À venir', badge: 'bg-gray-100 text-gray-500', icon: 'bg-gray-100 text-gray-400', text: 'text-gray-500', iconOnly: 'bg-gray-200 text-gray-500' }
};

const AppointmentCard = ({ appointment, onClick }) => {
  const appointmentDate = new Date(appointment.start);
  const isPhysical = appointment.type === 'physical';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-blue-100 to-blue-200 border border-blue-400 rounded-lg p-2.5 shadow-md cursor-pointer hover:from-blue-200 hover:to-blue-300 transition-all duration-200"
      onClick={() => onClick(appointment)}
    >
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-blue-900 text-xs leading-tight">
            Rdv le {format(appointmentDate, 'EEEE dd/MM', { locale: fr })} à {format(appointmentDate, 'HH:mm')}
          </h4>
          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${isPhysical ? 'bg-blue-600 text-white' : 'bg-purple-600 text-white'}`}>
            {isPhysical ? 'Physique' : 'Visio'}
          </span>
        </div>
        
        {appointment.description && (
          <p className="text-blue-700 text-xs truncate">
            {appointment.description}
          </p>
        )}
      </div>
    </motion.div>
  );
};

const ChatInterface = ({ prospectId, projectType, currentStepIndex }) => {
  const { addChatMessage, currentUser, forms } = useAppContext();
  // ✅ Utiliser le hook Supabase pour les messages chat avec real-time
  // 🔒 channel='client' → ne voit que les messages client ↔ admin (pas partner)
  const { messages, loading: messagesLoading, loadMore, hasMore, loadingMore } = useSupabaseChatMessages(prospectId, projectType, 'client');
  // 🔥 Hook pour uploader les fichiers vers Supabase Storage
  // 🔥 MULTI-TENANT: Utilise organization_id du currentUser (prospect)
  const { uploadFile, uploading } = useSupabaseProjectFiles({ 
    projectType, 
    prospectId,
    organizationId: currentUser?.organization_id, // 🔥 MULTI-TENANT
    enabled: true 
  });
  const [newMessage, setNewMessage] = useState('');
  const [attachedFile, setAttachedFile] = useState(null);
  const chatEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const isInitialLoadRef = useRef(true);
  const fileInputRef = useRef(null);
  
  // 💬 MESSAGE: Track panel statuses for action buttons
  const [panelStatuses, setPanelStatuses] = useState({});
  const [buttonLoading, setButtonLoading] = useState(null); // panelId being processed

  // 💬 MESSAGE: Fetch panel statuses for action button messages
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
    
    // Real-time: écouter les changements de status des panels
    const channel = supabase
      .channel('message-panels-status')
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'client_form_panels',
      }, (payload) => {
        // Vérifier si ce panel fait partie de ceux qu'on suit
        if (panelIds.includes(payload.new.panel_id)) {
          setPanelStatuses(prev => ({
            ...prev,
            [payload.new.panel_id]: payload.new.status,
          }));
        }
      })
      .subscribe();
    
    return () => supabase.removeChannel(channel);
  }, [messages]);

  // 💬 MESSAGE: Client clique "Valider" — approuve TOUS les panels MESSAGE pending du projet
  const handleActionValidate = async (panelId, proceedLabel) => {
    setButtonLoading(panelId);
    try {
      // Trouver tous les panels MESSAGE pending de ce projet
      const allMessagePanelIds = messages
        .filter(msg => msg.metadata?.actionButtons && msg.metadata?.panelId)
        .map(msg => msg.metadata.panelId);

      // Approuver TOUS les panels MESSAGE pending (pas seulement celui cliqué)
      if (allMessagePanelIds.length > 0) {
        const { error: updateError } = await supabase
          .from('client_form_panels')
          .update({ status: 'approved' })
          .in('panel_id', allMessagePanelIds)
          .eq('status', 'pending');
        
        if (updateError) throw updateError;
      }
      
      // Envoyer message chat de confirmation
      addChatMessage(prospectId, projectType, {
        sender: 'client',
        text: `✅ ${proceedLabel || 'Validé'}`,
        metadata: { actionResponse: 'validated', panelId },
      });
      
      // Mettre à jour tous les statuts locaux
      setPanelStatuses(prev => {
        const updated = { ...prev };
        allMessagePanelIds.forEach(id => { updated[id] = 'approved'; });
        return updated;
      });
      
      toast({
        title: '✅ Confirmé',
        description: 'Votre réponse a été enregistrée.',
      });
    } catch (error) {
      logger.error('❌ Error validating action', error);
      toast({
        title: '❌ Erreur',
        description: 'Impossible de valider. Réessayez.',
        variant: 'destructive',
      });
    } finally {
      setButtonLoading(null);
    }
  };

  // 💬 MESSAGE: Client clique "Besoin d'infos"
  const handleActionNeedInfo = async (panelId, needDataLabel) => {
    setButtonLoading(panelId);
    try {
      // Envoyer message chat demandant plus d'infos
      addChatMessage(prospectId, projectType, {
        sender: 'client',
        text: `❓ ${needDataLabel || "J'ai besoin de plus d'informations"}`,
        metadata: { actionResponse: 'need_info', panelId },
      });
      
      toast({
        title: '📩 Message envoyé',
        description: 'Votre conseiller reviendra vers vous.',
      });
    } catch (error) {
      logger.error('❌ Error sending need info', error);
    } finally {
      setButtonLoading(null);
    }
  };

  // Scroll: instant au premier chargement, smooth pour les nouveaux messages
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

  // Scroll infini vers le haut : charger les messages plus anciens
  const handleChatScroll = useCallback(async (e) => {
    const container = e.target;
    if (container.scrollTop < 80 && hasMore && !loadingMore) {
      const prevScrollHeight = container.scrollHeight;
      await loadMore();
      requestAnimationFrame(() => {
        const newScrollHeight = container.scrollHeight;
        container.scrollTop = newScrollHeight - prevScrollHeight;
      });
    }
  }, [hasMore, loadingMore, loadMore]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() && !attachedFile) return;

    try {
      let fileData = null;

      // 🔥 Si un fichier est attaché, l'uploader d'abord vers Supabase Storage
      if (attachedFile) {
        // Vérifier la taille (max 10 MB)
        const maxSize = 10 * 1024 * 1024; // 10 MB
        if (attachedFile.size > maxSize) {
          toast({
            title: '❌ Fichier trop volumineux',
            description: 'La taille maximale est de 10 MB.',
            variant: 'destructive',
          });
          return;
        }

        logger.debug('📤 Uploading file from client chat', {
          name: attachedFile.name,
          size: attachedFile.size,
          type: attachedFile.type,
        });

        const uploadedFile = await uploadFile({
          file: attachedFile,
          uploadedBy: currentUser?.id,
        });

        if (uploadedFile) {
          fileData = {
            id: uploadedFile.id,
            name: uploadedFile.file_name,
            size: uploadedFile.file_size,
            type: uploadedFile.file_type,
            storagePath: uploadedFile.storage_path,
          };

          logger.debug('✅ File uploaded successfully', fileData);
        }
      }

      const message = {
        sender: 'client',
        text: newMessage,
        file: fileData,
      };

      addChatMessage(prospectId, projectType, message);
      setNewMessage('');
      setAttachedFile(null);
      
      requestAnimationFrame(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      });

      if (fileData) {
        toast({
          title: '✅ Fichier envoyé',
          description: `${fileData.name} a été envoyé avec succès.`,
        });
      }
    } catch (error) {
      logger.error('❌ Error sending message with file', error);
      toast({
        title: '❌ Erreur',
        description: `Impossible d'envoyer le fichier : ${error.message}`,
        variant: 'destructive',
      });
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setAttachedFile(e.target.files[0]);
    }
  };

  const handleFileClick = async (file) => {
    if (!file || !file.storagePath) {
      toast({
        title: "❌ Erreur",
        description: "Le fichier n'est pas disponible.",
        variant: 'destructive',
      });
      return;
    }

    try {
      logger.debug('📥 Downloading file', { storagePath: file.storagePath });

      // Récupérer l'URL publique signée (valide 1 heure)
      const { data, error } = await supabase.storage
        .from('project-files')
        .createSignedUrl(file.storagePath, 3600); // 1 heure

      if (error) throw error;

      // Ouvrir le fichier dans un nouvel onglet
      window.open(data.signedUrl, '_blank');

      toast({
        title: '✅ Téléchargement',
        description: `${file.name} s'ouvre dans un nouvel onglet.`,
      });
    } catch (error) {
      logger.error('❌ Error downloading file', error);
      toast({
        title: '❌ Erreur',
        description: `Impossible de télécharger le fichier : ${error.message}`,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="mt-6">
      <div ref={chatContainerRef} onScroll={handleChatScroll} className="space-y-4 h-96 overflow-y-auto pr-2 mb-4 rounded-lg bg-gray-50 p-4 border">
        {loadingMore && (
          <div className="flex items-center justify-center py-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500" />
            <span className="ml-2 text-xs text-gray-400">Chargement...</span>
          </div>
        )}
        {hasMore && !loadingMore && messages.length > 0 && (
          <button 
            onClick={loadMore}
            className="w-full text-center text-xs text-blue-500 hover:text-blue-700 py-1"
          >
            ↑ Charger les messages précédents
          </button>
        )}
        {messages.map((msg, index) => {
          if (msg.formId && !msg.text) {
            return null;
          }
          return (
          <div key={index} className={`flex items-end gap-2 ${msg.sender === 'client' ? 'justify-end' : 'justify-start'}`}>
            {(msg.sender === 'pro' || msg.sender === 'admin') && <img alt="Charly" className="w-8 h-8 rounded-full" src="https://horizons-cdn.hostinger.com/43725989-d002-4543-b65c-278701925e7e/4e3f809791e357819f31c585852d3a99.png" />}
            <div className={`max-w-xs lg:max-w-md rounded-2xl ${msg.sender === 'client' ? 'bg-blue-500 text-white rounded-br-none p-2.5' : 'bg-gray-200 text-gray-800 rounded-bl-none p-3'}`}>
              {msg.text && (
                (msg.sender === 'pro' || msg.sender === 'admin') && msg.text.includes('<a ') ? (
                  <p className="text-xs leading-relaxed" dangerouslySetInnerHTML={{ __html: msg.text }} />
                ) : (
                  <p className="text-xs leading-relaxed">{msg.text}</p>
                )
              )}
              {msg.file && (
                <button 
                  onClick={() => handleFileClick(msg.file)} 
                  className="mt-2 flex items-center gap-2 text-xs bg-white/20 hover:bg-white/30 p-2 rounded-lg w-full text-left transition-colors"
                >
                  <FileText className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{msg.file.name}</span>
                  <Download className="w-3 h-3 ml-auto flex-shrink-0" />
                </button>
              )}
              {msg.formId && forms[msg.formId] && (
                  <div className="mt-3 text-xs text-gray-600 bg-white rounded-xl p-3">
                    <p className="font-semibold text-gray-700 text-sm">
                      {forms[msg.formId].name}
                    </p>
                    <p className="mt-1">
                      Ce formulaire est disponible dans le panneau de droite pour être complété.
                    </p>
                  </div>
              )}
              {/* 💬 MESSAGE: Boutons d'action (Valider / Besoin d'infos) */}
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
                        <button
                          onClick={() => handleActionValidate(panelId, proceedLabel)}
                          disabled={isLoading}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isLoading ? (
                            <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <CheckCircle className="w-3.5 h-3.5" />
                          )}
                          {proceedLabel}
                        </button>
                        <button
                          onClick={() => handleActionNeedInfo(panelId, needDataLabel)}
                          disabled={isLoading}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <HelpCircle className="w-3.5 h-3.5" />
                          {needDataLabel}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}
              <p className={`text-xs mt-1 ${msg.sender === 'client' ? 'text-blue-200' : 'text-gray-500'}`}>
                {formatDistanceToNow(new Date(msg.timestamp), { addSuffix: true, locale: fr })}
              </p>
            </div>
            {msg.sender === 'client' && <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center font-bold text-white">{currentUser?.name.charAt(0) || '?'}</div>}
          </div>
        );})}
        <div ref={chatEndRef} />
      </div>
      {attachedFile && (
        <div className="mb-2 text-sm text-gray-600 flex items-center gap-2">
          <Paperclip className="w-4 h-4" />
          <span>{attachedFile.name}</span>
          <button onClick={() => setAttachedFile(null)} className="text-red-500">&times;</button>
        </div>
      )}
      <div className="relative">
        <Input
          placeholder="Écrire à votre conseiller..."
          className="pr-24 h-12"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => fileInputRef.current.click()}
            disabled={uploading}
          >
            <Paperclip className={`h-5 w-5 ${uploading ? 'text-gray-300' : 'text-gray-500'}`} />
          </Button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden"
            accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
            disabled={uploading}
          />
          <Button 
            onClick={handleSendMessage} 
            size="icon" 
            className="bg-green-500 hover:bg-green-600 w-8 h-8"
            disabled={uploading}
          >
            {uploading ? (
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

const AppointmentModal = ({ appointment, onClose }) => {
  if (!appointment) return null;

  const { getAdminById } = useAppContext();
  const appointmentDate = new Date(appointment.start);
  const isPhysical = appointment.type === 'physical';
  
  // Récupérer les vraies données du conseiller
  const advisor = appointment.assignedUserId ? getAdminById(appointment.assignedUserId) : null;
  const contactInfo = advisor ? {
    firstName: advisor.name?.split(' ')[0] || 'Conseiller',
    lastName: advisor.name?.split(' ')[1] || 'Locasun',
    phone: advisor.phone || '+33 1 23 45 67 89',
    email: advisor.email || 'contact@locasun.com'
  } : {
    firstName: 'Conseiller',
    lastName: 'Locasun',
    phone: '+33 1 23 45 67 89',
    email: 'contact@locasun.com'
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Détails du rendez-vous</h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Date et heure */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-center space-x-3 mb-2">
                {isPhysical ? (
                  <MapPin className="h-5 w-5 text-blue-600" />
                ) : (
                  <Video className="h-5 w-5 text-blue-600" />
                )}
                <h4 className="font-semibold text-blue-900">
                  {isPhysical ? 'Rendez-vous physique' : 'Rendez-vous en visioconférence'}
                </h4>
              </div>
              <div className="text-center">
                <p className="font-medium text-gray-900 text-lg">
                  {format(appointmentDate, 'EEEE dd MMMM yyyy', { locale: fr })}
                </p>
                <p className="text-blue-700 font-medium">
                  {format(appointmentDate, 'HH:mm')}
                </p>
              </div>
            </div>

            {/* Description */}
            {appointment.description && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                  <h4 className="font-semibold text-amber-900">Commentaire</h4>
                </div>
                <p className="text-gray-700 leading-relaxed bg-white p-3 rounded border">
                  {appointment.description}
                </p>
              </div>
            )}

            {/* Contact */}
            <div className="border-t border-gray-200 pt-6">
              <h4 className="font-medium text-gray-900 mb-4 flex items-center space-x-2">
                <User className="h-5 w-5 text-gray-600" />
                <span>Votre conseiller</span>
              </h4>
              
              <div className="space-y-3">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="font-bold text-gray-900 text-xl">
                    {contactInfo.firstName} {contactInfo.lastName}
                  </p>
                  <p className="text-sm text-gray-500">Conseiller Locasun</p>
                </div>
                
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">{/*...*/}
                  <Phone className="h-5 w-5 text-blue-600" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-500">Téléphone</p>
                    <p className="font-medium text-gray-900">{contactInfo.phone}</p>
                  </div>
                  <a
                    href={`tel:${contactInfo.phone}`}
                    className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Appeler
                  </a>
                </div>
                
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <Mail className="h-5 w-5 text-green-600" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium text-gray-900">{contactInfo.email}</p>
                  </div>
                  <a
                    href={`mailto:${contactInfo.email}`}
                    className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors"
                  >
                    Écrire
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
            <Button
              onClick={onClose}
              className="w-full"
            >
              Fermer
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

const ProjectDetails = ({ project, onBack }) => {
  const {
    currentUser,
    getProjectSteps,
    updateProjectSteps,
    getSharedAppointments,
    clientFormPanels,
    clientNotifications,
    markClientNotificationAsRead,
  } = useAppContext();
  // ✅ Utiliser le hook Supabase pour les messages chat avec real-time
  // 🔒 channel='client' → ne voit que les messages client ↔ admin (pas partner)
  const { messages, loading: messagesLoading, loadMore, hasMore, loadingMore } = useSupabaseChatMessages(currentUser?.id, project.type, 'client');
  const { width } = useWindowSize();
  const isDesktop = width >= 1024;
  const isMobile = width < 768;
  const [progress, setProgress] = useState(0);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [stepsFromSupabase, setStepsFromSupabase] = useState(null);
  const [stepsLoading, setStepsLoading] = useState(true);
  
  // ✅ Vérifier si ce projet a des formulaires
  const hasProjectForms = currentUser ? clientFormPanels.some(
    panel => panel.prospectId === currentUser.id && panel.projectType === project.type
  ) : false;
  
  // ✅ PRIORITÉ ABSOLUE : Utiliser Supabase en priorité, sinon fallback sur template
  // 🔥 FIX: Si on utilise le template (fallback), s'assurer que la 1ère étape est "in_progress"
  const rawSteps = stepsFromSupabase || project.steps;
  const steps = useMemo(() => {
    if (!rawSteps || rawSteps.length === 0) return [];
    
    // Vérifier si au moins une étape est in_progress
    const hasCurrentStep = rawSteps.some(step => step.status === STATUS_CURRENT);
    
    if (!hasCurrentStep) {
      // Aucune étape en cours → mettre la première non-completed en in_progress
      const firstPendingIndex = rawSteps.findIndex(step => step.status !== STATUS_COMPLETED);
      if (firstPendingIndex !== -1) {
        return rawSteps.map((step, idx) => 
          idx === firstPendingIndex ? { ...step, status: STATUS_CURRENT } : step
        );
      }
    }
    return rawSteps;
  }, [rawSteps]);
  
  const currentStepIndex = steps.findIndex(step => step.status === STATUS_CURRENT);
  const currentStep = steps[currentStepIndex] || steps[0];
  const effectiveStepIndex = currentStepIndex !== -1 ? currentStepIndex : 0;
  
  // Récupérer les RDV partagés pour l'étape en cours
  const sharedAppointments = currentUser && currentStep ? 
    getSharedAppointments(currentUser.id, project.type, currentStep.name) : [];

  // ✅ Les formulaires viennent directement de Supabase via useSupabaseClientFormPanels (App.jsx)
  // L'admin crée les panneaux via registerClientForm() dans ProspectDetailsAdmin.jsx
  // Le client les voit automatiquement grâce au real-time Supabase

  // 🔥 REAL-TIME : Écouter les changements de steps depuis Supabase
  useEffect(() => {
    if (!currentUser?.id || !project.type) return;

    // Charger les steps initiaux depuis Supabase
    const fetchInitialSteps = async () => {
      try {
        setStepsLoading(true);
        
        const { data, error } = await supabase
          .from('project_steps_status')
          .select('steps')
          .eq('prospect_id', currentUser.id)
          .eq('project_type', project.type)
          .single();

        if (error) {
          console.warn('⚠️ No steps found in Supabase for this project, using template default');
          // Ne pas utiliser localStorage, rester sur le template par défaut
          setStepsFromSupabase(null);
          return;
        }

        if (data?.steps) {
          setStepsFromSupabase(data.steps);
        }
      } catch (err) {
        logger.error('❌ Error fetching initial steps:', err);
      } finally {
        setStepsLoading(false);
      }
    };

    fetchInitialSteps();

    // Écouter les changements real-time
    const channel = supabase
      .channel(`client-project-steps-${currentUser.id}-${project.type}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_steps_status',
          filter: `prospect_id=eq.${currentUser.id}`
        },
        (payload) => {
          if (payload.new?.project_type === project.type && payload.new?.steps) {
            setStepsFromSupabase(payload.new.steps);
            
            toast({
              title: "📊 Timeline mise à jour",
              description: "Votre conseiller a mis à jour l'avancement du projet",
              className: "bg-blue-500 text-white",
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id, project.type]);

  // 🔥 AUTO-MARK: Marquer les notifications du projet comme lues à l'ouverture
  useEffect(() => {
    if (!currentUser?.id || !project.type || !clientNotifications || !markClientNotificationAsRead) return;

    const projectNotifications = clientNotifications.filter(
      notif => !notif.read && notif.projectType === project.type
    );

    if (projectNotifications.length > 0) {
      projectNotifications.forEach(notif => {
        markClientNotificationAsRead(notif.id);
      });
    }
  }, [currentUser?.id, project.type, clientNotifications, markClientNotificationAsRead]);

  useEffect(() => {
    const completedSteps = steps.filter(step => step.status === STATUS_COMPLETED).length;
    const totalSteps = steps.length;
    const calculatedProgress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
    setProgress(calculatedProgress);
  }, [steps]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="flex items-center space-x-2 md:space-x-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="rounded-full hover:bg-gray-100 flex-shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center space-x-3 overflow-hidden">
          <div className={`w-10 h-10 md:w-12 md:h-12 ${project.color} rounded-xl flex items-center justify-center shadow-card flex-shrink-0`}>
            <span className="text-2xl">{project.icon}</span>
          </div>
          <div className="overflow-hidden">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 truncate">{project.clientTitle || project.title}</h1>
          </div>
        </div>
      </div>
      
      <div className={`flex flex-col ${isDesktop ? 'lg:flex-row' : ''} gap-8`}>
        {/* Colonne principale (gauche) */}
        <div className="flex-1 space-y-8">
          {/* Timeline et Chat en 2 colonnes sur desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-8">
            <div className="space-y-6">
              <div className="bg-white rounded-2xl shadow-card p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Progression globale</h2>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Avancement</span>
              <span className="text-lg font-bold text-green-600">{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <motion.div
                className="progress-bar h-3 rounded-full"
                initial={{ width: `0%` }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1 }}
              />
            </div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Suivi détaillé</h2>
            <div className="relative">
              <div className="absolute left-5 top-5 bottom-5 w-0.5 bg-gray-200" aria-hidden="true"></div>
              <div className="space-y-4">
                {steps.map((step, index) => {
                  const config = statusConfig[step.status] || statusConfig[STATUS_PENDING];
                  const isCurrentStep = step.status === STATUS_CURRENT;
                  const stepAppointments = isCurrentStep ? sharedAppointments : [];
                  
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="relative"
                    >
                      <div className="flex items-center space-x-4 relative">
                        <div className="relative z-10">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${config.iconOnly}`}>
                            {step.icon}
                          </div>
                        </div>
                        <div className="flex-1 flex items-center justify-between">
                          <h3 className={`font-medium ${config.text}`}>
                            {step.name}
                          </h3>
                          <span className={`text-xs px-2.5 py-1 rounded-full ${config.badge}`}>
                            {config.label}
                          </span>
                        </div>
                      </div>
                      
                      {/* RDV intégrés dans l'étape en cours */}
                      {isCurrentStep && stepAppointments.length > 0 && (
                        <div className="ml-14 mt-3 space-y-2">
                          {stepAppointments.map(appointment => (
                            <div key={appointment.id} className="ml-0">
                              <AppointmentCard 
                                appointment={appointment} 
                                onClick={setSelectedAppointment}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Chat du projet — MASQUÉ sur mobile (redesign : accès via onglet Chat) */}
        {!isMobile && (
        <div className="bg-white rounded-2xl shadow-card p-6">
          {currentStep && (
            <motion.div
              key={currentStep.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${statusConfig[currentStep.status]?.iconOnly || statusConfig[STATUS_PENDING].iconOnly}`}>
                    {currentStep.icon}
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900">{currentStep.name}</h2>
                </div>
                <span className={`text-xs px-3 py-1 rounded-full ${statusConfig[currentStep.status]?.badge || statusConfig[STATUS_PENDING].badge}`}>
                  {statusConfig[currentStep.status]?.label || statusConfig[STATUS_PENDING].label}
                </span>
              </div>

              <ChatInterface 
                prospectId={currentUser.id} 
                projectType={project.type}
                currentStepIndex={effectiveStepIndex}
              />
              
            </motion.div>
          )}
        </div>
        )}
          </div>
        </div>

        {/* Colonne formulaires (droite) - toujours visible sur desktop */}
        {isDesktop && (
          <div className="w-[335px] flex-shrink-0">
            <ClientFormPanel isDesktop projectType={project.type} />
          </div>
        )}

        {/* Formulaires en bas sur mobile — MASQUÉ (redesign mobile : accès via chat uniquement) */}
        {/* {!isDesktop && (
          <div className="w-full">
            <ClientFormPanel isDesktop={false} projectType={project.type} />
          </div>
        )} */}
      </div>
      
      {/* Modal des détails de RDV */}
      {selectedAppointment && (
        <AppointmentModal
          appointment={selectedAppointment}
          onClose={() => setSelectedAppointment(null)}
        />
      )}
    </motion.div>
  );
};

export default ProjectDetails;
