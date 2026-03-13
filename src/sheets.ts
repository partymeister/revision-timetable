import { google } from 'googleapis';

export interface SheetData {
  day: string;
  rows: unknown[][];
}

export async function fetchAllSheets(spreadsheetId: string): Promise<SheetData[]> {
  const auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: 'sheets.properties.title',
  });

  const DAY_NAMES = new Set(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']);
  const titles = (meta.data.sheets ?? [])
    .map(s => s.properties?.title ?? '')
    .filter(title => DAY_NAMES.has(title.toLowerCase()));

  if (titles.length === 0) return [];

  const response = await sheets.spreadsheets.values.batchGet({
    spreadsheetId,
    ranges: titles.map(title => `${title}!A:H`),
    valueRenderOption: 'UNFORMATTED_VALUE',
  });

  return titles.map((day, i) => ({
    day,
    rows: response.data.valueRanges?.[i]?.values ?? [],
  }));
}
