console.log('%c WA EXTENSION LOADED ', 'background: #25d366; color: white; font-size: 20px;');

/**
 * ---------------------------------------------------------
 * CATEGORY 0: SUPER UTILITIES (Forced Interaction)
 * ---------------------------------------------------------
 */

async function smartClick(el) {
  if (!el) return;

  el.scrollIntoView({
    behavior: 'smooth',
    block: 'center'
  });

  await sleep(500);

  ['mousedown', 'mouseup', 'click'].forEach(eventType => {
    el.dispatchEvent(
      new MouseEvent(eventType, {
        bubbles: true,
        view: window
      })
    );
  });
}




chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'start_cleaning') {
    startCleaning(request.filterUnreplied || false);
    sendResponse({ status: 'Cleaning started' });
  }
  if (request.action === 'crm_action') {
    handleCrmAction(request.crmAction, request.label);
    sendResponse({ status: 'Action received' });
  }
  return true;
});




async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}






/**
 * Helper: Send error message to Popup UI
 */
function reportError(msg) {
  console.error(msg);
  chrome.runtime.sendMessage({ action: 'show_error', message: msg }).catch(() => {});
}

/**
 * Handle all CRM actions from the popup
 */
function handleCrmAction(action, label) {
  console.log(`%c CRM ACTION: ${label} (${action}) `, 'background: #128c7e; color: white;');
  chrome.runtime.sendMessage({ action: 'finish' }).catch(() => {});
}

/**
 * Check if the last message in a chat was sent by "other" (not us)
 */
function isLastMsgByOther(chatEl) {
  try {
    const msgElements = chatEl.querySelectorAll('span[data-testid="conversation-info-header"], div.message-in, div.message-out, [data-testid="msg-container"]');
    return true;
  } catch (e) {
    return true;
  }
}




/**
 * ---------------------------------------------------------
 * CATEGORY 2: ARCHIVE CLEANING LOGIC (Restored with Error Handling)
 * ---------------------------------------------------------
 */
async function startCleaning(filterUnreplied) {
  console.log('%c STARTING ARCHIVE CLEANER ', 'background: #075e54; color: white;');
  console.log(`Filter unreplied: ${filterUnreplied}`);

  // --- STEP 1: ARCHIVED FOLDER KE ANDAR JANA ---
  let archivedBtn = document.querySelector('span[aria-label="Archived"]') || 
                    document.querySelector('button[aria-label="Archived"]') ||
                    Array.from(document.querySelectorAll('span')).find(el => el.textContent === 'Archived');
  
  if (archivedBtn) {
    console.log('Archived folder par click ho raha hai...');
    await smartClick(archivedBtn);
    await sleep(2000); 
  } else {
    reportError('Archive Folder not found on sidebar.');
    return;
  }

  // --- STEP 2: CHATS KI LIST DHUNDHNA ---
  const chatList = document.querySelectorAll('div[role="listitem"]');
  console.log(`Found ${chatList.length} chats.`);

  if (chatList.length === 0) {
    reportError('No archived chats found.');
    return;
  }

  const total = chatList.length;

  for (let i = 0; i < total; i++) {
    const chat = chatList[i];
    chrome.runtime.sendMessage({ action: 'progress', current: i + 1, total }).catch(() => {});

    chat.scrollIntoView(); 
    await sleep(500);

    // --- STEP 3: CHAT KO SELECT/OPEN KARNA ---
    console.log(`Chat ${i + 1} ko open kiya ja raha hai...`);
    const targets = [
      chat.querySelector('span[title]'), 
      chat.querySelector('div[role="gridcell"]'), 
      chat 
    ];

    let clicked = false;
    for (const target of targets) {
      if (target) {
        await smartClick(target);
        clicked = true;
        break;
      }
    }

    if (!clicked) {
      reportError(`Could not click chat item ${i + 1}`);
      continue;
    }

    await sleep(2000); 

    // --- STEP 4: 3-DOT MENU SELECT KARNA (Header me) ---
    console.log(`Chat ${i + 1} finding menu...`);
    let menuBtn = null;
    const headers = document.querySelectorAll('header');
    let activeHeader = null;
    
    for (const h of headers) {
      if (h.closest('#main') || h.querySelector('[data-testid="conversation-info-header"]')) {
        activeHeader = h;
        break;
      }
    }
    
    if (activeHeader) {
      menuBtn = activeHeader.querySelector('[data-testid="menu"]') || 
                activeHeader.querySelector('[data-icon="menu"]') ||
                activeHeader.querySelector('[aria-label*="Menu"]');
    }

    if (menuBtn) {
      console.log('Menu button mil gaya, click ho raha hai...');
      await smartClick(menuBtn);
      await sleep(1000); 

      // --- STEP 5: CLEAR CHAT OPTION SELECT KARNA ---
      const allElements = document.querySelectorAll('div, span, li');
      
      const visibleElements = Array.from(allElements).filter(el =>
        el.offsetParent !== null
      );
      
      let clearOption =
        visibleElements.find(el =>
          el.textContent.trim().toLowerCase() === 'delete chat'
        ) ||
        visibleElements.find(el =>
          el.textContent.trim().toLowerCase() === 'clear chat'
        ) ||
        visibleElements.find(el =>
          el.textContent.trim().toLowerCase() === 'clear messages'
        );

      if (clearOption) {
        console.log('Clear option mil gaya, click ho raha hai...');
        await smartClick(clearOption);
        await sleep(1000);

        // --- STEP 6: CONFIRMATION MODAL ME CLEAR PAR CLICK KARNA ---
        const modalButtons = document.querySelectorAll('button');
        
        const confirmBtn = Array.from(modalButtons).find(el => {
          const text = el.textContent.trim().toLowerCase();
        
          return (
            text.includes('delete') ||
            text.includes('clear')
          ) && !text.includes('cancel');
        });

        
        if (confirmBtn) {
          console.log('Clearing confirm ho rahi hai...');
          await smartClick(confirmBtn);
          chrome.runtime.sendMessage({ action: 'chat_cleaned' }).catch(() => {});
          await sleep(3000); 
        } else {
          reportError(`Confirmation button not found for chat ${i + 1}`);
        }
      } else {
        reportError(`'Clear Chat' option not found in menu for chat ${i + 1}`);
      }
    } else {
      reportError(`Menu button (3 dots) not found for chat ${i + 1}`);
    }

    await sleep(2000); 
  }

  chrome.runtime.sendMessage({ action: 'complete' }).catch(() => {});
}






