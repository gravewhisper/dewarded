#!/usr/bin/env bash
# Sends forged Steam OpenID callbacks to a running dev server and checks no row is written.
# usage: scripts/verify-steam-forgery.sh <cookie-jar-with-dev-session> <path-to-db>
JAR=$1; DB=$2
enc() { node -e 'console.log(new URLSearchParams(JSON.parse(process.argv[1])).toString())' "$1"; }
base='{"openid.ns":"http://specs.openid.net/auth/2.0","openid.mode":"id_res","openid.op_endpoint":"https://steamcommunity.com/openid/login","openid.claimed_id":"https://steamcommunity.com/openid/id/76561198000000001","openid.identity":"https://steamcommunity.com/openid/id/76561198000000001","openid.return_to":"http://localhost:3000/auth/steam/callback","openid.response_nonce":"2026-10-29T12:00:00Zabc","openid.assoc_handle":"1234567890","openid.signed":"signed,op_endpoint,claimed_id,identity,return_to,response_nonce,assoc_handle","openid.sig":"AAAAAAAAAAAAAAAAAAAAAAAAAAA="}'
try() {
  local name=$1 patch=$2
  local q; q=$(enc "$(node -e 'console.log(JSON.stringify({...JSON.parse(process.argv[1]),...JSON.parse(process.argv[2])}))' "$base" "$patch")")
  printf '%-40s ' "$name"; curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' -b "$JAR" "localhost:3000/auth/steam/callback?$q"
}
echo "rows before: $(sqlite3 "$DB" 'select count(*) from verifications')"
try 'well-formed, fake sig (Steam round-trip)' '{}'
try 'claimed_id not a steam URL' '{"openid.claimed_id":"https://evil.example/openid/id/76561198000000001","openid.identity":"https://evil.example/openid/id/76561198000000001"}'
try 'return_to points elsewhere' '{"openid.return_to":"https://evil.example/cb"}'
try 'claimed_id not in signed list' '{"openid.signed":"signed,op_endpoint,return_to,response_nonce,assoc_handle"}'
try 'op_endpoint spoofed' '{"openid.op_endpoint":"https://evil.example/openid/login"}'
echo "rows after:  $(sqlite3 "$DB" 'select count(*) from verifications')"
sqlite3 "$DB" 'select reddit_username, steam_id64 from verifications'
