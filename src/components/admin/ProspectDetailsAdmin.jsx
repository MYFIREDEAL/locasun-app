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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { AddActivityModal } from '@/pages/admin/Agenda';
import SearchableSelect from '@/components/ui/SearchableSelect';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

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
  const { getChatMessages, addChatMessage, users, prompts, projectsData, forms, updateProspect, prospects, completeStepAndProceed } = useAppContext();
  const [newMessage, setNewMessage] = useState('');
  const [attachedFile, setAttachedFile] = useState(null);
  const messages = getChatMessages(prospectId, projectType);
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const availablePrompts = useMemo(() => {
    return Object.values(prompts).filter(prompt => {
      if (prompt.projectId !== projectType) return false;
      const stepConfig = prompt.stepsConfig?.[currentStepIndex];
      return stepConfig && stepConfig.actions && stepConfig.actions.length > 0;
    });
  }, [prompts, projectType, currentStepIndex]);
  
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
      stepConfig.actions.forEach(action => {
        if (action.message) {
          const message = {
            sender: 'pro',
            text: action.message,
          };
          addChatMessage(prospectId, projectType, message);
        }
        if (action.type === 'show_form' && action.formId) {
          const formMessage = {
            sender: 'pro',
            formId: action.formId,
          };
          addChatMessage(prospectId, projectType, formMessage);
        }
      });
    }
    setPopoverOpen(false);
  };


  return (
    <div className="mt-6">
      <div className="space-y-4 h-64 overflow-y-auto pr-2 mb-4 rounded-lg bg-gray-50 p-4 border">
        {messages.map((msg, index) => (
          <div key={index} className={`flex items-end gap-2 ${msg.sender === 'pro' ? 'justify-end' : 'justify-start'}`}>
            {msg.sender === 'client' && <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center font-bold text-white">{users[prospectId]?.name.charAt(0) || '?'}</div>}
            <div className={`max-w-xs lg:max-w-md p-3 rounded-2xl ${msg.sender === 'pro' ? 'bg-blue-500 text-white rounded-br-none' : 'bg-gray-200 text-gray-800 rounded-bl-none'}`}>
              {msg.text && <p className="text-sm">{msg.text}</p>}
              {msg.file && (
                <button onClick={handleFileClick} className="mt-2 flex items-center gap-2 text-sm bg-white/20 p-2 rounded-lg w-full text-left">
                  <FileText className="w-5 h-5 flex-shrink-0" />
                  <span className="truncate">{msg.file.name}</span>
                  <Download className="w-4 h-4 ml-auto flex-shrink-0" />
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
                      <span className={`text-xs px-2.5 py-1 rounded-full mt-1 sm:mt-0 ${config.badge}`}>
                        {config.label}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center space-x-2">
                      <Button variant="link" size="sm" className="text-xs px-1 h-auto py-0 text-blue-600" onClick={() => onUpdateStatus(index, STATUS_CURRENT)}>Mettre en cours</Button>
                      <Button variant="link" size="sm" className="text-xs px-1 h-auto py-0 text-green-600" onClick={() => onUpdateStatus(index, STATUS_COMPLETED)}>Terminer</Button>
                      <Button variant="link" size="sm" className="text-xs px-1 h-auto py-0 text-gray-500" onClick={() => onUpdateStatus(index, STATUS_PENDING)}>Marquer à venir</Button>
                    </div>
                  </div>
                </motion.div>;
      })}
          </div>
        </div>;
};

const ProspectForms = ({ prospect, projectType, onUpdate }) => {
    const { forms } = useAppContext();
    const [formData, setFormData] = useState(prospect.formData || {});
    const [isEditing, setIsEditing] = useState(false);

    const relevantForms = useMemo(() => 
        Object.values(forms).filter(form => form.projectIds?.includes(projectType)),
        [forms, projectType]
    );

    useEffect(() => {
        setFormData(prospect.formData || {});
    }, [prospect.formData, projectType]);

    const handleInputChange = (fieldId, value) => {
        setFormData(prev => ({ ...prev, [fieldId]: value }));
    };

    const handleSave = () => {
        onUpdate({ ...prospect, formData });
        setIsEditing(false);
        toast({
            title: "✅ Formulaires enregistrés",
            description: "Les informations ont été sauvegardées pour ce prospect."
        });
    };

    const handleCancel = () => {
        setFormData(prospect.formData || {});
        setIsEditing(false);
    };

    if (relevantForms.length === 0) {
        return null;
    }

    return (
        <div className="bg-white rounded-2xl shadow-card p-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Formulaires</h2>
                {isEditing ? (
                    <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600 hover:bg-green-100" onClick={handleSave}><Save className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:bg-red-100" onClick={handleCancel}><X className="h-4 w-4" /></Button>
                    </div>
                ) : (
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsEditing(true)}><Edit className="h-4 w-4" /></Button>
                )}
            </div>
            <div className="space-y-6">
                {relevantForms.map(form => (
                    <div key={form.id}>
                        <h3 className="font-medium text-gray-800 mb-3 border-b pb-2">{form.name}</h3>
                        <div className="space-y-4">
                            {(form.fields || []).map(field => (
                                <div key={field.id}>
                                    <Label htmlFor={field.id}>{field.label}</Label>
                                    {isEditing ? (
                                        <Input
                                            id={field.id}
                                            type={field.type}
                                            value={formData[field.id] || ''}
                                            onChange={(e) => handleInputChange(field.id, e.target.value)}
                                            placeholder={field.placeholder || ''}
                                        />
                                    ) : (
                                        <p className="text-sm text-gray-700 mt-1 p-2 bg-gray-50 rounded-md min-h-[2.5rem]">
                                            {formData[field.id] || <span className="text-gray-400">Non renseigné</span>}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
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
  onUpdate
}) => {
  const { getProjectSteps, completeStepAndProceed, updateProjectSteps, users, markNotificationAsRead, projectsData, formContactConfig, currentUser, userProjects, setUserProjects } = useAppContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialProject = searchParams.get('project');
  const notificationId = searchParams.get('notificationId');

  const [activeProjectTag, setActiveProjectTag] = useState(initialProject || (prospect.tags && prospect.tags.length > 0 ? prospect.tags[0] : null));
  const [isEditing, setIsEditing] = useState(false);
  const [editableProspect, setEditableProspect] = useState({
    ...prospect
  });
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);

  const userOptions = useMemo(() => [
    { value: 'unassigned', label: 'Non assigné' },
    ...Object.values(users).map(user => ({ value: user.id, label: user.name }))
  ], [users]);

  const projectSteps = activeProjectTag ? getProjectSteps(prospect.id, activeProjectTag) : [];
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
    setEditableProspect({
      ...prospect
    });
  }, [prospect]);
  
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

  const handleUpdateStatus = (clickedIndex, newStatus) => {
    if (newStatus === STATUS_COMPLETED) {
      completeStepAndProceed(prospect.id, activeProjectTag, clickedIndex);
    } else {
      const updatedSteps = projectSteps.map((step, index) => {
        let status = step.status;
        if (index === clickedIndex) {
            status = newStatus;
        }
        return { ...step, status };
      });
      updateProjectSteps(prospect.id, activeProjectTag, updatedSteps);
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
  const handleSave = () => {
    onUpdate(editableProspect);
    setIsEditing(false);
    toast({
      title: "✅ Prospect mis à jour",
      description: "Les informations du prospect ont été enregistrées."
    });
  };
  const handleInputChange = (fieldId, value) => {
    setEditableProspect(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const handleOwnerChange = (ownerId) => {
    setEditableProspect(prev => ({
      ...prev,
      ownerId: ownerId === 'unassigned' ? null : ownerId,
    }));
  };

  const activeProjectData = projectsData[activeProjectTag];
  return (
    <>
      <motion.div initial={{
        opacity: 0,
        y: 20
      }} animate={{
        opacity: 1,
        y: 0
      }} className="space-y-6">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full hover:bg-gray-100">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              {isEditing ? <Input name="name" value={editableProspect.name} onChange={(e) => handleInputChange('name', e.target.value)} className="text-2xl font-bold h-auto p-0 border-0 focus-visible:ring-0" /> : <h1 className="text-2xl font-bold text-gray-900">{prospect.name}</h1>}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-6">
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
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600 hover:bg-green-100" onClick={handleSave}><Save className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:bg-red-100" onClick={() => setIsEditing(false)}><X className="h-4 w-4" /></Button>
                      </div> : <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsEditing(true)}><Edit className="h-4 w-4" /></Button>}
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
                            value={editableProspect[field.id] || ''}
                            onChange={(e) => handleInputChange(field.id, e.target.value)}
                            className="h-8 text-sm"
                            placeholder={field.placeholder}
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
                          value={editableProspect.ownerId || 'unassigned'}
                          onSelect={handleOwnerChange}
                          placeholder="Sélectionner un utilisateur"
                          searchPlaceholder="Rechercher..."
                          emptyText="Aucun utilisateur trouvé."
                        />
                      ) : (
                        <p className="text-gray-700">{users[prospect.ownerId]?.name || 'Non assigné'}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-start space-x-3 pt-3 border-t border-gray-100">
                    <Hash className="h-4 w-4 text-gray-400 mt-1" />
                    <div className="flex-1">
                        <Label className="text-xs text-gray-500">ID Prospect</Label>
                        <p className="text-gray-700">{prospect.id}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-2xl shadow-card p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">
                  Suivi détaillé du projet : <span className="text-blue-600">{activeProjectData?.title || 'Aucun projet sélectionné'}</span>
                </h2>
                <ProjectTimeline steps={projectSteps} onUpdateStatus={handleUpdateStatus} />
              </div>
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
  const { appointments, calls, tasks, prospects, users } = useAppContext();
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
          <Button size="icon" className="rounded-full" onClick={() => setIsAddActivityModalOpen(true)}>
            <Plus className="h-5 w-5"/>
          </Button>
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
      
      {/* Modal d'ajout d'activité - réutilisation exacte de l'Agenda */}
      <AddActivityModal 
        open={isAddActivityModalOpen}
        onOpenChange={setIsAddActivityModalOpen}
        initialData={null}
        defaultAssignedUserId="user-1"
      />

    </>
  );
};

// Copie exacte du composant OtherActivityDetailsPopup de l'Agenda
const OtherActivityDetailsPopup = ({ activity, type, onClose, onEdit }) => {
  const { prospects, users, updateCall, deleteCall, updateTask, deleteTask, projectsData } = useAppContext();
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
  const assignedUser = users[activity.assignedUserId] || (contact ? users[contact.ownerId] : null);
  
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
  const { prospects, users, updateAppointment, deleteAppointment, projectsData } = useAppContext();
  const [status, setStatus] = useState(event?.status || 'pending');

  useEffect(() => {
    if (event) {
      setStatus(event.status || 'pending');
    }
  }, [event]);

  if (!event) return null;

  const contact = prospects.find(p => p.id === event.contactId);
  const assignedUser = users[event.assignedUserId] || (contact ? users[contact.ownerId] : null);

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



export default ProspectDetailsAdmin;