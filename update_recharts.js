const fs = require('fs');

function updateCharts(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Add imports
    content = content.replace(
        "import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';",
        "import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell, ReferenceLine, Label } from 'recharts';"
    );

    // Add chart state
    content = content.replace(
        "const [chartOpen, setChartOpen] = useState(false);",
        "const [chartOpen, setChartOpen] = useState(false);\n  const [activeChartTab, setActiveChartTab] = useState('worm');"
    );

    // Add data generation logic
    const dataLogicStr = `  // Transform WORM_DATA`;
    const newLogicStr = `  // Transform MANHATTAN_DATA
  let MANHATTAN_DATA = [];
  if (analyticsData) {
     const maxOvers = selectedMatch?.overs || 20;
     for(let o=1; o<=maxOvers; o++) {
        let entry = { over: o };
        if (o <= Math.ceil(analyticsData.inn1.oversPlayed)) {
           entry[analyticsData.inn1.teamName] = analyticsData.inn1.runsPerOver[o-1] || 0;
        }
        if (selectedMatch?.currentInnings === 2 && o <= Math.ceil(analyticsData.inn2.oversPlayed)) {
           entry[analyticsData.inn2.teamName] = analyticsData.inn2.runsPerOver[o-1] || 0;
        }
        MANHATTAN_DATA.push(entry);
     }
  }

  // Transform PROJECTION_DATA
  let PROJECTION_DATA = [];
  if (analyticsData) {
      const inn = selectedMatch?.currentInnings === 1 ? analyticsData.inn1 : analyticsData.inn2;
      const oversPlayed = Math.max(0.1, inn.oversPlayed);
      const crr = inn.totalRuns / oversPlayed;
      const remOvers = Math.max(0, (selectedMatch?.overs || 20) - oversPlayed);
      
      PROJECTION_DATA = [
         { name: 'Current RR (' + crr.toFixed(1) + ')', projected: Math.round(inn.totalRuns + crr * remOvers), fill: '#3b82f6' },
         { name: 'At 8 RPO', projected: Math.round(inn.totalRuns + 8 * remOvers), fill: '#8b5cf6' },
         { name: 'At 10 RPO', projected: Math.round(inn.totalRuns + 10 * remOvers), fill: '#ec4899' },
         { name: 'At 12 RPO', projected: Math.round(inn.totalRuns + 12 * remOvers), fill: '#f43f5e' }
      ];
  }

  // Transform WORM_DATA`;
  
    content = content.replace(dataLogicStr, newLogicStr);

    // Custom Chart Tooltip
    const tooltipLogic = `const CustomTooltip = ({ active, payload, label }) => {`;
    const newTooltipLogic = `const CustomTooltip = ({ active, payload, label, chartType }) => {
    if (active && payload && payload.length) {
      if (chartType === 'projections') {
         return (
            <div className="bg-white/95 border border-slate-200 rounded-lg px-3 py-2 shadow-xl">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{label}</p>
              <p className="text-sm font-black text-slate-800">Projected: {payload[0].value}</p>
            </div>
         );
      }
      return (
        <div className="bg-white/95 border border-slate-200 rounded-lg px-3 py-2 shadow-xl">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Over {label}</p>
          {payload.map((entry, i) => (
            <p key={i} className="text-xs font-bold" style={{ color: entry.color || entry.fill }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const oldCustomTooltip = ({ active, payload, label }) => {`;
  
    content = content.replace(tooltipLogic, newTooltipLogic);
    content = content.replace(`<Tooltip content={<CustomTooltip />} />`, `<Tooltip content={<CustomTooltip chartType="worm" />} />`);

    // Replace accordion layout
    const oldAccordion = `{/* Worm Chart Accordion */}
          {analyticsData && (
          <div className="border-t border-slate-200">
            <button
              onClick={() => setChartOpen(!chartOpen)}
              className="w-full flex items-center justify-between px-5 py-3 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
            >
              <span className="flex items-center gap-2">
                <TrendingUp size={14} /> Cumulative Runs Comparison (Worm Chart)
              </span>
              {chartOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            <AnimatePresence>
              {chartOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden bg-slate-100"
                >
                  <div className="px-5 pb-5 pt-3">
                    <div className="h-56 md:h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={WORM_DATA} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="gradRCB" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="gradCSK" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                          <XAxis dataKey="over" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={{ stroke: 'rgba(0,0,0,0.05)' }} />
                          <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={{ stroke: 'rgba(0,0,0,0.05)' }} />
                          <Tooltip content={<CustomTooltip chartType="worm" />} />
                          <Legend
                            verticalAlign="top"
                            height={30}
                            formatter={(value) => <span className="text-xs font-bold text-slate-700">{value}</span>}
                          />
                          <Area type="monotone" dataKey={analyticsData.inn1.teamName} stroke="#3b82f6" fillOpacity={1} fill="url(#gradRCB)" strokeWidth={2.5} dot={false} />
                          {selectedMatch.currentInnings === 2 && (
                             <Area type="monotone" dataKey={analyticsData.inn2.teamName} stroke="#10b981" fillOpacity={1} fill="url(#gradCSK)" strokeWidth={2.5} dot={false} />
                          )}
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          )}`;
          
    const newAccordion = `{/* Live Match Analytics Accordion */}
          {analyticsData && (
          <div className="border-t border-slate-200">
            <button
              onClick={() => setChartOpen(!chartOpen)}
              className="w-full flex items-center justify-between px-5 py-3 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
            >
              <span className="flex items-center gap-2">
                <BarChart3 size={14} /> Live Match Analytics
              </span>
              {chartOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            <AnimatePresence>
              {chartOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden bg-slate-50"
                >
                  <div className="px-4 pt-2 border-b border-slate-200/50 flex gap-4">
                     <button onClick={() => setActiveChartTab('worm')} className={\`pb-2 text-[10px] font-black uppercase tracking-widest transition-colors \${activeChartTab === 'worm' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400 hover:text-slate-600'}\`}>Worm</button>
                     <button onClick={() => setActiveChartTab('manhattan')} className={\`pb-2 text-[10px] font-black uppercase tracking-widest transition-colors \${activeChartTab === 'manhattan' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400 hover:text-slate-600'}\`}>Manhattan</button>
                     <button onClick={() => setActiveChartTab('projections')} className={\`pb-2 text-[10px] font-black uppercase tracking-widest transition-colors \${activeChartTab === 'projections' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400 hover:text-slate-600'}\`}>Projections</button>
                  </div>
                  
                  <div className="px-5 pb-5 pt-4">
                    <div className="h-56 md:h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        {activeChartTab === 'worm' ? (
                            <AreaChart data={WORM_DATA} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                              <defs>
                                <linearGradient id="gradRCB" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="gradCSK" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                              <XAxis dataKey="over" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={{ stroke: 'rgba(0,0,0,0.05)' }} />
                              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={{ stroke: 'rgba(0,0,0,0.05)' }} />
                              <Tooltip content={<CustomTooltip chartType="worm" />} />
                              <Legend verticalAlign="top" height={30} formatter={(value) => <span className="text-xs font-bold text-slate-700">{value}</span>} />
                              <Area type="monotone" dataKey={analyticsData.inn1.teamName} stroke="#3b82f6" fillOpacity={1} fill="url(#gradRCB)" strokeWidth={2.5} dot={false} />
                              {selectedMatch.currentInnings === 2 && (
                                 <Area type="monotone" dataKey={analyticsData.inn2.teamName} stroke="#10b981" fillOpacity={1} fill="url(#gradCSK)" strokeWidth={2.5} dot={false} />
                              )}
                            </AreaChart>
                        ) : activeChartTab === 'manhattan' ? (
                            <BarChart data={MANHATTAN_DATA} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                              <XAxis dataKey="over" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={{ stroke: 'rgba(0,0,0,0.05)' }} />
                              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={{ stroke: 'rgba(0,0,0,0.05)' }} />
                              <Tooltip content={<CustomTooltip chartType="manhattan" />} />
                              <Legend verticalAlign="top" height={30} formatter={(value) => <span className="text-xs font-bold text-slate-700">{value}</span>} />
                              <Bar dataKey={analyticsData.inn1.teamName} fill="#3b82f6" radius={[4,4,0,0]} barSize={8} />
                              {selectedMatch.currentInnings === 2 && (
                                <Bar dataKey={analyticsData.inn2.teamName} fill="#10b981" radius={[4,4,0,0]} barSize={8} />
                              )}
                            </BarChart>
                        ) : (
                            <BarChart data={PROJECTION_DATA} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" horizontal={false} />
                              <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={{ stroke: 'rgba(0,0,0,0.05)' }} />
                              <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: '#64748b' }} width={90} axisLine={{ stroke: 'rgba(0,0,0,0.05)' }} />
                              <Tooltip content={<CustomTooltip chartType="projections" />} />
                              {selectedMatch.currentInnings === 2 && analyticsData.inn1.totalRuns && (
                                 <ReferenceLine x={analyticsData.inn1.totalRuns} stroke="#ef4444" strokeDasharray="3 3">
                                   <Label value="Target" position="top" fill="#ef4444" fontSize={10} fontWeight="bold" />
                                 </ReferenceLine>
                              )}
                              <Bar dataKey="projected" radius={[0,4,4,0]} barSize={20}>
                                {PROJECTION_DATA.map((entry, index) => (
                                  <Cell key={\`cell-\${index}\`} fill={entry.fill} />
                                ))}
                              </Bar>
                            </BarChart>
                        )}
                      </ResponsiveContainer>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          )}`;
          
    content = content.replace(oldAccordion, newAccordion);

    fs.writeFileSync(filePath, content);
}

try {
    updateCharts('src/app/tournament/[id]/page.js');
    updateCharts('src/app/dashboard/tournaments/[id]/page.js');
    console.log("Successfully updated recharts UI");
} catch (e) {
    console.error("Failed", e);
}
