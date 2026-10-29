#!/usr/bin/env bash
JAR=$1; DB=$2; BASE=${BASE:-http://localhost:3000}
[ -n "$JAR" ] && [ -n "$DB" ] || { echo 'usage: BASE=<origin> scripts/verify-steam-forgery.sh <cookie-jar or /dev/null> <db>'; exit 1; }
WORK=$(mktemp -d); trap 'rm -rf "$WORK"' EXIT
enc() { node -e 'console.log(new URLSearchParams(JSON.parse(process.argv[1])).toString())' "$1"; }
start_login() {
  local jar=$1
  cp "$JAR" "$jar" 2>/dev/null || : > "$jar"
  curl -s -o /dev/null -D - -b "$jar" -c "$jar" "$BASE/auth/steam/start" | tr -d '\r' | awk 'tolower($1)=="location:"{print $2}' \
    | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(new URL(s.trim()).searchParams.get("openid.return_to")??""))'
}
base() {
  echo '{"openid.ns":"http://specs.openid.net/auth/2.0","openid.mode":"id_res","openid.op_endpoint":"https://steamcommunity.com/openid/login","openid.claimed_id":"https://steamcommunity.com/openid/id/76561198000000001","openid.identity":"https://steamcommunity.com/openid/id/76561198000000001","openid.return_to":"'"$1"'","openid.response_nonce":"2026-10-29T12:00:00Zabc","openid.assoc_handle":"1234567890","openid.signed":"signed,op_endpoint,claimed_id,identity,return_to,response_nonce,assoc_handle","openid.sig":"AAAAAAAAAAAAAAAAAAAAAAAAAAA="}'
}
send() {
  local name=$1 jar=$2 return_to=$3 patch=$4
  local q; q=$(enc "$(node -e 'console.log(JSON.stringify({...JSON.parse(process.argv[1]),...JSON.parse(process.argv[2])}))' "$(base "$return_to")" "$patch")")
  printf '%-44s ' "$name"
  curl -s -o /dev/null -D - -b "$jar" "$BASE/auth/steam/callback?$q" | tr -d '\r' | awk '/^HTTP/{c=$2} tolower($1)=="location:"{l=$2} tolower($1)=="set-cookie:"{split($2,kv,"=");split(kv[2],p,".");s=p[1]} END{print c, l, s}' \
    | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const[c,l,b]=s.trim().split(" ");const sess=b?JSON.parse(Buffer.from(b,"base64url")):{};console.log(c,l,sess.steamId64?"SIGNED-IN "+sess.steamId64:"")})'
}
try() {
  local jar="$WORK/jar.$RANDOM"
  send "$1" "$jar" "$(start_login "$jar")" "$2"
}
count() { sqlite3 "$DB" "select (select count(*) from verifications) || ' verifications, ' || (select count(*) from claims) || ' claims'" 2>/dev/null || sqlite3 "$DB" 'select count(*) || " verifications" from verifications'; }
echo "rows before: $(count)"
try 'well-formed, fake sig (Steam round-trip)' '{}'
try 'claimed_id not a steam URL' '{"openid.claimed_id":"https://evil.example/openid/id/76561198000000001","openid.identity":"https://evil.example/openid/id/76561198000000001"}'
try 'return_to points elsewhere' '{"openid.return_to":"https://evil.example/cb"}'
try 'claimed_id not in signed list' '{"openid.signed":"signed,op_endpoint,return_to,response_nonce,assoc_handle"}'
try 'op_endpoint spoofed' '{"openid.op_endpoint":"https://evil.example/openid/login"}'
send 'no login started in this browser' "$JAR" "$BASE/auth/steam/callback" '{}'
attacker="$WORK/attacker"; victim="$WORK/victim"
attacker_return_to=$(start_login "$attacker"); start_login "$victim" >/dev/null
send 'login started in another browser' "$victim" "$attacker_return_to" '{}'
echo "rows after:  $(count)"
