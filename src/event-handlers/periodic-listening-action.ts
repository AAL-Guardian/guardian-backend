import { CloudWatchLogsEvent } from "aws-lambda";
import { sendListenCommand, sendPhotoCaptureCommand } from "../iot/robot-commands";
import { getActiveAssignments, getRobotBySN } from "../data/robot";

export default async function(params: CloudWatchLogsEvent) {
  const assignments = await getActiveAssignments();
  await Promise.all(assignments.map(async one => {
    const robot = await getRobotBySN(one.robot_serial_number);
    await sendPhotoCaptureCommand(robot, 0);
    await new Promise(resolve => setTimeout(resolve, 1000));
    await sendListenCommand(robot);
  }));
}