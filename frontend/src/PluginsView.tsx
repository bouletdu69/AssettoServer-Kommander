import React, { useState, useEffect } from 'react';

interface PluginInfo {
  name: string;
}

interface CustomPlugin {
  name: string;
  size: number;
}

export function PluginsView() {
  const [plugins, setPlugins] = useState<PluginInfo[]>([]);
  const [customPlugins, setCustomPlugins] = useState<CustomPlugin[]>([]);
  const [yamlConfig, setYamlConfig] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<{ type: string, text: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [pluginsRes, configRes, customRes] = await Promise.all([
        fetch('/api/plugins/available'),
        fetch('/api/plugins/config'),
        fetch('/api/plugins/custom')
      ]);

      if (pluginsRes.ok) {
        const pluginsData = await pluginsRes.json();
        setPlugins(pluginsData || []);
      }
      
      if (customRes.ok) {
        const customData = await customRes.json();
        setCustomPlugins(customData || []);
      }
      
      if (configRes.ok) {
        const configData = await configRes.json();
        setYamlConfig(configData.yamlContent || '');
      }
    } catch (err) {
      console.error(err);
      setMsg({ type: 'error', text: 'Error loading plugins.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch('/api/plugins/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ yamlContent: yamlConfig })
      });
      if (!res.ok) throw new Error('Error saving');
      setMsg({ type: 'success', text: 'Configuration saved! (Requires server restart)' });
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleInstall = (pluginName: string) => {
    if (yamlConfig.includes(pluginName + ':')) {
      setMsg({ type: 'error', text: `The plugin ${pluginName} is already present in the configuration!` });
      return;
    }
    
    const newYaml = yamlConfig + `\n\n${pluginName}:\n  Enabled: true\n`;
    setYamlConfig(newYaml);
    setMsg({ type: 'success', text: `Block added for ${pluginName}. Do not forget to save!` });
  };

  const handleUploadCustomPlugin = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.dll') && !file.name.toLowerCase().endsWith('.zip')) {
      setMsg({ type: 'error', text: 'Only .dll and .zip files are allowed' });
      return;
    }

    setUploading(true);
    setMsg(null);
    const formData = new FormData();
    formData.append('plugin', file);

    try {
      const res = await fetch('/api/plugins/custom', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error uploading');
      
      setMsg({ type: 'success', text: 'Plugin uploaded successfully! (Will take effect on next restart)' });
      fetchData(); // Refresh list
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setUploading(false);
      e.target.value = ''; // Reset input
    }
  };

  const handleDeleteCustomPlugin = async (name: string) => {
    if (!window.confirm(`Delete the plugin ${name}?`)) return;

    try {
      const res = await fetch(`/api/plugins/custom/${name}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Error deleting');
      fetchData();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
    }
  };

  if (loading) return <div style={{ padding: '20px' }}>Loading...</div>;

  return (
    <div style={{ padding: '20px', display: 'flex', gap: '20px', height: '100%' }}>
      
      {/* Left side: List of plugins */}
      <div style={{ flex: '1', backgroundColor: 'var(--card-bg)', padding: '20px', borderRadius: '8px', overflowY: 'auto', maxHeight: 'calc(100vh - 120px)' }}>
        <h2 style={{ marginTop: 0, marginBottom: '20px', color: 'var(--primary-color)' }}>Available Plugins</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '20px', fontSize: '0.9rem' }}>
          These plugins are included directly in your version of AssettoServer. Click on "Add" to insert their base configuration into the file.
        </p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {plugins.map(p => (
            <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
              <div>
                <strong style={{ display: 'block', fontSize: '1.1rem' }}>{p.name}</strong>
              </div>
              <button 
                onClick={() => handleInstall(p.name)}
                style={{
                  backgroundColor: 'var(--primary-color)',
                  color: 'white',
                  border: 'none',
                  padding: '8px 15px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                + Add
              </button>
            </div>
          ))}
          {plugins.length === 0 && (
            <div style={{ color: 'var(--text-muted)' }}>No plugins detected.</div>
          )}
        </div>

        <h2 style={{ marginTop: '40px', marginBottom: '20px', color: '#f39c12' }}>Custom Plugins (.dll / .zip)</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '20px', fontSize: '0.9rem' }}>
          Import your own plugins here. The <strong>.dll</strong> files and the <strong>.zip</strong> (with folders) are supported.
        </p>

        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'inline-block',
            backgroundColor: 'var(--primary-color)',
            color: 'white',
            padding: '10px 20px',
            borderRadius: '6px',
            cursor: uploading ? 'not-allowed' : 'pointer',
            fontWeight: 'bold'
          }}>
            {uploading ? 'Uploading...' : '⬆️ Upload a plugin (.dll / .zip)'}
            <input 
              type="file" 
              accept=".dll,.zip" 
              style={{ display: 'none' }} 
              onChange={handleUploadCustomPlugin}
              disabled={uploading}
            />
          </label>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {customPlugins.map(p => (
            <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
              <div>
                <strong style={{ display: 'block', fontSize: '1.1rem' }}>
                  {/* @ts-ignore */}
                  {p.type === 'folder' ? '📁 ' : '⚙️ '}{p.name}
                </strong>
                {/* @ts-ignore */}
                {p.type === 'dll' && <small style={{ color: 'var(--text-muted)' }}>{(p.size / 1024).toFixed(1)} KB</small>}
              </div>
              <button 
                onClick={() => handleDeleteCustomPlugin(p.name)}
                style={{
                  backgroundColor: '#e74c3c',
                  color: 'white',
                  border: 'none',
                  padding: '8px 15px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                🗑️ Delete
              </button>
            </div>
          ))}
          {customPlugins.length === 0 && (
            <div style={{ color: 'var(--text-muted)' }}>No custom plugins installed.</div>
          )}
        </div>

      </div>

      {/* Right side: YAML Editor */}
      <div style={{ flex: '2', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--card-bg)', padding: '20px', borderRadius: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, color: 'var(--primary-color)' }}>Configuration (extra_cfg.yml)</h2>
          <button 
            onClick={handleSaveConfig}
            disabled={saving}
            style={{
              backgroundColor: '#27ae60',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '6px',
              cursor: saving ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              fontSize: '1rem'
            }}
          >
            {saving ? 'Saving...' : '💾 Save Config'}
          </button>
        </div>

        {msg && (
          <div style={{ 
            padding: '10px 15px', 
            marginBottom: '20px', 
            borderRadius: '6px',
            backgroundColor: msg.type === 'success' ? 'rgba(39, 174, 96, 0.2)' : 'rgba(231, 76, 60, 0.2)',
            color: msg.type === 'success' ? '#2ecc71' : '#e74c3c',
            border: `1px solid ${msg.type === 'success' ? '#27ae60' : '#c0392b'}`
          }}>
            {msg.text}
          </div>
        )}

        <textarea
          value={yamlConfig}
          onChange={(e) => setYamlConfig(e.target.value)}
          style={{
            flex: 1,
            width: '100%',
            backgroundColor: '#1e1e1e',
            color: '#d4d4d4',
            fontFamily: 'monospace',
            fontSize: '14px',
            padding: '15px',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            resize: 'none',
            whiteSpace: 'pre',
            lineHeight: '1.5',
            boxSizing: 'border-box'
          }}
          spellCheck="false"
        />
      </div>

    </div>
  );
}
