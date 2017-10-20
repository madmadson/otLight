#!/usr/bin/env bash
set -o errexit # Exit on error

ng build --prod --aot
npm run precache

#firebase use madson-org-opentournament
#firebase deploy
