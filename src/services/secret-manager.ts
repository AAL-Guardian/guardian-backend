import { GetSecretValueCommand, SecretsManagerClient, SecretsManagerClientConfig } from "@aws-sdk/client-secrets-manager";
import { fromIni } from "@aws-sdk/credential-provider-ini";

const secretsManagerOptions = {
  region: process.env.AWS_REGION,
} as SecretsManagerClientConfig;

if (process.env.IS_OFFLINE === 'true') {
  secretsManagerOptions.credentials = fromIni({ profile: process.env.profile });
  secretsManagerOptions.endpoint = async () => ({
    hostname: `secretsmanager.${secretsManagerOptions.region}.amazonaws.com`,
    port: undefined,
    protocol: 'https:',
    path: '/',
    query: undefined
  })
}

const secretsManagerClient = new SecretsManagerClient(secretsManagerOptions);

export async function getSecret(secretId: string) {
  try {
    const secret = await secretsManagerClient.send(new GetSecretValueCommand({
      SecretId: secretId
    }));

    return JSON.parse(secret.SecretString)
  } catch(e) {
    console.log(e);
    throw e;
  }
}

export async function getDbSecret(): Promise<{
  username: string
  password: string
  engine: string
  host: string
  port: number
  dbClusterIdentifier: string
}> {
  return await getSecret(process.env.secretArn);
}