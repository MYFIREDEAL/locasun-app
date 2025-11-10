# 📅 Système de Report de Rendez-vous (Drag & Drop)

## 🎯 Vue d'ensemble

Le système de rendez-vous supporte le **report par drag & drop** avec :
- ✅ Marquage automatique du RDV original comme "reporté"
- ✅ Création d'un nouveau RDV à la nouvelle date
- ✅ Lien de traçabilité entre RDV original et nouveau RDV
- ✅ Historique complet des reports

---

## 📊 Structure de la Table `appointments`

### Colonnes clés

```sql
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  contact_id UUID REFERENCES prospects(id),
  assigned_user_id UUID NOT NULL REFERENCES users(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled', 'reporte')),
  rescheduled_from_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  -- autres colonnes...
);
```

### Statuts disponibles

| Statut | Description | Couleur UI | Activités en retard |
|--------|-------------|------------|---------------------|
| `pending` | À venir (non qualifié) | Bleu | ✅ Oui (si date passée) |
| `effectue` | Effectué (qualifié) | Vert | ❌ Non |
| `annule` | Annulé | Rouge | ❌ Non |
| `reporte` | Reporté (nouveau RDV créé) | Jaune | ❌ Non |

**Note importante** : Un RDV apparaît dans **"Activités en retard"** (sidebar agenda) si :
- `status = 'pending'` (non qualifié)
- `end_time < maintenant` (date passée)

Cela permet au commercial de voir tous les RDV passés qui n'ont pas été qualifiés.

---

## 🔄 Workflow de Report (Drag & Drop)

### Étape 1 : Utilisateur fait un drag & drop

```
RDV original : Lundi 10h → Drag vers Mardi 14h
```

### Étape 2 : Système marque l'original comme "reporté"

```javascript
// 1. Récupérer le RDV original
const originalAppointment = await supabase
  .from('appointments')
  .select('*')
  .eq('id', appointmentId)
  .single();

// 2. Marquer comme reporté
await supabase
  .from('appointments')
  .update({ status: 'reporte' })
  .eq('id', appointmentId);
```

### Étape 3 : Créer le nouveau RDV avec lien vers l'original

```javascript
// 3. Créer le nouveau RDV
const { data: newAppointment } = await supabase
  .from('appointments')
  .insert({
    title: originalAppointment.title,
    start_time: newStartTime, // Mardi 14h
    end_time: newEndTime,
    contact_id: originalAppointment.contact_id,
    assigned_user_id: originalAppointment.assigned_user_id,
    project_id: originalAppointment.project_id,
    step: originalAppointment.step,
    status: 'pending', // Nouveau RDV actif
    rescheduled_from_id: appointmentId, // 🔗 Lien vers l'original !
    share: originalAppointment.share,
    notes: originalAppointment.notes,
    location: originalAppointment.location
  })
  .select()
  .single();
```

### Résultat

```
Base de données :
┌────────────────────────────────────────────────────────────┐
│ RDV A (ID: uuid-123)                                       │
│ - Date: Lundi 10h                                          │
│ - Status: 'reporte' ⚠️                                     │
│ - rescheduled_from_id: NULL                                │
└────────────────────────────────────────────────────────────┘
              ↓ lien de traçabilité
┌────────────────────────────────────────────────────────────┐
│ RDV B (ID: uuid-456)                                       │
│ - Date: Mardi 14h                                          │
│ - Status: 'pending' ✅                                      │
│ - rescheduled_from_id: uuid-123 (pointe vers RDV A)       │
└────────────────────────────────────────────────────────────┘
```

---

## 📜 Historique des Reports (Chaîne)

Si un RDV est reporté **plusieurs fois**, la chaîne est préservée :

```
RDV A (Lundi 10h)     → status='reporte', rescheduled_from_id=NULL
   ↓
RDV B (Mardi 14h)     → status='reporte', rescheduled_from_id=uuid-A
   ↓
RDV C (Mercredi 16h)  → status='pending', rescheduled_from_id=uuid-B
```

### Requête : Retrouver l'historique complet

```sql
-- Récupérer tous les RDV de la chaîne (récursif)
WITH RECURSIVE appointment_history AS (
  -- RDV actuel
  SELECT 
    id, 
    title, 
    start_time, 
    status, 
    rescheduled_from_id,
    0 AS depth
  FROM appointments
  WHERE id = 'uuid-C'
  
  UNION ALL
  
  -- RDV précédents (remontée dans l'historique)
  SELECT 
    a.id, 
    a.title, 
    a.start_time, 
    a.status, 
    a.rescheduled_from_id,
    ah.depth + 1
  FROM appointments a
  INNER JOIN appointment_history ah ON a.id = ah.rescheduled_from_id
)
SELECT * FROM appointment_history
ORDER BY depth DESC;
```

**Résultat** :
```
| depth | id     | title       | start_time       | status    |
|-------|--------|-------------|------------------|-----------|
| 2     | uuid-A | RDV Client  | Lundi 10h        | reporte   |
| 1     | uuid-B | RDV Client  | Mardi 14h        | reporte   |
| 0     | uuid-C | RDV Client  | Mercredi 16h     | pending   |
```

