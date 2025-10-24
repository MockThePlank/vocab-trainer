/**
 * Admin page functionality for backup and restore
 */

function showMessage(text: string, type: 'success' | 'error') {
  const messageEl = document.getElementById('message');
  if (!messageEl) return;
  
  messageEl.textContent = text;
  messageEl.className = type;
  
  setTimeout(() => {
    messageEl.className = '';
    messageEl.style.display = 'none';
  }, 5000);
}

function getApiKey(): string | null {
  const input = document.getElementById('apiKey') as HTMLInputElement;
  const apiKey = input?.value.trim();
  
  if (!apiKey) {
    showMessage('❌ Bitte gib zuerst deinen API-Schlüssel ein', 'error');
    return null;
  }
  
  return apiKey;
}

async function handleExport() {
  const apiKey = getApiKey();
  if (!apiKey) return;

  try {
    const response = await fetch('/api/admin/export', {
      headers: {
        'X-API-Key': apiKey
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Ungültiger API-Schlüssel');
      }
      throw new Error('Export fehlgeschlagen');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vocab-trainer-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    showMessage('✅ Backup erfolgreich heruntergeladen!', 'success');
  } catch (error) {
    console.error('Export error:', error);
    showMessage('❌ Export fehlgeschlagen: ' + (error instanceof Error ? error.message : 'Unbekannter Fehler'), 'error');
  }
}

async function handleImport() {
  const apiKey = getApiKey();
  if (!apiKey) return;

  const fileInput = document.getElementById('importFile') as HTMLInputElement;
  const file = fileInput?.files?.[0];

  if (!file) {
    showMessage('❌ Bitte wähle zuerst eine Backup-Datei aus', 'error');
    return;
  }

  if (!confirm('Möchtest du wirklich das Backup importieren? Dies kann existierende Daten überschreiben.')) {
    return;
  }

  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/admin/import', {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey
      },
      body: formData
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Import fehlgeschlagen');
    }

    showMessage(`✅ Import erfolgreich! ${result.imported.lessons} Lektionen und ${result.imported.vocabulary} Vokabeln importiert.`, 'success');
    
    // Clear file input
    fileInput.value = '';
  } catch (error) {
    console.error('Import error:', error);
    showMessage('❌ Import fehlgeschlagen: ' + (error instanceof Error ? error.message : 'Unbekannter Fehler'), 'error');
  }
}

// Initialize event listeners
window.addEventListener('DOMContentLoaded', () => {
  const exportBtn = document.getElementById('exportBtn');
  const importBtn = document.getElementById('importBtn');

  if (exportBtn) {
    exportBtn.addEventListener('click', handleExport);
  }

  if (importBtn) {
    importBtn.addEventListener('click', handleImport);
  }

  // Store API key in session storage
  const apiKeyInput = document.getElementById('apiKey') as HTMLInputElement;
  if (apiKeyInput) {
    // Load from session storage
    const savedKey = sessionStorage.getItem('admin_api_key');
    if (savedKey) {
      apiKeyInput.value = savedKey;
    }

    // Save to session storage on change
    apiKeyInput.addEventListener('change', () => {
      if (apiKeyInput.value) {
        sessionStorage.setItem('admin_api_key', apiKeyInput.value);
      }
    });
  }
});
