#!/usr/bin/env bash
set -o errexit # Exit on error

ng build --prod --aot

firebase use devotlight
firebase deploy
