import { NextResponse } from 'next/server';

export async function GET() {
  const maskSecret = (secret: string | undefined) => {
    if (!secret) return '❌ NOT SET';
    if (secret.length <= 8) return '***';
    return `${secret.substring(0, 4)}...${secret.substring(secret.length - 4)}`;
  };

  const config = {
    timestamp: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV,
    hostname: process.env.HOSTNAME,
    port: process.env.PORT,
    environment: {
      MONGODB_URI: process.env.MONGODB_URI ? maskSecret(process.env.MONGODB_URI) : '❌ NOT SET',
      MONGODB_URI_LENGTH: process.env.MONGODB_URI?.length || 0,
      MONGODB_URI_STARTS_WITH: process.env.MONGODB_URI?.substring(0, 20) || 'NOT SET',
      JWT_SECRET: maskSecret(process.env.JWT_SECRET),
      JWT_SECRET_LENGTH: process.env.JWT_SECRET?.length || 0,
      SALT_SECRET: maskSecret(process.env.SALT_SECRET),
      SALT_SECRET_LENGTH: process.env.SALT_SECRET?.length || 0,
      AWS_ACCESS_KEY: maskSecret(process.env.AWS_ACCESS_KEY),
      AWS_SECRET_KEY: maskSecret(process.env.AWS_SECRET_KEY),
      AWS_REGION: process.env.AWS_REGION || '❌ NOT SET',
      SENDGRID_API_KEY: maskSecret(process.env.SENDGRID_API_KEY),
      RAZORPAY_KEY_ID: maskSecret(process.env.RAZORPAY_KEY_ID),
      RAZORPAY_KEY_SECRET: maskSecret(process.env.RAZORPAY_KEY_SECRET),
    },
    allEnvKeys: Object.keys(process.env).filter(key => 
      !key.includes('PATH') && 
      !key.includes('npm_') && 
      !key.includes('_')
    ),
  };

  return NextResponse.json(config, { 
    status: 200,
    headers: {
      'Cache-Control': 'no-store, must-revalidate',
    }
  });
}
