import { selectStatement } from "../data/dao";
import logEvent from "../data/log-event";
import { Robot } from "../data/models/robot.model";

interface MyIotEvent {
  topic: string;
  [key: string]: any;
}

export default async function (event: MyIotEvent) {
  const robotTopic = event.topic.split('/')[0];
  const robots = await selectStatement('robot', [
    {
      name: 'topic',
      value: {
        stringValue: robotTopic
      }
    }
  ]) as Robot[];
  const robot = robots[0];
  await logEvent(robot.serial_number, 'senior_app_answer', event);
}
