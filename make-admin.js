const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
    databaseURL: "https://cricket-app-54fea-default-rtdb.asia-southeast1.firebasedatabase.app"
  });
}

const db = admin.database();

async function makeAllAdmins() {
  try {
    const usersRef = db.ref('users');
    const snapshot = await usersRef.once('value');
    if (snapshot.exists()) {
      const users = snapshot.val();
      for (const uid in users) {
        await db.ref(`users/${uid}`).update({ role: 'admin' });
        console.log(`Updated user ${uid} to admin`);
      }
      console.log('Successfully upgraded all users to Admin!');
    } else {
      console.log('No users found in database.');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit();
  }
}

makeAllAdmins();
