import { Robot } from "../data/models/robot.model";
import { selectStatement } from "../data/dao";
import { sendSpeakCommand } from "../iot/robot-commands";
import logEvent from "../data/log-event";
import { setShowDate } from "../data/report";
import { ReportRequest } from "../data/models/report-request.model";
import { getPersonByRobotSN } from "../data/robot";

interface MyIotEvent {
  topic: string;
  [key: string]: any;
}

export default async function (event: MyIotEvent) {
  console.log('logging senior app event', event);
  const robotTopic = event.robot_topic;
  const eventType = event.event_type;
  const eventData = event.data;
  console.log(robotTopic, eventType, eventData);
  const [ robot ] = await selectStatement('robot', [
    {
      name: 'topic',
      value: {
        stringValue: robotTopic
      }
    }
  ]) as Robot[];
  const person = await getPersonByRobotSN(robot.serial_number)
  await logEvent(robot.serial_number, 'senior_app_event', event);
  switch (eventType) {
    case 'showing_question':
      const question = event.data.description;
      await sendSpeakCommand(robot, question, person.language);
      break;
    case 'showing_message':
      const text = event.data.text;
      await sendSpeakCommand(robot, text, person.language);
      break;
    case 'showing_report':
      if(!event.data.id) {
        console.log('autonomus request, no need to update');
        return;
      }
      await setShowDate(event.data as ReportRequest);
      break;
  }

}
