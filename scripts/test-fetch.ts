import { fetchAllSheets } from '../src/sheets';

const SHEET_ID = process.env.SHEET_ID;
if (!SHEET_ID) throw new Error('SHEET_ID not set');

(async () => {
  console.log('Fetching spreadsheet...');
  const sheets = await fetchAllSheets(SHEET_ID);

  console.log(`\nFound ${sheets.length} sheet(s):`);
  for (const sheet of sheets) {
    console.log(`  - "${sheet.day}" — ${sheet.rows.length} rows`);
  }

  console.log('\nFirst 3 data rows of each sheet:');
  for (const sheet of sheets) {
    console.log(`\n[${sheet.day}]`);
    sheet.rows.slice(0, 3).forEach((row, i) => console.log(`  row ${i}:`, row));
  }
})().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
