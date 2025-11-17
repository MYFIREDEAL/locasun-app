/**
 * Script de migration des messages chat de localStorage vers Supabase
 * 
 * IMPORTANT: À exécuter dans la console du navigateur (F12) sur la page d'administration
 * 
 * Ce script:
 * 1. Récupère tous les messages chat depuis localStorage (format: chat_${prospectId}_${projectType})
 * 2. Les transforme au format Supabase
 * 3. Les insère dans la table chat_messages
 * 4. Sauvegarde une copie de backup dans localStorage
 * 
 * AVANT D'EXÉCUTER:
 * - Assurez-vous d'avoir exécuté enable_realtime_chat_messages.sql dans Supabase
 * - Vérifiez que les RLS policies sont correctes
 * - Faites une sauvegarde complète du localStorage
 */

import { supabase } from './src/lib/supabase';

async function migrateChatMessagesToSupabase() {
  console.log('🚀 Début de la migration des messages chat vers Supabase...');

  // 1. Récupérer les messages depuis localStorage
  const chatMessagesRaw = localStorage.getItem('evatime_chat_messages');
  
  if (!chatMessagesRaw) {
    console.log('ℹ️ Aucun message chat trouvé dans localStorage');
    return { success: true, migrated: 0 };
  }

  // Sauvegarder avant migration
  const backupKey = `evatime_chat_messages_backup_${Date.now()}`;
  localStorage.setItem(backupKey, chatMessagesRaw);
  console.log(`💾 Backup créé: ${backupKey}`);

  const chatMessages = JSON.parse(chatMessagesRaw);
  const allMessages = [];

  // 2. Transformer les messages au format Supabase
  Object.entries(chatMessages).forEach(([key, messages]) => {
    // Extraire prospectId et projectType depuis la clé (format: chat_${prospectId}_${projectType})
    const match = key.match(/^chat_([^_]+)_(.+)$/);
    if (!match) {
      console.warn(`⚠️ Clé invalide ignorée: ${key}`);
      return;
    }

    const [, prospectId, projectType] = match;

    messages.forEach(msg => {
      allMessages.push({
        prospect_id: prospectId,
        project_type: projectType,
        sender: msg.sender || 'admin', // Default à 'admin' si non spécifié
        text: msg.text || null,
        file: msg.file || null,
        form_id: msg.formId || null,
        completed_form_id: msg.completedFormId || null,
        prompt_id: msg.promptId || null,
        step_index: msg.stepIndex !== undefined ? msg.stepIndex : null,
        related_message_timestamp: msg.relatedMessageTimestamp || null,
        read: msg.read !== undefined ? msg.read : false,
        created_at: msg.timestamp || new Date().toISOString(),
      });
    });
  });

  console.log(`📊 ${allMessages.length} messages à migrer`);

  if (allMessages.length === 0) {
    console.log('ℹ️ Aucun message à migrer');
    return { success: true, migrated: 0 };
  }

  // 3. Insérer les messages par lots de 100 (limite Supabase)
  const batchSize = 100;
  let migratedCount = 0;
  let errorCount = 0;

  for (let i = 0; i < allMessages.length; i += batchSize) {
    const batch = allMessages.slice(i, i + batchSize);
    
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert(batch)
        .select();

      if (error) throw error;

      migratedCount += data.length;
      console.log(`✅ Lot ${Math.floor(i / batchSize) + 1}: ${data.length} messages migrés`);
    } catch (err) {
      console.error(`❌ Erreur lors de la migration du lot ${Math.floor(i / batchSize) + 1}:`, err);
      errorCount += batch.length;
      
      // Continuer malgré les erreurs
      continue;
    }
  }

  // 4. Résumé de la migration
  console.log('\n📈 Résumé de la migration:');
  console.log(`   ✅ Migrés: ${migratedCount} messages`);
  console.log(`   ❌ Erreurs: ${errorCount} messages`);
  console.log(`   💾 Backup: ${backupKey}`);

  if (migratedCount > 0) {
    console.log('\n⚠️  IMPORTANT: Vérifiez que les messages apparaissent correctement dans l\'application');
    console.log('   Si tout fonctionne, vous pouvez supprimer evatime_chat_messages de localStorage');
    console.log('   Commande: localStorage.removeItem("evatime_chat_messages")');
  }

  return {
    success: errorCount === 0,
    migrated: migratedCount,
    errors: errorCount,
    backup: backupKey,
  };
}

// Exécuter la migration
migrateChatMessagesToSupabase()
  .then(result => {
    console.log('\n🎉 Migration terminée!', result);
  })
  .catch(err => {
    console.error('\n💥 Erreur fatale lors de la migration:', err);
  });

// Export pour utilisation via import
export { migrateChatMessagesToSupabase };
