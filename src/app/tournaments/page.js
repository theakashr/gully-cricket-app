"use client";
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, ChevronRight, Calendar, Search, MapPin, Users, Filter, ArrowRight } from 'lucide-react';
import { db } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';
import Link from 'next/link';

// Placeholder Stadium Backgrounds for dynamic UI
const STADIUM_BGS = [
  "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&q=80&w=1000",
  "https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&q=80&w=1000",
  "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&q=80&w=1000"
];

export default function PublicTournamentsPage() {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [formatFilter, setFormatFilter] = useState('All');
  const [locationFilter, setLocationFilter] = useState('All');

  useEffect(() => {
    const tournamentsRef = ref(db, 'tournaments');
    const unsubscribe = onValue(tournamentsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const tList = Object.entries(data).map(([id, val], index) => {
          // ADDING FALLBACK DATA FOR UI IF MISSING FROM DB
          return {
            id,
            format: val.format || 'T20',
            location: val.location || 'Local Ground, India',
            prizePool: val.prizePool || 'TBA',
            teamsRegistered: val.teamsRegistered || Math.floor(Math.random() * 10) + 6,
            maxTeams: val.maxTeams || 16,
            coverImage: val.coverImage || STADIUM_BGS[index % STADIUM_BGS.length],
            ...val,
          };
        });
        setTournaments(tList.reverse());
      } else {
        setTournaments([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Filter Logic
  const filteredTournaments = useMemo(() => {
    return tournaments.filter(t => {
      const matchSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.location.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === 'All' || t.status.toLowerCase() === statusFilter.toLowerCase();
      const matchFormat = formatFilter === 'All' || t.format.toLowerCase() === formatFilter.toLowerCase();
      // Simplify location filter logic for MVP
      const matchLocation = locationFilter === 'All' || t.location.toLowerCase().includes(locationFilter.toLowerCase());

      return matchSearch && matchStatus && matchFormat && matchLocation;
    });
  }, [tournaments, searchQuery, statusFilter, formatFilter, locationFilter]);

  // Extract Hero (First Active/Live)
  const heroTournament = useMemo(() => {
    if (filteredTournaments.length === 0) return null;
    const active = filteredTournaments.find(t => t.status === 'active' || t.status === 'live');
    return active || filteredTournaments[0];
  }, [filteredTournaments]);

  // Rest of the grid
  const gridTournaments = useMemo(() => {
    if (!heroTournament) return [];
    return filteredTournaments.filter(t => t.id !== heroTournament.id);
  }, [filteredTournaments, heroTournament]);

  // Helper for UI styling based on status
  const getStatusStyle = (status) => {
    const s = status?.toLowerCase() || '';
    if (s === 'active' || s === 'live') {
      return { 
        text: 'Live', 
        badge: 'bg-emerald-100 text-emerald-600 border-emerald-200',
        glow: 'group-hover:shadow-[0_0_30px_rgba(16,185,129,0.2)]',
        accent: 'text-emerald-500',
        button: 'bg-emerald-500 hover:bg-emerald-400 text-white',
        buttonText: 'View Dashboard'
      };
    }
    if (s === 'upcoming') {
      return { 
        text: 'Upcoming', 
        badge: 'bg-blue-100 text-blue-600 border-blue-200',
        glow: 'group-hover:shadow-[0_0_30px_rgba(59,130,246,0.2)]',
        accent: 'text-blue-500',
        button: 'bg-[var(--color-cricket-accent)] hover:bg-[var(--color-cricket-blue)] text-white',
        buttonText: 'Register Now'
      };
    }
    return { 
      text: 'Completed', 
      badge: 'bg-slate-100 text-slate-600 border-slate-200',
      glow: 'group-hover:shadow-[0_0_30px_rgba(148,163,184,0.2)]',
      accent: 'text-slate-500',
      button: 'bg-slate-700 hover:bg-slate-600 text-white',
      buttonText: 'View Stats'
    };
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-[var(--color-cricket-accent)] selection:text-white">


      <div className="container mx-auto max-w-7xl px-4 py-10 md:py-16">
        
        {/* PAGE HEADER & FILTERS */}
        <div className="mb-12 space-y-8">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <motion.h1 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-slate-900"
            >
              Discover <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-cricket-accent)] to-[var(--color-cricket-blue)]">Tournaments</span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-slate-500 text-lg"
            >
              Find and track the most exciting local cricket leagues happening near you.
            </motion.p>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/80 backdrop-blur-md border border-slate-200 rounded-3xl p-4 md:p-6 shadow-xl flex flex-col lg:flex-row gap-4 relative overflow-hidden"
          >
            {/* Search Bar */}
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[var(--color-cricket-accent)] transition-colors" size={20} />
              <input 
                type="text" 
                placeholder="Search tournaments, teams, or cities..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-2xl pl-12 pr-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-[var(--color-cricket-accent)]/50 focus:border-[var(--color-cricket-accent)] transition-all font-medium"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
              <div className="relative">
                <select 
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="appearance-none bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl pl-4 pr-10 py-3.5 font-medium hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[var(--color-cricket-accent)]/50 transition-all cursor-pointer"
                >
                  <option value="All">All Status</option>
                  <option value="Live">Live</option>
                  <option value="Upcoming">Upcoming</option>
                  <option value="Completed">Completed</option>
                </select>
                <Filter size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>

              <div className="relative">
                <select 
                  value={formatFilter}
                  onChange={(e) => setFormatFilter(e.target.value)}
                  className="appearance-none bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl pl-4 pr-10 py-3.5 font-medium hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[var(--color-cricket-accent)]/50 transition-all cursor-pointer"
                >
                  <option value="All">All Formats</option>
                  <option value="T20">T20</option>
                  <option value="Box Cricket">Box Cricket</option>
                  <option value="Test">Test</option>
                </select>
                <Filter size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </motion.div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-40">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-slate-200 border-t-[var(--color-cricket-accent)] rounded-full animate-spin"></div>
              <div className="absolute inset-0 border-4 border-slate-200 border-b-[var(--color-cricket-blue)] rounded-full animate-spin direction-reverse opacity-50"></div>
            </div>
          </div>
        ) : filteredTournaments.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] p-16 text-center border border-slate-200 shadow-xl max-w-2xl mx-auto"
          >
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-200">
              <Search size={40} className="text-slate-400" />
            </div>
            <h2 className="text-3xl font-black text-slate-900 mb-3">No Tournaments Found</h2>
            <p className="text-slate-500 text-lg mb-8">Try adjusting your search or filters to find what you're looking for.</p>
            <button 
              onClick={() => { setSearchQuery(''); setStatusFilter('All'); setFormatFilter('All'); }}
              className="px-8 py-3.5 bg-slate-900 text-white hover:bg-slate-800 rounded-full font-bold transition-transform hover:scale-105"
            >
              Clear All Filters
            </button>
          </motion.div>
        ) : (
          <div className="space-y-10">
            
            {/* HERO TOURNAMENT CARD */}
            {heroTournament && (
              <Link href={`/tournament/${heroTournament.id}`}>
                <motion.div 
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`group relative overflow-hidden bg-white rounded-[2.5rem] border border-slate-200 shadow-xl transition-all duration-500 hover:-translate-y-2 ${getStatusStyle(heroTournament.status).glow}`}
                >
                  <div className="absolute inset-0">
                    <img src={heroTournament.coverImage} alt="Cover" className="w-full h-full object-cover opacity-20 group-hover:opacity-30 transition-opacity duration-700" />
                    <div className="absolute inset-0 bg-gradient-to-t from-white via-white/80 to-transparent"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-white via-white/60 to-transparent"></div>
                  </div>

                  <div className="relative p-8 md:p-12 flex flex-col lg:flex-row gap-8 items-start lg:items-end justify-between">
                    <div className="space-y-6 max-w-3xl">
                      <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border backdrop-blur-md ${getStatusStyle(heroTournament.status).badge}`}>
                        <span className="w-2 h-2 rounded-full bg-current animate-pulse"></span>
                        {getStatusStyle(heroTournament.status).text}
                      </span>
                      
                      <div>
                        <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-4 tracking-tight drop-shadow-sm">{heroTournament.name}</h2>
                        <div className="flex flex-wrap items-center gap-4 md:gap-6 text-slate-600 font-medium">
                          <div className="flex items-center gap-2 bg-white/80 backdrop-blur-md px-4 py-2 rounded-xl border border-slate-200">
                            <MapPin size={18} className={getStatusStyle(heroTournament.status).accent} />
                            {heroTournament.location}
                          </div>
                          <div className="flex items-center gap-2 bg-white/80 backdrop-blur-md px-4 py-2 rounded-xl border border-slate-200">
                            <Trophy size={18} className={getStatusStyle(heroTournament.status).accent} />
                            {heroTournament.format} Format
                          </div>
                          <div className="flex items-center gap-2 bg-white/80 backdrop-blur-md px-4 py-2 rounded-xl border border-slate-200">
                            <Calendar size={18} className={getStatusStyle(heroTournament.status).accent} />
                            {new Date(heroTournament.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="w-full lg:w-auto bg-slate-50/80 backdrop-blur-xl border border-slate-200 p-6 rounded-3xl shrink-0">
                      <div className="grid grid-cols-2 gap-6 mb-6">
                        <div>
                          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">Prize Pool</p>
                          <p className="text-2xl font-black text-slate-900">{heroTournament.prizePool}</p>
                        </div>
                        <div>
                          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">Registration</p>
                          <p className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <Users size={20} className={getStatusStyle(heroTournament.status).accent} />
                            {heroTournament.teamsRegistered}/{heroTournament.maxTeams}
                          </p>
                        </div>
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden mb-6">
                        <div 
                          className={`h-full rounded-full bg-gradient-to-r ${heroTournament.status === 'active' ? 'from-emerald-500 to-green-400' : 'from-blue-600 to-blue-400'}`} 
                          style={{ width: `${(heroTournament.teamsRegistered / heroTournament.maxTeams) * 100}%` }}
                        ></div>
                      </div>

                      <button className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all ${getStatusStyle(heroTournament.status).button}`}>
                        {getStatusStyle(heroTournament.status).buttonText}
                        <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              </Link>
            )}

            {/* GRID OF OTHER TOURNAMENTS */}
            {gridTournaments.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8">
                {gridTournaments.map((t, index) => (
                  <Link href={`/tournament/${t.id}`} key={t.id}>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`group bg-white rounded-[2rem] overflow-hidden border border-slate-200 shadow-md transition-all duration-300 hover:-translate-y-2 hover:shadow-xl ${getStatusStyle(t.status).glow}`}
                    >
                      {/* Image Top Half */}
                      <div className="h-48 relative overflow-hidden">
                        <img src={t.coverImage} alt="Cover" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700" />
                        <div className="absolute inset-0 bg-gradient-to-t from-white via-white/40 to-transparent"></div>
                        
                        <div className="absolute top-4 left-4">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border backdrop-blur-md ${getStatusStyle(t.status).badge}`}>
                            {getStatusStyle(t.status).text}
                          </span>
                        </div>
                      </div>

                      {/* Content Bottom Half */}
                      <div className="p-6 relative -mt-6">
                        <h3 className="text-2xl font-black text-slate-900 mb-4 tracking-tight line-clamp-1">{t.name}</h3>
                        
                        <div className="space-y-3 mb-6">
                          <div className="flex items-center gap-3 text-slate-600 text-sm font-medium">
                            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center shrink-0 border border-slate-200">
                              <MapPin size={14} className={getStatusStyle(t.status).accent} />
                            </div>
                            <span className="line-clamp-1">{t.location}</span>
                          </div>
                          <div className="flex items-center gap-3 text-slate-600 text-sm font-medium">
                            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center shrink-0 border border-slate-200">
                              <Trophy size={14} className={getStatusStyle(t.status).accent} />
                            </div>
                            <span>{t.format} • {t.prizePool}</span>
                          </div>
                        </div>

                        <div className="pt-5 border-t border-slate-200 flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
                             <Users size={16} />
                             {t.teamsRegistered}/{t.maxTeams} Teams
                          </div>
                          
                          <div className={`flex items-center gap-1 text-xs font-black uppercase tracking-widest transition-colors ${getStatusStyle(t.status).accent}`}>
                            Enter <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </Link>
                ))}
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
