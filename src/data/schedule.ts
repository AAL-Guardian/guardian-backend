import dayjs = require("dayjs");
import { DATETIME_FORMAT, executeStatement } from "./dao";
import { ReportRequest } from "./models/report-request.model";

export const MIN_WINDOW_DIFF = 15;

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
  return res as ReportRequest[];
}

export async function getPendingReportRequest(client_id: string): Promise<ReportRequest[]> {
  const min_ago = dayjs().subtract(MIN_WINDOW_DIFF, 'minute').format(DATETIME_FORMAT);
  const res = await executeStatement(`SELECT * FROM report_request
  WHERE date_shown is null
    AND client_id = :client_id
    AND date_scheduled BETWEEN :time_ago and current_timestamp`, [
    {
      name: 'client_id',
      value: {
        stringValue: client_id
      }
    },
    {
      name: 'time_ago',
      value: {
        stringValue: min_ago
      }
    }
  ]);
  return res as ReportRequest[];
}