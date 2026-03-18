import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://vjkpinqzfqcmaqrsyobo.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqa3BpbnF6ZnFjbWFxcnN5b2JvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NzY3NDUsImV4cCI6MjA4OTM1Mjc0NX0.4LEgaj1LyeUH1a5FoAuCSM43kPseDPqJkWj2jZu8bVA'

export const supabase = createClient(supabaseUrl, supabaseKey)
export const STORAGE_URL = `${supabaseUrl}/storage/v1/object/public/hanger-photos`
