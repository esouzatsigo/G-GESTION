import React, { useEffect, useRef, useState } from 'react';
import { X, Search, Check, MapPin } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';

interface MapPickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (lat: number, lng: number) => void;
    initialAddress?: string;
    initialLat?: number;
    initialLng?: number;
}

declare global {
    interface Window {
        google: any;
    }
}

export const MapPickerModal: React.FC<MapPickerModalProps> = ({
    isOpen,
    onClose,
    onSelect,
    initialAddress,
    initialLat,
    initialLng
}) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const [map, setMap] = useState<any>(null);
    const [marker, setMarker] = useState<any>(null);
    const [currentLat, setCurrentLat] = useState<number>(initialLat ?? 20.967375);
    const [currentLng, setCurrentLng] = useState<number>(initialLng ?? -89.592582);
    const [isLoaded, setIsLoaded] = useState(false);
    const { showNotification } = useNotification();

    // Synchronize state with props if they change
    useEffect(() => {
        if (initialLat !== undefined) setCurrentLat(initialLat);
        if (initialLng !== undefined) setCurrentLng(initialLng);
    }, [initialLat, initialLng]);

    // Reset loop protection
    const initRef = useRef(false);

    useEffect(() => {
        if (!isOpen) {
            setMap(null);
            setMarker(null);
            initRef.current = false;
        }
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;

        const initGoogleMaps = () => {
            if (window.google && window.google.maps) {
                setIsLoaded(true);
                return;
            }

            // Check if script already exists to avoid duplicates
            const existingScript = document.getElementById('google-maps-script');
            if (existingScript) {
                existingScript.addEventListener('load', () => setIsLoaded(true));
                return;
            }

            const script = document.createElement('script');
            script.id = 'google-maps-script';
            script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyCmQL7Tw4EcoAw2eLX1JlvhfXbiHm7UQaw&libraries=places`;
            script.async = true;
            script.defer = true;
            script.onload = () => setIsLoaded(true);
            script.onerror = () => showNotification("Error al cargar Google Maps. Verifique su conexión o llave API.", "error");
            document.head.appendChild(script);
        };

        initGoogleMaps();
    }, [isOpen]);

    useEffect(() => {
        if (isLoaded && isOpen && mapRef.current && !map && !initRef.current) {
            initRef.current = true;
            try {
                const startLat = initialLat ?? currentLat;
                const startLng = initialLng ?? currentLng;

                const mapInstance = new window.google.maps.Map(mapRef.current, {
                    center: { lat: startLat, lng: startLng },
                    zoom: 15,
                    mapTypeControl: false,
                    streetViewControl: false,
                    fullscreenControl: false,
                    backgroundColor: '#111'
                });

                const markerInstance = new window.google.maps.Marker({
                    position: { lat: startLat, lng: startLng },
                    map: mapInstance,
                    draggable: true,
                    animation: window.google.maps.Animation.DROP
                });

                markerInstance.addListener('dragend', () => {
                    const pos = markerInstance.getPosition();
                    if (pos) {
                        setCurrentLat(pos.lat());
                        setCurrentLng(pos.lng());
                    }
                });

                setMap(mapInstance);
                setMarker(markerInstance);

                // Force a resize trigger after a short delay
                setTimeout(() => {
                    window.google.maps.event.trigger(mapInstance, 'resize');
                    mapInstance.setCenter({ lat: startLat, lng: startLng });
                }, 300);

                if (initialAddress && !initialLat) {
                    const geocoder = new window.google.maps.Geocoder();
                    geocoder.geocode({ address: initialAddress }, (results: any, status: string) => {
                        if (status === 'OK' && results[0]) {
                            const loc = results[0].geometry.location;
                            mapInstance.setCenter(loc);
                            markerInstance.setPosition(loc);
                            setCurrentLat(loc.lat());
                            setCurrentLng(loc.lng());
                        }
                    });
                }
            } catch (err) {
                console.error("Map initialization error:", err);
                initRef.current = false;
            }
        }
    }, [isLoaded, isOpen, initialAddress, initialLat, initialLng, map, currentLat, currentLng]);

    const handleSearch = () => {
        if (!window.google || !map || !marker || !initialAddress) return;
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ address: initialAddress }, (results: any, status: string) => {
            if (status === 'OK' && results[0]) {
                const loc = results[0].geometry.location;
                map.setCenter(loc);
                marker.setPosition(loc);
                setCurrentLat(loc.lat());
                setCurrentLng(loc.lng());
            } else {
                showNotification('No se pudo encontrar la dirección: ' + status, "warning");
            }
        });
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1rem', zIndex: 1000
        }}>
            <div className="glass-card animate-scale-up" style={{ width: '100%', maxWidth: '800px', height: '80vh', display: 'flex', flexDirection: 'column', border: '1px solid var(--accent)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem' }}>
                    <div>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <MapPin className="text-accent" /> UBICAR SUCURSAL EN GOOGLE MAPS
                        </h2>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Mueve el cursor rojo para ajustar la ubicación exacta.</p>
                    </div>
                    <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', padding: '0.5rem', borderRadius: '50%', cursor: 'pointer' }}>
                        <X size={24} />
                    </button>
                </div>

                <div style={{ flex: 1, position: 'relative', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--glass-border)', marginBottom: '1rem', minHeight: '350px' }}>
                    <div ref={mapRef} style={{ width: '100%', height: '100%', minHeight: '350px' }}>
                        {!isLoaded && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: '#111', color: 'var(--text-muted)' }}>Cargando Google Maps...</div>}
                    </div>

                    {/* Search overlay inside map */}
                    <div style={{ position: 'absolute', top: '10px', left: '10px', right: '10px', display: 'flex', gap: '0.5rem' }}>
                        <div style={{ flex: 1, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)', borderRadius: '8px', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', border: '1px solid var(--glass-border)' }}>
                            <span style={{ fontSize: '0.8rem', color: 'white', opacity: 0.8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {initialAddress || 'Sin dirección registrada'}
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={handleSearch}
                            style={{ background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', padding: '0 1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: '600', fontSize: '0.8rem' }}
                        >
                            <Search size={16} /> RE-UBICAR
                        </button>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        <span style={{ color: 'var(--accent)', fontWeight: '700' }}>Coord:</span> {currentLat.toFixed(6)}, {currentLng.toFixed(6)}
                    </div>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button className="btn" onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', color: 'white' }}>Cancelar</button>
                        <button
                            className="btn btn-primary"
                            onClick={() => onSelect(currentLat, currentLng)}
                            style={{ background: 'var(--accent)', color: 'black', fontWeight: '800' }}
                        >
                            <Check size={18} /> USAR ESTA UBICACIÓN
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
