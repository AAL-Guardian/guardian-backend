export interface Appointment {
  id: string,
  version: number,
  title: string,
  description: string,
  date_start: string,
  date_finish: string,
  date_created: string,
  date_deleted: string,
  created_by: string,
  client: string,
  date_updated: string,
  weekdays: string,
  frequencytype: string,
  date_recurrency_end: string,
}