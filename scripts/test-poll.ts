import path from 'path';
import fs from 'fs/promises';
import { pollAndWrite } from '../src/poller';

const SHEET_ID = process.env.SHEET_ID;
if (!SHEET_ID) throw new Error('SHEET_ID not set');

const OUTPUT_PATH = path.resolve(__dirname, '../data/timetable-test.json');

(async () => {
  console.log(`Writing output to: ${OUTPUT_PATH}\n`);
  await pollAndWrite(SHEET_ID, OUTPUT_PATH);

  const result = await fs.readFile(OUTPUT_PATH, 'utf8');
  const timetable = JSON.parse(result);
  console.log('\n--- Result ---');
  for (const day of timetable.timetable) {
    console.log(`${day.day}: ${day.events.length} event(s)`);
  }
})();
