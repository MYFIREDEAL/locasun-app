# 🧹 NETTOYAGE useSupabaseProspects.js - DÉTAILS COMPLETS

**Date**: 18 novembre 2025  
**Fichier**: `src/hooks/useSupabaseProspects.js`  
**Suppressions**: 18 console.log()  
**Conservés**: 10 console.error + 1 console.warn

---

## ❌ SUPPRESSION #1 (Ligne 14)

**AVANT** :
```javascript
export const useSupabaseProspects = (activeAdminUser) => {
  const [prospects, setProspects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  console.log('🔧 useSupabaseProspects - activeAdminUser:', activeAdminUser?.name || 'UNDEFINED');

  // Charger les prospects depuis Supabase
  const fetchProspects = async () => {
    try {
      console.log('📊 Starting fetchProspects...');
```

**APRÈS** :
```javascript
export const useSupabaseProspects = (activeAdminUser) => {
  const [prospects, setProspects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Charger les prospects depuis Supabase
  const fetchProspects = async () => {
    try {
      setLoading(true);
```

✅ **SAFE** : Simple log de debug, aucune logique.

---

## ❌ SUPPRESSION #2 (Ligne 19)

**AVANT** :
```javascript
  const fetchProspects = async () => {
    try {
      console.log('📊 Starting fetchProspects...');
      setLoading(true);
      
      // Vérifier la session Supabase
```

**APRÈS** :
```javascript
  const fetchProspects = async () => {
    try {
      setLoading(true);
      
      // Vérifier la session Supabase
```

✅ **SAFE** : Simple log de debug.

---

## ❌ SUPPRESSION #3 (Ligne 24)

**AVANT** :
```javascript
      setLoading(true);
      
      // Vérifier la session Supabase
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log('🔐 Safari - Session check:', session ? 'OK' : 'NO SESSION', sessionError);
      
      const { data, error: fetchError } = await supabase
        .from('prospects')
        .select('*')
```

**APRÈS** :
```javascript
      setLoading(true);
      
      // Vérifier la session Supabase
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      const { data, error: fetchError } = await supabase
        .from('prospects')
        .select('*')
```

✅ **SAFE** : Log de debug Safari, les variables `session` et `sessionError` sont toujours déclarées.

---

## ❌ SUPPRESSION #4 (Ligne 31)

**AVANT** :
```javascript
      const { data, error: fetchError } = await supabase
        .from('prospects')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('📊 Prospects fetched:', data?.length || 0, 'prospects');
      if (fetchError) {
        console.error('❌ Fetch error:', fetchError);
        throw fetchError;
      }
```

**APRÈS** :
```javascript
      const { data, error: fetchError } = await supabase
        .from('prospects')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('❌ Fetch error:', fetchError);
        throw fetchError;
      }
```

✅ **SAFE** : Log de comptage, `console.error` conservé pour les erreurs.

---

## ❌ SUPPRESSION #5 + #6 (Lignes 73, 75)

**AVANT** :
```javascript
  // Charger au montage et quand l'utilisateur change
  useEffect(() => {
    console.log('🔄 useEffect fetchProspects - activeAdminUser:', activeAdminUser?.name);
    if (activeAdminUser) {
      console.log('✅ Calling fetchProspects...');
      fetchProspects();
    } else {
      console.warn('⚠️ No activeAdminUser, skipping fetchProspects');
      setLoading(false);
    }
  }, [activeAdminUser?.id]);
```

**APRÈS** :
```javascript
  // Charger au montage et quand l'utilisateur change
  useEffect(() => {
    if (activeAdminUser) {
      fetchProspects();
    } else {
      console.warn('⚠️ No activeAdminUser, skipping fetchProspects');
      setLoading(false);
    }
  }, [activeAdminUser?.id]);
```

✅ **SAFE** : Logs de debug, `console.warn` conservé (important), logique intacte.

---

## ❌ SUPPRESSION #7 (Ligne 87)

**AVANT** :
```javascript
  // 🔥 REAL-TIME : Écouter les changements en temps réel
  useEffect(() => {
    if (!activeAdminUser) return;

    console.log('🔥 Setting up real-time subscription for prospects...');

    const channel = supabase
      .channel(`prospects-changes-${Math.random().toString(36).slice(2)}`)
      .on(
```

