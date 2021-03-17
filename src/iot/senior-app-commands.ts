import { IoTDataPlaneClient, PublishCommand } from "@aws-sdk/client-iot-data-plane";
import { ReportType } from "../data/models/report-type.model";
import { ReportRequest } from "../data/models/report-request.model";
import { Robot } from "../data/models/robot.model";

const iotData = new IoTDataPlaneClient({});

export async function sendReportRequest(robot: Robot, reportRequest: ReportRequest, reportSetup: ReportType) {
  await iotData.send(new PublishCommand({
    topic: robot.topic + '/senior-app/report-request',
    payload: (new TextEncoder()).encode(JSON.stringify({
      reportRequest,
      reportSetup
    }))
  }));
}