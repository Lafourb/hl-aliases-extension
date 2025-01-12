// background.js
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
      id: "openOnHypurrscan",
      title: "Open on Hypurrscan",
      contexts: ["selection"]
  });
});

function handleAddress(address) {
  const ethAddressPattern = /^0x[a-fA-F0-9]{40}$/;
  
  if (ethAddressPattern.test(address)) {
      chrome.tabs.create({ 
          url: `https://hypurrscan.io/address/${address}` 
      });
  } else {
      return false;
  }
  return true;
}

chrome.commands.onCommand.addListener((command) => {
  if (command === "open-hypurrscan") {
      chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
          chrome.tabs.sendMessage(tabs[0].id, {
              type: "getSelection"
          });
      });
  }
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "openOnHypurrscan") {
      const address = info.selectionText.trim();
      if (!handleAddress(address)) {
          chrome.tabs.sendMessage(tab.id, {
              type: "showError",
              message: "Selected text is not a valid Ethereum address"
          });
      }
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "openHypurrscan") {
      const success = handleAddress(message.address);
      if (!success) {
          chrome.tabs.sendMessage(sender.tab.id, {
              type: "showError",
              message: "Selected text is not a valid Ethereum address"
          });
      }
  }
});