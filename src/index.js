import { createHmac, timingSafeEqual } from "crypto";

import axios from 'axios';
import express from 'express';

const { KINDLY_BOT_HMAC, PORT, SLACK_WEBHOOK_URL, SLACK_CHANNEL, VERIFY_TOKEN } = process.env;

const app = express();
app.use(express.json({
    verify(req, res, buf, encoding) {
      /*
        Normally bodyParser.json parses the bytestream to a JS object, then discards the raw bytes.
        To be able to check HMACs we need the exact original bytes, so we use this handler to store rawBody for later.
      */
      if (buf && buf.length > 0) {
        req.rawBody = buf.toString(encoding || 'utf8');
      }
    }
}))

/** Validate HMAC signature in an express request */
const validHMACRequest = (request, key = KINDLY_BOT_HMAC) => {
    const reqHmacSignature = request.headers["kindly-hmac"] || "";
    const computedHmac = createHmac("sha256", key);
    computedHmac.update(request.rawBody);
    const generatedHmacBase64 = computedHmac.digest("base64");

    const a = Buffer.from(generatedHmacBase64);
    const b = Buffer.from(reqHmacSignature);

    // return early if buffer lengths are not equal, otherwise timingSafeEqual will throw
    if (a.length !== b.length) {
        return false;
    }

    return timingSafeEqual(a, b);
};

const sendSlackMessage = (payload) => {
    const chatId = payload?.chat?.id;
    const botName = payload?.bot?.name;
    const botId = payload?.bot?.id;
    const url = SLACK_WEBHOOK_URL;
    const data = {
        text: `New ticket on bot ${botName}. <https://app.kindly.ai/bot/${botId}/inbox/chat/${chatId}|View ticket>.`,
    }

    if (SLACK_CHANNEL) {
        data['channel'] = SLACK_CHANNEL; // Override channel if set
    }

    // Send message payload to slack
    axios.post(url, data).then(() => {
        console.log('woop!')
    }).catch((err) => {
        console.error('oops!', err)
    })
}

function handleTicketWebhookSetup(req, res) {
    const verifyToken = req.query?.verify_token;
    if(!verifyToken || verifyToken !== VERIFY_TOKEN) {
        return res.status(401).send({error:'Bad query param verify_token'});
    }

    const challenge = req.query?.challenge;
    res.send(challenge);
}

function handleTicketWebhook(req, res) {
    if(!validHMACRequest(req)) {
        return res.status(401).send({error: 'invalid signature!', ok: false});
    }

    sendSlackMessage(req.body);
    res.send({ok: true});
}

app.get('/', handleTicketWebhookSetup);
app.post('/', handleTicketWebhook);

app.listen(PORT, () => {
  console.log(`http://localhost:${PORT}`);
})