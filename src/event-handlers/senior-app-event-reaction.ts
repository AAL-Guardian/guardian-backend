import { handleSeniorAppInteraction } from "../logic/guardian-event-logic";
import { selectStatement } from "../data/dao";
import logEvent from "../data/log-event";
import { ReportRequest } from "../data/models/report-request.model";
import { Robot } from "../data/models/robot.model";
import { setShowDate } from "../data/report";
import { getPersonByRobotSN } from "../data/robot";
import { sendEmotion, sendListenAnswerCommand, sendSpeakCommand } from "../iot/robot-commands";
import { ReportQuestion } from "../data/models/report-question.model";

interface AbstractIotEvent {
  topic: string;
  robot_topic: string;
  event_type: string;
  data: any;
}

interface ShowingQuestionEvent extends AbstractIotEvent {
  topic: 'showing_question';
  data: {
    reportQuestion: ReportQuestion,
    askYesNo: boolean
  }
}

interface AnyIotEvent extends AbstractIotEvent { }

export default async function (event: ShowingQuestionEvent | AnyIotEvent) {
  console.log('logging senior app event', event);
  const robotTopic = event.robot_topic;
  const eventType = event.event_type;
  const eventData = event.data;
  console.log(robotTopic, eventType, eventData);
  const [robot] = await selectStatement('robot', [
    {
      name: 'topic',
      value: {
        stringValue: robotTopic
      }
    }
  ]) as Robot[];

  switch (eventType) {
    case 'senior_interaction':
      await handleSeniorAppInteraction(robot);
      break;
    case 'showing_question': {
      const question = (event as ShowingQuestionEvent).data.reportQuestion;
      const person = await getPersonByRobotSN(robot.serial_number)
      await sendSpeakCommand(robot, question.description, person.language);
      if(event.data.askYesNo) {
        await new Promise((resolve, reject) => setTimeout(resolve, 4000));
        await sendListenAnswerCommand(robot)
      }
      
      break;
    }
    case 'showing_message': {
      const text = event.data.text;
      const person = await getPersonByRobotSN(robot.serial_number)
      await sendSpeakCommand(robot, text, person.language);
      break;
    }
    case 'showing_message_emotion': {
      const text = event.data.text;
      const emotion = event.data.emotion;
      const person = await getPersonByRobotSN(robot.serial_number)
      await sendSpeakCommand(robot, text, person.language);
      await sendEmotion(robot, emotion);
      break;
    }
    case 'showing_report':
      if (!event.data.id) {
        console.log('autonomus request, no need to update');
        return;
      }
      await setShowDate(event.data as ReportRequest);
      break;
  }
  await logEvent(robot.serial_number, 'senior_app_event', event);
}
