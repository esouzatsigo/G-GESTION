import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square } from 'lucide-react';

interface UnifiedVoiceInputProps {
    onTextResult: (text: string) => void;
    onAudioBlob: (blob: Blob) => void;
    disabled?: boolean;
}

export const UnifiedVoiceInput: React.FC<UnifiedVoiceInputProps> = ({ onTextResult, onAudioBlob, disabled }) => {
    const [isListening, setIsListening] = useState(false);
    const [supported, setSupported] = useState(false);
    
    // Recording refs
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const recognitionRef = useRef<any>(null);

    useEffect(() => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            setSupported(true);
        }
    }, []);

    const startSession = async () => {
        if (!supported) return;
        
        try {
            // 1. Start Audio Recording (MediaRecorder)
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
                onAudioBlob(audioBlob);
                stream.getTracks().forEach(track => track.stop());
            };

            // 2. Start Speech Recognition
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            const recognition = new SpeechRecognition();
            recognitionRef.current = recognition;

            recognition.lang = 'es-MX';
            recognition.interimResults = false;
            recognition.maxAlternatives = 1;

            recognition.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                onTextResult(transcript);
            };

            recognition.onerror = (event: any) => {
                console.error('Speech recognition error:', event.error);
                stopSession();
            };

            recognition.onend = () => {
                // Handle auto-end if needed, but we prefer manual stop
                if (isListening) {
                    stopSession();
                }
            };

            // Start both
            mediaRecorder.start();
            recognition.start();
            setIsListening(true);

        } catch (err) {
            console.error("Error starting unified voice input:", err);
            setIsListening(false);
        }
    };

    const stopSession = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
        if (recognitionRef.current) {
            try {
                recognitionRef.current.stop();
            } catch (e) {
                // Ignore if already stopped
            }
        }
        setIsListening(false);
    };

    const toggleSession = () => {
        if (isListening) {
            stopSession();
        } else {
            startSession();
        }
    };

    if (!supported) return null;

    return (
        <button
            type="button"
            onClick={toggleSession}
            disabled={disabled}
            style={{
                background: isListening ? '#ef4444' : 'rgba(255,255,255,0.05)',
                border: '1px solid var(--glass-border)',
                color: isListening ? 'white' : 'var(--primary)',
                padding: '0.6rem',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s',
                width: '46px',
                height: '46px',
                boxShadow: isListening ? '0 0 20px rgba(239, 68, 68, 0.6)' : '0 2px 8px rgba(0,0,0,0.1)',
                zIndex: 20
            }}
            className={isListening ? 'animate-pulse' : ''}
            title={isListening ? "Grabando y Escuchando... Toque para detener" : "Dictado con Grabación de Audio"}
        >
            {isListening ? (
                <Square size={20} fill="white" />
            ) : (
                <Mic size={24} />
            )}
        </button>
    );
};
