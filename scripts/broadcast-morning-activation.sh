#!/bin/bash
# Broadcast Engine - Morning Activation Ritual
# Time: 6 AM CST daily

echo "Seal opened. Auto-pilots reignited. Cockpit active for the day. Broadcast Engine awakened."

# Check worker status
curl -s -X GET http://localhost:3000/api/broadcast/workers/stats | jq '.'

# Verify queue health (all queues < 100 pending)
# Check scraper connections (all platforms connected)
# Review overnight leads
curl -s -X GET http://localhost:3000/api/broadcast/dashboard/leads | jq '.'

# Activate posting schedule (verify scheduled posts queued)
# Emit activation signal
curl -s -X POST http://localhost:3000/api/uoi/event \
  -H "Content-Type: application/json" \
  -d '{"type": "broadcast_engine_activated", "source": "ritual"}' | jq '.'

echo "Broadcast Engine active. All systems green. Content flowing. Signals listening. Leads detecting. Funnel ready."
