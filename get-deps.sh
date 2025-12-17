#!/bin/bash

[ -d deps ] && { echo "deps/ already exists" ; exit 1; }

set -e

mkdir deps
cd deps

git clone https://git.sr.ht/~foosoft/anki-connect
