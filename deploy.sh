#!/usr/bin/env bash
set -o errexit # Exit on error

ng build --aot
npm run precache

firebase use devotlight
firebase deploy
