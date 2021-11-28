#!/bin/bash

set -e

. ./venv/bin/activate
python3 ./process.py --single $1

cp -a ../conf-out /etc/nginx/sites-available
systemctl reload nginx
