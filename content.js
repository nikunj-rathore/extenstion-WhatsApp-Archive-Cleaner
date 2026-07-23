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






window.addEventListener('load', async () => {
  await sleep(3000);
  createFloatingPanel();
});




function createFloatingPanel() {
  if (document.getElementById('wa-helper-panel')) return;

  const panel = document.createElement('div');
  panel.id = 'wa-helper-panel';

  const style = document.createElement('style');
  style.textContent = `
    @keyframes waSlideIn {
      from { opacity: 0; transform: translateX(40px) scale(0.95); }
      to { opacity: 1; transform: translateX(0) scale(1); }
    }
    @keyframes waGlow {
      0%, 100% { box-shadow: 0 0 20px rgba(37,211,102,0.15); }
      50% { box-shadow: 0 0 30px rgba(37,211,102,0.3); }
    }
    #wa-header {
      background: linear-gradient(135deg, #075e54, #128c7e);
      color: white;
      padding: 10px 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: move;
      user-select: none;
      border-radius: 14px 14px 0 0;
    }
    #wa-header .wa-brand {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.3px;
    }
    #wa-header .wa-brand .wa-logo {
      width: 22px;
      height: 22px;
      background: rgba(255,255,255,0.2);
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
    }
    #wa-header .wa-controls {
      display: flex;
      gap: 6px;
    }
    #wa-header .wa-controls button {
      background: rgba(255,255,255,0.15);
      border: none;
      color: white;
      width: 26px;
      height: 26px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    }
    #wa-header .wa-controls button:hover {
      background: rgba(255,255,255,0.3);
      transform: scale(1.1);
    }
  `;
  document.head.appendChild(style);

  panel.innerHTML = `
<div id="wa-header">
  <div class="wa-brand">
    <span class="wa-logo">🧹</span>
    Archive Cleaner
  </div>
  <div class="wa-controls">
    <button id="wa-min" title="Minimize">─</button>
    <button id="wa-max" title="Maximize">▢</button>
  </div>
</div>
<iframe
  src="${chrome.runtime.getURL('popup.html')}"
  style="
    width: 100%;
    height: calc(100% - 46px);
    border: none;
    border-radius: 0 0 14px 14px;
  ">
</iframe>
`;

  panel.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    width: 380px;
    height: 540px;
    z-index: 999999;
    background: white;
    border-radius: 14px;
    box-shadow: 0 8px 40px rgba(0,0,0,0.15);
    resize: both;
    overflow: hidden;
    animation: waSlideIn 0.4s ease, waGlow 3s ease-in-out infinite;
    border: 1px solid rgba(255,255,255,0.1);
  `;

  document.body.appendChild(panel);
  const iframe = panel.querySelector('iframe');

  document.getElementById('wa-min').onclick = () => {
    if (iframe.style.display === 'none') {
      iframe.style.display = 'block';
      panel.style.height = '540px';
    } else {
      iframe.style.display = 'none';
      panel.style.height = '46px';
    }
  };

  let maximized = false;

  document.getElementById('wa-max').onclick = () => {
    if (!maximized) {
      panel.style.width = '520px';
      panel.style.height = '85vh';
      panel.style.top = '10px';
      panel.style.right = '10px';
      maximized = true;
    } else {
      panel.style.width = '380px';
      panel.style.height = '540px';
      panel.style.top = '20px';
      panel.style.right = '20px';
      maximized = false;
    }
  };
}