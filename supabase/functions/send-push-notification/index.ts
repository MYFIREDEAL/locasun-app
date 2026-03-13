// supabase/functions/send-push-notification/index.ts
// ============================================
// 🔔 Edge Function — Envoyer une push notification
// ============================================
// Appelée par le trigger DB quand une notification est insérée
// ou directement via POST depuis le frontend/backend
//
// Payload attendu :
// {
//   prospect_id: UUID,           // OU user_id
//   user_id?: UUID,
//   title: string,
//   body: string,
//   url?: string,                // URL à ouvrir au clic (default: /dashboard)
//   tag?: string,                // Tag pour regrouper les notifs
//   icon?: string,               // URL icône custom
//   prospect_id?: UUID,
//   project_type?: string
// }

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Web Push avec la lib disponible sur Deno
// On utilise web-push-encryption manuellement car web-push n'est pas dispo sur Deno
// Alternative : utiliser l'API fetch directe vers le push service

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Helpers pour Web Push (RFC 8030 + VAPID)
async function importVapidKeys(publicKeyBase64: string, privateKeyBase64: string) {
  // Décoder les clés base64url
  const publicKeyBuffer = base64UrlToBuffer(publicKeyBase64)
  const privateKeyBuffer = base64UrlToBuffer(privateKeyBase64)

  const publicKey = await crypto.subtle.importKey(
    'raw',
    publicKeyBuffer,
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    []
  )

  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    await convertRawToPkcs8(privateKeyBuffer),
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign']
  )

  return { publicKey, privateKey }
}

function base64UrlToBuffer(base64url: string): ArrayBuffer {
  const padding = '='.repeat((4 - base64url.length % 4) % 4)
  const base64 = (base64url + padding).replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function convertRawToPkcs8(rawKey: ArrayBuffer): Promise<ArrayBuffer> {
  // Wrap raw 32-byte private key into PKCS8 DER format for P-256
  const pkcs8Header = new Uint8Array([
    0x30, 0x81, 0x87, 0x02, 0x01, 0x00, 0x30, 0x13,
    0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02,
    0x01, 0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d,
    0x03, 0x01, 0x07, 0x04, 0x6d, 0x30, 0x6b, 0x02,
    0x01, 0x01, 0x04, 0x20
  ])
  const pkcs8Footer = new Uint8Array([
    0xa1, 0x44, 0x03, 0x42, 0x00
  ])
  
  const rawKeyBytes = new Uint8Array(rawKey)
  // We'll use a simpler approach - import as JWK
  return rawKey // Fallback, will use JWK import instead
}

async function createVapidJWT(audience: string, subject: string, publicKeyBase64: string, privateKeyBase64: string): Promise<string> {
  // Import private key as JWK
  const privateKeyBuffer = base64UrlToBuffer(privateKeyBase64)
  
  const jwk = {
    kty: 'EC',
    crv: 'P-256',
    d: privateKeyBase64,
    x: publicKeyBase64.substring(0, 43), // First 32 bytes of uncompressed public key
    y: publicKeyBase64.substring(43),     // Last 32 bytes
  }

  // Simpler approach: use pre-built JWT
  const header = { typ: 'JWT', alg: 'ES256' }
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    aud: audience,
    exp: now + 12 * 3600, // 12 hours
    sub: subject,
  }

  const headerB64 = bufferToBase64Url(new TextEncoder().encode(JSON.stringify(header)))
  const payloadB64 = bufferToBase64Url(new TextEncoder().encode(JSON.stringify(payload)))
  const signingInput = `${headerB64}.${payloadB64}`

  // Import the private key for signing
  const key = await crypto.subtle.importKey(
    'jwk',
    {
      kty: 'EC',
      crv: 'P-256',
      x: bufferToBase64Url(base64UrlToBuffer(publicKeyBase64).slice(1, 33)),
      y: bufferToBase64Url(base64UrlToBuffer(publicKeyBase64).slice(33, 65)),
      d: privateKeyBase64,
    },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(signingInput)
  )

  // Convert DER signature to raw r||s format
  const derSig = new Uint8Array(signature)
  const rawSig = derToRaw(derSig)
  const signatureB64 = bufferToBase64Url(rawSig.buffer)

  return `${signingInput}.${signatureB64}`
}

