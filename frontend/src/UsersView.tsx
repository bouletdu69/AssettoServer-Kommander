import React, { useEffect, useState } from 'react'

interface User {
  id: number
  username: string
  role: string
}

export default function UsersView() {
  const [users, setUsers] = useState<User[]>([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  const [newUsername, setNewUsername] = useState('')
  const [newRole, setNewRole] = useState('admin') // or 'moderator' if we want
  const [generatedPassphrase, setGeneratedPassphrase] = useState('')

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users')
      if (res.ok) {
        const data = await res.json()
        setUsers(data)
      } else {
        setError("Error retrieving users.")
      }
    } catch (err: any) {
      setError(err.message)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: newUsername, role: newRole })
      })
      if (res.ok) {
        const data = await res.json()
        setSuccess('User created successfully!')
        setGeneratedPassphrase(data.passphrase)
        setNewUsername('')
        fetchUsers()
      } else {
        const data = await res.json()
        setError(data.error || 'Error during creation')
      }
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return
    setError('')
    setSuccess('')
    try {
      const res = await fetch(`/api/users?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        setSuccess('User deleted!')
        fetchUsers()
      } else {
        const data = await res.json()
        setError(data.error || 'Error deleting')
      }
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleResetPassword = async (id: number, username: string) => {
    if (!window.confirm(`Do you really want to reset the password for ${username}?\nA new random password will be generated.`)) return
    setError('')
    setSuccess('')
    setGeneratedPassphrase('')
    try {
      const res = await fetch(`/api/users?id=${id}`, { method: 'PUT' })
      if (res.ok) {
        const data = await res.json()
        setSuccess(`Password reset for ${username}!`)
        setGeneratedPassphrase(data.passphrase)
      } else {
        const data = await res.json()
        setError(data.error || 'Error during reset')
      }
    } catch (err: any) {
      setError(err.message)
    }
  }

  return (
    <div className="card form-card">
      <h2 style={{ marginTop: 0 }}>User Management (Admin)</h2>
      
      {error && <div className="msg-error">{error}</div>}
      {success && <div className="msg-success">{success}</div>}

      <div style={{ marginBottom: '20px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
              <th style={{ padding: '10px 0' }}>ID</th>
              <th style={{ padding: '10px 0' }}>Username</th>
              <th style={{ padding: '10px 0' }}>Role</th>
              <th style={{ padding: '10px 0', textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '10px 0' }}>{u.id}</td>
                <td style={{ padding: '10px 0' }}>{u.username}</td>
                <td style={{ padding: '10px 0' }}>
                  <span style={{ backgroundColor: u.role === 'admin' ? '#8a2be2' : '#3b82f6', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>
                    {u.role}
                  </span>
                </td>
                <td style={{ padding: '10px 0', textAlign: 'right' }}>
                  <button onClick={() => handleResetPassword(u.id, u.username)} style={{ backgroundColor: '#f39c12', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', marginRight: '8px' }}>
                    Reset PWD
                  </button>
                  <button onClick={() => handleDelete(u.id)} style={{ backgroundColor: '#e74c3c', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 style={{ marginTop: '30px' }}>Create a user</h3>
      <form onSubmit={handleCreate}>
        <div className="form-group">
          <label>Username</label>
          <input type="text" value={newUsername} onChange={e => setNewUsername(e.target.value)} required />
        </div>
        <div className="form-group">
          <label>Role</label>
          <select value={newRole} onChange={e => setNewRole(e.target.value)} style={{ width: '100%', padding: '10px', backgroundColor: 'var(--main-bg)', border: '1px solid var(--border-color)', color: 'var(--text-color)', borderRadius: '6px' }}>
            <option value="admin">Admin (Full Access)</option>
            {/* <option value="moderator">Modérateur (Future usage)</option> */}
          </select>
        </div>
        <button type="submit" className="btn-save">Generate account</button>
      </form>

      {generatedPassphrase && (
        <div style={{ marginTop: '20px', padding: '20px', backgroundColor: '#2d3748', borderLeft: '4px solid #4ade80', borderRadius: '4px' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#4ade80' }}>New account created</h4>
          <p style={{ margin: '0 0 10px 0' }}>Please give this secret phrase to the user. They will need to change it on their first login.</p>
          <div style={{ padding: '15px', backgroundColor: '#1a202c', fontFamily: 'monospace', fontSize: '1.2rem', textAlign: 'center', color: '#f6ad55', letterSpacing: '1px', borderRadius: '4px', userSelect: 'all' }}>
            {generatedPassphrase}
          </div>
        </div>
      )}
    </div>
  )
}
