# 📋 Système de Gestion Dynamique des Formulaires

## ✅ Vue d'ensemble

Le système de formulaires dynamiques permet aux **admins** de créer des formulaires personnalisés et de les envoyer aux **clients via le chat**. Les clients remplissent ces formulaires dans leur interface, et les admins peuvent valider ou rejeter les soumissions.

## 🏗️ Architecture

### Tables impliquées

```
forms (définitions de formulaires)
  │
  ├──→ client_form_panels (instances envoyées aux clients)
  │       │
  │       ├──→ prospects (destinataire)
  │       └──→ project_templates (contexte projet)
  │
  └──→ prospects.formData (données soumises par le client)
```

## 📊 Table : `forms`

### Structure

```sql
CREATE TABLE public.forms (
  id UUID PRIMARY KEY,
  form_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  project_ids TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### Champs

| Champ | Type | Description |
|-------|------|-------------|
| `form_id` | TEXT | Identifiant unique (ex: `form-1699876543210`) |
| `name` | TEXT | Nom interne du formulaire (ex: "Formulaire RIB") |
| `fields` | JSONB | Tableau des champs du formulaire (voir structure ci-dessous) |
| `project_ids` | TEXT[] | Types de projets associés (`['ACC', 'Centrale']`) |

### Structure du champ `fields` (JSONB)

```json
[
  {
    "id": "field-1699876543210",
    "label": "Numéro de compte bancaire",
    "type": "text",
    "placeholder": "FR76 XXXX XXXX XXXX XXXX XXXX XXX",
    "required": true
  },
  {
    "id": "field-1699876543211",
    "label": "Document RIB (PDF)",
    "type": "file",
    "placeholder": "",
    "required": true
  },
  {
    "id": "field-1699876543212",
    "label": "Email de confirmation",
    "type": "email",
    "placeholder": "votre.email@exemple.com",
    "required": false
  }
]
```

### Types de champs supportés

- `text` : Champ texte simple
- `email` : Champ email avec validation
- `phone` : Numéro de téléphone
- `number` : Valeur numérique
- `file` : Upload de fichier

## 📊 Table : `client_form_panels`

### Structure

```sql
CREATE TABLE public.client_form_panels (
  id UUID PRIMARY KEY,
  panel_id TEXT UNIQUE NOT NULL,
  prospect_id UUID REFERENCES prospects(id),
  project_type TEXT REFERENCES project_templates(type),
  form_id TEXT REFERENCES forms(form_id),
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected')),
  message_timestamp TEXT,
  user_override TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### Statuts

| Statut | Description |
|--------|-------------|
| `pending` | En attente de soumission par le client |
| `approved` | Validé par l'admin |
| `rejected` | Rejeté par l'admin (client doit resoumettre) |

## 🔄 Workflow complet

### 1️⃣ Création d'un formulaire (Admin)

**Interface** : `ProfilePage.jsx` > **Gestion des Formulaires**

```javascript
// Créer un nouveau formulaire dans Supabase
const { data: newForm, error } = await supabase
  .from('forms')
  .insert({
    form_id: `form-${Date.now()}`,
    name: 'Formulaire RIB',
    fields: [
      {
        id: `field-${Date.now()}`,
        label: 'Numéro de compte',
        type: 'text',
        placeholder: 'FR76...',
        required: true
      },
      {
        id: `field-${Date.now() + 1}`,
        label: 'RIB (PDF)',
        type: 'file',
        placeholder: '',
        required: true
      }
    ],
    project_ids: ['ACC', 'Centrale']
  })
  .select()
  .single();
```

**Actions disponibles** :
- ✅ Créer un nouveau formulaire
- ✅ Modifier un formulaire existant (nom, champs, projets associés)
- ✅ Supprimer un formulaire
- ✅ Ajouter/retirer des champs dynamiquement
- ✅ Réordonner les champs

### 2️⃣ Envoi d'un formulaire à un client (Admin)

**Interface** : Chat admin avec un prospect

```javascript
// L'admin envoie un formulaire via le chat
const { data: formPanel, error } = await supabase
  .from('client_form_panels')
  .insert({
    panel_id: `panel-${Date.now()}`,
    prospect_id: 'prospect-uuid',
    project_type: 'ACC',
    form_id: 'form-1699876543210',
    status: 'pending',
    message_timestamp: new Date().toISOString()
  })
  .select()
  .single();

// Également créer un message chat pour notifier le client
const { data: chatMessage } = await supabase
  .from('chat_messages')
  .insert({
    prospect_id: 'prospect-uuid',
    sender: 'admin',
    message: 'Veuillez remplir le formulaire RIB',
    timestamp: new Date().toISOString(),
    metadata: {
      type: 'form',
      formId: 'form-1699876543210',
      panelId: `panel-${Date.now()}`
    }
  });
```

### 3️⃣ Affichage du formulaire (Client)

**Composant** : `ClientFormPanel.jsx`

Le formulaire apparaît dans l'interface client (panneau latéral ou mobile) :

```javascript
// Récupérer les formulaires à remplir
const { data: myForms, error } = await supabase
  .from('client_form_panels')
  .select(`
    *,
    form:forms!inner(form_id, name, fields),
    project:project_templates!inner(type, title, icon)
  `)
  .eq('prospect_id', currentUserId)
  .eq('status', 'pending');

// Afficher chaque formulaire avec ses champs
myForms.forEach(formPanel => {
  const formDefinition = formPanel.form;
  
  formDefinition.fields.forEach(field => {
    // Render field based on type (text, email, file, etc.)
  });
});
```

### 4️⃣ Soumission du formulaire (Client)

```javascript
// Le client soumet le formulaire
const formData = {
  'field-1699876543210': 'FR76 1234 5678 9012 3456 7890 123',
  'field-1699876543211': 'https://storage.supabase.co/rib.pdf'
};

// Mettre à jour le prospect avec les données
const { data: updatedProspect } = await supabase
  .from('prospects')
  .update({
    form_data: {
      ...existingFormData,
      ...formData
    }
  })
  .eq('id', prospectId);

// Mettre à jour le statut du panel
const { data: updatedPanel } = await supabase
  .from('client_form_panels')
  .update({
    status: 'pending', // Change to 'submitted' or custom status
    user_override: 'submitted'
  })
  .eq('panel_id', panelId);

// Envoyer un message chat pour notifier l'admin
await supabase
  .from('chat_messages')
  .insert({
    prospect_id: prospectId,
    sender: 'client',
    message: 'J\'ai rempli le formulaire RIB',
    timestamp: new Date().toISOString()
  });
```

### 5️⃣ Validation/Rejet (Admin)

```javascript
// L'admin valide le formulaire
const { data: approved } = await supabase
  .from('client_form_panels')
  .update({
    status: 'approved'
  })
  .eq('panel_id', panelId);

// OU l'admin rejette le formulaire
const { data: rejected } = await supabase
  .from('client_form_panels')
  .update({
    status: 'rejected'
  })
  .eq('panel_id', panelId);

// Envoyer un message au client
await supabase
  .from('chat_messages')
  .insert({
    prospect_id: prospectId,
    sender: 'admin',
    message: status === 'approved' 
      ? 'Votre formulaire a été validé ✅' 
      : 'Veuillez corriger votre formulaire ❌',
    timestamp: new Date().toISOString()
  });
```

## 🔒 Row Level Security (RLS)

### Policies pour `forms`

```sql
-- Admins : CRUD complet
CREATE POLICY "Admins can manage forms"
  ON public.forms FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.user_id = auth.uid() 
      AND users.role IN ('Global Admin', 'Manager', 'Commercial')
    )
  );

-- Clients : Lecture seule (pour afficher les champs)
CREATE POLICY "Clients can view forms"
  ON public.forms FOR SELECT
  USING (TRUE);
```

### Policies pour `client_form_panels`

```sql
-- Admins : CRUD complet
CREATE POLICY "Admins can manage client form panels"
  ON public.client_form_panels FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.user_id = auth.uid()
      AND users.role IN ('Global Admin', 'Manager', 'Commercial')
    )
  );

-- Clients : Voir et modifier leurs propres formulaires
CREATE POLICY "Clients can manage their own form panels"
  ON public.client_form_panels FOR ALL
  USING (
    prospect_id IN (
      SELECT id FROM public.prospects
      WHERE user_id = auth.uid()
    )
  );
```

## 📡 Real-time subscriptions

### Écouter les nouveaux formulaires (Client)

```javascript
// Le client écoute les nouveaux formulaires qui lui sont envoyés
const subscription = supabase
  .channel('client-forms')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'client_form_panels',
      filter: `prospect_id=eq.${currentUserId}`
    },
    (payload) => {
      console.log('Nouveau formulaire reçu !', payload.new);
      // Afficher une notification
      toast({
        title: 'Nouveau formulaire',
        description: 'Un formulaire vous a été envoyé'
      });
    }
  )
  .subscribe();
```

### Écouter les soumissions (Admin)

```javascript
// L'admin écoute les soumissions de formulaires
const subscription = supabase
  .channel('form-submissions')
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'client_form_panels',
      filter: `status=eq.pending`
    },
    (payload) => {
      console.log('Formulaire soumis !', payload.new);
      // Notification pour l'admin
    }
  )
  .subscribe();
```

## 🎯 Cas d'usage

### Exemple 1 : Formulaire RIB

```javascript
{
  name: 'Formulaire RIB',
  fields: [
    { id: 'iban', label: 'IBAN', type: 'text', required: true },
    { id: 'bic', label: 'BIC', type: 'text', required: true },
    { id: 'rib_file', label: 'RIB (PDF)', type: 'file', required: true }
  ],
  project_ids: ['ACC', 'Centrale']
}
```

### Exemple 2 : Documents identité

```javascript
{
  name: 'Documents d\'identité',
  fields: [
    { id: 'id_type', label: 'Type de document', type: 'text', required: true },
    { id: 'id_number', label: 'Numéro', type: 'text', required: true },
    { id: 'id_file', label: 'Document (PDF/Image)', type: 'file', required: true },
    { id: 'proof_address', label: 'Justificatif de domicile', type: 'file', required: true }
  ],
  project_ids: ['Centrale', 'Investissement']
}
```

### Exemple 3 : Questionnaire technique

```javascript
{
  name: 'Questionnaire technique',
  fields: [
    { id: 'surface', label: 'Surface disponible (m²)', type: 'number', required: true },
    { id: 'orientation', label: 'Orientation du toit', type: 'text', required: true },
    { id: 'inclinaison', label: 'Inclinaison (degrés)', type: 'number', required: false },
    { id: 'photos', label: 'Photos du site', type: 'file', required: true }
  ],
  project_ids: ['Autonomie']
}
```

## 📁 Fichiers concernés

### Backend (Supabase)
- ✅ `/supabase/schema.sql` - Tables `forms` et `client_form_panels`
- ✅ RLS policies configurées

### Frontend (à migrer)
- ⏳ `src/services/formService.js` - Service API pour les formulaires
- ⏳ `src/pages/admin/ProfilePage.jsx` - Gestion des formulaires (ligne 2158)
- ⏳ `src/components/client/ClientFormPanel.jsx` - Affichage côté client
- ⏳ `src/components/ProjectDetails.jsx` - Envoi de formulaires via chat (ligne 356)

## 🚀 Prochaines étapes

1. ✅ Schéma Supabase créé avec tables `forms` et `client_form_panels`
2. ✅ RLS policies configurées
3. ⏳ Créer `src/services/formService.js` avec CRUD complet
4. ⏳ Migrer `FormEditor` dans ProfilePage vers Supabase
5. ⏳ Migrer `ClientFormPanel` vers Supabase
6. ⏳ Implémenter real-time subscriptions pour notifications
7. ⏳ Migrer le système d'envoi de formulaires via chat

---

**✅ Le système de gestion dynamique des formulaires est maintenant correctement intégré dans le schéma Supabase !**
