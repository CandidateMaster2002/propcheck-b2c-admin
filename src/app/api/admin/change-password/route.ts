import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Admin from '@/lib/models/Admin';
import { getUserFromToken } from '@/lib/auth';
import bcrypt from 'bcrypt';

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromToken();
    if (!user || !user._id) {
      return NextResponse.json({ status: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ status: false, message: 'Current and new password are required' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ status: false, message: 'New password must be at least 6 characters' }, { status: 400 });
    }

    await dbConnect();
    const admin = await Admin.findById(user._id);
    if (!admin) {
      return NextResponse.json({ status: false, message: 'Admin not found' }, { status: 404 });
    }

    const isMatch = await bcrypt.compare(currentPassword, admin.password);
    if (!isMatch) {
      return NextResponse.json({ status: false, message: 'Current password is incorrect' }, { status: 400 });
    }

    admin.password = await bcrypt.hash(newPassword, 10);
    await admin.save();

    return NextResponse.json({ status: true, message: 'Password changed successfully' });
  } catch (error: any) {
    return NextResponse.json({ status: false, message: error.message }, { status: 500 });
  }
}
