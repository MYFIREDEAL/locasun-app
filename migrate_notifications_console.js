/**
 * Script de migration des notifications localStorage → Supabase
 * À exécuter dans la console du navigateur après connexion
 * 
 * UTILISATION:
 * 1. Se connecter à l'application (admin ET client)
 * 2. Ouvrir la console DevTools (F12)
 * 3. Copier-coller ce script et appuyer sur Entrée
 * 4. Le script migrera automatiquement les notifications existantes
 */

(async function migrateNotificationsToSupabase() {
  console.log('🔄 Début de la migration des notifications...');

  try {
    // Importer le client Supabase
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
    
    // Récupérer les clés depuis window (déjà initialisé dans l'app)
    const SUPABASE_URL = import.meta.env?.VITE_SUPABASE_URL || localStorage.getItem('supabase_url');
    const SUPABASE_ANON_KEY = import.meta.env?.VITE_SUPABASE_ANON_KEY || localStorage.getItem('supabase_anon_key');
    
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.error('❌ Clés Supabase introuvables');
      return;
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Vérifier l'utilisateur connecté
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('❌ Utilisateur non connecté:', authError);
      return;
    }

    console.log('✅ Utilisateur connecté:', user.email);

    // Vérifier si c'est un admin ou un client
    const { data: adminUser } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', user.id)
      .single();

    const { data: clientUser } = await supabase
      .from('prospects')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // ========== MIGRATION NOTIFICATIONS ADMIN ==========
    if (adminUser) {
      console.log('👤 Admin détecté:', adminUser.name);
      
      const storedNotifications = localStorage.getItem('evatime_notifications');
      if (storedNotifications) {
        const notifications = JSON.parse(storedNotifications);
        console.log(`📋 ${notifications.length} notifications admin trouvées`);

        for (const notif of notifications) {
          if (!notif.read) {
            // Vérifier si notification existe déjà
            const { data: existing } = await supabase
              .from('notifications')
              .select('*')
              .eq('prospect_id', notif.prospectId)
              .eq('project_type', notif.projectType)
              .eq('read', false)
              .single();

            if (existing) {
              // Mettre à jour le count
              await supabase
                .from('notifications')
                .update({ count: existing.count + (notif.count || 1) })
                .eq('id', existing.id);
              console.log(`✅ Notification admin mise à jour: ${notif.prospectName} - ${notif.projectType}`);
            } else {
              // Créer nouvelle notification
              await supabase
                .from('notifications')
                .insert({
                  prospect_id: notif.prospectId,
                  project_type: notif.projectType,
                  prospect_name: notif.prospectName,
                  project_name: notif.projectName,
                  count: notif.count || 1,
                  read: false
                });
              console.log(`✅ Notification admin migrée: ${notif.prospectName} - ${notif.projectType}`);
            }
          }
        }

        // Archiver l'ancien localStorage
        localStorage.setItem('evatime_notifications_backup', storedNotifications);
        localStorage.removeItem('evatime_notifications');
        console.log('✅ Notifications admin migrées et localStorage nettoyé');
      } else {
        console.log('ℹ️ Aucune notification admin à migrer');
      }
    }

    // ========== MIGRATION NOTIFICATIONS CLIENT ==========
    if (clientUser) {
      console.log('👤 Client détecté:', clientUser.name);
      
      const storedClientNotifications = localStorage.getItem('evatime_client_notifications');
      if (storedClientNotifications) {
        const notifications = JSON.parse(storedClientNotifications);
        console.log(`📋 ${notifications.length} notifications client trouvées`);

        for (const notif of notifications) {
          if (!notif.read) {
            // Vérifier si notification existe déjà
            const { data: existing } = await supabase
              .from('client_notifications')
              .select('*')
              .eq('prospect_id', clientUser.id)
              .eq('project_type', notif.projectType)
              .eq('read', false)
              .single();

            if (existing) {
              // Mettre à jour le count et le message
              await supabase
                .from('client_notifications')
                .update({ 
                  count: existing.count + (notif.count || 1),
                  message: notif.message
                })
                .eq('id', existing.id);
              console.log(`✅ Notification client mise à jour: ${notif.projectType}`);
            } else {
              // Créer nouvelle notification
              await supabase
                .from('client_notifications')
                .insert({
                  prospect_id: clientUser.id,
                  project_type: notif.projectType,
                  project_name: notif.projectName,
                  message: notif.message,
                  count: notif.count || 1,
                  read: false
                });
              console.log(`✅ Notification client migrée: ${notif.projectType}`);
            }
          }
        }

        // Archiver l'ancien localStorage
        localStorage.setItem('evatime_client_notifications_backup', storedClientNotifications);
        localStorage.removeItem('evatime_client_notifications');
        console.log('✅ Notifications client migrées et localStorage nettoyé');
      } else {
        console.log('ℹ️ Aucune notification client à migrer');
      }
    }

    console.log('');
    console.log('✅ Migration terminée avec succès!');
    console.log('📋 Les notifications sont maintenant synchronisées en temps réel via Supabase');
    console.log('🗑️ Les anciennes données sont sauvegardées dans localStorage avec le suffixe _backup');

  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
  }
})();
