const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const adminAuth = admin.auth();
const adminDb = admin.firestore();

async function createAdmin() {
  const email = "admin@gully.com";
  const password = "admin123";

  try {
    let userRecord;
    try {
      userRecord = await adminAuth.getUserByEmail(email);
      console.log('User already exists:', userRecord.uid);
      
      // Update password just in case
      await adminAuth.updateUser(userRecord.uid, { password: password });
      console.log('Password reset to admin123');
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        userRecord = await adminAuth.createUser({
          email: email,
          password: password,
          displayName: 'Super Admin',
        });
        console.log('Successfully created new admin user:', userRecord.uid);
      } else {
        throw error;
      }
    }

    await adminAuth.setCustomUserClaims(userRecord.uid, { admin: true });

    await adminDb.collection('users').doc(userRecord.uid).set({
      email: email,
      role: 'admin',
      createdAt: new Date().toISOString()
    }, { merge: true });

    console.log("Admin setup complete. You can now login!");
  } catch (error) {
    console.error("Setup Error:", error);
  }
}

createAdmin();
