import { logger } from '@/lib/logger';
import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAppContext } from '@/App';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase'; // 🔥 Import Supabase
import { useSupabaseProjectHistory } from '@/hooks/useSupabaseProjectHistory'; // 🔥 Import hook history
import { useSupabaseProjectFiles } from '@/hooks/useSupabaseProjectFiles'; // 🔥 Import hook files
import { Upload, FileText, X } from 'lucide-react';

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
  // ✅ Client: Passer activeAdminUser avec organization_id du prospect (currentUser)
  const { addProjectEvent } = useSupabaseProjectHistory({
    projectType: projectType,
    prospectId: currentUser?.id,
    enabled: !!projectType && !!currentUser?.id,
    activeAdminUser: currentUser ? { organization_id: currentUser.organization_id } : null
  });

  // 🔥 Hook pour uploader les fichiers vers Supabase Storage
  const { uploadFile, uploading, deleteFile } = useSupabaseProjectFiles({ 
    projectType, 
    prospectId: currentUser?.id, 
    enabled: true 
  });

  const relevantForms = useMemo(() => {
    if (!currentUser) {
      return [];
    }
    
    return clientFormPanels
      .filter(panel => {
        if (panel.prospectId !== currentUser.id) return false;
        if (projectType && panel.projectType !== projectType) return false;
        return true;
      })
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [clientFormPanels, currentUser, projectType]);

  // ✅ Client: currentUser EST le prospect, pas besoin de chercher dans prospects
  const prospect = currentUser;

  const [formDrafts, setFormDrafts] = useState({});
  const [submittingForms, setSubmittingForms] = useState({}); // 🔥 État pour gérer la soumission

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
          const formData = prospect.form_data || prospect.formData || {};
          
          // Accéder à la structure correcte projectType > formId > fields
          const projectFormData = formData[panel.projectType] || {};
          const formFields = projectFormData[panel.formId] || {};
          
          formDefinition?.fields?.forEach(field => {
            if (formFields[field.id]) {
              hydrated[field.id] = formFields[field.id];
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

    // 🔥 Empêcher le double clic
    if (submittingForms[panelId]) {
      return;
    }

    // 🔥 Marquer comme en cours de soumission
    setSubmittingForms(prev => ({ ...prev, [panelId]: true }));

    try {
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
    let draft = { ...(formDrafts[panelId] || {}) };

    // 🔥 ÉTAPE 1: Récupérer les données existantes AVANT upload pour détecter les remplacements
    const { data: existingData, error: fetchExistingError } = await supabase
      .from('prospects')
      .select('form_data')
      .eq('id', prospectId)
      .single();
    
    const existingFormData = existingData?.form_data || currentUser.formData || {};
    const existingFieldsData = existingFormData[projectType]?.[formId] || {};

    // 🔥 ÉTAPE 2: Uploader les fichiers ET supprimer les anciens si remplacés
    try {
      const fileFields = formDefinition?.fields?.filter(f => f.type === 'file') || [];
      
      for (const field of fileFields) {
        const fileValue = draft[field.id];
        
        // Si c'est un objet File (fichier réel sélectionné = nouveau fichier)
        if (fileValue && fileValue instanceof File) {
          // Vérifier la taille (max 10 MB)
          const maxSize = 10 * 1024 * 1024;
          if (fileValue.size > maxSize) {
            toast({
              title: '❌ Fichier trop volumineux',
              description: `${field.label}: La taille maximale est de 10 MB.`,
              variant: 'destructive',
            });
            return;
          }

          // 🔥 ÉTAPE 3: SUPPRESSION de l'ancien fichier SI il existe pour CE champ
          const existingFile = existingFieldsData[field.id];
          if (existingFile && typeof existingFile === 'object' && existingFile.id && existingFile.storagePath) {
            logger.debug('� Replacing existing file for field', {
              fieldId: field.id,
              fieldLabel: field.label,
              oldFileName: existingFile.name,
              oldFileId: existingFile.id,
              newFileName: fileValue.name,
            });

            try {
              // ⚠️ SÉCURITÉ: Vérifier que c'est bien un fichier de formulaire (field_label existe)
              const { data: fileCheck, error: checkError } = await supabase
                .from('project_files')
                .select('field_label')
                .eq('id', existingFile.id)
                .single();

              if (!checkError && fileCheck?.field_label) {
                // Supprimer l'ancien fichier du Storage
                const { error: storageError } = await supabase.storage
                  .from('project-files')
                  .remove([existingFile.storagePath]);

                if (storageError) {
                  logger.error('❌ Error deleting old file from storage', storageError);
                } else {
                  logger.info('✅ Old file deleted from storage', { storagePath: existingFile.storagePath });
                }

                // Supprimer l'ancien fichier de la table
                const { error: dbError } = await supabase
                  .from('project_files')
                  .delete()
                  .eq('id', existingFile.id);

                if (dbError) {
                  logger.error('❌ Error deleting old file from database', dbError);
                } else {
                  logger.info('✅ Old file deleted from database', { fileId: existingFile.id });
                }
              } else {
                logger.warn('⚠️ Old file is not a form file (no field_label), skipping deletion', { fileId: existingFile.id });
              }
            } catch (deleteError) {
              logger.error('❌ Error during old file deletion', deleteError);
              // Continuer même si suppression échoue
            }
          }

          // 🔥 ÉTAPE 4: Upload du NOUVEAU fichier
          logger.debug('�📤 Uploading new file from form', {
            fieldId: field.id,
            fieldLabel: field.label,
            name: fileValue.name,
            size: fileValue.size,
          });

          // Upload vers Supabase Storage avec le label du champ
          const uploadedFile = await uploadFile({
            file: fileValue,
            uploadedBy: currentUser?.id,
            fieldLabel: field.label, // 🔥 AJOUT: Passer le label du champ
          });

          if (uploadedFile) {
            // Remplacer le File par les métadonnées + label du champ
            draft[field.id] = {
              id: uploadedFile.id,
              name: uploadedFile.file_name,
              size: uploadedFile.file_size,
              type: uploadedFile.file_type,
              storagePath: uploadedFile.storage_path,
              fieldLabel: field.label, // 🔥 AJOUT: Label du champ pour l'affichage
            };
            logger.debug('✅ New file uploaded for form field', { fieldId: field.id, fileData: draft[field.id] });
          }
        }
      }
    } catch (uploadError) {
      logger.error('❌ Error uploading form files', uploadError);
      toast({
        title: '❌ Erreur d\'upload',
        description: `Impossible d'uploader les fichiers : ${uploadError.message}`,
        variant: 'destructive',
      });
      return;
    }
    
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
    
    // 🔥 BROADCAST MANUEL: Notifier les admins du changement de form_data
    try {
      // Recharger le prospect avec les données fraîches
      const { data: freshProspect, error: fetchError } = await supabase
        .from('prospects')
        .select('*')
        .eq('id', prospectId)
        .single();
      
      if (!fetchError && freshProspect) {
        // Transformer pour le format app
        const transformedProspect = {
          id: freshProspect.id,
          name: freshProspect.name,
          email: freshProspect.email,
          phone: freshProspect.phone,
          company: freshProspect.company_name,
          address: freshProspect.address,
          ownerId: freshProspect.owner_id,
          status: freshProspect.status,
          tags: freshProspect.tags || [],
          hasAppointment: freshProspect.has_appointment || false,
          affiliateName: freshProspect.affiliate_name,
          formData: freshProspect.form_data || {},
          form_data: freshProspect.form_data || {},
          createdAt: freshProspect.created_at,
          updatedAt: freshProspect.updated_at,
        };
        
        // Broadcaster sur le canal global
        const broadcastChannel = supabase.channel('prospects-broadcast-global');
        await broadcastChannel.send({
          type: 'broadcast',
          event: 'prospect-updated',
          payload: transformedProspect
        });
        
        logger.info('✅ Broadcast envoyé aux admins', { prospectId, name: freshProspect.name });
      }
    } catch (broadcastError) {
      // Ne pas bloquer si le broadcast échoue
      logger.warn('⚠️ Erreur broadcast (non bloquant):', broadcastError);
    }
    
    // Mettre à jour currentUser immédiatement pour que le client voit ses changements
    try {
      await updateProspect({ 
        id: prospectId,
        formData: updatedFormData,
        form_data: updatedFormData,
        tags: currentUser?.tags || []
      });
    } catch (err) {
      logger.warn('⚠️ Erreur mise à jour currentUser (non bloquant):', err);
    }

    // ✅ Envoyer le message de complétion (déduplication gérée par Supabase)
    addChatMessage(prospectId, projectType, {
      sender: 'client',
      text: `A complété le formulaire : ${formDefinition?.name || 'Formulaire'}.`,
      completedFormId: formId,
      relatedMessageTimestamp: messageTimestamp,
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
    } catch (error) {
      // Gérer toute erreur non capturée
      logger.error('❌ Erreur lors de la soumission du formulaire:', error);
      toast({
        title: '❌ Erreur',
        description: 'Une erreur est survenue lors de l\'envoi du formulaire.',
        variant: 'destructive',
      });
    } finally {
      // 🔥 Réactiver le bouton dans tous les cas
      setSubmittingForms(prev => ({ ...prev, [panelId]: false }));
    }
  };

  // 🔥 NOUVEAU: Helper pour télécharger un fichier
  const handleDownloadFile = async (fileData) => {
    if (!fileData || !fileData.storagePath) {
      toast({
        title: "❌ Erreur",
        description: "Le fichier n'est pas disponible.",
        variant: 'destructive',
      });
      return;
    }

    try {
      const { data, error } = await supabase.storage
        .from('project-files')
        .createSignedUrl(fileData.storagePath, 3600);

      if (error) throw error;

      window.open(data.signedUrl, '_blank');
      
      toast({
        title: '✅ Téléchargement',
        description: `${fileData.name} s'ouvre dans un nouvel onglet.`,
      });
    } catch (error) {
      logger.error('❌ Error downloading file', error);
      toast({
        title: '❌ Erreur',
        description: `Impossible de télécharger le fichier.`,
        variant: 'destructive',
      });
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
    
    formDefinition?.fields?.forEach(field => {
      if (formFields[field.id]) {
        hydrated[field.id] = formFields[field.id];
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
            console.error('❌ [ClientFormPanel] Formulaire non trouvé:', { 
              formId: panel.formId, 
              availableForms: Object.keys(forms),
              panel 
            });
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
                  {/* Afficher les valeurs soumises */}
                  <div className="space-y-2 text-sm">
                    {formDefinition.fields?.map(field => {
                      // 🔥 Vérifier les conditions multiples d'affichage
                      if (field.show_if_conditions && field.show_if_conditions.length > 0) {
                        const operator = field.condition_operator || 'AND';
                        const conditionResults = field.show_if_conditions.map(condition => {
                          const currentValue = draft[condition.field];
                          if (condition.equals === 'has_value') {
                            return !!currentValue && currentValue !== '';
                          }
                          return currentValue === condition.equals;
                        });
                        const shouldShow = operator === 'AND' 
                          ? conditionResults.every(result => result === true)
                          : conditionResults.some(result => result === true);
                        if (!shouldShow) return null;
                      }
                      
                      // 🔥 Rétro-compatibilité show_if
                      if (field.show_if) {
                        const conditionField = field.show_if.field;
                        const expectedValue = field.show_if.equals;
                        const currentValue = draft[conditionField];
                        
                        if (!currentValue || currentValue !== expectedValue) {
                          return null;
                        }
                      }

                      const value = draft[field.id];
                      if (!value) return null;
                      
                      // Vérifier si c'est un fichier (objet avec storagePath)
                      const isFile = field.type === 'file' && typeof value === 'object' && value.storagePath;
                      
                      return (
                        <div key={field.id} className="flex justify-between items-start gap-2 py-2 border-b border-gray-100 last:border-0">
                          <span className="text-gray-600 font-medium">{field.label}:</span>
                          {isFile ? (
                            <button
                              onClick={() => handleDownloadFile(value)}
                              className="flex items-center gap-1 text-blue-600 hover:text-blue-700 hover:underline"
                            >
                              <FileText className="h-4 w-4" />
                              <span className="text-sm">{value.name}</span>
                            </button>
                          ) : (
                            <span className="text-gray-900 text-right">
                              {typeof value === 'object' ? JSON.stringify(value) : value}
                            </span>
                          )}
                        </div>
                      );
                    })}
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
                  {(formDefinition.fields || []).map(field => {
                    // 🔥 Vérifier les conditions multiples d'affichage
                    if (field.show_if_conditions && field.show_if_conditions.length > 0) {
                      const operator = field.condition_operator || 'AND';
                      
                      const conditionResults = field.show_if_conditions.map(condition => {
                        const conditionField = condition.field;
                        const expectedValue = condition.equals;
                        const currentValue = draft[conditionField];
                        
                        // Si la condition attend "has_value", vérifier si le champ est rempli
                        if (expectedValue === 'has_value') {
                          return !!currentValue && currentValue !== '';
                        }
                        
                        // Sinon, vérifier l'égalité exacte
                        return currentValue === expectedValue;
                      });
                      
                      // Appliquer l'opérateur AND ou OR
                      const shouldShow = operator === 'AND' 
                        ? conditionResults.every(result => result === true)
                        : conditionResults.some(result => result === true);
                      
                      if (!shouldShow) {
                        return null; // Ne pas afficher ce champ
                      }
                    }
                    
                    // 🔥 Rétro-compatibilité avec l'ancien système show_if
                    if (field.show_if) {
                      const conditionField = field.show_if.field;
                      const expectedValue = field.show_if.equals;
                      const currentValue = draft[conditionField];
                      
                      if (!currentValue || currentValue !== expectedValue) {
                        return null;
                      }
                    }
                    
                    // 🔥 VÉRIFIER SI CE CHAMP EST DANS UN GROUPE RÉPÉTÉ (ne pas l'afficher directement)
                    const isInRepeatedGroup = (formDefinition.fields || []).some(f => 
                      f.is_repeater && (f.repeats_fields || []).includes(field.id)
                    );
                    
                    if (isInRepeatedGroup) {
                      return null; // Ce champ sera affiché dans les blocs répétés
                    }

                    const isFileField = field.type === 'file';
                    const fieldValue = draft[field.id];
                    const hasFile = isFileField && (fieldValue instanceof File || (fieldValue?.storagePath));

                    return (
                      <div key={field.id} className="space-y-2">
                        <Label htmlFor={`${panel.panelId}-${field.id}`}>
                          {field.label}
                          {field.required && <span className="text-red-500 ml-1">*</span>}
                        </Label>
                        
                        {isFileField ? (
                          <div className="space-y-2">
                            {/* Afficher le fichier sélectionné */}
                            {hasFile && (
                              <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <FileText className="h-5 w-5 text-blue-600 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-blue-900 truncate">
                                    {fieldValue instanceof File ? fieldValue.name : fieldValue.name}
                                  </p>
                                  <p className="text-xs text-blue-600">
                                    {fieldValue instanceof File 
                                      ? `${(fieldValue.size / 1024).toFixed(1)} KB` 
                                      : `${(fieldValue.size / 1024).toFixed(1)} KB`}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleFieldChange(panel.panelId, field.id, null)}
                                  className="p-1 hover:bg-red-100 rounded-full transition-colors"
                                >
                                  <X className="h-4 w-4 text-red-600" />
                                </button>
                              </div>
                            )}
                            
                            {/* Bouton d'upload */}
                            <label 
                              htmlFor={`${panel.panelId}-${field.id}`}
                              className={`flex items-center justify-center gap-2 p-3 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                                hasFile 
                                  ? 'border-gray-300 bg-gray-50 hover:border-gray-400' 
                                  : 'border-blue-300 bg-blue-50 hover:border-blue-400 hover:bg-blue-100'
                              }`}
                            >
                              <Upload className="h-5 w-5 text-blue-600" />
                              <span className="text-sm font-medium text-blue-900">
                                {hasFile ? 'Changer le fichier' : 'Choisir un fichier'}
                              </span>
                            </label>
                            <Input
                              id={`${panel.panelId}-${field.id}`}
                              type="file"
                              onChange={(event) => {
                                const file = event.target.files?.[0];
                                if (file) {
                                  handleFieldChange(panel.panelId, field.id, file);
                                }
                              }}
                              className="hidden"
                              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                            />
                            <p className="text-xs text-gray-500">
                              Formats acceptés: PDF, PNG, JPG, DOCX (max 10 MB)
                            </p>
                          </div>
                        ) : field.type === 'select' ? (
                          <select
                            id={`${panel.panelId}-${field.id}`}
                            value={fieldValue || ''}
                            onChange={(event) => handleFieldChange(panel.panelId, field.id, event.target.value)}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          >
                            <option value="">-- Sélectionner --</option>
                            {(field.options || []).map((option, idx) => (
                              <option key={idx} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <Input
                            id={`${panel.panelId}-${field.id}`}
                            type={field.type || 'text'}
                            value={typeof fieldValue === 'object' ? '' : (fieldValue || '')}
                            onChange={(event) => handleFieldChange(panel.panelId, field.id, event.target.value)}
                            placeholder={field.placeholder || ''}
                          />
                        )}
                        
                        {/* 🔥 RENDU DES CHAMPS RÉPÉTABLES */}
                        {field.is_repeater && field.repeats_fields && field.repeats_fields.length > 0 && fieldValue && (
                          <div className="mt-4 space-y-4">
                            {Array.from({ length: parseInt(fieldValue) || 0 }, (_, repeatIndex) => {
                              // Récupérer les champs à répéter
                              const fieldsToRepeat = (formDefinition.fields || []).filter(f => 
                                field.repeats_fields.includes(f.id)
                              );
                              
                              return (
                                <div 
                                  key={repeatIndex} 
                                  className="p-4 bg-green-50 border-2 border-green-200 rounded-lg space-y-3"
                                >
                                  <h4 className="font-semibold text-green-800 text-sm">
                                    {field.label} #{repeatIndex + 1}
                                  </h4>
                                  
                                  {fieldsToRepeat.map(repeatedField => {
                                    // Clé unique pour chaque instance répétée
                                    const repeatedFieldKey = `${field.id}_repeat_${repeatIndex}_${repeatedField.id}`;
                                    const repeatedFieldValue = draft[repeatedFieldKey];
                                    const isRepeatedFileField = repeatedField.type === 'file';
                                    const hasRepeatedFile = isRepeatedFileField && (repeatedFieldValue instanceof File || (repeatedFieldValue?.storagePath));
                                    
                                    return (
                                      <div key={repeatedFieldKey} className="space-y-2">
                                        <Label htmlFor={`${panel.panelId}-${repeatedFieldKey}`}>
                                          {repeatedField.label}
                                          {repeatedField.required && <span className="text-red-500 ml-1">*</span>}
                                        </Label>
                                        
                                        {isRepeatedFileField ? (
                                          <div className="space-y-2">
                                            {hasRepeatedFile && (
                                              <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                                <FileText className="h-5 w-5 text-blue-600 flex-shrink-0" />
                                                <div className="flex-1 min-w-0">
                                                  <p className="text-sm font-medium text-blue-900 truncate">
                                                    {repeatedFieldValue instanceof File ? repeatedFieldValue.name : repeatedFieldValue.name}
                                                  </p>
                                                  <p className="text-xs text-blue-600">
                                                    {repeatedFieldValue instanceof File 
                                                      ? `${(repeatedFieldValue.size / 1024).toFixed(1)} KB` 
                                                      : `${(repeatedFieldValue.size / 1024).toFixed(1)} KB`}
                                                  </p>
                                                </div>
                                                <button
                                                  type="button"
                                                  onClick={() => handleFieldChange(panel.panelId, repeatedFieldKey, null)}
                                                  className="p-1 hover:bg-red-100 rounded-full transition-colors"
                                                >
                                                  <X className="h-4 w-4 text-red-600" />
                                                </button>
                                              </div>
                                            )}
                                            
                                            <label 
                                              htmlFor={`${panel.panelId}-${repeatedFieldKey}`}
                                              className={`flex items-center justify-center gap-2 p-3 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                                                hasRepeatedFile 
                                                  ? 'border-gray-300 bg-gray-50 hover:border-gray-400' 
                                                  : 'border-blue-300 bg-blue-50 hover:border-blue-400 hover:bg-blue-100'
                                              }`}
                                            >
                                              <Upload className="h-5 w-5 text-blue-600" />
                                              <span className="text-sm font-medium text-blue-900">
                                                {hasRepeatedFile ? 'Changer le fichier' : 'Choisir un fichier'}
                                              </span>
                                            </label>
                                            <Input
                                              id={`${panel.panelId}-${repeatedFieldKey}`}
                                              type="file"
                                              onChange={(event) => {
                                                const file = event.target.files?.[0];
                                                if (file) {
                                                  handleFieldChange(panel.panelId, repeatedFieldKey, file);
                                                }
                                              }}
                                              className="hidden"
                                              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                                            />
                                            <p className="text-xs text-gray-500">
                                              Formats acceptés: PDF, PNG, JPG, DOCX (max 10 MB)
                                            </p>
                                          </div>
                                        ) : repeatedField.type === 'select' ? (
                                          <select
                                            id={`${panel.panelId}-${repeatedFieldKey}`}
                                            value={repeatedFieldValue || ''}
                                            onChange={(event) => handleFieldChange(panel.panelId, repeatedFieldKey, event.target.value)}
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                          >
                                            <option value="">-- Sélectionner --</option>
                                            {(repeatedField.options || []).map((option, idx) => (
                                              <option key={idx} value={option}>
                                                {option}
                                              </option>
                                            ))}
                                          </select>
                                        ) : (
                                          <Input
                                            id={`${panel.panelId}-${repeatedFieldKey}`}
                                            type={repeatedField.type || 'text'}
                                            value={typeof repeatedFieldValue === 'object' ? '' : (repeatedFieldValue || '')}
                                            onChange={(event) => handleFieldChange(panel.panelId, repeatedFieldKey, event.target.value)}
                                            placeholder={repeatedField.placeholder || ''}
                                          />
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <Button
                    onClick={() => handleSubmit(panel)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    disabled={uploading || submittingForms[panel.panelId]}
                  >
                    {submittingForms[panel.panelId] ? (
                      <>
                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Envoi en cours...
                      </>
                    ) : uploading ? (
                      <>
                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Upload en cours...
                      </>
                    ) : (
                      'Envoyer'
                    )}
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
