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

const adminDb = admin.firestore();

async function testFirestore() {
  try {
    console.log("Testing Firestore Connection...");
    const snapshot = await adminDb.collection('users').limit(1).get();
    console.log("Firestore connection SUCCESSFUL!");
    console.log("Found users:", snapshot.size);
  } catch (error) {
    console.error("Firestore connection FAILED:");
    console.error(error.message);
  }
}

testFirestore();
