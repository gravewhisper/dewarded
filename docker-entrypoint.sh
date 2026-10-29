#!/bin/sh
set -e
chown -R node:node /data
exec setpriv --reuid=node --regid=node --init-groups "$@"
