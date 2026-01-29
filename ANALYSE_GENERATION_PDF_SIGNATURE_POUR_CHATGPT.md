# 🔍 Analyse demandée : Génération PDF pour Signature V2

## Contexte

On développe **Workflow V2** pour Locasun. La signature V2 fonctionne maintenant :
- ✅ Procédure signature créée dans `signature_procedures`
- ✅ Fichier placeholder créé dans `project_files`
- ✅ Lien de signature envoyé dans le chat
- ✅ Client peut cliquer sur le lien

**MAIS** : Le PDF est vide (placeholder). Le client ne peut pas signer un document vide.

## Ce qui manque

1. **Récupérer les données du formulaire** (`form_data` du prospect)
2. **Récupérer le template de signature** (sélectionné dans la config V2)
3. **Générer le PDF** en injectant les données dans le template
4. **Uploader le PDF** dans Supabase Storage
5. **Mettre à jour** `project_files.storage_path` avec le vrai chemin

## Code actuel V2 (`executeActionOrderV2.js`)

```javascript
// On crée un fichier placeholder (vide)
const { data: placeholderFile } = await supabase
  .from('project_files')
  .insert({
    prospect_id: prospectId,
    project_type: projectType,
    file_name: `signature_pending_${Date.now()}.pdf`,
    file_type: 'application/pdf',
    file_size: 0,  // ❌ VIDE
    storage_path: `signatures/${prospectId}/${Date.now()}_pending.pdf`,  // ❌ N'EXISTE PAS
    // ...
  })

// On crée la procédure de signature avec ce file_id
const { data: procedure } = await supabase
  .from('signature_procedures')
  .insert({
    file_id: placeholderFile.id,
    form_data: formData,  // ✅ Les données sont là
    // ...
  })
```

## Questions pour ChatGPT

1. **Comment V1 génère-t-il les PDFs ?** 
   - Y a-t-il une fonction/service existant de génération PDF ?
   - Quel format de template utilise-t-on ? (HTML, DOCX, PDF template ?)

2. **Où sont stockés les templates de signature ?**
   - Table `signature_templates` ?
   - Fichiers dans Supabase Storage ?

3. **Quelle lib de génération PDF ?**
   - `pdf-lib` ? `pdfmake` ? `puppeteer` ? API externe ?

4. **Faut-il générer côté client ou serveur ?**
   - Si serveur : Edge Function Supabase ?
   - Si client : Génération dans le browser ?

5. **Quel est le flow V1 complet ?**
   - Où est le code qui génère le PDF avant signature ?

---

## Recherche dans le codebase

Fichiers à analyser pour comprendre V1 :

```bash
# Chercher la génération PDF
grep -r "pdf-lib\|pdfmake\|puppeteer\|generatePdf\|createPdf" src/

# Chercher les templates de signature
grep -r "signature_templates\|signatureTemplate" src/

# Chercher le flow de signature V1
grep -r "start_signature" src/
```

---

## Objectif

Brancher la génération PDF existante (V1) dans le flow V2, pour que :
1. V2 génère un **vrai PDF** avec les données du formulaire
2. Le PDF soit uploadé dans Supabase Storage
3. Le client puisse le visualiser et le signer

**Contrainte** : Réutiliser au maximum le code V1, pas de refacto.
