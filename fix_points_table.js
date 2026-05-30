const fs = require('fs');

function fixPointsTable(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Replace short code with full name in points table
    const target = `<span className="text-sm font-black text-slate-900 block md:inline">{team.code}</span>
                              <span className="text-[10px] text-slate-500 font-medium md:ml-1.5 block md:inline truncate">{team.name}</span>`;
    const replacement = `<span className="text-sm font-black text-slate-900 block md:inline">{team.name}</span>
                              <span className="text-[10px] text-slate-500 font-medium md:ml-1.5 block md:inline truncate">{team.code}</span>`;
    
    content = content.replace(target, replacement);
    fs.writeFileSync(filePath, content);
}

fixPointsTable('src/app/tournament/[id]/page.js');
fixPointsTable('src/app/dashboard/tournaments/[id]/page.js');
console.log("Fixed points table");
