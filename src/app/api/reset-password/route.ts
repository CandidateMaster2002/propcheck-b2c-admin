import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Admin from '@/lib/models/Admin';
import bcrypt from 'bcrypt';

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const { email, otp, newPassword } = await req.json();

    const admin = await Admin.findOne({ email: email.toLowerCase() });
    if (!admin) {
      return NextResponse.json({ status: false, message: 'Invalid request' }, { status: 400 });
    }

    if (!admin.resetPassword || admin.resetPassword.otp !== otp) {
      return NextResponse.json({ status: false, message: 'Invalid OTP' }, { status: 400 });
    }

    if (new Date() > new Date(admin.resetPassword.expiresAt)) {
      return NextResponse.json({ status: false, message: 'OTP expired' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    await Admin.findByIdAndUpdate(admin._id, {
      password: hashedPassword,
      resetPassword: null,
      passwordLastUpdate: new Date()
    });

    return NextResponse.json({
      status: true,
      message: 'Password reset successfully'
    });
  } catch (error: any) {
    return NextResponse.json({ status: false, message: error.message }, { status: 500 });
  }
}
