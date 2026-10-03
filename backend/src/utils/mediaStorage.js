import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

const required = ['MEDIA_BUCKET', 'MEDIA_REGION', 'MEDIA_ACCESS_KEY_ID', 'MEDIA_SECRET_ACCESS_KEY', 'MEDIA_PUBLIC_BASE_URL'];

const getConfig = () => {
  for (const name of required) {
    if (!process.env[name]) {
      const error = new Error(`${name} is required for persistent media storage`);
      error.statusCode = 500;
      throw error;
    }
  }

  if (process.env.NODE_ENV === 'production' && !process.env.MEDIA_PUBLIC_BASE_URL.startsWith('https://')) {
    const error = new Error('MEDIA_PUBLIC_BASE_URL must use HTTPS in production');
    error.statusCode = 500;
    throw error;
  }

  return {
    bucket: process.env.MEDIA_BUCKET,
    region: process.env.MEDIA_REGION,
    accessKeyId: process.env.MEDIA_ACCESS_KEY_ID,
    secretAccessKey: process.env.MEDIA_SECRET_ACCESS_KEY,
    endpoint: process.env.MEDIA_ENDPOINT || undefined,
    publicBaseUrl: process.env.MEDIA_PUBLIC_BASE_URL.replace(/\/+$/, ''),
  };
};

let client;

const getClient = () => {
  if (client) return client;
  const config = getConfig();
  client = new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle: process.env.MEDIA_FORCE_PATH_STYLE === 'true',
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
  return client;
};

export const buildPublicUrl = (key) => {
  const { publicBaseUrl } = getConfig();
  return `${publicBaseUrl}/${key.split('/').map(encodeURIComponent).join('/')}`;
};

export const uploadObject = async ({ key, body, contentType, sizeBytes }) => {
  const { bucket } = getConfig();
  await getClient().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      ContentLength: sizeBytes,
      CacheControl: 'public, max-age=31536000, immutable',
    })
  );
  return buildPublicUrl(key);
};

export const deleteObject = async (key) => {
  const { bucket } = getConfig();
  await getClient().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
};

export const assertStorageConfigured = () => {
  getConfig();
};
