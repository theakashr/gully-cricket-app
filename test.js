
const https = require('https');
https.get('https://cricket-app-54fea-default-rtdb.asia-southeast1.firebasedatabase.app/matches.json', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const json = JSON.parse(data);
    const matches = Object.values(json || {}).filter(m => m.tournamentId === '-OtZHGQ4CqbY2Nh871iA');
    console.log(JSON.stringify(matches, null, 2));
  });
});