function createFloatingPanel() {
  if (document.getElementById('wa-helper-panel')) return;

  const panel = document.createElement('div');
  panel.id = 'wa-helper-panel';
  panel.style.cssText = 'position:fixed;top:10px;right:0px;width:420px;height:420px;min-height:420px;z-index:999999;background:white;border-radius:8px 0 0 8px;box-shadow:0 2px 12px rgba(0,0,0,.25);overflow:hidden;';
  panel.innerHTML = `
<div style="position:absolute;top:0;right:0;z-index:10;">
  <button id="wa-min" style="width:36px;height:28px;border:none;background:rgba(0,0,0,.06);cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;color:#555;transition:background .15s;border-radius:0 8px 0 8px;" title="Minimize" onmouseover="this.style.background='rgba(0,0,0,.12)'" onmouseout="this.style.background='rgba(0,0,0,.06)'">\u2014</button>
</div>
<iframe id="wa-frame" src="${chrome.runtime.getURL('popup.html')}" style="width:100%;height:100%;border:none;border-radius:8px;" scrolling="auto"></iframe>`;
  document.body.appendChild(panel);

  let minimized = false;
  const frame = document.getElementById('wa-frame');
  const minBtn = document.getElementById('wa-min');

  function toggleMin() {
    minimized = !minimized;
    frame.style.display = minimized ? 'none' : 'block';
    panel.style.height = minimized ? '3px' : '420px';
    panel.style.minHeight = minimized ? '3px' : '420px';
    panel.style.overflow = minimized ? 'visible' : 'hidden';
    panel.style.cursor = minimized ? 'pointer' : 'default';
    panel.style.background = minimized ? 'transparent' : 'white';
    panel.style.boxShadow = minimized ? 'none' : '0 2px 12px rgba(0,0,0,.25)';
    panel.style.borderRadius = minimized ? '0' : '8px 0 0 8px';
    panel.style.borderTop = minimized ? '3px solid #25D366' : 'none';
    panel.style.minWidth = minimized ? '40px' : '420px';
    panel.style.width = minimized ? '40px' : '420px';
    panel.style.right = minimized ? 'auto' : '0px';
    panel.style.left = minimized ? 'calc(50% + 60px)' : 'auto';
    panel.style.transform = minimized ? 'translateX(-50%)' : 'none';
    panel.style.top = '10px';
    minBtn.parentElement.style.right = '0';
    minBtn.parentElement.style.left = 'auto';
    minBtn.style.borderRadius = '0 8px 0 8px';
    minBtn.textContent = minimized ? '+' : '\u2014';
    minBtn.style.fontSize = minimized ? '18px' : '16px';
    minBtn.style.fontWeight = minimized ? 'bold' : 'normal';
  }

  document.getElementById('wa-min').onclick = (e) => {
    e.stopPropagation();
    toggleMin();
  };

  panel.onclick = () => {
    if (minimized) toggleMin();
  };
}

if (document.readyState === 'complete') {
  setTimeout(createFloatingPanel, 3000);
} else {
  window.addEventListener('load', () => setTimeout(createFloatingPanel, 3000));
}