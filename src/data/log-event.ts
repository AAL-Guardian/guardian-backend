import dayjs = require("dayjs");
import { DATETIME_FORMAT, executeStatement, insertStatement } from "./dao";
import { MIN_WINDOW_DIFF } from "./schedule";

export default async function logEvent(robotCode: string, eventName: string = "", eventData: string | unknown = "", clientId: string = null): Promise<void> {
  console.info('inserting log', robotCode, eventName, eventData);
  if (typeof eventData !== 'string') {
    eventData = JSON.stringify(eventData);
  }
  // await executeStatement("INSERT INTO guardian_event (robot_serial_number, event_name, event_data, timestamp) values (:robot_serial_number, :event_name, :event_data, current_timestamp)", [
  await insertStatement("guardian_event", [
    {
      name: 'robot_serial_number',
      value: {
        stringValue: robotCode
      }
    },
    {
      name: 'event_name',
      value: {
        stringValue: eventName
      }
    },
    {
      name: 'event_data',
      value: {
        stringValue: eventData as string
      }
    },
    {
      name: 'clients_id',
      value: clientId ? {
        stringValue: clientId
      } : {
        isNull: true
      }
    },
    {
      name: 'timestamp',
      value: {
        stringValue: dayjs().format(DATETIME_FORMAT)
      }
    }
  ]);
}

export async function checkUserPresence(robotSerialNumber: string, minutesAgo = MIN_WINDOW_DIFF) {
  //check if there was voice in the last minutes
  const guardian_log = await executeStatement(`SELECT id
  FROM guardian_event
  WHERE event_name in ('voice_detected', 'senior_interaction_detected', 'robot_interaction','robot_detected_answer', 'photo_detected')
  AND robot_serial_number = :robot_serial_number
  AND timestamp >= :min_time`, [
    {
      name: 'robot_serial_number',
      value: {
        stringValue: robotSerialNumber
      }
    }, {
      name: 'min_time',
      value: {
        stringValue: dayjs().subtract(minutesAgo, 'minute').format(DATETIME_FORMAT)
      }
    }
  ]) as { [key: string]: any; }[];
  return guardian_log.length > 0;
}