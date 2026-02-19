# 📋 ANALYSE : Formulaires pour Partenaires (copie logique CLIENT)

## 🎯 OBJECTIF
Permettre aux **partenaires** de remplir des formulaires envoyés depuis Workflow V2, en **réutilisant 100% de la logique CLIENT** existante.

---

## 🔍 FLOW CLIENT EXISTANT (à copier)

### 1️⃣ Création du form panel (Admin → Client)
**Fichier**: `src/lib/executeActionOrderV2.js` ligne 333-380

```javascript
// Quand action FORM avec target=CLIENT
async function executeFormAction(order, context) {
  const formIds = order.formIds || [];
  
  for (const formId of formIds) {
    // Créer un client_form_panel
    const { data: panel } = await supabase
      .from('client_form_panels')
      .insert({
        panel_id: `panel-${prospectId}-${projectType}-${formId}-${Date.now()}`,
        prospect_id: prospectId,
        project_type: projectType,
        form_id: formId,
        prompt_id: order.promptId,
        current_step_index: order.currentStepIndex,
        status: 'pending',
        reminder_enabled: true,
        reminder_delay_days: 1,
        max_reminders_before_task: 3
      });
    
    // Envoyer message chat
    await sendChatMessage({
      prospectId,
      projectType,
      message: "Un formulaire est disponible",
      metadata: { type: 'form_request', formId, panelId: panel.id }
    });
  }
}
```

### 2️⃣ Affichage du formulaire (Client)
**Fichier**: `src/components/client/ClientFormPanel.jsx`

- Charge les `client_form_panels` via hook `useSupabaseClientFormPanels`
- Filtre par `prospect_id = currentUser.id`
- Charge le schéma du formulaire depuis table `forms`
- Affiche les champs dynamiquement
- Gère l'upload de fichiers
- Soumission → UPDATE `client_form_panels.status = 'submitted'`

### 3️⃣ Vérification (Admin)
**Fichier**: `src/components/admin/ProspectDetailsAdmin.jsx`

- Admin voit les formulaires soumis
- Peut approuver (`status = 'approved'`) ou rejeter (`status = 'rejected'`)
- Si rejeté → client peut re-modifier et re-soumettre

---

## 🚀 ADAPTATION POUR PARTENAIRES

### ✅ CE QUI RESTE IDENTIQUE
- Table `client_form_panels` (on réutilise)
- Hook `useSupabaseClientFormPanels` (on réutilise)
- Schéma formulaires dans table `forms` (on réutilise)
- Logique de vérification (on réutilise)

### 🔧 CE QUI CHANGE

| Aspect | CLIENT | PARTENAIRE |
|--------|--------|------------|
| **Création panel** | `executeFormAction()` (target=CLIENT) | `executeFormAction()` (target=PARTENAIRE) |
| **Affichage** | `ClientFormPanel.jsx` | `PartnerMissionDetailPage.jsx` |
| **Filtrage** | `prospect_id = currentUser.id` | `prospect_id = mission.prospect_id` |
| **Chat** | Envoie message au client | Pas de chat (déjà dans mission) |
| **Vérification** | Admin valide | Admin valide (même) |

---

## 📝 PLAN D'IMPLÉMENTATION

### ÉTAPE 1: Modifier `executeActionOrderV2.js` (Bridge V2→V1)

**Fichier**: `src/lib/executeActionOrderV2.js` ligne 136-244

```javascript
// Cas target=PARTENAIRE avec FORM
if (order.target === 'PARTENAIRE') {
  // 1. Créer la mission (✅ déjà fait)
  await executePartnerTaskAction({...});
  
  // 2. SI actionType=FORM → créer les form_panels
  if (order.actionType === 'FORM' && order.formIds?.length > 0) {
    for (const formId of order.formIds) {
      const panelId = `panel-partner-${prospectId}-${projectType}-${formId}-${Date.now()}`;
      
      await supabase
        .from('client_form_panels')
        .insert({
          panel_id: panelId,
          prospect_id: prospectId, // ⚠️ C'est le CLIENT qui remplit (via partenaire)
          project_type: projectType,
          form_id: formId,
          prompt_id: order.promptId,
          current_step_index: order.currentStepIndex,
          status: 'pending',
          verification_mode: order.verificationMode || 'human',
          // ⚠️ PAS de reminder pour partenaires
        });
    }
  }
}
```

### ÉTAPE 2: Modifier `useWorkflowExecutor.js` (Stocker form_ids dans mission)

**Fichier**: `src/hooks/useWorkflowExecutor.js` ligne 420-430

```javascript
// Ajouter form_ids dans l'INSERT de la mission
const { data: mission, error: missionError } = await supabase
  .from('missions')
  .insert({
    organization_id: prospectData.organization_id,
    partner_id: action.partnerId,
    prospect_id: prospectId,
    project_type: projectType,
    title: `Mission pour ${prospectData.name || 'Client'}`,
    description: action.partnerInstructions || null,
    status: 'pending',
    is_blocking: action.isBlocking !== false,
    client_name: prospectData.name || null,
    email: prospectData.email || null,
    phone: prospectData.phone || null,
    address: prospectData.address || null,
    form_ids: action.formIds || [], // 🔥 AJOUTER ICI
  })
```

### ÉTAPE 3: Migration SQL (Ajouter colonne form_ids)

**Fichier**: `add_form_ids_to_missions.sql`

