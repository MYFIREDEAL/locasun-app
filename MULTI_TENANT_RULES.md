# 🔒 RÈGLES MULTI-TENANT - EVATIME

## ⚠️ RÈGLE D'OR

**TOUTE requête Supabase DOIT filtrer par `organization_id`**

Exception : `platform_admin` (role spécial avec `organization_id = NULL`)

---

## ✅ PATTERN CORRECT

### **1. Utiliser les hooks (TOUJOURS préféré)**

```javascript
import { useSupabaseProspects } from '@/hooks/useSupabaseProspects';

function MyComponent() {
  const { activeAdminUser } = useAppContext();
  
  // ✅ Hook gère automatiquement organization_id
  const { prospects, loading } = useSupabaseProspects({ activeAdminUser });
}
```

### **2. Si requête directe nécessaire (rare)**

```javascript
const { activeAdminUser } = useAppContext();

// 🚨 VALIDATION OBLIGATOIRE
if (!activeAdminUser?.organization_id) {
  throw new Error('organization_id manquant');
}

// 🔒 FILTRAGE OBLIGATOIRE
const { data } = await supabase
  .from('prospects')
  .select('*')
  .eq('organization_id', activeAdminUser.organization_id);  // ⬅️ CRITIQUE
```

---

## ❌ ANTI-PATTERNS (INTERDITS)

```javascript
// ❌ DANGER - Pas de filtre organization
const { data } = await supabase.from('prospects').select('*');

// ❌ DANGER - Pas de validation
const { data } = await supabase
  .from('prospects')
  .select('*')
  .eq('organization_id', activeAdminUser.organization_id);  // Peut être undefined !

// ❌ DANGER - Service role key en frontend
const supabase = createClient(url, SERVICE_ROLE_KEY);  // Bypass RLS
```

---

## 🛡️ PROTECTION EN COUCHES

### **Couche 1 : RLS Policies (Backend)**
- ✅ Actif sur toutes les tables
- Bloque même si code frontend oublié
- Fichier : `supabase/schema.sql`

### **Couche 2 : Hooks (Frontend)**
- ✅ Abstraction qui force le filtre
- Fichiers : `src/hooks/useSupabase*.js`
- Pattern : Toujours passer `activeAdminUser`

### **Couche 3 : Validation (Code)**
- ⚠️ À faire systématiquement
- `if (!organization_id) throw Error`

---

## 📋 CHECKLIST AVANT COMMIT

```
☐ activeAdminUser passé en paramètre du hook/fonction
☐ organization_id validé (if check ou RLS policy)
☐ .eq('organization_id', ...) présent dans TOUTES les requêtes
☐ Hook utilisé au lieu de requête directe (si possible)
☐ Testé avec 2 organisations différentes
☐ Console ne montre pas de données cross-org
```

---

## 🚨 EN CAS DE DOUTE

**Posez-vous ces 3 questions :**

1. Est-ce que cette requête peut retourner des données d'une autre org ?
2. Est-ce que RLS bloque si j'oublie le filtre ?
3. Est-ce que j'ai testé avec 2 orgs différentes ?

**Si 1 seule réponse = NON → NE PAS MERGER**

---

## 🎯 HOOKS EXISTANTS (À UTILISER)

Tous ces hooks gèrent déjà `organization_id` :

- ✅ `useSupabaseProspects` - Prospects/Clients
- ✅ `useSupabaseAgenda` - Rendez-vous/Appels/Tâches
- ✅ `useSupabaseUsers` - Liste utilisateurs de l'org
- ✅ `useSupabaseProjectStepsStatus` - Étapes de projets
- ✅ `useSupabaseProjectNotes` - Notes de projets
- ✅ `useSupabaseProjectHistory` - Historique projets
- ✅ `useSupabaseNotifications` - Notifications admin
- ✅ `useSupabaseClientNotifications` - Notifications client
- ✅ `useSupabaseClientFormPanels` - Formulaires clients
- ✅ `useSupabaseGlobalPipeline` - Configuration pipeline
- ✅ `useSupabaseCompanySettings` - Paramètres entreprise
- ✅ `useSupabaseProjectTemplates` - Templates de projets
- ✅ `useSupabaseForms` - Formulaires dynamiques
- ✅ `useSupabasePrompts` - Prompts Charly AI

**Si vous créez un nouveau hook → Suivre le même pattern !**

---

## 🔍 EXEMPLE COMPLET

```javascript
// src/hooks/useSupabaseMyNewFeature.js

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Hook pour gérer [MA_FEATURE]
 * @param {Object} params
 * @param {Object} params.activeAdminUser - ⚠️ REQUIS pour filtrage multi-tenant
 */
export function useSupabaseMyNewFeature({ activeAdminUser }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 🚨 VALIDATION ORGANIZATION_ID
    if (!activeAdminUser?.organization_id) {
      console.error('❌ [useSupabaseMyNewFeature] organization_id manquant');
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      // 🔒 FILTRAGE PAR ORGANIZATION
      const { data: result, error } = await supabase
        .from('my_table')
        .select('*')
        .eq('organization_id', activeAdminUser.organization_id);  // ⬅️ OBLIGATOIRE

      if (error) {
        console.error('[useSupabaseMyNewFeature] Error:', error);
      } else {
        setData(result || []);
      }
      setLoading(false);
    };

    fetchData();
  }, [activeAdminUser?.organization_id]);

  return { data, loading };
}
```

---

## 🎓 FORMATION ÉQUIPE

Avant de coder une nouvelle feature :
1. ✅ Lire ce document
2. ✅ Regarder un hook existant comme exemple
3. ✅ Vérifier que RLS policy existe sur la table
4. ✅ Tester avec 2 orgs différentes

---

## 📞 CONTACT

En cas de doute sur l'isolation multi-tenant :
- Consulter `supabase/schema.sql` (RLS policies)
- Consulter `supabase/AUTH_LOGIC.md` (Architecture auth)
- Demander review avant merge

---

**🔒 LA SÉCURITÉ MULTI-TENANT N'EST PAS OPTIONNELLE !**
