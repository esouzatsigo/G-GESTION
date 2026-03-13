import React, { useState, useEffect } from 'react';
import { Mic, Loader2 } from 'lucide-react';

interface VoiceInputProps {
    onResult: (text: string) => void;
    placeholder?: string;
    disabled?: boolean;
}

export const VoiceInput: React.FC<VoiceInputProps> = ({ onResult, disabled }) => {
    const [isListening, setIsListening] = useState(false);
    const [supported, setSupported] = useState(false);

    useEffect(() => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            setSupported(true);
        }
    }, []);

    const toggleListening = () => {
        if (!supported) return;

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();

        recognition.lang = 'es-MX';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        if (isListening) {
            setIsListening(false);
            recognition.stop();
        } else {
            setIsListening(true);
            recognition.start();

            recognition.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                onResult(transcript);
                setIsListening(false);
            };

            recognition.onerror = (event: any) => {
                console.error('Speech recognition error:', event.error);
                setIsListening(false);
            };

            recognition.onend = () => {
                setIsListening(false);
            };
        }
    };

    if (!supported) return null;

    return (
        <button
            type="button"
            onClick={toggleListening}
            disabled={disabled}
            style={{
                background: isListening ? 'var(--status-alta)' : 'rgba(255,255,255,0.05)',
                border: '1px solid var(--glass-border)',
                color: isListening ? 'white' : 'var(--primary)',
                padding: '0.5rem',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s',
                width: '44px',
                height: '44px',
                boxShadow: isListening ? '0 0 15px var(--status-alta)' : 'none'
            }}
            title={isListening ? "Escuchando..." : "Dictado por voz"}
        >
            {isListening ? (
                <Loader2 className="animate-spin" size={24} />
            ) : (
                <Mic size={24} />
            )}
        </button>
    );
};
