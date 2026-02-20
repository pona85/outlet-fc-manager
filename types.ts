export interface Player {
    id: string;
    name: string;
    position: string;
    avatar: string;
    number?: number;
    status?: 'Activo' | 'Lesionado' | 'Suspendido';
    paymentStatus?: 'Pagado' | 'Parcial' | 'Vencido' | 'Crítico';
    attendance?: number;
}

export interface Match {
    id: string;
    opponent: string;
    date: string;
    time: string;
    location: string;
    score?: string;
    result?: 'Ganó' | 'Perdió' | 'Empató' | 'Pendiente';
    opponentLogo: string;
}

export interface ChatMessage {
    id: string;
    user: string;
    avatar: string;
    content: string;
    time: string;
    isMe?: boolean;
    likes?: number;
}
