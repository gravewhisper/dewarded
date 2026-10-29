#!/usr/bin/env bash
JAR=$1; DB=$2; BASE=${BASE:-http://localhost:3000}
[ -n "$JAR" ] && [ -n "$DB" ] || { echo 'usage: BASE=<origin> scripts/verify-steam-forgery.sh <cookie-jar or /dev/null> <db>'; exit 1; }
enc() { node -e 'console.log(new URLSearchParams(JSON.parse(process.argv[1])).toString())' "$1"; }
base='{"openid.ns":"http://specs.openid.net/auth/2.0","openid.mode":"id_res","openid.op_endpoint":"https://steamcommunity.com/openid/login","openid.claimed_id":"https://steamcommunity.com/openid/id/76561198000000001","openid.identity":"https://steamcommunity.com/openid/id/76561198000000001","openid.return_to":"'"$BASE"'/auth/steam/callback","openid.response_nonce":"2026-10-29T12:00:00Zabc","openid.assoc_handle":"1234567890","openid.signed":"signed,op_endpoint,claimed_id,identity,return_to,response_nonce,assoc_handle","openid.sig":"AAAAAAAAAAAAAAAAAAAAAAAAAAA="}'
try() {
  local name=$1 patch=$2
  local q; q=$(enc "$(node -e 'console.log(JSON.stringify({...JSON.parse(process.argv[1]),...JSON.parse(process.argv[2])}))' "$base" "$patch")")
  printf '%-40s ' "$name"
  curl -s -o /dev/null -D - -b "$JAR" "$BASE/auth/steam/callback?$q" | awk '/^HTTP/{c=$2} tolower($1)=="location:"{l=$2} tolower($1)=="set-cookie:"{s="SETS-COOKIE"} END{print c, l, s}' | tr -d '\r'
}
count() { sqlite3 "$DB" "select (select count(*) from verifications) || ' verifications, ' || (select count(*) from claims) || ' claims'" 2>/dev/null || sqlite3 "$DB" 'select count(*) || " verifications" from verifications'; }
echo "rows before: $(count)"
try 'well-formed, fake sig (Steam round-trip)' '{}'
try 'claimed_id not a steam URL' '{"openid.claimed_id":"https://evil.example/openid/id/76561198000000001","openid.identity":"https://evil.example/openid/id/76561198000000001"}'
try 'return_to points elsewhere' '{"openid.return_to":"https://evil.example/cb"}'
try 'claimed_id not in signed list' '{"openid.signed":"signed,op_endpoint,return_to,response_nonce,assoc_handle"}'
try 'op_endpoint spoofed' '{"openid.op_endpoint":"https://evil.example/openid/login"}'
echo "rows after:  $(count)"
