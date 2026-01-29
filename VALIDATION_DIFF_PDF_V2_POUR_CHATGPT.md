# ✅ VALIDATION DIFF — Génération PDF V2 via V1

## Contexte
V2 doit générer un PDF réel (pas un placeholder) pour les signatures.
On réutilise la fonction V1 existante `executeContractSignatureAction`.

---

## 1️⃣ Import exact

**Fichier:** `src/lib/executeActionOrderV2.js` (ligne 25)

```javascript
import { executeContractSignatureAction } from '@/lib/contractPdfGenerator';
```

✅ Fonction V1 existante dans `src/lib/contractPdfGenerator.js`
✅ Pas de duplication

---

## 2️⃣ Appel dans executeActionOrderV2.js

### Code AVANT (placeholder - SUPPRIMÉ)
```javascript
// ❌ SUPPRIMÉ - Plus d'insert manuel project_files
const { data: placeholderFile } = await supabase
  .from('project_files')
  .insert({
    prospect_id: prospectId,
    file_name: `signature_pending_${Date.now()}.pdf`,
    file_size: 0,  // VIDE
    storage_path: `signatures/${prospectId}/${Date.now()}_pending.pdf`,
    // ...
  })
```

### Code APRÈS (appel V1)
```javascript
// Ligne 375-398
const templateId = templateIds?.[0] || null;

if (!templateId) {
  // Fallback: placeholder si pas de template sélectionné
  logV2('⚠️ Aucun template sélectionné, création placeholder uniquement');
  const { data: placeholderFile } = await supabase
    .from('project_files')
    .insert({ /* placeholder */ })
    .select('id')
    .single();
  var fileId = placeholderFile.id;
} else {
  // ✅ GÉNÉRATION PDF VIA V1
  logV2('📝 Génération PDF via V1', { templateId, formDataKeys: Object.keys(formData) });
  
  const pdfResult = await executeContractSignatureAction({
    templateId,                             // ✅ ID template (depuis config V2)
    projectType: projectType || 'general',  // ✅ projectType
    prospectId,                             // ✅ prospectId
    formData,                               // ✅ formData (passé une seule fois)
    organizationId: prospect.organization_id, // ✅ organization_id (RLS)
  });
  
  if (!pdfResult.success) {
    return { success: false, error: pdfResult.error };
  }
  
  var fileId = pdfResult.fileData.id;  // ✅ file_id retourné par V1
  logV2('✅ PDF généré via V1', { fileId });
}
```

---

## 3️⃣ Retour utilisé dans signature_procedures

```javascript
// Ligne 402-418
const { data: procedure } = await supabase
  .from('signature_procedures')
  .insert({
    prospect_id: prospectId,
    project_type: projectType || 'general',
    file_id: fileId,  // ✅ file_id du PDF généré (ou placeholder)
    status: 'pending',
    signers: [        // ✅ JSONB existant
      {
        name: signerName,
        email: signerEmail,
        role: 'signer',
        status: 'pending',
      }
    ],
    form_data: formData,
    signature_metadata: { source: 'workflow-v2', ... },
    organization_id: prospect.organization_id,
  })
```

---

## Checklist de validation

| Critère | Status |
|---------|--------|
| ❌ Plus d'insert manuel `project_files` (sauf fallback) | ✅ OK |
| ✅ `file_id` vient uniquement de la fonction V1 | ✅ OK |
| ✅ `form_data` passé une seule fois | ✅ OK |
| ✅ `signers` = JSONB existant (pas de nouvelles colonnes) | ✅ OK |
| ❌ Aucune nouvelle lib PDF | ✅ OK |
| ❌ Aucune logique template dans V2 | ✅ OK |

---

## Fonction V1 réutilisée

**Fichier:** `src/lib/contractPdfGenerator.js`
**Fonction:** `executeContractSignatureAction`
**Lignes:** 378-442

### Ce qu'elle fait:
1. Charge le template depuis `contract_templates`
2. Charge le prospect depuis `prospects`
3. Injecte `formData` dans le template HTML
4. Génère le PDF (html2canvas + jsPDF)
5. Upload dans Supabase Storage (`project-files` bucket)
6. Crée l'entrée dans `project_files`
7. Retourne `{ success: true, fileData: { id, ... } }`

---

## Question pour validation

**Est-ce que ce branchement V2→V1 est correct ?**

- V2 orchestre (décide quand lancer la signature)
- V1 produit (génère le PDF avec la logique existante)
- Pas de duplication de code
- Pas de nouvelle lib
- Respect du schéma Supabase existant

**GO / NO GO ?**
