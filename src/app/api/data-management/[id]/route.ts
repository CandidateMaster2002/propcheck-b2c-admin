import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import DataManagement from '@/lib/models/DataManagement';
import { getUserFromToken } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromToken();
    if (!user) return NextResponse.json({ status: false, message: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const { id } = await context.params;

    const item = await DataManagement.findById(id);
    if (!item) {
      return NextResponse.json({ status: false, message: 'Item not found' }, { status: 404 });
    }

    return NextResponse.json({ status: true, data: item });
  } catch (error: any) {
    return NextResponse.json({ status: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromToken();
    if (!user) return NextResponse.json({ status: false, message: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const { id } = await context.params;
    const body = await req.json();

    const item = await DataManagement.findByIdAndUpdate(id, body, { new: true });
    if (!item) {
      return NextResponse.json({ status: false, message: 'Item not found' }, { status: 404 });
    }

    return NextResponse.json({ status: true, message: 'Item updated', data: item });
  } catch (error: any) {
    return NextResponse.json({ status: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromToken();
    if (!user) return NextResponse.json({ status: false, message: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const { id } = await context.params;

    const item = await DataManagement.findByIdAndUpdate(id, { status: 'Inactive' }, { new: true });
    if (!item) {
      return NextResponse.json({ status: false, message: 'Item not found' }, { status: 404 });
    }

    return NextResponse.json({ status: true, message: 'Item deleted' });
  } catch (error: any) {
    return NextResponse.json({ status: false, message: error.message }, { status: 500 });
  }
}
