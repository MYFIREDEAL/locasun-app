#!/bin/bash
# ============================================
# Test generate-signed-pdf pour Alice
# ============================================

# ⚠️ REMPLACER CES VALEURS avec vos vraies clés Supabase
SUPABASE_URL="https://votre-projet.supabase.co"
ANON_KEY="votre-anon-key"

# ID de la procédure d'Alice
PROCEDURE_ID="2819adf6-39d4-425e-87f6-f999267640cd"

echo "🚀 Test generate-signed-pdf pour Alice"
echo "📋 Procedure ID: $PROCEDURE_ID"
echo ""

# Appeler l'Edge Function
echo "[1/2] Appel generate-signed-pdf..."
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
echo ""

# Formater le JSON si jq est disponible
if command -v jq &> /dev/null; then
  echo "$http_body" | jq '.'
else
  echo "$http_body"
fi

if [ "$http_status" = "200" ]; then
  echo ""
  echo "✅ SUCCÈS ! PDF signé généré"
else
  echo ""
  echo "❌ ERREUR (HTTP $http_status)"
fi
