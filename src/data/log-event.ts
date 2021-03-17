import dayjs = require("dayjs");
import { DATETIME_FORMAT, insertStatement } from "./dao";

export default async function logEvent(robotCode: string, eventName: string = "", eventData: string | any = ""): Promise<void> {
  console.info('inserting log', robotCode, eventName, eventData);
  if (typeof eventData != 'string') {
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
        stringValue: eventData
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