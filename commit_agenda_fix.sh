#!/bin/bash

# Script de commit pour les corrections Agenda du 19/11/2025

echo "🔧 Commit des corrections Agenda - Filtre utilisateur"
echo ""

cd "/Users/jackluc/Desktop/LOCASUN  SUPABASE"

# Vérifier les changements
git status

echo ""
echo "📝 Résumé des corrections :"
echo "  - Modal 'Ajouter activité' : userOptions (ligne 1056)"
echo "  - Modal 'Ajouter activité' : Affichage nom (ligne 1325)"
echo "  - Header Agenda : Dropdown filtre (ligne 1466)"
echo "  - useEffect : Validation selectedUserId (ligne 1474)"
echo ""

# Commit
git add src/pages/admin/Agenda.jsx
git commit -m "fix: use user_id instead of id in Agenda filters

- Modal add activity: userOptions now uses user.user_id
- Modal add activity: Display user name with user.user_id
- Header filter: userOptions dropdown uses user.user_id
- useEffect validation: Check with user.user_id

Impact:
- User filter now correctly filters appointments/calls/tasks
- Add activity modal assigns correct user_id to activities
- Consistent with Contacts module fix

Fixes same issue as in ProspectDetailsAdmin and CompleteOriginalContacts"

echo ""
echo "✅ Commit créé ! Push avec : git push origin main"
