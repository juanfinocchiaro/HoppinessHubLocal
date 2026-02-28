/**
 * reconcile-stale-shifts
 *
 * Scheduled edge function (cron: every day at 06:00 AM ART).
 * Finds employees still marked as 'working' whose shift started
 * before midnight and auto-closes them with a system-inferred clock_out.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const db = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const cutoff = new Date()
  cutoff.setHours(cutoff.getHours() - 6)

  const { data: staleStates, error } = await db
    .from('employee_time_state')
    .select('employee_id, branch_id, open_clock_in_id, open_schedule_id, last_updated')
    .eq('current_state', 'working')
    .lt('last_updated', cutoff.toISOString())

  if (error) {
    console.error('Error fetching stale states:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let closed = 0

  for (const state of staleStates ?? []) {
    let estimatedOut = new Date(state.last_updated)

    if (state.open_schedule_id) {
      const { data: sched } = await db
        .from('employee_schedules')
        .select('end_time, schedule_date')
        .eq('id', state.open_schedule_id)
        .single()

      if (sched?.end_time && sched?.schedule_date) {
        const [h, m] = sched.end_time.split(':').map(Number)
        estimatedOut = new Date(`${sched.schedule_date}T00:00:00`)
        estimatedOut.setHours(h, m, 0, 0)
        if (estimatedOut <= new Date(state.last_updated)) {
          estimatedOut.setDate(estimatedOut.getDate() + 1)
        }
      }
    } else {
      estimatedOut = new Date(state.last_updated)
      estimatedOut.setHours(23, 59, 0, 0)
      if (estimatedOut <= new Date(state.last_updated)) {
        estimatedOut.setDate(estimatedOut.getDate() + 1)
      }
    }

    // Inherit work_date from the open clock_in
    let workDate: string | null = null
    if (state.open_clock_in_id) {
      const { data: openCi } = await db
        .from('clock_entries')
        .select('work_date')
        .eq('id', state.open_clock_in_id)
        .single()
      workDate = openCi?.work_date ?? null
    }
    if (!workDate) {
      const argFmt = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Argentina/Buenos_Aires',
        year: 'numeric', month: '2-digit', day: '2-digit',
      })
      workDate = argFmt.format(new Date(state.last_updated))
    }

    const { error: insertErr } = await db.from('clock_entries').insert({
      branch_id: state.branch_id,
      user_id: state.employee_id,
      entry_type: 'clock_out',
      created_at: estimatedOut.toISOString(),
      schedule_id: state.open_schedule_id,
      resolved_type: 'system_inferred',
      anomaly_type: 'missing_clockout',
      is_manual: false,
      work_date: workDate,
    })

    if (insertErr) {
      console.error(`Failed to close shift for ${state.employee_id}:`, insertErr)
      continue
    }

    await db
      .from('employee_time_state')
      .update({
        current_state: 'off',
        open_clock_in_id: null,
        open_schedule_id: null,
        last_updated: new Date().toISOString(),
      })
      .eq('employee_id', state.employee_id)

    closed++
  }

  console.log(`Reconciled ${closed} stale shifts out of ${staleStates?.length ?? 0} found.`)

  return new Response(
    JSON.stringify({
      success: true,
      stale_found: staleStates?.length ?? 0,
      auto_closed: closed,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    },
  )
})
