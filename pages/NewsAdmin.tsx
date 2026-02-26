import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../lib/AuthContext';
import { Newspaper, Calendar, Plus, Megaphone, Trash2, CheckCircle, X } from 'lucide-react';

export default function NewsAdmin() {
    const { session, userRole } = useAuth();
    const [news, setNews] = useState<any[]>([]);
    const [meetings, setMeetings] = useState<any[]>([]);
    const [players, setPlayers] = useState<any[]>([]);
    const [attendance, setAttendance] = useState<any[]>([]);

    const [loading, setLoading] = useState(true);

    const [showNewsForm, setShowNewsForm] = useState(false);
    const [showMeetingForm, setShowMeetingForm] = useState(false);

    const [newsTitle, setNewsTitle] = useState('');
    const [newsContent, setNewsContent] = useState('');
    const [newsImage, setNewsImage] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const [meetingDate, setMeetingDate] = useState('');
    const [meetingDesc, setMeetingDesc] = useState('');

    const loadData = async () => {
        setLoading(true);
        try {
            const [newsData, meetingsData, playersData, attendanceData] = await Promise.all([
                supabase.from('news').select('*, profiles(full_name)').order('created_at', { ascending: false }),
                supabase.from('delegate_meetings').select('*, profiles(full_name)').order('meeting_date', { ascending: false }),
                supabase.from('profiles').select('*').order('full_name'),
                supabase.from('delegate_meeting_attendance').select('*, profiles(full_name, nickname, role)'),
            ]);
            if (newsData.data) setNews(newsData.data);
            if (meetingsData.data) setMeetings(meetingsData.data);
            if (playersData.data) setPlayers(playersData.data);
            if (attendanceData.data) setAttendance(attendanceData.data);
        } catch (error) {
            console.error('Error loading data', error);
        }
        setLoading(false);
    };

    useEffect(() => {
        if (userRole === 'admin' || userRole === 'delegado' || userRole === 'dt') {
            loadData();
        }
    }, [userRole]);

    // Insert News
    const handleCreateNews = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsUploading(true);
        let imageUrl = null;

        if (newsImage) {
            const fileExt = newsImage.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `news/${fileName}`;
            const { error: uploadError } = await (supabase.storage.from('avatars') as any).upload(filePath, newsImage);
            if (!uploadError) {
                const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
                imageUrl = data.publicUrl;
            }
        }

        const { error } = await (supabase.from('news') as any).insert({
            title: newsTitle,
            content: newsContent,
            image_url: imageUrl,
            created_by: session?.user.id,
            is_active: true
        });

        setIsUploading(false);
        if (error) alert('Error guardando novedad');
        else {
            setNewsTitle('');
            setNewsContent('');
            setNewsImage(null);
            setShowNewsForm(false);
            loadData();
        }
    };

    const handleDeleteNews = async (id: string) => {
        if (!confirm('¿Seguro quieres eliminar esta novedad?')) return;
        await (supabase.from('news') as any).delete().eq('id', id);
        loadData();
    };

    // Insert Meeting
    const handleCreateMeeting = async (e: React.FormEvent) => {
        e.preventDefault();
        const { error } = await (supabase.from('delegate_meetings') as any).insert({
            meeting_date: new Date(meetingDate).toISOString(),
            description: meetingDesc,
            created_by: session?.user.id,
        });

        if (error) alert('Error guardando reunión');
        else {
            setMeetingDate('');
            setMeetingDesc('');
            setShowMeetingForm(false);
            loadData();
        }
    };

    // Attendees for meeting
    const getMeetingAttendees = (meetingId: string) => {
        return attendance.filter(a => a.meeting_id === meetingId);
    };

    const toggleAttendance = async (att: any) => {
        const newVal = !att.attended;
        const { error } = await (supabase.from('delegate_meeting_attendance') as any)
            .update({ attended: newVal })
            .eq('id', att.id);
        if (!error) {
            setAttendance(prev => prev.map(a => a.id === att.id ? { ...a, attended: newVal } : a));
        }
    };

    if (userRole !== 'admin' && userRole !== 'delegado' && userRole !== 'dt') {
        return <div className="p-8 text-center text-red-500 font-bold">No tienes permiso para ver esta sección.</div>;
    }

    return (
        <div className="p-4 sm:p-6 lg:p-10 max-w-7xl mx-auto space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center shrink-0">
                    <Megaphone className="text-primary w-8 h-8" />
                </div>
                <div>
                    <h1 className="text-2xl sm:text-3xl font-display font-black tracking-tight text-gray-800 dark:text-white uppercase">Gestión Delegados</h1>
                    <p className="text-xs sm:text-sm font-bold text-gray-500 tracking-widest uppercase">Novedades y Reuniones de Club</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* News Section */}
                <div className="bg-white dark:bg-card-dark rounded-[3rem] p-6 lg:p-8 border border-gray-100 dark:border-gray-800 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-3">
                            <Newspaper className="text-primary" size={24} />
                            <h2 className="text-xl font-black uppercase tracking-tight">Novedades</h2>
                        </div>
                        <button onClick={() => setShowNewsForm(!showNewsForm)} className="bg-primary hover:bg-primary-dark text-white p-2 rounded-full transition-colors">
                            {showNewsForm ? <X size={20} /> : <Plus size={20} />}
                        </button>
                    </div>

                    {showNewsForm && (
                        <form onSubmit={handleCreateNews} className="space-y-4 mb-6 bg-gray-50 dark:bg-gray-800/50 p-6 rounded-3xl border border-gray-100 dark:border-gray-800">
                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Título (Opcional)</label>
                                <input type="text" value={newsTitle} onChange={e => setNewsTitle(e.target.value)} className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 font-medium outline-none focus:border-primary transition-colors" placeholder="Ej: Nueva camiseta..." />
                            </div>
                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Novedad *</label>
                                <textarea required value={newsContent} onChange={e => setNewsContent(e.target.value)} className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 font-medium outline-none focus:border-primary transition-colors min-h-[100px]" placeholder="Escribe aquí las novedades..." />
                            </div>
                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Imagen Adjunta</label>
                                <input type="file" accept="image/*" onChange={e => setNewsImage(e.target.files?.[0] || null)} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 transition-all cursor-pointer" />
                            </div>
                            <button type="submit" disabled={isUploading || !newsContent} className="w-full bg-primary hover:bg-primary-dark text-white font-black uppercase tracking-widest py-3 rounded-xl transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
                                {isUploading ? 'Publicando...' : 'Publicar Novedad'}
                                <Megaphone size={18} />
                            </button>
                        </form>
                    )}

                    <div className="space-y-4">
                        {loading ? <div className="text-gray-500 font-bold p-4">Cargando...</div> :
                            news.length === 0 ? <p className="text-gray-500 font-bold p-4">No hay novedades publicadas.</p> :
                                news.map(n => (
                                    <div key={n.id} className="relative bg-gray-50 dark:bg-gray-800/50 p-5 rounded-3xl transition-all group">
                                        <button onClick={() => handleDeleteNews(n.id)} className="absolute top-4 right-4 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity bg-red-500/10 p-2 rounded-full hover:bg-red-500/20">
                                            <Trash2 size={16} />
                                        </button>
                                        {n.title && <h3 className="font-bold text-gray-800 dark:text-white mb-1.5 pr-8">{n.title}</h3>}
                                        <p className="text-sm text-gray-600 dark:text-gray-300 pr-8 whitespace-pre-wrap">{n.content}</p>
                                        {n.image_url && <img src={n.image_url} alt="Adjunto" className="mt-4 rounded-xl max-h-48 object-cover border border-gray-200 dark:border-gray-700" />}
                                        <div className="mt-3 text-[10px] font-black uppercase tracking-widest text-gray-400">
                                            Por {n.profiles?.full_name || 'Desconocido'} • {new Date(n.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                ))}
                    </div>
                </div>

                {/* Meetings Section */}
                <div className="bg-white dark:bg-card-dark rounded-[3rem] p-6 lg:p-8 border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col min-h-0">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-3">
                            <Calendar className="text-primary" size={24} />
                            <h2 className="text-xl font-black uppercase tracking-tight">Reuniones de Liga</h2>
                        </div>
                        <button onClick={() => setShowMeetingForm(!showMeetingForm)} className="bg-primary hover:bg-primary-dark text-white p-2 rounded-full transition-colors">
                            {showMeetingForm ? <X size={20} /> : <Plus size={20} />}
                        </button>
                    </div>

                    {showMeetingForm && (
                        <form onSubmit={handleCreateMeeting} className="space-y-4 mb-6 bg-gray-50 dark:bg-gray-800/50 p-6 rounded-3xl border border-gray-100 dark:border-gray-800">
                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Fecha y Hora *</label>
                                <input type="datetime-local" required value={meetingDate} onChange={e => setMeetingDate(e.target.value)} className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 font-medium outline-none focus:border-primary transition-colors text-gray-800 dark:text-white" />
                            </div>
                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Descripción (Opcional)</label>
                                <input type="text" value={meetingDesc} onChange={e => setMeetingDesc(e.target.value)} className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 font-medium outline-none focus:border-primary transition-colors" placeholder="Ej: Charla de nuevo torneo..." />
                            </div>
                            <button type="submit" disabled={!meetingDate} className="w-full bg-primary hover:bg-primary-dark text-white font-black uppercase tracking-widest py-3 rounded-xl transition-all active:scale-95 disabled:opacity-50">
                                Programar Reunión
                            </button>
                        </form>
                    )}

                    <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                        {loading ? <div className="text-gray-500 font-bold p-4">Cargando...</div> :
                            meetings.length === 0 ? <p className="text-gray-500 font-bold p-4">No hay reuniones programadas.</p> :
                                meetings.map(m => {
                                    const isPast = new Date(m.meeting_date) < new Date();
                                    const mAtts = getMeetingAttendees(m.id);
                                    const confirmed = mAtts.filter(a => a.confirmation_status === 'confirmed');

                                    return (
                                        <div key={m.id} className="bg-gray-50 dark:bg-gray-800/50 p-5 rounded-3xl transition-all border border-transparent dark:border-gray-800">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <h3 className="font-bold text-gray-800 dark:text-white">Reunión de Delegados</h3>
                                                    <p className="text-sm font-bold text-primary">
                                                        {new Date(m.meeting_date).toLocaleDateString('es-AR', { weekday: 'long', day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' }).toUpperCase()}
                                                    </p>
                                                </div>
                                                <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${isPast ? 'bg-gray-200 text-gray-500' : 'bg-green-100 text-green-600'}`}>
                                                    {isPast ? 'Finalizada' : 'Próxima'}
                                                </div>
                                            </div>
                                            {m.description && <p className="text-sm text-gray-500 mb-4">{m.description}</p>}

                                            <div className="mt-4">
                                                <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3 border-b border-gray-200 dark:border-gray-700 pb-2">
                                                    {isPast ? 'Asistencia Final (+4 pts)' : `Confirmados (${confirmed.length})`}
                                                </h4>

                                                {mAtts.length === 0 ? (
                                                    <p className="text-xs text-gray-500 mb-2">Nadie respondió aún.</p>
                                                ) : (
                                                    <div className="space-y-2">
                                                        {mAtts.map(a => (
                                                            <div key={a.id} className="flex items-center justify-between bg-white dark:bg-gray-800 p-2.5 rounded-xl border border-gray-100 dark:border-gray-700">
                                                                <div className="flex items-center gap-2">
                                                                    <div className={`w-2 h-2 rounded-full ${a.confirmation_status === 'confirmed' ? 'bg-green-500' : a.confirmation_status === 'declined' ? 'bg-red-500' : 'bg-gray-300'}`}></div>
                                                                    <span className="text-sm font-bold text-gray-700 dark:text-gray-200">
                                                                        {a.profiles?.nickname || a.profiles?.full_name}
                                                                    </span>
                                                                    <span className="text-[10px] uppercase font-black tracking-widest text-gray-400">
                                                                        {a.confirmation_status === 'confirmed' ? 'Sí va' : a.confirmation_status === 'declined' ? 'No va' : '?'}
                                                                    </span>
                                                                </div>
                                                                {isPast && (
                                                                    <button
                                                                        onClick={() => toggleAttendance(a)}
                                                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-colors ${a.attended
                                                                                ? 'bg-[#1B9E5E]/10 text-[#1B9E5E] border border-[#1B9E5E]/20'
                                                                                : 'bg-gray-100 dark:bg-gray-700 text-gray-400 border border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
                                                                            }`}
                                                                    >
                                                                        {a.attended && <CheckCircle size={12} />}
                                                                        {a.attended ? 'ASISTIÓ (+4)' : 'MARCAR ASISTENCIA'}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                    </div>
                </div>
            </div>
        </div>
    );
}
