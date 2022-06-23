
import { selectStatement } from "../data/dao";
import { checkUserPresence } from "../data/log-event";
import { Client } from "../data/models/client.model";
import { Person } from "../data/models/person.model";
import { ReportRequest } from "../data/models/report-request.model";
import { getRobotAssignment, getRobotBySN } from "../data/robot";
import { getPendingReportRequest, getReportRequestById } from "../data/schedule";
import { sendEyeContactCommand, sendListenCommand, sendPhotoCaptureCommand, sendSpeakCommand } from "../iot/robot-commands";
import { sendReportRequest } from "../iot/senior-app-commands";
import { getRetainedMessage } from '../services/iot';

export async function checkUserAndLaunchReportRequest(id: string) {
  //grab report request
  const report_request = await getReportRequestById(id);
  if (!report_request) {
    console.log('Report was not found, wont launch', report_request);
    return;
  }
  if (report_request.date_deleted) {
    console.log('Report was deleted, wont launch', report_request);
    return;
  }
  if (report_request.date_shown) {
    console.log('Report aready shown, wont launch', report_request);
    return;
  }
  //get assignment for a certain client
  const assignment = await getRobotAssignment(undefined, report_request.client_id);
  if (!assignment) {
    console.warn('No assigment found for report_request: ' + id);
    return;
  }
  const robot = await getRobotBySN(assignment.robot_serial_number);
  const seniorStatus = await getRetainedMessage<{ status: string } | null>(`${robot.topic}/system/status`);
    if(seniorStatus?.status === 'asleep') {
      console.log('system sleeping, skipping')
      /* the app is in asleep, don't trigger the robot */
      return;
    }

  if (!(await checkUserPresence(assignment.robot_serial_number))) {
    console.info('No voice detected in last 15 minutes, skipping report request');
    
    const [client] = await selectStatement('clients', [
      {
        name: 'id',
        value: {
          stringValue: assignment.clients_id
        }
      }
    ]) as Client[];
    const [person] = await selectStatement('persons', [
      {
        name: 'id',
        value: {
          stringValue: client.person_id
        }
      }
    ]) as Person[]
    let message: string;
    switch (person.language) {
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
    await sendPhotoCaptureCommand(robot, 0);
    await sendEyeContactCommand(robot, 'on');
    /** wait 3 seconds */
    await new Promise(resolve => setTimeout(resolve, 1500));
    await sendListenCommand(robot);
    return;
  } else {
    // launching request
    await launchReportRequest(report_request);
  }
}

export async function launchReportRequest(reportRequest: ReportRequest) {
  if (reportRequest.date_shown) {
    console.info('Report Request already shown, skipping');
    return;
  }
  const assignment = await getRobotAssignment(undefined, reportRequest.client_id);
  const robot = await getRobotBySN(assignment.robot_serial_number);

  await Promise.all([
    sendReportRequest(robot, reportRequest),
  ])
}

export async function checkAndLaunchPendingReports() {
  const nextRequests = await getPendingReportRequest();
  console.log(`Found ${nextRequests.length} Reports to elaborate`);
  const singleRequests = nextRequests.reduce((list, curr) => {
    if (!list.some(one => one.client_id === curr.client_id)) {
      list.push(curr);
    }
    return list;
  }, [] as ReportRequest[]);
  console.log(`Found ${singleRequests.length} Reports really to elaborate`);
  return await Promise.all(singleRequests.map(async one => await checkUserAndLaunchReportRequest(one.id)))
}