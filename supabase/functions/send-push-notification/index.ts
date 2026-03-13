// supabase/functions/send-push-notification/index.ts
// ============================================
// 🔔 Edge Function — Envoyer une push notification
// ============================================
// Appelée par le trigger DB (fn_send_push_on_notification)
// quand une notification est insérée pour un prospect.
//
// Utilise la lib web-push (npm) via esm.sh pour gérer
// tout le protocole Web Push (VAPID + chiffrement payload).
//
// Secrets requis dans Supabase Dashboard :
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY
//   (SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont auto-injectés)

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'https://esm.sh/web-push@3.6.7'

// --- Config VAPID ---
webpush.setVapidDetails(
  'mailto:tech@evatime.fr',
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!
)

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// ============================================
// HANDLER PRINCIPAL
// ============================================
serve(async (req: Request) => {
  // --- CORS ---
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info, apikey',
      },
    })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const { prospect_id, user_id, title, body: notifBody, url, tag, icon } = await req.json()

    if (!title) {
      return json({ error: 'title requis' }, 400)
    }
    if (!prospect_id && !user_id) {
      return json({ error: 'prospect_id ou user_id requis' }, 400)
    }

    // Client Supabase service-role (bypass RLS)
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    // Récupérer les souscriptions push du prospect/user
    let query = supabase.from('push_subscriptions').select('id, subscription')
    if (prospect_id) query = query.eq('prospect_id', prospect_id)
    else query = query.eq('user_id', user_id)

    const { data: subs, error } = await query
    if (error) {
      console.error('[send-push] DB error:', error)
      return json({ error: error.message }, 500)
    }
    if (!subs || subs.length === 0) {
      return json({ sent: 0, message: 'Aucune souscription' })
    }

    // Payload JSON reçu par le Service Worker (event.data.json())
    const payload = JSON.stringify({
      title,
      body: notifBody || '',
      url: url || '/dashboard',
      tag: tag || 'notification',
      icon: icon || '/pwa-192x192.png',
    })

    // Envoyer à chaque appareil
    let sent = 0
    let failed = 0
    const expiredIds: string[] = []

    for (const sub of subs) {
      try {
        await webpush.sendNotification(sub.subscription, payload)
        sent++
      } catch (err: any) {
        console.error(`[send-push] Fail sub ${sub.id}:`, err.statusCode, err.body)
        if (err.statusCode === 410 || err.statusCode === 404) {
          expiredIds.push(sub.id) // souscription expirée → supprimer
        }
        failed++
      }
    }

    // Nettoyer les souscriptions expirées
    if (expiredIds.length > 0) {
      await supabase.from('push_subscriptions').delete().in('id', expiredIds)
      console.log(`[send-push] ${expiredIds.length} expired sub(s) deleted`)
    }

    return json({ sent, failed, expired: expiredIds.length })

  } catch (err) {
    console.error('[send-push] Error:', err)
    return json({ error: String(err) }, 500)
  }
})

// Helper réponse JSON
function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
