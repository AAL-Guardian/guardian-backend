import { iotDataClient } from "../services/iot";
import { Robot } from "../data/models/robot.model";
import { PublishCommand } from "@aws-sdk/client-iot-data-plane";

export async function sendAnswerDetectedEvent(robot: Pick<Robot, 'topic'>, answer: boolean) {
  await iotDataClient.send(new PublishCommand({
    topic: robot.topic + '/cloud-events',
    payload: (new TextEncoder()).encode(JSON.stringify({
      event: 'answer-detected',
      data: {
        answer
      },
    }))
  }))
}