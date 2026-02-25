import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Database } from '../types/supabase';
import { User, Shield, Users, ChevronDown, X, Trash2 } from 'lucide-react';

type Profile = Database['public']['Tables']['profiles']['Row'];
type LineupEntry = Database['public']['Tables']['match_lineups']['Row'];

interface TacticalLineupManagerProps {
    matchId: string;
    isEditable?: boolean;
}

// Fixed percentages for 8v8 formations
const FORMATIONS: Record<string, { x: number; y: number }[]> = {
    '2-3-2': [
        { x: 50, y: 88 }, // GK
        { x: 30, y: 65 }, { x: 70, y: 65 }, // DF
        { x: 20, y: 42 }, { x: 50, y: 45 }, { x: 80, y: 42 }, // MD
        { x: 35, y: 20 }, { x: 65, y: 20 }  // DL
    ],
    '3-3-1': [
        { x: 50, y: 88 }, // GK
        { x: 20, y: 65 }, { x: 50, y: 68 }, { x: 80, y: 65 }, // DF
        { x: 20, y: 42 }, { x: 50, y: 45 }, { x: 80, y: 42 }, // MD
        { x: 50, y: 18 }  // DL
    ],
    '2-4-1': [
        { x: 50, y: 88 }, // GK
        { x: 35, y: 65 }, { x: 65, y: 65 }, // DF
        { x: 15, y: 42 }, { x: 40, y: 42 }, { x: 60, y: 42 }, { x: 85, y: 42 }, // MD
        { x: 50, y: 18 }  // DL
    ],
    '2-3-1-1': [
        { x: 50, y: 88 }, // GK
        { x: 30, y: 65 }, { x: 70, y: 65 }, // DEF
        { x: 20, y: 45 }, { x: 50, y: 45 }, { x: 80, y: 45 }, // MID
        { x: 50, y: 28 }, // CAM
        { x: 50, y: 12 }  // ST
    ],
    '3-2-2': [
        { x: 50, y: 88 }, // GK
        { x: 20, y: 65 }, { x: 50, y: 68 }, { x: 80, y: 65 }, // DEF
        { x: 35, y: 42 }, { x: 65, y: 42 }, // MID
        { x: 35, y: 18 }, { x: 65, y: 18 }  // FWD
    ]
};

