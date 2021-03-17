export interface AccessToken {
  id: number;
  robot_assignment_id: number;
  scope: string;
  token: string;
  expire: string;
  is_valid: boolean;
  creation_date: string;
  last_udpate: string;
}