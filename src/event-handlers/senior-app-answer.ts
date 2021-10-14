import { selectStatement } from "../data/dao";
import logEvent from "../data/log-event";
import { Client } from "../data/models/client.model";
import { ReportRequest } from "../data/models/report-request.model";
import { ReportType } from "../data/models/report-type.model";
import { Robot } from "../data/models/robot.model";
import { elaborateQuestionAnswer, insertAnswer, insertSelfReportRequest } from "../data/report";
import { getRobotAssignment } from "../data/robot";

interface MyIotEvent {
  topic: string;
  [key: string]: any;
}

export default async function (event: MyIotEvent) {
  const robotTopic = event.robot_topic;
  const reportSetup: ReportType = event.reportSetup;
  let reportRequest: ReportRequest = event.reportRequest;
  console.log(event, robotTopic, reportSetup, reportRequest);
  const [ robot ] = await selectStatement('robot', [
    {
      name: 'topic',
      value: {
        stringValue: robotTopic
      }
    }
  ]) as Robot[];

  await logEvent(robot.serial_number, 'senior_app_answer', event);

  if (!reportRequest?.id) {
    const assignment = await getRobotAssignment(robot.serial_number);
    reportRequest = await insertSelfReportRequest(assignment.clients_id, reportSetup.id);
  }
  const [client] = await selectStatement('clients', [
    {
      name: 'id',
      value: {
        stringValue: reportRequest.client_id
      }
    }
  ]) as Client[];
  const answerId = await insertAnswer(reportRequest.client_id, reportRequest.report_type_id, reportRequest.id, client.person_id);
  await elaborateQuestionAnswer(reportSetup.start_question, answerId);
  // scheduleNextEvent();
}
