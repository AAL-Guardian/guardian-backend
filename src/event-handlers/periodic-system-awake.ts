import { CloudWatchLogsEvent } from "aws-lambda";
import { getActiveAssignments, getRobotBySN } from "../data/robot";
import { sendEmotion } from '../iot/robot-commands';
import { sendRetainedMessage } from '../services/iot';

export default async function (params: CloudWatchLogsEvent) {
  const assignments = await getActiveAssignments();
  await Promise.all(assignments.map(async one => {
    /* get robot info */
    const robot = await getRobotBySN(one.robot_serial_number);
    /* set awake status */
    await sendRetainedMessage(`${robot.topic}/system/status`, { status: 'awake'});
    await sendEmotion(robot, 'sveglia');
  }));
}