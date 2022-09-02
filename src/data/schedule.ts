import { Field } from "@aws-sdk/client-rds-data";
import dayjs = require("dayjs");
import { DATETIME_FORMAT, executeStatement, getOneBy, selectStatement, updateStatement } from "./dao";
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
  const res = await selectStatement<ReportRequest>("report_request", [
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
  const start_time = dayjs().endOf('minute').format(DATETIME_FORMAT);
  const res = await executeStatement(`SELECT *, date_scheduled as next_schedule
FROM report_request
WHERE ( ( remind_later is null OR remind_later = 0 ) AND date_shown is null AND date_scheduled > :start_time )
UNION
SELECT *, date_add(date_scheduled, INTERVAL remind_again_minutes MINUTE) as next_schedule
FROM report_request
WHERE ( remind_later = 1 AND remind_again_minutes > 0 AND date_add(date_scheduled, INTERVAL remind_again_minutes MINUTE) > :start_time )
ORDER BY next_schedule ASC LIMIT 1;`, [
    {
      name: 'start_time',
      value: {
        stringValue: start_time
      }
    }
  ]);
  return res as ReportRequest[];
}

export async function getPendingReportRequest(client_id?: string): Promise<ReportRequest[]> {
  const min_ago = dayjs().subtract(MIN_WINDOW_DIFF, 'minute').format(DATETIME_FORMAT);
  const end_min = dayjs().endOf('minute').format(DATETIME_FORMAT);
  console.log(`checking events from ${min_ago} and ${end_min} for client: ${client_id}`);
  const res = await executeStatement(`SELECT *
FROM report_request
WHERE
date_deleted is null
AND client_id = IFNULL(:client_id, client_id)
AND ( 
  ( date_shown is null AND date_scheduled BETWEEN :time_ago AND :end_time)
  OR
  (
    remind_later = 1
    AND remind_again_minutes > 0
    AND date_add(date_scheduled, INTERVAL remind_again_minutes MINUTE) BETWEEN :time_ago AND :end_time
    AND ifnull(date_shown, now()) < date_sub(now(), INTERVAL 3 MINUTE)
  )
)`, [
    {
      name: 'client_id',
      value: {
        stringValue: client_id ? client_id : undefined,
        isNull: client_id === undefined ? true : undefined
      } as Field
    },
    {
      name: 'time_ago',
      value: {
        stringValue: min_ago
      }
    },
    {
      name: 'end_time',
      value: {
        stringValue: end_min
      }
    }
  ]);
  return res as ReportRequest[];
}

export async function snoozeReportRequest(reportRequest: Pick<ReportRequest, 'id'>) {
  const newReportRequest = await getOneBy<ReportRequest>('report_request', [
    {
      name: 'id',
      value: { stringValue: reportRequest.id }
    }
  ]);
  if (!newReportRequest) {
    return;
  }
  if (newReportRequest.remind_again_times === 0) {
    newReportRequest.remind_again_times = 2;
  }

  if (newReportRequest.remind_again_minutes === 0) {
    newReportRequest.remind_again_minutes = 30;
  }

  if (newReportRequest.reminder_shown_times < newReportRequest.remind_again_times) {
    newReportRequest.remind_later = 1
  } else {
    newReportRequest.remind_later = 0
  }

  updateStatement('report_request',
    [
      {
        name: 'remind_again_times',
        value: {
          longValue: newReportRequest.remind_again_times
        }
      },{
        name: 'remind_again_minutes',
        value: {
          longValue: newReportRequest.remind_again_minutes
        }
      },{
        name: 'remind_later',
        value: {
          longValue: newReportRequest.remind_later
        }
      }
    ],
    [
      {
        name: 'id',
        value: {
          stringValue: newReportRequest.id
        }
      }
    ]
  )
}