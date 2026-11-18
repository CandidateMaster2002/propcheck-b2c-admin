import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import UserManagement from '@/lib/models/UserManagement';
import { getUserFromToken } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromToken();
    if (!user) return NextResponse.json({ status: false, message: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const doc = await UserManagement.findById(params.id);
    if (!doc) return NextResponse.json({ status: false, message: 'User not found' }, { status: 404 });

    return NextResponse.json({ status: true, data: doc });
  } catch (error: any) {
    return NextResponse.json({ status: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromToken();
    if (!user) return NextResponse.json({ status: false, message: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const body = await req.json();

    const updated = await UserManagement.findByIdAndUpdate(
      params.id,
      { $set: body },
      { new: true }
    );
    if (!updated) return NextResponse.json({ status: false, message: 'User not found' }, { status: 404 });

    return NextResponse.json({ status: true, message: 'User updated', data: updated });
  } catch (error: any) {
    return NextResponse.json({ status: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromToken();
    if (!user) return NextResponse.json({ status: false, message: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const updated = await UserManagement.findByIdAndUpdate(
      params.id,
      { $set: { status: 'Delete' } },
      { new: true }
    );
    if (!updated) return NextResponse.json({ status: false, message: 'User not found' }, { status: 404 });

    return NextResponse.json({ status: true, message: 'User deleted' });
  } catch (error: any) {
    return NextResponse.json({ status: false, message: error.message }, { status: 500 });
  }
}