**APRÈS** :
```javascript
  // 🔥 REAL-TIME : Écouter les changements en temps réel
  useEffect(() => {
    if (!activeAdminUser) return;

    const channel = supabase
      .channel(`prospects-changes-${Math.random().toString(36).slice(2)}`)
      .on(
```

✅ **SAFE** : Log de debug, souscription real-time intacte.

---

## ❌ SUPPRESSION #8 (Ligne 99)

**AVANT** :
```javascript
        },
        (payload) => {
          console.log('🔥 Real-time change detected:', payload);

          if (payload.eventType === 'INSERT') {
            // Nouveau prospect ajouté
            const newProspect = {
```

**APRÈS** :
```javascript
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            // Nouveau prospect ajouté
            const newProspect = {
```

✅ **SAFE** : Log de debug, handlers INSERT/UPDATE/DELETE intacts.

---

## ❌ SUPPRESSION #9 (Ligne 127)

**AVANT** :
```javascript
            });
          } else if (payload.eventType === 'UPDATE') {
            // Prospect modifié
            console.log('📝 Updating prospect:', payload.new.id, payload.new.name);
            const updatedProspect = {
              id: payload.new.id,
              name: payload.new.name,
```

**APRÈS** :
```javascript
            });
          } else if (payload.eventType === 'UPDATE') {
            // Prospect modifié
            const updatedProspect = {
              id: payload.new.id,
              name: payload.new.name,
```

✅ **SAFE** : Log de debug, transformation de données intacte.

---

## ❌ SUPPRESSION #10 (Ligne 146) - ⚠️ MODIFICATION STRUCTURE

**AVANT** :
```javascript
              updatedAt: payload.new.updated_at,
            };
            setProspects(prev => {
              const newProspects = prev.map(p => p.id === payload.new.id ? updatedProspect : p);
              console.log('✅ Prospects updated, new count:', newProspects.length);
              return newProspects;
            });
          } else if (payload.eventType === 'DELETE') {
```

**APRÈS** :
```javascript
              updatedAt: payload.new.updated_at,
            };
            setProspects(prev => prev.map(p => p.id === payload.new.id ? updatedProspect : p));
          } else if (payload.eventType === 'DELETE') {
```

✅ **SAFE** : Variable intermédiaire `newProspects` supprimée (servait uniquement pour le log), **logique identique** (arrow function retourne directement le `.map()`).

---

## ❌ SUPPRESSION #11 + #12 (Lignes 160, 165)

**AVANT** :
```javascript
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Prospects subscription status:', status);
      });

    // Cleanup : se désabonner quand le composant unmount
    return () => {
      console.log('🔌 Unsubscribing from prospects real-time...');
      supabase.removeChannel(channel);
    };
  }, [activeAdminUser?.id]);
```

**APRÈS** :
```javascript
          }
        }
      )
      .subscribe();

    // Cleanup : se désabonner quand le composant unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeAdminUser?.id]);
```

✅ **SAFE** : `.subscribe()` sans callback (status inutilisé), cleanup `removeChannel` intact.

---

## ❌ SUPPRESSION #13 + #14 (Lignes 176, 189) - DEBUG dupliqués

**AVANT** :
```javascript
    try {
      // Récupérer l'UUID réel du user depuis Supabase
      const { data: { user } } = await supabase.auth.getUser();
      
      console.log('🔍 DEBUG auth.getUser():', { user_id: user?.id, email: user?.email });
      
      if (!user) {
        throw new Error("Utilisateur non authentifié");
      }

      // Récupérer l'ID du user dans public.users
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('user_id', user.id)
        .single();

      console.log('🔍 DEBUG userData query:', { userData, userError, searching_for: user.id });

      if (userError || !userData) {
```

**APRÈS** :
```javascript
    try {
      // Récupérer l'UUID réel du user depuis Supabase
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("Utilisateur non authentifié");
      }

      // Récupérer l'ID du user dans public.users
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (userError || !userData) {
```

