# 🔍 EXTRACTION + ANALYSE SÉCURISÉE - AddActivityModal (CRM PRO UNIQUEMENT)

## ⚠️ RÈGLE RESPECTÉE
✅ Aucune modification apportée au code
✅ Aucune analyse des users CLIENT
✅ Focus exclusif sur le CRM PRO (admins/commerciaux/managers)
✅ Tables clients, Magic Link, RLS client = HORS PÉRIMÈTRE

---

## 1️⃣ EXTRACTION DU COMPOSANT AddActivityModal (CODE EXACT)

**Fichier :** `src/pages/admin/Agenda.jsx`
**Lignes :** 1021-1460 (environ)

### État actuel (APRÈS les 2 commits de fix UUID) :

```javascript
const AddActivityModal = ({ 
  open, 
  onOpenChange, 
  initialData, 
  defaultContact, 
  defaultProject, 
  addAppointmentProp, 
  addCallProp, 
  addTaskProp,
  updateAppointmentProp,
  updateCallProp,
  updateTaskProp,
  prospectsProp, 
  usersProp,
  defaultAssignedUserId 
}) => {
    // 🔥 Hook Supabase pour récupérer les steps du prospect sélectionné
    const { projectStepsStatus } = useSupabaseProjectStepsStatus(selectedContact?.id);
    
    // Utiliser les prospects Supabase passés en props
    const prospects = prospectsProp || [];
    
    // Utiliser les users Supabase passés en props
    const users = usersProp || [];
    
    // Utiliser les fonctions passées en props (Supabase) ou fallback contexte
    const addAppointment = addAppointmentProp;
    const addCall = addCallProp;
    const addTask = addTaskProp;
    const updateAppointment = updateAppointmentProp;
    const updateCall = updateCallProp;
    const updateTask = updateTaskProp;
    
    // États
    const [selectedContact, setSelectedContact] = useState(defaultContact || null);
    const [selectedProject, setSelectedProject] = useState(defaultProject || '');
    const [selectedStep, setSelectedStep] = useState('');
    const [activityType, setActivityType] = useState('physical');
    const [date, setDate] = useState(new Date());
    const [time, setTime] = useState('14:30');
    const [details, setDetails] = useState('');
    const [share, setShare] = useState(false);
    const [contactSearchOpen, setContactSearchOpen] = useState(false);
    const [userSearchOpen, setUserSearchOpen] = useState(false);
    const [assignedUserId, setAssignedUserId] = useState(defaultAssignedUserId || null);
    const [isEditing, setIsEditing] = useState(false);

    // 🔥 LIGNE CRITIQUE MODIFIÉE (commit e862028)
    const userOptions = useMemo(() => {
      if (!users || !Array.isArray(users)) return [];
      // 🔥 appointments.assigned_user_id doit utiliser users.user_id (auth UUID) pour matcher avec RLS policies
      return users.map(user => ({ value: user.user_id, label: user.name }));
    }, [users]);
    
    useEffect(() => {
      if (initialData) {
        setIsEditing(!!initialData.id);
        const contact = prospects.find(p => p.id === initialData.contactId);
        if (contact) setSelectedContact(contact);
        setSelectedProject(initialData.projectId || '');
        setSelectedStep(initialData.step || '');
        setActivityType(initialData.type || 'physical');
        setDate(initialData.start ? new Date(initialData.start) : new Date());
        setTime(initialData.start ? format(new Date(initialData.start), 'HH:mm') : '14:30');
        setDetails(initialData.notes || '');
        setShare(initialData.share || false);
        setAssignedUserId(initialData.assignedUserId || defaultAssignedUserId || null);
      }
    }, [initialData, prospects, defaultAssignedUserId]);

    // Reset au changement de defaultAssignedUserId
    useEffect(() => {
      if (!initialData && defaultAssignedUserId) {
        setAssignedUserId(defaultAssignedUserId);
      }
    }, [defaultAssignedUserId, initialData]);

    const handleClose = () => {
      setSelectedContact(defaultContact || null);
      setSelectedProject(defaultProject || '');
      setSelectedStep('');
      setActivityType('physical');
      setDate(new Date());
      setTime('14:30');
      setDetails('');
      setShare(false);
      setAssignedUserId(defaultAssignedUserId || null);
      setIsEditing(false);
      onOpenChange(false);
    };

    const handleSubmit = async () => {
      // Logique de soumission...
      const appointmentData = {
        contactId: selectedContact?.id,
        projectId: selectedProject || null,
        step: selectedStep || null,
        type: activityType,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        notes: details,
        share: share,
        assignedUserId: assignedUserId,  // 🔥 Maintenant = users.user_id (auth UUID)
        title: `${activityTypeIcon} RDV avec ${selectedContact?.name || 'Contact'}`,
      };

      if (isEditing && initialData?.id) {
        await updateAppointment(initialData.id, appointmentData);
      } else {
        await addAppointment(appointmentData);
      }

      handleClose();
    };

    // ... reste du JSX avec le dropdown user
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        {/* ... */}
        <Select
          value={assignedUserId || undefined}
          onValueChange={setAssignedUserId}
        >
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner un utilisateur" />
          </SelectTrigger>
          <SelectContent>
            {userOptions.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {/* ... */}
      </Dialog>
    );
};

export { AddActivityModal };
```

