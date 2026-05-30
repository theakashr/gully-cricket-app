const fs = require('fs');

function fixFile(file) {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');
  
  const matchIdRegex = /\s*\/\/ Selected Match for Live Analytics\s*const \[selectedMatchId, setSelectedMatchId\] = useState\(null\);\s*useEffect\(\(\) => \{[\s\S]*?\}, \[matches\]\);/g;
  
  let matchIdCode = '';
  content = content.replace(matchIdRegex, (match) => {
    matchIdCode = match;
    return ''; // remove it
  });

  const chartOpenRegex = /\s*const \[chartOpen, setChartOpen\] = useState\(false\);\s*const \[activeChartTab, setActiveChartTab\] = useState\('worm'\);/g;
  let chartCode = '';
  content = content.replace(chartOpenRegex, (match) => {
    chartCode = match;
    return ''; // remove it
  });
  
  if (matchIdCode || chartCode) {
    content = content.replace(/\s*if \(loading\) \{/, (match) => {
      return matchIdCode + chartCode + '\n' + match;
    });
  }
  
  fs.writeFileSync(file, content);
  console.log('Fixed hooks in ' + file);
}

fixFile('src/app/tournament/[id]/page.js');
fixFile('src/app/dashboard/tournaments/[id]/page.js');
