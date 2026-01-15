#!/bin/bash
echo "Triggering Cron Job..."
curl -v http://localhost:3000/api/cron/fetch
echo "\nDone."