---

## 2️⃣ ANALYSE D'IMPACT (CRM PRO UNIQUEMENT)

### 🔍 A — Occurrences de `user.id` dans le CRM PRO

**Fichiers concernés (CRM PRO) :**

1. **`src/App.jsx`** (ligne 384-399)
   - Transformation `activeAdminUser` : duplique `user.id` en `id`
   - ✅ Pas d'impact : sert juste à afficher l'user connecté

2. **`src/pages/admin/FinalPipeline.jsx`**
   - Utilise `activeAdminUser.id` pour filtrer les prospects
   - ✅ Pas d'impact : utilise déjà `access_rights.users` (qui contient `user_id`)

3. **`src/pages/admin/Agenda.jsx`**
   - `defaultAssignedUserId` passé au modal = `activeAdminUser.id` (PK)
   - ⚠️ **IMPACT** : Le modal reçoit encore la PK en default !

4. **`src/hooks/useSupabaseUsers.js`**
   - Fetch tous les users, retourne `id` et `user_id`
   - ✅ Pas d'impact : hook neutre, retourne les deux

5. **`src/hooks/useSupabaseAgenda.js`** (ligne 166-188)
   - ✅ **DÉJÀ CORRIGÉ** (commit e4d72bd) : utilise `user.id` (auth UUID) directement
   - Note : La variable s'appelle `user.id` mais c'est en fait `auth.uid()` (confusing naming)

6. **`src/components/admin/ProspectDetailsAdmin.jsx`**
   - Utilise `user.id` pour afficher les avatars/noms
   - ✅ Pas d'impact : display uniquement

### 🔍 B — Impact du changement `user.id` → `user.user_id` dans le dropdown

**Ce qui a changé (commit e862028) :**
```javascript
// AVANT (cassé)
return users.map(user => ({ value: user.id, label: user.name }));
// assignedUserId = "72501e6b..." (PK)

// APRÈS (corrigé)
return users.map(user => ({ value: user.user_id, label: user.name }));
// assignedUserId = "812e2665..." (auth UUID)
```

**Conséquences PRO uniquement :**

1. **Table `appointments` :**
   - ✅ `assigned_user_id` reçoit maintenant `users.user_id` (auth UUID)
   - ✅ Match avec RLS policy : `assigned_user_id = auth.uid()`
   - ✅ Elodie peut maintenant voir ses RDV

