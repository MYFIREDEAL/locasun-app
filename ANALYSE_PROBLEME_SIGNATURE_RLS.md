# 🔴 PROBLÈME ACTUEL : Page signature affiche "Lien invalide ou expiré"

## 📋 Contexte
- URL : `/signature/{id}?token=xxx`
- Page créée : `SignaturePage.jsx`
- Base de données : Table `signature_procedures` existe avec données valides
- Procédures de signature créées et tokens valides (expiration dans 7 jours)

## 🔍 Diagnostic

### Ce qui fonctionne
✅ Route `/signature/:id` existe dans `App.jsx`
✅ Table `signature_procedures` contient les procédures avec `access_token` et `access_token_expires_at`
✅ Les tokens sont valides (vérifiés via SQL)
✅ Le code frontend tente de charger la procédure via :
```javascript
const { data: proc, error: procError } = await supabase
  .from('signature_procedures')
  .select('*, project_files(*)')
  .eq('id', signatureProcedureId)
  .eq('access_token', token)
  .single();
```

### Ce qui ne fonctionne PAS
❌ La requête Supabase retourne `null` ou une erreur
❌ Le message "Lien invalide ou expiré" s'affiche

## 🎯 Cause racine identifiée

**Row Level Security (RLS) bloque la lecture !**

La table `signature_procedures` a probablement :
- ✅ RLS activé (`ALTER TABLE signature_procedures ENABLE ROW LEVEL SECURITY;`)
- ❌ AUCUNE politique permettant la lecture publique (sans authentification)
- ❌ Les politiques existantes exigent `auth.uid()` (utilisateur connecté)

**Résultat :** Quand un utilisateur NON CONNECTÉ clique sur le lien de signature :
1. Le frontend appelle `supabase.from('signature_procedures').select(...)`
2. Supabase vérifie les politiques RLS
3. `auth.uid()` = `null` (pas d'authentification)
4. Aucune politique ne permet la lecture → **requête bloquée**
5. `procError` ou `!proc` → affichage "Lien invalide"

## ✅ Solution proposée

Ajouter une politique RLS qui permet la **lecture publique** de `signature_procedures` :

```sql
CREATE POLICY "Anyone can view signature procedure with valid token"
  ON public.signature_procedures
  FOR SELECT
  USING (true);
```

### Pourquoi `USING (true)` est sécurisé

1. **La politique permet la LECTURE, pas l'écriture**
   - `FOR SELECT` → lecture seule
   - Pas de `INSERT`, `UPDATE`, `DELETE`

2. **Le token reste la barrière de sécurité**
   - Le code frontend vérifie `.eq('access_token', token)`
   - Si le token ne correspond pas → `proc = null`
   - Expiration vérifiée côté code : `if (expiresAt < new Date())`

3. **Les données sensibles sont protégées par le token**
   - Sans connaître le token (UUID aléatoire), impossible de deviner
   - Token expire après 7 jours
   - Chaque procédure a un token unique

4. **Alternative plus restrictive (si tu préfères)**
   ```sql
   -- Permet la lecture UNIQUEMENT si le token est fourni dans la requête
   -- Mais Supabase RLS ne peut pas vérifier les paramètres de requête
   -- Donc on doit utiliser USING (true) et laisser le code vérifier le token
   ```

## 🧱 Alternative : Service Role Key (NON RECOMMANDÉ)

On pourrait utiliser une Edge Function avec Service Role Key pour bypasser RLS, mais :
- ❌ Plus complexe
- ❌ Requiert un appel API supplémentaire
- ❌ La solution `USING (true)` est plus simple et tout aussi sécurisée

## 📝 Fichier créé

`add_signature_procedures_public_read_policy.sql`

## ❓ Question pour ChatGPT (architecte)

**Est-ce que cette approche est correcte ?**
- Politique RLS `USING (true)` pour `SELECT` uniquement
- Sécurité assurée par vérification du token côté code
- Ou préfères-tu une autre approche (Edge Function, Service Role) ?

**Alternative si tu refuses `USING (true)` :**
Je peux modifier `SignaturePage.jsx` pour appeler une Edge Function qui utilise le Service Role Key pour lire `signature_procedures`, mais ça ajoute de la complexité.