function derToRaw(der: Uint8Array): Uint8Array {
  // If already 64 bytes, it's raw format
  if (der.length === 64) return der
  
  // Parse DER: 0x30 len 0x02 rLen r 0x02 sLen s
  const raw = new Uint8Array(64)
  let offset = 2 // skip 0x30 and total length
  
  // r
  if (der[offset] !== 0x02) return der.slice(0, 64) // fallback
  offset++
  const rLen = der[offset++]
  const rStart = offset + (rLen - 32 > 0 ? rLen - 32 : 0)
  const rPad = 32 - Math.min(rLen, 32)
  raw.set(der.slice(rStart, rStart + Math.min(rLen, 32)), rPad)
  offset += rLen
  
  // s
  if (der[offset] !== 0x02) return der.slice(0, 64)
  offset++
  const sLen = der[offset++]
  const sStart = offset + (sLen - 32 > 0 ? sLen - 32 : 0)
  const sPad = 32 - Math.min(sLen, 32)
  raw.set(der.slice(sStart, sStart + Math.min(sLen, 32)), 32 + sPad)
  
  return raw
}

// ============================================
// Envoyer une notification push à un endpoint
// ============================================
async function sendWebPush(subscription: any, payload: string): Promise<{ success: boolean; status?: number; error?: string }> {
  try {
    const endpoint = subscription.endpoint
    const p256dh = subscription.keys.p256dh
    const auth = subscription.keys.auth

    // Pour l'instant, on utilise une approche simplifiée
    // En production, utiliser une lib web-push complète
    // Ici on envoie via l'API Push directement
    
    const audience = new URL(endpoint).origin
    const vapidJWT = await createVapidJWT(
      audience,
      'mailto:tech@evatime.fr',
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY
    )

    // Encrypt payload using Web Push protocol (RFC 8291)
    // For now, send without encryption as a placeholder
    // TODO: Implement proper content encryption with aesgcm/aes128gcm
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `vapid t=${vapidJWT}, k=${VAPID_PUBLIC_KEY}`,
        'Content-Type': 'application/octet-stream',
        'Content-Length': '0',
        'TTL': '86400',
        'Urgency': 'normal',
      },
    })

    if (response.status === 201) {
      return { success: true, status: 201 }
    } else if (response.status === 410) {
      // Gone = subscription expired, supprimer en DB
      return { success: false, status: 410, error: 'Subscription expired' }
    } else {
      const text = await response.text()
      return { success: false, status: response.status, error: text }
    }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

// ============================================
// HANDLER PRINCIPAL
// ============================================
serve(async (req) => {
  // CORS
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
    const body = await req.json()
    const { prospect_id, user_id, title, body: notifBody, url, tag, icon, project_type } = body

    if (!title) {
      return new Response(JSON.stringify({ error: 'title requis' }), { status: 400 })
    }

    if (!prospect_id && !user_id) {
      return new Response(JSON.stringify({ error: 'prospect_id ou user_id requis' }), { status: 400 })
    }

    // Créer un client Supabase avec le service role (accès total)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Récupérer les souscriptions
    let query = supabase.from('push_subscriptions').select('id, subscription, endpoint')
    
    if (prospect_id) {
      query = query.eq('prospect_id', prospect_id)
    } else {
      query = query.eq('user_id', user_id)
    }

    const { data: subscriptions, error } = await query

    if (error) {
      console.error('[send-push] Erreur lecture subscriptions:', error)
      return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: 'Aucune souscription trouvée' }), { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Payload de la notification
    const pushPayload = JSON.stringify({
      title,
      body: notifBody,
      url: url || '/dashboard',
      tag: tag || 'notification',
      icon: icon || '/pwa-192x192.png',
      project_type,
    })

    // Envoyer à chaque souscription
    let sent = 0
    let failed = 0
    const expiredIds: string[] = []

    for (const sub of subscriptions) {
      const result = await sendWebPush(sub.subscription, pushPayload)
      
      if (result.success) {
        sent++
      } else if (result.status === 410) {
        // Souscription expirée → marquer pour suppression
        expiredIds.push(sub.id)
        failed++
      } else {
        console.error(`[send-push] Échec pour ${sub.endpoint}:`, result.error)
        failed++
      }
    }

    // Supprimer les souscriptions expirées
    if (expiredIds.length > 0) {
      await supabase.from('push_subscriptions').delete().in('id', expiredIds)
      console.log(`[send-push] ${expiredIds.length} souscription(s) expirée(s) supprimée(s)`)
    }

    return new Response(JSON.stringify({ sent, failed, expired: expiredIds.length }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('[send-push] Erreur:', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
