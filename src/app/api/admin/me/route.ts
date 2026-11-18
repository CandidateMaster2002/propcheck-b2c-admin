import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Admin from '@/lib/models/Admin';
import { verifyToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ status: false, message: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload || !payload._id) {
      return NextResponse.json({ status: false, message: 'Invalid token' }, { status: 401 });
    }

    await dbConnect();
    const admin = await Admin.findById(payload._id).select('-password');

    if (!admin || admin.status === 'Disable') {
      return NextResponse.json({ status: false, message: 'Admin not found' }, { status: 401 });
    }

    return NextResponse.json({ status: true, data: admin });

  } catch (error: any) {
    console.error('[/api/admin/me] Error:', error.message, error.stack);
    return NextResponse.json({ status: false, message: 'Internal server error', error: error.message }, { status: 500 });
  }
}
