import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://zhsawdcayttclypfdjqr.supabase.co'
const supabaseAnonKey = 'sb_publishable_leIFGfTwe3YIVgM63w28NQ_EocdYZp4'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)