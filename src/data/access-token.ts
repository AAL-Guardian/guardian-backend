import { v4 } from "uuid";
import { executeStatement } from "./dao";

export const saveRobotClient = () => saveClient('RobotClient');
export const saveSeniorClient = () => saveClient('SeniorAppClient');

const saveClient = async (scope: string): Promise<string> => {
  const token = v4();
  const res = await executeStatement("INSERT INTO access_token (scope, token, valid) values (:scope, :token, :valid)", [
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
  console.log('queryRes', res)
  return res?.records?.length > 0;
}