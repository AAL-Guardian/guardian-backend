import { Robot } from "../data/models/robot.model";
import { selectStatement } from "../data/dao";
import { sendSpeakCommand } from "../iot/robot-commands";
import logEvent from "../data/log-event";

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
  await logEvent(robot.serial_number, 'senior_app_event', event);
  switch (event.type) {
    case 'showing_question':
      const question = event.data.question.description;
      await sendSpeakCommand(robot, question, 'en');
      break;
    case 'showing_message':
      const text = event.data.text;
      await sendSpeakCommand(robot, text, 'en');
      break;
  }

}
