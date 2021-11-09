import { EventBridgeEvent } from "aws-lambda";
import { scheduleNextEvent } from "../logic/event-scheduler";
import { checkAndLaunchPendingReports } from "../logic/launch-report-request";

export default async function (event: EventBridgeEvent<'Scheduled Event', {}>) {
  try {
    return await Promise.all([
      scheduleNextEvent(event.resources[0].split(':rule/')[1]),
      checkAndLaunchPendingReports()
    ]);
  } catch(e) {
    console.log(e);
  }
}
