declare global {
  var mongoose: {
    conn: any;
    promise: any;
  };

  namespace NodeJS {
    interface ProcessEnv {
      MONGODB_URI: string;
      JWT_SECRET: string;
      SALT_SECRET: string;
      AWS_ACCESS_KEY: string;
      AWS_SECRET_KEY: string;
      AWS_REGION: string;
      SENDGRID_API_KEY: string;
      RAZORPAY_KEY_ID: string;
      RAZORPAY_KEY_SECRET: string;
      NODE_ENV: 'development' | 'production';
    }
  }
}

export {};
