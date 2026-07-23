(function() {
  const crmCategories = [
    {
      name: 'Assign', icon: '👤',
      actions: [
        { id: 'assign-to-me', label: '📌 Assign to Me' },
        { id: 'assign-to-team', label: '👥 Assign to Team Member' },
        { id: 'save-contact-list', label: '💾 Save Contact List' },
        { id: 'save-smart-list', label: '🔖 Save as Smart List' },
        { id: 'add-notes', label: '📝 Add Notes' }
      ]
    },
    {
      name: 'Action', icon: '🎯',
      actions: [
        { id: 'ai-qualify', label: '🎯 AI Qualify Lead' },
        { id: 'followup-plan', label: '📊 Create Follow-up Plan' },
        { id: 'followup-tomorrow', label: '📆 Follow Up Tomorrow' },
        { id: 'followup-3days', label: '📆 Follow Up in 3 Days' },
        { id: 'schedule-reminder', label: '⏰ Schedule Reminder' }
      ]
    },
    {
      name: 'Opportunities', icon: '💼',
      actions: [
        { id: 'mark-proposal', label: '📄 Mark as Proposal' },
        { id: 'mark-negotiation', label: '🤝 Mark as Negotiation' },
        { id: 'mark-meeting', label: '📅 Mark as Meeting Scheduled' },
        { id: 'mark-won', label: '🏆 Mark as Won' },
        { id: 'mark-lost', label: '❌ Mark as Lost' }
      ]
    },
    {
      name: 'Campaigns', icon: '📢',
      actions: [
        { id: 'send-wa-template', label: '💬 Send WhatsApp Template' },
        { id: 'book-meeting', label: '📅 Book Meeting' },
        { id: 'ai-call-now', label: '🤖 AI Call Now' },
        { id: 'schedule-ai-call', label: '📞 Schedule AI Call' },
        { id: 'ai-call-30min', label: '⏱️ AI Call in 30 Minutes' }
      ]
    },
  ];

  const labelMap = {
    'assign-to-me': '📌Me','assign-to-team':'👥Team','today-queue':'📋Queue',
    'save-contact-list':'💾List','save-smart-list':'🔖Smart',
    'book-meeting':'📅Meet','followup-plan':'📊F/Plan','schedule-reminder':'⏰Rem',
    'followup-tomorrow':'📆Tmr','followup-3days':'📆3d',
    'mark-proposal':'📄Prop','mark-negotiation':'🤝Neg',
    'mark-meeting':'📅MeetSch','mark-won':'🏆Won','mark-lost':'❌Lost',
    'add-notes':'📝Notes',
    'ai-call-now':'🤖AICall','schedule-ai-call':'📞AISch','ai-call-30min':'⏱️AI30m','ai-qualify':'🎯Qual',
    'send-wa-template':'💬WATpl'
  };

  let _popupEl = null;
  let _activeCatBtn = null;

  function handleCrmClick(btn) {
    const action = btn.dataset.crm;
    const displayLabel = labelMap[action] || action;
    console.log('CRM Label Clicked:', action, displayLabel);
    if (typeof toggleCRMLabel === 'function') toggleCRMLabel(action, displayLabel);
  }

  function closePopup() {
    if (_popupEl) _popupEl.style.display = 'none';
    if (_activeCatBtn) { _activeCatBtn.classList.remove('active'); _activeCatBtn = null; }
  }

  function openPopup(catIndex, anchorBtn) {
    const cat = crmCategories[catIndex];
    if (!cat) return;

    closePopup();

    if (!_popupEl) {
      _popupEl = document.createElement('div');
      _popupEl.className = 'crm-inline-popup';
      document.body.appendChild(_popupEl);
      _popupEl.addEventListener('click', function(e) {
        const btn = e.target.closest('.crm-btn');
        if (btn) { handleCrmClick(btn); closePopup(); }
      });
    }

    _popupEl.innerHTML = '';

    const grid = document.createElement('div');
    grid.className = 'crm-popup-grid';
    for (const a of cat.actions) {
      const btn = document.createElement('button');
      btn.className = 'crm-btn';
      btn.dataset.crm = a.id;
      btn.textContent = a.label;
      grid.appendChild(btn);
    }
    _popupEl.appendChild(grid);

    _activeCatBtn = anchorBtn;
    anchorBtn.classList.add('active');

    const rect = anchorBtn.getBoundingClientRect();
    _popupEl.style.left = Math.min(rect.left, window.innerWidth - 220) + 'px';
    _popupEl.style.top = (rect.bottom + 4) + 'px';
    _popupEl.style.display = 'block';
  }

  function initQuickCRM() {
    const container = document.getElementById('crm-inline');
    if (!container || container.children.length > 0) return;

    for (let i = 0; i < crmCategories.length; i++) {
      const cat = crmCategories[i];
      const btn = document.createElement('button');
      btn.className = 'crm-inline-cat';
      btn.dataset.catIndex = i;
      btn.textContent = cat.icon + ' ' + cat.name;
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        if (_activeCatBtn === this) { closePopup(); return; }
        openPopup(i, this);
      });
      container.appendChild(btn);

      if (cat.name === 'Action') {
        const qBtn = document.createElement('button');
        qBtn.className = 'crm-inline-btn';
        qBtn.dataset.crm = 'today-queue';
        qBtn.textContent = '📋 Queue';
        qBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          handleCrmClick(this);
        });
        container.appendChild(qBtn);
      }
    }

    document.addEventListener('click', function(e) {
      if (_popupEl && _popupEl.style.display === 'block' && !_popupEl.contains(e.target) && e.target.closest('.crm-inline-cat') !== _activeCatBtn) {
        closePopup();
      }
    }, true);
  }

  document.addEventListener('DOMContentLoaded', initQuickCRM);
  initQuickCRM();
})();
