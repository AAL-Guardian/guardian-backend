import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({

});
if (process.env.IS_OFFLINE === 'true') {
  s3Client.config.credentialDefaultProvider = require('@aws-sdk/credential-provider-ini').fromIni({ profile: process.env.profile })
}

export async function getPutSignedUrl(filepath: string) {
  const signedUrl = await getSignedUrl(s3Client, new PutObjectCommand({
    Bucket: process.env.bucketName,
    Key: filepath
  }), { expiresIn: 3600 });
  return signedUrl;
}

export function getS3() {
  return s3Client;
}