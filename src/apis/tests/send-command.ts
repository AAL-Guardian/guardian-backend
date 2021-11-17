import { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";
import { getRobotBySN } from "../../data/robot";
import { getResponse } from "../../common/response.template";
import { sendListenAnswerCommand, sendListenCommand, sendMoveHeadCommand, sendPhotoCaptureCommand } from "../../iot/robot-commands";

export default async function (event: APIGatewayEvent) {
  const response = getResponse() as APIGatewayProxyResult;
  const {
    command,
    robot_code,
    data
  } = JSON.parse(event.body) as { command: string, robot_code: string, data: any };
  const robot =  await getRobotBySN(robot_code);
  switch(command) {
    case 'record_answer': {
      await sendListenAnswerCommand(robot, data.time);
      break;
    }
    case 'record_audio': {
      await sendListenCommand(robot, data.time);
      break;
    }
    case 'take_photo': {
      await sendPhotoCaptureCommand(robot, data.angle);
      break;
    }
    case 'move_head': {
      await sendMoveHeadCommand(robot, data.angle);
      break;
    }
  }
  return response;
}