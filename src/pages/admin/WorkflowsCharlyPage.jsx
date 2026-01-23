import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useAppContext } from '@/App';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Trash2, Plus, Bot, ChevronDown, ChevronRight } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { useSupabasePrompts } from '@/hooks/useSupabasePrompts';
import { useSupabaseContractTemplates } from '@/hooks/useSupabaseContractTemplates';
import { useSupabaseForms } from '@/hooks/useSupabaseForms';
import useSupabasePartners from '@/hooks/useSupabasePartners';
import ModulesNavBar from '@/components/admin/ModulesNavBar';

const ActionEditor = ({
  action,
  onChange,
  onDelete,
  forms,
  contractTemplates,
  partners = []
}) => {
  const handleActionChange = (field, value) => {
    onChange({
      ...action,
      [field]: value
    });
  };
  
  const addChecklistItem = () => {
    const newChecklist = [...(action.checklist || []), {
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: ''
    }];
    handleActionChange('checklist', newChecklist);
  };
  
  const updateChecklistItem = (index, text) => {
    const newChecklist = [...(action.checklist || [])];
    newChecklist[index].text = text;
    handleActionChange('checklist', newChecklist);
  };
  
  const deleteChecklistItem = (index) => {
    const newChecklist = [...(action.checklist || [])];
    newChecklist.splice(index, 1);
    handleActionChange('checklist', newChecklist);
  };
  
  return <div className="p-4 bg-white rounded-lg border space-y-4">
                {/* Indicateur d'ordre séquentiel */}
                {action.order !== undefined && action.waitForPrevious && (
                    <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                        <span className="text-sm text-blue-700">
                            ⏳ <strong>Action #{action.order + 1}</strong> - S'enverra automatiquement après validation de l'action précédente
                        </span>
                    </div>
                )}
                {action.order !== undefined && !action.waitForPrevious && (
                    <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                        <span className="text-sm text-green-700">
                            🚀 <strong>Action #{action.order + 1}</strong> - S'enverra immédiatement
                        </span>
                    </div>
                )}
                
                <div className="flex justify-between items-start">
                    <div className="flex-grow">
                        <Label className="text-sm font-semibold text-gray-700 mb-2 block">Type d'action</Label>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    handleActionChange('hasClientAction', true);
                                    // Si on vient de partner_task, reset le type à 'none'
                                    if (action.type === 'partner_task') {
                                        handleActionChange('type', 'none');
                                        handleActionChange('partnerId', null);
                                        handleActionChange('partnerInstructions', null);
                                        handleActionChange('isBlocking', null);
                                    }
                                }}
                                className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                                    action.hasClientAction === true && action.type !== 'partner_task'
                                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                                }`}
                            >
                                <div className="flex items-center justify-center gap-2">
                                    <span className="text-lg">👤</span>
                                    <span className="font-medium text-sm">Associée au client</span>
                                </div>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    handleActionChange('hasClientAction', false);
                                    // Si on vient de partner_task, reset le type à 'none'
                                    if (action.type === 'partner_task') {
                                        handleActionChange('type', 'none');
                                        handleActionChange('partnerId', null);
                                        handleActionChange('partnerInstructions', null);
                                        handleActionChange('isBlocking', null);
                                    }
                                }}
                                className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                                    action.hasClientAction === false && action.type !== 'partner_task'
                                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                                }`}
                            >
                                <div className="flex items-center justify-center gap-2">
                                    <span className="text-lg">💼</span>
                                    <span className="font-medium text-sm">Associée au commercial</span>
                                </div>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    handleActionChange('type', 'partner_task');
                                    handleActionChange('hasClientAction', null);
                                    // Nettoyer les champs client/commercial
                                    handleActionChange('formId', null);
                                    handleActionChange('templateId', null);
                                    handleActionChange('documentType', null);
                                }}
                                className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                                    action.type === 'partner_task'
                                        ? 'border-orange-500 bg-orange-50 text-orange-700'
                                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                                }`}
                            >
                                <div className="flex items-center justify-center gap-2">
                                    <span className="text-lg">🤝</span>
                                    <span className="font-medium text-sm">Associée au partenaire</span>
                                </div>
                            </button>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onDelete} className="ml-2">
                        <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                </div>
                
                {action.type === 'partner_task' ? (
                    // 🔶 UI pour les actions partenaire
                    <div className="space-y-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-700">Partenaire assigné</Label>
                            <Select 
                                value={action.partnerId || ''} 
                                onValueChange={value => handleActionChange('partnerId', value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Sélectionner un partenaire" />
                                </SelectTrigger>
                                <SelectContent>
                                    {partners
                                        .filter(p => p.isActive)
                                        .map(partner => (
                                            <SelectItem key={partner.id} value={partner.id}>
                                                {partner.companyName} ({partner.contactEmail})
                                            </SelectItem>
                                        ))}
                                    {(!partners || partners.filter(p => p.isActive).length === 0) && (
                                        <div className="px-2 py-1.5 text-sm text-gray-500">
                                            Aucun partenaire actif
                                        </div>
                                    )}
                                </SelectContent>
                            </Select>
                            {!action.partnerId && (
                                <p className="text-xs text-red-500">⚠️ Partenaire obligatoire pour sauvegarder</p>
                            )}
                        </div>
                        
                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-700">Instructions pour le partenaire</Label>
                            <Textarea
                                value={action.partnerInstructions || ''}
                                onChange={(e) => handleActionChange('partnerInstructions', e.target.value)}
                                placeholder="Ex: Effectuer la visite technique et remplir le rapport..."
                                className="min-h-[100px]"
                            />
                            <p className="text-xs text-gray-500">
                                Ces instructions seront visibles par le partenaire dans sa vue mobile
                            </p>
                        </div>
                        
                        <div className="flex items-center space-x-2 pt-2 border-t">
                            <Checkbox 
                                id={`blocking-${action.id}`}
                                checked={action.isBlocking !== false}
                                onCheckedChange={checked => handleActionChange('isBlocking', checked)}
                            />
                            <div className="space-y-1">
                                <Label htmlFor={`blocking-${action.id}`} className="text-sm font-medium text-gray-700 cursor-pointer">
                                    Action bloquante
                                </Label>
                                <p className="text-xs text-gray-500">
                                    {action.isBlocking !== false 
                                        ? '🔒 Le projet ne peut pas avancer tant que le partenaire n\'a pas terminé'
                                        : '🔓 Le projet peut continuer même si la mission n\'est pas terminée'}
                                </p>
                            </div>
                        </div>
                    </div>
                ) : action.hasClientAction !== false ? (
                    <>
                        <div className="space-y-2">
                            <Label>Message à dire</Label>
                            <Textarea placeholder="Ex: Bonjour, merci de compléter les informations..." value={action.message} onChange={e => handleActionChange('message', e.target.value)} />
                        </div>
                        
                        <div className="space-y-2">
                            <Label>Action à associer</Label>
                            <Select value={action.type} onValueChange={value => handleActionChange('type', value)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Choisir une action" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Aucune</SelectItem>
                                    <SelectItem value="show_form">Afficher un formulaire</SelectItem>
                                    <SelectItem value="start_signature">Lancer une signature</SelectItem>
                                    <SelectItem value="request_document">Demander un document</SelectItem>
                                    <SelectItem value="open_payment">Ouvrir un paiement</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <AnimatePresence>
                            {action.type === 'show_form' && <motion.div initial={{
                opacity: 0,
                height: 0
              }} animate={{
                opacity: 1,
                height: 'auto'
              }} exit={{
                opacity: 0,
                height: 0
              }} className="space-y-2 overflow-hidden">
                                    <Label>Formulaire à afficher</Label>
                                    <Select value={action.formId} onValueChange={value => handleActionChange('formId', value)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Choisir un formulaire" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.values(forms)
                                                .filter(form => form.audience === 'client' || !form.audience) // 🔥 Filtrer uniquement les formulaires destinés au client
                                                .map(form => <SelectItem key={form.id} value={form.id}>{form.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </motion.div>}
                            
                            {action.type === 'request_document' && <motion.div initial={{
                opacity: 0,
                height: 0
              }} animate={{
                opacity: 1,
                height: 'auto'
              }} exit={{
                opacity: 0,
                height: 0
              }} className="space-y-2 overflow-hidden">
                                    <Label>Type de document attendu</Label>
                                    <input
                                        type="text"
                                        value={action.documentType || ''}
                                        onChange={(e) => handleActionChange('documentType', e.target.value)}
                                        placeholder="Ex: Facture EDF, RIB, Titre de propriété..."
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </motion.div>}

                            {action.type === 'start_signature' && <motion.div initial={{
                opacity: 0,
                height: 0
              }} animate={{
                opacity: 1,
                height: 'auto'
              }} exit={{
                opacity: 0,
                height: 0
              }} className="space-y-2 overflow-hidden">
                                    <Label>Template de contrat à utiliser</Label>
                                    <Select value={action.templateId} onValueChange={value => handleActionChange('templateId', value)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Sélectionner un template" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {contractTemplates
                                                .filter(template => template.isActive)
                                                .map(template => (
                                                    <SelectItem key={template.id} value={template.id}>
                                                        {template.name}
                                                    </SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>
                                    {!action.templateId && (
                                        <p className="text-xs text-red-500">⚠️ Template obligatoire pour sauvegarder</p>
                                    )}
                                </motion.div>}

                            {action.type === 'start_signature' && <motion.div initial={{
                opacity: 0,
                height: 0
              }} animate={{
                opacity: 1,
                height: 'auto'
              }} exit={{
                opacity: 0,
                height: 0
              }} className="space-y-4 overflow-hidden border-t pt-4">
                                    <div className="space-y-2">
                                        <Label className="font-semibold text-gray-700">Formulaire source des données</Label>
                                        <Select 
                                            value={action.formId || ''} 
                                            onValueChange={value => handleActionChange('formId', value)}
                                        >
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Sélectionner un formulaire" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {Array.isArray(forms) && forms.map(form => (
                                                    <SelectItem key={form.id} value={form.id}>
                                                        {form.name}
                                                    </SelectItem>
                                                ))}
                                                {(!Array.isArray(forms) || forms.length === 0) && (
                                                    <div className="px-2 py-1.5 text-sm text-gray-500">
                                                        Aucun formulaire disponible
                                                    </div>
                                                )}
                                            </SelectContent>
                                        </Select>
                                        <p className="text-xs text-blue-600">
                                            ℹ️ Les données du formulaire seront injectées directement dans le contrat
                                        </p>
                                    </div>
                                </motion.div>}
                        </AnimatePresence>

                        <div className="space-y-2">
                            <Label>Mode de gestion</Label>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => handleActionChange('managementMode', 'automatic')}
                                    className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                                        (action.managementMode || 'automatic') === 'automatic'
                                            ? 'border-green-500 bg-green-50 text-green-700'
                                            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                                    }`}
                                >
                                    <div className="flex items-center justify-center gap-2">
                                        <span className="text-lg">🤖</span>
                                        <span className="font-medium text-sm">Géré par l'IA</span>
                                    </div>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleActionChange('managementMode', 'manual')}
                                    className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                                        action.managementMode === 'manual'
                                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                                            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                                    }`}
                                >
                                    <div className="flex items-center justify-center gap-2">
                                        <span className="text-lg">👤</span>
                                        <span className="font-medium text-sm">Géré par commercial</span>
                                    </div>
                                </button>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                {(action.managementMode || 'automatic') === 'automatic' 
                                    ? '⚡ Envoyé automatiquement par Charly AI'
                                    : '👨‍💼 Le commercial devra envoyer manuellement'}
                            </p>
                            
                            <AnimatePresence>
                                {action.managementMode === 'manual' && <motion.div initial={{
                    opacity: 0,
                    height: 0
                  }} animate={{
                    opacity: 1,
                    height: 'auto'
                  }} exit={{
                    opacity: 0,
                    height: 0
                  }} className="pt-3 border-t overflow-hidden space-y-3">
                                        <div className="flex items-start space-x-2">
                                            <Checkbox 
                                                id={`create-task-${action.id}`}
                                                checked={action.createTask !== false}
                                                onCheckedChange={checked => handleActionChange('createTask', checked)}
                                            />
                                            <div className="space-y-1 flex-1">
                                                <Label htmlFor={`create-task-${action.id}`} className="text-sm font-medium text-gray-700 cursor-pointer">
                                                    Créer automatiquement une tâche pour le commercial
                                                </Label>
                                                <p className="text-xs text-gray-500">
                                                    Une tâche sera envoyée au commercial dès que cette étape devient l'étape en cours.
                                                </p>
                                            </div>
                                        </div>
                                        
                                        {action.createTask !== false && <div className="space-y-2 ml-6">
                                                <Label className="text-sm">Titre de la tâche</Label>
                                                <input
                                                    type="text"
                                                    value={action.taskTitle || 'Action requise pour ce client'}
                                                    onChange={(e) => handleActionChange('taskTitle', e.target.value)}
                                                    placeholder="Action requise pour ce client"
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>}
                                    </motion.div>}
                            </AnimatePresence>
                        </div>
                        
                        {action.type === 'show_form' && (
                            <div className="space-y-2">
                                <Label>Mode de vérification</Label>
                                <Select value={action.verificationMode || 'human'} onValueChange={value => handleActionChange('verificationMode', value)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Choisir le mode de vérification" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Pas de vérification (auto-validation)</SelectItem>
                                        <SelectItem value="ai">IA automatique</SelectItem>
                                        <SelectItem value="human">Humain (commercial vérifie)</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-gray-500">
                                    {action.verificationMode === 'none' && '✅ Validé automatiquement dès que le client termine'}
                                    {action.verificationMode === 'ai' && '🤖 L\'IA analysera et validera automatiquement'}
                                    {(!action.verificationMode || action.verificationMode === 'human') && '👤 Une tâche sera créée pour que le commercial vérifie'}
                                </p>
                                
                                {(!action.verificationMode || action.verificationMode === 'human') && (
                                    <div className="space-y-4 mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                        <div className="space-y-2">
                                            <Label className="text-sm font-medium text-gray-700">
                                                ✅ Message si validé
                                            </Label>
                                            <p className="text-xs text-gray-500">
                                                Ce message sera envoyé automatiquement dans le chat quand le commercial valide le formulaire
                                            </p>
                                            <Textarea
                                                value={action.approvalMessage || 'Merci ! Votre formulaire a été validé.'}
                                                onChange={(e) => handleActionChange('approvalMessage', e.target.value)}
                                                placeholder="Merci ! Votre formulaire a été validé."
                                                className="min-h-[60px]"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-sm font-medium text-gray-700">
                                                ❌ Message si rejeté
                                            </Label>
                                            <p className="text-xs text-gray-500">
                                                Message prédéfini affiché au commercial. Il pourra ajouter sa raison de refus avant d'envoyer dans le chat.
                                            </p>
                                            <Textarea
                                                value={action.rejectionMessage || 'Oups !! Votre formulaire a été rejeté pour la raison suivante :'}
                                                onChange={(e) => handleActionChange('rejectionMessage', e.target.value)}
                                                placeholder="Oups !! Votre formulaire a été rejeté pour la raison suivante :"
                                                className="min-h-[60px]"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                ) : (
                    <div className="space-y-3">
                        <Label className="text-sm font-medium text-gray-700">Checklist de tâches pour le commercial</Label>
                        <p className="text-xs text-gray-500">Liste des tâches à effectuer manuellement pour cette action</p>
                        
                        <div className="space-y-2">
                            {(action.checklist || []).map((item, index) => (
                                <div key={item.id} className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={item.text}
                                        onChange={(e) => updateChecklistItem(index, e.target.value)}
                                        placeholder="Ex: Vérifier le document"
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        onClick={() => deleteChecklistItem(index)}
                                        className="h-8 w-8"
                                    >
                                        <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                        
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={addChecklistItem}
                            className="w-full border-dashed"
                        >
                            <Plus className="h-4 w-4 mr-2" /> Ajouter une tâche
                        </Button>
                    </div>
                )}
            </div>;
};

const WorkflowsCharlyPage = () => {
  const { projectsData = {} } = useAppContext();
  const { organizationId } = useOrganization();
  
  // 🔥 Hook Supabase pour les formulaires (filtré par org)
  const {
    forms: supabaseFormsObject,
    loading: formsLoading
  } = useSupabaseForms(organizationId);
  
  // 🔥 Convertir l'objet en tableau pour le dropdown
  const supabaseForms = useMemo(() => {
    return Object.values(supabaseFormsObject || {});
  }, [supabaseFormsObject]);
  
  const {
    prompts: supabasePrompts,
    loading: promptsLoading,
    savePrompt: savePromptToSupabase,
    deletePrompt: deletePromptFromSupabase
  } = useSupabasePrompts({ organizationId });  // 🔥 Passer un objet { organizationId }

  const {
    templates: contractTemplates,
    loading: templatesLoading
  } = useSupabaseContractTemplates(organizationId);  // 🔥 Passer organizationId !

  // 🔥 Hook Supabase pour les partenaires
  const {
    partners,
    loading: partnersLoading
  } = useSupabasePartners(organizationId);

  const prompts = useMemo(() => {
    return supabasePrompts;
  }, [supabasePrompts]);

  const [editingPrompt, setEditingPrompt] = useState(null);

  const [promptData, setPromptData] = useState({
    name: '',
    tone: '',
    projectId: null,
    stepsConfig: {}
  });
  const [activeStep, setActiveStep] = useState(null);

  useEffect(() => {
    if (editingPrompt) {
      setPromptData(JSON.parse(JSON.stringify(editingPrompt)));
    } else {
      setPromptData({
        name: '',
        tone: '',
        projectId: null,
        stepsConfig: {}
      });
    }
  }, [editingPrompt]);

  const projectOptions = useMemo(() => Object.values(projectsData || {}).map(p => ({
    value: p.type,
    label: p.title
  })), [projectsData]);

  const projectSteps = useMemo(() => {
    if (!promptData.projectId) return [];
    return projectsData?.[promptData.projectId]?.steps || [];
  }, [promptData.projectId, projectsData]);

  const handleProjectChange = projectId => {
    setPromptData(prev => ({
      ...prev,
      projectId,
      stepsConfig: {}
    }));
    setActiveStep(null);
  };

  const toggleStep = stepIndex => {
    setActiveStep(activeStep === stepIndex ? null : stepIndex);
  };

  const handleActionChange = (stepIndex, actionIndex, newAction) => {
    const newStepsConfig = {
      ...promptData.stepsConfig
    };
    if (!newStepsConfig[stepIndex]) {
      newStepsConfig[stepIndex] = {
        actions: [],
        autoCompleteStep: false
      };
    }
    newStepsConfig[stepIndex].actions[actionIndex] = newAction;
    setPromptData(prev => ({
      ...prev,
      stepsConfig: newStepsConfig
    }));
  };

  const addAction = stepIndex => {
    const newStepsConfig = {
      ...promptData.stepsConfig
    };
    if (!newStepsConfig[stepIndex]) {
      newStepsConfig[stepIndex] = {
        actions: [],
        autoCompleteStep: false
      };
    }
    const currentActions = newStepsConfig[stepIndex].actions || [];
    const nextOrder = currentActions.length; // 0, 1, 2, etc.
    
    newStepsConfig[stepIndex].actions.push({
      id: `action-${Date.now()}`,
      message: '',
      type: 'none',
      hasClientAction: true,
      order: nextOrder,
      waitForPrevious: nextOrder > 0 // Si ce n'est pas la première action, attendre la précédente
    });
    setPromptData(prev => ({
      ...prev,
      stepsConfig: newStepsConfig
    }));
  };

  const deleteAction = (stepIndex, actionIndex) => {
    const newStepsConfig = {
      ...promptData.stepsConfig
    };
    if (newStepsConfig[stepIndex]) {
      newStepsConfig[stepIndex].actions.splice(actionIndex, 1);
    }
    setPromptData(prev => ({
      ...prev,
      stepsConfig: newStepsConfig
    }));
  };

  const handleStepConfigChange = (stepIndex, field, value) => {
    const newStepsConfig = {
      ...promptData.stepsConfig
    };
    if (!newStepsConfig[stepIndex]) {
      newStepsConfig[stepIndex] = {
        actions: [],
        autoCompleteStep: false
      };
    }
    newStepsConfig[stepIndex][field] = value;
    setPromptData(prev => ({
      ...prev,
      stepsConfig: newStepsConfig
    }));
  };

  const handleSavePrompt = async () => {
    if (!promptData.name || !promptData.tone || !promptData.projectId) {
      toast({
        title: "Champs manquants",
        description: "Veuillez remplir le nom, le ton et le projet.",
        variant: "destructive"
      });
      return;
    }

    const promptToSave = {
      ...promptData,
      id: editingPrompt?.id || `prompt-${Date.now()}`
    };

    const promptId = promptToSave.id || `prompt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    
    const result = await savePromptToSupabase(promptId, {
      name: promptToSave.name,
      tone: promptToSave.tone,
      projectId: promptToSave.projectId,
      stepsConfig: promptToSave.stepsConfig || {},
    });

    if (result.success) {
      toast({
        title: "✅ Prompt enregistré !",
        description: `Le prompt "${promptToSave.name}" a été sauvegardé dans Supabase.`,
        className: "bg-green-500 text-white"
      });
      
      setEditingPrompt(null);
    } else {
      toast({
        title: "❌ Erreur",
        description: `Impossible d'enregistrer le prompt : ${result.error}`,
        variant: "destructive"
      });
    }
  };

  const handleDeletePrompt = async (promptId) => {
    const result = await deletePromptFromSupabase(promptId);

    if (result.success) {
      toast({
        title: "✅ Prompt supprimé !",
        description: "Le prompt a été supprimé de Supabase.",
        className: "bg-green-500 text-white"
      });
    } else {
      toast({
        title: "❌ Erreur",
        description: `Impossible de supprimer le prompt : ${result.error}`,
        variant: "destructive"
      });
    }
  };

  const openPromptCreator = prompt => {
    setEditingPrompt(prompt);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      <ModulesNavBar activeModule="workflows" />
      <div className="flex flex-1 gap-6 p-6">
      {/* Colonne gauche - Liste des prompts */}
      <div className="w-[25%] flex-shrink-0">
        <div className="bg-white rounded-2xl shadow-card h-full flex flex-col">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Workflows Charly</h2>
            <Button onClick={() => openPromptCreator(null)} className="bg-indigo-600 hover:bg-indigo-700 w-full">
              <Plus className="mr-2 h-4 w-4" /> Créer un nouveau prompt
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-3">
            {Object.values(prompts).length > 0 ? Object.values(prompts).map(p => (
              <div 
                key={p.id} 
                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                  editingPrompt?.id === p.id 
                    ? 'bg-indigo-50 border-2 border-indigo-500' 
                    : 'bg-gray-50 hover:bg-gray-100'
                }`}
                onClick={() => openPromptCreator(p)}
              >
                <div className="flex items-center gap-3">
                  <Bot className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-gray-500">{projectsData[p.projectId]?.title || 'Projet inconnu'}</p>
                  </div>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="destructive" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Supprimer "{p.name}" ?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Cette action est irréversible.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDeletePrompt(p.id)} className="bg-red-600 hover:bg-red-700">Supprimer</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )) : (
              <div className="text-center text-gray-500 py-8">
                <Bot className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2">Aucun prompt créé. Cliquez sur le bouton pour en ajouter un.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Colonne droite - Workflow détaillé */}
      <div className="flex-1 overflow-y-auto">
        <div className="bg-white rounded-2xl shadow-card p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              {editingPrompt ? "Modifier le prompt" : "Créer un nouveau prompt"}
            </h2>
            <p className="text-sm text-gray-500">
              Paramétrez votre prompt pour générer des communications personnalisées.
            </p>
          </div>

          <div className="space-y-6">
            <div>
              <Label htmlFor="prompt-name">Nom du prompt</Label>
              <Input 
                id="prompt-name" 
                placeholder="Ex: Relance après RDV" 
                value={promptData.name} 
                onChange={e => setPromptData(p => ({
                  ...p,
                  name: e.target.value
                }))} 
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="prompt-tone">Ton</Label>
                <Select value={promptData.tone} onValueChange={value => setPromptData(p => ({
                  ...p,
                  tone: value
                }))}>
                  <SelectTrigger id="prompt-tone">
                    <SelectValue placeholder="Choisir un ton" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professionnel">Professionnel</SelectItem>
                    <SelectItem value="detendu">Détendu</SelectItem>
                    <SelectItem value="humain">Humain</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="prompt-project">Projet</Label>
                <Select value={promptData.projectId} onValueChange={handleProjectChange}>
                  <SelectTrigger id="prompt-project">
                    <SelectValue placeholder="Choisir un projet" />
                  </SelectTrigger>
                  <SelectContent>
                    {projectOptions.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {promptData.projectId && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                className="pt-4 border-t"
              >
                <h4 className="font-semibold text-gray-700 mb-3">
                  Étapes du projet "{projectsData[promptData.projectId]?.title}"
                </h4>
                <div className="space-y-2">
                  {projectSteps.map((step, index) => (
                    <div key={index}>
                      <button 
                        onClick={() => toggleStep(index)} 
                        className="w-full flex items-center justify-between gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{step.icon}</span>
                          <span className="text-sm font-medium text-gray-800">{step.name}</span>
                        </div>
                        {activeStep === index ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                      </button>
                      <AnimatePresence>
                        {activeStep === index && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0, marginTop: 0 }} 
                            animate={{ opacity: 1, height: 'auto', marginTop: '0.5rem' }} 
                            exit={{ opacity: 0, height: 0, marginTop: 0 }} 
                            className="pl-8 bg-gray-50/50 rounded-b-md"
                          >
                            <div className="p-4 space-y-4">
                              {(promptData.stepsConfig[index]?.actions || []).map((action, actionIndex) => (
                                <ActionEditor 
                                  key={action.id} 
                                  action={action} 
                                  onChange={newAction => handleActionChange(index, actionIndex, newAction)} 
                                  onDelete={() => deleteAction(index, actionIndex)} 
                                  forms={supabaseForms || []}
                                  contractTemplates={contractTemplates || []}
                                  partners={partners || []}
                                />
                              ))}
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => addAction(index)} 
                                className="w-full border-dashed"
                              >
                                <Plus className="h-4 w-4 mr-2" /> Ajouter un message + action
                              </Button>
                              <div className="flex items-center space-x-2 pt-4 border-t mt-4">
                                <Checkbox 
                                  id={`form-complete-step-${index}`} 
                                  checked={promptData.stepsConfig[index]?.autoCompleteStep || false} 
                                  onCheckedChange={checked => handleStepConfigChange(index, 'autoCompleteStep', checked)} 
                                />
                                <Label htmlFor={`form-complete-step-${index}`} className="text-sm text-gray-600">
                                  Si action validée, passer automatiquement à l'étape suivante
                                </Label>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setEditingPrompt(null)}>Annuler</Button>
              <Button onClick={handleSavePrompt} className="bg-green-600 hover:bg-green-700">Enregistrer le prompt</Button>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default WorkflowsCharlyPage;
