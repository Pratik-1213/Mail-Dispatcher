// -------------------------------------------------------------
// Mail Dispatcher — Client Application Logic
// -------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  // --- DOM Elements ---
  const senderEmailInput = document.getElementById('senderEmail');
  const senderPasswordInput = document.getElementById('senderPassword');
  const togglePasswordBtn = document.getElementById('togglePasswordBtn');
  const eyeIcon = document.getElementById('eyeIcon');
  const eyeOffIcon = document.getElementById('eyeOffIcon');
  const verifyHeaderBtn = document.getElementById('verifyHeaderBtn');
  const smtpStatusPill = document.getElementById('smtpStatusPill');
  const smtpStatusText = document.getElementById('smtpStatusText');

  const recipientsTextarea = document.getElementById('recipientsTextarea');
  const csvFileInput = document.getElementById('csvFileInput');
  const validCountEl = document.getElementById('validCount');
  const invalidCountEl = document.getElementById('invalidCount');
  const dupCountEl = document.getElementById('dupCount');
  const invalidPill = document.getElementById('invalidPill');
  const dupPill = document.getElementById('dupPill');
  const clearRecipientsBtn = document.getElementById('clearRecipientsBtn');
  const delayInput = document.getElementById('delayInput');

  const emailSubjectInput = document.getElementById('emailSubject');
  const emailBodyTextarea = document.getElementById('emailBody');
  const btnModePlain = document.getElementById('btnModePlain');
  const btnModeHtml = document.getElementById('btnModeHtml');
  const tabEditor = document.getElementById('tabEditor');
  const tabPreview = document.getElementById('tabPreview');
  const editorContainer = document.getElementById('editorContainer');
  const previewContainer = document.getElementById('previewContainer');
  const previewHtmlContent = document.getElementById('previewHtmlContent');

  const dropzone = document.getElementById('dropzone');
  const fileAttachmentInput = document.getElementById('fileAttachmentInput');
  const browseFilesBtn = document.getElementById('browseFilesBtn');
  const attachedFilesList = document.getElementById('attachedFilesList');

  const mailForm = document.getElementById('mailForm');
  const sendTestBtn = document.getElementById('sendTestBtn');
  const sendBulkBtn = document.getElementById('sendBulkBtn');
  const sendBulkBtnText = document.getElementById('sendBulkBtnText');

  // Modal Elements
  const confirmModal = document.getElementById('confirmModal');
  const modalCloseBtn = document.getElementById('modalCloseBtn');
  const modalCancelBtn = document.getElementById('modalCancelBtn');
  const modalProceedBtn = document.getElementById('modalProceedBtn');
  const confirmRecipientCount = document.getElementById('confirmRecipientCount');
  const confirmFrom = document.getElementById('confirmFrom');
  const confirmSubject = document.getElementById('confirmSubject');
  const confirmAttachments = document.getElementById('confirmAttachments');
  const confirmDelay = document.getElementById('confirmDelay');

  // Console Elements
  const dispatchConsole = document.getElementById('dispatchConsole');
  const consoleSpinner = document.getElementById('consoleSpinner');
  const consoleTitle = document.getElementById('consoleTitle');
  const consoleSubtitle = document.getElementById('consoleSubtitle');
  const progressBarFill = document.getElementById('progressBarFill');
  const progressStatusText = document.getElementById('progressStatusText');
  const progressPercentText = document.getElementById('progressPercentText');
  const metricTotal = document.getElementById('metricTotal');
  const metricSent = document.getElementById('metricSent');
  const metricFailed = document.getElementById('metricFailed');
  const logTableBody = document.getElementById('logTableBody');
  const exportLogBtn = document.getElementById('exportLogBtn');
  const closeConsoleBtn = document.getElementById('closeConsoleBtn');
  const toastContainer = document.getElementById('toastContainer');

  // State
  let attachedFiles = [];
  let isHtmlMode = false;
  let parsedRecipients = [];
  let logHistory = [];

  const EMAIL_REGEX = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;

  // -----------------------------------------------------------
  // 1. Password Toggle
  // -----------------------------------------------------------
  togglePasswordBtn.addEventListener('click', () => {
    const isPass = senderPasswordInput.type === 'password';
    senderPasswordInput.type = isPass ? 'text' : 'password';
    eyeIcon.classList.toggle('hidden', isPass);
    eyeOffIcon.classList.toggle('hidden', !isPass);
  });

  // -----------------------------------------------------------
  // 2. SMTP Verification
  // -----------------------------------------------------------
  async function verifyConnection() {
    const email = senderEmailInput.value.trim();
    const password = senderPasswordInput.value;

    if (!email || !password) {
      showToast('Please enter both sender email and app password.', 'error');
      return;
    }

    setSmtpStatus('checking', 'Connecting...');
    verifyHeaderBtn.disabled = true;

    try {
      const response = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender_email: email, sender_password: password })
      });
      const data = await response.json();

      if (response.ok && data.success) {
        setSmtpStatus('verified', 'Connected');
        showToast(data.message, 'success');
      } else {
        setSmtpStatus('error', 'Auth Failed');
        showToast(data.error || 'Failed to authenticate with Gmail.', 'error');
      }
    } catch (err) {
      setSmtpStatus('error', 'Connection Error');
      showToast('Network error while testing connection.', 'error');
    } finally {
      verifyHeaderBtn.disabled = false;
    }
  }

  function setSmtpStatus(status, text) {
    smtpStatusPill.className = 'status-pill';
    if (status === 'verified') {
      smtpStatusPill.classList.add('status-verified');
    } else if (status === 'error') {
      smtpStatusPill.classList.add('status-error');
    } else {
      smtpStatusPill.classList.add('status-idle');
    }
    smtpStatusText.textContent = text;
  }

  verifyHeaderBtn.addEventListener('click', verifyConnection);

  // Auto-verify on first load if credentials present
  if (senderEmailInput.value && senderPasswordInput.value) {
    verifyConnection();
  }

  // -----------------------------------------------------------
  // 3. Recipients Parsing & Validation
  // -----------------------------------------------------------
  function parseRecipients() {
    const raw = recipientsTextarea.value;
    const tokens = raw.split(/[\r\n,;]+/).map(t => t.trim()).filter(t => t.length > 0);

    const validList = [];
    const seen = new Set();
    let invalidCount = 0;
    let duplicateCount = 0;

    tokens.forEach(token => {
      const email = token.toLowerCase();
      if (EMAIL_REGEX.test(email)) {
        if (seen.has(email)) {
          duplicateCount++;
        } else {
          seen.add(email);
          validList.push(email);
        }
      } else {
        invalidCount++;
      }
    });

    parsedRecipients = validList;
    validCountEl.textContent = validList.length;

    if (invalidCount > 0) {
      invalidPill.style.display = 'inline-flex';
      invalidCountEl.textContent = invalidCount;
    } else {
      invalidPill.style.display = 'none';
    }

    if (duplicateCount > 0) {
      dupPill.style.display = 'inline-flex';
      dupCountEl.textContent = duplicateCount;
    } else {
      dupPill.style.display = 'none';
    }

    sendBulkBtnText.textContent = validList.length > 0 
      ? `Send to ${validList.length} Recipient${validList.length > 1 ? 's' : ''}`
      : 'Send Bulk Emails';
  }

  recipientsTextarea.addEventListener('input', parseRecipients);

  clearRecipientsBtn.addEventListener('click', () => {
    recipientsTextarea.value = '';
    parseRecipients();
  });

  // Upload CSV / TXT
  csvFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target.result;
      const extractedEmails = content.match(/[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g) || [];

      if (extractedEmails.length === 0) {
        showToast('No valid email addresses found in the selected file.', 'error');
        return;
      }

      const existing = recipientsTextarea.value.trim();
      const newContent = extractedEmails.join('\n');
      recipientsTextarea.value = existing ? `${existing}\n${newContent}` : newContent;
      parseRecipients();
      showToast(`Imported ${extractedEmails.length} addresses from ${file.name}.`, 'success');
      csvFileInput.value = '';
    };
    reader.readAsText(file);
  });

  // -----------------------------------------------------------
  // 4. Document Attachments
  // -----------------------------------------------------------
  browseFilesBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    fileAttachmentInput.click();
  });

  dropzone.addEventListener('click', () => fileAttachmentInput.click());

  ['dragenter', 'dragover'].forEach(name => {
    dropzone.addEventListener(name, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach(name => {
    dropzone.addEventListener(name, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove('dragover');
    });
  });

  dropzone.addEventListener('drop', (e) => {
    const files = Array.from(e.dataTransfer.files);
    handleAddedFiles(files);
  });

  fileAttachmentInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    handleAddedFiles(files);
    fileAttachmentInput.value = '';
  });

  function handleAddedFiles(files) {
    let currentTotalSize = attachedFiles.reduce((acc, f) => acc + f.size, 0);
    const MAX_SIZE = 25 * 1024 * 1024; // 25 MB

    files.forEach(f => {
      if (currentTotalSize + f.size > MAX_SIZE) {
        showToast(`Cannot attach "${f.name}": Exceeds the 25 MB total limit.`, 'error');
        return;
      }
      // avoid exact name duplicate
      if (!attachedFiles.some(af => af.name === f.name && af.size === f.size)) {
        attachedFiles.push(f);
        currentTotalSize += f.size;
      }
    });

    renderAttachedFiles();
  }

  function renderAttachedFiles() {
    attachedFilesList.innerHTML = '';
    if (attachedFiles.length === 0) {
      attachedFilesList.style.display = 'none';
      return;
    }

    attachedFilesList.style.display = 'flex';
    attachedFiles.forEach((file, idx) => {
      const ext = file.name.split('.').pop() || 'file';
      const sizeStr = formatBytes(file.size);

      const item = document.createElement('div');
      item.className = 'attached-file-item';
      item.innerHTML = `
        <div class="file-info">
          <span class="file-ext-badge">${ext}</span>
          <span class="file-name" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</span>
          <span class="file-size">(${sizeStr})</span>
        </div>
        <button type="button" class="btn-remove-file" title="Remove attachment" data-index="${idx}">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      `;
      attachedFilesList.appendChild(item);
    });

    // Add remove listeners
    attachedFilesList.querySelectorAll('.btn-remove-file').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const i = parseInt(btn.getAttribute('data-index'), 10);
        attachedFiles.splice(i, 1);
        renderAttachedFiles();
      });
    });
  }

  function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  // -----------------------------------------------------------
  // 5. Plain / HTML Mode & Write/Preview Tabs
  // -----------------------------------------------------------
  btnModePlain.addEventListener('click', () => {
    isHtmlMode = false;
    btnModePlain.classList.add('active');
    btnModeHtml.classList.remove('active');
    emailBodyTextarea.placeholder = 'Dear recipient,\n\nWrite plain text message here...';
    updatePreview();
  });

  btnModeHtml.addEventListener('click', () => {
    isHtmlMode = true;
    btnModeHtml.classList.add('active');
    btnModePlain.classList.remove('active');
    emailBodyTextarea.placeholder = '<h2>Dear recipient,</h2>\n<p>Write your <strong>HTML</strong> email here...</p>';
    updatePreview();
  });

  tabEditor.addEventListener('click', () => {
    tabEditor.classList.add('active');
    tabPreview.classList.remove('active');
    editorContainer.style.display = 'block';
    previewContainer.style.display = 'none';
  });

  tabPreview.addEventListener('click', () => {
    tabPreview.classList.add('active');
    tabEditor.classList.remove('active');
    editorContainer.style.display = 'none';
    previewContainer.style.display = 'block';
    updatePreview();
  });

  function updatePreview() {
    const raw = emailBodyTextarea.value;
    if (isHtmlMode) {
      previewHtmlContent.innerHTML = raw || '<em style="color:#94a3b8">No content entered yet.</em>';
    } else {
      // Escape and preserve linebreaks
      const safe = escapeHtml(raw).replace(/\n/g, '<br>');
      previewHtmlContent.innerHTML = safe || '<em style="color:#94a3b8">No content entered yet.</em>';
    }
  }

  emailBodyTextarea.addEventListener('input', () => {
    if (tabPreview.classList.contains('active')) {
      updatePreview();
    }
  });

  // -----------------------------------------------------------
  // 6. Test Email to Myself
  // -----------------------------------------------------------
  sendTestBtn.addEventListener('click', async () => {
    const senderEmail = senderEmailInput.value.trim();
    const senderPassword = senderPasswordInput.value;
    const subject = emailSubjectInput.value.trim() || 'Test Email Preview';
    const content = emailBodyTextarea.value.trim();

    if (!senderEmail || !senderPassword) {
      showToast('Please enter your sender email and password first.', 'error');
      return;
    }

    if (!content) {
      showToast('Please enter email body content before sending a test.', 'error');
      return;
    }

    sendTestBtn.disabled = true;
    sendTestBtn.innerHTML = `
      <svg class="spinner-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
      </svg>
      Sending Test...
    `;

    const formData = new FormData();
    formData.append('sender_email', senderEmail);
    formData.append('sender_password', senderPassword);
    formData.append('subject', subject);
    formData.append('content', content);
    formData.append('is_html', isHtmlMode ? 'true' : 'false');
    attachedFiles.forEach(file => formData.append('files', file));

    try {
      const response = await fetch('/api/send-test', {
        method: 'POST',
        body: formData
      });
      const data = await response.json();

      if (response.ok && data.success) {
        showToast(data.message, 'success');
      } else {
        showToast(data.error || 'Failed to send test email.', 'error');
      }
    } catch (err) {
      showToast('Error communicating with server.', 'error');
    } finally {
      sendTestBtn.disabled = false;
      sendTestBtn.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21.2 8.4c.5.38.8.97.8 1.6v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V10a2 2 0 0 1 .8-1.6l8-6a2 2 0 0 1 2.4 0l8 6Z"/>
          <path d="m22 10-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 10"/>
        </svg>
        Send Test to Myself
      `;
    }
  });

  // -----------------------------------------------------------
  // 7. Bulk Send Confirmation & Execution
  // -----------------------------------------------------------
  mailForm.addEventListener('submit', (e) => {
    e.preventDefault();

    if (parsedRecipients.length === 0) {
      showToast('Please specify at least one valid recipient email address.', 'error');
      recipientsTextarea.focus();
      return;
    }

    const subject = emailSubjectInput.value.trim();
    if (!subject) {
      showToast('Please enter an email subject.', 'error');
      emailSubjectInput.focus();
      return;
    }

    const content = emailBodyTextarea.value.trim();
    if (!content) {
      showToast('Please enter email body content.', 'error');
      emailBodyTextarea.focus();
      return;
    }

    // Populate modal confirmation
    confirmRecipientCount.textContent = parsedRecipients.length;
    confirmFrom.textContent = senderEmailInput.value.trim();
    confirmSubject.textContent = subject;
    confirmAttachments.textContent = attachedFiles.length > 0
      ? `${attachedFiles.length} file(s) attached`
      : 'None';
    confirmDelay.textContent = `${delayInput.value}s between sends`;

    confirmModal.style.display = 'flex';
  });

  modalCloseBtn.addEventListener('click', () => confirmModal.style.display = 'none');
  modalCancelBtn.addEventListener('click', () => confirmModal.style.display = 'none');

  modalProceedBtn.addEventListener('click', () => {
    confirmModal.style.display = 'none';
    startBulkDispatch();
  });

  async function startBulkDispatch() {
    // Reset and display console
    dispatchConsole.style.display = 'block';
    dispatchConsole.scrollIntoView({ behavior: 'smooth' });
    consoleSpinner.style.display = 'flex';
    consoleTitle.textContent = 'Dispatching Emails';
    consoleSubtitle.textContent = 'Streaming live progress from Gmail SMTP server...';
    exportLogBtn.style.display = 'none';
    closeConsoleBtn.style.display = 'none';
    logTableBody.innerHTML = '';
    logHistory = [];

    const total = parsedRecipients.length;
    metricTotal.textContent = total;
    metricSent.textContent = '0';
    metricFailed.textContent = '0';
    progressBarFill.style.width = '0%';
    progressPercentText.textContent = '0%';
    progressStatusText.textContent = 'Connecting to Gmail SMTP server...';

    sendBulkBtn.disabled = true;
    sendTestBtn.disabled = true;

    const formData = new FormData();
    formData.append('sender_email', senderEmailInput.value.trim());
    formData.append('sender_password', senderPasswordInput.value);
    formData.append('subject', emailSubjectInput.value.trim());
    formData.append('content', emailBodyTextarea.value.trim());
    formData.append('is_html', isHtmlMode ? 'true' : 'false');
    formData.append('delay', delayInput.value);
    formData.append('recipients', JSON.stringify(parsedRecipients));
    attachedFiles.forEach(file => formData.append('files', file));

    try {
      const response = await fetch('/api/send-bulk', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || 'Server rejected dispatch request.');
      }

      // Read SSE stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop(); // keep remainder

        for (const block of lines) {
          const match = block.match(/^data:\s*(.+)$/m);
          if (match) {
            try {
              const event = JSON.parse(match[1]);
              handleStreamEvent(event);
            } catch (jsonErr) {
              console.error('Failed to parse SSE JSON:', match[1], jsonErr);
            }
          }
        }
      }
    } catch (err) {
      showToast(`Dispatch failed: ${err.message}`, 'error');
      progressStatusText.textContent = `Error: ${err.message}`;
    } finally {
      sendBulkBtn.disabled = false;
      sendTestBtn.disabled = false;
      consoleSpinner.style.display = 'none';
      exportLogBtn.style.display = 'inline-flex';
      closeConsoleBtn.style.display = 'inline-flex';
    }
  }

  function handleStreamEvent(event) {
    if (event.type === 'init') {
      progressStatusText.textContent = `Sending 1 of ${event.total}...`;
    } else if (event.type === 'progress') {
      const pct = Math.round((event.index / event.total) * 100);
      progressBarFill.style.width = `${pct}%`;
      progressPercentText.textContent = `${pct}%`;
      progressStatusText.textContent = `Processed ${event.index} of ${event.total}`;

      if (event.status === 'sent') {
        metricSent.textContent = parseInt(metricSent.textContent, 10) + 1;
      } else {
        metricFailed.textContent = parseInt(metricFailed.textContent, 10) + 1;
      }

      logHistory.push(event);

      // Append row to table
      const row = document.createElement('tr');
      const isOk = event.status === 'sent';
      const badgeClass = isOk ? 'badge-sent' : 'badge-failed';
      const statusLabel = isOk ? 'Delivered' : 'Failed';
      const detailMsg = isOk ? 'Sent via SMTP' : (event.error || 'Unknown error');

      row.innerHTML = `
        <td>${event.index}</td>
        <td><strong>${escapeHtml(event.recipient)}</strong></td>
        <td><span class="badge-status ${badgeClass}">${statusLabel}</span></td>
        <td>${event.time}</td>
        <td style="${isOk ? 'color:#64748b' : 'color:#dc2626'}">${escapeHtml(detailMsg)}</td>
      `;
      logTableBody.prepend(row);

    } else if (event.type === 'complete') {
      consoleTitle.textContent = 'Dispatch Complete';
      consoleSubtitle.textContent = `Finished delivering ${event.sent} of ${event.total} emails.`;
      progressStatusText.textContent = `Complete: ${event.sent} sent, ${event.failed} failed.`;
      progressBarFill.style.width = '100%';
      progressPercentText.textContent = '100%';
      showToast(`Bulk send finished! ${event.sent} sent, ${event.failed} failed.`, event.failed === 0 ? 'success' : 'info');
    } else if (event.type === 'fatal_error') {
      showToast(event.error, 'error');
      progressStatusText.textContent = event.error;
    }
  }

  closeConsoleBtn.addEventListener('click', () => {
    dispatchConsole.style.display = 'none';
  });

  // Export Log CSV
  exportLogBtn.addEventListener('click', () => {
    if (logHistory.length === 0) return;

    let csvContent = 'Index,Recipient,Status,Time,Details\n';
    logHistory.forEach(item => {
      const details = (item.error || 'Delivered').replace(/"/g, '""');
      csvContent += `${item.index},"${item.recipient}","${item.status}","${item.time}","${details}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mail_dispatch_log_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  });

  // -----------------------------------------------------------
  // 8. Utility Toast System & Escaper
  // -----------------------------------------------------------
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconSvg = '';
    if (type === 'success') {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`;
    } else if (type === 'error') {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
    } else {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
    }

    toast.innerHTML = `
      ${iconSvg}
      <div style="flex: 1;">${escapeHtml(message)}</div>
    `;

    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(8px)';
      toast.style.transition = 'all 0.2s ease-out';
      setTimeout(() => toast.remove(), 250);
    }, 4500);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
});
