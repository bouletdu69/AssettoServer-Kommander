#!/bin/bash
while true; do npx vite --host 2>&1 | tee -a frontend.log; sleep 1; done
