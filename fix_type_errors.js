const fs = require('fs');

function applyFixes(file) {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');

  // Fix stats null check
  content = content.replace(
    /Object\.entries\(innings\.batting\)\.forEach\(\(\[playerId, stats\]\) => \{/g,
    'Object.entries(innings.batting).forEach(([playerId, stats]) => { if (!stats) return;'
  );
  content = content.replace(
    /Object\.entries\(innings\.bowling\)\.forEach\(\(\[playerId, stats\]\) => \{/g,
    'Object.entries(innings.bowling).forEach(([playerId, stats]) => { if (!stats) return;'
  );

  // Fix team.code.substring
  content = content.replace(/\{team\.code\.substring\(0, 2\)\}/g, '{team.code ? team.code.substring(0, 2) : "UN"}');

  // Fix orangeLeader.name.charAt
  content = content.replace(/\{orangeLeader\.name\.charAt\(0\)\}/g, '{orangeLeader.name ? orangeLeader.name.charAt(0) : "U"}');

  // Fix purpleLeader.name.charAt
  content = content.replace(/\{purpleLeader\.name\.charAt\(0\)\}/g, '{purpleLeader.name ? purpleLeader.name.charAt(0) : "U"}');

  // Fix mvpLeader.name.charAt
  content = content.replace(/\{mvpLeader\.name\.charAt\(0\)\}/g, '{mvpLeader.name ? mvpLeader.name.charAt(0) : "U"}');

  fs.writeFileSync(file, content);
  console.log('Fixed', file);
}

applyFixes('src/app/tournament/[id]/page.js');
applyFixes('src/app/dashboard/tournaments/[id]/page.js');
