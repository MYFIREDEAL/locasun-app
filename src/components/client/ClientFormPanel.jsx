import { logger } from '@/lib/logger';
import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAppContext } from '@/App';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase'; // 🔥 Import Supabase
import { useSupabaseProjectHistory } from '@/hooks/useSupabaseProjectHistory'; // 🔥 Import hook history

const ClientFormPanel = ({ isDesktop, projectType }) => {
  const {
    clientFormPanels,
    updateClientFormPanel,
    forms,
    currentUser,
    updateProspect,
    addChatMessage,
    prompts,
    completeStepAndProceed,
    projectsData,
  } = useAppContext();

  // 🔥 Hook pour ajouter événements dans l'historique du projet
  const { addProjectEvent } = useSupabaseProjectHistory({
    projectType: projectType,
    prospectId: currentUser?.id,
    enabled: !!projectType && !!currentUser?.id,
  });

  const relevantForms = useMemo(() => {
    console.log('🔍 [ClientFormPanel] currentUser:', currentUser?.id, currentUser?.name);
    console.log('🔍 [ClientFormPanel] projectType:', projectType);
    console.log('🔍 [ClientFormPanel] clientFormPanels total:', clientFormPanels?.length || 0);
    
    if (!currentUser) {
      console.log('❌ [ClientFormPanel] Pas de currentUser');
      return [];
    }
    
    const filtered = clientFormPanels
      .filter(panel => {
        // Filtre par prospect
        if (panel.prospectId !== currentUser.id) {
          console.log('❌ [ClientFormPanel] Panel ignoré (mauvais prospect):', panel.prospectId, '!==', currentUser.id);
          return false;
        }
        
        // ✅ NOUVEAU: Filtre par projet spécifique si projectType fourni
        if (projectType && panel.projectType !== projectType) {
          console.log('❌ [ClientFormPanel] Panel ignoré (mauvais projet):', panel.projectType, '!==', projectType);
          return false;
        }
        
        console.log('✅ [ClientFormPanel] Panel retenu:', panel.formId, panel.projectType);
        return true;
      })
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    
    console.log('📋 [ClientFormPanel] relevantForms final:', filtered.length);
    return filtered;
  }, [clientFormPanels, currentUser, projectType]);

  // ✅ Client: currentUser EST le prospect, pas besoin de chercher dans prospects
  const prospect = currentUser;

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
    console.log('🔍 [ClientFormPanel] prospect.form_data:', prospect.form_data);
    console.log('🔍 [ClientFormPanel] prospect.formData:', prospect.formData);
    setFormDrafts(prev => {
      const next = { ...prev };
      relevantForms.forEach(panel => {
        if (!next[panel.panelId]) {
          const formDefinition = forms[panel.formId];
          const hydrated = {};
          const formData = prospect.form_data || prospect.formData || {};
          console.log('🔍 [ClientFormPanel] formData pour', panel.panelId, ':', formData);
          
          // 🔥 FIX: Accéder à la structure correcte projectType > formId > fields
          const projectFormData = formData[panel.projectType] || {};
          const formFields = projectFormData[panel.formId] || {};
          console.log('🔍 [ClientFormPanel] formFields extraits:', formFields);
          
          formDefinition?.fields?.forEach(field => {
            if (formFields[field.id]) {
              hydrated[field.id] = formFields[field.id];
              console.log('✅ [ClientFormPanel] Champ hydraté:', field.id, '=', formFields[field.id]);
            }
          });
          next[panel.panelId] = hydrated;
        }
      });
      return next;
    });
  }, [relevantForms, forms, prospect]);

  if (!relevantForms.length) {
    return null;
  }

  const handleFieldChange = (panelId, fieldId, value) => {
    setFormDrafts(prev => ({
      ...prev,
      [panelId]: {
        ...(prev[panelId] || {}),
        [fieldId]: value,
      },
    }));
  };

  const handleSubmit = async (panel) => {
    const {
      panelId,
      prospectId,
      projectType,
      currentStepIndex,
      promptId,
      formId,
      messageTimestamp,
    } = panel;

    // ✅ Client: Utiliser currentUser au lieu de prospects (qui est pour les admins)
    if (!currentUser || currentUser.id !== prospectId) {
      toast({
        title: 'Erreur de session',
        description: 'Impossible de soumettre le formulaire. Veuillez vous reconnecter.',
        variant: 'destructive',
      });
      return;
    }

    const formDefinition = forms[formId];
    const draft = formDrafts[panelId] || {};
    
    // 🔥 AMÉLIORATION: Recharger les données DEPUIS Supabase avant le merge
    const { data: currentData, error: fetchError } = await supabase
      .from('prospects')
      .select('form_data')
      .eq('id', prospectId)
      .single();
    
    if (fetchError) {
      logger.error('❌ Erreur rechargement form_data:', fetchError);
      // Continuer avec currentUser.formData en fallback
    }
    
    // 🔥 FIX: Structurer correctement form_data avec projectType > formId > fields
    const currentFormData = currentData?.form_data || currentUser.formData || {};
    const updatedFormData = {
      ...currentFormData,
      [projectType]: {
        ...(currentFormData[projectType] || {}),
        [formId]: draft
      }
    };
    
    // 🔥 CORRECTION: Mettre à jour dans Supabase directement
    const { error: updateError } = await supabase
      .from('prospects')
      .update({ form_data: updatedFormData })
      .eq('id', prospectId);
    
    if (updateError) {
      logger.error('❌ Erreur update form_data:', updateError);
      toast({
        title: 'Erreur',
        description: 'Impossible de sauvegarder vos données.',
        variant: 'destructive',
      });
      return;
    }
    
    // 🔥 FIX: Mettre à jour currentUser immédiatement pour que le client voit ses changements
    // App.jsx updateProspect attend un objet avec id, pas (id, updates)
    try {
      await updateProspect({ 
        id: prospectId,
        formData: updatedFormData,
        form_data: updatedFormData,
        tags: currentUser?.tags || [] // ✅ FIX: Préserver les tags existants
      });
      console.log('✅ [ClientFormPanel] currentUser mis à jour avec form_data:', updatedFormData);
    } catch (err) {
      console.warn('⚠️ Erreur mise à jour currentUser (non bloquant):', err);
    }

    // ✅ Envoyer le message de complétion (déduplication gérée par Supabase)
    addChatMessage(prospectId, projectType, {
      sender: 'client',
      text: `A complété le formulaire : ${formDefinition?.name || 'Formulaire'}.`,
      completedFormId: formId,
      relatedMessageTimestamp: messageTimestamp,
    });

    console.log('🎬 [ClientFormPanel] DÉBUT vérification auto-complete avec:', {
      promptId,
      promptsKeys: Object.keys(prompts || {}),
      promptsCount: Object.keys(prompts || {}).length,
      projectType,
      formId,
      currentStepIndex
    });

    if (!prompts || Object.keys(prompts).length === 0) {
      logger.error('❌ [ClientFormPanel] AUCUN PROMPT CHARGÉ !');
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

    console.log('🔍 [ClientFormPanel] DEBUG Auto-Complete:', {
      promptId,
      relatedPrompt: relatedPrompt ? { id: relatedPrompt.id, name: relatedPrompt.name } : null,
      currentStepIndex,
      stepConfig: relatedPrompt?.stepsConfig?.[currentStepIndex],
      autoCompleteStep: relatedPrompt?.stepsConfig?.[currentStepIndex]?.autoCompleteStep,
      projectType,
      formId
    });

    if (relatedPrompt) {
      const stepConfig = relatedPrompt.stepsConfig?.[currentStepIndex];
      console.log('✅ [ClientFormPanel] Prompt trouvé, stepConfig:', stepConfig);
      console.log('🎯 [ClientFormPanel] autoCompleteStep value:', stepConfig?.autoCompleteStep);
      
      if (stepConfig?.autoCompleteStep) {
        console.log('🚀 [ClientFormPanel] Appel completeStepAndProceed avec:', {
          prospectId,
          projectType,
          currentStepIndex
        });
        completeStepAndProceed(prospectId, projectType, currentStepIndex);
        toast({
          title: 'Étape terminée !',
          description: "L'étape a été automatiquement marquée comme terminée.",
          className: 'bg-green-500 text-white',
        });
      } else {
        console.log('❌ [ClientFormPanel] autoCompleteStep est false ou undefined');

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

    // ✅ Ajouter événement dans project_history
    try {
      const formName = formDefinition?.name || formId;
      await addProjectEvent({
        prospectId: currentUser.id,
        projectType: projectType,
        title: "Formulaire complété",
        description: `${currentUser.name} a complété le formulaire ${formName}.`,
        createdBy: currentUser.name
      });
    } catch (historyErr) {
      // Ne pas bloquer si l'événement échoue
      logger.error('⚠️ Erreur ajout événement historique:', historyErr);
    }
  };

  const handleEdit = async (panel) => {
    const { panelId, formId, projectType } = panel;
    
    // 🔥 CORRECTION: Recharger les données DEPUIS SUPABASE avant d'éditer
    const { data: freshProspectData, error } = await supabase
      .from('prospects')
      .select('form_data')
      .eq('id', currentUser.id)
      .single();
    
    if (error) {
      logger.error('❌ Erreur rechargement form_data:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les dernières données.',
        variant: 'destructive',
      });
      return;
    }
    
    // Hydrater avec les données fraîches depuis Supabase
    const formDefinition = forms[formId];
    const hydrated = {};
    
    // 🔥 FIX: Accéder à la structure correcte projectType > formId > fields
    const projectFormData = freshProspectData.form_data?.[projectType] || {};
    const formFields = projectFormData[formId] || {};
    console.log('🔍 [handleEdit] formFields rechargés:', formFields);
    
    formDefinition?.fields?.forEach(field => {
      if (formFields[field.id]) {
        hydrated[field.id] = formFields[field.id];
        console.log('✅ [handleEdit] Champ rechargé:', field.id, '=', formFields[field.id]);
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
          const isApproved = panel.status === 'approved';
          const isRejected = panel.status === 'rejected';
          const draft = formDrafts[panel.panelId] || {};

          // 🔍 Déterminer le mode de vérification depuis le prompt
          let verificationMode = 'human'; // default
          if (panel.promptId && prompts) {
            const relatedPrompt = Object.values(prompts).find(p => p.id === panel.promptId);
            if (relatedPrompt) {
              const stepConfig = relatedPrompt.stepsConfig?.[panel.currentStepIndex];
              const formAction = stepConfig?.actions?.find(
                action => action.type === 'show_form' && action.formId === panel.formId
              );
              verificationMode = formAction?.verificationMode || 'human';
            }
          }

          if (!formDefinition) {
            return null;
          }

          // 🎨 Déterminer le badge de statut
          let statusBadge = {
            text: 'À compléter',
            className: 'bg-blue-100 text-blue-700'
          };

          if (isApproved) {
            statusBadge = {
              text: '✅ Approuvé',
              className: 'bg-green-100 text-green-700'
            };
          } else if (isRejected) {
            statusBadge = {
              text: '❌ Rejeté',
              className: 'bg-red-100 text-red-700'
            };
          } else if (isSubmitted) {
            if (verificationMode === 'none') {
              statusBadge = {
                text: '✅ Validé automatiquement',
                className: 'bg-green-100 text-green-700'
              };
            } else {
              statusBadge = {
                text: '🕐 En attente de validation',
                className: 'bg-yellow-100 text-yellow-700'
              };
            }
          }

          return (
            <div key={panel.panelId} className="border border-gray-200 rounded-xl p-4 space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-gray-900 truncate">{formDefinition.name}</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Étape : {panel.stepName || 'Suivi du projet'}
                  </p>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full whitespace-nowrap flex-shrink-0 ${statusBadge.className}`}
                >
                  {statusBadge.text}
                </span>
              </div>

              {isApproved ? (
                <div className="space-y-3">
                  <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">✅</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-green-700">Formulaire approuvé</p>
                        <p className="text-xs text-green-600 mt-1">
                          Votre conseiller a validé les informations
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : isRejected ? (
                <div className="space-y-3">
                  <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">❌</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-red-700">Formulaire rejeté</p>
                        <p className="text-xs text-red-600 mt-1">
                          Veuillez modifier les informations et renvoyer
                        </p>
                      </div>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleEdit(panel)}
                    className="w-full"
                  >
                    Modifier et renvoyer
                  </Button>
                </div>
              ) : isSubmitted ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                    <div className="flex-1">
                      <span className="text-sm font-medium text-blue-700">
                        {verificationMode === 'none' 
                          ? 'Formulaire validé automatiquement' 
                          : 'Formulaire envoyé à votre conseiller'}
                      </span>
                      {verificationMode !== 'none' && (
                        <p className="text-xs text-blue-600 mt-1">
                          Vous pouvez encore le modifier si nécessaire
                        </p>
                      )}
                    </div>
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
