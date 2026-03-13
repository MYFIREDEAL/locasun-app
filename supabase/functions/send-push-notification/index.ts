// supabase/functions/send-push-notification/index.ts
// ============================================
// 🔔 Edge Function — Envoyer une push notification
// ============================================
// Compatible Deno Edge Runtime (pas de dépendance Node.js)
// Utilise @negrel/webpush (Web APIs pures, compatible Deno)
//
// Secrets requis dans Supabase Dashboard :
//   VAPID_PUBLIC_KEY  (base64url, 65 bytes — format web-push npm)
//   VAPID_PRIVATE_KEY (base64url, 32 bytes — format web-push npm)
//   (SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont auto-injectés)

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  ApplicationServer,
  importVapidKeys,
} from 'jsr:@negrel/webpush@0.5.0'

// --- Config ---
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const VAPID_PUBLIC_RAW = Deno.env.get('VAPID_PUBLIC_KEY')!   // base64url 65 bytes
const VAPID_PRIVATE_RAW = Deno.env.get('VAPID_PRIVATE_KEY')! // base64url 32 bytes

// ============================================
// Conversion base64url raw → JWK (EC P-256)
// web-push npm stocke les clés en base64url brut,
// @negrel/webpush attend du JWK.
// ============================================

/** Decode base64url string to Uint8Array */
function b64urlDecode(str: string): Uint8Array {
  // Ajouter le padding si nécessaire
  const pad = str.length % 4
  const padded = pad ? str + '='.repeat(4 - pad) : str
  const base64 = padded.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

/** Encode Uint8Array to base64url string (sans padding) */
function b64urlEncode(bytes: Uint8Array): string {
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * Convertir les clés VAPID raw (format web-push npm) en JWK pour @negrel/webpush.
 * - publicKey : 65 bytes (0x04 + x[32] + y[32]) → JWK avec x, y
 * - privateKey : 32 bytes (scalaire d) → JWK avec x, y, d
 */
function rawVapidToJwk(publicKeyB64: string, privateKeyB64: string): { publicKey: JsonWebKey, privateKey: JsonWebKey } {
  const pubBytes = b64urlDecode(publicKeyB64)
  const privBytes = b64urlDecode(privateKeyB64)

  if (pubBytes.length !== 65 || pubBytes[0] !== 0x04) {
    throw new Error(`Invalid VAPID public key: expected 65 bytes starting with 0x04, got ${pubBytes.length} bytes`)
  }
  if (privBytes.length !== 32) {
    throw new Error(`Invalid VAPID private key: expected 32 bytes, got ${privBytes.length} bytes`)
  }

  const x = b64urlEncode(pubBytes.slice(1, 33))
  const y = b64urlEncode(pubBytes.slice(33, 65))
  const d = b64urlEncode(privBytes)

  const publicKey: JsonWebKey = {
    kty: 'EC',
    crv: 'P-256',
    x,
    y,
    ext: true,
    key_ops: ['verify'],
  }

  const privateKey: JsonWebKey = {
    kty: 'EC',
    crv: 'P-256',
    x,
    y,
    d,
    ext: true,
    key_ops: ['sign'],
  }

  return { publicKey, privateKey }
}

// Cache du serveur VAPID (réutilisé entre les requêtes)
let appServer: ApplicationServer | null = null

async function getAppServer(): Promise<ApplicationServer> {
  if (appServer) return appServer

  console.log('[send-push] Initializing VAPID server...')
  console.log('[send-push] Public key length:', VAPID_PUBLIC_RAW.length, 'chars')
  console.log('[send-push] Private key length:', VAPID_PRIVATE_RAW.length, 'chars')

  // Convertir raw base64url → JWK
  const jwks = rawVapidToJwk(VAPID_PUBLIC_RAW, VAPID_PRIVATE_RAW)
  console.log('[send-push] JWK conversion OK, x:', jwks.publicKey.x?.substring(0, 8) + '...')

  // Importer les JWK en CryptoKeyPair
  const vapidKeys = await importVapidKeys(jwks)
  console.log('[send-push] VAPID keys imported OK')

  appServer = await ApplicationServer.new({
    contactInformation: 'mailto:tech@evatime.fr',
    vapidKeys,
  })
  console.log('[send-push] ApplicationServer ready ✅')

  return appServer
}

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
    return json({ error: 'Method not allowed' }, 405)
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

    console.log(`[send-push] ${subs.length} souscription(s) trouvée(s)`)

    // Payload JSON reçu par le Service Worker (event.data.json())
    const payload = JSON.stringify({
      title,
      body: notifBody || '',
      url: url || '/dashboard',
      tag: tag || 'notification',
      icon: icon || '/pwa-192x192.png',
    })

    // Initialiser le serveur VAPID
    const server = await getAppServer()

    // Envoyer à chaque appareil
    let sent = 0
    let failed = 0
    const expiredIds: string[] = []

    for (const sub of subs) {
      try {
        const pushSub = {
          endpoint: sub.subscription.endpoint,
          keys: {
            p256dh: sub.subscription.keys.p256dh,
            auth: sub.subscription.keys.auth,
          },
        }

        // Créer un subscriber et envoyer le message
        const subscriber = server.subscribe(pushSub)
        await subscriber.pushTextMessage(payload, {})

        sent++
        console.log(`[send-push] ✅ Envoyé à sub ${sub.id}`)

      } catch (err: any) {
        // Vérifier si c'est une PushMessageError avec status 410 (gone)
        if (err.response && (err.response.status === 410 || err.response.status === 404)) {
          console.log(`[send-push] ⚠️ Sub ${sub.id} expirée (${err.response.status})`)
          expiredIds.push(sub.id)
        } else {
          console.error(`[send-push] ❌ Erreur sub ${sub.id}:`, err.message || err)
        }
        failed++
      }
    }

    // Nettoyer les souscriptions expirées
    if (expiredIds.length > 0) {
      await supabase.from('push_subscriptions').delete().in('id', expiredIds)
      console.log(`[send-push] ${expiredIds.length} sub(s) expirée(s) supprimée(s)`)
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
