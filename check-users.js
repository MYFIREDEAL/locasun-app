import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkUsers() {
  console.log('🔍 Checking users in database...\n');
  
  // Get auth user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  console.log('📧 Currently logged in as:', user?.email);
  console.log('🆔 Auth user_id:', user?.id);
  console.log('');
  
  // Get all users from public.users
  const { data: users, error } = await supabase
    .from('users')
    .select('*')
    .order('name');
    
  if (error) {
    console.error('❌ Error:', error);
    return;
  }
  
  console.log('👥 Users in public.users table:');
  users.forEach(u => {
    console.log(`\n  Name: ${u.name}`);
    console.log(`  Email: ${u.email}`);
    console.log(`  user_id: ${u.user_id}`);
    console.log(`  Role: ${u.role}`);
    console.log(`  Match current: ${u.user_id === user?.id ? '✅ YES' : '❌ NO'}`);
  });
}

checkUsers().then(() => process.exit(0));
