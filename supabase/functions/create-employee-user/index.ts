import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    // Create Supabase client with service role key for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Verify the requesting user is an admin
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    
    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    // Check if user is admin
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'super_admin')
      .single()

    if (!roleData) {
      throw new Error('Unauthorized: Admin access required')
    }

    // Parse request body
    const { email, password, full_name } = await req.json()

    if (!email || !password || !full_name) {
      throw new Error('Missing required fields: email, password, full_name')
    }

    // Normalize email (trim and lowercase)
    const normalizedEmail = email.trim().toLowerCase()
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(normalizedEmail)) {
      throw new Error('Invalid email address format')
    }

    // Check if user already exists
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    if (!listError && existingUsers?.users) {
      const userExists = existingUsers.users.some(u => u.email?.toLowerCase() === normalizedEmail)
      if (userExists) {
        throw new Error('An account with this email already exists')
      }
    }

    // Create user with admin API (no email confirmation)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true, // Auto-confirm email, no confirmation email sent
      user_metadata: {
        full_name: full_name.trim(),
      },
    })

    if (authError) {
      // Provide better error messages
      const errorMessage = authError.message || ''
      if (errorMessage.includes('already registered') || 
          errorMessage.includes('already exists') ||
          errorMessage.includes('User already registered')) {
        throw new Error('An account with this email already exists')
      }
      if (errorMessage.includes('invalid') && errorMessage.includes('email')) {
        throw new Error('An account with this email already exists')
      }
      throw authError
    }

    if (!authData.user) {
      throw new Error('Failed to create user')
    }

    return new Response(
      JSON.stringify({ 
        user: authData.user,
        message: 'User created successfully without email confirmation'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})

