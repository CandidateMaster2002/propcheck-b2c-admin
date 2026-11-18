import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Admin from '@/lib/models/Admin';
import { getUserFromToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromToken();
    
    if (!user) {
      return NextResponse.json(
        { status: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    await dbConnect();

    const searchParams = req.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20');
    const page = parseInt(searchParams.get('page') || '1');
    const skip = (page - 1) * limit;
    const like = searchParams.get('like');

    let condition: any = { 
      role: { $ne: 'SuperAdmin' }, 
      status: { $ne: 'Delete' } 
    };

    if (like) {
      condition.$or = [
        { name: { $regex: like, $options: 'i' } },
        { email: { $regex: like, $options: 'i' } }
      ];
    }

    const [admins, totalDocs] = await Promise.all([
      Admin.find(condition, { 
        _id: 1, 
        adminId: '$_id', 
        name: 1, 
        email: 1, 
        status: 1 
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
      Admin.countDocuments(condition)
    ]);

    if (admins.length) {
      return NextResponse.json({
        status: true,
        message: 'Fetched admins successfully',
        data: admins,
        totalResult: totalDocs,
        limit
      });
    }

    return NextResponse.json(
      { status: false, message: 'Fetching failed', data: [] },
      { status: 400 }
    );

  } catch (error: any) {
    console.error('Get admins error:', error);
    return NextResponse.json(
      { status: false, message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  }
}
