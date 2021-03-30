import { getClientByRobotSN } from "../data/robot";
import { getPendingReportRequest } from "../data/schedule";
import { launchReportRequest } from "./launch-report-request";

export async function voiceDetected(robot_id: string, timestamp: string) {
  const client = await getClientByRobotSN(robot_id);
  if(!client) {
    return;
  }
  const lastReportRequest = await getPendingReportRequest(client.id); 
  if(lastReportRequest.length > 0) {
    await launchReportRequest(lastReportRequest[0])
  }
}