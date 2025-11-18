import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAppContext } from '@/App';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase'; // 🔥 Import Supabase

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

  const relevantForms = useMemo(() => {
    if (!currentUser) return [];
    
    return clientFormPanels
      .filter(panel => {
        // Filtre par prospect
        if (panel.prospectId !== currentUser.id) return false;
        
        // ✅ NOUVEAU: Filtre par projet spécifique si projectType fourni
        if (projectType && panel.projectType !== projectType) return false;
        
        return true;
      })
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
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
    console.log('🔄 Rechargement form_data depuis Supabase avant soumission...');
    const { data: currentData, error: fetchError } = await supabase
      .from('prospects')
      .select('form_data')
      .eq('id', prospectId)
      .single();
    
    if (fetchError) {
      console.error('❌ Erreur rechargement form_data:', fetchError);
      // Continuer avec currentUser.formData en fallback
    }
    
    const updatedFormData = { ...(currentData?.form_data || currentUser.formData || {}), ...draft };
    
    // 🔥 CORRECTION: Mettre à jour dans Supabase directement
    console.log('📝 Mise à jour form_data dans Supabase:', { prospectId, updatedFormData });
    const { error: updateError } = await supabase
      .from('prospects')
      .update({ form_data: updatedFormData })
      .eq('id', prospectId);
    
    if (updateError) {
      console.error('❌ Erreur update form_data:', updateError);
      toast({
        title: 'Erreur',
        description: 'Impossible de sauvegarder vos données.',
        variant: 'destructive',
      });
      return;
    }
    
    console.log('✅ form_data mis à jour dans Supabase avec succès !');
    
    // ℹ️ updateProspect() supprimé - Real-time Supabase synchronise automatiquement

    // ✅ Envoyer le message de complétion (déduplication gérée par Supabase)
    addChatMessage(prospectId, projectType, {
      sender: 'client',
      text: `A complété le formulaire : ${formDefinition?.name || 'Formulaire'}.`,
      completedFormId: formId,
      relatedMessageTimestamp: messageTimestamp,
    });

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

  const handleEdit = async (panel) => {
    const { panelId, formId } = panel;
    
    // 🔥 CORRECTION: Recharger les données DEPUIS SUPABASE avant d'éditer
    console.log('🔄 Rechargement form_data depuis Supabase...');
    const { data: freshProspectData, error } = await supabase
      .from('prospects')
      .select('form_data')
      .eq('id', currentUser.id)
      .single();
    
    if (error) {
      console.error('❌ Erreur rechargement form_data:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les dernières données.',
        variant: 'destructive',
      });
      return;
    }
    
    console.log('✅ form_data rechargé depuis Supabase:', freshProspectData.form_data);
    
    // Hydrater avec les données fraîches depuis Supabase
    const formDefinition = forms[formId];
    const hydrated = {};
    formDefinition?.fields?.forEach(field => {
      if (freshProspectData.form_data && freshProspectData.form_data[field.id]) {
        hydrated[field.id] = freshProspectData.form_data[field.id];
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
                    Étape : {panel.stepName || 'Suivi du projet'}
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
