import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { ref, get } from 'firebase/database';

export const dynamic = 'force-dynamic';
export const revalidate = 0; // Disable Next.js internal static cache

export async function GET(request, { params }) {
  const { id: matchId } = await params;
  try {
    const matchSnap = await get(ref(db, `matches/${matchId}`));
    if (!matchSnap.exists()) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }
    
    const matchData = matchSnap.val();
    
    let teamA = { shortName: 'TBA', name: 'Unknown Team A' };
    let teamB = { shortName: 'TBA', name: 'Unknown Team B' };
    let tournament = { name: 'Unknown Tournament' };

    if (matchData.teamA) {
      const taSnap = await get(ref(db, `teams/${matchData.teamA}`));
      if (taSnap.exists()) teamA = { id: matchData.teamA, ...taSnap.val() };
    }
    
    if (matchData.teamB) {
      const tbSnap = await get(ref(db, `teams/${matchData.teamB}`));
      if (tbSnap.exists()) teamB = { id: matchData.teamB, ...tbSnap.val() };
    }

    if (matchData.tournamentId) {
      const tSnap = await get(ref(db, `tournaments/${matchData.tournamentId}`));
      if (tSnap.exists()) tournament = tSnap.val();
    }

    const payload = {
      match: matchData,
      teamA,
      teamB,
      tournament
    };

    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': 'public, s-maxage=2, stale-while-revalidate=4',
      }
    });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: 'Failed to fetch match data' }, { status: 500 });
  }
}
