import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Admin from '@/lib/models/Admin';
import { generateToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const body = await req.json();
    const { email, password } = body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { status: false, message: 'Please enter valid email' },
        { status: 400 }
      );
    }

    const admin = await Admin.findOne({ email: email.toLowerCase() });

    if (!admin) {
      return NextResponse.json(
        { status: false, message: 'Admin not found' },
        { status: 400 }
      );
    }

    if (admin.status === 'Disable') {
      return NextResponse.json(
        { status: false, message: 'Unauthorised, Please contact Admin' },
        { status: 401 }
      );
    }

    const isPasswordValid = await admin.comparePassword(password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { status: false, message: 'Admin password not matched' },
        { status: 400 }
      );
    }

    const adminData = admin.toJSON();
    delete adminData.password;
    
    const token = await generateToken({
      _id: adminData._id.toString(),
      email: adminData.email,
      role: adminData.role
    });

    adminData.token = token;

    const response = NextResponse.json(
      {
        status: true,
        message: 'Login successful',
        data: adminData
      },
      { status: 200 }
    );

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 86400
    });

    return response;

  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { status: false, message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  }
}
