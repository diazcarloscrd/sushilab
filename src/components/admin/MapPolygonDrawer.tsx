'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { LatLngPoint, DeliveryZoneItem } from '@/types/zones';
import { isPointInPolygon } from '@/lib/geo';
import { 
  Layers, 
  MapPin, 
  Trash2, 
  PenTool, 
  CheckCircle2, 
  AlertCircle,
  Eye,
  Crosshair
} from 'lucide-react';

interface MapPolygonDrawerProps {
  zones: DeliveryZoneItem[];
  selectedZone: DeliveryZoneItem | null;
  onPolygonComplete: (coords: LatLngPoint[]) => void;
  onPolygonUpdate: (coords: LatLngPoint[]) => void;
  centerDefault?: LatLngPoint;
}

declare global {
  interface Window {
    google: any;
    initGoogleMapsDrawing?: () => void;
  }
}

export default function MapPolygonDrawer({
  zones,
  selectedZone,
  onPolygonComplete,
  onPolygonUpdate,
  centerDefault = { lat: -38.7183, lng: -62.2663 } // Coordenada base (Bahía Blanca, Centro)
}: MapPolygonDrawerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const drawingManagerInstance = useRef<any>(null);
  const activePolygonInstance = useRef<any>(null);
  const existingPolygonsRef = useRef<any[]>([]);
  const testMarkerRef = useRef<any>(null);

  const [isDrawingMode, setIsDrawingMode] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ zoneName: string; fee: number } | null>(null);
  const [isOutsideCoverage, setIsOutsideCoverage] = useState<boolean>(false);

  // Escuchar mutaciones de vértices en el polígono seleccionado
  const attachPathListeners = useCallback((polygon: any) => {
    const path = polygon.getPath();
    const updateHandler = () => {
      const coords: LatLngPoint[] = [];
      for (let i = 0; i < path.getLength(); i++) {
        const xy = path.getAt(i);
        coords.push({ lat: xy.lat(), lng: xy.lng() });
      }
      onPolygonUpdate(coords);
    };

    window.google.maps.event.addListener(path, 'set_at', updateHandler);
    window.google.maps.event.addListener(path, 'insert_at', updateHandler);
    window.google.maps.event.addListener(path, 'remove_at', updateHandler);
  }, [onPolygonUpdate]);

  // Carga e inicialización de Google Maps SDK
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
    if (!window.google) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=drawing,geometry,places`;
      script.async = true;
      script.defer = true;
      script.onload = () => initMap();
      document.head.appendChild(script);
    } else {
      initMap();
    }

    function initMap() {
      if (!mapRef.current || mapInstance.current) return;

      mapInstance.current = new window.google.maps.Map(mapRef.current, {
        center: centerDefault,
        zoom: 13,
        mapId: 'YANKUN_STUDIO_MAP',
        disableDefaultUI: false,
        zoomControl: true,
        streetViewControl: false,
        fullscreenControl: false,
        styles: [
          { featureType: 'poi', stylers: [{ visibility: 'off' }] },
          { featureType: 'transit', stylers: [{ visibility: 'simplified' }] }
        ]
      });

      // Configuración del gestor de dibujo
      drawingManagerInstance.current = new window.google.maps.drawing.DrawingManager({
        drawingMode: null,
        drawingControl: false,
        polygonOptions: {
          fillColor: '#c93b2b',
          fillOpacity: 0.28,
          strokeColor: '#a62216',
          strokeWeight: 2.5,
          clickable: true,
          editable: true,
          zIndex: 1
        }
      });

      drawingManagerInstance.current.setMap(mapInstance.current);

      // Evento de finalización de dibujo
      window.google.maps.event.addListener(
        drawingManagerInstance.current,
        'polygoncomplete',
        (polygon: any) => {
          setIsDrawingMode(false);
          drawingManagerInstance.current.setDrawingMode(null);

          if (activePolygonInstance.current) {
            activePolygonInstance.current.setMap(null);
          }
          activePolygonInstance.current = polygon;

          const path = polygon.getPath();
          const coordinates: LatLngPoint[] = [];
          for (let i = 0; i < path.getLength(); i++) {
            coordinates.push({ lat: path.getAt(i).lat(), lng: path.getAt(i).lng() });
          }

          attachPathListeners(polygon);
          onPolygonComplete(coordinates);
        }
      );

      // Listener para probar puntos en el mapa con clic
      mapInstance.current.addListener('click', (e: any) => {
        const clickedPoint = { lat: e.latLng.lat(), lng: e.latLng.lng() };
        handleTestLocation(clickedPoint);
      });
    }
  }, [centerDefault, onPolygonComplete, attachPathListeners]);

  // Dibujar todas las zonas existentes en el mapa
  useEffect(() => {
    if (!mapInstance.current || !window.google) return;

    // Limpiar polígonos anteriores
    existingPolygonsRef.current.forEach((poly) => poly.setMap(null));
    existingPolygonsRef.current = [];

    zones.forEach((zone) => {
      const isSelected = selectedZone?.id === zone.id;
      const poly = new window.google.maps.Polygon({
        paths: zone.polygonGeoJson,
        strokeColor: isSelected ? '#a62216' : (zone.colorHex || '#755a2a'),
        strokeOpacity: 0.9,
        strokeWeight: isSelected ? 3.5 : 1.8,
        fillColor: isSelected ? '#c93b2b' : (zone.colorHex || '#fdd79c'),
        fillOpacity: isSelected ? 0.35 : 0.18,
        editable: isSelected,
        draggable: false,
        map: mapInstance.current
      });

      if (isSelected) {
        if (activePolygonInstance.current) {
          activePolygonInstance.current.setMap(null);
        }
        activePolygonInstance.current = poly;
        attachPathListeners(poly);
      }

      existingPolygonsRef.current.push(poly);
    });
  }, [zones, selectedZone, attachPathListeners]);

  // Alternar herramienta de dibujo
  const toggleDrawing = () => {
    if (!drawingManagerInstance.current) return;
    if (isDrawingMode) {
      drawingManagerInstance.current.setDrawingMode(null);
      setIsDrawingMode(false);
    } else {
      drawingManagerInstance.current.setDrawingMode(window.google.maps.drawing.OverlayType.POLYGON);
      setIsDrawingMode(true);
    }
  };

  // Limpiar polígono activo en pantalla
  const clearActiveShape = () => {
    if (activePolygonInstance.current) {
      activePolygonInstance.current.setMap(null);
      activePolygonInstance.current = null;
      onPolygonUpdate([]);
    }
  };

  // Simulación y validación de cobertura con el clic del operador
  const handleTestLocation = (point: LatLngPoint) => {
    if (!mapInstance.current || !window.google) return;

    if (testMarkerRef.current) {
      testMarkerRef.current.setMap(null);
    }

    testMarkerRef.current = new window.google.maps.Marker({
      position: point,
      map: mapInstance.current,
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 6,
        fillColor: '#1f1b1a',
        fillOpacity: 1,
        strokeWeight: 2,
        strokeColor: '#ffffff'
      }
    });

    let matched: DeliveryZoneItem | null = null;
    for (const z of zones) {
      if (z.isActive && isPointInPolygon(point, z.polygonGeoJson)) {
        matched = z;
        break;
      }
    }

    if (matched) {
      setTestResult({ zoneName: matched.name, fee: matched.deliveryFee });
      setIsOutsideCoverage(false);
    } else {
      setTestResult(null);
      setIsOutsideCoverage(true);
    }
  };

  return (
    <div className="relative w-full h-[620px] rounded-2xl overflow-hidden border border-outline-variant/30 shadow-md bg-surface-container">
      {/* Contenedor DOM para la instancia de Google Maps */}
      <div ref={mapRef} className="w-full h-full" />

      {/* Barra de herramientas flotante superior */}
      <div className="absolute top-4 left-4 z-10 flex flex-wrap items-center gap-2 bg-surface/90 backdrop-blur-md px-3 py-2 rounded-xl shadow-lg border border-outline-variant/20">
        <button
          type="button"
          onClick={toggleDrawing}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-xs transition-all ${
            isDrawingMode
              ? 'bg-primary text-on-primary shadow-sm'
              : 'bg-surface-container-high text-on-surface hover:bg-surface-variant'
          }`}
        >
          <PenTool size={14} />
          <span>{isDrawingMode ? 'Dibujando (Clic para cerrar)' : 'Trazar Nuevo Polígono'}</span>
        </button>

        <button
          type="button"
          onClick={clearActiveShape}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-high hover:bg-error-container hover:text-on-error-container text-on-surface-variant text-xs transition-all"
        >
          <Trash2 size={14} />
          <span>Limpiar Trazo</span>
        </button>

        <div className="h-4 w-px bg-outline-variant/40" />

        <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
          <Crosshair size={14} className="text-secondary" />
          <span>Haz clic en el mapa para testear cobertura</span>
        </div>
      </div>

      {/* Tarjeta de resultado del test de cobertura */}
      {(testResult || isOutsideCoverage) && (
        <div className="absolute bottom-4 left-4 z-10 bg-surface/95 backdrop-blur-md p-3.5 rounded-xl shadow-xl border border-outline-variant/30 flex items-center gap-3 animate-fade-in">
          {testResult ? (
            <>
              <div className="w-8 h-8 rounded-full bg-tertiary-fixed text-on-tertiary-fixed flex items-center justify-center">
                <CheckCircle2 size={18} />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs font-bold text-on-surface">{testResult.zoneName}</span>
                <span className="text-xs text-tertiary font-semibold">
                  Costo de entrega: ${testResult.fee.toLocaleString('es-AR')}
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="w-8 h-8 rounded-full bg-error-container text-on-error-container flex items-center justify-center">
                <AlertCircle size={18} />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs font-bold text-on-surface">Punto fuera de cobertura</span>
                <span className="text-xs text-error font-medium">No pertenece a ningún polígono activo</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
