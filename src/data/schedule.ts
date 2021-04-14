import { Field } from "@aws-sdk/client-rds-data";
import dayjs = require("dayjs");
import { DATETIME_FORMAT, executeStatement, selectStatement } from "./dao";
import { ReportRequest } from "./models/report-request.model";

export const MIN_WINDOW_DIFF = 15;

export async function getScheduleById(id: string) {
  const res = await selectStatement("report_request_schedule", [
    {
      name: 'id',
      value: {
        stringValue: id
      }
    }
  ])
  return res[0];
}

export async function getReportRequestById(id: string): Promise<ReportRequest> {
  const res = await selectStatement("report_request", [
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
  const res = await executeStatement("SELECT * FROM report_request WHERE date_shown is null AND date_scheduled > current_timestamp ORDER BY date_scheduled ASC");
  return res as ReportRequest[];
}

export async function getPendingReportRequest(client_id?: string): Promise<ReportRequest[]> {
  const min_ago = dayjs().subtract(MIN_WINDOW_DIFF, 'minute').format(DATETIME_FORMAT);
  const res = await executeStatement(`SELECT * FROM report_request
  WHERE date_shown is null
    AND date_deleted is null
    AND client_id = IFNULL(:client_id, client_id)
    AND date_scheduled BETWEEN :time_ago and current_timestamp`, [
    {
      name: 'client_id',
      value: {
        stringValue: client_id ? client_id : undefined,
        isNull: !client_id
      } as Field
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