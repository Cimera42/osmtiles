#!/bin/bash

set -e
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

# Provider
apt-get install -y python3-venv
cd $SCRIPT_DIR/provider
python3 -m venv venv
. ./venv/bin/activate
python3 -m pip install -r requirements.txt

python3 ./process.py

cp -a $SCRIPT_DIR/conf-out/* /etc/nginx/sites-available
systemctl reload nginx

cp ./osmtiles-cron /etc/cron.d

cd $SCRIPT_DIR

# Merger

cd $SCRIPT_DIR/merger
yarn install --frozen-lockfile
yarn run build
