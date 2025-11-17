/**
 * SCRIPT À COPIER/COLLER DANS LA CONSOLE DU NAVIGATEUR (F12)
 * Sur la page admin de l'application
 */

(async function migrateChatMessages() {
  console.log('🚀 Début de la migration des messages chat...');

  // 1. Récupérer depuis localStorage
  const chatMessagesRaw = localStorage.getItem('evatime_chat_messages');
  
  if (!chatMessagesRaw) {
    console.log('ℹ️ Aucun message à migrer');
    return { success: true, migrated: 0 };
  }

  // Backup
  const backupKey = `evatime_chat_messages_backup_${Date.now()}`;
  localStorage.setItem(backupKey, chatMessagesRaw);
  console.log(`💾 Backup créé: ${backupKey}`);

  const chatMessages = JSON.parse(chatMessagesRaw);
  const allMessages = [];

  // 2. Transformer
  Object.entries(chatMessages).forEach(([key, messages]) => {
    const match = key.match(/^chat_([^_]+)_(.+)$/);
    if (!match) {
      console.warn(`⚠️ Clé invalide: ${key}`);
      return;
    }

    const [, prospectId, projectType] = match;
    messages.forEach(msg => {
      allMessages.push({
        prospect_id: prospectId,
        project_type: projectType,
        sender: msg.sender || 'admin',
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
    return { success: true, migrated: 0 };
  }

  // 3. Insérer par lots
  const batchSize = 100;
  let migratedCount = 0;
  let errorCount = 0;

  // Récupérer le client Supabase depuis window
  const supabase = window.supabase || (await import('./src/lib/supabase.js')).supabase;

  for (let i = 0; i < allMessages.length; i += batchSize) {
    const batch = allMessages.slice(i, i + batchSize);
    
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert(batch)
        .select();

      if (error) throw error;

      migratedCount += data.length;
      console.log(`✅ Lot ${Math.floor(i / batchSize) + 1}: ${data.length} messages`);
    } catch (err) {
      console.error(`❌ Erreur lot ${Math.floor(i / batchSize) + 1}:`, err);
      errorCount += batch.length;
    }
  }

  console.log('\n📈 RÉSUMÉ:');
  console.log(`   ✅ Migrés: ${migratedCount}`);
  console.log(`   ❌ Erreurs: ${errorCount}`);
  console.log(`   💾 Backup: ${backupKey}`);

  if (migratedCount > 0) {
    console.log('\n✨ Migration réussie !');
    console.log('   Vérifiez que les messages apparaissent dans l\'app');
    console.log('   Puis supprimez l\'ancien localStorage:');
    console.log('   localStorage.removeItem("evatime_chat_messages")');
  }

  return { success: errorCount === 0, migrated: migratedCount, errors: errorCount, backup: backupKey };
})();
