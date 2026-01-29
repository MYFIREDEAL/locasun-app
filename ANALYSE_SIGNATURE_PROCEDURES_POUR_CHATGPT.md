# 🔍 Analyse demandée : Colonnes manquantes dans `signature_procedures`

## Contexte
On développe **Workflow V2** pour Locasun. Quand on exécute une action de type `SIGNATURE`, on obtient cette erreur :

```
Could not find the 'form_data' column of 'signature_procedures' in the schema cache
```

## Code qui échoue (`executeActionOrderV2.js` lignes 341-362)
```javascript
const { data: procedure, error: procedureError } = await supabase
  .from('signature_procedures')
  .insert({
    prospect_id: prospectId,
    project_type: projectType || 'general',
    template_id: templateIds?.[0] || null,      // ❓ existe ?
    status: 'pending',
    signer_name: signerName,                     // ❓ existe ?
    signer_email: signerEmail,                   // ❓ existe ?
    signature_type: signatureType || 'yousign',  // ❓ existe ?
    message: message || 'Document à signer',     // ❓ existe ?
    form_data: formData,                         // ❌ N'EXISTE PAS
    metadata: {                                  // ❓ existe ?
      source: 'workflow-v2',
      orderId: order.id,
      ...
    },
  })
```

## Schéma documenté (`supabase/SIGNATURE_WORKFLOW.md`)
```sql
CREATE TABLE signature_procedures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prospect_id UUID NOT NULL REFERENCES prospects(id),
  project_type TEXT NOT NULL,
  file_id UUID NOT NULL REFERENCES project_files(id),
  signed_file_id UUID REFERENCES project_files(id),
  status TEXT DEFAULT 'pending',
  signers JSONB,
  access_token TEXT,
  access_token_expires_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,
  document_hash TEXT,
  signature_metadata JSONB DEFAULT '{}',
  locked BOOLEAN DEFAULT false,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

## Migration proposée (`add_v2_columns_to_signature_procedures.sql`)
```sql
ALTER TABLE public.signature_procedures
ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES public.signature_templates(id);

ALTER TABLE public.signature_procedures
ADD COLUMN IF NOT EXISTS form_data JSONB DEFAULT '{}';

ALTER TABLE public.signature_procedures
ADD COLUMN IF NOT EXISTS signer_name TEXT;

ALTER TABLE public.signature_procedures
ADD COLUMN IF NOT EXISTS signer_email TEXT;

ALTER TABLE public.signature_procedures
ADD COLUMN IF NOT EXISTS signature_type TEXT DEFAULT 'internal';

ALTER TABLE public.signature_procedures
ADD COLUMN IF NOT EXISTS message TEXT;

ALTER TABLE public.signature_procedures
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
```

---

## ❓ Questions pour ChatGPT

1. **La table `signature_templates` existe-t-elle ?** (sinon la FK va échouer)

2. **Les colonnes proposées sont-elles cohérentes** avec le schéma existant ? (pas de conflit avec `signers`, `signature_metadata`, etc.)

3. **Faut-il modifier le code JS** pour utiliser les colonnes existantes au lieu d'en créer de nouvelles ? (ex: `signers` au lieu de `signer_name/signer_email`)

4. **Y a-t-il des colonnes déjà présentes** qu'on n'a pas vues dans la doc ?

5. **La colonne `file_id` est NOT NULL** dans le schéma - or le code V2 ne la renseigne pas. Faut-il la rendre nullable ou générer un fichier ?

---

## 📋 Requête SQL pour vérifier l'état actuel

Exécute ceci dans Supabase SQL Editor pour voir les colonnes actuelles :

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'signature_procedures'
ORDER BY ordinal_position;
```

Et pour vérifier si `signature_templates` existe :

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'signature_templates';
```
