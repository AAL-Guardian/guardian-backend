export interface Client {
  id: string;
  version: number;
  person_id: string;
  date_created: string;
  date_modified: string;
  date_deleted: string;
  directId: string;
  provider: string;
  showSensorHistory: number;
  isTestClient: number;
  hiddenDescription: string;
  log: number;
  organisation_id: number;
  date_last_visit: string;
  show_demo_sensors: number;
  NHG_link_needed: number;
  has_medguide_medido: number;
  department_id: number;
}