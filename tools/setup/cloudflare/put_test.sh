set -a; source .env; set +a

SIGN_COUNT=$1
USER_ID="user_001"
CREDENTIAL_ID="test123"

curl -X PUT \
  -H "Authorization: Bearer $API_SECRET" \
  -H "Content-Type: application/json" \
  -d "{\"sign_count\": $SIGN_COUNT, \"user_id\": \"$USER_ID\"}" \
  https://$CLOUDFLARE_SUBDOMAIN/sign-count/$CREDENTIAL_ID