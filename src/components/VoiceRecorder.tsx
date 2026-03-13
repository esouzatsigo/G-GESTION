import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Trash2 } from 'lucide-react';

interface VoiceRecorderProps {
    onSave: (audioBlob: Blob) => void;
    onDelete: () => void;
    existingUrl?: string | null;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onSave, onDelete, existingUrl }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [duration, setDuration] = useState(0);
    const [audioUrl, setAudioUrl] = useState<string | null>(existingUrl || null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const timerRef = useRef<any>(null);
    const chunksRef = useRef<Blob[]>([]);

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
                const url = URL.createObjectURL(audioBlob);
                setAudioUrl(url);
                onSave(audioBlob);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
            setDuration(0);
            
            timerRef.current = setInterval(() => {
                setDuration(prev => {
                    if (prev >= 29) { // Límite de 30 segundos
                        stopRecording();
                        return 30;
                    }
                    return prev + 1;
                });
            }, 1000);
        } catch (err) {
            console.error("Error al acceder al micrófono:", err);
            alert("No se pudo acceder al micrófono. Verifique los permisos.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (timerRef.current) clearInterval(timerRef.current);
        }
    };

    const handleDelete = () => {
        setAudioUrl(null);
        setDuration(0);
        onDelete();
    };

    return (
        <div style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid var(--glass-border)',
            borderRadius: '16px',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            alignItems: 'center'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {!audioUrl && !isRecording && (
                    <button
                        type="button"
                        onClick={startRecording}
                        className="btn btn-primary"
                        style={{ borderRadius: '50%', width: '60px', height: '60px', padding: 0 }}
                    >
                        <Mic size={32} />
                    </button>
                )}

                {isRecording && (
                    <button
                        type="button"
                        onClick={stopRecording}
                        style={{
                            borderRadius: '50%', width: '60px', height: '60px',
                            background: 'var(--status-alta)', color: 'white', border: 'none',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', animation: 'pulse 1.5s infinite'
                        }}
                    >
                        <Square size={32} />
                    </button>
                )}

                {audioUrl && !isRecording && (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <audio src={audioUrl} controls style={{ height: '40px' }} />
                        <button
                            type="button"
                            onClick={handleDelete}
                            style={{
                                background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444',
                                border: 'none', borderRadius: '12px', padding: '0.5rem', cursor: 'pointer'
                            }}
                        >
                            <Trash2 size={24} />
                        </button>
                    </div>
                )}
            </div>

            {(isRecording || audioUrl) && (
                <div style={{ 
                    fontSize: '1rem', 
                    fontWeight: '800', 
                    color: isRecording ? 'var(--status-alta)' : 'var(--text-muted)',
                    letterSpacing: '2px'
                }}>
                    {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')} / 0:30
                </div>
            )}

            {!audioUrl && !isRecording && (
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Toque para grabar comentario (Máx 30s)</span>
            )}
        </div>
    );
};
