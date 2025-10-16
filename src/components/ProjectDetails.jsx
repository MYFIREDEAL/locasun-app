import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ArrowLeft, UploadCloud, Lock, Send, Paperclip, Download, FileText, Calendar, Clock, MapPin, Video, X, Phone, Mail, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import { useAppContext } from '@/App';

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
  const { getChatMessages, addChatMessage, currentUser, forms } = useAppContext();
  const [newMessage, setNewMessage] = useState('');
  const [attachedFile, setAttachedFile] = useState(null);
  const messages = getChatMessages(prospectId, projectType);
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    requestAnimationFrame(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    });
  }, [messages]);

  const handleSendMessage = () => {
    if (!newMessage.trim() && !attachedFile) return;

    const message = {
      sender: 'client',
      text: newMessage,
      file: attachedFile ? { name: attachedFile.name, size: attachedFile.size } : null,
    };

    addChatMessage(prospectId, projectType, message);
    setNewMessage('');
    setAttachedFile(null);
    requestAnimationFrame(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    });
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setAttachedFile(e.target.files[0]);
    }
  };

  const handleFileClick = () => {
    toast({
      title: "🚧 Fonctionnalité non implémentée",
      description: "Le téléchargement de fichiers n'est pas encore disponible.",
    });
  };

  return (
    <div className="mt-6">
      <div className="space-y-4 h-96 overflow-y-auto pr-2 mb-4 rounded-lg bg-gray-50 p-4 border">
        {messages.map((msg, index) => {
          if (msg.formId && !msg.text) {
            return null;
          }
          return (
          <div key={index} className={`flex items-end gap-2 ${msg.sender === 'client' ? 'justify-end' : 'justify-start'}`}>
            {msg.sender === 'pro' && <img alt="Charly" className="w-8 h-8 rounded-full" src="https://horizons-cdn.hostinger.com/43725989-d002-4543-b65c-278701925e7e/4e3f809791e357819f31c585852d3a99.png" />}
            <div className={`max-w-xs lg:max-w-md rounded-2xl ${msg.sender === 'client' ? 'bg-blue-500 text-white rounded-br-none p-2.5' : 'bg-gray-200 text-gray-800 rounded-bl-none p-3'}`}>
              {msg.text && <p className="text-xs leading-relaxed">{msg.text}</p>}
              {msg.file && (
                <button onClick={handleFileClick} className="mt-2 flex items-center gap-2 text-xs bg-white/20 p-2 rounded-lg w-full text-left">
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
          <Button variant="ghost" size="icon" onClick={() => fileInputRef.current.click()}>
            <Paperclip className="h-5 w-5 text-gray-500" />
          </Button>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
          <Button onClick={handleSendMessage} size="icon" className="bg-green-500 hover:bg-green-600 w-8 h-8">
            <Send className="h-4 w-4" />
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
    getChatMessages,
    registerClientForm,
    clearClientFormsFor,
  } = useAppContext();
  const [progress, setProgress] = useState(0);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  
  const steps = currentUser ? getProjectSteps(currentUser.id, project.type) : project.steps;
  const currentStepIndex = steps.findIndex(step => step.status === STATUS_CURRENT);
  const currentStep = steps[currentStepIndex] || steps[0];
  const effectiveStepIndex = currentStepIndex !== -1 ? currentStepIndex : 0;
  
  // Récupérer les RDV partagés pour l'étape en cours
  const sharedAppointments = currentUser && currentStep ? 
    getSharedAppointments(currentUser.id, project.type, currentStep.name) : [];

  const messages = currentUser ? getChatMessages(currentUser.id, project.type) : [];

  const formMessages = useMemo(() => {
    if (!messages.length) return [];

    const completionMap = new Map();
    messages.forEach(msg => {
      if (msg.completedFormId) {
        const key = `${msg.completedFormId}_${msg.relatedMessageTimestamp || ''}`;
        completionMap.set(key, msg);
      }
    });

    return messages
      .filter(msg => msg.sender === 'pro' && msg.formId)
      .map(msg => {
        const key = `${msg.formId}_${msg.timestamp || ''}`;
        const completion = completionMap.get(key);
        return {
          formId: msg.formId,
          messageTimestamp: msg.timestamp || '',
          promptId: msg.promptId || null,
          currentStepIndex: typeof msg.stepIndex === 'number' ? msg.stepIndex : effectiveStepIndex,
          status: completion ? 'submitted' : 'pending',
        };
      });
  }, [messages, effectiveStepIndex]);

  useEffect(() => {
    if (!currentUser) return;

    formMessages.forEach(formMsg => {
      registerClientForm({
        ...formMsg,
        prospectId: currentUser.id,
        projectType: project.type,
      });
    });
  }, [
    formMessages,
    currentUser,
    project.type,
    registerClientForm,
  ]);

  useEffect(() => {
    return () => {
      if (currentUser) {
        clearClientFormsFor(currentUser.id, project.type);
      }
    };
  }, [clearClientFormsFor, currentUser, project.type]);

  useEffect(() => {
    const completedSteps = steps.filter(step => step.status === STATUS_COMPLETED).length;
    const totalSteps = steps.length;
    const newProgress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
    setProgress(newProgress);
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
            <p className="text-sm text-gray-500">Projet #{project.id}</p>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
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

        <div className="lg:col-span-2 bg-white rounded-2xl shadow-card p-6">
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
