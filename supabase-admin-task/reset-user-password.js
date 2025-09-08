import { createClient } from '@supabase/supabase-js'

// Replace these with your real values:
const SUPABASE_URL = 'https://pliswiceskoebzcxbgwt.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsaXN3aWNlc2tvZWJ6Y3hiZ3d0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDkxOTA1MiwiZXhwIjoyMDcwNDk1MDUyfQ.UZ_-tuqmAY-TuXSe8hd3kJWi2ZvIxsohEyiz42pITVs'
const USER_ID = '550005c6-8ca4-4427-b1bf-52c0699df7cd'

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

async function main() {
  const { data, error } = await supabaseAdmin.auth.admin.updateUserById(USER_ID, {
    password: 'mhjwnfl01'
  })

  if (error) {
    console.error('Failed to update password:', error)
  } else {
    console.log('✅ Password updated successfully for user:', data)
  }
}

main()
