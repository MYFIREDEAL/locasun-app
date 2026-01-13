#!/bin/bash
# ============================================
# Script de test pour generate-signed-pdf
# ============================================

# ⚠️ REMPLACER CES VALEURS
SUPABASE_URL="https://your-project.supabase.co"
ANON_KEY="your-anon-key"
PROCEDURE_ID="remplacer-par-un-uuid-reel"

echo "🚀 Test generate-signed-pdf"
echo "📋 Procedure ID: $PROCEDURE_ID"
echo ""

# Appeler l'Edge Function
echo "[1/2] Appel Edge Function..."
response=$(curl -s -X POST "$SUPABASE_URL/functions/v1/generate-signed-pdf" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ANON_KEY" \
  -d "{\"signature_procedure_id\": \"$PROCEDURE_ID\"}" \
  -w "\nHTTP_STATUS:%{http_code}")

# Extraire le body et le status
http_body=$(echo "$response" | sed -e 's/HTTP_STATUS\:.*//g')
http_status=$(echo "$response" | tr -d '\n' | sed -e 's/.*HTTP_STATUS://')

echo ""
echo "[2/2] Réponse:"
echo "Status: $http_status"
echo "Body: $http_body" | jq '.' 2>/dev/null || echo "$http_body"

if [ "$http_status" = "200" ]; then
  echo ""
  echo "✅ SUCCÈS !"
else
  echo ""
  echo "❌ ERREUR (status $http_status)"
fi
