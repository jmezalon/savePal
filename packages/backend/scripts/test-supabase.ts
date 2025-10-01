import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://tsrmstkpcwmszmranzhw.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';

console.log('🔧 Testing Supabase connection...');
console.log('URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    // Try to query an existing Supabase table (this will fail if no tables exist, but connection works)
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);

    if (error) {
      // If error is about table not existing, connection works!
      if (error.message.includes('does not exist') || error.message.includes('relation')) {
        console.log('✅ Connection successful!');
        console.log('⚠️  Tables do not exist yet. Need to run SQL to create them.');
        console.log('\n📝 Next step: Run the SQL from create-tables.sql in Supabase SQL Editor');
        return true;
      }
      console.error('❌ Connection error:', error.message);
      return false;
    }

    console.log('✅ Connection successful!');
    console.log('✅ Tables exist!');
    console.log('User count query result:', data);
    return true;
  } catch (err) {
    console.error('❌ Connection failed:', err);
    return false;
  }
}

testConnection().then(success => {
  process.exit(success ? 0 : 1);
});
