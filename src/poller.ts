import fs from 'fs/promises';
import { fetchAllSheets } from './sheets';
import { transform } from './transform';

export async function pollAndWrite(sheetId: string, outputPath: string): Promise<void> {
  try {
    const sheets = await fetchAllSheets(sheetId);
    const timetable = transform(sheets);
    const json = JSON.stringify(timetable, null, '\t');
    const tmpPath = outputPath + '.tmp';
    await fs.writeFile(tmpPath, json, 'utf8');
    await fs.rename(tmpPath, outputPath);
    console.log(`[${new Date().toISOString()}] timetable.json successfully updated`);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Poll failed:`, err);
  }
}