export const TacticalLineupManager: React.FC<TacticalLineupManagerProps> = ({ matchId, isEditable = false }) => {
    const [formation, setFormation] = useState<string>('2-3-2');
    const [confirmedPlayers, setConfirmedPlayers] = useState<Profile[]>([]);
    const [lineup, setLineup] = useState<(LineupEntry & { profile?: Profile })[]>([]);
    const [loading, setLoading] = useState(true);

    // Selection State
    const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
    const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);

    // Fetch Initial Data
    useEffect(() => {
        fetchData();

        // Subscription for lineup changes
        const lineupChannel = supabase
            .channel('lineup-changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'match_lineups', filter: `match_id=eq.${matchId}` },
                () => {
                    fetchLineup();
                }
            )
            .subscribe();

        // Subscription for attendance changes (Real-time update for confirmed players)
        const attendanceChannel = supabase
            .channel('attendance-changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'attendance', filter: `match_id=eq.${matchId}` },
                () => {
                    fetchConfirmedPlayers();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(lineupChannel);
            supabase.removeChannel(attendanceChannel);
        };
    }, [matchId]);

    const fetchData = async () => {
        setLoading(true);
        await Promise.all([fetchConfirmedPlayers(), fetchLineup(), fetchFormation()]);
        setLoading(false);
    };

    const fetchFormation = async () => {
        const { data } = await supabase
            .from('matches')
            .select('formation')
            .eq('id', matchId)
            .single();

        if (data && (data as any).formation) {
            setFormation((data as any).formation);
        }
    };

    const saveFormation = async (newFormation: string) => {
        setFormation(newFormation);
        await supabase
            .from('matches')
            .update({ formation: newFormation } as any)
            .eq('id', matchId);
    };

    const fetchConfirmedPlayers = async () => {
        const { data, error } = await supabase
            .from('attendance')
            .select(`
                player_id,
                confirmation_status,
                profiles:player_id (*)
            `)
            .eq('match_id', matchId)
            .eq('confirmation_status', 'confirmed');

        if (error) {
            console.error('Error fetching players:', error);
            return;
        }

        if (data) {
            const profiles = data.map(d => {
                // @ts-ignore
                const p = d.profiles;
                return Array.isArray(p) ? p[0] : p;
            }).filter(Boolean) as Profile[];

            setConfirmedPlayers(profiles);
        }
    };

    const fetchLineup = async () => {
        const { data, error } = await supabase
            .from('match_lineups')
            .select('*, profile:player_id(*)')
            .eq('match_id', matchId);

        if (error) {
            console.error('Error fetching lineup:', error);
        } else {
            // @ts-ignore
            setLineup(data || []);
        }
    };

    // Interaction Logic
    const handlePlayerClick = (playerId: string) => {
        if (!isEditable) return;
        const isOnPitch = lineup.some(l => l.player_id === playerId);
        // ... (rest of logic)
        if (selectedSlotIndex !== null) {
            assignPlayerToSlot(playerId, selectedSlotIndex);
        } else {
            setSelectedPlayerId(playerId === selectedPlayerId ? null : playerId);
            setSelectedSlotIndex(null);
        }
    };

    const handleSlotClick = (index: number) => {
        if (!isEditable) return;
        const playerInTargetSlot = getPlayerInSlot(index);

        if (selectedPlayerId) {
            const isSidebarPlayer = !lineup.some(l => l.player_id === selectedPlayerId);

            if (playerInTargetSlot) {
                if (playerInTargetSlot.player_id === selectedPlayerId) {
                    // Clicked same player already on pitch -> Deselect
                    setSelectedPlayerId(null);
                    setSelectedSlotIndex(null);
                } else if (isSidebarPlayer) {
                    // Replace player on pitch with sidebar selection
                    assignPlayerToSlot(selectedPlayerId, index);
                } else {
                    // SWAP two players on the pitch
                    swapPlayers(selectedPlayerId, playerInTargetSlot.player_id);
                }
            } else {
                // MOVE pitch player or ASSIGN sidebar player to empty slot
                assignPlayerToSlot(selectedPlayerId, index);
            }
        } else {
            if (playerInTargetSlot) {
                // Select player on pitch to move/swap later
                setSelectedPlayerId(playerInTargetSlot.player_id);
                setSelectedSlotIndex(index);
            } else {
                // Select empty slot to assign from sidebar later
                setSelectedSlotIndex(index === selectedSlotIndex ? null : index);
                setSelectedPlayerId(null);
            }
        }
    };

    const swapPlayers = async (playerAId: string, playerBId: string) => {
        const entryA = lineup.find(l => l.player_id === playerAId);
        const entryB = lineup.find(l => l.player_id === playerBId);

        if (!entryA || !entryB) return;

        const slotA = (entryA as any).slot_index;
        const slotB = (entryB as any).slot_index;
        const coordsA = FORMATIONS[formation][slotA];
        const coordsB = FORMATIONS[formation][slotB];

        const { error } = await supabase
            .from('match_lineups')
            .upsert([
                {
                    match_id: matchId,
                    player_id: playerAId,
                    slot_index: slotB,
                    position_x: coordsB.x,
                    position_y: coordsB.y,
                    is_starter: true
                },
                {
                    match_id: matchId,
                    player_id: playerBId,
                    slot_index: slotA,
                    position_x: coordsA.x,
                    position_y: coordsA.y,
                    is_starter: true
                }
            ] as any, { onConflict: 'match_id, player_id' });

        if (error) {
            console.error("Error swapping players:", error);
            alert("Error al intercambiar posiciones");
        }

        clearSelection();
        fetchLineup();
    };

    const assignPlayerToSlot = async (playerId: string, slotIndex: number) => {
        const coords = FORMATIONS[formation][slotIndex];

        const { error } = await supabase
            .from('match_lineups')
            .upsert({
                match_id: matchId,
                player_id: playerId,
                slot_index: slotIndex,
                position_x: coords.x,
                position_y: coords.y,
                is_starter: true
            } as any, { onConflict: 'match_id, player_id' });

        if (error) {
            console.error("Error assigning player:", error);
            alert("Error al asignar jugador");
        }

        clearSelection();
        fetchLineup();
    };

    const removePlayerFromLineup = async (e: React.MouseEvent, playerId: string) => {
        e.stopPropagation();
        if (!isEditable) return;

        const { error } = await supabase
            .from('match_lineups')
            .delete()
            .match({ match_id: matchId, player_id: playerId });

        if (error) {
            console.error("Error removing player:", error);
            alert("Error al quitar jugador");
        }

        if (selectedPlayerId === playerId) clearSelection();
        fetchLineup();
    };

    const clearSelection = () => {
        setSelectedPlayerId(null);
        setSelectedSlotIndex(null);
    };

    // Helper to find player in a specific visual slot (by slot_index)
    const getPlayerInSlot = (slotIndex: number) => {
        return lineup.find(l => (l as any).slot_index === slotIndex);
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 p-4 lg:h-[calc(100vh-4rem)]">

            {/* Columna Izquierda: Campo y Controles */}
            <div className="flex-1 flex flex-col gap-4 min-h-0">

                {/* Controles de Formación */}
                <div className="bg-white dark:bg-card-dark p-4 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                            <Shield className="text-primary" size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-800 dark:text-white leading-tight">PIZARRA TÁCTICA</h2>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Alineación del Partido</p>
                        </div>
                    </div>

                    <div className="relative">
                        <select
                            value={formation}
                            disabled={!isEditable}
                            onChange={(e) => saveFormation(e.target.value)}
                            className="appearance-none bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-white pl-4 pr-10 py-2.5 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-primary transition-all border border-transparent dark:border-gray-700 disabled:opacity-50"
                        >
                            {Object.keys(FORMATIONS).map(f => (
                                <option key={f} value={f}>{f}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                    </div>
                </div>

                {/* El Campo */}
                <div className="flex-1 flex justify-center items-center min-h-[350px] sm:min-h-[400px]" style={{ touchAction: 'pan-y' }}>
                    <div className="relative w-full max-w-[700px] aspect-[3/4] sm:aspect-[4/3] bg-[#2a9d8f] rounded-[2rem] overflow-hidden shadow-2xl border-[6px] border-[#264653]/50" style={{ touchAction: 'none' }}>
                        {/* Marcas del campo */}
                        <div className="absolute inset-6 border-2 border-white/30 rounded-xl pointer-events-none"></div>
                        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/30 -translate-y-1/2 pointer-events-none"></div>
                        <div className="absolute top-1/2 left-1/2 w-32 h-32 border-2 border-white/30 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>

                        {/* Arcos */}
                        <div className="absolute top-0 left-1/2 w-40 h-10 border-b-2 border-x-2 border-white/30 -translate-x-1/2 bg-white/5 backdrop-blur-sm"></div>
                        <div className="absolute bottom-0 left-1/2 w-40 h-10 border-t-2 border-x-2 border-white/30 -translate-x-1/2 bg-white/5 backdrop-blur-sm"></div>

                        {/* Posiciones (Slots) */}
                        {FORMATIONS[formation].map((coords, i) => {
                            const assignedEntry = getPlayerInSlot(i);
                            const isSlotSelected = selectedSlotIndex === i && !selectedPlayerId;
                            const isPlayerSelected = assignedEntry && selectedPlayerId === assignedEntry.player_id;

                            return (
                                <button
                                    key={i}
                                    data-pitch-slot
                                    onClick={() => handleSlotClick(i)}
                                    style={{
                                        left: `${coords.x}%`,
                                        top: `${coords.y}%`
                                    }}
                                    className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 z-10
                                    ${assignedEntry ? 'pointer-events-auto' : 'pointer-events-auto'}
                                `}
                                >
                                    {assignedEntry ? (
                                        <div className={`flex flex-col items-center group ${coords.y > 70 ? 'flex-col-reverse' : ''}`}>
                                            {/* Name label (shown above if in lower field) */}
                                            {coords.y > 70 && (
                                                <span className="mb-2 text-[10px] sm:text-xs font-black text-white bg-secondary/80 px-3 py-1 rounded-lg backdrop-blur-md whitespace-nowrap max-w-[100px] truncate shadow-lg border border-white/10 uppercase tracking-tighter">
                                                    {assignedEntry.profile?.nickname || assignedEntry.profile?.full_name?.split(' ')[0]}
                                                </span>
                                            )}
                                            <div className="relative">
                                                {/* Avatar Circle */}
                                                <div className={`
                                                    w-12 h-12 sm:w-14 sm:h-14 bg-white rounded-full border-2 border-secondary flex items-center justify-center overflow-hidden shadow-xl relative transition-all
                                                    ${isPlayerSelected
                                                        ? 'ring-4 ring-primary scale-110 z-20 shadow-[0_0_25px_rgba(45,212,191,0.8)]'
                                                        : 'group-hover:ring-2 group-hover:ring-primary/50 group-hover:scale-105'}
                                                `}>
                                                    {assignedEntry.profile?.avatar_url ? (
                                                        <img src={assignedEntry.profile.avatar_url} alt="Av" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="font-bold text-secondary text-sm sm:text-base">
                                                            {assignedEntry.profile?.full_name?.substring(0, 2).toUpperCase()}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Dorsal (Outside overflow-hidden) */}
                                                {assignedEntry.profile?.jersey_number && (
                                                    <div className="absolute -bottom-1 -right-1 bg-yellow-400 text-secondary text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-white shadow-md z-30">
                                                        {assignedEntry.profile.jersey_number}
                                                    </div>
                                                )}

                                                {/* Botón Quitar (Outside overflow-hidden) */}
                                                {isEditable && (
                                                    <button
                                                        onClick={(e) => removePlayerFromLineup(e, assignedEntry.player_id)}
                                                        className="absolute -top-1.5 -right-1.5 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center border-2 border-white opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600 hover:scale-110 z-40 shadow-lg"
                                                        title="Quitar del campo"
                                                    >
                                                        <X size={12} strokeWidth={4} />
                                                    </button>
                                                )}
                                            </div>
                                            {/* Name label (shown below if in upper field) */}
                                            {coords.y <= 70 && (
                                                <span className="mt-2 text-[10px] sm:text-xs font-black text-white bg-secondary/80 px-3 py-1 rounded-lg backdrop-blur-md whitespace-nowrap max-w-[100px] truncate shadow-lg border border-white/10 uppercase tracking-tighter">
                                                    {assignedEntry.profile?.nickname || assignedEntry.profile?.full_name?.split(' ')[0]}
                                                </span>
                                            )}
                                        </div>
                                    ) : (
                                        <div className={`
                                            w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-dashed flex items-center justify-center transition-all duration-300
                                            ${isSlotSelected
                                                ? 'border-primary bg-primary/20 ring-4 ring-primary/30 scale-110 shadow-[0_0_15px_rgba(45,212,191,0.5)]'
                                                : 'border-white/40 bg-white/5 hover:bg-white/20 hover:border-white'
                                            }
                                        `}>
                                            <PlusIcon className="w-5 h-5 text-white opacity-60" />
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Columna Derecha: Plantel Confirmado (Only shown if editable) */}
            {isEditable && (
                <div className="w-full lg:w-80 flex flex-col bg-white dark:bg-card-dark rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden max-h-[50vh] lg:max-h-[calc(100vh-4rem)]">
                    <div className="p-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
                        <div className="flex items-center gap-3">
                            <Users size={20} className="text-primary" />
                            <div>
                                <h3 className="font-bold text-gray-800 dark:text-white uppercase tracking-tight">PLANTEL CONFIRMADO</h3>
                                <p className="text-[10px] text-gray-400 font-bold">{confirmedPlayers.length} JUGADORES LISTOS</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{ WebkitOverflowScrolling: 'touch' }}>
                        {loading ? (
                            <div className="p-10 text-center">
                                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Cargando...</p>
                            </div>
                        ) : (
                            confirmedPlayers.map(player => {
                                const isOnPitch = lineup.some(l => l.player_id === player.id);
                                const isSelected = selectedPlayerId === player.id;

                                return (
                                    <div
                                        key={player.id}
                                        onClick={() => handlePlayerClick(player.id)}
                                        className={`p-3 rounded-xl flex items-center gap-3 cursor-pointer transition-all border group relative
                                        ${isOnPitch
                                                ? 'opacity-40 grayscale border-transparent bg-gray-50 dark:bg-gray-900'
                                                : isSelected
                                                    ? 'border-primary bg-primary/5 dark:bg-primary/10 ring-2 ring-primary/20 shadow-inner'
                                                    : 'border-transparent hover:bg-gray-100 dark:hover:bg-gray-800/80'
                                            }
                                    `}
                                    >
                                        <div className={`w-11 h-11 rounded-xl bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden transition-all shadow-sm ${isSelected ? 'scale-105 ring-2 ring-primary' : ''}`}>
                                            {player.avatar_url ? (
                                                <img src={player.avatar_url} alt="Av" className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-sm font-black text-gray-500 dark:text-gray-400">
                                                    {player.full_name?.substring(0, 2).toUpperCase()}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-sm text-gray-800 dark:text-white truncate uppercase tracking-tighter">
                                                {player.nickname || player.full_name}
                                            </p>
                                            <p className="text-[10px] font-bold text-gray-500 dark:text-gray-500">
                                                #{player.jersey_number || '--'} • {player.role?.toUpperCase() || 'JUGADOR'}
                                            </p>
                                        </div>
                                        {isOnPitch ? (
                                            <div className="flex items-center gap-1.5 bg-primary/10 px-2 py-1 rounded-lg">
                                                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>
                                                <span className="text-[8px] font-black text-primary uppercase">Campo</span>
                                            </div>
                                        ) : isSelected ? (
                                            <div className="bg-primary text-secondary px-2 py-1 rounded-lg shadow-sm">
                                                <span className="text-[8px] font-black uppercase tracking-tighter">Listos</span>
                                            </div>
                                        ) : null}
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {selectedPlayerId && (
                        <div className="p-4 bg-primary text-secondary animate-slide-up">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Mover Jugador</span>
                                <button
                                    onClick={clearSelection}
                                    className="p-1 hover:bg-black/10 rounded-lg transition-colors"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                            <p className="text-sm font-bold truncate">
                                {(() => { const p = confirmedPlayers.find(p => p.id === selectedPlayerId); return p?.nickname || p?.full_name; })()}
                            </p>
                            <p className="text-[10px] font-medium opacity-70">Haz clic en un espacio o jugador del campo</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const PlusIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
);
