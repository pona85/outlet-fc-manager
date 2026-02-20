import React from 'react';
import { Send, ThumbsUp } from 'lucide-react';
import { ChatMessage } from '../types';

const mockMessages: ChatMessage[] = [
    {
        id: '1',
        user: 'DT Dave',
        avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuARDE2H1qEQRBty1GZ2hjlMOkmKtJsi24Dzu8ppUP2nYUfiEbIHTfn3xDvm9QqzNT6iA4w8mxtiU7DBspEryxZqDii9XioaW6au7gYQX0Jo4J5ViEqVa1CISVq24E7JcU-ZmDkKSYS7Hns9x8102hrytsgE5hLcOy954tkfcxG4vXsDsvD3NqnqIdYSt9MzRL80a9cpFJ0_mXFYv8z6q8v9nbH2-eHovL2IHfEOiHEMZ6GrzK5xieUGdM6paOxTcsGEUKQkQ6EbvgU',
        content: '¡No olviden traer la equipación negra de repuesto este domingo!',
        time: '10:30 AM'
    },
    {
        id: '2',
        user: 'Mike T.',
        avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCydmn1aa66PrYxDy9LX_bIa5ObW_kc-8peHoHxBZr6QKA1z1oEKkJ7I5rbPle6wo7IPDKV2eRFbTfjb2zo16UUtnOz8qFV30eZusA8hdEapDyYYpJR44eNUqooxwb39ZlEukKikwlyFqjndZeb3_DQsDom6UB8hofEIw0ENSUkfRmT1N09Mxhg6cHAH1bUmSl3uMsljtN9hxwMfnmSTDQUeXIbQZQr_462LFY1ipD7tEGZr9TjNCzUK9O5wFK-9Inz3z45E18Oxto',
        content: 'Puedo llevar a alguien si necesitan transporte desde el centro.',
        time: '10:42 AM',
        likes: 2
    },
    {
        id: '3',
        user: 'Tú',
        avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDp_Q5O6_wewU7sTITtqiE-9TtVRIapkTL201KdBJBwEgq6VbmsmicaUQCOFcIHqgUDXZC2rVFbuy6VUbNS4EanuzE9Ql8hbONrLaOhDm1eHmqHrDrBpNF5KJuHvcsYyRp8TXu8M0bn9xNr8DKLeD4sA0Es7lmlXOIUBAuglc1WCfYA2svQu04Sv_kqcYHfMUkj72riRak16LO9nTqHmRiKSk3D90FF7qILud130M0ljBQr5kyuqvq8LwWzA38k40aDXzm__n0BU1I',
        content: '¡Voy! Nos vemos allá.',
        time: '11:05 AM',
        isMe: true
    },
    {
        id: '4',
        user: 'Sarah K.',
        avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBhNbtvqxHxhQVobd2PzsxdMJHEr_QywDkDGzWMqeMRER1QRd1OVrlqDIWj0rWa8_MC4WI0sJbn_UjaDgc_tym38WBDNFSRr92p9zl_uvk8HJEhkIE26zCtxUOBrH4hd5O2qupNVxQwRSPYefZBsdAAaMV75DFo_z19O2iTsyMUXwR75Re8Ijg2ZUy90YsnE2kfC3QtzhuEqW02mjUaylRK4T6dYyoXhWSLKYrWw4p0xUgfXB0tGKd5mWSKRFRRCrVWpODEfl6O5ZE',
        content: '¿Pagamos las tarifas del árbitro de la semana pasada? 🤔',
        time: '11:15 AM'
    }
];

export const RightSidebar: React.FC = () => {
    return (
        <aside className="hidden xl:flex w-80 bg-card-light dark:bg-card-dark border-l border-gray-200 dark:border-gray-800 flex-col fixed right-0 h-screen z-40">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-secondary/30">
                <h2 className="font-display font-bold text-xl text-gray-900 dark:text-white uppercase tracking-wide">El Muro</h2>
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(140,214,150,0.8)]"></div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {mockMessages.map((msg) => (
                    <div key={msg.id} className={`flex gap-3 ${msg.isMe ? 'flex-row-reverse' : ''}`}>
                        <img src={msg.avatar} alt={msg.user} className="w-8 h-8 rounded-full mt-1 object-cover" />
                        <div className={`flex flex-col ${msg.isMe ? 'items-end' : ''}`}>
                            <div className="flex items-baseline gap-2">
                                <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{msg.user}</span>
                                <span className="text-[10px] text-gray-400">{msg.time}</span>
                            </div>
                            <div className={`mt-1 p-3 text-sm rounded-xl max-w-[220px] 
                                ${msg.isMe 
                                    ? 'bg-primary/20 text-gray-800 dark:text-green-100 border border-primary/20 rounded-tr-none' 
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-tl-none'
                                }`}>
                                {msg.content}
                            </div>
                            {msg.likes && (
                                <div className="flex gap-1 mt-1">
                                    <span className="bg-white dark:bg-[#151c26] border border-gray-200 dark:border-gray-700 px-1.5 py-0.5 rounded-full text-xs cursor-pointer hover:bg-gray-50 flex items-center gap-1">
                                        <ThumbsUp size={10} /> {msg.likes}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-card-light dark:bg-card-dark">
                <div className="relative">
                    <input 
                        type="text" 
                        placeholder="Escribe un mensaje..." 
                        className="w-full pl-4 pr-10 py-3 bg-gray-50 dark:bg-[#151c26] border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder-gray-400"
                    />
                    <button className="absolute right-2 top-2 p-1 text-primary hover:text-green-400 transition-colors">
                        <Send size={18} className="-rotate-45 relative top-1 right-1" />
                    </button>
                </div>
            </div>
        </aside>
    );
};
