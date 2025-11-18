import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useSearchParams } from 'react-router-dom';
import { ArrowLeft, Phone, Mail, MessageCircle, MapPin, FileText, Download, Edit, Save, X, Building, User, Send, Paperclip, Bot, Tag, GripVertical, Hash, Calendar, Check, Users, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { useAppContext } from '@/App';
import { supabase } from '@/lib/supabase';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { AddActivityModal } from '@/pages/admin/Agenda';
import SearchableSelect from '@/components/ui/SearchableSelect';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useSupabaseUser } from '@/hooks/useSupabaseUser';
import { useSupabaseUsers } from '@/hooks/useSupabaseUsers';
import { useSupabaseProjectStepsStatus } from '@/hooks/useSupabaseProjectStepsStatus';
import { useSupabaseChatMessages } from '@/hooks/useSupabaseChatMessages';

const STATUS_COMPLETED = 'completed';
const STATUS_CURRENT = 'in_progress';
const STATUS_PENDING = 'pending';
const statusConfig = {
  [STATUS_COMPLETED]: {
    label: 'Terminé',
    badge: 'bg-green-100 text-green-700',
    icon: 'bg-green-500 text-white shadow-soft',
    text: 'text-gray-900',
    iconOnly: 'bg-green-100 text-green-600'
  },
  [STATUS_CURRENT]: {
    label: 'En cours',
    badge: 'bg-blue-100 text-blue-700',
    icon: 'bg-blue-500 text-white shadow-soft ring-4 ring-blue-200',
    text: 'text-blue-900',
    iconOnly: 'bg-blue-100 text-blue-600'
  },
  [STATUS_PENDING]: {
    label: 'À venir',
    badge: 'bg-gray-100 text-gray-500',
    icon: 'bg-gray-100 text-gray-400',
    text: 'text-gray-500',
    iconOnly: 'bg-gray-200 text-gray-500'
  }
};

const ChatForm = ({ form, prospectId, onFormSubmit }) => {
    const [formData, setFormData] = useState({});

    const handleInputChange = (fieldId, value) => {
        setFormData(prev => ({ ...prev, [fieldId]: value }));
    };

    const handleSubmit = () => {
        onFormSubmit(prospectId, form.id, formData);
        toast({
            title: "Réponses enregistrées",
            description: `Les réponses au formulaire "${form.name}" ont été sauvegardées.`,
            className: "bg-green-500 text-white"
        });
    };

    return (
        <div className="space-y-4">
            <h4 className="font-semibold text-gray-800">{form.name}</h4>
            {(form.fields || []).map(field => (
                <div key={field.id}>
                    <Label htmlFor={`${form.id}-${field.id}`}>{field.label}</Label>
                    <Input
                        id={`${form.id}-${field.id}`}
                        type={field.type}
                        value={formData[field.id] || ''}
                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                        placeholder={field.placeholder || ''}
                    />
                </div>
            ))}
            <Button onClick={handleSubmit} className="w-full">Soumettre</Button>
        </div>
    );
};

