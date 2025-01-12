// content.js
let isEnabled = true;
let originalTexts = new WeakMap();

// Check if a node should be processed
function shouldProcessNode(node) {
    const parent = node.parentElement;
    if (!parent) return false;
    const tagName = parent.tagName.toLowerCase();
    return !['script', 'style', 'input', 'textarea'].includes(tagName);
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 10px 20px;
        border-radius: 8px;
        color: white;
        font-size: 14px;
        z-index: 10000;
        background-color: ${type === 'error' ? '#ef4444' : '#2F80ED'};
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        transition: opacity 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Find matching full address for truncated address
function findMatchingAddress(truncated, aliases) {
    // Extract start and end parts from truncated address
    const match = truncated.match(/^(0x[a-fA-F0-9]{2,})\.{3}([a-fA-F0-9]{2,})$/);
    if (!match) return null;

    const [_, start, end] = match;
    
    // Search through aliases for matching pattern
    return Object.keys(aliases).find(address => {
        return address.toLowerCase().startsWith(start.toLowerCase()) && 
               address.toLowerCase().endsWith(end.toLowerCase());
    });
}

// Find matching address from end part
function findMatchingAddressFromEnd(endPart, aliases) {
    // Convertir en minuscules pour une comparaison insensible à la casse
    const lowerEndPart = endPart.toLowerCase();
    
    // Rechercher parmi les adresses connues
    return Object.keys(aliases).find(address => 
        address.toLowerCase().endsWith(lowerEndPart)
    );
}

// Replace addresses with aliases
function replaceAddressesWithAliases(aliases) {
    if (!isEnabled || !document.body) return;

    const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null,
        false
    );

    // Patterns for different types of addresses
    const PATTERNS = {
        full: /0x[a-fA-F0-9]{40}/g,
        truncated: /0x[a-fA-F0-9]{1,}\.{3}[a-fA-F0-9]{1,}/g,
        truncatedShort: /0x[a-fA-F0-9]\.{3}[a-fA-F0-9]{3}/g,
        endOnly: /[a-fA-F0-9]{6}$/g
    };

    let node;
    while (node = walker.nextNode()) {
        if (!shouldProcessNode(node)) continue;

        const text = node.textContent;
        let newText = text;
        let needsUpdate = false;

        // Store original text if not already stored
        if (!originalTexts.has(node)) {
            originalTexts.set(node, text);
        }

        // Replace full addresses
        const fullMatches = text.match(PATTERNS.full);
        if (fullMatches) {
            fullMatches.forEach(address => {
                const alias = aliases[address.toLowerCase()];
                if (alias) {
                    newText = newText.replace(address, alias);
                    needsUpdate = true;
                }
            });
        }

        // Replace truncated addresses
        const truncatedMatches = text.match(PATTERNS.truncated);
        if (truncatedMatches) {
            truncatedMatches.forEach(truncated => {
                const fullAddress = findMatchingAddress(truncated, aliases);
                if (fullAddress && aliases[fullAddress.toLowerCase()]) {
                    newText = newText.replace(truncated, aliases[fullAddress.toLowerCase()]);
                    needsUpdate = true;
                }
            });
        }

        // Replace end-only addresses
        const endMatches = text.match(PATTERNS.endOnly);
        if (endMatches) {
            endMatches.forEach(endPart => {
                const fullAddress = findMatchingAddressFromEnd(endPart, aliases);
                if (fullAddress && aliases[fullAddress.toLowerCase()]) {
                    newText = newText.replace(endPart, aliases[fullAddress.toLowerCase()]);
                    needsUpdate = true;
                }
            });
        }

        if (needsUpdate) {
            node.textContent = newText;
        }
    }
}

// Restore original addresses
function restoreOriginalAddresses() {
    const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null,
        false
    );

    let node;
    while (node = walker.nextNode()) {
        const originalText = originalTexts.get(node);
        if (originalText) {
            node.textContent = originalText;
            originalTexts.delete(node);
        }
    }
}

// Initialize extension
function initialize() {
    chrome.storage.local.get(['enabled', 'aliases'], (result) => {
        isEnabled = result.enabled !== false;
        if (isEnabled && result.aliases) {
            replaceAddressesWithAliases(result.aliases);
        }
    });
}

// Message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    try {
        switch (message.type) {
            case "toggleState":
                isEnabled = message.enabled;
                if (isEnabled) {
                    chrome.storage.local.get(['aliases'], (result) => {
                        if (result.aliases) {
                            replaceAddressesWithAliases(result.aliases);
                        }
                    });
                } else {
                    restoreOriginalAddresses();
                }
                break;
            case "getSelection":
                const selectedText = window.getSelection().toString().trim();
                if (selectedText) {
                    chrome.runtime.sendMessage({
                        type: "openHypurrscan",
                        address: selectedText
                    });
                }
                break;
            case "clearAliases":
                restoreOriginalAddresses();
                break;
        }
    } catch (error) {
        console.error('Error in message listener:', error);
        showNotification('Error processing message', 'error');
    }
});

// Observe DOM changes
const observer = new MutationObserver((mutations) => {
    if (isEnabled) {
        chrome.storage.local.get(['aliases'], (result) => {
            if (result.aliases) {
                replaceAddressesWithAliases(result.aliases);
            }
        });
    }
});

// Start observing
if (document.body) {
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true
    });
}

// Initialize on load
initialize();

// Cleanup
window.addEventListener('unload', () => {
    observer.disconnect();
    originalTexts = null;
});