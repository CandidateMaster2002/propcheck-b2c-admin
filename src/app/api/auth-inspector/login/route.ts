import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import dbConnect from '@/lib/mongodb';
import Inspector from '@/lib/models/Inspector';
import { generateToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const body = await req.json();
    const identifier = String(body.email || body.phone || body.userName || '').trim();
    const password = String(body.password || '');

    if (!identifier || !password) {
      return NextResponse.json(
        { statusCode: 400, status: false, message: 'Email/phone and password are required' },
        { status: 400 }
      );
    }

    const inspector: any = await Inspector.findOne({
      $or: [
        { email: { $regex: new RegExp(`^${identifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
        { phone: identifier },
      ],
      status: { $ne: 'Delete' },
    }).lean();

    if (!inspector) {
      return NextResponse.json(
        { statusCode: 401, status: false, message: 'Inspector not found' },
        { status: 401 }
      );
    }

    if (inspector.status === 'Disable') {
      return NextResponse.json(
        { statusCode: 403, status: false, message: 'Account is disabled' },
        { status: 403 }
      );
    }

    const isMatch = await bcrypt.compare(password, inspector.password || '');
    if (!isMatch) {
      return NextResponse.json(
        { statusCode: 401, status: false, message: 'Invalid password' },
        { status: 401 }
      );
    }

    const rawRole = Array.isArray(inspector.role)
      ? inspector.role[0]
      : (inspector.role || 'External Inspector');
    const normalizedRole = rawRole === 'Inspector' ? 'External Inspector' : rawRole;

    const token = await generateToken({
      id: String(inspector._id),
      email: inspector.email,
      role: normalizedRole,
      userName: inspector.userName || inspector.name || '',
    });

    return NextResponse.json({
      statusCode: 200,
      status: true,
      message: 'Login successful',
      data: {
        _id: String(inspector._id),
        email: inspector.email,
        userName: inspector.userName || inspector.name || '',
        phone: inspector.phone || '',
        role: normalizedRole,
        token,
        profileImage: inspector.profileImage || '',
        city: inspector.city || '',
        state: inspector.state || '',
        pincode: inspector.pincode || '',
        status: inspector.status || 'Enable',
      },
    });
  } catch (error: any) {
    console.error('[auth-inspector/login]', error);
    return NextResponse.json(
      { statusCode: 500, status: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
