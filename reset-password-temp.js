// Script temporaire pour envoyer un reset password à mikedupond@yopmail.com
// À exécuter dans la console du navigateur sur localhost:5173

import { supabase } from './src/lib/supabase.js';

const email = 'mikedupond@yopmail.com';

// Envoyer un email de reset password
const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: 'http://localhost:5173/reset-password',
});

if (error) {
  console.error('❌ Erreur:', error);
} else {
  console.log('✅ Email de reset envoyé à', email);
  console.log('📧 Vérifie https://yopmail.com/?login=mikedupond');
}
