export interface Robot {
  serial_number: string;
  thing_name: string;
  topic: string;
  extra?: string;
  is_active: boolean;
  creation_date: string;
}