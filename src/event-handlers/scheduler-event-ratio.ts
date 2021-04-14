import { EventBridgeEvent } from "aws-lambda";
import { getPendingReportRequest } from "../data/schedule";
import { scheduleNextEvent } from "../logic/event-scheduler";
import { checkUserAndLaunchReportRequest } from "../logic/launch-report-request";

export default async function (event: EventBridgeEvent<'Scheduled Event', {}>) {
  await Promise.all([
    scheduleNextEvent(event.resources[0].split(':rule/')[1]),
    async () => {
      const nextRequests = await getPendingReportRequest();
      console.log(`Found ${nextRequests.length} Reports to elaborate`);
      return await Promise.all(nextRequests.map(async one => await checkUserAndLaunchReportRequest(one.id)))
    }
  ]);
}
