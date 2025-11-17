import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAppContext } from '@/App';
import { toast } from '@/components/ui/use-toast';

const ClientFormPanel = ({ isDesktop }) => {
  const {
    clientFormPanels,
    updateClientFormPanel,
    forms,
    prospects,
    currentUser,
    updateProspect,
    addChatMessage,
    getChatMessages,
    prompts,
    completeStepAndProceed,
    projectsData,
  } = useAppContext();

  const relevantForms = useMemo(() => {
    console.log('📋 [ClientFormPanel] Recalcul relevantForms:', {
      hasUser: !!currentUser,
      userId: currentUser?.id,
      totalPanels: clientFormPanels.length,
      panels: clientFormPanels
    });
    
    if (!currentUser) return [];
    
    const filtered = clientFormPanels
      .filter(panel => panel.prospectId === currentUser.id)
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    
    console.log('✅ [ClientFormPanel] Formulaires filtrés:', filtered);
    return filtered;
  }, [clientFormPanels, currentUser]);

  const prospect = useMemo(() => {
    if (!currentUser) return null;
    return prospects.find(p => p.id === currentUser.id) || null;
  }, [prospects, currentUser]);

  const [formDrafts, setFormDrafts] = useState({});

  useEffect(() => {
    if (!prospect) {
      setFormDrafts({});
      return;
    }
    if (!relevantForms.length) {
      setFormDrafts({});
      return;
    }
    setFormDrafts(prev => {
      const next = { ...prev };
      relevantForms.forEach(panel => {
        if (!next[panel.panelId]) {
          const formDefinition = forms[panel.formId];
          const hydrated = {};
          formDefinition?.fields?.forEach(field => {
            if (prospect.formData && prospect.formData[field.id]) {
              hydrated[field.id] = prospect.formData[field.id];
            }
          });
          next[panel.panelId] = hydrated;
        }
      });
      return next;
    });
  }, [relevantForms, forms, prospect]);

  if (!relevantForms.length) {
    console.log('⚠️ [ClientFormPanel] Aucun formulaire à afficher - Composant masqué');
    return null;
  }
  
  console.log('📝 [ClientFormPanel] Affichage de', relevantForms.length, 'formulaire(s)');

  const handleFieldChange = (panelId, fieldId, value) => {
    setFormDrafts(prev => ({
      ...prev,
      [panelId]: {
        ...(prev[panelId] || {}),
        [fieldId]: value,
      },
    }));
  };

  const handleSubmit = (panel) => {
    const {
      panelId,
      prospectId,
      projectType,
      currentStepIndex,
      promptId,
      formId,
      messageTimestamp,
    } = panel;

    const currentProspect = prospects.find(p => p.id === prospectId);
    if (!currentProspect) {
      toast({
        title: 'Prospect introuvable',
        description: 'Impossible de soumettre le formulaire pour le moment.',
        variant: 'destructive',
      });
      return;
    }

    const formDefinition = forms[formId];
    const draft = formDrafts[panelId] || {};
    const updatedFormData = { ...(currentProspect.formData || {}), ...draft };
    updateProspect({ ...currentProspect, formData: updatedFormData });

    const existingCompletion = getChatMessages(prospectId, projectType).some(
      (msg) =>
        msg.sender === 'client' &&
        msg.completedFormId === formId &&
        (msg.relatedMessageTimestamp || '') === (messageTimestamp || ''),
    );

    if (!existingCompletion) {
      addChatMessage(prospectId, projectType, {
        sender: 'client',
        text: `A complété le formulaire : ${formDefinition?.name || 'Formulaire'}.`,
        completedFormId: formId,
        relatedMessageTimestamp: messageTimestamp,
      });
    }

    const relatedPrompt = promptId
      ? prompts[promptId]
      : Object.values(prompts).find((pr) => {
          if (pr.projectId !== projectType) return false;
          const stepConfig = pr.stepsConfig?.[currentStepIndex];
          return stepConfig?.actions?.some(
            (action) => action.type === 'show_form' && action.formId === formId,
          );
        });

    if (relatedPrompt) {
      const stepConfig = relatedPrompt.stepsConfig?.[currentStepIndex];
      if (stepConfig?.autoCompleteStep) {
        completeStepAndProceed(prospectId, projectType, currentStepIndex);
        toast({
          title: 'Étape terminée !',
          description: "L'étape a été automatiquement marquée comme terminée.",
          className: 'bg-green-500 text-white',
        });
      } else {
        toast({
          title: 'Formulaire envoyé',
          description: 'Vos informations ont été transmises à votre conseiller.',
          className: 'bg-green-500 text-white',
        });
      }
    } else {
      toast({
        title: 'Formulaire envoyé',
        description: 'Vos informations ont été transmises à votre conseiller.',
        className: 'bg-green-500 text-white',
      });
    }

    updateClientFormPanel(panelId, {
      status: 'submitted',
      lastSubmittedAt: new Date().toISOString(),
      userOverride: null,
    });
  };

  const handleEdit = (panel) => {
    const { panelId, formId, prospectId } = panel;
    const currentProspect = prospects.find(p => p.id === prospectId);
    const formDefinition = forms[formId];
    const hydrated = {};
    formDefinition?.fields?.forEach(field => {
      if (currentProspect?.formData && currentProspect.formData[field.id]) {
        hydrated[field.id] = currentProspect.formData[field.id];
      }
    });
    setFormDrafts(prev => ({ ...prev, [panelId]: hydrated }));
    updateClientFormPanel(panelId, { status: 'pending', userOverride: 'pending' });
  };

  return (
    <aside
      className={`bg-white rounded-2xl shadow-card p-6 space-y-6 ${
        isDesktop ? '' : 'mt-6'
      }`}
    >
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-gray-900">Formulaires à compléter</h2>
        <p className="text-sm text-gray-500">
          Retrouvez ici les actions à réaliser ou déjà envoyées pour votre projet.
        </p>
      </div>

      <div className="space-y-6">
        {relevantForms.map(panel => {
          const formDefinition = forms[panel.formId];
          const isSubmitted = panel.status === 'submitted';
          const draft = formDrafts[panel.panelId] || {};

          if (!formDefinition) {
            return null;
          }

          return (
            <div key={panel.panelId} className="border border-gray-200 rounded-xl p-4 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">{formDefinition.name}</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Étape : {projectsData[panel.projectType]?.steps?.[panel.currentStepIndex]?.name || 'Suivi du projet'}
                  </p>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    isSubmitted ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                  }`}
                >
                  {isSubmitted ? 'Envoyé' : 'À compléter'}
                </span>
              </div>

              {isSubmitted ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                    <span className="text-sm font-medium text-green-700">Formulaire envoyé</span>
                    <Button variant="outline" size="sm" onClick={() => handleEdit(panel)}>
                      Modifier
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {(formDefinition.fields || []).map(field => (
                    <div key={field.id} className="space-y-2">
                      <Label htmlFor={`${panel.panelId}-${field.id}`}>{field.label}</Label>
                      <Input
                        id={`${panel.panelId}-${field.id}`}
                        type={field.type || 'text'}
                        value={draft[field.id] || ''}
                        onChange={(event) => handleFieldChange(panel.panelId, field.id, event.target.value)}
                        placeholder={field.placeholder || ''}
                      />
                    </div>
                  ))}
                  <Button
                    onClick={() => handleSubmit(panel)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Envoyer
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
};

export default ClientFormPanel;
