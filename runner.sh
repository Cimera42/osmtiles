#!/bin/sh

. ./venv/bin/activate
python3 process.py

cp output/osmtiles.conf /etc/nginx/sites-available