const ChatInterface = ({ prospectId, projectType, currentStepIndex }) => {
  const { addChatMessage, prompts, projectsData, forms, updateProspect, prospects, completeStepAndProceed, registerClientForm } = useAppContext();
  const { users: supabaseUsers, loading: usersLoading } = useSupabaseUsers(); // 🔥 Charger les utilisateurs Supabase
  // ✅ Utiliser le hook Supabase pour les messages chat avec real-time
  const { messages, loading: messagesLoading } = useSupabaseChatMessages(prospectId, projectType);
  const [newMessage, setNewMessage] = useState('');
  const [attachedFile, setAttachedFile] = useState(null);
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  
  // 🔥 Trouver le prospect pour afficher son nom dans le chat
  const currentProspect = prospects.find(p => p.id === prospectId);

  const availablePrompts = useMemo(() => {
    return Object.values(prompts).filter(prompt => {
      if (prompt.projectId !== projectType) return false;
      const stepConfig = prompt.stepsConfig?.[currentStepIndex];
      return stepConfig && stepConfig.actions && stepConfig.actions.length > 0;
    });
  }, [prompts, projectType, currentStepIndex]);
  
  useEffect(() => {
    requestAnimationFrame(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    });
  }, [messages]);

  const handleSendMessage = () => {
    if (!newMessage.trim() && !attachedFile) return;

    const message = {
      sender: 'pro',
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

  const handleFormSubmit = (pId, formId, formData) => {
    const prospect = prospects.find(p => p.id === pId);
    if (!prospect) return;

    const updatedFormData = { ...(prospect.formData || {}), ...formData };
    updateProspect({ ...prospect, formData: updatedFormData });
    
    const message = {
        sender: 'client',
        text: `A complété le formulaire : ${forms[formId]?.name || 'Formulaire'}.`,
    };
    addChatMessage(pId, projectType, message);

    const usedPrompt = Object.values(prompts).find(pr => {
        if (pr.projectId !== projectType) return false;
        const stepConfig = pr.stepsConfig?.[currentStepIndex];
        if (stepConfig?.autoCompleteStep) {
            return stepConfig.actions?.some(action => action.type === 'show_form' && action.formId === formId);
        }
        return false;
    });
    
    if (usedPrompt) {
        completeStepAndProceed(prospectId, projectType, currentStepIndex);
        toast({
            title: "Étape terminée !",
            description: "L'étape a été automatiquement marquée comme terminée.",
            className: "bg-green-500 text-white"
        });
    }
  };

  const handleSelectPrompt = (prompt) => {
    const stepConfig = prompt.stepsConfig?.[currentStepIndex];
    if (stepConfig && stepConfig.actions && stepConfig.actions.length > 0) {
      // ✅ Utiliser messages du hook Supabase
      const existingMessages = messages;
      stepConfig.actions.forEach(action => {
        if (action.message) {
          const alreadySent = existingMessages.some(msg =>
            msg.sender === 'pro' &&
            msg.promptId === prompt.id &&
            msg.stepIndex === currentStepIndex &&
            msg.text === action.message
          );
          if (alreadySent) {
            return;
          }
          const message = {
            sender: 'pro',
            text: action.message,
            promptId: prompt.id,
            stepIndex: currentStepIndex,
          };
          addChatMessage(prospectId, projectType, message);
        }
        if (action.type === 'show_form' && action.formId) {
          const alreadyQueued = existingMessages.some(msg =>
            msg.sender === 'pro' &&
            msg.promptId === prompt.id &&
            msg.stepIndex === currentStepIndex &&
            msg.formId === action.formId
          );
          if (alreadyQueued) {
            return;
          }
          const formMessage = {
            sender: 'pro',
            formId: action.formId,
            promptId: prompt.id,
            stepIndex: currentStepIndex,
          };
          addChatMessage(prospectId, projectType, formMessage);
          
          // 🔥 Enregistrer le formulaire dans clientFormPanels pour le panneau latéral
          const stepName = projectsData[projectType]?.steps?.[currentStepIndex]?.name || 'Étape inconnue';
          registerClientForm({
            prospectId: prospectId,
            projectType: projectType,
            formId: action.formId,
            currentStepIndex: currentStepIndex,
            promptId: prompt.id,
            messageTimestamp: Date.now(),
            status: 'pending',
            stepName: stepName, // 🔥 AJOUT: Nom de l'étape du pipeline
          });
        }
      });
    }
    setPopoverOpen(false);
  };


  return (
    <div className="mt-6">
      <div className="space-y-4 h-96 overflow-y-auto pr-2 mb-4 rounded-lg bg-gray-50 p-4 border">
        {messages.map((msg, index) => (
          <div key={index} className={`flex items-end gap-2 ${msg.sender === 'pro' ? 'justify-end' : 'justify-start'}`}>
            {msg.sender === 'client' && <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center font-bold text-white">{currentProspect?.name.charAt(0) || '?'}</div>}
            <div className={`max-w-xs lg:max-w-md rounded-2xl ${msg.sender === 'pro' ? 'bg-blue-500 text-white rounded-br-none p-2.5' : 'bg-gray-200 text-gray-800 rounded-bl-none p-3'}`}>
              {msg.text && <p className="text-xs leading-relaxed">{msg.text}</p>}
              {msg.file && (
                <button onClick={handleFileClick} className="mt-2 flex items-center gap-2 text-xs bg-white/20 p-2 rounded-lg w-full text-left">
                  <FileText className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{msg.file.name}</span>
                  <Download className="w-3 h-3 ml-auto flex-shrink-0" />
                </button>
              )}
              {msg.formId && forms[msg.formId] && (
                  <div className="mt-2 bg-white text-gray-800 p-3 rounded-lg">
                      <ChatForm 
                          form={forms[msg.formId]} 
                          prospectId={prospectId} 
                          onFormSubmit={handleFormSubmit} 
                      />
                  </div>
              )}
              <p className={`text-xs mt-1 ${msg.sender === 'pro' ? 'text-blue-200' : 'text-gray-500'}`}>
                {formatDistanceToNow(new Date(msg.timestamp), { addSuffix: true, locale: fr })}
              </p>
            </div>
            {msg.sender === 'pro' && !msg.formId && <img src="https://horizons-cdn.hostinger.com/43725989-d002-4543-b65c-278701925e7e/4e3f809791e357819f31c585852d3a99.png" alt="Charly" className="w-8 h-8 rounded-full" />}
          </div>
        ))}
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
          placeholder="Écrire au client..."
          className="pr-28 h-12"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon">
                <Bot className="h-5 w-5 text-gray-500" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
                <div className="grid gap-4">
                    <div className="space-y-2">
                        <h4 className="font-medium leading-none">Prompts disponibles</h4>
                        <p className="text-sm text-muted-foreground">
                            Pour l'étape : "{projectsData[projectType]?.steps[currentStepIndex]?.name}"
                        </p>
                    </div>
                    <div className="grid gap-2">
                        {availablePrompts.length > 0 ? (
                            availablePrompts.map(prompt => (
                                <button key={prompt.id} onClick={() => handleSelectPrompt(prompt)} className="text-left p-2 hover:bg-accent rounded-md">
                                    <p className="font-medium text-sm">{prompt.name}</p>
                                    <p className="text-xs text-muted-foreground">{projectsData[prompt.projectId]?.title}</p>
                                </button>
                            ))
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">Aucun prompt disponible pour cette étape.</p>
                        )}
                    </div>
                </div>
            </PopoverContent>
          </Popover>
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

const ProjectTimeline = ({
  steps,
  onUpdateStatus,
}) => {
  if (!steps) return null;
  return <div className="relative">
          <div className="absolute left-5 top-5 bottom-5 w-0.5 bg-gray-200" aria-hidden="true"></div>
          <div className="space-y-6">
            {steps.map((step, index) => {
        const config = statusConfig[step.status] || statusConfig[STATUS_PENDING];
        return <motion.div key={index} initial={{
          opacity: 0,
          x: -20
        }} animate={{
          opacity: 1,
          x: 0
        }} transition={{
          delay: index * 0.1
        }} className="flex items-start space-x-4 relative">
                  <div className="relative z-10">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${config.iconOnly}`}>
                      {step.icon}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                      <h3 className={`font-medium ${config.text}`}>
                        {step.name}
                      </h3>
                      <div className="relative" data-step-status-container>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`text-xs px-2.5 py-1 rounded-full mt-1 sm:mt-0 ${config.badge} hover:opacity-90`}
                          onClick={(e) => {
                            e.stopPropagation();
                            const target = e.currentTarget;
                            const menu = target.nextElementSibling;
                            const root = target.closest('[data-step-status-container]');
                            if (!menu || !root) return;
                            root.parentElement?.querySelectorAll('[data-dropdown="step-status"]').forEach(el => {
                              if (el !== menu) {
                                el.classList.add('hidden');
                              }
                            });
                            menu.classList.toggle('hidden');
                          }}
                        >
                          {config.label}
                        </Button>
                        <div className="hidden absolute right-0 mt-2 w-40 rounded-lg bg-white shadow-lg border border-gray-100 z-20 overflow-hidden" data-dropdown="step-status">
                          <button
                            className="w-full text-left text-xs px-3 py-2 hover:bg-blue-50 text-blue-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              onUpdateStatus(index, STATUS_CURRENT);
                              e.currentTarget.parentElement?.classList.add('hidden');
                            }}
                          >
                            Mettre en cours
                          </button>
                          <button
                            className="w-full text-left text-xs px-3 py-2 hover:bg-green-50 text-green-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              onUpdateStatus(index, STATUS_COMPLETED);
                              e.currentTarget.parentElement?.classList.add('hidden');
                            }}
                          >
                            Terminer
                          </button>
                          <button
                            className="w-full text-left text-xs px-3 py-2 hover:bg-gray-100 text-gray-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              onUpdateStatus(index, STATUS_PENDING);
                              e.currentTarget.parentElement?.classList.add('hidden');
                            }}
                          >
                            Marquer à venir
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>;
      })}
          </div>
        </div>;
};

const ProspectForms = ({ prospect, projectType, onUpdate }) => {
    const { forms, clientFormPanels } = useAppContext();
    const [editingPanelId, setEditingPanelId] = useState(null);
    const [editedData, setEditedData] = useState({});

    // ✅ Filtrer les formulaires pour ce prospect et ce projet
    const relevantPanels = useMemo(() => {
        return clientFormPanels.filter(panel => 
            panel.prospectId === prospect.id && 
            panel.projectType === projectType
        ).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    }, [clientFormPanels, prospect.id, projectType]);

    if (relevantPanels.length === 0) {
        return null;
    }

    const handleEdit = (panelId) => {
        setEditingPanelId(panelId);
        setEditedData({ ...prospect.formData });
    };

    const handleCancel = () => {
        setEditingPanelId(null);
        setEditedData({});
    };

    const handleSave = async () => {
        // Mettre à jour dans Supabase
        const { error } = await supabase
            .from('prospects')
            .update({ form_data: editedData })
            .eq('id', prospect.id);

        if (error) {
            console.error('❌ Erreur sauvegarde formulaire:', error);
            toast({
                title: 'Erreur',
                description: 'Impossible de sauvegarder les modifications.',
                variant: 'destructive',
            });
            return;
        }

        toast({
            title: '✅ Sauvegardé',
            description: 'Les modifications ont été enregistrées.',
            className: 'bg-green-500 text-white',
        });

        onUpdate({ ...prospect, formData: editedData });
        setEditingPanelId(null);
        setEditedData({});
    };

    const handleFieldChange = (fieldId, value) => {
        setEditedData(prev => ({ ...prev, [fieldId]: value }));
    };

    return (
        <div className="bg-white rounded-2xl shadow-card p-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Formulaires soumis</h2>
                <span className="text-xs text-gray-500">{relevantPanels.length} formulaire(s)</span>
            </div>
            <div className="space-y-4">
                {relevantPanels.map(panel => {
                    const formDefinition = forms[panel.formId];
                    const formData = prospect.formData || {};
                    
                    if (!formDefinition) return null;

                    return (
                        <div key={panel.panelId} className="border border-gray-200 rounded-xl p-4 space-y-3">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h3 className="font-semibold text-gray-900">{formDefinition.name}</h3>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Étape : {panel.stepName || 'Non spécifiée'}
                                    </p>
                                </div>
                                <span
                                    className={`text-xs px-2 py-1 rounded-full ${
                                        panel.status === 'submitted' ? 'bg-green-100 text-green-700' :
                                        panel.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                                        panel.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                        'bg-gray-100 text-gray-600'
                                    }`}
                                >
                                    {panel.status === 'submitted' ? 'Envoyé' :
                                     panel.status === 'approved' ? 'Approuvé' :
                                     panel.status === 'rejected' ? 'Rejeté' :
                                     'En attente'}
                                </span>
                            </div>

                            {panel.status === 'submitted' && (
                                <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                                    <p className="text-sm text-green-700">
                                        ✅ Client a soumis ce formulaire
                                    </p>
                                </div>
                            )}

                            <div className="space-y-3 pt-2">
                                {(formDefinition.fields || []).map(field => (
                                    <div key={field.id} className="space-y-1">
                                        <Label className="text-sm font-medium text-gray-600">{field.label}</Label>
                                        {editingPanelId === panel.panelId ? (
                                            <Input
                                                type={field.type || 'text'}
                                                value={editedData[field.id] || ''}
                                                onChange={(e) => handleFieldChange(field.id, e.target.value)}
                                                placeholder={field.placeholder || ''}
                                            />
                                        ) : (
                                            <p className="text-sm text-gray-900 p-2 bg-gray-50 rounded-md min-h-[40px] flex items-center">
                                                {formData[field.id] || <span className="text-gray-400 italic">Non renseigné</span>}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Boutons d'action admin */}
                            <div className="flex items-center justify-end space-x-2 pt-2 border-t">
                                {editingPanelId === panel.panelId ? (
                                    <>
                                        <Button variant="outline" size="sm" onClick={handleCancel}>
                                            <X className="h-4 w-4 mr-1" />
                                            Annuler
                                        </Button>
                                        <Button size="sm" onClick={handleSave} className="bg-green-600 hover:bg-green-700">
                                            <Save className="h-4 w-4 mr-1" />
                                            Sauvegarder
                                        </Button>
                                    </>
                                ) : (
                                    <Button variant="outline" size="sm" onClick={() => handleEdit(panel.panelId)}>
                                        <Edit className="h-4 w-4 mr-1" />
                                        Modifier
                                    </Button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const getFieldIcon = (field) => {
  switch (field.type) {
    case 'email': return <Mail className="h-4 w-4 text-gray-400" />;
    case 'phone':
    case 'tel': return <Phone className="h-4 w-4 text-gray-400" />;
    default:
      if (field.id.includes('company')) return <Building className="h-4 w-4 text-gray-400" />;
      if (field.id.includes('address')) return <MapPin className="h-4 w-4 text-gray-400" />;
      if (field.id.includes('name')) return <User className="h-4 w-4 text-gray-400" />;
      return <GripVertical className="h-4 w-4 text-gray-400" />;
  }
};

const ProspectDetailsAdmin = ({
  prospect,
  onBack,
  onUpdate,
  onEditingChange
}) => {
  const { getProjectSteps, completeStepAndProceed, updateProjectSteps, markNotificationAsRead, projectsData, formContactConfig, currentUser, userProjects, setUserProjects, getProjectInfo, updateProjectInfo } = useAppContext();
  const { supabaseUserId } = useSupabaseUser(); // 🔥 Récupérer l'UUID Supabase réel
  const { users: supabaseUsers, loading: usersLoading } = useSupabaseUsers(); // 🔥 Charger TOUS les utilisateurs Supabase
  const { projectStepsStatus: supabaseSteps, updateProjectSteps: updateSupabaseSteps } = useSupabaseProjectStepsStatus(prospect.id); // 🔥 Real-time steps
  const [searchParams, setSearchParams] = useSearchParams();
  const initialProject = searchParams.get('project') || prospect._selectedProjectType; // 🔥 Utiliser aussi _selectedProjectType depuis notification
  const notificationId = searchParams.get('notificationId');

  const [activeProjectTag, setActiveProjectTag] = useState(initialProject || (prospect.tags && prospect.tags.length > 0 ? prospect.tags[0] : null));
  const [isEditing, setIsEditing] = useState(false);
  
  // ✅ Utiliser un ref pour éditer SANS re-render à chaque caractère
  const editableProspectRef = useRef({...prospect});
  const [, forceUpdate] = useState({}); // Pour forcer un re-render uniquement quand on veut
  
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);

  const projectInfo = useMemo(() => {
    if (!activeProjectTag) return {};
    return getProjectInfo(prospect.id, activeProjectTag) || {};
  }, [activeProjectTag, getProjectInfo, prospect.id]);

  const savedAmount = projectInfo?.amount;
  const euroFormatter = useMemo(() => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }), []);
  const [projectAmountInput, setProjectAmountInput] = useState('');
  const [isEditingAmount, setIsEditingAmount] = useState(false);

  // 🔥 Utiliser les utilisateurs Supabase pour le dropdown
  const userOptions = useMemo(() => [
    { value: 'unassigned', label: 'Non assigné' },
    ...supabaseUsers.map(user => ({ value: user.id, label: user.name }))
  ], [supabaseUsers]);

  // 🔥 PRIORITÉ: Steps depuis Supabase (real-time), sinon fallback sur getProjectSteps
  const projectSteps = useMemo(() => {
    if (!activeProjectTag) return [];
    
    console.log('🔍 [ProspectDetailsAdmin] Loading steps:', {
      prospectId: prospect.id,
      prospectName: prospect.name,
      activeProjectTag,
      supabaseSteps,
      hasSupabaseSteps: !!supabaseSteps[activeProjectTag]
    });
    
    // Si on a des steps depuis Supabase, les utiliser
    if (supabaseSteps[activeProjectTag]) {
      console.log('✅ Using Supabase steps:', supabaseSteps[activeProjectTag]);
      return supabaseSteps[activeProjectTag];
    }
    
    // Sinon fallback sur l'ancienne méthode
    console.log('⚠️ Fallback to getProjectSteps (no Supabase data)');
    return getProjectSteps(prospect.id, activeProjectTag);
  }, [activeProjectTag, supabaseSteps, prospect.id, getProjectSteps]);

  const currentStepIndex = projectSteps.findIndex(step => step.status === STATUS_CURRENT);
  const currentStep = projectSteps[currentStepIndex] || projectSteps.find(s => s.status === STATUS_PENDING) || projectSteps[0];
  
  useEffect(() => {
    if (notificationId) {
      markNotificationAsRead(parseInt(notificationId));
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('notificationId');
      setSearchParams(newParams, { replace: true });
    }
  }, [notificationId, markNotificationAsRead, setSearchParams, searchParams]);

  useEffect(() => {
    // ✅ Mettre à jour le ref sans re-render
    editableProspectRef.current = {
      ...prospect
    };
  }, [prospect]);

  useEffect(() => {
    if (savedAmount === undefined || savedAmount === null || savedAmount === '') {
      setProjectAmountInput('');
    } else {
      setProjectAmountInput(savedAmount.toString());
    }
  }, [savedAmount, activeProjectTag]);

  // ✅ Notifier le parent quand le mode édition change (pour bloquer le real-time)
  useEffect(() => {
    if (onEditingChange) {
      onEditingChange(isEditing);
    }
  }, [isEditing, onEditingChange]);

  // ❌ SUPPRIMÉ : Tous les systèmes de blocage de scroll causent plus de problèmes qu'ils n'en résolvent
  // Le vrai problème est le re-render trop fréquent du composant
  
  const handleProjectClick = (tag) => {
    setActiveProjectTag(tag);
    setSearchParams(
      (prev) => {
        prev.set('project', tag);
        return prev;
      },
      { replace: true }
    );
  };

  const handleProjectAmountChange = (value) => {
    setProjectAmountInput(value);
  };

  const handleProjectAmountCommit = (rawValue) => {
    if (!activeProjectTag) return;
    const normalizedInput = rawValue.replace(',', '.').trim();

    if (normalizedInput === '') {
      updateProjectInfo(prospect.id, activeProjectTag, (prevInfo = {}) => {
        if (!prevInfo.amount) {
          return prevInfo;
        }
        const nextInfo = { ...prevInfo };
        delete nextInfo.amount;
        return nextInfo;
      });
      setProjectAmountInput('');
      return;
    }

    const parsedValue = parseFloat(normalizedInput);
    if (Number.isNaN(parsedValue) || parsedValue < 0) {
      setProjectAmountInput(savedAmount === undefined || savedAmount === null ? '' : savedAmount.toString());
      return;
    }

    const roundedValue = Math.round(parsedValue * 100) / 100;
    updateProjectInfo(prospect.id, activeProjectTag, (prevInfo = {}) => ({
      ...prevInfo,
      amount: roundedValue,
    }));
    setProjectAmountInput(roundedValue.toFixed(2));
  };

  const handleProjectAmountBlur = () => {
    handleProjectAmountCommit(projectAmountInput);
    setIsEditingAmount(false);
  };

  const handleProjectAmountKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleProjectAmountCommit(event.currentTarget.value);
      event.currentTarget.blur();
      setIsEditingAmount(false);
    }
  };

  const handleUpdateStatus = async (clickedIndex, newStatus) => {
    if (newStatus === STATUS_COMPLETED) {
      // Compléter et passer à l'étape suivante
      const newSteps = JSON.parse(JSON.stringify(projectSteps));
      newSteps[clickedIndex].status = 'completed';
      
      let nextStepIndex = clickedIndex + 1;
      if (nextStepIndex < newSteps.length) {
        newSteps[nextStepIndex].status = 'in_progress';
      }
      
      // Utiliser le hook Supabase (real-time)
      await updateSupabaseSteps(activeProjectTag, newSteps);
      
      // 🔥 MISE À JOUR DU PIPELINE GLOBAL
      // Si l'étape suivante a un globalStepId, déplacer le prospect dans cette colonne
      if (nextStepIndex < newSteps.length && newSteps[nextStepIndex].globalStepId) {
        const globalStepId = newSteps[nextStepIndex].globalStepId;
        console.log('🔄 Déplacement du prospect vers la colonne:', globalStepId);
        
        const updatedProspect = {
          ...prospect,
          status: globalStepId // Mettre à jour le status global du prospect
        };
        onUpdate(updatedProspect);
        
        toast({
          title: "📊 Pipeline mis à jour",
          description: "Le prospect a été déplacé dans le pipeline",
        });
      }
    } else {
      const updatedSteps = projectSteps.map((step, index) => {
        let status = step.status;
        if (index === clickedIndex) {
            status = newStatus;
        }
        return { ...step, status };
      });
      
      // Utiliser le hook Supabase (real-time)
      await updateSupabaseSteps(activeProjectTag, updatedSteps);
      
      // 🔥 MISE À JOUR DU PIPELINE GLOBAL si l'étape en cours a un globalStepId
      const currentStep = updatedSteps[clickedIndex];
      if (currentStep.globalStepId && newStatus === 'in_progress') {
        console.log('🔄 Déplacement du prospect vers la colonne:', currentStep.globalStepId);
        
        const updatedProspect = {
          ...prospect,
          status: currentStep.globalStepId
        };
        onUpdate(updatedProspect);
      }
    }
  };

  const handleAddProject = (projectType) => {
    const currentTags = prospect.tags || [];
    if (!currentTags.includes(projectType)) {
      const updatedProspect = {
        ...prospect,
        tags: [...currentTags, projectType]
      };
      onUpdate(updatedProspect);
      setActiveProjectTag(projectType);
      
      // Si ce prospect est le currentUser connecté, synchroniser avec userProjects
      if (currentUser && prospect.id === currentUser.id) {
        if (!userProjects.includes(projectType)) {
          const updatedUserProjects = [...userProjects, projectType];
          setUserProjects(updatedUserProjects);
          localStorage.setItem('userProjects', JSON.stringify(updatedUserProjects));
        }
      }
      
      toast({
        title: "✅ Projet ajouté !",
        description: `Le projet ${projectsData[projectType]?.title} a été associé au prospect.`,
      });
    }
    setShowAddProjectModal(false);
  };

  const getAvailableProjects = () => {
    const currentTags = prospect.tags || [];
    return Object.values(projectsData)
      .filter(project => project.isPublic && !currentTags.includes(project.type));
  };

  const handleActionClick = (action) => {
    switch (action) {
      case 'Appel':
        if (prospect.phone) window.location.href = `tel:${prospect.phone}`;
        break;
      case 'Mail':
        if (prospect.email) window.location.href = `mailto:${prospect.email}`;
        break;
      case 'WhatsApp':
        if (prospect.phone) {
          const phoneNumber = prospect.phone.replace(/[^0-9]/g, '');
          window.open(`https://wa.me/${phoneNumber}`, '_blank');
        } else {
          toast({
            title: "Numéro de téléphone manquant",
            description: "Ce contact n'a pas de numéro de téléphone.",
            variant: "destructive",
          });
        }
        break;
      case 'GPS':
        if (prospect.address) {
          const encodedAddress = encodeURIComponent(prospect.address);
          const isAppleDevice = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
          if (isAppleDevice) {
            window.location.href = `maps://?q=${encodedAddress}`;
          } else {
            window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank');
          }
        }
        break;
      default:
        toast({
          title: `Action: ${action}`,
          description: "🚧 Cette fonctionnalité n'est pas encore implémentée."
        });
    }
  };
  
  // ✅ Gérer le passage en mode édition SANS scroll
  const handleStartEditing = () => {
    // Sauvegarder la position actuelle
    const currentScrollY = window.scrollY;
    
    // Passer en mode édition
    setIsEditing(true);
    
    // Restaurer la position après le re-render (double RAF pour Safari)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.scrollTo({ top: currentScrollY, behavior: 'instant' });
      });
    });
  };
  
  const handleSave = () => {
    console.log('🔵 CLICK BOUTON SAUVEGARDER !');
    console.log('💾 Sauvegarde prospect:', {
      id: editableProspectRef.current.id,
      name: editableProspectRef.current.name,
      ownerId: editableProspectRef.current.ownerId
    });
    
    try {
      onUpdate(editableProspectRef.current);
      setIsEditing(false);
      toast({
        title: "✅ Prospect mis à jour",
        description: "Les informations du prospect ont été enregistrées."
      });
    } catch (err) {
      console.error('❌ Erreur sauvegarde:', err);
      toast({
        title: "❌ Erreur",
        description: err.message,
        variant: "destructive"
      });
    }
  };
  const handleInputChange = (fieldId, value) => {
    // ✅ Modifier directement le ref SANS déclencher de re-render
    editableProspectRef.current = {
      ...editableProspectRef.current,
      [fieldId]: value
    };
    // Ne PAS appeler forceUpdate() ici → pas de re-render !
  };

  const handleOwnerChange = (ownerId) => {
    console.log('👤 handleOwnerChange appelé avec:', ownerId);
    
    // 🔧 Convertir l'ID local en UUID Supabase si c'est l'utilisateur connecté
    let finalOwnerId = ownerId;
    
    if (ownerId === 'unassigned') {
      finalOwnerId = null;
      console.log('→ Non assigné (null)');
    } else if (ownerId === 'user-1' && supabaseUserId) {
      // Si on essaie d'assigner à "user-1" (ID local), utiliser l'UUID Supabase réel
      finalOwnerId = supabaseUserId;
      console.log('🔧 Conversion user-1 → UUID Supabase:', supabaseUserId);
    } else {
      console.log('→ UUID direct:', finalOwnerId);
    }
    
    console.log('✅ editableProspect.ownerId mis à jour:', finalOwnerId);
    
    // ✅ Modifier le ref sans re-render
    editableProspectRef.current = {
      ...editableProspectRef.current,
      ownerId: finalOwnerId,
    };
    console.log('📝 Nouvel editableProspectRef:', editableProspectRef.current);
  };

  const activeProjectData = projectsData[activeProjectTag];
  // ✅ Désactiver COMPLÈTEMENT le scroll automatique du navigateur
  useEffect(() => {
    // Désactiver le scroll automatique vers les éléments focusés
    const style = document.createElement('style');
    style.id = 'disable-auto-scroll';
    style.textContent = `
      * {
        scroll-margin: 0 !important;
        scroll-padding: 0 !important;
      }
      input:focus, textarea:focus, select:focus {
        scroll-margin-block: 0 !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      const existingStyle = document.getElementById('disable-auto-scroll');
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, []);

  return (
    <>
      <motion.div 
        initial={{
          opacity: 0,
          y: 20
        }} 
        animate={{
          opacity: 1,
          y: 0
        }} 
        className="space-y-6"
      >
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full hover:bg-gray-100">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              {/* ✅ Toujours en lecture seule - éditable uniquement dans le bloc "Information Prospect" */}
              <h1 className="text-2xl font-bold text-gray-900">{prospect.name}</h1>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[340px_minmax(0,1fr)_420px] gap-6 xl:gap-6 items-stretch">
            <div className="space-y-6">
               <div className="bg-white rounded-2xl shadow-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Projets associés</h2>
                  <Button size="icon" className="rounded-full" onClick={() => setShowAddProjectModal(true)}>
                    <Plus className="h-5 w-5"/>
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(prospect.tags || []).map(tag => <button key={tag} onClick={() => handleProjectClick(tag)} className={`px-4 py-1.5 text-sm font-semibold rounded-full transition-all duration-200 ${activeProjectTag === tag ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                      {projectsData[tag]?.title || tag}
                    </button>)}
                  {(!prospect.tags || prospect.tags.length === 0) && (
                    <p className="text-gray-400 text-sm italic">Aucun projet associé</p>
                  )}
                </div>
              </div>
              <div className="bg-white rounded-2xl shadow-card p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions rapides</h2>
                <div className="flex flex-wrap justify-between gap-2 text-center">
                  {[{
              icon: Phone,
              label: 'Appel'
            }, {
              icon: Mail,
              label: 'Mail'
            }, {
              icon: MessageCircle,
              label: 'WhatsApp'
            }, {
              icon: MapPin,
              label: 'GPS'
            }].map(({
              icon: Icon,
              label
            }) => <button key={label} onClick={() => handleActionClick(label)} className="flex flex-col items-center space-x-1 text-gray-600 hover:text-blue-600 transition-colors group">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center group-hover:bg-blue-100">
                        <Icon className="h-6 w-6" />
                      </div>
                      <span className="text-xs font-medium">{label}</span>
                    </button>)}
                </div>
              </div>

              {/* Bloc Activité en cours */}
              <ProspectActivities prospectId={prospect.id} />

              <ProspectForms prospect={prospect} projectType={activeProjectTag} onUpdate={onUpdate} />
              
              <div className="bg-white rounded-2xl shadow-card p-6">
                 <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">Informations Prospect</h2>
                    {isEditing ? <div className="flex items-center space-x-2">
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-green-600 hover:bg-green-100" onClick={handleSave}><Save className="h-4 w-4" /></Button>
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:bg-red-100" onClick={() => setIsEditing(false)}><X className="h-4 w-4" /></Button>
                      </div> : <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={handleStartEditing}><Edit className="h-4 w-4" /></Button>}
                 </div>
                <div className="space-y-3 text-sm">
                  {formContactConfig.map(field => (
                    <div key={field.id} className="flex items-start space-x-3">
                      {getFieldIcon(field)}
                      <div className="flex-1">
                        <Label htmlFor={field.id} className="text-xs text-gray-500">{field.name.replace('*', '')}</Label>
                        {isEditing ? (
                          <Input
                            id={field.id}
                            name={field.id}
                            type={field.type}
                            defaultValue={editableProspectRef.current[field.id] || ''}
                            onChange={(e) => handleInputChange(field.id, e.target.value)}
                            className="h-8 text-sm"
                            placeholder={field.placeholder}
                            autoFocus={false}
                          />
                        ) : (
                          <p className="text-gray-700">{prospect[field.id] || <span className="text-gray-400">Non renseigné</span>}</p>
                        )}
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center space-x-3 pt-3 border-t border-gray-100">
                    <User className="h-4 w-4 text-gray-400" />
                    <div className="flex-1">
                      <Label className="text-xs text-gray-500">Suivi par</Label>
                      {isEditing ? (
                        <SearchableSelect
                          options={userOptions}
                          value={editableProspectRef.current.ownerId || 'unassigned'}
                          onSelect={handleOwnerChange}
                          placeholder="Sélectionner un utilisateur"
                          searchPlaceholder="Rechercher..."
                          emptyText="Aucun utilisateur trouvé."
                        />
                      ) : (
                        <p className="text-gray-700">
                          {supabaseUsers.find(u => u.id === prospect.ownerId)?.name || 'Non assigné'}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-start space-x-3 pt-3 border-t border-gray-100">
                    <Hash className="h-4 w-4 text-gray-400 mt-1" />
                    <div className="flex-1">
                        <Label className="text-xs text-gray-500">ID Prospect</Label>
                        <p className="text-gray-700 text-xs font-mono">{prospect.id}</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3 pt-3 border-t border-gray-100">
                    <User className="h-4 w-4 text-gray-400 mt-1" />
                    <div className="flex-1">
                        <Label className="text-xs text-gray-500">ID Utilisateur (owner)</Label>
                        <p className="text-gray-700 text-xs font-mono">{prospect.ownerId || 'Non assigné'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6 xl:max-w-[520px] w-full flex flex-col xl:ml-[5%]">
              <div className="bg-white rounded-2xl shadow-card p-6 flex-1">
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

                    {activeProjectTag && (
                      <ChatInterface prospectId={prospect.id} projectType={activeProjectTag} currentStepIndex={currentStepIndex !== -1 ? currentStepIndex : 0} />
                    )}

                  </motion.div>
                )}
                {!currentStep && !activeProjectTag && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FileText className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun projet sélectionné</h3>
                    <p className="text-gray-500">Sélectionnez un projet dans la liste ci-dessus pour voir le suivi détaillé.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6 xl:max-w-[520px] w-full flex flex-col">
              {activeProjectTag && (
                <div className="bg-gradient-to-br from-gray-50 to-white rounded-3xl shadow-lg p-6 border border-gray-200 relative">
                  <button
                    onClick={() => setIsEditingAmount(!isEditingAmount)}
                    className="absolute top-3 right-3 p-1.5 hover:bg-white/50 rounded-lg transition-colors"
                    title={isEditingAmount ? "Annuler" : "Modifier le montant"}
                  >
                    {isEditingAmount ? (
                      <X className="h-4 w-4 text-gray-600" />
                    ) : (
                      <Edit className="h-4 w-4 text-gray-600" />
                    )}
                  </button>
                  <p className="text-xs font-medium text-gray-500 mb-2 text-center">Montant du deal</p>
                  {isEditingAmount ? (
                    <div className="flex items-center justify-center gap-3">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base text-gray-500">€</span>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          inputMode="decimal"
                          value={projectAmountInput}
                          onChange={(e) => handleProjectAmountChange(e.target.value)}
                          onKeyDown={handleProjectAmountKeyDown}
                          placeholder="0,00"
                          className="pl-7 text-xl font-bold text-center w-40 h-11"
                          autoFocus
                        />
                      </div>
                      <Button
                        size="sm"
                        onClick={handleProjectAmountBlur}
                        className="h-8"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <p className="text-4xl font-bold text-gray-900 text-center">
                      {typeof savedAmount === 'number' ? euroFormatter.format(savedAmount) : '0,00 €'}
                    </p>
                  )}
                </div>
              )}
              <div className="bg-white rounded-2xl shadow-card p-6 flex-1">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">
                  Étapes du projet
                </h2>
                <ProjectTimeline steps={projectSteps} onUpdateStatus={handleUpdateStatus} />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Modal pour ajouter un projet */}
        <Dialog open={showAddProjectModal} onOpenChange={setShowAddProjectModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Ajouter un projet</DialogTitle>
              <DialogDescription>
                Sélectionnez un projet à associer à ce prospect.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {getAvailableProjects().length > 0 ? (
                getAvailableProjects().map(project => (
                  <Button
                    key={project.type}
                    variant="outline"
                    onClick={() => handleAddProject(project.type)}
                    className="flex items-center justify-start space-x-3 h-auto p-4"
                  >
                    <span className="text-2xl">{project.icon}</span>
                    <span className="font-medium">{project.title}</span>
                  </Button>
                ))
              ) : (
                <p className="text-center text-gray-500 italic">
                  Tous les projets disponibles sont déjà associés à ce prospect.
                </p>
              )}
            </div>
          </DialogContent>
        </Dialog>
    </>
  );
};

// Composant réutilisant les mêmes cartes et modal que l'Agenda
const ProspectActivities = ({ prospectId }) => {
  const { appointments, calls, tasks, prospects } = useAppContext();
  const { users: supabaseUsers, loading: usersLoading } = useSupabaseUsers(); // 🔥 Charger les utilisateurs Supabase
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [selectedActivityType, setSelectedActivityType] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isAddActivityModalOpen, setIsAddActivityModalOpen] = useState(false);

  // Filtrer toutes les activités pour ce prospect
  const prospectActivities = useMemo(() => {
    const activities = [];
    
    // Ajouter les rendez-vous
    appointments.forEach(appointment => {
      if (appointment.contactId === prospectId) {
        activities.push({ ...appointment, activityType: 'appointment' });
      }
    });
    
    // Ajouter les appels
    calls.forEach(call => {
      if (call.contactId === prospectId) {
        activities.push({ ...call, activityType: 'call' });
      }
    });
    
    // Ajouter les tâches
    tasks.forEach(task => {
      if (task.contactId === prospectId) {
        activities.push({ ...task, activityType: 'task' });
      }
    });
    
    // Trier par date
    return activities.sort((a, b) => {
      const dateA = new Date(a.start || a.date);
      const dateB = new Date(b.start || b.date);
      return dateA - dateB;
    });
  }, [appointments, calls, tasks, prospectId]);

  const handleActivityClick = (activity, type) => {
    if (type === 'appointment') {
      setSelectedEvent(activity);
    } else {
      setSelectedActivity(activity);
      setSelectedActivityType(type);
    }
  };

  const handleCloseModal = () => {
    setSelectedActivity(null);
    setSelectedActivityType(null);
    setSelectedEvent(null);
  };

  return (
    <>
      <div className="bg-white rounded-2xl p-4 shadow mt-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-semibold text-gray-800">Activité en cours</h3>
          {/* 🚧 Bouton temporairement désactivé pour éviter le crash */}
          {/* <Button size="icon" className="rounded-full" onClick={() => setIsAddActivityModalOpen(true)}>
            <Plus className="h-5 w-5"/>
          </Button> */}
        </div>
        
        {prospectActivities.length === 0 ? (
          <p className="text-gray-400 italic">Aucune activité planifiée pour ce prospect.</p>
        ) : (
          <div className="space-y-3">
            {prospectActivities.map((activity) => {
              if (activity.activityType === 'appointment') {
                // Réutilisation du style des rendez-vous de l'Agenda
                const startDate = new Date(activity.start);
                
                // Configuration des badges de statut (identique à l'Agenda)
                const statusBadgeStyles = {
                  effectue: 'bg-green-500 text-white',
                  annule: 'bg-red-500 text-white',
                  reporte: 'bg-yellow-400 text-black',
                };
                
                const statusLabels = {
                  effectue: 'Effectué',
                  annule: 'Annulé',
                  reporte: 'Reporté',
                };
                
                return (
                  <div 
                    key={`appointment-${activity.id}`} 
                    onClick={() => handleActivityClick(activity, 'appointment')}
                    className="bg-white rounded-lg p-3 shadow-sm cursor-pointer hover:bg-gray-50 border-l-4 border-blue-500 relative"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <div className="flex-shrink-0">
                          <Calendar className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {activity.summary || activity.title || 'RDV'}
                          </p>
                          {activity.description && (
                            <p className="text-xs text-gray-600 truncate">
                              {activity.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end ml-2">
                        <span className="text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-1 rounded-full whitespace-nowrap">
                          {format(startDate, 'dd/MM')}
                        </span>
                        <span className="text-xs text-gray-500 mt-1">
                          {format(startDate, 'HH:mm')}
                        </span>
                      </div>
                    </div>
                    
                    {/* Badge de statut (identique à l'Agenda) */}
                    {statusLabels[activity.status] && (
                      <span className={`absolute bottom-1 right-1 text-xs font-bold px-2 py-0.5 rounded-full ${statusBadgeStyles[activity.status]}`}>
                        {statusLabels[activity.status]}
                      </span>
                    )}
                  </div>
                );
              } else if (activity.activityType === 'call') {
                // Réutilisation du style des appels de l'Agenda
                const callStatusBadges = {
                  effectue: 'bg-green-500 text-white',
                  annule: 'bg-red-500 text-white',
                };
                
                const callStatusLabels = {
                  effectue: 'Effectué',
                  annule: 'Annulé',
                };
                
                return (
                  <div 
                    key={`call-${activity.id}`} 
                    onClick={() => handleActivityClick(activity, 'call')}
                    className="bg-white rounded-lg p-3 flex items-center justify-between shadow-sm cursor-pointer hover:bg-gray-50 border-l-4 border-green-500 relative"
                  >
                    <div className="flex items-center">
                      <Phone className="mr-2 h-4 w-4 text-green-500" />
                      <p className={`font-medium text-sm text-gray-800 ${activity.status === 'effectue' || activity.status === 'annule' ? 'line-through text-gray-400' : ''}`}>
                        {activity.name}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-1 rounded-full">
                        {activity.time}
                      </span>
                      {/* Badge de statut pour les appels */}
                      {callStatusLabels[activity.status] && (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${callStatusBadges[activity.status]}`}>
                          {callStatusLabels[activity.status]}
                        </span>
                      )}
                    </div>
                  </div>
                );
              } else if (activity.activityType === 'task') {
                // Réutilisation du style des tâches de l'Agenda
                return (
                  <div 
                    key={`task-${activity.id}`} 
                    onClick={() => handleActivityClick(activity, 'task')}
                    className="bg-white rounded-lg p-3 flex items-center justify-between shadow-sm cursor-pointer hover:bg-gray-50 border-l-4 border-yellow-500 relative"
                  >
                    <p className={`text-sm font-medium ${activity.done ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                      {activity.text}
                    </p>
                    <div className="flex items-center space-x-2">
                      {activity.done && <Check className="h-5 w-5 text-green-500" />}
                      {/* Badge pour tâche terminée */}
                      {activity.done && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-500 text-white">
                          Terminé
                        </span>
                      )}
                    </div>
                  </div>
                );
              }
              return null;
            })}
          </div>
        )}
      </div>

      {/* Modal pour les appels et tâches */}
      <OtherActivityDetailsPopup 
        activity={selectedActivity} 
        type={selectedActivityType}
        onClose={handleCloseModal}
        onEdit={() => {}} // Pas d'édition depuis le prospect pour l'instant
      />
      
      {/* Modal pour les rendez-vous */}
      <EventDetailsPopup 
        event={selectedEvent}
        onClose={handleCloseModal}
        onReport={() => {}} // Pas de report depuis le prospect pour l'instant
        onEdit={() => {}} // Pas d'édition depuis le prospect pour l'instant
      />
      
      {/* 🚧 Modal temporairement désactivé pour éviter le crash */}
      {/* <AddActivityModal 
        open={isAddActivityModalOpen}
        onOpenChange={setIsAddActivityModalOpen}
        initialData={null}
        defaultAssignedUserId="user-1"
      /> */}

    </>
  );
};

// Copie exacte du composant OtherActivityDetailsPopup de l'Agenda
const OtherActivityDetailsPopup = ({ activity, type, onClose, onEdit }) => {
  const { prospects, updateCall, deleteCall, updateTask, deleteTask, projectsData } = useAppContext();
  const { users: supabaseUsers, loading: usersLoading } = useSupabaseUsers(); // 🔥 Charger les utilisateurs Supabase
  const [status, setStatus] = useState(activity?.status || 'pending');
  const [done, setDone] = useState(activity?.done || false);

  useEffect(() => {
    if (activity) {
      if (type === 'call') setStatus(activity.status || 'pending');
      if (type === 'task') setDone(activity.done || false);
    }
  }, [activity, type]);

  if (!activity) return null;

  const contact = prospects.find(p => p.id === activity.contactId);
  const assignedUser = supabaseUsers.find(u => u.id === activity.assignedUserId) || (contact ? supabaseUsers.find(u => u.id === contact.ownerId) : null);
  
  // Fonction pour capitaliser la première lettre
  const capitalizeFirstLetter = (string) => {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1);
  };

  const handleStatusChange = (newStatus) => {
    setStatus(newStatus);
    const updatedActivity = { ...activity, status: newStatus };
    if (type === 'call') {
      updateCall(updatedActivity);
    }
    setTimeout(() => onClose(), 300);
  };

  const handleDoneChange = (newDone) => {
    setDone(newDone);
    const updatedActivity = { ...activity, done: newDone };
    if (type === 'task') {
      updateTask(updatedActivity);
    }
    setTimeout(() => onClose(), 300);
  };

  const handleDelete = () => {
    if (type === 'call') {
      deleteCall(activity.id);
      toast({ title: "✅ Appel supprimé", description: "L'appel a été retiré de votre agenda." });
    } else if (type === 'task') {
      deleteTask(activity.id);
      toast({ title: "✅ Tâche supprimée", description: "La tâche a été retirée de votre agenda." });
    }
    onClose();
  };

  const handleActionClick = (action) => {
    if (!contact) {
      toast({ title: "Contact non trouvé", variant: "destructive" });
      return;
    }
    switch (action) {
      case 'Appel':
        if (contact.phone) window.location.href = `tel:${contact.phone}`;
        break;
      case 'Mail':
        if (contact.email) window.location.href = `mailto:${contact.email}`;
        break;
      case 'WhatsApp':
        if (contact.phone) {
          let phoneNumber = contact.phone.replace(/\D/g, '');
          if (phoneNumber.startsWith('0')) {
            phoneNumber = `33${phoneNumber.substring(1)}`;
          }
          const prefilledMessage = encodeURIComponent("Bonjour");
          window.open(`https://wa.me/${phoneNumber}?text=${prefilledMessage}`, '_blank');
        }
        break;
      case 'GPS':
        if (contact.address) {
          const encodedAddress = encodeURIComponent(contact.address);
          const isAppleDevice = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
          if (isAppleDevice) {
            window.location.href = `maps://?q=${encodedAddress}`;
          } else {
            window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank');
          }
        }
        break;
      default:
        toast({
          title: `Action: ${action}`,
          description: "🚧 Cette fonctionnalité n'est pas encore implémentée."
        });
    }
  };

  const isCall = type === 'call';
  const isTask = type === 'task';

  const title = isCall ? `Appel: ${activity.name}` : `Tâche: ${activity.text}`;
  const description = `Prévu le ${capitalizeFirstLetter(format(new Date(activity.date), "eeee d MMMM 'à' HH:mm", { locale: fr }))}`;

  const callStatusConfig = {
    pending: { color: 'bg-blue-500', label: 'Qualifier votre activité' },
    effectue: { color: 'bg-green-500', label: 'Effectué' },
    annule: { color: 'bg-red-500', label: 'Annulé' },
  };

  return (
    <Dialog open={!!activity} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md p-0">
        <div className="p-6 space-y-4">
          <DialogHeader className="p-0 text-left space-y-1">
            <DialogTitle className="text-2xl font-bold text-gray-900">{title}</DialogTitle>
            <DialogDescription className="text-base text-gray-500">{description}</DialogDescription>
          </DialogHeader>
          
          <div className="flex items-start space-x-3 text-gray-600">
            <Users className="h-5 w-5 text-gray-400 mt-1" />
            <div>
              <p className="font-medium">Participants</p>
              {contact && <p className="text-sm">{contact.name} (Client)</p>}
              {assignedUser && <p className="text-sm">{assignedUser.name} (Assigné)</p>}
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 p-6 space-y-4">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Actions rapides</h3>
          <div className="grid grid-cols-4 gap-2 text-center">
            {[{ icon: Phone, label: 'Appel' }, { icon: Mail, label: 'Mail' }, { icon: MessageCircle, label: 'WhatsApp' }, { icon: MapPin, label: 'GPS' }].map(({ icon: Icon, label }) => (
              <button key={label} onClick={() => handleActionClick(label)} className="flex flex-col items-center space-y-1 text-gray-600 hover:text-blue-600 transition-colors group">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center group-hover:bg-blue-100">
                  <Icon className="h-6 w-6" />
                </div>
                <span className="text-xs font-medium">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {isCall && (
          <div className={`p-4 text-white transition-colors ${callStatusConfig[status].color}`}>
            <Select onValueChange={handleStatusChange} value={status}>
              <SelectTrigger className="w-full bg-transparent border-none text-white text-lg font-semibold focus:ring-0 focus:ring-offset-0 h-auto p-0 text-center justify-center" iconClassName="h-8 w-8 opacity-100">
                <SelectValue placeholder="Qualifier votre activité" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending" disabled>Qualifier votre activité</SelectItem>
                <SelectItem value="effectue">Effectué</SelectItem>
                <SelectItem value="annule">Annulé</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {isTask && (
          <div className="p-6 bg-green-500 text-white">
            <div className="flex items-center space-x-3">
              <Switch
                id="task-done"
                checked={done}
                onCheckedChange={handleDoneChange}
                className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors duration-300 ${
                  done ? 'bg-white border border-gray-300' : 'bg-gray-500'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full transition-transform duration-300 ${
                    done ? 'translate-x-6 bg-gray-300' : 'translate-x-1 bg-white'
                  }`}
                />
              </Switch>
              <Label htmlFor="task-done" className="text-lg font-semibold text-white">{done ? 'Tâche effectuée' : 'Marquer comme effectuée'}</Label>
            </div>
          </div>
        )}

        <div className="border-t border-gray-200 p-6 space-y-4">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Infos activité</h3>
          <div className="space-y-3 text-sm">
            {isCall && (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-500">Projet</span>
                  <span className="font-medium text-gray-800">
                    {projectsData[activity.projectId]?.title || 'Aucun'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Étape</span>
                  <span className="font-medium text-gray-800">
                    {activity.step || 'Aucune'}
                  </span>
                </div>
              </>
            )}
            {isTask && (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-500">Projet</span>
                  <span className="font-medium text-gray-800">
                    {projectsData[activity.projectId]?.title || 'Aucun'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Étape</span>
                  <span className="font-medium text-gray-800">
                    {activity.step || 'Aucune'}
                  </span>
                </div>
              </>
            )}
             <div className="flex justify-between">
              <span className="text-gray-500">Note</span>
              <span className="font-medium text-gray-800 text-right">{activity.details || (isTask ? activity.text : 'Aucune')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Interlocuteur</span>
              <span className="font-medium text-gray-800">{contact?.name || 'N/A'}</span>
            </div>
          </div>
        </div>

        <DialogFooter className="p-6 bg-gray-50 sm:justify-between">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" className="text-red-600 hover:bg-red-50 hover:text-red-700">
                <Trash2 className="mr-2 h-4 w-4" />
                Supprimer
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Voulez-vous vraiment supprimer cette activité ?</AlertDialogTitle>
                <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Supprimer</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
           <Button 
              className={
                (type === 'call' && activity?.status && activity.status !== 'pending') ||
                (type === 'task' && activity?.done)
                  ? "bg-gray-400 hover:bg-gray-500 text-gray-700" 
                  : "bg-blue-600 hover:bg-blue-700"
              }
              onClick={() => onEdit(activity, type)}
            >
              Modifier l'activité
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Copie exacte du composant EventDetailsPopup de l'Agenda pour les RDV
const EventDetailsPopup = ({ event, onClose, onReport, onEdit }) => {
  const { prospects, updateAppointment, deleteAppointment, projectsData } = useAppContext();
  const { users: supabaseUsers, loading: usersLoading } = useSupabaseUsers(); // 🔥 Charger les utilisateurs Supabase
  const [status, setStatus] = useState(event?.status || 'pending');

  useEffect(() => {
    if (event) {
      setStatus(event.status || 'pending');
    }
  }, [event]);

  if (!event) return null;

  const contact = prospects.find(p => p.id === event.contactId);
  const assignedUser = supabaseUsers.find(u => u.id === event.assignedUserId) || (contact ? supabaseUsers.find(u => u.id === contact.ownerId) : null);

  // Fonction pour capitaliser la première lettre
  const capitalizeFirstLetter = (string) => {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1);
  };

  const handleStatusChange = (newStatus) => {
    setStatus(newStatus);
    const updatedEvent = { ...event, status: newStatus };
    updateAppointment(updatedEvent);
    setTimeout(() => onClose(), 300);
  };

  const handleDelete = () => {
    deleteAppointment(event.id);
    toast({ title: "✅ RDV supprimé", description: "Le rendez-vous a été retiré de votre agenda." });
    onClose();
  };

  const handleActionClick = (action) => {
    if (!contact) {
      toast({ title: "Contact non trouvé", variant: "destructive" });
      return;
    }
    switch (action) {
      case 'Appel':
        if (contact.phone) window.location.href = `tel:${contact.phone}`;
        break;
      case 'Mail':
        if (contact.email) window.location.href = `mailto:${contact.email}`;
        break;
      case 'WhatsApp':
        if (contact.phone) {
          let phoneNumber = contact.phone.replace(/\D/g, '');
          if (phoneNumber.startsWith('0')) {
            phoneNumber = `33${phoneNumber.substring(1)}`;
          }
          const prefilledMessage = encodeURIComponent("Bonjour");
          window.open(`https://wa.me/${phoneNumber}?text=${prefilledMessage}`, '_blank');
        }
        break;
      case 'GPS':
        if (contact.address) {
          const encodedAddress = encodeURIComponent(contact.address);
          const isAppleDevice = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
          if (isAppleDevice) {
            window.location.href = `maps://?q=${encodedAddress}`;
          } else {
            window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank');
          }
        }
        break;
      default:
        toast({
          title: `Action: ${action}`,
          description: "🚧 Cette fonctionnalité n'est pas encore implémentée."
        });
    }
  };

  const statusConfig = {
    pending: { color: 'bg-blue-500', label: 'Qualifier votre activité' },
    effectue: { color: 'bg-green-500', label: 'Effectué' },
    annule: { color: 'bg-red-500', label: 'Annulé' },
    reporte: { color: 'bg-yellow-500', label: 'Reporté' },
  };

  return (
    <Dialog open={!!event} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md p-0">
        <div className="p-6 space-y-4">
          <DialogHeader className="p-0 text-left space-y-1">
            <DialogTitle className="text-2xl font-bold text-gray-900">{event.summary}</DialogTitle>
            <DialogDescription className="text-base text-gray-500">
              {capitalizeFirstLetter(format(event.start, "eeee d MMMM, HH:mm", { locale: fr }))} - {format(event.end, "HH:mm", { locale: fr })}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex items-start space-x-3 text-gray-600">
            <Users className="h-5 w-5 text-gray-400 mt-1" />
            <div>
              <p className="font-medium">Participants</p>
              {contact && <p className="text-sm">{contact.name} (Client)</p>}
              {assignedUser && <p className="text-sm">{assignedUser.name} (Assigné)</p>}
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 p-6 space-y-4">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Actions rapides</h3>
          <div className="grid grid-cols-4 gap-2 text-center">
            {[{ icon: Phone, label: 'Appel' }, { icon: Mail, label: 'Mail' }, { icon: MessageCircle, label: 'WhatsApp' }, { icon: MapPin, label: 'GPS' }].map(({ icon: Icon, label }) => (
              <button key={label} onClick={() => handleActionClick(label)} className="flex flex-col items-center space-y-1 text-gray-600 hover:text-blue-600 transition-colors group">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center group-hover:bg-blue-100">
                  <Icon className="h-6 w-6" />
                </div>
                <span className="text-xs font-medium">{label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className={`p-4 text-white transition-colors ${statusConfig[status].color}`}>
          <Select onValueChange={handleStatusChange} value={status}>
            <SelectTrigger className="w-full bg-transparent border-none text-white text-lg font-semibold focus:ring-0 focus:ring-offset-0 h-auto p-0 text-center justify-center" iconClassName="h-8 w-8 opacity-100">
              <SelectValue placeholder="Qualifier votre activité" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending" disabled>Qualifier votre activité</SelectItem>
              <SelectItem value="effectue">Effectué</SelectItem>
              <SelectItem value="annule">Annulé</SelectItem>
              <SelectItem value="reporte">Reporté</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="border-t border-gray-200 p-6 space-y-4">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Infos activité</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Projet</span>
              <span className="font-medium text-gray-800">{projectsData[event.projectId]?.title || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Étape</span>
              <span className="font-medium text-gray-800">{event.step || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Note</span>
              <span className="font-medium text-gray-800 text-right">{event.description || 'Aucune'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Interlocuteur</span>
              <span className="font-medium text-gray-800">{contact?.name || 'N/A'}</span>
            </div>
          </div>
        </div>

        <DialogFooter className="p-6 bg-gray-50 sm:justify-between">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" className="text-red-600 hover:bg-red-50 hover:text-red-700">
                <Trash2 className="mr-2 h-4 w-4" />
                Supprimer
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Voulez-vous vraiment supprimer ce rendez-vous ?</AlertDialogTitle>
                <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Supprimer</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button 
            className={
              event?.status && event.status !== 'pending' 
                ? "bg-gray-400 hover:bg-gray-500 text-gray-700" 
                : "bg-blue-600 hover:bg-blue-700"
            } 
            onClick={() => onEdit(event)}
          >
            Modifier l'activité
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};



// ✅ Mémoïser le composant pour éviter les re-renders inutiles
export default React.memo(ProspectDetailsAdmin, (prevProps, nextProps) => {
  // Ne re-render QUE si le prospect.id change (pas les autres props)
  return prevProps.prospect.id === nextProps.prospect.id;
});
