import { selectStatement, updateStatement } from "../data/dao";
import logEvent from "../data/log-event";
import { ReportRequest } from "../data/models/report-request.model";
import { Robot } from "../data/models/robot.model";
import { snoozeReportRequest } from '../data/schedule';
import { scheduleNextEvent } from '../logic/event-scheduler';
import { handleSeniorAppInteraction } from "../logic/guardian-event-logic";
import { checkAndLaunchPendingReports } from "../logic/launch-report-request";

interface MyIotEvent {
  topic: string;
  [key: string]: any;
}

export default async function (event: MyIotEvent) {
  const robotTopic = event.robot_topic;

  const reportRequest: ReportRequest = event.reportRequest;
  const withInteraction: boolean = event.withInteraction;
  console.log(event, robotTopic, reportRequest);
  const [robot] = await selectStatement('robot', [
    {
      name: 'topic',
      value: {
        stringValue: robotTopic
      }
    }
  ]) as Robot[];

  await logEvent(robot.serial_number, 'senior_app_snooze', event);
  
  if(withInteraction) {
    await handleSeniorAppInteraction(robot);
  }
  // const assignment = await getRobotAssignment(robot.serial_number);
  // const [client] = await selectStatement('clients', [
  //   {
  //     name: 'id',
  //     value: {
  //       stringValue: reportRequest.client_id
  //     }
  //   }
  // ]) as Client[];
  await snoozeReportRequest(reportRequest)
  await checkAndLaunchPendingReports();
  await scheduleNextEvent();
}
