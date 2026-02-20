import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Phone, MessageCircle, MapPin, Mail, FileText, Upload, X } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import { logger } from '@/lib/logger';
import { useSupabaseProjectFiles } from '@/hooks/useSupabaseProjectFiles';

/**
 * /partner/missions/:missionId
 * - Shows mission details
 * - Shows client brief
 * - Renders questions if present (boolean/text)
 * - Allows partner to VALIDATE or mark IMPOSSIBLE (blocked)
 * - Saves responses + comment into partner_notes JSON
 */
const PartnerMissionDetailPage = () => {
  const { missionId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [mission, setMission] = useState(null);
  const [client, setClient] = useState(null);
  const [responses, setResponses] = useState({});
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  
  // 🔥 Formulaires pour partenaire (chargés directement, pas via hook)
  const [formSchemas, setFormSchemas] = useState({});
  const [formDrafts, setFormDrafts] = useState({});
  const [partnerForms, setPartnerForms] = useState([]); // Panels à remplir

  // 🔥 Hook upload fichiers (activé seulement quand mission chargée)
  const { uploadFile, uploading: fileUploading } = useSupabaseProjectFiles({
    projectType: mission?.project_type || '',
    prospectId: mission?.prospect_id || null,
    enabled: !!mission,
  });

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          navigate('/partner/login');
          return;
        }

        // Récupérer partenaire
        const { data: partnerData, error: partnerError } = await supabase
          .from('partners')
          .select('id, active')
          .eq('user_id', user.id)
          .single();

        if (partnerError || !partnerData) {
          await supabase.auth.signOut();
          navigate('/partner/login');
          return;
        }

        if (!partnerData.active) {
          await supabase.auth.signOut();
          navigate('/partner/login');
          return;
        }

        // Récupérer la mission et vérifier qu'elle appartient au partenaire
        const { data: missionData, error: missionError } = await supabase
          .from('missions')
          .select('*')
          .eq('id', missionId)
          .single();

        if (missionError || !missionData) {
          toast({ title: 'Erreur', description: 'Mission introuvable.', variant: 'destructive' });
          navigate('/partner/missions');
          return;
        }

        if (missionData.partner_id !== partnerData.id) {
          // Tentative d'accès non autorisé
          logger.warn('Accès mission non autorisé', { missionId, userId: user.id });
          await supabase.auth.signOut();
          navigate('/partner/login');
          return;
        }

        if (!mounted) return;
        setMission(missionData);

        // Charger client (prospect) minimal
        const { data: prospectData } = await supabase
          .from('prospects')
          .select('id, name, email, phone, address')
          .eq('id', missionData.prospect_id)
          .maybeSingle();

        if (mounted) setClient(prospectData || null);

        // 🔥 AJOUT: Charger les schémas des formulaires
        if (missionData.form_ids?.length > 0) {
          const { data: formsData } = await supabase
            .from('forms')
            .select('*')
            .in('form_id', missionData.form_ids);
          
          if (formsData && mounted) {
            const schemas = {};
            formsData.forEach(form => { schemas[form.form_id] = form; });
            setFormSchemas(schemas);
          }

          // 🔥 Charger les panels directement (pas via hook car partenaire n'a pas OrganizationContext)
          const { data: panelsData, error: panelsError } = await supabase
            .from('client_form_panels')
            .select('*')
            .eq('prospect_id', missionData.prospect_id)
            .eq('project_type', missionData.project_type) // 🔥 FIX: Filtrer par projet
            .eq('filled_by_role', 'partner')
            .in('form_id', missionData.form_ids);

          if (panelsError) {
            logger.error('Erreur chargement panels partenaire', { error: panelsError.message });
          } else if (panelsData && mounted) {
            // Transformer en format camelCase
            const transformedPanels = panelsData.map(p => ({
              id: p.id,
              panelId: p.panel_id,
              prospectId: p.prospect_id,
              projectType: p.project_type,
              formId: p.form_id,
              status: p.status,
              filledByRole: p.filled_by_role,
              formData: p.form_data || {},
              rejectionReason: p.rejection_reason || null, // 🔥 AJOUT: Raison du refus
              lastSubmittedAt: p.last_submitted_at,
            }));
            setPartnerForms(transformedPanels);
            
            // 🔥 FIX: Pré-remplir formDrafts avec les données déjà soumises
            const initialDrafts = {};
            transformedPanels.forEach(p => {
              if (p.formData && Object.keys(p.formData).length > 0) {
                initialDrafts[p.panelId] = { ...p.formData };
              }
            });
            if (Object.keys(initialDrafts).length > 0) {
              setFormDrafts(initialDrafts);
              logger.debug('Drafts pré-remplis depuis panels existants', { count: Object.keys(initialDrafts).length });
            }
            
            logger.debug('Panels partenaire chargés', { count: transformedPanels.length });
          }
        }

        // Préparer questions si présentes (champ JSON dans partner_notes? ou questions)
        // On tente de récupérer `questions` si la colonne existe, sinon on ignore
        const qs = missionData.questions || missionData.payload || null;
        if (qs && typeof qs === 'object') {
          // init responses with defaults
          const init = {};
          qs.forEach((q, idx) => {
            init[q.id || idx] = q.type === 'boolean' ? null : (q.default || '');
          });
          setResponses(init);
        }

      } catch (err) {
        logger.error('PartnerMissionDetail load error', { err: err.message });
        toast({ title: 'Erreur', description: "Impossible de charger la mission.", variant: 'destructive' });
        navigate('/partner/missions');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, [missionId, navigate]);

  const handleBack = () => navigate('/partner/missions');

  const handleAnswerChange = (key, value) => {
    setResponses(prev => ({ ...prev, [key]: value }));
  };

  // 🔥 AJOUT: Gestion des formulaires
  const handleFormFieldChange = (panelId, fieldId, value) => {
    setFormDrafts(prev => ({
      ...prev,
      [panelId]: {
        ...(prev[panelId] || {}),
        [fieldId]: value,
      },
    }));
  };

  // 🔥 Validation d'un formulaire individuel (utilisé par handleValidateMission)
  const validateFormPanel = async (panel) => {
    const { panelId, formId } = panel;
    const formDef = formSchemas[formId];
    const draft = { ...(formDrafts[panelId] || {}) };

    // Valider que tous les champs requis sont remplis
    const missingFields = formDef?.fields?.filter(f => f.required && !draft[f.id]);
    if (missingFields?.length > 0) {
      return { 
        success: false, 
        error: `Champs manquants dans "${formDef?.title || 'Formulaire'}"`,
        missingFields 
      };
    }

    // 🔥 UPLOAD FICHIERS: Uploader les File objects avant sauvegarde
    try {
      const fileFields = formDef?.fields?.filter(f => f.type === 'file') || [];
      for (const field of fileFields) {
        const fileValue = draft[field.id];
        if (fileValue && fileValue instanceof File) {
          // Vérifier taille (max 10 MB)
          const maxSize = 10 * 1024 * 1024;
          if (fileValue.size > maxSize) {
            return { 
              success: false, 
              error: `${field.label}: Fichier trop volumineux (max 10 MB)` 
            };
          }

          // Récupérer l'ID de l'utilisateur authentifié
          const { data: { user } } = await supabase.auth.getUser();
          
          const uploadedFile = await uploadFile({
            file: fileValue,
            uploadedBy: user?.id,
            fieldLabel: field.label,
          });

          if (uploadedFile) {
            // Remplacer le File par les métadonnées
            draft[field.id] = {
              id: uploadedFile.id,
              name: uploadedFile.file_name,
              size: uploadedFile.file_size,
              type: uploadedFile.file_type,
              storagePath: uploadedFile.storage_path,
              fieldLabel: field.label,
            };
            logger.debug('✅ Fichier partenaire uploadé', { fieldId: field.id, fileName: uploadedFile.file_name });
          }
        }
      }
    } catch (uploadError) {
      logger.error('❌ Erreur upload fichier partenaire', uploadError);
      return { success: false, error: `Erreur upload: ${uploadError.message}` };
    }

    // 🔥 UPDATE DIRECT (pas via hook car partenaire n'a pas OrganizationContext)
    const { error: updateError } = await supabase
      .from('client_form_panels')
      .update({
        form_data: draft,
        status: 'submitted',
        last_submitted_at: new Date().toISOString()
      })
      .eq('panel_id', panelId);

    if (updateError) {
      console.error("UPDATE PANEL ERROR:", updateError);
      return { success: false, error: updateError.message };
    }

    // Mettre à jour le draft local avec les fichiers uploadés
    setFormDrafts(prev => ({ ...prev, [panelId]: draft }));

    return { success: true };
  };

  // 🔥 NOUVEAU: Fonction unifiée pour valider mission + tous les formulaires
  const handleValidateMission = async () => {
    try {
      setSaving(true);

      // 1. Vérifier et soumettre tous les formulaires pending
      const pendingForms = partnerForms.filter(p => p.status === 'pending' || p.status === 'rejected');
      
      if (pendingForms.length > 0) {
        for (const panel of pendingForms) {
          const result = await validateFormPanel(panel);
          if (!result.success) {
            toast({ 
              title: 'Formulaire incomplet', 
              description: result.error,
              variant: 'destructive' 
            });
            setSaving(false);
            return;
          }
        }
        
        // Mettre à jour l'état local des formulaires
        setPartnerForms(prev => prev.map(p => ({
          ...p,
          status: pendingForms.some(pf => pf.panelId === p.panelId) ? 'submitted' : p.status,
          formData: formDrafts[p.panelId] || p.formData
        })));
      }

      // 2. Préparer les notes partenaire
      const payload = {
        responses,
        comment: comment || null,
        updated_at: new Date().toISOString(),
        forms_submitted: partnerForms.length,
      };

      // 3. Marquer la mission comme soumise (en attente de validation admin)
      const { error } = await supabase
        .from('missions')
        .update({
          status: 'submitted',
          partner_notes: JSON.stringify(payload),
          updated_at: new Date().toISOString(),
        })
        .eq('id', mission.id);

      if (error) throw error;

      toast({ 
        title: '✅ Mission soumise', 
        description: 'Formulaires envoyés. En attente de validation admin.',
        className: 'bg-green-500 text-white' 
      });
      
      navigate('/partner/preuves');
      
    } catch (err) {
      logger.error('PartnerMissionDetail handleValidateMission error', { err: err.message });
      toast({ 
        title: 'Erreur', 
        description: "Impossible de valider la mission.",
        variant: 'destructive' 
      });
    } finally {
      setSaving(false);
    }
  };

  const saveResult = async (newStatus) => {
    try {
      setSaving(true);

      // For 'blocked' (impossible) require comment
      if (newStatus === 'blocked' && (!comment || comment.trim() === '')) {
        toast({ title: 'Commentaire requis', description: 'Veuillez fournir un commentaire.', variant: 'destructive' });
        setSaving(false);
        return;
      }

      // Prepare partner_notes payload
      const payload = {
        responses,
        comment: comment || null,
        updated_at: new Date().toISOString(),
      };

      const updates = {
        status: newStatus,
        partner_notes: JSON.stringify(payload),
        updated_at: new Date().toISOString(),
      };

      if (newStatus === 'completed') {
        updates.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('missions')
        .update(updates)
        .eq('id', mission.id);

      if (error) throw error;

      // 🔥 Si "Impossible à réaliser", passer tous les formulaires en rejected avec la raison
      if (newStatus === 'blocked' && partnerForms.length > 0) {
        const panelIds = partnerForms.map(p => p.panelId);
        const { error: panelError } = await supabase
          .from('client_form_panels')
          .update({
            status: 'rejected',
            rejection_reason: `Mission impossible — ${comment}`,
          })
          .in('panel_id', panelIds);
        
        if (panelError) {
          logger.error('Erreur mise à jour panels après mission impossible', { error: panelError.message });
        }
      }

      toast({ title: '✅ Enregistré', description: 'Votre réponse a été sauvegardée.', className: 'bg-green-500 text-white' });
      navigate('/partner/preuves');
    } catch (err) {
      logger.error('PartnerMissionDetail save error', { err: err.message });
      toast({ title: 'Erreur', description: "Impossible d'enregistrer la mission.", variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleActionClick = (action) => {
    const clientData = {
      name: mission?.client_name || mission?.title?.replace('Mission pour ', '') || client?.name || '—',
      phone: mission?.phone || client?.phone,
      email: mission?.email || client?.email,
      address: mission?.address || client?.address,
    };

    switch (action) {
      case 'Appel':
        if (clientData.phone) window.location.href = `tel:${clientData.phone}`;
        break;
      case 'Mail':
        if (clientData.email) window.location.href = `mailto:${clientData.email}`;
        break;
      case 'WhatsApp':
        if (clientData.phone) {
          const phoneNumber = clientData.phone.replace(/[^0-9]/g, '');
          window.open(`https://wa.me/${phoneNumber}`, '_blank');
        } else {
          toast({
            title: 'Numéro manquant',
            description: "Ce client n'a pas de numéro de téléphone.",
            variant: 'destructive',
          });
        }
        break;
      case 'GPS':
        if (clientData.address) {
          const encodedAddress = encodeURIComponent(clientData.address);
          const isAppleDevice = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
          if (isAppleDevice) {
            window.location.href = `maps://?q=${encodedAddress}`;
          } else {
            window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank');
          }
        }
        break;
      default:
        break;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!mission) return null;

  return (
    <div className="px-4 pt-4 pb-4">
      <div className="max-w-2xl mx-auto">
        <header className="mb-6 flex items-center gap-4">
          <Button variant="ghost" onClick={handleBack} className="p-2">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{mission.title}</h2>
            <p className="text-sm text-gray-500">{mission.step_name || mission.project_type}</p>
          </div>
        </header>

        {/* Client block - Actions rapides style ProspectDetailsAdmin */}
        <section className="bg-white rounded-xl p-4 shadow-sm border mb-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions rapides</h2>
          <div className="flex flex-wrap justify-between gap-2 text-center">
            {[
              { icon: Phone, label: 'Appel' },
              { icon: Mail, label: 'Mail' },
              { icon: MessageCircle, label: 'WhatsApp' },
              { icon: MapPin, label: 'GPS' },
            ].map(({ icon: Icon, label }) => (
              <button
                key={label}
                onClick={() => handleActionClick(label)}
                className="flex flex-col items-center space-x-1 transition-colors group text-gray-600 hover:text-blue-600"
              >
                <div className="w-12 h-12 rounded-full flex items-center justify-center bg-gray-100 group-hover:bg-blue-100">
                  <Icon className="h-6 w-6" />
                </div>
                <span className="text-xs font-medium">{label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Instruction */}
        <section className="bg-white rounded-xl p-4 shadow-sm border mb-4">
          <Label className="text-xs text-gray-500">ORDRE EVATIME</Label>
          <div className="mt-2 font-medium text-gray-900">Instruction</div>
          <p className="text-sm text-gray-600 mt-2">{mission.description || '—'}</p>
        </section>

        {/* 🔥 AJOUT: Formulaires à remplir par le partenaire */}
        {partnerForms.length > 0 && (
          <section className="bg-white rounded-xl p-4 shadow-sm border mb-4">
            <Label className="text-xs text-gray-500">FORMULAIRES À REMPLIR</Label>
            <div className="mt-4 space-y-6">
              {partnerForms.map((panel) => {
                const formDef = formSchemas[panel.formId];
                const draft = formDrafts[panel.panelId] || {};
                const isSubmitted = panel.status === 'submitted';
                const isApproved = panel.status === 'approved';
                const isRejected = panel.status === 'rejected';

                return (
                  <div key={panel.panelId} className="border-t pt-4 first:border-t-0 first:pt-0">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-gray-900">
                        {formDef?.title || 'Formulaire'}
                      </h3>
                      {isApproved && (
                        <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-700">
                          ✅ Validé
                        </span>
                      )}
                      {isSubmitted && !isApproved && (
                        <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700">
                          📨 Envoyé
                        </span>
                      )}
                      {isRejected && (
                        <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-700">
                          ❌ Refusé
                        </span>
                      )}
                      {panel.status === 'pending' && (
                        <span className="text-xs px-2 py-1 rounded bg-orange-100 text-orange-700">
                          ✏️ À remplir
                        </span>
                      )}
                    </div>

                    {formDef?.description && (
                      <p className="text-sm text-gray-600 mb-4">{formDef.description}</p>
                    )}

                    {/* 🔥 RAISON DU REFUS: Afficher en évidence si refusé */}
                    {isRejected && panel.rejectionReason && (
                      <div className="mb-4 p-4 bg-red-50 border border-red-300 rounded-lg">
                        <p className="text-sm font-semibold text-red-800 mb-1">❌ Formulaire refusé</p>
                        <p className="text-sm text-red-700">
                          <strong>Raison :</strong> {panel.rejectionReason}
                        </p>
                        <p className="text-xs text-red-600 mt-2">
                          Veuillez corriger et soumettre à nouveau.
                        </p>
                      </div>
                    )}

                    {/* Champs du formulaire */}
                    {/* Mode lecture seule : formulaire soumis ou approuvé → afficher les données */}
                    {(isSubmitted || isApproved) && !isRejected && (
                      <div className="space-y-3">
                        {formDef?.fields?.map((field) => {
                          const value = panel.formData?.[field.id] || draft[field.id] || '';
                          const isFileValue = field.type === 'file' && typeof value === 'object' && value.storagePath;
                          return (
                            <div key={field.id}>
                              <Label className="text-xs text-gray-500 uppercase">{field.label}</Label>
                              {isFileValue ? (
                                <div className="flex items-center gap-2 mt-1 px-3 py-2 bg-blue-50 rounded border border-blue-200">
                                  <FileText className="h-4 w-4 text-blue-600 flex-shrink-0" />
                                  <span className="text-sm text-blue-900 truncate">{value.name}</span>
                                </div>
                              ) : (
                                <p className="text-sm text-gray-900 mt-1 px-3 py-2 bg-gray-50 rounded border">
                                  {field.type === 'checkbox' 
                                    ? (value ? '✅ Oui' : '❌ Non')
                                    : (value || '—')}
                                </p>
                              )}
                            </div>
                          );
                        })}
                        {isSubmitted && (
                          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-center">
                            <p className="text-sm text-blue-700">📨 Formulaire envoyé — En attente de validation admin</p>
                          </div>
                        )}
                        {isApproved && (
                          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded text-center">
                            <p className="text-sm text-green-700">✅ Formulaire validé par l'admin</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Mode édition : pending ou rejected → champs éditables */}
                    {(panel.status === 'pending' || isRejected) && (
                      <div className="space-y-4">
                        {formDef?.fields?.map((field) => (
                          <div key={field.id}>
                            <Label className="mb-2 block">
                              {field.label}
                              {field.required && <span className="text-red-500 ml-1">*</span>}
                            </Label>
                            
                            {field.type === 'text' && (
                              <Input
                                type="text"
                                value={draft[field.id] || ''}
                                onChange={(e) => handleFormFieldChange(panel.panelId, field.id, e.target.value)}
                                placeholder={field.placeholder || ''}
                              />
                            )}

                            {field.type === 'textarea' && (
                              <textarea
                                value={draft[field.id] || ''}
                                onChange={(e) => handleFormFieldChange(panel.panelId, field.id, e.target.value)}
                                placeholder={field.placeholder || ''}
                                className="w-full px-3 py-2 border rounded min-h-[80px]"
                              />
                            )}

                            {field.type === 'select' && (
                              <select
                                value={draft[field.id] || ''}
                                onChange={(e) => handleFormFieldChange(panel.panelId, field.id, e.target.value)}
                                className="w-full px-3 py-2 border rounded"
                              >
                                <option value="">-- Sélectionner --</option>
                                {field.options?.map((opt) => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </select>
                            )}

                            {field.type === 'number' && (
                              <Input
                                type="number"
                                value={draft[field.id] || ''}
                                onChange={(e) => handleFormFieldChange(panel.panelId, field.id, e.target.value)}
                                placeholder={field.placeholder || ''}
                              />
                            )}

                            {field.type === 'date' && (
                              <Input
                                type="date"
                                value={draft[field.id] || ''}
                                onChange={(e) => handleFormFieldChange(panel.panelId, field.id, e.target.value)}
                              />
                            )}

                            {field.type === 'checkbox' && (
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={draft[field.id] || false}
                                  onChange={(e) => handleFormFieldChange(panel.panelId, field.id, e.target.checked)}
                                  className="w-4 h-4"
                                />
                                <span className="text-sm">{field.placeholder}</span>
                              </div>
                            )}

                            {field.type === 'file' && (() => {
                              const fileValue = draft[field.id];
                              const hasFile = fileValue instanceof File || (fileValue && typeof fileValue === 'object' && fileValue.storagePath);
                              return (
                                <div className="space-y-2">
                                  {hasFile && (
                                    <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                      <FileText className="h-5 w-5 text-blue-600 flex-shrink-0" />
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-blue-900 truncate">
                                          {fileValue instanceof File ? fileValue.name : fileValue.name}
                                        </p>
                                        <p className="text-xs text-blue-600">
                                          {fileValue instanceof File
                                            ? `${(fileValue.size / 1024).toFixed(1)} KB`
                                            : fileValue.size ? `${(fileValue.size / 1024).toFixed(1)} KB` : ''}
                                        </p>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleFormFieldChange(panel.panelId, field.id, null)}
                                        className="p-1 hover:bg-red-100 rounded-full transition-colors"
                                      >
                                        <X className="h-4 w-4 text-red-600" />
                                      </button>
                                    </div>
                                  )}
                                  <label
                                    htmlFor={`file-${panel.panelId}-${field.id}`}
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
                                  <input
                                    id={`file-${panel.panelId}-${field.id}`}
                                    type="file"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        handleFormFieldChange(panel.panelId, field.id, file);
                                      }
                                    }}
                                    className="hidden"
                                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                                  />
                                  <p className="text-xs text-gray-500">
                                    Formats: PDF, PNG, JPG, DOCX (max 10 MB)
                                  </p>
                                </div>
                              );
                            })()}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Questions block (if any) */}
        {(mission.questions || mission.payload) ? (
          <section className="bg-white rounded-xl p-4 shadow-sm border mb-4">
            <Label className="text-xs text-gray-500">Merci de confirmer les éléments suivants</Label>
            <div className="mt-3 space-y-3">
              {(mission.questions || mission.payload).map((q, idx) => (
                <div key={q.id || idx} className="space-y-2">
                  <div className="font-medium text-gray-900">{q.label}</div>
                  {q.type === 'boolean' ? (
                    <div className="flex items-center gap-3 mt-2">
                      <button onClick={() => handleAnswerChange(q.id || idx, true)} className={`px-3 py-2 rounded ${responses[q.id || idx] === true ? 'bg-green-50 border' : 'bg-gray-50'}`}>Oui</button>
                      <button onClick={() => handleAnswerChange(q.id || idx, false)} className={`px-3 py-2 rounded ${responses[q.id || idx] === false ? 'bg-red-50 border' : 'bg-gray-50'}`}>Non</button>
                    </div>
                  ) : (
                    <input type="text" value={responses[q.id || idx] || ''} onChange={(e) => handleAnswerChange(q.id || idx, e.target.value)} className="w-full px-3 py-2 border rounded" />
                  )}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* Comment */}
        <section className="bg-white rounded-xl p-4 shadow-sm border mb-4">
          <Label className="text-xs text-gray-500">Commentaire (optionnel)</Label>
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} className="w-full mt-2 px-3 py-2 border rounded min-h-[80px]" />
          <p className="text-xs text-gray-400 mt-2">Le commentaire devient requis si vous marquez la mission comme impossible.</p>
        </section>

        <div className="flex gap-3">
          <Button variant="ghost" onClick={() => saveResult('blocked')} disabled={saving} className="flex-1 border">IMPOSSIBLE À RÉALISER</Button>
          <Button onClick={handleValidateMission} disabled={saving} className="flex-1 bg-orange-600 hover:bg-orange-700 text-white">
            {saving ? 'Envoi en cours...' : 'VALIDER LA MISSION'}
          </Button>
        </div>

      </div>
    </div>
  );
};

export default PartnerMissionDetailPage;
