# Example: Kindly ticket webhook to Slack notification

This is an example implementation of relaying a data from a Kindly ticket webhook to a Slack incoming webhook. This is useful if you want be alerted on slack when new tickets are created.
## Getting started

```bash
npm i
cp .env.default .env  # Update .env with your own values
npm start
ngrok http 3000
```

## Environment variables

See `.env.default`