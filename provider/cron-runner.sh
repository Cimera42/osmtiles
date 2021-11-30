#!/bin/bash

set -e
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

cd $SCRIPT_DIR

. ./venv/bin/activate
python3 /process.py --single $1

cp -a ../conf-out/* /etc/nginx/sites-available
systemctl reload nginx
