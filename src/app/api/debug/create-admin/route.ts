import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Admin from '@/lib/models/Admin';

export async function POST(req: Request) {
  try {
    await dbConnect();
    
    const body = await req.json();
    const { email, password, name, role } = body;

    if (!email || !password) {
      return NextResponse.json(
        { status: false, message: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: email.toLowerCase() });
    if (existingAdmin) {
      return NextResponse.json(
        { status: false, message: 'Admin with this email already exists' },
        { status: 400 }
      );
    }

    // Create new admin
    const admin = new Admin({
      email: email.toLowerCase(),
      password: password,
      name: name || 'Admin',
      role: role || 'SuperAdmin',
      status: 'Enable'
    });

    await admin.save();

    return NextResponse.json(
      { status: true, message: 'Admin created successfully', email: admin.email },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('❌ Error creating admin:', error);
    return NextResponse.json(
      { status: false, message: 'Error creating admin', error: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    await dbConnect();
    
    const admins = await Admin.find({}, { password: 0 }).sort({ createdAt: -1 });
    
    return NextResponse.json(
      { 
        status: true, 
        count: admins.length,
        admins: admins 
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('❌ Error listing admins:', error);
    return NextResponse.json(
      { status: false, message: 'Error listing admins', error: error.message },
      { status: 500 }
    );
  }
}
