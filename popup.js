// popup.js
document.addEventListener('DOMContentLoaded', () => {
  const fileInput = document.getElementById('jsonFile');
  const aliasesInput = document.getElementById('aliasesInput');
  const aliasCount = document.getElementById('aliasCount');
  const enableSwitch = document.getElementById('enableExtension');
  const fetchApiButton = document.getElementById('fetchApi');
  const apiSpinner = document.getElementById('apiSpinner');
  let notification = null;

  function showNotification(message, type = 'success') {
      if (notification) {
          notification.remove();
      }
      notification = document.createElement('div');
      notification.className = `notification ${type}`;
      notification.textContent = message;
      document.body.appendChild(notification);
      
      setTimeout(() => {
          notification.classList.add('show');
      }, 100);

      setTimeout(() => {
          notification.classList.remove('show');
          setTimeout(() => notification.remove(), 300);
      }, 3000);
  }

  function updateAliasCount(count) {
      aliasCount.textContent = `${count} aliases`;
  }

  function setLoading(loading) {
      fetchApiButton.disabled = loading;
      apiSpinner.style.display = loading ? 'block' : 'none';
  }

  // Fonction pour fusionner les alias
  function mergeAliases(existingAliases, newAliases, prioritizeNew = true) {
      const merged = { ...existingAliases };
      
      for (const [address, alias] of Object.entries(newAliases)) {
          if (!merged[address] || prioritizeNew) {
              merged[address] = alias;
          }
      }

      return merged;
  }

  // Fonction pour sauvegarder les alias
  function saveAliases(aliases) {
      chrome.storage.local.set({ aliases }, () => {
          const count = Object.keys(aliases).length;
          aliasesInput.value = JSON.stringify(aliases, null, 2);
          updateAliasCount(count);
          
          if (enableSwitch.checked) {
              chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                  if (tabs[0]) {
                      chrome.tabs.sendMessage(tabs[0].id, {
                          type: "toggleState",
                          enabled: true
                      });
                  }
              });
          }
      });
  }

  async function importFromLocalStorage() {
    try {
        const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
        
        if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('brave://')) {
            showNotification('Cannot import from browser system pages. Please try on a website.', 'error');
            return;
        }

        const result = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
                try {
                    const allAliases = {};
                    let totalCount = { standard: 0, pinia: 0 };

                    // Traiter les aliases standards
                    const standardAliases = localStorage.getItem('aliases');
                    if (standardAliases) {
                        try {
                            const parsed = JSON.parse(standardAliases);
                            if (typeof parsed === 'object' && parsed !== null) {
                                Object.entries(parsed).forEach(([address, name]) => {
                                    allAliases[address.toLowerCase()] = name;
                                    totalCount.standard++;
                                });
                            }
                        } catch (e) {
                            console.error('Error parsing standard aliases:', e);
                        }
                    }

                    // Traiter les piniaAliases
                    const piniaAliases = localStorage.getItem('piniaAliases');
                    if (piniaAliases) {
                        try {
                            const parsed = JSON.parse(piniaAliases);
                            console.log("Parsed piniaAliases:", parsed);

                            // Parcourir la structure des piniaAliases
                            if (typeof parsed === 'object' && parsed !== null) {
                                // Fonction récursive pour explorer l'objet
                                function explorePiniaObject(obj) {
                                    for (const [key, value] of Object.entries(obj)) {
                                        // Si c'est une string, vérifier si la clé est une adresse
                                        if (typeof value === 'string' && key.startsWith('0x')) {
                                            allAliases[key.toLowerCase()] = value;
                                            totalCount.pinia++;
                                        }
                                        // Si c'est un objet, explorer récursivement
                                        else if (typeof value === 'object' && value !== null) {
                                            // Si l'objet a une propriété d'adresse
                                            if (value.address && typeof value.name === 'string') {
                                                allAliases[value.address.toLowerCase()] = value.name;
                                                totalCount.pinia++;
                                            }
                                            // Explorer les sous-objets
                                            explorePiniaObject(value);
                                        }
                                    }
                                }

                                explorePiniaObject(parsed);
                            }
                        } catch (e) {
                            console.error('Error parsing pinia aliases:', e);
                        }
                    }

                    console.log('Processed all aliases:', allAliases);
                    console.log('Total counts:', totalCount);

                    return {
                        success: true,
                        data: allAliases,
                        counts: totalCount
                    };
                } catch (e) {
                    console.error('Error in script:', e);
                    return {
                        error: 'Error parsing aliases data: ' + e.message
                    };
                }
            }
        });

        const response = result[0].result;

        if (response.error) {
            showNotification(response.error, 'error');
            return;
        }

        if (!response.data || Object.keys(response.data).length === 0) {
            showNotification('No valid aliases found in localStorage', 'error');
            return;
        }

        console.log('Extracted aliases:', response.data);
        console.log('Counts:', response.counts);

        // Récupération des alias existants et fusion
        chrome.storage.local.get(['aliases'], (result) => {
            const existingAliases = result.aliases || {};
            console.log('Existing aliases:', existingAliases);
            
            const mergedAliases = mergeAliases(existingAliases, response.data, true);
            console.log('Merged aliases:', mergedAliases);
            
            saveAliases(mergedAliases);
            
            // Force le rafraîchissement des alias sur la page
            chrome.tabs.sendMessage(tab.id, {
                type: "toggleState",
                enabled: true
            });

            const totalImported = response.counts.standard + response.counts.pinia;
            showNotification(`Successfully imported ${totalImported} aliases (${response.counts.standard} standard, ${response.counts.pinia} from pinia)`);
        });

    } catch (error) {
        if (error.message.includes('chrome://')) {
            showNotification('Cannot import from browser system pages. Please try on a website.', 'error');
        } else {
            showNotification(`Error importing from localStorage: ${error.message}`, 'error');
            console.error('Full error:', error);
        }
    }
}

  // Load initial state
  chrome.storage.local.get(['aliases', 'enabled'], (result) => {
      if (result.aliases) {
          const count = Object.keys(result.aliases).length;
          aliasesInput.value = JSON.stringify(result.aliases, null, 2);
          updateAliasCount(count);
      }
      enableSwitch.checked = result.enabled !== false;
  });

  // Event Listeners
  // Import from localStorage button
  document.getElementById('importLocalStorage').addEventListener('click', importFromLocalStorage);

  // File input handler
  fileInput.addEventListener('change', (event) => {
      const file = event.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      
      reader.onload = () => {
          try {
              const content = reader.result;
              const newAliases = JSON.parse(content);

              chrome.storage.local.get(['aliases'], (result) => {
                  const existingAliases = result.aliases || {};
                  const mergedAliases = mergeAliases(existingAliases, newAliases, true);
                  const count = Object.keys(mergedAliases).length;

                  saveAliases(mergedAliases);
                  showNotification(`Successfully merged ${Object.keys(newAliases).length} personal aliases`);
              });
          } catch (error) {
              showNotification('Error parsing JSON file', 'error');
          }
      };

      reader.onerror = () => {
          showNotification('Error reading file', 'error');
      };

      reader.readAsText(file);
  });

  // Fetch API button handler
  fetchApiButton.addEventListener('click', async () => {
      try {
          setLoading(true);
          const response = await fetch('https://api.hypurrscan.io/globalAliases');
          if (!response.ok) {
              throw new Error(`API error: ${response.status}`);
          }
          const hypurrscanAliases = await response.json();

          chrome.storage.local.get(['aliases'], (result) => {
              const existingAliases = result.aliases || {};
              const mergedAliases = mergeAliases(existingAliases, hypurrscanAliases, false);
              const count = Object.keys(mergedAliases).length;

              saveAliases(mergedAliases);
              showNotification(`Successfully merged ${Object.keys(hypurrscanAliases).length} Hypurrscan aliases`);
          });
      } catch (error) {
          showNotification(`Error: ${error.message}`, 'error');
      } finally {
          setLoading(false);
      }
  });

  // Clear aliases button handler
  document.getElementById('clearAliases').addEventListener('click', () => {
      if (confirm('Are you sure you want to clear all aliases? This cannot be undone.')) {
          chrome.storage.local.remove(['aliases'], () => {
              aliasesInput.value = '';
              updateAliasCount(0);
              showNotification('All aliases cleared');
              
              chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                  if (tabs[0]) {
                      chrome.tabs.sendMessage(tabs[0].id, {
                          type: "clearAliases"
                      });
                  }
              });
          });
      }
  });

  // Enable/disable toggle handler
  enableSwitch.addEventListener('change', (e) => {
      const enabled = e.target.checked;
      chrome.storage.local.set({ enabled }, () => {
          showNotification(enabled ? 'Alias replacement enabled' : 'Alias replacement disabled');
          
          chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
              if (tabs[0]) {
                  chrome.tabs.sendMessage(tabs[0].id, { 
                      type: "toggleState", 
                      enabled 
                  });
              }
          });
      });
  });
});