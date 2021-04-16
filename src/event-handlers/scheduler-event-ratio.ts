import { EventBridgeEvent } from "aws-lambda";
import { getPendingReportRequest } from "../data/schedule";
import { scheduleNextEvent } from "../logic/event-scheduler";
import { checkUserAndLaunchReportRequest } from "../logic/launch-report-request";

export default async function (event: EventBridgeEvent<'Scheduled Event', {}>) {
  try {
    return await Promise.all([
      scheduleNextEvent(event.resources[0].split(':rule/')[1]),
      (async () => {
        const nextRequests = await getPendingReportRequest();
        console.log(`Found ${nextRequests.length} Reports to elaborate`);
        return await Promise.all(nextRequests.map(async one => await checkUserAndLaunchReportRequest(one.id)))
      })()
    ]);
  } catch(e) {
    console.log(e);
  }

  // try {
  //   console.log('check pending events');
  //   const nextRequests = await getPendingReportRequest();
  //   console.log(`Found ${nextRequests.length} Reports to elaborate`);
  //   await Promise.all(nextRequests.map(async one => await checkUserAndLaunchReportRequest(one.id)))
  // } catch (e) {
  //   console.log(e);
  // } finally {
  //   await scheduleNextEvent();
  // }
}
