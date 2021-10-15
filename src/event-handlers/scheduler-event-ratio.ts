import { EventBridgeEvent } from "aws-lambda";
import { ReportRequest } from "../data/models/report-request.model";
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
        const singleRequests = nextRequests.reduce((list, curr) => {
          if(!list.some(one => one.client_id === curr.client_id)) {
            list.push(curr);
          }
          return list;
        }, [] as ReportRequest[]);
        console.log(`Found ${singleRequests.length} Reports really to elaborate`);
        return await Promise.all(singleRequests.map(async one => await checkUserAndLaunchReportRequest(one.id)))
      })()
    ]);
  } catch(e) {
    console.log(e);
  }
}
