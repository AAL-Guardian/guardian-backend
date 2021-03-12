import { executeStatement } from "./dao";
import { ReportRequest } from "./models/report-request.model";

export async function getScheduleById(id: string) {
  const res = await executeStatement("SELECT * FROM report_request_schedule WHERE id = :id", [
    {
      name: 'scope',
      value: {
        stringValue: id
      }
    }
  ])
  return res[0];
}

export async function getReportRequestById(id: string): Promise<ReportRequest> {
  const res = await executeStatement("SELECT * FROM report_request WHERE id = :id", [
    {
      name: 'id',
      value: {
        stringValue: id
      }
    }
  ])
  return res[0];
}

export async function listFutureReportRequests(): Promise<ReportRequest[]> {
  const res = await executeStatement("SELECT * FROM report_request WHERE date_scheduled > current_timestamp");
  return res;
}