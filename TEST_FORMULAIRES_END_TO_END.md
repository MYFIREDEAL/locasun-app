# 🧪 TEST END-TO-END : Formulaires Admin → Client

## ✅ PRÉREQUIS
1. ✔ Hook `useSupabaseClientFormPanels.js` mis à jour avec `createFormPanel`
2. ✔ `App.jsx` utilise le hook Supabase (plus de React state)
3. ✔ Table `client_form_panels` existe dans Supabase
4. ✔ RLS policies configurées
5. ✔ Realtime activé sur la table

---

## 🧪 TEST 1 : Vérification Supabase (SQL Editor)

### Étape 1 : Vérifier la table
```sql
SELECT * FROM client_form_panels LIMIT 10;
```
**Résultat attendu** : Table existe (0 lignes si nouveau)

### Étape 2 : Vérifier RLS
```sql
SELECT policyname, cmd FROM pg_policies 
WHERE tablename = 'client_form_panels';
```
**Résultat attendu** :
- `admin_all_client_form_panels` → ALL
- `client_select_own_form_panels` → SELECT
- `client_update_own_form_panels` → UPDATE

### Étape 3 : Vérifier Realtime
```sql
SELECT tablename FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename = 'client_form_panels';
```
**Résultat attendu** : 1 ligne avec `client_form_panels`

---

## 🧪 TEST 2 : Envoi formulaire côté Admin

### Étape 1 : Se connecter en tant qu'Admin (Jack)
- URL : `https://your-app.vercel.app/admin/pipeline`
- Email : `jack@yopmail.com`
- Mot de passe : `your-password`

### Étape 2 : Ouvrir un prospect (ex: Georges)
- Cliquer sur la carte "Georges" dans le pipeline
- Sélectionner projet "ACC" (ou autre)

### Étape 3 : Envoyer un formulaire via chat
- Cliquer sur l'icône "Charly AI" (robot)
- Choisir une étape qui déclenche un formulaire
- Exemple : "Étape 2 - Documents" avec action `show_form`

### Étape 4 : Vérifier Console F12
Ouvrir Console navigateur, chercher :
```
➕ [createFormPanel] Création formulaire: {prospectId, projectType, formId, ...}
✅ [createFormPanel] Formulaire créé avec succès
```

### Étape 5 : Vérifier Supabase (SQL Editor)
```sql
SELECT * FROM client_form_panels 
WHERE prospect_id = (SELECT id FROM prospects WHERE email = 'georges@yopmail.com')
ORDER BY created_at DESC
LIMIT 5;
```
**Résultat attendu** : 1 ligne avec `form_id`, `status='pending'`

---

## 🧪 TEST 3 : Affichage côté Client

### Étape 1 : Se connecter en tant que Client (Georges)
- Ouvrir un **nouvel onglet** ou **navigation privée**
- URL : `https://your-app.vercel.app/dashboard`
- Email : `georges@yopmail.com`
- Mot de passe : `your-password`

### Étape 2 : Vérifier Console F12 (côté client)
Chercher dans la console :
```
📋 [useSupabaseClientFormPanels] Raw data from Supabase: [{...}]
📋 [useSupabaseClientFormPanels] Transformed: [{prospectId, formId, ...}]
🔔 Real-time client_form_panels: {eventType: 'INSERT', ...}
```

### Étape 3 : Vérifier interface client
- **Panneau latéral** : Voir "Formulaires à compléter (1)"
- **Chat** : Voir message avec formulaire interactif
- **Projet sélectionné** : ACC (ou autre)

### Étape 4 : Remplir le formulaire
- Cliquer sur le formulaire dans le panneau
- Remplir les champs
- Cliquer "Soumettre"

### Étape 5 : Vérifier soumission (SQL)
```sql
SELECT status, updated_at FROM client_form_panels 
WHERE prospect_id = (SELECT id FROM prospects WHERE email = 'georges@yopmail.com')
ORDER BY created_at DESC
LIMIT 1;
```
**Résultat attendu** : `status = 'completed'`, `updated_at` récent

---

## 🧪 TEST 4 : Real-time Admin ↔ Client

### Scénario 1 : Admin envoie → Client voit instantanément
1. **Admin** : Garder onglet ouvert sur prospect Georges
2. **Client** : Garder onglet ouvert sur dashboard ACC
3. **Admin** : Envoyer un nouveau formulaire via Charly AI
4. **Client** : **SANS RAFRAÎCHIR**, vérifier si formulaire apparaît
5. ✅ **Résultat attendu** : Formulaire apparaît en 1-2 secondes

