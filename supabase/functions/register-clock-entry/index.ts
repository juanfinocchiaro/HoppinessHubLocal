import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MAX_SHIFT_HOURS = 14
const STALE_THRESHOLD_HOURS = 6

interface ClockEntryRequest {
  branch_code: string
  pin: string
  entry_type?: 'clock_in' | 'clock_out'
  user_agent?: string
  gps_lat?: number
  gps_lng?: number
  gps_status?: string
  gps_message?: string
  photo_base64?: string
}

interface ValidatedUser {
  user_id: string
  full_name: string
  branch_id: string
  branch_name: string
}

function jsonRes(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const db = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const body: ClockEntryRequest = await req.json()
    const { branch_code, pin, user_agent, gps_lat, gps_lng, gps_status, gps_message, photo_base64 } = body

    if (!branch_code || !pin) {
      return jsonRes({ error: 'Faltan campos requeridos: branch_code, pin' }, 400)
    }

    // --- Validate PIN ---
    const { data: validatedUsers, error: pinError } = await db.rpc('validate_clock_pin_v2', {
      _branch_code: branch_code,
      _pin: pin,
    })
    if (pinError) {
      console.error('PIN validation error:', pinError)
      return jsonRes({ error: 'Error al validar PIN' }, 500)
    }
    if (!validatedUsers?.length) {
      return jsonRes(
        { error: 'PIN incorrecto. Verificá que hayas configurado tu PIN para esta sucursal.' },
        401,
      )
    }
    const user: ValidatedUser = validatedUsers[0]

    // --- Read employee_time_state ---
    const { data: ets } = await db
      .from('employee_time_state')
      .select('current_state, last_event_id, open_clock_in_id, open_schedule_id, last_updated')
      .eq('employee_id', user.user_id)
      .maybeSingle()

    const currentState = ets?.current_state ?? 'off'
    const now = new Date()

    // --- Read branch window config ---
    const { data: branch } = await db
      .from('branches')
      .select('clock_window_before_min, clock_window_after_min')
      .eq('id', user.branch_id)
      .single()
    const beforeMin = branch?.clock_window_before_min ?? 90
    const afterMin = branch?.clock_window_after_min ?? 60

    // --- Compute Argentina local date ---
    const argFmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Argentina/Buenos_Aires',
      year: 'numeric', month: '2-digit', day: '2-digit',
    })
    const todayArgentina = argFmt.format(now)

    // --- Allow legacy callers to force entry_type (backward compat) ---
    let forceType = body.entry_type

    // --- State machine ---
    let resolvedEntryType: 'clock_in' | 'clock_out'
    let scheduleId: string | null = null
    let resolvedType: 'scheduled' | 'unscheduled' | 'system_inferred' = 'unscheduled'
    let anomalyType: string | null = null
    let autoClosedId: string | null = null

    if (currentState === 'working' && ets) {
      const openSince = new Date(ets.last_updated)
      const elapsedHours = (now.getTime() - openSince.getTime()) / (1000 * 60 * 60)
      const crossedMidnight =
        openSince.toISOString().slice(0, 10) !== now.toISOString().slice(0, 10)
      const isStale =
        (crossedMidnight && elapsedHours > STALE_THRESHOLD_HOURS) ||
        elapsedHours > MAX_SHIFT_HOURS

      if (isStale) {
        // Auto-close the stale shift
        let estimatedOut = new Date(openSince)
        if (ets.open_schedule_id) {
          const { data: sched } = await db
            .from('employee_schedules')
            .select('end_time, schedule_date')
            .eq('id', ets.open_schedule_id)
            .single()
          if (sched?.end_time && sched?.schedule_date) {
            const [h, m] = sched.end_time.split(':').map(Number)
            estimatedOut = new Date(`${sched.schedule_date}T00:00:00`)
            estimatedOut.setHours(h, m, 0, 0)
            if (estimatedOut <= openSince) {
              estimatedOut.setDate(estimatedOut.getDate() + 1)
            }
          }
        } else {
          estimatedOut = new Date(openSince)
          estimatedOut.setHours(23, 59, 0, 0)
          if (estimatedOut <= openSince) estimatedOut.setDate(estimatedOut.getDate() + 1)
        }

        // work_date for auto-close: inherit from open clock_in
        let autoCloseWorkDate = todayArgentina
        if (ets.open_clock_in_id) {
          const { data: openCi } = await db
            .from('clock_entries')
            .select('work_date')
            .eq('id', ets.open_clock_in_id)
            .single()
          if (openCi?.work_date) autoCloseWorkDate = openCi.work_date
        }

        const { data: closedEntry } = await db
          .from('clock_entries')
          .insert({
            branch_id: user.branch_id,
            user_id: user.user_id,
            entry_type: 'clock_out',
            created_at: estimatedOut.toISOString(),
            schedule_id: ets.open_schedule_id,
            resolved_type: 'system_inferred',
            anomaly_type: 'missing_clockout',
            is_manual: false,
            work_date: autoCloseWorkDate,
          })
          .select('id')
          .single()
        autoClosedId = closedEntry?.id ?? null

        resolvedEntryType = forceType ?? 'clock_in'
      } else {
        resolvedEntryType = forceType ?? 'clock_out'
      }
    } else {
      resolvedEntryType = forceType ?? 'clock_in'
    }

    // --- Find matching schedule for clock_in ---
    if (resolvedEntryType === 'clock_in') {
      const todayStr = todayArgentina
      const argParts = todayArgentina.split('-').map(Number)
      const argLocal = new Date(argParts[0], argParts[1] - 1, argParts[2])
      const nowMinutes = (() => {
        const timeFmt = new Intl.DateTimeFormat('en-GB', {
          timeZone: 'America/Argentina/Buenos_Aires',
          hour: '2-digit', minute: '2-digit', hour12: false,
        })
        const [h, m] = timeFmt.format(now).split(':').map(Number)
        return h * 60 + m
      })()

      // Search today's schedules
      const { data: todaySchedules } = await db
        .from('employee_schedules')
        .select('id, start_time, end_time, schedule_date')
        .eq('user_id', user.user_id)
        .eq('branch_id', user.branch_id)
        .eq('schedule_date', todayStr)
        .eq('is_day_off', false)
        .not('start_time', 'is', null)

      // Also search yesterday's overnight schedules
      const yesterdayDate = new Date(argLocal)
      yesterdayDate.setDate(yesterdayDate.getDate() - 1)
      const yesterdayStr = yesterdayDate.toISOString().slice(0, 10)

      const { data: yesterdaySchedules } = await db
        .from('employee_schedules')
        .select('id, start_time, end_time, schedule_date')
        .eq('user_id', user.user_id)
        .eq('branch_id', user.branch_id)
        .eq('schedule_date', yesterdayStr)
        .eq('is_day_off', false)
        .not('start_time', 'is', null)
        .not('end_time', 'is', null)

      const allSchedules = [...(todaySchedules ?? []), ...(yesterdaySchedules ?? [])]

      if (allSchedules.length) {
        let bestId: string | null = null
        let bestDist = Infinity

        for (const s of allSchedules) {
          const [sh, sm] = s.start_time.split(':').map(Number)
          const schedStartMin = sh * 60 + sm

          if (s.schedule_date === todayStr) {
            // Today's schedule: accept if within [start - beforeMin, end + afterMin]
            const [eh, em] = s.end_time!.split(':').map(Number)
            const schedEndMin = eh * 60 + em
            const winStart = ((schedStartMin - beforeMin) % 1440 + 1440) % 1440
            const winEnd = ((schedEndMin + afterMin) % 1440 + 1440) % 1440

            let inWindow: boolean
            if (winStart <= winEnd) {
              inWindow = nowMinutes >= winStart && nowMinutes <= winEnd
            } else {
              inWindow = nowMinutes >= winStart || nowMinutes <= winEnd
            }

            if (inWindow) {
              const dist = Math.abs(schedStartMin - nowMinutes)
              const circDist = dist > 720 ? 1440 - dist : dist
              if (circDist < bestDist) {
                bestDist = circDist
                bestId = s.id
              }
            }
          } else {
            // Yesterday's overnight schedule: only match if end < start (overnight)
            // and current time is before end + afterMin
            const [eh, em] = s.end_time!.split(':').map(Number)
            const schedEndMin = eh * 60 + em
            if (schedEndMin < schedStartMin && nowMinutes <= schedEndMin + afterMin) {
              const dist = nowMinutes + (1440 - schedStartMin)
              if (dist < bestDist) {
                bestDist = dist
                bestId = s.id
              }
            }
          }
        }
        if (bestId) {
          scheduleId = bestId
          resolvedType = 'scheduled'
        }
      }

      if (!scheduleId) {
        resolvedType = 'unscheduled'
      }
    } else {
      scheduleId = ets?.open_schedule_id ?? null
      resolvedType = scheduleId ? 'scheduled' : 'unscheduled'
    }

    // --- Compute work_date ---
    let workDate = todayArgentina
    if (scheduleId) {
      const { data: schedForDate } = await db
        .from('employee_schedules')
        .select('schedule_date')
        .eq('id', scheduleId)
        .single()
      if (schedForDate?.schedule_date) workDate = schedForDate.schedule_date
    } else if (resolvedEntryType === 'clock_out' && ets?.open_clock_in_id) {
      const { data: openCi } = await db
        .from('clock_entries')
        .select('work_date')
        .eq('id', ets.open_clock_in_id)
        .single()
      if (openCi?.work_date) workDate = openCi.work_date
    }

    // --- Upload photo to storage if provided ---
    let photoUrl: string | null = null
    if (photo_base64) {
      try {
        const raw = photo_base64.includes(',') ? photo_base64.split(',')[1] : photo_base64
        const binaryStr = atob(raw)
        const bytes = new Uint8Array(binaryStr.length)
        for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i)

        const datePrefix = todayArgentina.replace(/-/g, '/')
        const fileName = `${user.branch_id}/${datePrefix}/${user.user_id}_${Date.now()}.jpg`

        const { error: uploadError } = await db.storage
          .from('clock-photos')
          .upload(fileName, bytes, { contentType: 'image/jpeg', upsert: false })

        if (!uploadError) {
          const { data: urlData } = db.storage.from('clock-photos').getPublicUrl(fileName)
          photoUrl = urlData?.publicUrl ?? null
        } else {
          console.warn('Photo upload failed (non-blocking):', uploadError.message)
        }
      } catch (photoErr) {
        console.warn('Photo processing failed (non-blocking):', photoErr)
      }
    }

    // --- Insert the clock entry ---
    const { data: clockEntry, error: insertError } = await db
      .from('clock_entries')
      .insert({
        branch_id: user.branch_id,
        user_id: user.user_id,
        entry_type: resolvedEntryType,
        schedule_id: scheduleId,
        resolved_type: resolvedType,
        anomaly_type: anomalyType,
        user_agent: user_agent || null,
        latitude: gps_lat || null,
        longitude: gps_lng || null,
        gps_status: gps_status || null,
        gps_message: gps_message || null,
        photo_url: photoUrl,
        work_date: workDate,
      })
      .select('id, created_at')
      .single()

    if (insertError) {
      console.error('Insert error:', insertError)
      return jsonRes({ error: `Error al registrar fichaje: ${insertError.message}` }, 500)
    }

    // --- Update employee_time_state ---
    const newState = resolvedEntryType === 'clock_in' ? 'working' : 'off'
    await db.from('employee_time_state').upsert(
      {
        employee_id: user.user_id,
        branch_id: user.branch_id,
        current_state: newState,
        last_event_id: clockEntry.id,
        open_clock_in_id: resolvedEntryType === 'clock_in' ? clockEntry.id : null,
        open_schedule_id: resolvedEntryType === 'clock_in' ? scheduleId : null,
        last_updated: now.toISOString(),
      },
      { onConflict: 'employee_id' },
    )

    // --- Compute shift duration for clock_out ---
    let shiftDurationMin: number | null = null
    if (resolvedEntryType === 'clock_out' && ets?.open_clock_in_id) {
      const { data: openEntry } = await db
        .from('clock_entries')
        .select('created_at')
        .eq('id', ets.open_clock_in_id)
        .single()
      if (openEntry) {
        shiftDurationMin = Math.round(
          (now.getTime() - new Date(openEntry.created_at).getTime()) / 60000,
        )
      }
    }

    // --- Build schedule label ---
    let scheduleLabel: string | null = null
    if (scheduleId) {
      const { data: sched } = await db
        .from('employee_schedules')
        .select('start_time, end_time')
        .eq('id', scheduleId)
        .single()
      if (sched?.start_time && sched?.end_time) {
        scheduleLabel = `${sched.start_time.slice(0, 5)} - ${sched.end_time.slice(0, 5)}`
      }
    }

    return jsonRes({
      success: true,
      user_id: user.user_id,
      full_name: user.full_name,
      branch_id: user.branch_id,
      branch_name: user.branch_name,
      entry_type: resolvedEntryType,
      timestamp: clockEntry.created_at,
      clock_entry_id: clockEntry.id,
      schedule_label: scheduleLabel,
      shift_duration_min: shiftDurationMin,
      auto_closed_stale: autoClosedId,
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return jsonRes({ error: 'Error interno del servidor' }, 500)
  }
})
