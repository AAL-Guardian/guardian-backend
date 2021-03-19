
import { DATETIME_FORMAT, executeStatement } from "../data/dao";
import { ReportRequest } from "../data/models/report-request.model";
import { getReportSetup } from "../data/report";
import { getRobotAssignment, getRobotBySN } from "../data/robot";
import { getReportRequestById, MIN_WINDOW_DIFF } from "../data/schedule";
import { sendSpeakCommand } from "../iot/robot-commands";
import { sendReportRequest } from "../iot/senior-app-commands";
import dayjs = require("dayjs");

export async function checkUserAndLaunchReportRequest(id: string) {
  //grab report request
  const report_request = await getReportRequestById(id);
  //get assignment for a certain client
  const assignment = await getRobotAssignment(undefined, report_request.client_id);
  if (!assignment) {
    console.warn('No assigment found for report_request: ' + id);
    return;
  }
  //check if there was voice in the last minutes
  const guardian_log = await executeStatement(`SELECT *
  FROM guardian_log
  WHERE event_name = 'voice_detected'
  AND robot_serial_number = :robot_serial_number
  AND timestamp >= :min_time`, [
    {
      name: 'robot_serial_number',
      value: {
        stringValue: report_request.client_id
      }
    },{
      name: 'min_time',
      value: {
        stringValue: dayjs().subtract(MIN_WINDOW_DIFF, 'minute').format(DATETIME_FORMAT)
      }
    }
  ]) as { [key: string]: any; }[];

  if (guardian_log.length === 0) {
    console.info('No voice detected in last 15 minutes, skipping report request');
    return;
  }
  // launching request
  await launchReportRequest(report_request);
}

export async function launchReportRequest(reportRequest: ReportRequest) {
  if(reportRequest.date_shown) {
    console.info('Report Request already shown, skipping');
    return;
  }
  const assignment = await getRobotAssignment(undefined, reportRequest.client_id);
  const robot = await getRobotBySN(assignment.robot_serial_number);
  
  await Promise.all([
    sendReportRequest(robot, reportRequest),
  ])
  

}