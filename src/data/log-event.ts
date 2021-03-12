import { executeStatement } from "./dao";

export default async function logEvent(robotCode: string, eventName: string = "", eventData: string | any = ""): Promise<void> {
  if (typeof eventData != 'string') {
    eventData = JSON.stringify(eventData);
  }
  const res = await executeStatement("INSERT INTO guardian_event (robot_serial_number, event_name, event_data, timestamp) values (:robot_serial_number, :event_name, :event_data, current_timestamp)", [
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
    }
  ], false);
  console.log('insertRes', res);
}