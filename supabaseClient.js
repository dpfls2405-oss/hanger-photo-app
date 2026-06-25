import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://icacwoylqfhqnmoaiehv.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImljYWN3b3lscWZocW5tb2FpZWh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NTY5ODQsImV4cCI6MjA4OTQzMjk4NH0.2BXbe0tTGworzJliY1gjiQn1XuRk--qOZAjpyqxzF38'

export const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: 'hanger' }
})
export const STORAGE_URL = `${supabaseUrl}/storage/v1/object/public/hanger-photos`
