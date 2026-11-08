'use client';

import React, { useState, useEffect } from 'react';
import MapPolygonDrawer from '@/components/admin/MapPolygonDrawer';
import { LatLngPoint, DeliveryZoneItem } from '@/types/zones';
import { findMatchingDeliveryZone } from '@/lib/geo';

export default function ZonasEnvioPage() {
  const [zones, setZones] = useState<DeliveryZoneItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedZone, setSelectedZone] = useState<DeliveryZoneItem | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [deliveryFee, setDeliveryFee] = useState(1200);
  const [minOrder, setMinOrder] = useState(10000);
  const [estimatedMin, setEstimatedMin] = useState(25);
  const [estimatedMax, setEstimatedMax] = useState(35);
  const [currentCoords, setCurrentCoords] = useState<LatLngPoint[]>([]);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testCoords, setTestCoords] = useState({ lat: -34.5885, lng: -58.4305 });

  const fetchZones = async () => {
    try {
      const res = await fetch('/api/zones');
      if (res.ok) {
        const data = await res.json();
        const mapped = data.map((z: any) => ({
          id: z.id,
          name: z.name,
          polygonGeoJson: typeof z.polygonGeoJson === 'string' ? JSON.parse(z.polygonGeoJson) : z.polygonGeoJson,
          deliveryFee: z.deliveryFee,
          minOrderAmount: z.minOrder,
          estimatedMin: z.estimatedMin,
          estimatedMax: z.estimatedMax,
          isActive: z.active,
        }));
        setZones(mapped);
      }
    } catch (err) {
      console.error('Error fetching zones:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchZones();
  }, []);

  const handleSelectZone = (zone: DeliveryZoneItem) => {
    setSelectedZone(zone);
    setName(zone.name);
    setDeliveryFee(zone.deliveryFee);
    setMinOrder(zone.minOrderAmount);
    setEstimatedMin(zone.estimatedMin);
    setEstimatedMax(zone.estimatedMax);
    setCurrentCoords(zone.polygonGeoJson);
  };

  const handleCreateNewZone = () => {
    setSelectedZone(null);
    setName('Nueva Zona de Cobertura');
    setDeliveryFee(1500);
    setMinOrder(12000);
    setEstimatedMin(30);
    setEstimatedMax(45);
    setCurrentCoords([
      { lat: -34.5850, lng: -58.4250 },
      { lat: -34.5880, lng: -58.4100 },
      { lat: -34.5980, lng: -58.4150 },
      { lat: -34.5950, lng: -58.4320 },
    ]);
  };

  const handleSaveZone = async () => {
    if (!name.trim() || currentCoords.length < 3) {
      alert('Debes definir un nombre y al menos 3 vértices para el polígono.');
      return;
    }

    try {
      if (selectedZone?.id) {
        // Update existing
        await fetch('/api/zones', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: selectedZone.id,
            name,
            polygonGeoJson: currentCoords,
            deliveryFee,
            minOrder,
            estimatedMin,
            estimatedMax,
            active: true,
          }),
        });
      } else {
        // Create new
        await fetch('/api/zones', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            polygonGeoJson: currentCoords,
            deliveryFee,
            minOrder,
            estimatedMin,
            estimatedMax,
            active: true,
          }),
        });
      }
      fetchZones();
      alert('¡Zona de envío guardada exitosamente!');
    } catch (e) {
      console.error('Error saving zone:', e);
      alert('Error al guardar la zona.');
    }
  };

  const handleDeleteZone = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar esta zona de cobertura?')) return;
    try {
      await fetch(`/api/zones?id=${id}`, { method: 'DELETE' });
      fetchZones();
      setSelectedZone(null);
    } catch (e) {
      console.error('Error deleting zone:', e);
    }
  };

  // Test point Ray-Casting algorithm
  const handleTestPoint = () => {
    const match = findMatchingDeliveryZone(testCoords, zones);
    if (match) {
      setTestResult(`✓ En cobertura: ${match.name} — Flete: $${match.deliveryFee} (${match.estimatedMin}-${match.estimatedMax} min)`);
    } else {
      setTestResult('⚠️ Fuera de cobertura directa. Aplica Retiro en Local (-15% OFF).');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-outline-variant/30">
        <div>
          <span className="font-headline text-xs uppercase tracking-wider text-secondary font-bold">
            Motor Geoespacial
          </span>
          <h1 className="font-headline font-bold text-2xl text-on-surface mt-0.5">
            Zonas de Reparto & Algoritmo Ray-Casting
          </h1>
          <p className="text-xs text-on-surface-variant">
            Dibuja polígonos de cobertura ilimitados, ajusta costos de envío y valida direcciones en tiempo real.
          </p>
        </div>

        <button
          onClick={handleCreateNewZone}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-primary hover:bg-primary-container text-white font-headline text-xs font-bold shadow-sm transition-all active:scale-95"
        >
          <span className="material-symbols-outlined text-[18px]">add_location_alt</span>
          <span>Crear Nueva Zona</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Form & Zone List */}
        <div className="space-y-4">
          {/* Zone list selector */}
          <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-card border border-outline-variant/30 space-y-2">
            <h3 className="font-headline font-bold text-xs uppercase tracking-wider text-on-surface-variant mb-2">
              Zonas Activas ({zones.length})
            </h3>
            {loading ? (
              <div className="py-4 text-xs text-on-surface-variant">Cargando polígonos...</div>
            ) : (
              <div className="space-y-2">
                {zones.map((z) => (
                  <div
                    key={z.id}
                    onClick={() => handleSelectZone(z)}
                    className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                      selectedZone?.id === z.id
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-outline-variant/40 bg-surface-container-low hover:bg-surface-container'
                    }`}
                  >
                    <div>
                      <div className="font-headline font-bold text-xs text-on-surface">
                        {z.name}
                      </div>
                      <div className="text-[10px] text-on-surface-variant">
                        Flete: ${z.deliveryFee} | Mín: ${z.minOrderAmount} ({z.estimatedMin}-{z.estimatedMax} min)
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {selectedZone?.id === z.id && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (z.id) handleDeleteZone(z.id);
                          }}
                          className="w-7 h-7 rounded-full text-error hover:bg-error-container/20 flex items-center justify-center"
                          title="Eliminar zona"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Form Parameters */}
          <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-card border border-outline-variant/30 space-y-3">
            <h3 className="font-headline font-bold text-xs uppercase tracking-wider text-secondary">
              {selectedZone ? 'Editar Parámetros de Zona' : 'Parámetros de Nueva Zona'}
            </h3>

            <div>
              <label className="block text-[11px] font-headline font-medium text-on-surface mb-1">
                Nombre de la Zona:
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Zona Palermo Soho"
                className="w-full px-3 py-2 text-xs rounded-xl bg-surface-container border border-outline-variant/50 text-on-surface focus:outline-none focus:border-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-headline font-medium text-on-surface mb-1">
                  Costo de Flete ($):
                </label>
                <input
                  type="number"
                  value={deliveryFee}
                  onChange={(e) => setDeliveryFee(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-surface-container border border-outline-variant/50 text-on-surface focus:outline-none focus:border-primary font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-headline font-medium text-on-surface mb-1">
                  Pedido Mínimo ($):
                </label>
                <input
                  type="number"
                  value={minOrder}
                  onChange={(e) => setMinOrder(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-surface-container border border-outline-variant/50 text-on-surface focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-headline font-medium text-on-surface mb-1">
                  Tiempo Mín (min):
                </label>
                <input
                  type="number"
                  value={estimatedMin}
                  onChange={(e) => setEstimatedMin(parseInt(e.target.value) || 15)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-surface-container border border-outline-variant/50 text-on-surface"
                />
              </div>

              <div>
                <label className="block text-[11px] font-headline font-medium text-on-surface mb-1">
                  Tiempo Máx (min):
                </label>
                <input
                  type="number"
                  value={estimatedMax}
                  onChange={(e) => setEstimatedMax(parseInt(e.target.value) || 45)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-surface-container border border-outline-variant/50 text-on-surface"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleSaveZone}
              className="w-full mt-2 py-3 rounded-full bg-primary hover:bg-primary-container text-white font-headline font-bold text-xs shadow-sm transition-all active:scale-[0.98]"
            >
              Guardar Polígono & Parámetros
            </button>
          </div>

          {/* Interactive Ray-Casting Test Simulator */}
          <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-card border border-outline-variant/30 space-y-3">
            <h3 className="font-headline font-bold text-xs uppercase tracking-wider text-tertiary">
              Simulador Ray-Casting de Cobertura
            </h3>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[10px] text-on-surface-variant block">Latitud:</span>
                <input
                  type="number"
                  step="0.0001"
                  value={testCoords.lat}
                  onChange={(e) => setTestCoords({ ...testCoords, lat: parseFloat(e.target.value) })}
                  className="w-full px-2 py-1.5 rounded-lg bg-surface-container text-xs"
                />
              </div>
              <div>
                <span className="text-[10px] text-on-surface-variant block">Longitud:</span>
                <input
                  type="number"
                  step="0.0001"
                  value={testCoords.lng}
                  onChange={(e) => setTestCoords({ ...testCoords, lng: parseFloat(e.target.value) })}
                  className="w-full px-2 py-1.5 rounded-lg bg-surface-container text-xs"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTestCoords({ lat: -34.5885, lng: -58.4305 })}
                className="text-[10px] px-2 py-1 bg-surface-container rounded-md hover:bg-surface-container-high"
              >
                Palermo Soho
              </button>
              <button
                type="button"
                onClick={() => setTestCoords({ lat: -34.5900, lng: -58.3950 })}
                className="text-[10px] px-2 py-1 bg-surface-container rounded-md hover:bg-surface-container-high"
              >
                Recoleta
              </button>
              <button
                type="button"
                onClick={() => setTestCoords({ lat: -34.6500, lng: -58.4000 })}
                className="text-[10px] px-2 py-1 bg-surface-container rounded-md hover:bg-surface-container-high"
              >
                Fuera
              </button>
            </div>

            <button
              type="button"
              onClick={handleTestPoint}
              className="w-full py-2 rounded-xl bg-tertiary text-white font-headline font-bold text-xs active:scale-95 transition-all"
            >
              Testear Punto Ray-Casting
            </button>

            {testResult && (
              <div className="p-2.5 rounded-xl bg-surface-container text-xs font-headline font-semibold text-on-surface border border-outline-variant/30">
                {testResult}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Google Maps Drawing Manager Canvas */}
        <div className="lg:col-span-2 bg-surface-container-lowest rounded-2xl p-4 shadow-card border border-outline-variant/30 flex flex-col min-h-[550px]">
          <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20 mb-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">draw</span>
              <span className="font-headline font-bold text-sm text-on-surface">
                Visor y Editor de Polígonos Geoespaciales
              </span>
            </div>
            <span className="text-[11px] text-on-surface-variant font-medium">
              Vértices: {currentCoords.length}
            </span>
          </div>

          <div className="flex-1 rounded-xl overflow-hidden border border-outline-variant/30 relative">
            <MapPolygonDrawer
              zones={zones}
              selectedZone={selectedZone}
              onPolygonComplete={(coords) => setCurrentCoords(coords)}
              onPolygonUpdate={(coords) => setCurrentCoords(coords)}
              centerDefault={{ lat: -34.5885, lng: -58.4305 }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
