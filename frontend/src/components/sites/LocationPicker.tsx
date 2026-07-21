import { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
    GoogleMap,
    LoadScript,
    Marker,
    Circle,
    Autocomplete,
} from '@react-google-maps/api';
import { MapPin, Search } from 'lucide-react';

interface LocationPickerProps {
    latitude: number | null;
    longitude: number | null;
    radius: number;
    onLocationChange: (lat: number, lng: number) => void;
    onRadiusChange?: (radius: number) => void;
}

// Default center (Bangkok, Thailand)
const DEFAULT_CENTER = {
    lat: 13.7563,
    lng: 100.5018,
};

const MAP_CONTAINER_STYLE = {
    width: '100%',
    height: '400px',
};

const GOOGLE_MAPS_LIBRARIES: ('places' | 'geometry' | 'drawing' | 'visualization')[] = ['places'];

export default function LocationPicker({
    latitude,
    longitude,
    radius,
    onLocationChange,
}: LocationPickerProps) {
    const { t } = useTranslation();
    const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
    const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>(
        latitude && longitude ? { lat: latitude, lng: longitude } : DEFAULT_CENTER
    );
    const [markerPosition, setMarkerPosition] = useState<{ lat: number; lng: number } | null>(
        latitude && longitude ? { lat: latitude, lng: longitude } : null
    );

    // Update marker position when props change
    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        if (latitude && longitude) {
            const newPosition = { lat: latitude, lng: longitude };
            setMarkerPosition(newPosition);
            setMapCenter(newPosition);
        }
    }, [latitude, longitude]);
    /* eslint-enable react-hooks/set-state-in-effect */

    // Handle marker drag
    const handleMarkerDragEnd = useCallback(
        (e: google.maps.MapMouseEvent) => {
            if (e.latLng) {
                const lat = e.latLng.lat();
                const lng = e.latLng.lng();
                setMarkerPosition({ lat, lng });
                onLocationChange(lat, lng);
            }
        },
        [onLocationChange]
    );

    // Handle map click
    const handleMapClick = useCallback(
        (e: google.maps.MapMouseEvent) => {
            if (e.latLng) {
                const lat = e.latLng.lat();
                const lng = e.latLng.lng();
                setMarkerPosition({ lat, lng });
                onLocationChange(lat, lng);
            }
        },
        [onLocationChange]
    );

    // Handle autocomplete place selection
    const handlePlaceSelect = useCallback(() => {
        if (autocompleteRef.current) {
            const place = autocompleteRef.current.getPlace();
            if (place.geometry?.location) {
                const lat = place.geometry.location.lat();
                const lng = place.geometry.location.lng();
                const newPosition = { lat, lng };
                setMarkerPosition(newPosition);
                setMapCenter(newPosition);
                onLocationChange(lat, lng);
            }
        }
    }, [onLocationChange]);

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
        return (
            <div className="flex items-center justify-center h-[400px] bg-neutral-100 dark:bg-neutral-800 rounded-lg">
                <div className="text-center">
                    <MapPin size={48} className="mx-auto text-neutral-400 mb-2" />
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        {t('sites.googleMapsKeyMissing', 'Google Maps API key not configured')}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <LoadScript googleMapsApiKey={apiKey} libraries={GOOGLE_MAPS_LIBRARIES}>
                <div className="relative">
                    {/* Search Box */}
                    <div className="absolute top-3 left-3 right-3 z-10">
                        <div className="relative">
                            <Search
                                size={18}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 z-10"
                            />
                            <Autocomplete
                                onLoad={(autocomplete: google.maps.places.Autocomplete) => {
                                    autocompleteRef.current = autocomplete;
                                }}
                                onPlaceChanged={handlePlaceSelect}
                            >
                                <input
                                    type="text"
                                    placeholder={t('sites.searchLocation', 'Search for a location...')}
                                    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-lg shadow-sm text-sm text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                />
                            </Autocomplete>
                        </div>
                    </div>

                    {/* Google Map */}
                    <GoogleMap
                        mapContainerStyle={MAP_CONTAINER_STYLE}
                        center={mapCenter}
                        zoom={15}
                        onClick={handleMapClick}
                        options={{
                            streetViewControl: false,
                            mapTypeControl: true,
                            fullscreenControl: true,
                            zoomControl: true,
                        }}
                    >
                        {/* Marker */}
                        {markerPosition && (
                            <Marker
                                position={markerPosition}
                                draggable={true}
                                onDragEnd={handleMarkerDragEnd}
                                animation={google.maps.Animation.DROP}
                            />
                        )}

                        {/* Geofence Circle */}
                        {markerPosition && radius > 0 && (
                            <Circle
                                center={markerPosition}
                                radius={radius}
                                options={{
                                    fillColor: '#3b82f6',
                                    fillOpacity: 0.15,
                                    strokeColor: '#3b82f6',
                                    strokeOpacity: 0.8,
                                    strokeWeight: 2,
                                }}
                            />
                        )}
                    </GoogleMap>
                </div>
            </LoadScript>

            {/* Instructions */}
            <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                <MapPin size={16} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-blue-800 dark:text-blue-300">
                    <p className="font-medium mb-1">
                        {t('sites.mapInstructions', 'How to use the map:')}
                    </p>
                    <ul className="list-disc list-inside space-y-0.5 ml-1">
                        <li>{t('sites.mapInstruction1', 'Search for a location using the search bar')}</li>
                        <li>{t('sites.mapInstruction2', 'Click anywhere on the map to set a marker')}</li>
                        <li>{t('sites.mapInstruction3', 'Drag the marker to adjust the exact position')}</li>
                        <li>{t('sites.mapInstruction4', 'The blue circle shows the geofence radius')}</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
