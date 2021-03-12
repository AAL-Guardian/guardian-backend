export interface Robot {
  serial_number: string;
  thing_name: string;
  topic: string;
  extra?: string;
  active: boolean;
  creation_date: string;
}