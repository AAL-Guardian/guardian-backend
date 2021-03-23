import { IoTDataPlaneClient, PublishCommand } from "@aws-sdk/client-iot-data-plane";
import { CloudWatchLogsEvent } from "aws-lambda";
const iotData = new IoTDataPlaneClient({});

export default async function (params: CloudWatchLogsEvent) {
  await iotData.send(new PublishCommand({
    topic: 'misty-20194503592/command',
    payload: (new TextEncoder()).encode(JSON.stringify({
      guardian_command: 'stability_test',
      guardian_data: null,
    }))
  }))
}