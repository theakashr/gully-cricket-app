import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export async function GET() {
  try {
    const email = "admin@skcc.com";
    const password = "admin123";

    // 1. Check if admin exists
    let userRecord;
    try {
      userRecord = await adminAuth.getUserByEmail(email);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        // 2. Create the user
        userRecord = await adminAuth.createUser({
          email: email,
          password: password,
          displayName: 'Super Admin',
        });
      } else {
        throw error;
      }
    }

    // 3. Set custom claim (Optional but good for secure backend checks)
    await adminAuth.setCustomUserClaims(userRecord.uid, { admin: true });

    // 4. Create the Realtime Database 'users' node for Context/Frontend RBAC
    await adminDb.ref(`users/${userRecord.uid}`).set({
      email: email,
      role: 'admin',
      createdAt: new Date().toISOString()
    });

    return NextResponse.json({ 
      success: true, 
      message: "Admin setup complete! You can now log in.",
      credentials: {
        email: email,
        password: password
      }
    });

  } catch (error) {
    console.error("Setup Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
