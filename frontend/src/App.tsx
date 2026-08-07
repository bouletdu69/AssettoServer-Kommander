import { useEffect, useState, useRef } from 'react'
import './index.css'
import { EventBuilderView } from './EventBuilderView'
import { LogsView } from './LogsView'

interface CarMetric {
  model: string;
  skin: string;
  driverName: string;
  driverTeam: string;
  isConnected: boolean;
  bestLap?: number;
}

interface LiveMetrics {
  info: {
    name: string;
    track: string;
    maxclients: number;
    clients: number;
    ip: string;
    cport: number;
  };
  cars: CarMetric[];
}

function GeneralConfigView() {
  const [config, setConfig] = useState({
    serverName: '',
    serverPassword: '',
    adminPassword: '',
    httpPort: '',
    tcpPort: '',
    udpPort: '',
  })
  const [msg, setMsg] = useState({ type: '', text: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/config/general')
      .then(res => res.json())
      .then(data => setConfig({
        serverName: data.serverName || '',
        serverPassword: data.serverPassword || '',
        adminPassword: data.adminPassword || '',
        httpPort: data.httpPort || '',
        tcpPort: data.tcpPort || '',
        udpPort: data.udpPort || '',
      }))
      .catch(err => setMsg({ type: 'error', text: 'Erreur de chargement: ' + err.message }))
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfig({ ...config, [e.target.name]: e.target.value })
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMsg({ type: '', text: '' })
    try {
      const res = await fetch('/api/config/general', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      })
      if (res.ok) {
        setMsg({ type: 'success', text: 'Configuration sauvegardée avec succès.' })
      } else {
        setMsg({ type: 'error', text: 'Erreur lors de la sauvegarde.' })
      }
    } catch (err: any) {
      setMsg({ type: 'error', text: 'Erreur réseau: ' + err.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card form-card">
      <h2 style={{ marginTop: 0 }}>Configuration Générale</h2>
      
      {msg.text && (
        <div className={msg.type === 'success' ? 'msg-success' : 'msg-error'}>
          {msg.text}
        </div>
      )}

      <form onSubmit={handleSave}>
        <div className="form-group">
          <label>Nom du Serveur</label>
          <input type="text" name="serverName" value={config.serverName} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label>Mot de passe Serveur (optionnel)</label>
          <input type="text" name="serverPassword" value={config.serverPassword} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label>Mot de passe Admin</label>
          <input type="text" name="adminPassword" value={config.adminPassword} onChange={handleChange} />
        </div>
        
        <h3 style={{ margin: '24px 0 12px', fontSize: '1.1rem' }}>Ports Réseau</h3>
        <div className="form-group">
          <label>Port HTTP</label>
          <input type="number" name="httpPort" value={config.httpPort} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label>Port TCP</label>
          <input type="number" name="tcpPort" value={config.tcpPort} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label>Port UDP</label>
          <input type="number" name="udpPort" value={config.udpPort} onChange={handleChange} />
        </div>

        <button type="submit" className="btn-save" disabled={saving}>
          {saving ? 'Sauvegarde...' : 'Sauvegarder'}
        </button>
      </form>
    </div>
  )
}

function EventConfigView() {
  const [config, setConfig] = useState({
    track: '',
    trackLayout: '',
    maxClients: '',
    practiceTime: '',
    qualifyTime: '',
    raceLaps: '',
  })
  const [msg, setMsg] = useState({ type: '', text: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/config/event')
      .then(res => res.json())
      .then(data => setConfig({
        track: data.track || '',
        trackLayout: data.trackLayout || '',
        maxClients: data.maxClients || '',
        practiceTime: data.practiceTime || '',
        qualifyTime: data.qualifyTime || '',
        raceLaps: data.raceLaps || '',
      }))
      .catch(err => setMsg({ type: 'error', text: 'Erreur de chargement: ' + err.message }))
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfig({ ...config, [e.target.name]: e.target.value })
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMsg({ type: '', text: '' })
    try {
      const res = await fetch('/api/config/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      })
      if (res.ok) {
        setMsg({ type: 'success', text: 'Événement sauvegardé avec succès.' })
      } else {
        setMsg({ type: 'error', text: 'Erreur lors de la sauvegarde.' })
      }
    } catch (err: any) {
      setMsg({ type: 'error', text: 'Erreur réseau: ' + err.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card form-card">
      <h2 style={{ marginTop: 0 }}>Configuration de l'Événement</h2>
      
      {msg.text && (
        <div className={msg.type === 'success' ? 'msg-success' : 'msg-error'}>
          {msg.text}
        </div>
      )}

      <form onSubmit={handleSave}>
        <div className="form-group">
          <label>Piste (ex: ks_monza)</label>
          <input type="text" name="track" value={config.track} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label>Layout Piste (ex: gp)</label>
          <input type="text" name="trackLayout" value={config.trackLayout} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label>Max Clients</label>
          <input type="number" name="maxClients" value={config.maxClients} onChange={handleChange} />
        </div>
        
        <h3 style={{ margin: '24px 0 12px', fontSize: '1.1rem' }}>Sessions</h3>
        <div className="form-group">
          <label>Essais Libres (Minutes)</label>
          <input type="number" name="practiceTime" value={config.practiceTime} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label>Qualifications (Minutes)</label>
          <input type="number" name="qualifyTime" value={config.qualifyTime} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label>Course (Tours)</label>
          <input type="number" name="raceLaps" value={config.raceLaps} onChange={handleChange} />
        </div>

        <button type="submit" className="btn-save" disabled={saving}>
          {saving ? 'Sauvegarde...' : 'Sauvegarder'}
        </button>
      </form>
    </div>
  )
}


interface Car {
  id: string
  name: string
  brand: string
  description: string
  class: string
  specs: {
    bhp: string;
    torque: string;
    weight: string;
    topspeed: string;
  };
  skins?: string[];
}

interface TrackLayout {
  id: string
  name: string
  description: string
  length: string
  pitboxes: string
}

interface Track {
  id: string
  name: string
  description: string
  country: string
  length: string
  pitboxes: string
  layouts?: TrackLayout[]
}

function ContentConfigView() {
  const [contentTab, setContentTab] = useState<'cars' | 'tracks' | 'upload'>('cars')
  
  const [msg, setMsg] = useState({ type: '', text: '' })
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isDragActive, setIsDragActive] = useState(false)
  
  const [cars, setCars] = useState<Car[]>([])
  const [tracks, setTracks] = useState<Track[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCar, setSelectedCar] = useState<Car | null>(null)
  const [selectedSkin, setSelectedSkin] = useState<string>('')
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null)

  useEffect(() => {
    if (contentTab === 'cars') {
      fetch('/api/content/cars')
        .then(res => res.json())
        .then(data => setCars(Array.isArray(data) ? data : []))
        .catch(err => console.error("Error fetching cars:", err))
    } else if (contentTab === 'tracks') {
      fetch('/api/content/tracks')
        .then(res => res.json())
        .then(data => setTracks(Array.isArray(data) ? data : []))
        .catch(err => console.error("Error fetching tracks:", err))
    }
  }, [contentTab])

  const filteredCars = cars.filter(c => 
    (c.name || c.id).toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.brand || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredTracks = tracks.filter(t => 
    (t.name || t.id).toLowerCase().includes(searchTerm.toLowerCase()) || 
    (t.country || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragActive(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragActive(false)
  }

  const uploadFiles = (formData: FormData) => {
    setUploading(true)
    setUploadProgress(0)
    setMsg({ type: 'info', text: 'Envoi en cours (0%)...' })
    
    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/content/upload', true)
    
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100)
        setUploadProgress(percent)
        if (percent >= 100) {
          setMsg({ type: 'info', text: 'Envoi terminé. Extraction et installation en cours (cela peut prendre quelques minutes pour les gros fichiers)...' })
        } else {
          setMsg({ type: 'info', text: `Envoi en cours (${percent}%)...` })
        }
      }
    }
    
    xhr.onload = () => {
      setUploading(false)
      if (xhr.status >= 200 && xhr.status < 300) {
        let data: any = {}
        try { data = JSON.parse(xhr.responseText) } catch (e) {}
        setMsg({ type: 'success', text: data.message || 'Upload réussi !' })
      } else {
        let data: any = {}
        try { data = JSON.parse(xhr.responseText) } catch (e) {}
        setMsg({ type: 'error', text: data.message || 'Erreur lors de l\'upload' })
      }
    }
    
    xhr.onerror = () => {
      setUploading(false)
      setMsg({ type: 'error', text: 'Erreur réseau lors de l\'upload.' })
    }
    
    xhr.send(formData)
  }

  const traverseDirectory = async (entry: FileSystemEntry, path: string, formData: FormData) => {
    if (entry.isFile) {
      const fileEntry = entry as FileSystemFileEntry
      return new Promise<void>((resolve) => {
        fileEntry.file((file) => {
          formData.append('files[]', file, path + file.name)
          resolve()
        })
      })
    } else if (entry.isDirectory) {
      const dirEntry = entry as FileSystemDirectoryEntry
      const dirReader = dirEntry.createReader()
      
      const readEntries = () => {
        return new Promise<FileSystemEntry[]>((resolve) => {
          dirReader.readEntries((entries) => resolve(entries))
        })
      }

      let allEntries: FileSystemEntry[] = []
      let entries = await readEntries()
      while (entries.length > 0) {
        allEntries.push(...entries)
        entries = await readEntries()
      }

      for (const e of allEntries) {
        await traverseDirectory(e, path + entry.name + '/', formData)
      }
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragActive(false)
    
    if (e.dataTransfer.items) {
      const formData = new FormData()
      let hasFiles = false
      let hasFolders = false

      for (let i = 0; i < e.dataTransfer.items.length; i++) {
        const item = e.dataTransfer.items[i]
        if (item.kind === 'file') {
          const entry = item.webkitGetAsEntry()
          if (entry) {
            if (entry.isDirectory) {
              hasFolders = true
              await traverseDirectory(entry, '', formData)
            } else {
              hasFiles = true
              const file = item.getAsFile()
              if (file) {
                if (file.name.endsWith('.zip') || file.name.endsWith('.rar') || file.name.endsWith('.7z')) {
                  formData.append('file', file)
                } else {
                  formData.append('files[]', file, file.name)
                }
              }
            }
          }
        }
      }

      if (hasFiles || hasFolders) {
        uploadFiles(formData)
      }
    }
  }

  return (
    <div className="card content-card" style={{ padding: '0', display: 'flex', flexDirection: 'column' }}>
      
      {/* Sub Tabs */}
      <div className="content-tabs">
        <button className={contentTab === 'cars' ? 'active' : ''} onClick={() => setContentTab('cars')}>
          🚗 Cars
        </button>
        <button className={contentTab === 'tracks' ? 'active' : ''} onClick={() => setContentTab('tracks')}>
          🛣 Tracks
        </button>
        <button className={contentTab === 'upload' ? 'active' : ''} onClick={() => setContentTab('upload')}>
          📤 Upload
        </button>
        {contentTab !== 'upload' && (
            <div style={{ marginLeft: 'auto', padding: '10px' }}>
                <input 
                  type="search" 
                  placeholder="Rechercher..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'white' }}
                />
            </div>
        )}
      </div>

      <div style={{ padding: '30px' }}>
        {contentTab === 'upload' && (
          <>
            <h2 style={{ marginTop: 0 }}>Gestion de Contenu (Smart Upload)</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '20px', fontSize: '0.9rem' }}>
              Glissez-déposez vos archives (.zip, .rar) ou des dossiers complets de mods ici. 
              Le serveur extraira automatiquement les fichiers utiles et ignorera les assets graphiques lourds (.kn5, .dds).
            </p>

            {msg.text && (
              <div 
                className={msg.type === 'success' ? 'msg-success' : (msg.type === 'error' ? 'msg-error' : '')}
                style={msg.type === 'info' ? { backgroundColor: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', padding: '12px', borderRadius: '6px', marginBottom: '16px', border: '1px solid rgba(56, 189, 248, 0.2)' } : {}}
              >
                {msg.text}
              </div>
            )}

            <div 
              className={`dropzone ${isDragActive ? 'active' : ''} ${uploading ? 'uploading' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {uploading ? (
                <div className="dropzone-content">
                  <div className="spinner"></div>
                  <p>{uploadProgress >= 100 ? "Extraction en cours, veuillez patienter..." : `Envoi en cours (${uploadProgress}%), veuillez patienter...`}</p>
                </div>
              ) : (
                <div className="dropzone-content">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '12px', color: 'var(--primary-color)' }}>
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                  </svg>
                  <p>Glissez vos mods ici (.zip, .rar, ou dossier)</p>
                </div>
              )}
            </div>
          </>
        )}

        {contentTab === 'cars' && (
          <>
            <h2 style={{ marginTop: 0 }}>Vehicles ({filteredCars.length})</h2>
            <div className="grid-container">
              {filteredCars.map(c => (
                <div className="card-item" key={c.id} onClick={() => window.open(`/?car=${encodeURIComponent(c.id)}`, '_blank')}>
                  <div className="car-preview" style={{ backgroundImage: `url('/api/content/cars/image?id=${encodeURIComponent(c.id)}&v=2')` }}></div>
                  <h3>{c.name || c.id}</h3>
                  <p className="card-meta">{c.brand}</p>
                </div>
              ))}
            </div>
          </>
        )}

        {contentTab === 'tracks' && (
          <>
            <h2 style={{ marginTop: 0 }}>Tracks ({filteredTracks.length})</h2>
            <div className="grid-container">
              {filteredTracks.map(t => (
                <div className="card-item" key={t.id} onClick={() => window.open(`/?track=${encodeURIComponent(t.id)}`, '_blank')}>
                  <div className="track-preview" style={{ backgroundImage: `url('/api/content/tracks/image?id=${encodeURIComponent(t.id)}&v=1')` }}></div>
                  <h3>{t.name || t.id}</h3>
                  <p className="card-meta">{t.country}</p>
                  <p className="card-meta">{t.layouts?.length || 1} layouts</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      {selectedCar && (
        <div className="modal-overlay" onClick={() => setSelectedCar(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedCar(null)}>×</button>
            <h2>{selectedCar.name || selectedCar.id}</h2>
            <p style={{ color: 'var(--primary-color)', fontWeight: 'bold' }}>{selectedCar.brand} | {selectedCar.class}</p>
            <div className="modal-specs">
              <div><strong>BHP:</strong> {selectedCar.specs?.bhp || 'N/A'}</div>
              <div><strong>Torque:</strong> {selectedCar.specs?.torque || 'N/A'}</div>
              <div><strong>Weight:</strong> {selectedCar.specs?.weight || 'N/A'}</div>
              <div><strong>Top Speed:</strong> {selectedCar.specs?.topspeed || 'N/A'}</div>
            </div>
            <p className="modal-desc">{selectedCar.description}</p>
          </div>
        </div>
      )}

      {selectedTrack && (
        <div className="modal-overlay" onClick={() => setSelectedTrack(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedTrack(null)}>×</button>
            <h2>{selectedTrack.name || selectedTrack.id}</h2>
            <p style={{ color: 'var(--primary-color)', fontWeight: 'bold' }}>{selectedTrack.country}</p>
            <p className="modal-desc">{selectedTrack.description}</p>
            <h3>Layouts</h3>
            <div className="modal-list">
              {selectedTrack.layouts && selectedTrack.layouts.length > 0 ? (
                selectedTrack.layouts.map((layout, i) => (
                  <div key={i} className="modal-list-item">
                    <strong>{layout.name || layout.id}</strong> - {layout.length || '?'}m
                  </div>
                ))
              ) : (
                <div className="modal-list-item">
                  <strong>Default (Standard)</strong> - {selectedTrack.length || '?'}m
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StandaloneCarView({ carId }: { carId: string }) {
  const [car, setCar] = useState<Car | null>(null);
  const [selectedSkin, setSelectedSkin] = useState<string>('');

  useEffect(() => {
    fetch('/api/content/cars')
      .then(res => res.json())
      .then((data: Car[]) => {
        const found = data.find(c => c.id === carId);
        if (found) {
          setCar(found);
          setSelectedSkin(found.skins && found.skins.length > 0 ? found.skins[0] : '');
        }
      });
  }, [carId]);

  if (!car) return <div style={{ color: 'var(--text-color)', padding: '20px', textAlign: 'center', marginTop: '50px' }}>Chargement...</div>;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-color)', padding: '40px', color: 'var(--text-color)' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <button onClick={() => window.close()} style={{ background: 'var(--sidebar-bg)', border: '1px solid var(--border-color)', color: 'var(--text-color)', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', marginBottom: '30px', fontWeight: 'bold' }}>
          &larr; Fermer l'onglet
        </button>
        
        <h1 style={{ marginTop: 0, marginBottom: '10px', fontSize: '2.5rem' }}>{car.name || car.id}</h1>
        <p style={{ color: 'var(--primary-color)', fontSize: '1.2rem', marginBottom: '40px', fontWeight: 'bold' }}>{car.brand} <span style={{ color: 'var(--text-muted)' }}>• {car.class}</span></p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <img 
              src={selectedSkin 
                ? `/api/content/cars/skin_image?id=${encodeURIComponent(car.id)}&skin=${encodeURIComponent(selectedSkin)}` 
                : `/api/content/cars/image?id=${encodeURIComponent(car.id)}`}
              alt={car.name || car.id}
              style={{ 
                width: '100%',
                height: 'auto',
                borderRadius: '12px',
                display: 'block'
              }}
            />
            
            {car.skins && car.skins.length > 0 && (
              <div style={{ marginTop: '20px' }}>
                <h3 style={{ marginBottom: '15px' }}>Skins disponibles ({car.skins.length})</h3>
                <div className="skin-slider" style={{ display: 'flex', overflowX: 'auto', gap: '15px', paddingBottom: '15px' }}>
                  {car.skins.map(skin => (
                    <div 
                      key={skin}
                      onClick={() => setSelectedSkin(skin)}
                      title={skin}
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                    >
                      <div 
                        className={`skin-item ${selectedSkin === skin ? 'active' : ''}`}
                        style={{ 
                          minWidth: '160px', 
                          height: '100px', 
                          backgroundImage: `url('/api/content/cars/skin_image?id=${encodeURIComponent(car.id)}&skin=${encodeURIComponent(skin)}')` 
                        }}
                      ></div>
                      <span style={{ 
                        fontSize: '0.85rem', 
                        color: selectedSkin === skin ? 'var(--primary-color)' : 'var(--text-muted)', 
                        textAlign: 'center', 
                        maxWidth: '160px', 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis', 
                        whiteSpace: 'nowrap',
                        fontWeight: selectedSkin === skin ? 'bold' : 'normal'
                      }}>
                        {skin}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div style={{ flex: '1 1 300px', backgroundColor: 'var(--sidebar-bg)', padding: '30px', borderRadius: '12px', height: 'fit-content', border: '1px solid var(--border-color)' }}>
            <h2 style={{ marginTop: 0, borderBottom: '2px solid var(--primary-color)', paddingBottom: '10px' }}>Spécifications</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Puissance</span>
                <strong>{car.specs?.bhp || '?'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Couple</span>
                <strong>{car.specs?.torque || '?'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Poids</span>
                <strong>{car.specs?.weight || '?'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Vitesse Max</span>
                <strong>{car.specs?.topspeed || '?'}</strong>
              </div>
            </div>
            
            {car.description && (
              <div style={{ marginTop: '40px' }}>
                <h2>Description</h2>
                <p style={{ color: 'var(--text-muted)', lineHeight: '1.6', fontSize: '0.95rem' }}>{car.description}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StandaloneTrackView({ trackId }: { trackId: string }) {
  const [track, setTrack] = useState<Track | null>(null);
  const [selectedLayout, setSelectedLayout] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState({ text: '', type: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/content/tracks')
      .then(res => res.json())
      .then((data: Track[]) => {
        const found = data.find(t => t.id === trackId);
        if (found) {
          setTrack(found);
          if (found.layouts && found.layouts.length > 0) {
            setSelectedLayout(found.layouts[0].id);
          }
        }
      });
  }, [trackId]);

  if (!track) return <div style={{ color: 'var(--text-color)', padding: '20px', textAlign: 'center', marginTop: '50px' }}>Chargement...</div>;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-color)', padding: '40px', color: 'var(--text-color)' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <button onClick={() => window.close()} style={{ background: 'var(--sidebar-bg)', border: '1px solid var(--border-color)', color: 'var(--text-color)', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', marginBottom: '30px', fontWeight: 'bold' }}>
          &larr; Fermer l'onglet
        </button>
        
        <h1 style={{ marginTop: 0, marginBottom: '10px', fontSize: '2.5rem' }}>
          {track.layouts?.find(l => l.id === selectedLayout)?.name || track.name || track.id}
        </h1>
        <p style={{ color: 'var(--primary-color)', fontSize: '1.2rem', marginBottom: '40px', fontWeight: 'bold' }}>
          {track.layouts?.find(l => l.id === selectedLayout)?.country || track.country}
        </p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <img 
              src={selectedLayout 
                ? `/api/content/tracks/layout_image?id=${encodeURIComponent(track.id)}&layout=${encodeURIComponent(selectedLayout)}`
                : `/api/content/tracks/image?id=${encodeURIComponent(track.id)}`}
              alt={track.name || track.id}
              style={{ 
                width: '100%',
                height: 'auto',
                borderRadius: '12px',
                display: 'block'
              }}
            />

            {track.layouts && track.layouts.length > 0 && (
              <div style={{ marginTop: '20px' }}>
                <h3 style={{ marginBottom: '15px' }}>Layouts disponibles ({track.layouts.length})</h3>
                <div className="skin-slider" style={{ display: 'flex', overflowX: 'auto', gap: '15px', paddingBottom: '15px' }}>
                  {track.layouts.map(layout => (
                    <div 
                      key={layout.id}
                      onClick={() => setSelectedLayout(layout.id)}
                      title={layout.name || layout.id}
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                    >
                      <div 
                        className={`skin-item ${selectedLayout === layout.id ? 'active' : ''}`}
                        style={{ 
                          minWidth: '160px', 
                          height: '100px', 
                          backgroundImage: `url('/api/content/tracks/layout_image?id=${encodeURIComponent(track.id)}&layout=${encodeURIComponent(layout.id)}')`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          borderRadius: '8px'
                        }}
                      ></div>
                      <span style={{ 
                        fontSize: '0.85rem', 
                        color: selectedLayout === layout.id ? 'var(--primary-color)' : 'var(--text-muted)', 
                        textAlign: 'center', 
                        maxWidth: '160px', 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis', 
                        whiteSpace: 'nowrap',
                        fontWeight: selectedLayout === layout.id ? 'bold' : 'normal'
                      }}>
                        {layout.name || layout.id}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div style={{ backgroundColor: 'var(--sidebar-bg)', padding: '30px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <h2 style={{ marginTop: 0, borderBottom: '2px solid var(--primary-color)', paddingBottom: '10px' }}>Informations</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Longueur</span>
                <strong>{track.layouts?.find(l => l.id === selectedLayout)?.length || track.length || '?'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Pitboxes</span>
                <strong>{track.layouts?.find(l => l.id === selectedLayout)?.pitboxes || track.pitboxes || '?'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Layouts</span>
                <strong>{track.layouts?.length || 1}</strong>
              </div>
            </div>
            
            {track.description && (
              <div style={{ marginTop: '40px' }}>
                <h2>Description</h2>
                <p style={{ color: 'var(--text-muted)', lineHeight: '1.6', fontSize: '0.95rem' }}>{track.description}</p>
              </div>
            )}
          </div>

          {/* fast_lane.ai upload section */}
          <div style={{ backgroundColor: 'var(--sidebar-bg)', padding: '30px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <h2 style={{ marginTop: 0, borderBottom: '2px solid var(--primary-color)', paddingBottom: '10px' }}>Trafic IA (fast_lane.ai)</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '20px' }}>
              Ajoutez ou mettez à jour la trajectoire IA pour que le trafic puisse rouler sur ce circuit.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <input 
                type="file" 
                accept=".ai,.aip" 
                ref={fileInputRef}
                style={{
                  padding: '10px',
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  color: 'white'
                }}
              />
              
              <button 
                onClick={async () => {
                  const file = fileInputRef.current?.files?.[0];
                  if (!file) {
                    setUploadMsg({ text: 'Veuillez sélectionner un fichier .ai ou .aip d\'abord', type: 'error' });
                    return;
                  }

                  setUploading(true);
                  setUploadMsg({ text: '', type: '' });

                  const formData = new FormData();
                  formData.append('file', file);
                  formData.append('trackId', trackId);
                  formData.append('layoutId', selectedLayout);

                  try {
                    const res = await fetch('/api/content/tracks/upload-fastlane', {
                      method: 'POST',
                      body: formData,
                    });
                    const data = await res.json();
                    
                    if (res.ok) {
                      setUploadMsg({ text: data.message, type: 'success' });
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    } else {
                      setUploadMsg({ text: data.message, type: 'error' });
                    }
                  } catch (err: any) {
                    setUploadMsg({ text: 'Erreur réseau : ' + err.message, type: 'error' });
                  } finally {
                    setUploading(false);
                  }
                }}
                disabled={uploading}
                style={{ 
                  padding: '12px', 
                  backgroundColor: 'var(--primary-color)', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '6px', 
                  fontWeight: 'bold', 
                  cursor: uploading ? 'not-allowed' : 'pointer',
                  opacity: uploading ? 0.7 : 1
                }}
              >
                {uploading ? 'Envoi en cours...' : 'Uploader fast_lane.ai'}
              </button>
              
              {uploadMsg.text && (
                <div style={{ 
                  padding: '10px', 
                  borderRadius: '6px', 
                  backgroundColor: uploadMsg.type === 'success' ? 'rgba(46, 204, 113, 0.2)' : 'rgba(231, 76, 60, 0.2)',
                  color: uploadMsg.type === 'success' ? '#2ecc71' : '#e74c3c',
                  border: `1px solid ${uploadMsg.type === 'success' ? '#2ecc71' : '#e74c3c'}`
                }}>
                  {uploadMsg.text}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  const urlParams = new URLSearchParams(window.location.search);
  const viewCarId = urlParams.get('car');
  const viewTrackId = urlParams.get('track');

  if (viewCarId) return <StandaloneCarView carId={viewCarId} />;
  if (viewTrackId) return <StandaloneTrackView trackId={viewTrackId} />;

  const [activeTab, setActiveTab] = useState<'status' | 'config' | 'content' | 'events'>('status')
  const [apiStatus, setApiStatus] = useState<string>("En attente...")
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
  const [password, setPassword] = useState<string>("")
  const [error, setError] = useState<string>("")
  const [loading, setLoading] = useState<boolean>(true)
  
  const [serverStatus, setServerStatus] = useState<string>("Unknown")
  const [isStatusLoading, setIsStatusLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [consoleLogs, setConsoleLogs] = useState<string[]>([])
  const consoleEndRef = useRef<HTMLDivElement>(null)
  
  const [liveMetrics, setLiveMetrics] = useState<LiveMetrics | null>(null)

  useEffect(() => {
    fetch('/api/auth/verify')
      .then(res => {
        if (res.ok) setIsAuthenticated(true)
        else setIsAuthenticated(false)
      })
      .catch(() => setIsAuthenticated(false))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      fetch('/api/health')
        .then(res => res.json())
        .then(data => setApiStatus(data.message))
        .catch(err => setApiStatus("Erreur de connexion au backend : " + err.message))
    }
  }, [isAuthenticated])

  useEffect(() => {
    if (!isAuthenticated || activeTab !== 'status') return

    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/server/status')
        if (res.ok) {
          const data = await res.json()
          setServerStatus(data.status)
        }
      } catch (err) {
        console.error(err)
      } finally {
        setIsStatusLoading(false)
      }
    }

    fetchStatus()
    const interval = setInterval(fetchStatus, 3000)
    return () => clearInterval(interval)
  }, [isAuthenticated, activeTab])

  // Live Metrics polling
  useEffect(() => {
    if (!isAuthenticated || activeTab !== 'status' || serverStatus !== 'Running') return

    const fetchMetrics = async () => {
      try {
        const res = await fetch('/api/server/live-metrics')
        if (res.ok) {
          const data = await res.json()
          setLiveMetrics(data)
        }
      } catch (err) {
        console.error(err)
      }
    }

    fetchMetrics()
    const metricsInterval = setInterval(fetchMetrics, 3000)
    return () => clearInterval(metricsInterval)
  }, [isAuthenticated, activeTab, serverStatus])

  // WebSocket for console logs
  useEffect(() => {
    if (!isAuthenticated || activeTab !== 'status') return

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.host}/api/server/console`
    
    let ws: WebSocket | null = null
    try {
      ws = new WebSocket(wsUrl)
      
      ws.onmessage = (event) => {
        setConsoleLogs(prev => {
          const newLogs = [...prev, event.data]
          if (newLogs.length > 500) return newLogs.slice(newLogs.length - 500)
          return newLogs
        })
      }
      ws.onerror = (error) => {
        console.error("WebSocket error:", error)
      }
    } catch (err) {
      console.error("Failed to connect WebSocket", err)
    }

    return () => {
      if (ws) ws.close()
    }
  }, [isAuthenticated, activeTab])

  useEffect(() => {
    if (consoleEndRef.current && activeTab === 'status') {
      consoleEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [consoleLogs, activeTab])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      })
      const data = await response.json()
      if (response.ok) {
        setIsAuthenticated(true)
      } else {
        setError(data.message || "Mot de passe incorrect")
      }
    } catch (err: any) {
      setError("Erreur de connexion : " + err.message)
    }
  }

  const handleServerAction = async (action: 'start' | 'stop') => {
    if (action === 'start') {
      setConsoleLogs([]); // Clear logs on start
    }
    setActionLoading(true)
    try {
      await fetch(`/api/server/${action}`, { method: 'POST' })
      const res = await fetch('/api/server/status')
      if (res.ok) {
        const data = await res.json()
        setServerStatus(data.status)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setActionLoading(false)
    }
  }

  const handleRestart = async () => {
    setConsoleLogs([]); // Clear logs on restart
    setActionLoading(true)
    try {
      await fetch('/api/server/stop', { method: 'POST' })
      await new Promise(r => setTimeout(r, 1000))
      await fetch('/api/server/start', { method: 'POST' })
      const res = await fetch('/api/server/status')
      if (res.ok) {
        const data = await res.json()
        setServerStatus(data.status)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setActionLoading(false)
    }
  }

  const getStatusBadge = () => {
    if (isStatusLoading) {
      return <div className="skeleton" style={{ width: '100px', height: '28px', borderRadius: '16px' }}></div>
    }

    if (serverStatus === "Running") {
      return (
        <div className="status-badge status-online">
          <div className="status-dot"></div> En ligne
        </div>
      )
    } else if (serverStatus === "Stopped") {
      return (
        <div className="status-badge status-offline">
          <div className="status-dot"></div> Hors ligne
        </div>
      )
    } else {
      return (
        <div className="status-badge status-unknown">
          <div className="status-dot"></div> Inconnu
        </div>
      )
    }
  }

  const formatTime = (ms: number) => {
    if (!ms) return "-"
    const min = Math.floor(ms / 60000)
    const sec = Math.floor((ms % 60000) / 1000)
    const msRemainder = ms % 1000
    return `${min}:${sec.toString().padStart(2, '0')}.${msRemainder.toString().padStart(3, '0')}`
  }

  if (loading) {
    return <div className="login-container">Chargement...</div>
  }

  if (!isAuthenticated) {
    return (
      <div className="login-container">
        <div className="login-box">
          <h2>Web GUI ACServer</h2>
          <form onSubmit={handleLogin}>
            <div className="input-group">
              <input 
                type="password" 
                placeholder="Mot de passe admin" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoFocus
              />
            </div>
            {error && <p className="error-msg">{error}</p>}
            <button type="submit" className="login-btn">Se connecter</button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="logo">Web GUI ACServer</div>
        <nav className="nav-menu">
          <a 
            href="#" 
            className={`nav-item ${activeTab === 'status' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); setActiveTab('status') }}
          >
            Dashboard
          </a>
          <a 
            href="#" 
            className={`nav-item ${activeTab === 'events' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); setActiveTab('events') }}
          >
            Événements
          </a>
          <a 
            href="#" 
            className={`nav-item ${activeTab === 'config' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); setActiveTab('config') }}
          >
            Configuration
          </a>
          <div style={{ marginLeft: '16px', display: 'flex', flexDirection: 'column' }}>
            <a 
              href="#" 
              className={`nav-item ${activeTab === 'logs' ? 'active' : ''}`}
              style={{ fontSize: '0.9rem', padding: '8px 16px', opacity: 0.8 }}
              onClick={(e) => { e.preventDefault(); setActiveTab('logs') }}
            >
              ↳ Logs Globaux
            </a>
          </div>
          <a 
            href="#" 
            className={`nav-item ${activeTab === 'content' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); setActiveTab('content') }}
          >
            Content
          </a>
        </nav>
      </aside>
      <main className="main-content">
        <header className="top-header">
          <h1>
            {activeTab === 'status' && 'Dashboard'}
            {activeTab === 'events' && 'Event Builder'}
            {activeTab === 'config' && 'Configuration'}
            {activeTab === 'logs' && 'Logs Globaux'}
            {activeTab === 'content' && 'Content Management'}
          </h1>
          <button 
            className="logout-btn" 
            onClick={() => window.location.reload()}
          >
            Déconnexion (WIP)
          </button>
        </header>
        
        <div className="content-area">
          {activeTab === 'status' && (
            <div className="card" style={{ maxWidth: '800px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ margin: 0 }}>Statut du Serveur</h2>
                {getStatusBadge()}
              </div>
              
              <div className="control-buttons">
                {(serverStatus === "Stopped" || serverStatus === "Crashed") && (
                  <button 
                    className="btn-start" 
                    onClick={() => handleServerAction('start')}
                    disabled={actionLoading}
                  >
                    {actionLoading ? "Chargement..." : "Démarrer"}
                  </button>
                )}
                {serverStatus === "Running" && (
                  <>
                    <button 
                      className="btn-stop" 
                      onClick={() => handleServerAction('stop')}
                      disabled={actionLoading}
                    >
                      {actionLoading ? "Chargement..." : "Arrêter"}
                    </button>
                    <button 
                      className="btn-restart" 
                      onClick={handleRestart}
                      disabled={actionLoading}
                    >
                      {actionLoading ? "Chargement..." : "Redémarrer"}
                    </button>
                  </>
                )}
              </div>

              <div className="console-widget">
                {consoleLogs.map((log, i) => (
                  <p key={i} className="console-line">{log}</p>
                ))}
                <div ref={consoleEndRef} />
              </div>

              <div className="card" style={{ marginTop: '20px', backgroundColor: '#1a1d24', border: '1px solid #2d313a' }}>
                <h3 style={{ marginTop: 0 }}>Métriques en direct</h3>
                {serverStatus === 'Running' && liveMetrics ? (
                  <div>
                    <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
                      <div style={{ background: '#22262e', padding: '16px', borderRadius: '8px', flex: 1 }}>
                        <div style={{ fontSize: '0.9rem', color: '#8b949e', marginBottom: '4px' }}>Pilotes Connectés</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{liveMetrics.info.clients} / {liveMetrics.info.maxclients}</div>
                      </div>
                      <div style={{ background: '#22262e', padding: '16px', borderRadius: '8px', flex: 1 }}>
                        <div style={{ fontSize: '0.9rem', color: '#8b949e', marginBottom: '4px' }}>Accès Rapide</div>
                        <div>
                          <a href={`https://acstuff.ru/s/q:race/online/join?ip=${liveMetrics.info.ip}&httpPort=${liveMetrics.info.cport}`}
                             target="_blank"
                             rel="noopener noreferrer"
                             className="btn-save" 
                             style={{ padding: '6px 12px', textDecoration: 'none', display: 'inline-block', marginTop: '4px' }}>
                            Rejoindre (Content Manager)
                          </a>
                        </div>
                      </div>
                    </div>
                    
                    <h4 style={{ marginBottom: '12px', borderBottom: '1px solid #2d313a', paddingBottom: '8px' }}>Leaderboard / Piste</h4>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ color: '#8b949e', borderBottom: '1px solid #2d313a' }}>
                          <th style={{ padding: '8px 4px' }}>Pilote</th>
                          <th style={{ padding: '8px 4px' }}>Voiture</th>
                          <th style={{ padding: '8px 4px' }}>Meilleur Tour</th>
                        </tr>
                      </thead>
                      <tbody>
                        {liveMetrics.cars.filter(c => c.isConnected).length > 0 ? (
                          liveMetrics.cars.filter(c => c.isConnected)
                           .sort((a, b) => (a.bestLap || 99999999) - (b.bestLap || 99999999))
                           .map((car, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid #2d313a' }}>
                              <td style={{ padding: '10px 4px' }}>{car.driverName || 'Inconnu'} {car.driverTeam ? `(${car.driverTeam})` : ''}</td>
                              <td style={{ padding: '10px 4px', fontSize: '0.9rem' }}>{car.model}</td>
                              <td style={{ padding: '10px 4px', fontFamily: 'monospace', fontSize: '1rem' }}>{formatTime(car.bestLap || 0)}</td>
                            </tr>
                          ))
                        ) : (
                          <tr><td colSpan={3} style={{textAlign: 'center', opacity: 0.6, padding: '20px'}}>Aucun pilote en piste</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p style={{ opacity: 0.6, margin: 0 }}>Le serveur doit être en ligne pour afficher les métriques.</p>
                )}
              </div>
            </div>
          )}
        
        {activeTab === 'events' && (
          <EventBuilderView onLaunch={() => {
            setConsoleLogs([]);
            setActiveTab('status');
          }} />
        )}

        {activeTab === 'config' && (
          <>
            <GeneralConfigView />
            <EventConfigView />
          </>
        )}
        
        {activeTab === 'logs' && (
          <LogsView />
        )}
        
        {activeTab === 'content' && <ContentConfigView />}

        </div>
      </main>
    </div>
  )
}

export default App
