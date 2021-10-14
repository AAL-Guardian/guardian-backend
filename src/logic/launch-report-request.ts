
import { DATETIME_FORMAT, executeStatement, selectStatement } from "../data/dao";
import { ReportRequest } from "../data/models/report-request.model";
import { getRobotAssignment, getRobotBySN } from "../data/robot";
import { getReportRequestById, MIN_WINDOW_DIFF } from "../data/schedule";
import { sendListenCommand, sendSpeakCommand } from "../iot/robot-commands";
import { sendReportRequest } from "../iot/senior-app-commands";
import dayjs = require("dayjs");
import { Client } from "../data/models/client.model";
import { Person } from "../data/models/person.model";

export async function checkUserAndLaunchReportRequest(id: string) {
  //grab report request
  const report_request = await getReportRequestById(id);
  if(!report_request) {
    console.log('Report was not found, wont launch', report_request);
    return;
  }
  if(report_request.date_deleted) {
    console.log('Report was deleted, wont launch', report_request);
    return;
  }
  if(report_request.date_shown) {
    console.log('Report aready shown, wont launch', report_request);
    return;
  }
  //get assignment for a certain client
  const assignment = await getRobotAssignment(undefined, report_request.client_id);
  if (!assignment) {
    console.warn('No assigment found for report_request: ' + id);
    return;
  }
  //check if there was voice in the last minutes
  const guardian_log = await executeStatement(`SELECT *
  FROM guardian_event
  WHERE event_name = 'voice_detected'
  AND robot_serial_number = :robot_serial_number
  AND timestamp >= :min_time`, [
    {
      name: 'robot_serial_number',
      value: {
        stringValue: assignment.robot_serial_number
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
    const robot = await getRobotBySN(assignment.robot_serial_number);
    const [ client ] = await selectStatement('clients', [
      {
        name: 'id',
        value: {
          stringValue: assignment.clients_id
        }
      }
    ]) as Client[];
    const [ person ] = await selectStatement('persons', [
      {
        name: 'id',
        value: {
          stringValue: client.person_id
        }
      }
    ]) as Person[]
    let message: string;
    switch(person.language) {
      case 'it':
        message = `Hey ${person.name}, sei qui?`;
        break;
      case 'en':
        message = `Hey ${person.name}, are you there?`;
        break;
      case 'fr':
        message = `Salut ${person.name}, tu es là?`;
        break;
      case 'nl':
        message = `Hé ${person.name}, ben je daar?`;
        break;
    }
    await sendSpeakCommand(robot, message, person.language);
    /** wait 3 seconds */
    await new Promise(resolve => setTimeout(resolve, 2000) );
    await sendListenCommand(robot);
    return;
  } else {
    // launching request
    await launchReportRequest(report_request);
  }
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