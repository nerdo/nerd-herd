#!/bin/sh
# A stand-in agent for the walks: sets its terminal's title to $1 and reports one finished turn
# through OSC 7501 (herdr-core's status report: "state=working", then "state=done"), then waits.
printf '\033]2;%s\007' "$1"
printf '\033]7501;state=working\007'
sleep 1
printf '\033]7501;state=done\007'
exec sleep 86400