```sql
-- Ajouter colonne pour stocker les IDs des formulaires
ALTER TABLE missions ADD COLUMN IF NOT EXISTS form_ids TEXT[];

-- Index pour recherche
CREATE INDEX IF NOT EXISTS idx_missions_form_ids ON missions USING GIN (form_ids);
```

### ÉTAPE 4: Modifier `PartnerMissionDetailPage.jsx` (Afficher formulaires)

**Fichier**: `src/pages/partner/PartnerMissionDetailPage.jsx`

```javascript
// 1. Importer le hook
import { useSupabaseClientFormPanels } from '@/hooks/useSupabaseClientFormPanels';

// 2. Charger les form_panels de ce prospect
const { formPanels, updateFormPanel } = useSupabaseClientFormPanels(mission?.prospect_id);

// 3. Filtrer par form_ids de la mission
const missionFormPanels = useMemo(() => {
  if (!mission?.form_ids) return [];
  return formPanels.filter(panel => 
    mission.form_ids.includes(panel.formId) && 
    panel.projectType === mission.project_type
  );
}, [formPanels, mission]);

// 4. Charger les schémas des formulaires
const [formSchemas, setFormSchemas] = useState({});

useEffect(() => {
  if (!mission?.form_ids) return;
  
  const loadForms = async () => {
    const { data } = await supabase
      .from('forms')
      .select('*')
      .in('form_id', mission.form_ids);
    
    const schemas = {};
    data.forEach(form => { schemas[form.form_id] = form; });
    setFormSchemas(schemas);
  };
  
  loadForms();
}, [mission?.form_ids]);

// 5. Rendu IDENTIQUE à ClientFormPanel.jsx
return (
  <div>
    {/* Actions rapides */}
    {/* Instruction */}
    
    {/* 🔥 FORMULAIRES (COPIE ClientFormPanel.jsx) */}
    {missionFormPanels.map(panel => {
      const formDef = formSchemas[panel.formId];
      const isSubmitted = panel.status === 'submitted';
      
      return (
        <section key={panel.panelId}>
          <Label>{formDef?.name}</Label>
          
          {isSubmitted ? (
            <div>Formulaire envoyé ✅</div>
          ) : (
            <div>
              {/* Rendre champs dynamiquement */}
              {formDef?.fields?.map(field => (
                <Input key={field.id} {...field} />
              ))}
              
              <Button onClick={() => handleSubmitForm(panel)}>
                Envoyer
              </Button>
            </div>
          )}
        </section>
      );
    })}
  </div>
);
```

### ÉTAPE 5: Fonction de soumission (COPIE ClientFormPanel.jsx)

```javascript
const handleSubmitForm = async (panel) => {
  const { formId, panelId, prospectId, projectType } = panel;
  const formDef = formSchemas[formId];
  const draft = formDrafts[panelId] || {};
  
  // 1. Upload fichiers (si présents)
  // COPIER logique upload de ClientFormPanel.jsx lignes 118-250
  
  // 2. Sauvegarder dans prospects.form_data
  const { data: prospect } = await supabase
    .from('prospects')
    .select('form_data')
    .eq('id', prospectId)
    .single();
  
  const updatedFormData = {
    ...prospect.form_data,
    [projectType]: {
      ...(prospect.form_data?.[projectType] || {}),
      [formId]: draft
    }
  };
  
  await supabase
    .from('prospects')
    .update({ form_data: updatedFormData })
    .eq('id', prospectId);
  
  // 3. Mettre à jour le panel status
  await updateFormPanel(panelId, { 
    status: 'submitted',
    lastSubmittedAt: new Date().toISOString() 
  });
  
  // 4. Toast confirmation
  toast({
    title: '✅ Formulaire envoyé',
    description: 'En attente de validation par l\'admin'
  });
};
```

---

## 📊 RÉSUMÉ DES FICHIERS À MODIFIER

| Fichier | Modification | Complexité |
|---------|--------------|------------|
| `add_form_ids_to_missions.sql` | Ajouter colonne `form_ids` | ⭐ Simple |
| `src/lib/executeActionOrderV2.js` | Créer form_panels pour target=PARTENAIRE | ⭐⭐ Moyen |
| `src/hooks/useWorkflowExecutor.js` | Ajouter `form_ids` dans INSERT mission | ⭐ Simple |
| `src/pages/partner/PartnerMissionDetailPage.jsx` | Afficher et soumettre formulaires | ⭐⭐⭐ Complexe |

**TOTAL**: ~2-3h de dev

---

## ✅ AVANTAGES DE CETTE APPROCHE

1. **Réutilisation maximale** : Même table, même hook, même logique
2. **Pas de nouvelle table** : `client_form_panels` fonctionne aussi pour partenaires
3. **Vérification identique** : Admin valide de la même façon
4. **Pas de duplication** : Pas de code copié/collé, juste adaptation UI
5. **Multi-tenant OK** : organization_id déjà géré dans form_panels

---

## 🚦 ORDRE D'EXÉCUTION

1. ✅ SQL: Ajouter colonne `form_ids` à missions
2. ✅ Bridge: Créer form_panels dans executeActionOrderV2.js
3. ✅ V1: Ajouter form_ids dans useWorkflowExecutor.js
4. ✅ UI: Afficher formulaires dans PartnerMissionDetailPage.jsx
5. ✅ Test: Créer mission avec formulaire et remplir côté partenaire

**PRÊT À COMMENCER ?** 🚀
