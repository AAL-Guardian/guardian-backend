import { CloudWatchLogsEvent } from "aws-lambda";
import { getActiveAssignments, getRobotBySN } from "../data/robot";
import { sendListenCommand, sendPhotoCaptureCommand } from "../iot/robot-commands";
import { getRetainedMessage } from '../services/iot';

export default async function (params: CloudWatchLogsEvent) {
  const assignments = await getActiveAssignments();
  await Promise.all(assignments.map(async one => {
    /* get robot info */
    const robot = await getRobotBySN(one.robot_serial_number);
    /* get last app status */
    const seniorStatus = await getRetainedMessage<{ status: string } | null>(`${robot.topic}/senior-app/status`);
    if(seniorStatus?.status === 'asleep') {
      /* the app is in asleep, don't trigger the robot */
      return;
    }
    await sendPhotoCaptureCommand(robot, 0);
    await new Promise(resolve => setTimeout(resolve, 1000));
    await sendListenCommand(robot);
  }));
}