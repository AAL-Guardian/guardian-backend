import sendCommand from '../apis/tests/send-command';
import { selectStatement } from "../data/dao";
import logEvent from "../data/log-event";
import { Robot } from "../data/models/robot.model";
import { sendEmotion, sendEyeContactCommand, sendTouchDetectStatusCommand } from "../iot/robot-commands";
import { handleUserDetected } from '../logic/guardian-event-logic';

interface AbstractIotEvent {
  topic: string;
  robot_topic: string;
  data: {
    status: 'awake' | 'asleep'
  };
}

interface AnyIotEvent extends AbstractIotEvent { }

export default async function (event: AnyIotEvent & {}) {
  console.log('logging senior app event', event);
  const robotTopic = event.robot_topic;
  const systemStatus = event.data.status;
  const [robot] = await selectStatement('robot', [
    {
      name: 'topic',
      value: {
        stringValue: robotTopic
      }
    }
  ]) as Robot[];

  switch (systemStatus) {
    case 'asleep':
      await sendEmotion(robot, 'dormi');
      await sendTouchDetectStatusCommand(robot, false);
      await sendEyeContactCommand(robot, 'off');
      break;
    case 'awake':
      await sendEmotion(robot, 'sveglia');
      await sendTouchDetectStatusCommand(robot, true);
      await handleUserDetected(robotTopic);
      break;
    default: {
      console.log('Error in detecting system status', event);
    }
  }
  await logEvent(robot.serial_number, 'system-status', event.data.status);
}