✅ **SAFE** : Logs DEBUG dupliqués (exposition d'emails/UUIDs), logique de vérification intacte.

---

## ❌ SUPPRESSION #15 (Ligne 195)

**AVANT** :
```javascript
      if (userError || !userData) {
        throw new Error("Impossible de récupérer les informations utilisateur");
      }

      console.log('👤 Assignation du prospect à:', userData.id);

      const { data, error: insertError } = await supabase
        .from('prospects')
        .insert([{
```

**APRÈS** :
```javascript
      if (userError || !userData) {
        throw new Error("Impossible de récupérer les informations utilisateur");
      }

      const { data, error: insertError } = await supabase
        .from('prospects')
        .insert([{
```

✅ **SAFE** : Log de debug, insertion Supabase intacte.

---

## ❌ SUPPRESSION #16 (Ligne 235)

**AVANT** :
```javascript
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      // Ne pas ajouter localement, laisser le real-time s'en charger
      console.log('Prospect created in DB, waiting for real-time sync...');

      // ENVOYER UN EMAIL D'INVITATION AU PROSPECT
      try {
        console.log('📧 Envoi invitation prospect:', data.email);
```

**APRÈS** :
```javascript
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      // Ne pas ajouter localement, laisser le real-time s'en charger

      // ENVOYER UN EMAIL D'INVITATION AU PROSPECT
      try {
```

✅ **SAFE** : Logs de debug supprimés, logique email intacte.

---

## ❌ SUPPRESSION #17 (Ligne 239)

**AVANT** :
```javascript
      // Ne pas ajouter localement, laisser le real-time s'en charger

      // ENVOYER UN EMAIL D'INVITATION AU PROSPECT
      try {
        console.log('📧 Envoi invitation prospect:', data.email);
        
        // STRATÉGIE : 
        // 1. Créer un user temporaire dans auth.users avec un mot de passe aléatoire
```

**APRÈS** :
```javascript
      // Ne pas ajouter localement, laisser le real-time s'en charger

      // ENVOYER UN EMAIL D'INVITATION AU PROSPECT
      try {
        // STRATÉGIE : 
        // 1. Créer un user temporaire dans auth.users avec un mot de passe aléatoire
```

✅ **SAFE** : Log de debug email.

---

## ❌ SUPPRESSION #18 (Ligne 264)

**AVANT** :
```javascript
        if (signUpError) {
          console.error('❌ Erreur création auth user:', signUpError);
          
          // Si l'user existe déjà, envoyer juste un reset password
          if (signUpError.message.includes('already registered')) {
            console.log('User existe déjà, envoi reset password...');
            
            const redirectUrl = import.meta.env.DEV 
              ? `${window.location.origin}/reset-password`
```

**APRÈS** :
```javascript
        if (signUpError) {
          console.error('❌ Erreur création auth user:', signUpError);
          
          // Si l'user existe déjà, envoyer juste un reset password
          if (signUpError.message.includes('already registered')) {
            const redirectUrl = import.meta.env.DEV 
              ? `${window.location.origin}/reset-password`
```

✅ **SAFE** : Log de debug, `console.error` conservé.

---

## ❌ SUPPRESSION #19 (Ligne 278)

**AVANT** :
```javascript
            const { error: resetError } = await supabase.auth.resetPasswordForEmail(data.email, {
              redirectTo: redirectUrl,
            });
            
            if (resetError) {
              throw resetError;
            }
            
            console.log('✅ Email de réinitialisation envoyé');
            toast({
              title: "Prospect créé",
```

**APRÈS** :
```javascript
            const { error: resetError } = await supabase.auth.resetPasswordForEmail(data.email, {
              redirectTo: redirectUrl,
            });
            
            if (resetError) {
              throw resetError;
            }
            
            toast({
              title: "Prospect créé",
```

✅ **SAFE** : Log de succès, toast conservé (utilisateur voit le feedback).

---

## ❌ SUPPRESSION #20 (Ligne 288)

**AVANT** :
```javascript
          } else {
            throw signUpError;
          }
        } else {
          console.log('✅ User auth créé:', authData.user?.id);
          
          // Lier immédiatement le user_id au prospect
          const { error: updateError } = await supabase
```

**APRÈS** :
```javascript
          } else {
            throw signUpError;
          }
        } else {
          // Lier immédiatement le user_id au prospect
          const { error: updateError } = await supabase
```

✅ **SAFE** : Log de succès supprimé.

---

## ❌ SUPPRESSION #21 (Ligne 313)

**AVANT** :
```javascript
          const { error: resetError } = await supabase.auth.resetPasswordForEmail(data.email, {
            redirectTo: redirectUrl,
          });
          
          if (resetError) {
            console.error('⚠️ Erreur envoi email:', resetError);
          }
          
          console.log('✅ Email d\'activation envoyé');
          toast({
            title: "Succès",
```

**APRÈS** :
```javascript
          const { error: resetError } = await supabase.auth.resetPasswordForEmail(data.email, {
            redirectTo: redirectUrl,
          });
          
          if (resetError) {
            console.error('⚠️ Erreur envoi email:', resetError);
          }
          
          toast({
            title: "Succès",
```

✅ **SAFE** : Log de succès supprimé, `console.error` conservé, toast conservé.

---

## ❌ SUPPRESSION #22 (Ligne 376)

**AVANT** :
```javascript
      const { data, error: updateError } = await supabase
        .from('prospects')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      // ✅ Ne pas mettre à jour localement, laisser le real-time s'en charger
      // Le real-time va recevoir l'événement UPDATE et mettre à jour automatiquement
      console.log('✅ Prospect updated in DB, waiting for real-time sync...');

      return data;
    } catch (err) {
      console.error('Erreur update prospect:', err);
```

**APRÈS** :
```javascript
      const { data, error: updateError } = await supabase
        .from('prospects')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      // ✅ Ne pas mettre à jour localement, laisser le real-time s'en charger
      // Le real-time va recevoir l'événement UPDATE et mettre à jour automatiquement

      return data;
    } catch (err) {
      console.error('Erreur update prospect:', err);
```

✅ **SAFE** : Log de debug supprimé, `return data` intact, `console.error` conservé.

---

## 📊 RÉSUMÉ FINAL

### ✅ Suppressions (22 console.log)
| # | Type | Ligne | Description |
|---|------|-------|-------------|
| 1 | Debug | 14 | activeAdminUser name |
| 2 | Debug | 19 | Starting fetchProspects |
| 3 | Debug | 24 | Safari session check |
| 4 | Debug | 31 | Prospects count |
| 5-6 | Debug | 73, 75 | useEffect logs |
| 7 | Debug | 87 | Real-time setup |
| 8 | Debug | 99 | Real-time change |
| 9 | Debug | 127 | Updating prospect |
| 10 | Debug | 146 | Prospects updated count |
| 11-12 | Debug | 160, 165 | Subscription status/cleanup |
| 13-14 | Debug | 176, 189 | DEBUG auth/userData (dupliqués) |
| 15 | Debug | 195 | Assignation prospect |
| 16-17 | Debug | 235, 239 | Prospect created/email |
| 18 | Debug | 264 | User existe déjà |
| 19-21 | Success | 278, 288, 313 | Email envoyé/User créé |
| 22 | Debug | 376 | Prospect updated |

### ✅ Conservés (11 lignes)
- **10x console.error** : Tous les catch blocks
- **1x console.warn** : No activeAdminUser warning

### ⚠️ Modification structure
- **Ligne 146** : Simplification arrow function (variable intermédiaire supprimée)

---

## 🎯 VALIDATION FINALE

### ✅ Checklist complète
- [x] Aucune logique métier modifiée
- [x] Real-time subscription intacte
- [x] Error handling intact (tous les console.error conservés)
- [x] Warning important conservé
- [x] Toasts conservés (feedback utilisateur)
- [x] Return statements intacts
- [x] useEffect dependencies intactes
- [x] Cleanup functions intactes
- [x] Try/catch blocks intacts

### 🚀 Prêt pour commit !

Le fichier est **100% sûr** et prêt à être commité. Tous les console.log de debug ont été supprimés, la gestion d'erreurs est intacte, et la logique métier n'a pas été touchée.
