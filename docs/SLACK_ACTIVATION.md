# ✅ Slack Activation Checklist

To enable real-time notifications for Custom Build requests:

1.  **Create an App in Slack**
    *   Go to [api.slack.com/apps](https://api.slack.com/apps)
    *   Click "Create New App" > "From scratch"
    *   Name it `X.O.M3 Cockpit`

2.  **Enable Incoming Webhooks**
    *   Click "Incoming Webhooks" in the sidebar
    *   Toggle "Activate Incoming Webhooks" to ON
    *   Click "Add New Webhook to Workspace"
    *   Select the channel (e.g., `#leads` or `#alerts`)

3.  **Add to Environment**
    *   Copy the Webhook URL (starts with `https://hooks.slack.com/...`)
    *   Create a `.env.local` file in `xom3-app/`
    *   Add: `SLACK_WEBHOOK_URL=your_url_here`

4.  **Test**
    *   Submit a request at `/custom-build`
    *   Check Slack for the `🚨 New Custom Build Request` alert
