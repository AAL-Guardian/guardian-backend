import { IoTDataPlaneClient, PublishCommand } from "@aws-sdk/client-iot-data-plane";
import { ReportRequest } from "../data/models/report-request.model";
import { Robot } from "../data/models/robot.model";

const iotData = new IoTDataPlaneClient({});

export async function sendReportRequest(robot: Robot, reportRequest: ReportRequest) {
  console.log('sendReportRequest', robot, reportRequest);
  await iotData.send(new PublishCommand({
    topic: robot.topic + '/senior-app/report-request',
    payload: (new TextEncoder()).encode(JSON.stringify(reportRequest))
  }));
}