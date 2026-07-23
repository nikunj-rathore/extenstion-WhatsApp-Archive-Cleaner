// ===== DOM REFS =====
const btn = document.getElementById('start-btn');
const statusEl = document.getElementById('status');
const statusDot = document.getElementById('statusDot');
const progressSection = document.getElementById('progressSection');
const progressFill = document.getElementById('progressFill');
const progressCount = document.getElementById('progressCount');
const statCleaned = document.getElementById('statCleaned');
const statCleanedNum = document.getElementById('statCleanedNum');
const statStatus = document.getElementById('statStatus');
const errorLog = document.getElementById('error-log');
const filterToggle = document.getElementById('filterToggle');

let cleanedCount = 0;
let filterEnabled = false;

// ===== FILTER TOGGLE =====
if (filterToggle) {
  filterToggle.addEventListener('click', () => {
    filterEnabled = !filterEnabled;
    filterToggle.classList.toggle('on', filterEnabled);
    setStatus('idle', filterEnabled ? 'Filter ON: unreplied chats only' : 'Filter OFF');
    chrome.storage.local.set({ filterUnreplied: filterEnabled });
  });

  chrome.storage.local.get('filterUnreplied', (data) => {
    filterEnabled = !!data.filterUnreplied;
    filterToggle.classList.toggle('on', filterEnabled);
  });
}

// ===== ACCORDION =====
document.querySelectorAll('.accordion-header').forEach((header) => {
  header.addEventListener('click', () => {
    const acc = header.parentElement;
    acc.classList.toggle('open');
  });
});

// ===== RIPPLE EFFECT =====
btn.addEventListener('click', function (e) {
  const ripple = document.createElement('span');
  ripple.classList.add('ripple');
  const rect = this.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  ripple.style.width = ripple.style.height = size + 'px';
  ripple.style.left = e.clientX - rect.left - size / 2 + 'px';
  ripple.style.top = e.clientY - rect.top - size / 2 + 'px';
  this.appendChild(ripple);
  ripple.addEventListener('animationend', () => ripple.remove());
});

// ===== START CLEANING =====
document.getElementById('start-btn').addEventListener('click', async () => {
  cleanedCount = 0;
  statCleaned.textContent = '0 cleaned';
  statCleanedNum.textContent = '0';
  errorLog.classList.remove('visible');
  errorLog.style.display = 'none';
  errorLog.textContent = '';

  setStatus('active', 'Connecting to WhatsApp...');
  btn.classList.add('loading');
  btn.disabled = true;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab || !tab.url || !tab.url.includes('web.whatsapp.com')) {
    setStatus('error', 'Open WhatsApp Web first');
    btn.classList.remove('loading');
    btn.disabled = false;
    statStatus.textContent = '⚠ No WA';
    return;
  }

  try {
    chrome.tabs.sendMessage(tab.id, {
      action: 'start_cleaning',
      filterUnreplied: filterEnabled
    }, (response) => {
      if (chrome.runtime.lastError) {
        setStatus('error', 'Please refresh WhatsApp Web');
        btn.classList.remove('loading');
        btn.disabled = false;
        statStatus.textContent = '✖ Error';
      } else {
        setStatus('active', 'Cleaning in progress...');
        statStatus.textContent = '● Active';
      }
    });
  } catch (e) {
    setStatus('error', e.message);
    btn.classList.remove('loading');
    btn.disabled = false;
  }
});

// ===== CRM ACTION BUTTONS =====
document.querySelectorAll('.action-btn').forEach((actionBtn) => {
  actionBtn.addEventListener('click', async () => {
    const action = actionBtn.dataset.action;
    const label = actionBtn.textContent.trim();

    setStatus('active', `${label}...`);
    statStatus.textContent = `⟳ ${label}`;

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab || !tab.url || !tab.url.includes('web.whatsapp.com')) {
      setStatus('error', 'Open WhatsApp Web first');
      statStatus.textContent = '⚠ No WA';
      return;
    }

    try {
      chrome.tabs.sendMessage(tab.id, {
        action: 'crm_action',
        crmAction: action,
        label: label
      }, (response) => {
        if (chrome.runtime.lastError) {
          setStatus('error', 'Error: refresh WhatsApp');
          statStatus.textContent = '✖ Error';
        } else {
          setStatus('done', `${label} — done!`);
          statStatus.textContent = '✓ ' + label;
        }
      });
    } catch (e) {
      setStatus('error', e.message);
      statStatus.textContent = '✖ Error';
    }
  });
});

// ===== LISTEN FOR MESSAGES FROM CONTENT =====
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'show_error') {
    showError(request.message);
    return;
  }

  if (request.action === 'progress') {
    updateProgress(request.current, request.total);
    return;
  }

  if (request.action === 'chat_cleaned') {
    cleanedCount++;
    statCleaned.textContent = cleanedCount + ' cleaned';
    statCleanedNum.textContent = cleanedCount;
    return;
  }

  if (request.action === 'complete') {
    setStatus('done', 'All archived chats cleared!');
    btn.classList.remove('loading');
    btn.disabled = false;
    progressFill.style.width = '100%';
    statStatus.textContent = '✓ Done';
    if (progressCount) {
      const [, total] = progressCount.textContent.split('/').map(s => s.trim());
      progressCount.textContent = `${cleanedCount} / ${total || cleanedCount}`;
    }
    return;
  }

  if (request.action === 'finish') {
    setStatus('done', 'Process finished');
    btn.classList.remove('loading');
    btn.disabled = false;
    statStatus.textContent = '✓ Done';
  }
});

// ===== HELPERS =====
function setStatus(type, msg) {
  if (statusDot) statusDot.className = 'status-dot ' + type;
  if (statusEl) statusEl.textContent = msg;
}

function updateProgress(current, total) {
  progressSection.classList.add('visible');
  const pct = total > 0 ? Math.min((current / total) * 100, 100) : 0;
  progressFill.style.width = pct + '%';
  progressCount.textContent = `${current} / ${total}`;
}

function showError(msg) {
  errorLog.textContent += (errorLog.textContent ? '\n' : '') + '• ' + msg;
  errorLog.style.display = 'block';
  errorLog.classList.add('visible');
}

// ===== KEYBOARD SHORTCUT: ENTER TO START =====
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !btn.disabled) {
    btn.click();
  }
});
