import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../lib/AuthContext';
import { Database } from '../types/supabase';
import {
    Users,
    Search,
    Plus,
    Edit2,
    Trash2,
    Shield,
    X,
    User as UserIcon,
    AlertCircle,
    ChevronRight,
    Camera,
    Upload,
    Image as ImageIcon,
    Loader2,
    ShieldAlert
} from 'lucide-react';
import { BottomSheet } from '../components/BottomSheet';

type Profile = Database['public']['Tables']['profiles']['Row'];

const SquadManagement: React.FC = () => {
    const { userRole } = useAuth();
    const [players, setPlayers] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPlayer, setEditingPlayer] = useState<Profile | null>(null);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);

    // Form states
    const [formData, setFormData] = useState({
        full_name: '',
        nickname: '',
        jersey_number: '',
        role: 'player',
        status: 'activo',
        avatar_url: ''
    });
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    useEffect(() => {
        fetchPlayers();
    }, []);

    const fetchPlayers = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('jersey_number', { ascending: true });

        if (error) {
            console.error('Error fetching profiles:', error);
        } else {
            setPlayers(data || []);
        }
        setLoading(false);
    };

    const handleOpenModal = (player: Profile | null = null) => {
        if (player) {
            setEditingPlayer(player);
            setFormData({
                full_name: player.full_name || '',
                nickname: player.nickname || '',
                jersey_number: player.jersey_number?.toString() || '',
                role: player.role || 'player',
                status: player.status || 'activo',
                avatar_url: player.avatar_url || ''
            });
            setPreviewUrl(player.avatar_url || null);
        } else {
            setEditingPlayer(null);
            setFormData({
                full_name: '',
                nickname: '',
                jersey_number: '',
                role: 'player',
                status: 'activo',
                avatar_url: ''
            });
            setPreviewUrl(null);
        }
        setSelectedFile(null);
        setIsModalOpen(true);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const uploadAvatar = async (playerId: string): Promise<string | null> => {
        if (!selectedFile) return formData.avatar_url || null;

        try {
            setUploading(true);
            const fileExt = selectedFile.name.split('.').pop();
            const fileName = `player_${playerId}_${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            // 1. Delete old file if exists
            if (formData.avatar_url) {
                const oldFileName = formData.avatar_url.split('/').pop();
                if (oldFileName) {
                    await supabase.storage.from('avatars').remove([oldFileName]);
                }
            }

            // 2. Upload new file
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, selectedFile);

            if (uploadError) throw uploadError;

            // 3. Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            return publicUrl;
        } catch (error: any) {
            console.error('Error uploading avatar:', error);
            alert(`Error al subir la imagen: ${error.message || 'Error desconocido'}`);
            return null;
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation: Jersey number unique check
        const num = formData.jersey_number ? parseInt(formData.jersey_number) : null;
        if (num !== null) {
            const existing = players.find(p => p.jersey_number === num && p.id !== editingPlayer?.id);
            if (existing) {
                alert(`El número de camiseta ${num} ya está en uso por ${existing.full_name}`);
                return;
            }
        }

        let finalId = editingPlayer?.id;

        if (!finalId) {
            // Generate temporary ID to use for filename if needed
            finalId = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : 'temp-' + Date.now();
        }

        const uploadedUrl = await uploadAvatar(finalId);

        const profileData = {
            full_name: formData.full_name,
            nickname: formData.nickname || null,
            jersey_number: num,
            role: formData.role,
            status: formData.status,
            avatar_url: uploadedUrl,
            updated_at: new Date().toISOString()
        };

        if (editingPlayer) {
            const { error } = await supabase
                .from('profiles')
                .update(profileData)
                .eq('id', finalId);

            if (error) {
                console.error(error);
                alert('Error al actualizar el jugador');
            } else {
                fetchPlayers();

                // Freeze status for the current month
                const now = new Date();
                await supabase.from('player_monthly_status').upsert({
                    player_id: finalId,
                    month: now.getMonth() + 1,
                    year: now.getFullYear(),
                    status: formData.status
                }, { onConflict: 'player_id,month,year' });

                setIsModalOpen(false);
            }
        } else {
            const { error } = await supabase
                .from('profiles')
                .insert([{
                    ...profileData,
                    id: finalId,
                    created_at: new Date().toISOString()
                }]);

            if (error) {
                console.error(error);
                alert('No se pudo crear el jugador. Por favor intenta de nuevo.');
            } else {
                fetchPlayers();

                // Set initial status for the current month
                const now = new Date();
                await supabase.from('player_monthly_status').upsert({
                    player_id: finalId,
                    month: now.getMonth() + 1,
                    year: now.getFullYear(),
                    status: formData.status
                }, { onConflict: 'player_id,month,year' });

                setIsModalOpen(false);
            }
        }
    };

    const handleDelete = async (id: string) => {
        const { error } = await supabase
            .from('profiles')
            .delete()
            .eq('id', id);

        if (error) {
            console.error(error);
            alert('Error al eliminar el jugador');
        } else {
            fetchPlayers();
            setIsDeleting(null);
        }
    };

    const filteredPlayers = players.filter(p =>
        p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.jersey_number?.toString().includes(searchTerm)
    );

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-background-light dark:bg-background-dark">
                <Loader2 className="animate-spin text-primary" size={48} />
            </div>
        );
    }

    if (!(userRole === 'admin' || userRole === 'dt')) {
        return (
            <div className="flex flex-col h-[80vh] items-center justify-center p-6 text-center bg-background-light dark:bg-background-dark">
                <div className="w-24 h-24 bg-red-500/10 text-red-500 rounded-[2.5rem] flex items-center justify-center mb-6 border border-red-500/20">
                    <ShieldAlert size={48} />
                </div>
                <h1 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter mb-2">ACCESO RESTRINGIDO</h1>
                <p className="text-gray-500 dark:text-gray-400 font-medium max-w-md">No tienes permisos para gestionar el plantel. Esta sección está reservada para el Cuerpo Técnico y Administradores.</p>
            </div>
        );
    }

    return (
        <div className="flex-1 p-6 lg:p-10 max-w-[1400px] mx-auto animate-fade-in bg-background-light dark:bg-background-dark min-h-screen">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                <div>
                    <h1 className="text-4xl font-display font-bold text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-3">
                        <Users className="text-primary" size={32} />
                        Gestión de Plantel
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">Administra el listado oficial de jugadores, DT y cuerpo técnico.</p>
                </div>

                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 bg-primary text-secondary px-6 py-3 rounded-xl font-display font-bold uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20"
                >
                    <Plus size={20} strokeWidth={3} />
                    Nuevo Jugador
                </button>
            </header>

            {/* BUSCADOR */}
            <div className="mb-8 relative max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                    type="text"
                    placeholder="Buscar por nombre o dorsal... (Ej: Cuti o 13)"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white dark:bg-card-dark border border-gray-200 dark:border-gray-800 rounded-2xl pl-12 pr-4 py-4 text-gray-800 dark:text-white focus:ring-2 focus:ring-primary outline-none transition-all shadow-sm"
                />
            </div>

            {/* LISTADO DE JUGADORES */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="bg-white dark:bg-card-dark rounded-2xl h-32 animate-pulse border border-gray-100 dark:border-gray-800"></div>
                    ))
                ) : filteredPlayers.length > 0 ? (
                    filteredPlayers.map(player => (
                        <div key={player.id} className="bg-white dark:bg-card-dark rounded-2xl p-5 border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-xl hover:border-primary/30 transition-all group relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => handleOpenModal(player)}
                                    className="p-2 bg-gray-100 dark:bg-gray-800 text-gray-400 hover:text-primary rounded-lg transition-all"
                                    title="Editar"
                                >
                                    <Edit2 size={16} />
                                </button>
                                <button
                                    onClick={() => setIsDeleting(player.id)}
                                    className="p-2 bg-gray-100 dark:bg-gray-800 text-gray-400 hover:text-red-500 rounded-lg transition-all"
                                    title="Eliminar"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>

                            <div className="flex items-center gap-5">
                                <div className="relative w-20 h-20 flex-shrink-0">
                                    <div className="w-full h-full rounded-2xl bg-gray-100 dark:bg-gray-900/50 flex items-center justify-center overflow-hidden border-2 border-transparent group-hover:border-primary transition-colors">
                                        {player.avatar_url ? (
                                            <img src={player.avatar_url} alt={player.full_name || ''} className="w-full h-full object-cover" />
                                        ) : (
                                            <UserIcon className="text-gray-300 dark:text-gray-700" size={40} />
                                        )}
                                    </div>
                                    <div className="absolute -bottom-2 -right-2 bg-yellow-400 text-secondary font-black text-sm w-8 h-8 flex items-center justify-center rounded-lg border-2 border-white dark:border-gray-800 shadow-md transform rotate-12">
                                        {player.jersey_number || '--'}
                                    </div>
                                </div>

                                <div className="flex-1 min-w-0">
                                    <h3 className="text-xl font-display font-black text-gray-800 dark:text-white truncate uppercase tracking-tight">
                                        {player.full_name}
                                    </h3>
                                    {player.nickname && (
                                        <p className="text-sm text-gray-500 dark:text-gray-400 italic font-medium mt-0.5">
                                            "{player.nickname}"
                                        </p>
                                    )}
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest ${player.role === 'dt' ? 'bg-accent/10 text-accent' :
                                            player.role === 'admin' ? 'bg-primary/10 text-primary' :
                                                'bg-gray-100 dark:bg-gray-800 text-gray-500'
                                            }`}>
                                            {player.role === 'player' ? 'Jugador' : (player.role === 'dt' ? 'Director Técnico' : 'Administrador')}
                                        </span>
                                        {player.role === 'player' && (
                                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest ${player.status === 'activo' ? 'bg-green-100 text-green-600 dark:bg-green-900/20' :
                                                player.status === 'semiactivo' ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/20' :
                                                    'bg-gray-100 text-gray-400 dark:bg-gray-800'
                                                }`}>
                                                {player.status || 'Activo'}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full py-20 text-center bg-white dark:bg-card-dark rounded-3xl border border-gray-100 dark:border-gray-800 shadow-inner">
                        <UserIcon className="mx-auto text-gray-200 dark:text-gray-800 mb-4" size={64} />
                        <h3 className="text-xl font-display font-bold text-gray-500 uppercase tracking-widest">No hay jugadores</h3>
                        <p className="text-gray-400 mt-2 font-medium">Ajusta el filtro o agrega un nuevo integrante al plantel.</p>
                    </div>
                )}
            </div>

            {/* MODAL ALTA/BAJA */}
            <BottomSheet
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingPlayer ? 'Editar Perfil' : 'Nuevo Jugador'}
            >
                <form onSubmit={handleSave} className="space-y-8">
                    <div className="space-y-6">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-3 px-1">Nombre Completo</label>
                            <input
                                type="text"
                                required
                                placeholder="Ej: Cristian Romero"
                                value={formData.full_name}
                                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-2xl px-5 py-4 text-gray-800 dark:text-white focus:ring-2 focus:ring-primary outline-none transition-all font-medium shadow-inner"
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-3 px-1">Apodo</label>
                            <input
                                type="text"
                                placeholder="Ej: La Pulga, Kun, El Pipa..."
                                value={formData.nickname}
                                onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                                className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-2xl px-5 py-4 text-gray-800 dark:text-white focus:ring-2 focus:ring-primary outline-none transition-all font-medium shadow-inner"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="col-span-1">
                                <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-3 px-1">Dorsal</label>
                                <input
                                    type="number"
                                    placeholder="13"
                                    value={formData.jersey_number}
                                    onChange={(e) => setFormData({ ...formData, jersey_number: e.target.value })}
                                    className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-2xl px-5 py-4 text-gray-800 dark:text-white focus:ring-2 focus:ring-primary outline-none transition-all font-medium shadow-inner"
                                />
                            </div>
                            <div className="col-span-1">
                                <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-3 px-1">Rol</label>
                                <select
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-2xl px-5 py-4 text-gray-800 dark:text-white focus:ring-2 focus:ring-primary outline-none transition-all appearance-none font-bold uppercase text-xs shadow-inner"
                                >
                                    <option value="player">Jugador</option>
                                    <option value="dt">D.T.</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-3 px-1">Estado</label>
                            <div className="grid grid-cols-3 gap-3">
                                {['activo', 'semiactivo', 'pasivo'].map(s => (
                                    <button
                                        key={s}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, status: s })}
                                        className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${formData.status === s
                                            ? 'bg-primary text-secondary border-primary shadow-lg shadow-primary/20'
                                            : 'bg-gray-50 dark:bg-gray-900/50 text-gray-400 border-gray-100 dark:border-gray-800 hover:border-primary/30'
                                            }`}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-4 px-1">Foto de Perfil</label>
                            <div className="flex items-center gap-6 p-6 bg-gray-50 dark:bg-gray-900/20 rounded-[2rem] border-2 border-dashed border-gray-200 dark:border-gray-800">
                                <div className="relative">
                                    <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-white dark:border-gray-800 shadow-xl relative bg-gray-200 dark:bg-gray-800">
                                        {previewUrl ? (
                                            <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <UserIcon size={32} className="text-gray-400 dark:text-gray-600" />
                                            </div>
                                        )}
                                        {uploading && (
                                            <div className="absolute inset-0 bg-secondary/60 flex items-center justify-center">
                                                <Loader2 className="animate-spin text-primary" size={24} />
                                            </div>
                                        )}
                                    </div>
                                    <label className="absolute -bottom-2 -right-2 w-10 h-10 bg-primary text-secondary rounded-xl flex items-center justify-center cursor-pointer shadow-lg hover:scale-110 active:scale-95 transition-all">
                                        <Camera size={20} strokeWidth={3} />
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={handleFileChange}
                                            disabled={uploading}
                                        />
                                    </label>
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                                        {selectedFile ? selectedFile.name : 'Dimensiones recomendadas: Square'}
                                    </p>
                                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 uppercase tracking-tighter">
                                        Formatos soportados: JPG, PNG.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={uploading}
                        className="w-full bg-primary text-secondary font-display font-black text-xl py-5 rounded-[2rem] uppercase tracking-[0.2em] hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-primary/30 disabled:opacity-50 mt-4"
                    >
                        {uploading ? (
                            <span className="flex items-center justify-center gap-2">
                                <Loader2 className="animate-spin" size={24} />
                                Cargando...
                            </span>
                        ) : (
                            'Guardar Cambios'
                        )}
                    </button>
                </form>
            </BottomSheet>

            {/* MODAL CONFIRMAR ELIMINACIÓN */}
            <BottomSheet
                isOpen={!!isDeleting}
                onClose={() => setIsDeleting(null)}
                title="¿Eliminar Perfil?"
            >
                <div className="text-center space-y-6">
                    <div className="w-20 h-20 bg-red-100 dark:bg-red-500/10 text-red-500 rounded-3xl flex items-center justify-center mx-auto transform -rotate-6 shadow-lg">
                        <AlertCircle size={40} />
                    </div>
                    <div>
                        <p className="text-gray-500 dark:text-gray-400 font-medium">
                            ¿Estás seguro de quitar a este integrante del plantel? Esta acción es irreversible y afectará a las estadísticas históricas.
                        </p>
                    </div>
                    <div className="flex flex-col gap-3 pt-4">
                        <button
                            onClick={() => isDeleting && handleDelete(isDeleting)}
                            className="w-full py-5 bg-red-500 text-white font-display font-black uppercase tracking-widest rounded-3xl hover:bg-red-600 transition-all shadow-xl shadow-red-500/30"
                        >
                            Sí, Eliminar
                        </button>
                        <button
                            onClick={() => setIsDeleting(null)}
                            className="w-full py-4 bg-transparent text-gray-400 font-bold uppercase text-[10px] tracking-[0.3em] hover:text-gray-600 dark:hover:text-white transition-all"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            </BottomSheet>
        </div >
    );
};

export default SquadManagement;
