/**
 * Script de test pour l'Edge Function generate-signed-pdf
 * 
 * Usage:
 * 1. Remplacer PROCEDURE_ID par un vrai ID de procédure avec status='completed'
 * 2. Remplacer les clés Supabase
 * 3. Exécuter: node test-generate-signed-pdf.js
 */

const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';

// ✅ ID d'une procédure de signature avec status='completed'
const TEST_PROCEDURE_ID = 'REMPLACER_PAR_UN_VRAI_UUID';

async function testGenerateSignedPDF() {
  console.log('🚀 Test de generate-signed-pdf');
  console.log('📋 Procedure ID:', TEST_PROCEDURE_ID);
  
  try {
    // 1. Appeler l'Edge Function
    console.log('\n[1/3] Appel Edge Function...');
    const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-signed-pdf`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        signature_procedure_id: TEST_PROCEDURE_ID,
      }),
    });

    console.log('📡 Status:', response.status, response.statusText);

    // 2. Lire la réponse
    const data = await response.json();
    console.log('\n[2/3] Réponse Edge Function:');
    console.log(JSON.stringify(data, null, 2));

    // 3. Vérifier le résultat
    if (response.ok) {
      console.log('\n✅ [3/3] SUCCÈS !');
      console.log('- signed_file_id:', data.signed_file_id);
      console.log('- file_name:', data.file_name);
      
      // Vérifier dans Supabase
      console.log('\n🔍 Vérification dans Supabase...');
      const checkResponse = await fetch(`${SUPABASE_URL}/rest/v1/signature_procedures?id=eq.${TEST_PROCEDURE_ID}&select=signed_file_id,locked`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
      });
      
      const dbData = await checkResponse.json();
      console.log('Base de données:', JSON.stringify(dbData, null, 2));
      
    } else {
      console.log('\n❌ [3/3] ERREUR !');
      console.log('Message:', data.error || 'Erreur inconnue');
    }

  } catch (error) {
    console.error('\n💥 ERREUR SCRIPT:', error.message);
    console.error(error);
  }
}

// Exécuter le test
testGenerateSignedPDF();
