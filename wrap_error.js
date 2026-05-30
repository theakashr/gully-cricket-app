
const fs = require('fs');
function wrap(file) {
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes('import { ErrorBoundary }')) {
    content = content.replace('import Link', 'import { ErrorBoundary } from \'@/components/ErrorBoundary\';\nimport Link');
  }
  content = content.replace('<ResponsiveContainer', '<ErrorBoundary><ResponsiveContainer');
  content = content.replace('</ResponsiveContainer>', '</ResponsiveContainer></ErrorBoundary>');
  fs.writeFileSync(file, content);
}
wrap('src/app/tournament/[id]/page.js');
wrap('src/app/dashboard/tournaments/[id]/page.js');