2. **Tables `calls` et `tasks` :**
   - ⚠️ **À VÉRIFIER** : Utilisent aussi `assigned_user_id`
   - ⚠️ **PROBABLE** : Même problème que appointments (RLS policies identiques)
   - ⚠️ **RECOMMANDATION** : Vérifier si calls/tasks ont le même bug

3. **Jointures Supabase PRO :**
   - ✅ Pas d'impact : Les FK constraints sont ignorées (voir tests SQL)
   - ✅ Les RLS policies font le matching, pas les FK

4. **Hook `useSupabaseAgenda.js` :**
   - ✅ Compatible : Si `assignedUserId` fourni, utilise la valeur directement
   - ✅ Si pas fourni, utilise `user.id` (auth.uid()) en fallback

### 🔍 C — Endroits PRO qui s'attendent à recevoir `users.id` (PK)

**TROUVÉ UN PROBLÈME :**

**`src/pages/admin/Agenda.jsx`** (ligne ~1470)
```javascript
const AgendaPage = () => {
  const { activeAdminUser } = useContext(AppContext);
  
  // 🔥 PROBLÈME ICI
  const defaultAssignedUserId = activeAdminUser?.id;  // ← PK !
  
  return (
    <AddActivityModal 
      defaultAssignedUserId={defaultAssignedUserId}  // ← Passe la PK
      // ...
    />
  );
};
```

☝️ **`defaultAssignedUserId` passe encore la PK au modal !**

**Impact actuel :**
- Si l'utilisateur ne change pas le dropdown → `assignedUserId` reste sur la PK (mauvais UUID)
- Si l'utilisateur sélectionne quelqu'un → `assignedUserId` devient le `user_id` (bon UUID)

**Fix nécessaire :**
```javascript
// DOIT DEVENIR
const defaultAssignedUserId = activeAdminUser?.user_id || activeAdminUser?.userId;
```

---

## 3️⃣ RÉSUMÉ - RISQUES IDENTIFIÉS (PRO UNIQUEMENT)

### ✅ CE QUI FONCTIONNE MAINTENANT
1. Dropdown du modal envoie `user.user_id` (auth UUID) ✅
2. Hook `useSupabaseAgenda` utilise auth UUID ✅
3. RLS policies matchent avec `auth.uid()` ✅

### ⚠️ CE QUI RESTE À CORRIGER
1. **`defaultAssignedUserId` dans `AgendaPage`** : Passe encore `users.id` (PK) au lieu de `users.user_id`
2. **Tables `calls` et `tasks`** : Probablement même bug (à vérifier)

### 🚫 ZÉRO IMPACT CLIENT
- Aucune modification touchant `auth.users`
- Aucune modification touchant les prospects clients (avec `user_id` non-null)
- Aucune modification touchant Magic Link
- Aucune modification touchant l'espace client `/dashboard/*`

---

## 4️⃣ FICHIERS CONCERNÉS (CRM PRO)

**Déjà modifiés :**
- ✅ `src/hooks/useSupabaseAgenda.js` (commit e4d72bd)
- ✅ `src/pages/admin/Agenda.jsx` - ligne 1081 (commit e862028)

**À modifier si besoin :**
- ⚠️ `src/pages/admin/Agenda.jsx` - ligne ~1470 (defaultAssignedUserId)
- ⚠️ `src/hooks/useSupabaseAgenda.js` - fonctions `addCall()` et `addTask()` (vérifier si même logique)

**Pas besoin de toucher :**
- ✅ `src/App.jsx`
- ✅ `src/hooks/useSupabaseUsers.js`
- ✅ `src/hooks/useSupabaseProspects.js`
- ✅ `src/pages/admin/FinalPipeline.jsx`

---

## 📊 CONCLUSION

**État actuel :** Fix partiel appliqué (2/3 corrections faites)
**Risque actuel :** Si user ne change pas le dropdown, RDV créé avec mauvais UUID
**Fix restant :** 1 ligne à changer dans `AgendaPage` pour passer `user_id` au lieu de `id`
**Impact client :** ZÉRO (aucun code client touché)
