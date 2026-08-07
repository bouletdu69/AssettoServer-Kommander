import React, { useState, useEffect } from 'react';

interface WeatherPreset {
  graphics: string;
  baseTemperatureAmbient: number;
  baseTemperatureRoad: number;
  variationAmbient: number;
  variationRoad: number;
  windBaseSpeedMin: number;
  windBaseSpeedMax: number;
  windBaseDirection: number;
  windVariationDirection: number;
}

interface EntryListSlot {
  car: string;
  skin: string;
  name: string;
  team: string;
  guid: string;
}

export interface TrafficConfig {
  car: string;
  skin: string;
  count: number;
}

interface SessionConfig {
  enabled: boolean;
  time: number;
  laps?: number;
}

interface SessionsPreset {
  practice: SessionConfig;
  qualify: SessionConfig;
  race: SessionConfig;
}

interface EventPreset {
  id?: string;
  name: string;
  description: string;
  track: string;
  trackLayout: string;
  availableCars: string[];
  maxClients: number;
  password: string;
  loopMode: boolean;
  weather: WeatherPreset;
  sessions: SessionsPreset;
  entryList: EntryListSlot[];
  traffic: TrafficConfig[];
  aiMaxCars?: number;
  aiMinDistance?: number;
  createdAt?: string;
  updatedAt?: string;
}

interface TrackLayout {
  id: string;
  name: string;
  length: string;
  pitboxes: string;
}

interface Track {
  id: string;
  name: string;
  layouts?: TrackLayout[];
  pitboxes: string;
}

interface Car {
  id: string;
  name: string;
  skins?: string[];
}

interface EventBuilderViewProps {
  onLaunch?: () => void;
}

