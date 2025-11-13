import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://rjyvvkedhohnqqzajfdd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqeXZ2a2VkaG9obnFxemFqZmRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA5MTUxMjQsImV4cCI6MjA0NjQ5MTEyNH0.TD3yO0vXs7vQOgV_VCafP89p_o3F_PiRD_cTvzTPUQI'
);

async function checkAccessRights() {
  console.log('🔍 Checking access_rights in Supabase...\n');
  
  const { data, error } = await supabase
    .from('users')
    .select('id, first_name, last_name, access_rights')
    .in('first_name', ['Jack', 'Charly']);
  
  if (error) {
    console.error('❌ Error:', error);
    return;
  }
  
  console.log('📊 Users with access_rights:');
  data.forEach(user => {
    console.log(`\n👤 ${user.first_name} ${user.last_name} (${user.id})`);
    console.log('   access_rights:', JSON.stringify(user.access_rights, null, 2));
  });
}

checkAccessRights();
