const fs = require('fs');

function transformToLightMode(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Make sure we only replace in the JSX return block to avoid messing up logic
    const returnIndex = content.indexOf('  return (\n    <div className="min-h-screen');
    if (returnIndex === -1) {
        console.log(`Could not find return block in ${filePath}`);
        return;
    }

    const beforeReturn = content.substring(0, returnIndex);
    let jsx = content.substring(returnIndex);

    // Styling Replacements
    jsx = jsx.replace(/bg-slate-900/g, 'bg-slate-50');
    jsx = jsx.replace(/text-white/g, 'text-slate-900');
    jsx = jsx.replace(/bg-white\/5/g, 'bg-white shadow-sm');
    jsx = jsx.replace(/border-white\/10/g, 'border-slate-200');
    jsx = jsx.replace(/border-white\/5/g, 'border-slate-200');
    jsx = jsx.replace(/border-white\/20/g, 'border-slate-300');
    jsx = jsx.replace(/text-slate-400/g, 'text-slate-500');
    jsx = jsx.replace(/text-slate-300/g, 'text-slate-700');
    jsx = jsx.replace(/bg-slate-800/g, 'bg-white');
    jsx = jsx.replace(/rgba\(255,255,255,0.05\)/g, 'rgba(0,0,0,0.05)');
    jsx = jsx.replace(/bg-black\/20/g, 'bg-slate-100');
    jsx = jsx.replace(/bg-white\/10/g, 'bg-slate-50');
    jsx = jsx.replace(/bg-black\/30/g, 'bg-slate-100 border border-slate-200');
    
    // Fix Header Nav background
    jsx = jsx.replace(/bg-slate-50\/80/g, 'bg-white/80'); 

    fs.writeFileSync(filePath, beforeReturn + jsx);
    console.log(`Updated ${filePath} to light mode`);
}

transformToLightMode('src/app/tournament/[id]/page.js');
transformToLightMode('src/app/dashboard/tournaments/[id]/page.js');
