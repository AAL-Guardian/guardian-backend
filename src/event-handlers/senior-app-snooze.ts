import { checkAndLaunchPendingReports } from "../logic/launch-report-request";
import { selectStatement } from "../data/dao";
import logEvent from "../data/log-event";
import { Client } from "../data/models/client.model";
import { ReportRequest } from "../data/models/report-request.model";
import { ReportType } from "../data/models/report-type.model";
import { Robot } from "../data/models/robot.model";
import { elaborateQuestionAnswer, insertAnswer, insertSelfReportRequest } from "../data/report";
import { getRobotAssignment } from "../data/robot";
import { handleSeniorAppInteraction } from "../logic/guardian-event-logic";

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
  const assignment = await getRobotAssignment(robot.serial_number);
  const [client] = await selectStatement('clients', [
    {
      name: 'id',
      value: {
        stringValue: reportRequest.client_id
      }
    }
  ]) as Client[];
  await checkAndLaunchPendingReports();
  // scheduleNextEvent();
}
