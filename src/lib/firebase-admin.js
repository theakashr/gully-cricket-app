import admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // Ensure private key newlines are parsed correctly from the environment variable
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
      databaseURL: "https://cricket-app-54fea-default-rtdb.asia-southeast1.firebasedatabase.app"
    });
    console.log("Firebase Admin Initialized Successfully");
  } catch (error) {
    console.error("Firebase Admin Initialization Error", error.stack);
  }
}

const adminDb = admin.database();
const adminAuth = admin.auth();

export { adminDb, adminAuth };
