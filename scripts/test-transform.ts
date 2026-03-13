import { fetchAllSheets } from '../src/sheets';
import { transform } from '../src/transform';

const SHEET_ID = process.env.SHEET_ID;
if (!SHEET_ID) throw new Error('SHEET_ID not set');

(async () => {
  console.log('Fetching spreadsheet...');
  const sheets = await fetchAllSheets(SHEET_ID);

  console.log('Transforming...\n');
  const timetable = transform(sheets);

  console.log(JSON.stringify(timetable, null, 2));

  console.log('\n--- Summary ---');
  for (const day of timetable.timetable) {
    console.log(`${day.day}: ${day.events.length} event(s)`);
  }
})().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
