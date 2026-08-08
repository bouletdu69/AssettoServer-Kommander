import re

with open('/home/rs/web-gui-acserver/frontend/src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace state and handlers
state_pattern = r"const \[mode, setMode\] = useState<'auto' \| 'manual'>\('auto'\)\n  const \[showManualModal, setShowManualModal\] = useState\(false\)\n  const \[showAutoModal, setShowAutoModal\] = useState\(false\)\n  const \[showPatreonModal, setShowPatreonModal\] = useState\(false\)\n  const \[githubUsername, setGithubUsername\] = useState\(''\)\n  const \[githubToken, setGithubToken\] = useState\(''\)"

new_state = """const [mode, setMode] = useState<'archive' | 'manual'>('archive')
  const [showManualModal, setShowManualModal] = useState(false)
  const [showPatreonModal, setShowPatreonModal] = useState(false)
  const [zipFile, setZipFile] = useState<File | null>(null)"""
content = re.sub(state_pattern, new_state, content)

# Replace useEffect assignments
useEffect_pattern = r"if \(data\.githubUsername\) setGithubUsername\(data\.githubUsername\)\n        if \(data\.githubToken\) setGithubToken\(data\.githubToken\)"
content = re.sub(useEffect_pattern, "", content)

# Replace handleUpgrade
handleUpgrade_pattern = r"const handleUpgrade = async \(e: React\.FormEvent\) => {([\s\S]*?)finally {\n      setUpgrading\(false\)\n    }\n  }"

new_handleUpgrade = """const handleUpgrade = async (e: React.FormEvent) => {
    e.preventDefault()
    setUpgrading(true)
    setPatreonMsg({ type: 'info', text: 'Configuration appliquée. Redémarrage en cours...' })
    try {
      if (mode === 'archive') {
        if (!zipFile) {
          setPatreonMsg({ type: 'error', text: 'Veuillez sélectionner un fichier .zip Patreon.' })
          setUpgrading(false)
          return
        }
        const formData = new FormData()
        formData.append('zipfile', zipFile)
        formData.append('patreonKey', patreonKey)

        const res = await fetch('/api/server/upgrade/zip', {
          method: 'POST',
          body: formData
        })
        const data = await res.json()
        if (res.ok) {
          let attempts = 0
          const poll = setInterval(async () => {
            attempts++
            try {
              const statRes = await fetch('/api/server/status')
              const statData = await statRes.json()
              if (statData.status === 'Running') {
                clearInterval(poll)
                setPatreonMsg({ type: 'success', text: 'Archive Patreon installée et Serveur en ligne !' })
              }
            } catch(e) {}
            if (attempts > 30) {
              clearInterval(poll)
              setPatreonMsg({ type: 'error', text: 'Le serveur met du temps à répondre. Vérifiez les logs.' })
            }
          }, 2000)
        } else {
          setPatreonMsg({ type: 'error', text: data.message || 'Erreur lors de la mise à niveau.' })
        }
      } else {
        const res = await fetch('/api/server/upgrade', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            isAutoMode: false,
            image, 
            patreonKey 
          })
        })
        const data = await res.json()
        if (res.ok) {
          let attempts = 0
          const poll = setInterval(async () => {
            attempts++
            try {
              const statRes = await fetch('/api/server/status')
              const statData = await statRes.json()
              if (statData.status === 'Running') {
                clearInterval(poll)
                setPatreonMsg({ type: 'success', text: 'Configuration sauvegardée et Serveur en ligne !' })
              }
            } catch(e) {}
            if (attempts > 15) {
              clearInterval(poll)
              setPatreonMsg({ type: 'error', text: 'Le serveur met du temps à répondre. Vérifiez les logs.' })
            }
          }, 2000)
        } else {
          setPatreonMsg({ type: 'error', text: data.message || 'Erreur lors de la mise à niveau.' })
        }
      }
    } catch (err: any) {
      setPatreonMsg({ type: 'error', text: 'Erreur réseau: ' + err.message })
    } finally {
      setUpgrading(false)
    }
  }"""
content = re.sub(handleUpgrade_pattern, new_handleUpgrade, content)

# Remove the AutoUpdates UI chunk
autoUpdates_pattern = r"<div style=\{\{ borderTop: '1px solid var\(--border-color\)', paddingTop: '15px', marginTop: '15px' \}\}>\n\s*<h3 style=\{\{ marginTop: 0, fontSize: '1rem', color: 'var\(--primary-color\)' \}\}>Mises à jour automatiques \(Mode Patreon uniquement\)</h3>[\s\S]*?</button>\n\s*</div>"
content = re.sub(autoUpdates_pattern, "", content)

# Replace the tabs
tabs_pattern = r"<button \n          onClick=\{\(\) => setMode\('auto'\)\}\n          style=\{\{\n            flex: 1, padding: '10px', borderRadius: '6px', cursor: 'pointer',\n            backgroundColor: mode === 'auto' \? '#8a2be2' : 'var\(--sidebar-bg\)',\n            color: 'white', border: 'none', fontWeight: 'bold'\n          \}\}\n        >\n          Mode Automatique \(GitHub\)\n        </button>"
new_tabs = """<button 
          onClick={() => setMode('archive')}
          style={{
            flex: 1, padding: '10px', borderRadius: '6px', cursor: 'pointer',
            backgroundColor: mode === 'archive' ? '#8a2be2' : 'var(--sidebar-bg)',
            color: 'white', border: 'none', fontWeight: 'bold'
          }}
        >
          Mode Archive (.zip)
        </button>"""
content = re.sub(tabs_pattern, new_tabs, content)

description_pattern = r"\{mode === 'auto' \n          \? \"Connectez-vous via GitHub pour télécharger automatiquement la version Patreon. Si vous n'avez pas de compte GitHub, vous pouvez en créer un, ou bien basculer en Mode Manuel !\" \n          : \"Entrez manuellement le nom de l'image Docker de la version Premium si vous l'avez déjà téléchargée ou construite localement.\"}"
new_description = """{mode === 'archive' 
          ? "Importez l'archive .zip de la version Patreon. Le serveur s'occupera d'extraire les fichiers et de construire l'image Docker avec vos plugins." 
          : "Entrez manuellement le nom de l'image Docker de la version Premium si vous l'avez déjà téléchargée ou construite localement."}"""
content = re.sub(description_pattern, new_description, content)

# Replace the github inputs with zip input
inputs_pattern = r"\{mode === 'auto' \? \([\s\S]*?\) : \("
new_inputs = """{mode === 'archive' ? (
          <>
            <div className="form-group">
              <label>Archive Patreon (.zip)</label>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '-5px', marginBottom: '10px' }}>
                Téléchargez le fichier <code>assetto-server-patreon-*-linux-x64.zip</code> sur <a href="https://patreon.assettoserver.org/key" target="_blank" rel="noreferrer" style={{ color: '#8a2be2' }}>la page Patreon</a>, puis sélectionnez-le ici.
              </p>
              <input 
                type="file" 
                accept=".zip" 
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setZipFile(file);
                }}
                style={{ padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', width: '100%', cursor: 'pointer' }}
              />
              {zipFile && <span style={{ color: '#4ade80', fontSize: '0.9rem', display: 'block', marginTop: '5px' }}>Fichier sélectionné : {zipFile.name}</span>}
            </div>
          </>
        ) : ("""
content = re.sub(inputs_pattern, new_inputs, content)

# Remove AutoModal
autoModal_pattern = r"\{showAutoModal && \([\s\S]*?</div>\n      \)\}"
content = re.sub(autoModal_pattern, "", content)

with open('/home/rs/web-gui-acserver/frontend/src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
