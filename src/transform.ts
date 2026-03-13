import SSF from 'ssf';
import {SheetData} from './sheets';
import { DateTime } from "luxon";

const CATEGORY_COLORS: Record<string, string> = {
  EVENT: '#fad028',
  DEADLINE: '#e5554a',
  COMPO: '#63a848',
  SEMINAR: '#88bbff',
  CONCERT: '#b7e1cd',
};

interface TimetableEvent {
  start: string;
  backgroundColor: string;
  category: string;
  title: string;
}

interface DayEntry {
  day: string;
  events: TimetableEvent[];
}

export interface Timetable {
  timetable: DayEntry[];
}

function serialToISO(serial: number): string {
  // SSF interprets the serial in the local timezone of the JS client.
  console.log('###');
  const formattedDate = SSF.format(`yyyy-mm-dd\\Thh:mm:ss`, serial);
  console.log('formattedDate: ' + formattedDate);
  console.log('~~~');
  const luxonDate = DateTime.fromISO(formattedDate, { zone: "Europe/Berlin" });
  console.log('luxonDate: ' + luxonDate.toISO());
  const finalDate = luxonDate.toUTC();
  console.log('finalDate: ' + finalDate.toISO());
  console.log(' ');
  return <string>finalDate.toISO();
}

export function transform(sheets: SheetData[]): Timetable {
  return {
    timetable: sheets.map(sheet => {
      const dataRows = sheet.rows.slice(1); // skip header row

      const events: TimetableEvent[] = dataRows
        .filter(row => typeof row[1] === 'number' && row[7] === true)
        .map(row => {
          const category = String(row[2] ?? '');
          const title =
            category === 'DEADLINE'
              ? String(row[6] ?? '')
              : String(row[3] ?? '');

          return {
            start: serialToISO(row[1] as number),
            backgroundColor: CATEGORY_COLORS[category] ?? '#cccccc',
            category,
            title,
          };
        });

      return {
        day: sheet.day.toUpperCase(),
        events,
      };
    }),
  };
}
