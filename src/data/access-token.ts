import { v4 } from "uuid";
import { executeStatement } from "./dao";

export const saveRobotClient = (robotCode: string) => saveClient('RobotClient', robotCode);
export const saveSeniorClient = (robotCode: string) => saveClient('SeniorAppClient', robotCode);

const saveClient = async (scope: string, robotCode: string): Promise<string> => {
  const token = v4();
  const res = await executeStatement("INSERT INTO access_token (scope, robot_code, token, valid) values (:scope, :robotCode, :token, :valid)", [
    {
      name: 'scope',
      value: {
        stringValue: scope
      }
    },
    {
      name: 'robotCode',
      value: {
        stringValue: robotCode
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