export const EventBuilderView: React.FC<EventBuilderViewProps> = ({ onLaunch }) => {
  const [presets, setPresets] = useState<EventPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPreset, setEditingPreset] = useState<EventPreset | null>(null);
  const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  const [carSearch, setCarSearch] = useState('');
  
  const [tracks, setTracks] = useState<Track[]>([]);
  const [cars, setCars] = useState<Car[]>([]);

  useEffect(() => {
    fetchPresets();
    fetch('/api/content/tracks').then(r => r.json()).then(setTracks);
    fetch('/api/content/cars').then(r => r.json()).then(setCars);
  }, []);

  const fetchPresets = () => {
    setLoading(true);
    fetch('/api/presets')
      .then(res => res.json())
      .then(data => {
        setPresets(data || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  const handleCreateNew = () => {
    setEditingPreset({
      name: 'Nouvel Événement',
      description: '',
      track: '',
      trackLayout: '',
      availableCars: [],
      maxClients: 24,
      password: '',
      loopMode: true,
      weather: {
        graphics: 'Clear',
        baseTemperatureAmbient: 22,
        baseTemperatureRoad: 30,
        variationAmbient: 1,
        variationRoad: 1,
        windBaseSpeedMin: 3,
        windBaseSpeedMax: 15,
        windBaseDirection: 0,
        windVariationDirection: 10
      },
      sessions: {
        practice: { enabled: true, time: 60 },
        qualify: { enabled: true, time: 20 },
        race: { enabled: true, time: 20, laps: 10 }
      },
      entryList: [],
      traffic: [],
      aiMaxCars: 20,
      aiMinDistance: 100
    });
  };

  const handleSave = () => {
    if (!editingPreset) return;
    
    const url = editingPreset.id ? `/api/presets/${editingPreset.id}` : '/api/presets';
    const method = editingPreset.id ? 'PUT' : 'POST';

    fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingPreset)
    })
    .then(r => r.json())
    .then(() => {
      fetchPresets();
      setEditingPreset(null);
    })
    .catch(err => alert("Erreur lors de la sauvegarde: " + err));
  };

  const handleDelete = (id: string) => {
    if (!confirm("Voulez-vous vraiment supprimer cet événement ?")) return;
    fetch(`/api/presets/${id}`, { method: 'DELETE' })
      .then(() => fetchPresets());
  };

  const handleEdit = (preset: EventPreset) => {
    // Fallback for old presets without sessions or loopMode
    if (preset.loopMode === undefined) {
      preset.loopMode = true;
    }
    if (!preset.sessions) {
      preset.sessions = {
        practice: { enabled: true, time: 60 },
        qualify: { enabled: true, time: 20 },
        race: { enabled: true, time: 20, laps: 10 }
      };
    }
    if (preset.aiMaxCars === undefined) preset.aiMaxCars = 20;
    if (preset.aiMinDistance === undefined) preset.aiMinDistance = 100;
    setEditingPreset(preset);
  };

  const handleLaunch = (id: string) => {
    if (!confirm("Attention: Le lancement de cet événement va écraser la configuration actuelle du serveur et le redémarrer. Continuer ?")) return;
    
    fetch(`/api/presets/${id}/launch`, { method: 'POST' })
      .then(res => {
        if (!res.ok) throw new Error('Erreur de lancement');
        setMsg({ type: 'success', text: "L'événement a été lancé avec succès ! Le serveur est en train de redémarrer..." });
        if (onLaunch) onLaunch();
      })
      .catch(err => {
        setMsg({ type: 'error', text: err.message });
      });
  };

  if (editingPreset) {
    const selectedTrack = tracks.find(t => t.id === editingPreset.track);
    const layouts = selectedTrack?.layouts || [];
    
    const addSlot = () => {
      setEditingPreset({
        ...editingPreset,
        entryList: [...editingPreset.entryList, { car: '', skin: '', name: '', team: '', guid: '' }]
      });
    };
    
    const updateSlot = (index: number, field: keyof EntryListSlot, value: string) => {
      const newList = [...editingPreset.entryList];
      newList[index] = { ...newList[index], [field]: value };
      
      if (field === 'car') {
        const selectedCar = cars.find(c => c.id === value);
        if (selectedCar && selectedCar.skins && selectedCar.skins.length > 0) {
          newList[index].skin = selectedCar.skins[0];
        } else {
          newList[index].skin = '';
        }
      }
      
      setEditingPreset({ ...editingPreset, entryList: newList });
    };

    const removeSlot = (index: number) => {
      const newList = [...editingPreset.entryList];
      newList.splice(index, 1);
      setEditingPreset({ ...editingPreset, entryList: newList });
    };

    const addTrafficSlot = () => {
      setEditingPreset({
        ...editingPreset,
        traffic: [...(editingPreset.traffic || []), { car: '', skin: '', count: 1 }]
      });
    };
    
    const updateTrafficSlot = (index: number, field: keyof TrafficConfig, value: any) => {
      const newList = [...(editingPreset.traffic || [])];
      newList[index] = { ...newList[index], [field]: value };
      
      if (field === 'car') {
        const selectedCar = cars.find(c => c.id === value);
        if (selectedCar && selectedCar.skins && selectedCar.skins.length > 0) {
          newList[index].skin = selectedCar.skins[0];
        } else {
          newList[index].skin = '';
        }
      }
      
      setEditingPreset({ ...editingPreset, traffic: newList });
    };

    const removeTrafficSlot = (index: number) => {
      const newList = [...(editingPreset.traffic || [])];
      newList.splice(index, 1);
      setEditingPreset({ ...editingPreset, traffic: newList });
    };

    const toggleAvailableCar = (carId: string) => {
      const isSelected = editingPreset.availableCars.includes(carId);
      const newAvailableCars = isSelected 
        ? editingPreset.availableCars.filter(id => id !== carId)
        : [...editingPreset.availableCars, carId];
      
      setEditingPreset({ ...editingPreset, availableCars: newAvailableCars });
    };

    const availableCarsObjects = cars.filter(c => editingPreset.availableCars.includes(c.id));
    
    const currentTrackObj = tracks.find(t => t.id === editingPreset.track);
    let maxPits = currentTrackObj ? parseInt(currentTrackObj.pitboxes) : 0;
    if (editingPreset.trackLayout) {
      const currentLayoutObj = currentTrackObj?.layouts?.find(l => l.id === editingPreset.trackLayout);
      if (currentLayoutObj && currentLayoutObj.pitboxes) maxPits = parseInt(currentLayoutObj.pitboxes);
    }
    const totalTraffic = (editingPreset.traffic || []).reduce((acc, curr) => acc + (curr.count || 0), 0);
    const totalSlots = editingPreset.entryList.length + totalTraffic;
    const pitsExceeded = maxPits > 0 && totalSlots > maxPits;

    return (
      <div style={{ padding: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <h1 style={{ margin: 0 }}>Éditer l'événement</h1>
          <div>
            <button onClick={() => setEditingPreset(null)} style={{ marginRight: '10px', padding: '10px 20px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'transparent', color: 'white', cursor: 'pointer' }}>Annuler</button>
            <button onClick={handleSave} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--primary-color)', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>Enregistrer</button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
          <div style={{ gridColumn: '1 / -1', backgroundColor: 'var(--sidebar-bg)', padding: '20px', borderRadius: '12px' }}>
            <h2>Général</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Nom de l'événement</label>
                <input type="text" value={editingPreset.name} onChange={e => setEditingPreset({...editingPreset, name: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'white' }} />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Circuit</label>
                <select value={editingPreset.track} onChange={e => setEditingPreset({...editingPreset, track: e.target.value, trackLayout: ''})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'white' }}>
                  <option value="">-- Choisir un circuit --</option>
                  {tracks.map(t => <option key={t.id} value={t.id}>{t.name || t.id} ({t.pitboxes || '??'} pits)</option>)}
                </select>
              </div>

              {layouts.length > 0 && (
                <div>
                  <label style={{ display: 'block', marginBottom: '5px' }}>Layout</label>
                  <select value={editingPreset.trackLayout} onChange={e => setEditingPreset({...editingPreset, trackLayout: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'white' }}>
                    <option value="">-- Choisir un layout --</option>
                    {layouts.map(l => <option key={l.id} value={l.id}>{l.name || l.id} ({l.pitboxes || '??'} pits)</option>)}
                  </select>
                </div>
              )}

              <div style={{ display: 'flex', gap: '20px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '5px' }}>Max Clients</label>
                  <input type="number" value={editingPreset.maxClients} onChange={e => setEditingPreset({...editingPreset, maxClients: parseInt(e.target.value)})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'white' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '5px' }}>Mot de passe (optionnel)</label>
                  <input type="text" value={editingPreset.password} onChange={e => setEditingPreset({...editingPreset, password: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'white' }} />
                </div>
              </div>

              <div style={{ marginTop: '10px', padding: '15px', backgroundColor: 'var(--bg-color)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>Voitures Autorisées (Modèles de base)</label>
                
                <input 
                  type="text" 
                  placeholder="🔍 Rechercher une voiture..." 
                  value={carSearch}
                  onChange={e => setCarSearch(e.target.value)}
                  style={{ width: '100%', marginBottom: '15px', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--sidebar-bg)', color: 'white' }}
                />

                <div style={{ display: 'flex', gap: '20px', height: '300px' }}>
                  {/* Left list: Available to add */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', border: '1px solid var(--border-color)', borderRadius: '6px', backgroundColor: 'var(--sidebar-bg)', overflow: 'hidden' }}>
                    <div style={{ padding: '10px', backgroundColor: 'rgba(255,255,255,0.05)', fontWeight: 'bold', borderBottom: '1px solid var(--border-color)' }}>
                      Toutes les voitures
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                      {cars
                        .filter(c => !editingPreset.availableCars.includes(c.id))
                        .filter(c => carSearch === '' || (c.name && c.name.toLowerCase().includes(carSearch.toLowerCase())) || c.id.toLowerCase().includes(carSearch.toLowerCase()))
                        .map(c => (
                          <div 
                            key={c.id} 
                            onClick={() => toggleAvailableCar(c.id)}
                            style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', transition: 'background 0.2s', ':hover': { backgroundColor: 'var(--primary-color)' } } as any}
                            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)')}
                            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                          >
                            {c.name || c.id}
                          </div>
                        ))
                      }
                    </div>
                  </div>

                  {/* Icon middle */}
                  <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}>
                    ⮂
                  </div>

                  {/* Right list: Selected */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', border: '1px solid var(--primary-color)', borderRadius: '6px', backgroundColor: 'var(--sidebar-bg)', overflow: 'hidden' }}>
                    <div style={{ padding: '10px', backgroundColor: 'rgba(64, 112, 244, 0.2)', fontWeight: 'bold', borderBottom: '1px solid var(--primary-color)', color: 'var(--primary-color)' }}>
                      Voitures sélectionnées ({editingPreset.availableCars.length})
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                      {editingPreset.availableCars.length === 0 ? (
                        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>Aucune voiture sélectionnée</div>
                      ) : (
                        editingPreset.availableCars.map(carId => {
                          const carName = cars.find(c => c.id === carId)?.name || carId;
                          return (
                            <div 
                              key={carId} 
                              onClick={() => toggleAvailableCar(carId)}
                              style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', color: '#ff6b6b' }}
                              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(255,107,107,0.1)')}
                              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                            >
                              - {carName}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ backgroundColor: 'var(--sidebar-bg)', padding: '20px', borderRadius: '12px' }}>
            <h2>Sessions (Week-end)</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Loop Mode toggle */}
              <div style={{ padding: '15px', backgroundColor: 'var(--primary-color)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                <input type="checkbox" checked={editingPreset.loopMode} onChange={e => setEditingPreset({...editingPreset, loopMode: e.target.checked})} style={{ transform: 'scale(1.5)', cursor: 'pointer' }} />
                <div style={{ flex: 1, color: 'white' }}>
                  <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Tourner en boucle (Loop Mode)</h3>
                  <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.9 }}>Recommence automatiquement l'événement une fois terminé (Idéal pour Time Attack / Trackday)</p>
                </div>
              </div>

              {/* Practice */}
              <div style={{ padding: '15px', backgroundColor: 'var(--bg-color)', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '15px' }}>
                <input type="checkbox" checked={editingPreset.sessions.practice.enabled} onChange={e => setEditingPreset({...editingPreset, sessions: {...editingPreset.sessions, practice: {...editingPreset.sessions.practice, enabled: e.target.checked}}})} style={{ transform: 'scale(1.5)', cursor: 'pointer' }} />
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: 0 }}>Essais Libres (Practice)</h3>
                </div>
                {editingPreset.sessions.practice.enabled && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <label style={{ color: 'var(--text-muted)' }}>Temps (min) :</label>
                    <input type="number" min="1" value={editingPreset.sessions.practice.time} onChange={e => setEditingPreset({...editingPreset, sessions: {...editingPreset.sessions, practice: {...editingPreset.sessions.practice, time: parseInt(e.target.value) || 0}}})} style={{ width: '70px', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--sidebar-bg)', color: 'white' }} />
                  </div>
                )}
              </div>

              {/* Qualify */}
              <div style={{ padding: '15px', backgroundColor: 'var(--bg-color)', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '15px' }}>
                <input type="checkbox" checked={editingPreset.sessions.qualify.enabled} onChange={e => setEditingPreset({...editingPreset, sessions: {...editingPreset.sessions, qualify: {...editingPreset.sessions.qualify, enabled: e.target.checked}}})} style={{ transform: 'scale(1.5)', cursor: 'pointer' }} />
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: 0 }}>Qualifications</h3>
                </div>
                {editingPreset.sessions.qualify.enabled && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <label style={{ color: 'var(--text-muted)' }}>Temps (min) :</label>
                    <input type="number" min="1" value={editingPreset.sessions.qualify.time} onChange={e => setEditingPreset({...editingPreset, sessions: {...editingPreset.sessions, qualify: {...editingPreset.sessions.qualify, time: parseInt(e.target.value) || 0}}})} style={{ width: '70px', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--sidebar-bg)', color: 'white' }} />
                  </div>
                )}
              </div>

              {/* Race */}
              <div style={{ padding: '15px', backgroundColor: 'var(--bg-color)', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '15px' }}>
                <input type="checkbox" checked={editingPreset.sessions.race.enabled} onChange={e => setEditingPreset({...editingPreset, sessions: {...editingPreset.sessions, race: {...editingPreset.sessions.race, enabled: e.target.checked}}})} style={{ transform: 'scale(1.5)', cursor: 'pointer' }} />
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: 0 }}>Course</h3>
                </div>
                {editingPreset.sessions.race.enabled && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <label style={{ color: 'var(--text-muted)' }}>Tours :</label>
                    <input type="number" min="0" value={editingPreset.sessions.race.laps} onChange={e => setEditingPreset({...editingPreset, sessions: {...editingPreset.sessions, race: {...editingPreset.sessions.race, laps: parseInt(e.target.value) || 0}}})} style={{ width: '70px', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--sidebar-bg)', color: 'white' }} title="Mettre 0 pour une course au temps" />
                    
                    <label style={{ color: 'var(--text-muted)', marginLeft: '10px' }}>Temps (min) :</label>
                    <input type="number" min="0" value={editingPreset.sessions.race.time} onChange={e => setEditingPreset({...editingPreset, sessions: {...editingPreset.sessions, race: {...editingPreset.sessions.race, time: parseInt(e.target.value) || 0}}})} style={{ width: '70px', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--sidebar-bg)', color: 'white' }} title="Utilisé si Tours = 0" />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{ backgroundColor: 'var(--sidebar-bg)', padding: '20px', borderRadius: '12px' }}>
            <h2>Météo (Avancée)</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Type de Météo (Graphics)</label>
                <select value={editingPreset.weather.graphics} onChange={e => setEditingPreset({...editingPreset, weather: {...editingPreset.weather, graphics: e.target.value}})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'white' }}>
                  <option value="Clear">Clear</option>
                  <option value="Mid Clear">Mid Clear</option>
                  <option value="Light Clouds">Light Clouds</option>
                  <option value="Mid Clouds">Mid Clouds</option>
                  <option value="Heavy Clouds">Heavy Clouds</option>
                  <option value="Rain">Rain</option>
                </select>
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Temp. Ambiante (°C)</label>
                <input type="number" value={editingPreset.weather.baseTemperatureAmbient} onChange={e => setEditingPreset({...editingPreset, weather: {...editingPreset.weather, baseTemperatureAmbient: parseInt(e.target.value)}})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'white' }} />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Temp. Piste (°C)</label>
                <input type="number" value={editingPreset.weather.baseTemperatureRoad} onChange={e => setEditingPreset({...editingPreset, weather: {...editingPreset.weather, baseTemperatureRoad: parseInt(e.target.value)}})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'white' }} />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Vent Min (km/h)</label>
                <input type="number" value={editingPreset.weather.windBaseSpeedMin} onChange={e => setEditingPreset({...editingPreset, weather: {...editingPreset.weather, windBaseSpeedMin: parseInt(e.target.value)}})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'white' }} />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Vent Max (km/h)</label>
                <input type="number" value={editingPreset.weather.windBaseSpeedMax} onChange={e => setEditingPreset({...editingPreset, weather: {...editingPreset.weather, windBaseSpeedMax: parseInt(e.target.value)}})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'white' }} />
              </div>
            </div>
          </div>
        </div>

        <div style={{ backgroundColor: 'var(--sidebar-bg)', padding: '20px', borderRadius: '12px', marginTop: '30px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2>Entry List (Joueurs) <span style={{ fontSize: '1rem', color: pitsExceeded ? '#ff6b6b' : 'var(--text-muted)' }}>- Total slots (Joueurs + IA) : {totalSlots} / {maxPits > 0 ? maxPits : '?'} pits</span></h2>
            <button onClick={addSlot} disabled={editingPreset.entryList.length >= editingPreset.maxClients} style={{ padding: '8px 15px', borderRadius: '6px', border: 'none', backgroundColor: '#2d3436', color: 'white', cursor: 'pointer' }}>+ Ajouter un pilote</button>
          </div>
          
          {pitsExceeded && (
            <div style={{ backgroundColor: 'rgba(255, 107, 107, 0.1)', border: '1px solid #ff6b6b', padding: '15px', borderRadius: '8px', marginBottom: '20px', color: '#ff6b6b' }}>
              ⚠️ <strong>Attention :</strong> Le nombre total de slots (Joueurs + Trafic IA) dépasse le nombre de pit boxes disponibles sur ce circuit. Le serveur plantera au démarrage. Veuillez réduire le nombre de pilotes ou d'IA.
            </div>
          )}
          
          {editingPreset.entryList.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>Aucune voiture dans l'Entry List. Ajoutez des emplacements !</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {editingPreset.entryList.map((slot, i) => {
                const currentCar = cars.find(c => c.id === slot.car);
                return (
                  <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'center', padding: '10px', backgroundColor: 'var(--bg-color)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div style={{ width: '30px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 'bold' }}>#{i+1}</div>
                    
                    <select value={slot.car} onChange={e => updateSlot(i, 'car', e.target.value)} style={{ flex: 2, padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--sidebar-bg)', color: 'white' }}>
                      <option value="">-- Voiture --</option>
                      {availableCarsObjects.map(c => <option key={c.id} value={c.id}>{c.name || c.id}</option>)}
                    </select>

                    <select value={slot.skin} onChange={e => updateSlot(i, 'skin', e.target.value)} disabled={!slot.car} style={{ flex: 2, padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--sidebar-bg)', color: 'white' }}>
                      <option value="">-- Skin --</option>
                      {currentCar?.skins?.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>

                    <input type="text" placeholder="Nom du pilote (opt)" value={slot.name} onChange={e => updateSlot(i, 'name', e.target.value)} style={{ flex: 1.5, padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--sidebar-bg)', color: 'white' }} />
                    <input type="text" placeholder="GUID Steam (opt)" value={slot.guid} onChange={e => updateSlot(i, 'guid', e.target.value)} style={{ flex: 1.5, padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--sidebar-bg)', color: 'white' }} />
                    
                    <button onClick={() => removeSlot(i)} style={{ padding: '8px', borderRadius: '4px', border: 'none', backgroundColor: 'var(--danger-color, #e74c3c)', color: 'white', cursor: 'pointer' }}>✖</button>
                  </div>
                );
              })}
              
              {editingPreset.entryList.length === 0 && (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>Aucun pilote configuré. Ajoutez-en un ou laissez le serveur ouvert.</p>
              )}
            </div>
          )}
        </div>

        <div style={{ backgroundColor: 'var(--sidebar-bg)', padding: '20px', borderRadius: '12px', marginTop: '30px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2>Trafic IA <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>- AssettoServer (AI=fixed)</span></h2>
            <button onClick={addTrafficSlot} style={{ padding: '8px 15px', borderRadius: '6px', border: 'none', backgroundColor: '#2d3436', color: 'white', cursor: 'pointer' }}>+ Ajouter du trafic</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {(editingPreset.traffic || []).map((tSlot, i) => (
              <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <div style={{ width: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>#{i + 1}</div>
                
                <select value={tSlot.car} onChange={e => updateTrafficSlot(i, 'car', e.target.value)} style={{ flex: 2, padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--sidebar-bg)', color: 'white' }}>
                  <option value="">-- Voiture --</option>
                  {availableCarsObjects.map(c => <option key={c.id} value={c.id}>{c.name || c.id}</option>)}
                </select>

                <select value={tSlot.skin} onChange={e => updateTrafficSlot(i, 'skin', e.target.value)} disabled={!tSlot.car} style={{ flex: 2, padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--sidebar-bg)', color: 'white' }}>
                  <option value="">-- Skin --</option>
                  {tSlot.car && cars.find(c => c.id === tSlot.car)?.skins?.map(s => <option key={s} value={s}>{s}</option>)}
                </select>

                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Quantité :</label>
                  <input type="number" min="1" value={tSlot.count || 1} onChange={e => updateTrafficSlot(i, 'count', parseInt(e.target.value) || 1)} style={{ width: '60px', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'white' }} />
                </div>

                <button onClick={() => removeTrafficSlot(i)} style={{ padding: '8px 15px', borderRadius: '4px', border: 'none', backgroundColor: '#ff6b6b', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}>×</button>
              </div>
            ))}
            
            {(editingPreset.traffic || []).length === 0 && (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>Aucun trafic IA. Cliquez sur le bouton pour ajouter des voitures (AI=fixed).</p>
            )}

            {(editingPreset.traffic || []).length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Nombre maximum de véhicules affichés simultanément</label>
                  <input 
                    type="number" 
                    min="1" 
                    value={editingPreset.aiMaxCars || 20} 
                    onChange={e => setEditingPreset({...editingPreset, aiMaxCars: parseInt(e.target.value) || 20})}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'white' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Distance minimum de spawn (mètres)</label>
                  <input 
                    type="number" 
                    min="10" 
                    value={editingPreset.aiMinDistance || 100} 
                    onChange={e => setEditingPreset({...editingPreset, aiMinDistance: parseInt(e.target.value) || 100})}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'white' }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '30px' }}>
      {msg && (
        <div style={{ 
          padding: '15px', 
          marginBottom: '20px', 
          borderRadius: '8px', 
          backgroundColor: msg.type === 'success' ? 'rgba(46, 204, 113, 0.2)' : 'rgba(231, 76, 60, 0.2)', 
          border: `1px solid ${msg.type === 'success' ? '#2ecc71' : '#e74c3c'}`,
          color: msg.type === 'success' ? '#2ecc71' : '#e74c3c',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>{msg.text}</span>
          <button onClick={() => setMsg(null)} style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <div>
          <h1 style={{ margin: 0, marginBottom: '10px' }}>Événements & Presets</h1>
          <p style={{ color: 'var(--text-muted)' }}>Gérez vos configurations de courses et lancez-les en un clic.</p>
        </div>
        <button onClick={handleCreateNew} style={{ padding: '12px 24px', backgroundColor: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer' }}>
          + Créer un Événement
        </button>
      </div>

      {loading ? (
        <p>Chargement des événements...</p>
      ) : presets.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '100px 20px', backgroundColor: 'var(--sidebar-bg)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <h2 style={{ color: 'var(--text-muted)' }}>Aucun événement configuré</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '30px' }}>Commencez par créer votre premier preset d'événement.</p>
          <button onClick={handleCreateNew} style={{ padding: '10px 20px', backgroundColor: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Créer un événement</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
          {presets.map(preset => (
            <div key={preset.id} style={{ backgroundColor: 'var(--sidebar-bg)', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ height: '120px', backgroundImage: `url('/api/content/tracks/layout_image?id=${encodeURIComponent(preset.track)}&layout=${encodeURIComponent(preset.trackLayout)}')`, backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' }}>
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, var(--sidebar-bg) 0%, transparent 100%)' }}></div>
              </div>
              <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ margin: 0, marginBottom: '5px', fontSize: '1.4rem' }}>{preset.name}</h3>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px' }}>{preset.entryList.length} voitures • Circuit: {preset.track}</p>
                
                <div style={{ marginTop: 'auto', display: 'flex', gap: '10px' }}>
                  <button onClick={() => handleEdit(preset)} style={{ flex: 1, padding: '10px', backgroundColor: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Éditer</button>
                  <button onClick={() => preset.id && handleDelete(preset.id)} style={{ padding: '10px', backgroundColor: 'rgba(255,0,0,0.2)', color: '#ff6b6b', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Supprimer</button>
                </div>
                <button onClick={() => preset.id && handleLaunch(preset.id)} style={{ width: '100%', marginTop: '10px', padding: '12px', backgroundColor: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1.1rem' }}>▶ LANCER L'ÉVÉNEMENT</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
