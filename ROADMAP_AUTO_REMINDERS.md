# 🗺️ ROADMAP SYSTÈME DE RELANCES AUTOMATIQUES

**Date de création** : 31 janvier 2026  
**Projet** : EVATIME  
**Feature** : Relances automatiques formulaires clients

---

## 📊 ÉTAT ACTUEL — Version 1.0

### ✅ DÉPLOYÉ ET OPÉRATIONNEL

| Composant | Status | Détail |
|-----------|--------|--------|
| **Base de données** | ✅ PROD | 6 colonnes reminder dans `client_form_panels` |
| **Edge Function** | ✅ PROD | `auto-form-reminders` déployée |
| **Cron automatique** | ✅ PROD | Toutes les heures (`0 * * * *`) |
| **Hook frontend** | ✅ PROD | `useFormReminderWatcher` actif |
| **Intégration V2** | ✅ PROD | Config sauvegardée automatiquement |
| **Messages** | ⚠️ **FIXE** | Texte hardcodé identique pour toutes relances |

---

## 🎯 CE QUI FONCTIONNE

### ✅ Workflow complet
1. Admin configure relances (délai, seuil) dans Workflow V2 Config
2. Admin envoie formulaire au client
3. Config sauvegardée automatiquement dans DB
4. Cron détecte formulaires en attente
5. Edge Function envoie relance à J+X
6. Compteur incrémenté
7. Au seuil → tâche créée pour commercial
8. Relances bloquées (`task_created = true`)

### ✅ Message actuel (V1.0)
```
🔔 **Rappel automatique**

Vous n'avez pas encore complété le formulaire **{Nom du formulaire}**.

Merci de le remplir dès que possible pour que nous puissions avancer sur votre projet.
```

**Caractéristiques** :
- ❌ Identique pour 1ère, 2ème, 3ème relance
- ❌ Pas de nom du client
- ❌ Pas de contexte projet
- ✅ Fonctionnel et non intrusif

---

## 🚀 ROADMAP — Versions futures

### 📅 Version 2.0 — Intégration IA Charly (FUTUR)

**Prérequis** : Charly (IA) doit être en ligne sur EVATIME

**Modifications à apporter** :

#### 1. Edge Function
**Fichier** : `supabase/functions/auto-form-reminders/index.ts`

**Changement** :
```typescript
// AVANT (V1.0 - actuel)
async function sendReminderMessage(supabase, prospectId, projectType, formName, panelId) {
  const message = {
    content: `🔔 **Rappel automatique**\n\nVous n'avez pas encore complété le formulaire **${formName}**...`
  };
  await supabase.from('chat_messages').insert(message);
}

// APRÈS (V2.0 - futur)
async function sendReminderMessage(supabase, prospectId, projectType, formName, panelId, reminderCount) {
  // 1. Récupérer nom du client
  const { data: prospect } = await supabase
    .from('prospects')
    .select('name')
    .eq('id', prospectId)
    .single();

  // 2. Appeler IA pour générer message contextuel
  const aiMessage = await generateAIReminderMessage({
    prospectName: prospect.name,
    formName,
    reminderCount,
    projectType
  });

  // 3. Envoyer le message généré par l'IA
  await supabase.from('chat_messages').insert({
    content: aiMessage,
    prospect_id: prospectId,
    // ...
  });
}

async function generateAIReminderMessage(context) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `Tu es Charly, l'assistant IA d'EVATIME. Tu relances poliment les clients qui n'ont pas complété leurs formulaires. Ton ton est professionnel mais chaleureux.`
        },
        {
          role: 'user',
          content: `Génère un message de relance pour ${context.prospectName} concernant le formulaire "${context.formName}". C'est la ${context.reminderCount}ème relance. Projet: ${context.projectType}.`
        }
      ]
    })
  });

  const data = await response.json();
  return data.choices[0].message.content;
}
```

#### 2. Variables d'environnement Supabase
**À ajouter** :
```bash
OPENAI_API_KEY=sk-...
```

#### 3. Exemples messages V2.0

**1ère relance** :
```
Bonjour M. Dupont,

J'espère que vous allez bien ! 

Je me permets de vous rappeler que nous avons besoin de vos informations bancaires pour finaliser votre dossier solaire.

Pourriez-vous prendre 5 minutes pour compléter le formulaire ? 

Merci et belle journée !

Charly - EVATIME
```

**2ème relance** :
```
Bonjour M. Dupont,

Petit rappel concernant le formulaire d'informations bancaires.

Je comprends que vous êtes peut-être occupé. Si vous avez besoin d'aide, n'hésitez pas !

À très vite,
Charly
```

**3ème relance** :
```
Bonjour M. Dupont,

C'est toujours Charly d'EVATIME.

Je constate que le formulaire n'est toujours pas complété. Mon collègue commercial va vous recontacter pour vous accompagner.

Cordialement,
Charly
```

---

## 📋 TÂCHES FUTURES (V2.0)

- [ ] Vérifier que Charly IA est déployé et opérationnel
- [ ] Ajouter `OPENAI_API_KEY` dans Supabase secrets
- [ ] Modifier `sendReminderMessage()` dans Edge Function
- [ ] Créer fonction `generateAIReminderMessage()`
- [ ] Tester génération messages 1ère/2ème/3ème relance
- [ ] Comparer coûts API OpenAI (estimation)
- [ ] Déployer nouvelle version Edge Function
- [ ] Tester en production avec 1 prospect test
- [ ] Valider qualité des messages générés
- [ ] Déployer en production complète

---

## 💰 ESTIMATION COÛTS IA (V2.0)

**Hypothèses** :
- 100 relances/jour
- Modèle GPT-4
- ~200 tokens par relance

**Coût estimé** :
- GPT-4 : ~0.03$ par 1K tokens
- 200 tokens × 100 relances = 20K tokens/jour
- **~0.60$/jour = ~18$/mois**

**Alternative moins chère** :
- GPT-3.5-turbo : ~0.002$ par 1K tokens
- **~0.04$/jour = ~1.20$/mois**

---

## 🎯 CRITÈRES DE PASSAGE V1 → V2

**Conditions requises** :
1. ✅ Charly IA déployé sur EVATIME
2. ✅ Budget validé pour API OpenAI
3. ✅ Tests qualité messages satisfaisants
4. ✅ Validation PO (Jack)

**Date estimée** : À déterminer (dépend du déploiement Charly)

---

## 📞 CONTACT POUR V2.0

**Quand prêt à passer en V2.0** :
1. Dis-moi "Active l'IA pour les relances"
2. Je modifie l'Edge Function
3. Je teste
4. Je déploie

**Temps estimé V2.0** : ~30 minutes de développement + tests

---

**Status actuel** : ✅ **V1.0 EN PRODUCTION (messages fixes)**  
**Prochaine étape** : Attendre déploiement Charly IA sur EVATIME
