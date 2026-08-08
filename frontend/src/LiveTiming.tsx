import React, { useEffect, useState } from 'react'
import './index.css'

interface CarInfo {
  model: string
  skin: string
  driverName: string
  driverTeam: string
  isConnected: boolean
  bestLap: int
}

interface ServerInfo {
  name: string
  track: string
  clients: number
  maxclients: number
  ip: string
}

export default function LiveTiming() {
  const [info, setInfo] = useState<ServerInfo | null>(null)
  const [cars, setCars] = useState<CarInfo[]>([])
  const [error, setError] = useState('')

  const fetchLiveMetrics = async () => {
    try {
      const res = await fetch('/api/server/live-metrics')
      if (res.status === 401 || res.status === 403) {
        setError('Le Live Timing public est désactivé.')
        return
      }
      if (!res.ok) throw new Error('Erreur API')
      const data = await res.json()
      setInfo(data.info)
      setCars(data.cars)
      setError('')
    } catch (err: any) {
      console.error(err)
      setError("Impossible de contacter le serveur.")
    }
  }

  useEffect(() => {
    fetchLiveMetrics()
    const interval = setInterval(fetchLiveMetrics, 2000)
    return () => clearInterval(interval)
  }, [])

  const formatLapTime = (ms: number) => {
    if (!ms || ms === 0) return "--:--.---"
    const m = Math.floor(ms / 60000)
    const s = Math.floor((ms % 60000) / 1000)
    const msRemainder = ms % 1000
    return `${m}:${s.toString().padStart(2, '0')}.${msRemainder.toString().padStart(3, '0')}`
  }

  const connectedCars = cars.filter(c => c.isConnected)

  return (
    <div style={{ backgroundColor: '#111', minHeight: '100vh', color: '#fff', padding: '20px', fontFamily: 'Inter, sans-serif' }}>
      <header style={{ borderBottom: '1px solid #333', paddingBottom: '20px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, color: '#f39c12', textTransform: 'uppercase', letterSpacing: '2px' }}>Live Timing</h1>
          {info && (
            <div style={{ marginTop: '10px', color: '#aaa', fontSize: '0.9rem' }}>
              <span>{info.name}</span> • <span>{info.track}</span> • <span style={{color: '#4ade80'}}>{info.clients} / {info.maxclients} Drivers</span>
            </div>
          )}
        </div>
        <div>
          <a 
            href={`https://acstuff.ru/s/q:race/online/join?ip=${window.location.hostname}&httpPort=8666`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-block',
              backgroundColor: '#f39c12',
              color: '#000',
              padding: '10px 20px',
              borderRadius: '6px',
              textDecoration: 'none',
              fontWeight: 'bold',
              fontSize: '0.95rem',
              boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
              transition: 'background-color 0.2s'
            }}
          >
            Join (Content Manager)
          </a>
        </div>
      </header>

      {error ? (
        <div style={{ padding: '20px', backgroundColor: '#331111', color: '#ff5555', borderRadius: '8px' }}>
          {error}
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#222', borderBottom: '2px solid #f39c12', color: '#ccc' }}>
                <th style={{ padding: '12px' }}>Pos</th>
                <th style={{ padding: '12px' }}>Driver</th>
                <th style={{ padding: '12px' }}>Car</th>
                <th style={{ padding: '12px' }}>Best Lap</th>
              </tr>
            </thead>
            <tbody>
              {connectedCars.sort((a,b) => (a.bestLap || 99999999) - (b.bestLap || 99999999)).map((c, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #333' }}>
                  <td style={{ padding: '12px', fontWeight: 'bold' }}>{idx + 1}</td>
                  <td style={{ padding: '12px' }}>{c.driverName || 'Inconnu'}</td>
                  <td style={{ padding: '12px', color: '#aaa' }}>{c.model}</td>
                  <td style={{ padding: '12px', color: c.bestLap ? '#fff' : '#555', fontFamily: 'monospace', fontSize: '1.1rem' }}>
                    {formatLapTime(c.bestLap)}
                  </td>
                </tr>
              ))}
              {connectedCars.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: '20px', textAlign: 'center', color: '#555' }}>
                    No driver on track.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