### Scénario 2 : Client soumet → Admin voit instantanément
1. **Client** : Remplir et soumettre formulaire
2. **Admin** : Vérifier notification (🔔 en haut)
3. **Admin** : Cliquer sur notification
4. ✅ **Résultat attendu** : Données formulaire affichées côté admin

---

## 🧪 TEST 5 : Persistance (après refresh)

### Étape 1 : Client voit formulaire
- Formulaire dans panneau "Formulaires à compléter"

### Étape 2 : Rafraîchir page F5
- Recharger la page client

### Étape 3 : Vérifier formulaire toujours là
- ✅ **Résultat attendu** : Formulaire toujours visible
- ❌ **Si disparu** : Problème de chargement Supabase

---

## 🧪 TEST 6 : Multi-projets

### Étape 1 : Admin envoie formulaires sur plusieurs projets
- Formulaire pour projet "ACC"
- Formulaire pour projet "Centrale"
- Formulaire pour projet "Autonomie"

### Étape 2 : Client bascule entre projets
- Sélectionner projet "ACC" → Voir formulaires ACC uniquement
- Sélectionner projet "Centrale" → Voir formulaires Centrale uniquement
- Sélectionner projet "Autonomie" → Voir formulaires Autonomie uniquement

### Étape 3 : Vérifier filtrage (SQL)
```sql
SELECT project_type, COUNT(*) as count
FROM client_form_panels 
WHERE prospect_id = (SELECT id FROM prospects WHERE email = 'georges@yopmail.com')
GROUP BY project_type;
```
**Résultat attendu** : Plusieurs lignes (ACC: 1, Centrale: 1, etc.)

---

## 🚨 DÉPANNAGE

### ❌ Formulaire n'apparaît pas côté client

**Check 1 : Vérifier données Supabase**
```sql
SELECT * FROM client_form_panels WHERE prospect_id = 'xxx';
```
Si 0 lignes → Problème INSERT côté admin

**Check 2 : Vérifier RLS policies**
```sql
SELECT * FROM client_form_panels; -- En tant qu'admin
```
Si erreur "permission denied" → Problème RLS

**Check 3 : Vérifier Realtime**
- Console F12 côté client
- Chercher `🔔 Real-time client_form_panels`
- Si absent → Realtime pas activé

**Check 4 : Vérifier user_id du client**
```sql
SELECT id, user_id, email FROM prospects WHERE email = 'georges@yopmail.com';
```
Si `user_id` est NULL → Client pas lié à auth.users

---

### ❌ Formulaire apparaît mais ne se soumet pas

**Check 1 : Vérifier policy UPDATE**
```sql
SELECT policyname FROM pg_policies 
WHERE tablename = 'client_form_panels' 
AND cmd = 'UPDATE';
```
Doit contenir `client_update_own_form_panels`

**Check 2 : Console F12 côté client**
Chercher erreurs lors de la soumission

---

### ❌ Real-time ne fonctionne pas

**Fix 1 : Redémarrer publication Realtime**
```sql
ALTER PUBLICATION supabase_realtime DROP TABLE client_form_panels;
-- Attendre 3 secondes
ALTER PUBLICATION supabase_realtime ADD TABLE client_form_panels;
```

**Fix 2 : Vérifier connexion WebSocket**
Console F12 → Network → WS → Chercher `realtime`

---

## ✅ CRITÈRES DE SUCCÈS

- [ ] Table `client_form_panels` existe dans Supabase
- [ ] RLS policies configurées (admin ALL, client SELECT/UPDATE)
- [ ] Realtime activé sur la table
- [ ] Admin peut envoyer formulaire via Charly AI
- [ ] Formulaire apparaît dans Supabase (SQL query)
- [ ] Client voit formulaire dans panneau latéral
- [ ] Client voit formulaire dans chat
- [ ] Client peut remplir et soumettre formulaire
- [ ] Admin reçoit notification de soumission
- [ ] Real-time fonctionne (pas besoin de refresh)
- [ ] Formulaire persiste après F5
- [ ] Filtrage par projet fonctionne

---

## 📊 RÉSULTAT ATTENDU

```
✅ Admin envoie formulaire → INSERT dans Supabase
✅ Client reçoit event Realtime → Formulaire apparaît instantanément
✅ Client remplit formulaire → UPDATE dans Supabase
✅ Admin reçoit notification → Affiche données formulaire
✅ Refresh page → Données toujours là
✅ Multi-projets → Filtrage correct
```

---

**Si tous les tests passent** : 🎉 Migration réussie !  
**Si un test échoue** : Voir section DÉPANNAGE ci-dessus.
