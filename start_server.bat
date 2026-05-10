@echo off
title Local Web Server
echo Starting local server...
start http://localhost:8000
python -m http.server 8000