---

## 🎨 Interface Utilisateur (Agenda)

### Affichage du badge "Reporté"

```jsx
{appointment.status === 'reporte' && (
  <Badge className="bg-yellow-400 text-black">
    Reporté
  </Badge>
)}
```

### Gestion du drag & drop

```jsx
const handleDrop = async (e, newDay, newHour) => {
  const dragData = JSON.parse(e.dataTransfer.getData('application/json'));
  const originalAppointment = appointments.find(a => a.id === dragData.appointmentId);
  
  // 1. Marquer l'original comme reporté
  await supabase
    .from('appointments')
    .update({ status: 'reporte' })
    .eq('id', originalAppointment.id);
  
  // 2. Créer le nouveau RDV
  const newStart = set(newDay, { 
    hours: parseInt(newHour), 
    minutes: 0 
  });
  const newEnd = add(newStart, { 
    hours: dragData.duration 
  });
  
  await supabase
    .from('appointments')
    .insert({
      ...originalAppointment,
      id: undefined, // Nouveau UUID généré
      start_time: newStart,
      end_time: newEnd,
      status: 'pending',
      rescheduled_from_id: originalAppointment.id, // 🔗 Lien !
    });
  
  toast.success("RDV replanifié avec succès !");
};
```

---

## 🔍 Cas d'Usage

### 1. Voir tous les RDV reportés d'un commercial

```javascript
const { data: reportedAppointments } = await supabase
  .from('appointments')
  .select('*')
  .eq('assigned_user_id', userId)
  .eq('status', 'reporte')
  .order('start_time', { ascending: false });
```

### 2. Trouver le RDV actif à partir d'un RDV reporté

```javascript
// RDV reporté : uuid-A
const { data: newAppointment } = await supabase
  .from('appointments')
  .select('*')
  .eq('rescheduled_from_id', 'uuid-A')
  .order('created_at', { ascending: false })
  .limit(1)
  .single();
```

### 3. Annuler un RDV actif et ses anciens reports

```javascript
// Annuler le RDV actif
await supabase
  .from('appointments')
  .update({ status: 'cancelled' })
  .eq('id', activeAppointmentId);

// Optionnel : Annuler aussi tous les RDV de la chaîne
const { data: history } = await supabase
  .from('appointments')
  .select('id')
  .eq('rescheduled_from_id', activeAppointmentId);

if (history.length > 0) {
  await supabase
    .from('appointments')
    .update({ status: 'cancelled' })
    .in('id', history.map(h => h.id));
}
```

---

## ⚠️ Bonnes Pratiques

### ✅ À FAIRE

- Toujours créer un **nouveau RDV** lors d'un report (ne pas modifier l'existant)
- Toujours remplir `rescheduled_from_id` pour maintenir la traçabilité
- Afficher un badge "Reporté" sur les anciens RDV dans l'agenda
- Permettre de voir l'historique des reports depuis l'interface

### ❌ À ÉVITER

- Ne pas simplement modifier `start_time` / `end_time` de l'existant (perte d'historique)
- Ne pas supprimer les RDV reportés (besoin de traçabilité)
- Ne pas réutiliser le même ID pour le nouveau RDV

---

## 📊 Statistiques et Reporting

### Taux de reports par commercial

```sql
SELECT 
  u.name,
  COUNT(*) FILTER (WHERE a.status = 'reporte') as reports_count,
  COUNT(*) as total_appointments,
  ROUND(
    (COUNT(*) FILTER (WHERE a.status = 'reporte')::NUMERIC / COUNT(*)) * 100, 
    2
  ) as report_rate_percent
FROM appointments a
JOIN users u ON a.assigned_user_id = u.user_id
GROUP BY u.name
ORDER BY report_rate_percent DESC;
```

### Nombre moyen de reports avant finalisation

```sql
WITH appointment_chains AS (
  SELECT 
    COALESCE(rescheduled_from_id, id) as chain_id,
    COUNT(*) as chain_length
  FROM appointments
  GROUP BY COALESCE(rescheduled_from_id, id)
)
SELECT 
  AVG(chain_length) as avg_reschedules
FROM appointment_chains;
```

---

## 🔐 Sécurité (RLS)

Les policies RLS existantes s'appliquent automatiquement :

```sql
-- Un commercial peut reporter uniquement SES propres RDV
CREATE POLICY "Users can manage their own appointments"
  ON public.appointments
  FOR ALL
  USING (assigned_user_id = auth.uid());
```

---

## 🎉 Résumé

| Feature | Status |
|---------|--------|
| Drag & drop dans l'agenda | ✅ |
| Marquage automatique "reporté" | ✅ |
| Lien de traçabilité | ✅ |
| Historique complet | ✅ |
| Badge UI "Reporté" | ✅ |
| Sécurité RLS | ✅ |
| Reports multiples (chaîne) | ✅ |

**Le système de report est 100% opérationnel !** 🚀
