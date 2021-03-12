import { getReportRequestById } from "../data/schedule";

export async function launchReportRequest(id: string) {
  const report_request = await getReportRequestById(id);
  

}