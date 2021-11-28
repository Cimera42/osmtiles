#!/bin/sh

set -e

apt-get install -y python3-venv

python3 -m venv venv
. ./venv/bin/activate

python3 -m pip -r requirements.txt

