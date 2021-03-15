import { v4 } from "uuid";
import { executeStatement } from "./dao";

export const saveSeniorClient = async (assignment_id: number): Promise<string> => {
  const token = v4();
  const scope = 'SeniorApp';
  const res = await executeStatement("INSERT INTO access_token (robot_assignment_id, scope, token, valid) values (:robot_assignment_id, :scope, :token, :valid)", [
    {
      name: 'robot_assignment_id',
      value: {
        stringValue: scope
      }
    },
    {
      name: 'scope',
      value: {
        stringValue: scope
      }
    },
    {
      name: 'token',
      value: {
        stringValue: token
      }
    },
    {
      name: 'valid',
      value: {
        longValue: 1
      }
    },
  ]);
  console.log('insertRes', res);
  return token;
}

export async function checkTokenValidity(token: string): Promise<boolean> {
  const res = await executeStatement("SELECT 1 FROM access_token WHERE valid = 1 AND ifnull(expire, CURRENT_TIMESTAMP) >= CURRENT_TIMESTAMP AND token = :token", [
    {
      name: 'token',
      value: {
        stringValue: token
      }
    }
  ]);
  console.log('Token Validity Query');
  console.log(res.records);
  return res?.records?.length > 0;
}