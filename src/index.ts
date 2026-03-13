import express from 'express';
import { pollAndWrite } from './poller';

const SHEET_ID = process.env.SHEET_ID;
const OUTPUT_PATH = process.env.OUTPUT_PATH ?? '/data/timetable.json';
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS ?? '300000', 10);

if (!SHEET_ID) throw new Error('SHEET_ID env var is required');
if (!WEBHOOK_SECRET) throw new Error('WEBHOOK_SECRET env var is required');

const app = express();
app.use(express.json());

app.post('/webhook', (req, res) => {
  if (req.headers['x-webhook-secret'] !== WEBHOOK_SECRET) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  pollAndWrite(SHEET_ID!, OUTPUT_PATH);
  res.json({ ok: true });
});

app.listen(3000, () => {
  console.log('Listening on port 3000');
});

pollAndWrite(SHEET_ID!, OUTPUT_PATH);
setInterval(() => pollAndWrite(SHEET_ID!, OUTPUT_PATH), POLL_INTERVAL_MS);
