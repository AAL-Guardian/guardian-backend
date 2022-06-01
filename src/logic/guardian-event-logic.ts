import logEvent from "../data/log-event";
import { Robot } from "../data/models/robot.model";
import { getClientByRobotSN, getRobotBySN } from "../data/robot";
import { getPendingReportRequest } from "../data/schedule";
import { sendAnswerDetectedEvent } from "../iot/cloud-events";
import { sendChangeLedCommand } from "../iot/robot-commands";
import { sendRetainedMessage } from '../services/iot';
import { launchReportRequest } from "./launch-report-request";

export async function handleVoiceDetected(robot_code: Robot['serial_number']) {
  const client = await getClientByRobotSN(robot_code);
  if(!client) {
    return;
  }
  const robot = await getRobotBySN(robot_code);
  await Promise.all([
    logEvent(robot_code, 'voice_detected'),
    sendChangeLedCommand(robot)
  ]);
  const lastReportRequest = await getPendingReportRequest(client.id); 
  if(lastReportRequest.length > 0) {
    await launchReportRequest(lastReportRequest[0])
  }
}

export async function handleSeniorAppInteraction(robot: Robot) {
  await Promise.all([
    logEvent(robot.serial_number, 'senior_interaction_detected'),
    sendChangeLedCommand(robot),
  ])
}

export async function handleRobotInteraction(robot: Robot, data: unknown) {
  await Promise.all([
    logEvent(robot.serial_number, 'robot_interaction', data),
    sendRetainedMessage(`${robot.topic}/senior-app/status`, { status: 'asleep'})
  ])
}

export async function handleAnswerDetected(robot_code: Robot['serial_number'], res: boolean) {
  const robot = await getRobotBySN(robot_code);
  await Promise.all([
    logEvent(robot_code, 'robot_detected_answer', { answer: res }),
    sendChangeLedCommand(robot),
    sendAnswerDetectedEvent(robot, res)
  ]);
}