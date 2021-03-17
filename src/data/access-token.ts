import { v4 } from "uuid";
import { executeStatement, insertStatement } from "./dao";
import { AccessToken } from "./models/access-token.model";

export const saveSeniorClient = async (assignment_id: number): Promise<string> => {
  const token = v4();
  const scope = 'SeniorApp';
  await insertStatement("access_token", [
    {
      name: 'robot_assignment_id',
      value: {
        longValue: assignment_id
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
      name: 'is_valid',
      value: {
        booleanValue: true
      }
    },
  ]);
  return token;
}

export async function checkTokenValidity(token: string): Promise<AccessToken> {
  const res = await executeStatement("SELECT * FROM access_token WHERE is_valid = true AND ifnull(expire, CURRENT_TIMESTAMP) >= CURRENT_TIMESTAMP AND token = :token", [
    {
      name: 'token',
      value: {
        stringValue: token
      }
    }
  ]) as any[];
  console.log('Token Validity Query');
  console.log(res);
  return res[0];
}