set -a; source .env; set +a

CREDENTIAL_ID="test123"

curl -H "Authorization: Bearer $API_SECRET" \
  https://$CLOUDFLARE_SUBDOMAIN/sign-count/$CREDENTIAL_ID