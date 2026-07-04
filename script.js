// ============ CONFIG ============
// Paste your deployed Cloudflare Worker URL here (see worker.js for setup steps).
// Everyone who visits your site will use YOUR Dify agent through this — no one
// needs to enter their own key.
const WORKER_URL = 'https://plant-doctor-proxy.plantdoctor.workers.dev';

// ---- word-by-word blur-in headline ----
  const headlineEl = document.getElementById('headline');
  const headlineText = "Every leaf already knows what's wrong";
  headlineText.split(' ').forEach((w, i) => {
    const span = document.createElement('span');
    span.className = 'bword';
    span.style.transitionDelay = (i * 90) + 'ms';
    span.textContent = w;
    headlineEl.appendChild(span);
    headlineEl.appendChild(document.createTextNode(' '));
  });

  // trigger headline + rise elements on load
  window.addEventListener('load', () => {
    requestAnimationFrame(() => {
      document.querySelectorAll('.bword').forEach(w => w.classList.add('in'));
    });
    const seq = [
      ['r-badge', 200],
      ['r-sub', 500],
      ['r-cta', 750],
      ['r-stats', 950],
      ['r-trust', 1100],
    ];
    seq.forEach(([id, delay]) => {
      setTimeout(() => document.getElementById(id).classList.add('in'), delay);
    });
  });

  // ---- intersection-triggered rise for capabilities ----
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const delayMap = {'c-eyebrow':0,'c-heading':100,'c1':250,'c2':350,'c3':450};
        const d = delayMap[e.target.id] || 0;
        setTimeout(() => e.target.classList.add('in'), d);
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.15 });
  ['c-eyebrow','c-heading','c1','c2','c3'].forEach(id => io.observe(document.getElementById(id)));

  // ---- scan tags sync with scan-line sweep (4.2s loop) ----
  function cycleTags(){
    const tags = ['tag1','tag2','tag3'];
    const timings = [900, 1900, 2900]; // ms into the loop when each tag should show
    tags.forEach((id, i) => {
      setTimeout(() => document.getElementById(id).classList.add('show'), timings[i]);
    });
    setTimeout(() => tags.forEach(id => document.getElementById(id).classList.remove('show')), 3600);
  }
  cycleTags();
  setInterval(cycleTags, 4200);

  // ============ TOAST ============
  let toastTimer;
  function showToast(msg){
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
  }

  // ============ SMOOTH NAV ============
  document.getElementById('nav-capabilities').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('capabilities').scrollIntoView({ behavior: 'smooth' });
  });
  document.getElementById('nav-library').addEventListener('click', (e) => {
    e.preventDefault();
    openInfo('library');
  });
  document.getElementById('nav-journal').addEventListener('click', (e) => {
    e.preventDefault();
    openInfo('journal');
  });
  document.getElementById('footer-privacy').addEventListener('click', (e) => { e.preventDefault(); openInfo('privacy'); });
  document.getElementById('footer-terms').addEventListener('click', (e) => { e.preventDefault(); openInfo('terms'); });
  document.getElementById('footer-contact').addEventListener('click', (e) => { e.preventDefault(); openInfo('contact'); });
  document.getElementById('hero-watch-btn').addEventListener('click', () => {
    document.getElementById('capabilities').scrollIntoView({ behavior: 'smooth' });
  });

  // ============ MODAL STATE ============
  const state = {
    cameraStream: null,
  };

  const overlay = document.getElementById('modal-overlay');
  const scanPanel = document.getElementById('scan-panel');
  const sourceSelect = document.getElementById('source-select');
  const cameraPanel = document.getElementById('camera-panel');
  const dropzoneWrap = document.getElementById('dropzone-wrap');
  const urlPanel = document.getElementById('url-panel');

  function showSourceSelect(){
    stopCamera();
    sourceSelect.style.display = 'grid';
    cameraPanel.style.display = 'none';
    dropzoneWrap.style.display = 'none';
    urlPanel.style.display = 'none';
    document.getElementById('scan-sub').style.display = 'block';
  }

  function openModal(){
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    scanPanel.style.display = 'block';
    resetScanPanel();
  }
  function closeModal(){
    overlay.classList.remove('open');
    document.body.style.overflow = '';
    stopCamera();
  }

  ['nav-scan', 'nav-cta', 'hero-scan-btn'].forEach(id => {
    document.getElementById(id).addEventListener('click', (e) => {
      e.preventDefault();
      openModal();
    });
  });
  document.getElementById('modal-close').addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

  // ============ SOURCE SELECTION ============
  const previewWrap = document.getElementById('preview-wrap');
  const previewImg = document.getElementById('preview-img');

  function selectCamera(){
    sourceSelect.style.display = 'none';
    document.getElementById('scan-sub').style.display = 'none';
    cameraPanel.style.display = 'block';
    startCamera();
  }
  function selectUpload(){
    sourceSelect.style.display = 'none';
    document.getElementById('scan-sub').style.display = 'none';
    dropzoneWrap.style.display = 'block';
  }
  function selectUrl(){
    sourceSelect.style.display = 'none';
    document.getElementById('scan-sub').style.display = 'none';
    urlPanel.style.display = 'block';
  }

  document.getElementById('src-camera').addEventListener('click', selectCamera);
  document.getElementById('src-upload').addEventListener('click', selectUpload);
  document.getElementById('src-url').addEventListener('click', selectUrl);
  [['src-camera', selectCamera], ['src-upload', selectUpload], ['src-url', selectUrl]].forEach(([id, fn]) => {
    document.getElementById(id).addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') fn(); });
  });

  document.getElementById('camera-back').addEventListener('click', showSourceSelect);
  document.getElementById('upload-back').addEventListener('click', showSourceSelect);
  document.getElementById('url-back').addEventListener('click', showSourceSelect);

  // ============ CAMERA ============
  const cameraVideo = document.getElementById('camera-video');

  async function startCamera(){
    const errBox = document.getElementById('camera-err');
    errBox.style.display = 'none';
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      state.cameraStream = stream;
      cameraVideo.srcObject = stream;
    } catch (err) {
      errBox.textContent = "Couldn't access your camera. Check browser permissions, or use Upload / Image Link instead.";
      errBox.style.display = 'block';
    }
  }
  function stopCamera(){
    if (state.cameraStream) {
      state.cameraStream.getTracks().forEach(t => t.stop());
      state.cameraStream = null;
    }
    if (cameraVideo) cameraVideo.srcObject = null;
  }

  document.getElementById('camera-capture-btn').addEventListener('click', () => {
    if (!state.cameraStream) return;
    const canvas = document.createElement('canvas');
    canvas.width = cameraVideo.videoWidth;
    canvas.height = cameraVideo.videoHeight;
    canvas.getContext('2d').drawImage(cameraVideo, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) { showToast('Could not capture photo, try again'); return; }
      stopCamera();
      handleImage(blob, 'camera-capture.png');
    }, 'image/png');
  });

  // ============ UPLOAD (drag & drop) ============
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('file-input');

  dropzone.addEventListener('click', () => fileInput.click());
  dropzone.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') fileInput.click(); });

  ['dragenter','dragover'].forEach(evt => dropzone.addEventListener(evt, (e) => {
    e.preventDefault(); dropzone.classList.add('drag');
  }));
  ['dragleave','drop'].forEach(evt => dropzone.addEventListener(evt, (e) => {
    e.preventDefault(); dropzone.classList.remove('drag');
  }));
  dropzone.addEventListener('drop', (e) => {
    const f = e.dataTransfer.files[0];
    if (f) handleImage(f, f.name);
  });
  fileInput.addEventListener('change', (e) => {
    const f = e.target.files[0];
    if (f) handleImage(f, f.name);
  });

  // ============ IMAGE URL ============
  document.getElementById('url-fetch-btn').addEventListener('click', async () => {
    const url = document.getElementById('image-url-input').value.trim();
    const errBox = document.getElementById('url-err');
    errBox.style.display = 'none';
    if (!url) { errBox.textContent = 'Paste an image URL first.'; errBox.style.display = 'block'; return; }
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Could not fetch that URL (' + res.status + ')');
      const blob = await res.blob();
      if (!blob.type.startsWith('image/')) throw new Error('That link did not return an image.');
      handleImage(blob, 'linked-image.jpg');
    } catch (err) {
      errBox.textContent = err.message + ' — some sites block direct image fetching (CORS). Try downloading it and using Upload instead.';
      errBox.style.display = 'block';
    }
  });

  // ============ SHARED: handle any image source ============
  function handleImage(blobOrFile, filename){
    if (!blobOrFile.type || !blobOrFile.type.startsWith('image/')) { showToast('Please provide an image file'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      previewImg.src = ev.target.result;
      previewWrap.style.display = 'block';
      cameraPanel.style.display = 'none';
      dropzoneWrap.style.display = 'none';
      urlPanel.style.display = 'none';
      runDiagnosis(blobOrFile, filename);
    };
    reader.readAsDataURL(blobOrFile);
  }

  document.getElementById('preview-clear').addEventListener('click', resetScanPanel);
  document.getElementById('scan-again-btn').addEventListener('click', resetScanPanel);

  function resetScanPanel(){
    stopCamera();
    fileInput.value = '';
    previewWrap.style.display = 'none';
    document.getElementById('scan-status').style.display = 'none';
    document.getElementById('scan-err').style.display = 'none';
    document.getElementById('url-err').style.display = 'none';
    document.getElementById('camera-err').style.display = 'none';
    document.getElementById('image-url-input').value = '';
    document.getElementById('result-panel').style.display = 'none';
    showSourceSelect();
  }

  // ============ DIFY API CALLS (via your shared Worker proxy) ============
  async function uploadToDify(file, filename){
    const form = new FormData();
    form.append('file', file, filename || 'plant-photo.jpg');
    form.append('user', 'plant-doctor-web-user');
    const res = await fetch(WORKER_URL + '/upload', {
      method: 'POST',
      body: form
    });
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      throw new Error('Upload failed (' + res.status + '). ' + t.slice(0,150));
    }
    const data = await res.json();
    return data.id;
  }

  async function askDify(uploadId){
    const res = await fetch(WORKER_URL + '/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inputs: {},
        query: 'Analyze this plant image and return the diagnosis JSON exactly as instructed in your system prompt.',
        response_mode: 'blocking',
        conversation_id: '',
        user: 'plant-doctor-web-user',
        files: [{ type: 'image', transfer_method: 'local_file', upload_file_id: uploadId }]
      })
    });
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      throw new Error('Diagnosis request failed (' + res.status + '). ' + t.slice(0,150));
    }
    const data = await res.json();
    return data.answer;
  }


  function parseAnswer(raw){
    let cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
    // try direct parse first
    try { return JSON.parse(cleaned); } catch (e) { /* fall through */ }
    // fallback: pull out the first {...} block from a chattier response
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]); } catch (e) { /* fall through */ }
    }
    return null; // signals "couldn't find valid JSON"
  }

  async function runDiagnosis(file, filename){
    const statusEl = document.getElementById('scan-status');
    const statusText = document.getElementById('scan-status-text');
    const errBox = document.getElementById('scan-err');
    const resultPanel = document.getElementById('result-panel');

    errBox.style.display = 'none';
    resultPanel.style.display = 'none';
    statusEl.style.display = 'flex';
    statusText.textContent = 'Uploading photo to your agent…';

    try {
      const uploadId = await uploadToDify(file, filename);
      statusText.textContent = 'Agent is examining the leaf…';
      const answer = await askDify(uploadId);
      const data = parseAnswer(answer);

      if (data === null) {
        // Agent replied but not in strict JSON — show the raw answer so it's still useful
        renderRawResult(answer);
        statusEl.style.display = 'none';
        return;
      }

      if (data.error) {
        throw new Error("The agent couldn't find a plant in this photo. Try a clearer, closer shot.");
      }

      renderResult(data);
      statusEl.style.display = 'none';
    } catch (err) {
      statusEl.style.display = 'none';
      errBox.textContent = err.message || 'Something went wrong talking to your Dify agent.';
      errBox.style.display = 'block';
    }
  }

  function miniMarkdown(text){
    let escaped = escapeHtml(text);

    // bold: **text**
    escaped = escaped.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // bullet lines: "* item" or "- item" at start of a line -> clean bullet
    escaped = escaped.replace(/^[ \t]*[\*\-][ \t]+(.+)$/gm, '&nbsp;&nbsp;• $1');

    // any remaining stray single asterisks (italics or leftovers) -> drop the markers, keep text
    escaped = escaped.replace(/\*(.+?)\*/g, '<em>$1</em>');
    escaped = escaped.replace(/\*/g, '');

    // markdown headings: "### text" -> bold line
    escaped = escaped.replace(/^#{1,6}[ \t]+(.+)$/gm, '<strong>$1</strong>');

    escaped = escaped.replace(/\n/g, '<br>');
    return escaped;
  }

  function renderRawResult(text){
    const resultPanel = document.getElementById('result-panel');
    document.getElementById('res-plant').textContent = 'Diagnosis';
    document.getElementById('res-sci').textContent = '';
    const chip = document.getElementById('res-confidence');
    chip.textContent = '';
    chip.style.display = 'none';
    document.getElementById('result-grid').innerHTML =
      `<div class="result-row" style="display:block;">
         <div class="v" style="text-align:left; line-height:1.65;">${miniMarkdown(text)}</div>
       </div>`;
    document.getElementById('res-note').textContent = '';
    resultPanel.style.display = 'block';
  }


  function renderResult(d){
    document.getElementById('res-plant').textContent = d.plant_name || 'Unknown plant';
    document.getElementById('res-sci').textContent = d.scientific_name || '';
    const conf = (typeof d.confidence === 'number') ? d.confidence + '% confident' : '—';
    document.getElementById('res-confidence').textContent = conf;

    const severityClass = {
      'None': 'severity-mild', 'Mild': 'severity-mild',
      'Moderate': 'severity-moderate', 'Severe': 'severity-severe'
    }[d.severity] || 'severity-mild';

    const rows = [
      ['Condition', d.disease_name || '—'],
      ['Severity', d.severity || '—', severityClass],
      ['Symptoms', d.symptoms || '—'],
      ['Likely cause', d.cause || '—'],
      ['Organic treatment', d.treatment_organic || '—'],
      ['Chemical treatment', d.treatment_chemical || '—'],
      ['Recovery time', d.recovery_time || '—'],
      ['Watering', d.watering || '—'],
      ['Sunlight', d.sunlight || '—'],
      ['Humidity', d.humidity || '—'],
      ['Risk level', d.risk_level || '—'],
    ];

    const grid = document.getElementById('result-grid');
    grid.innerHTML = rows.map(([k, v, cls]) =>
      `<div class="result-row"><span class="k">${k}</span><span class="v ${cls||''}">${v}</span></div>`
    ).join('');

    document.getElementById('res-note').textContent = 'Diagnosis generated by your connected Dify agent. Always confirm serious infections with a local nursery or extension office.';
    document.getElementById('result-panel').style.display = 'block';
  }

  // ============ INFO MODAL (Library / Journal / Privacy / Terms / Contact) ============
  const infoOverlay = document.getElementById('info-overlay');
  const infoTitle = document.getElementById('info-title');
  const infoBody = document.getElementById('info-body');

  function closeInfo(){
    infoOverlay.classList.remove('open');
    document.body.style.overflow = '';
  }
  document.getElementById('info-close').addEventListener('click', closeInfo);
  infoOverlay.addEventListener('click', (e) => { if (e.target === infoOverlay) closeInfo(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeInfo(); });

  function openInfo(type){
    infoOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    if (type === 'library') renderLibrary();
    else if (type === 'journal') renderJournal();
    else if (type === 'privacy') renderPrivacy();
    else if (type === 'terms') renderTerms();
    else if (type === 'contact') renderContact();
  }

  // ---- Contact ----
  function renderContact(){
    infoTitle.textContent = 'Contact';
    infoBody.innerHTML = `
      <div class="modal-sub">Reach out directly — questions, feedback, or bug reports welcome.</div>
      <div class="contact-links">
        <a class="contact-link glass" href="mailto:jainilpatel301208@gmail.com">
          <span class="ic">&#9993;</span>
          <span class="meta">Email<small>jainilpatel301208@gmail.com</small></span>
        </a>
        <a class="contact-link glass" href="https://instagram.com/jainil.30" target="_blank" rel="noopener noreferrer">
          <span class="ic">&#128247;</span>
          <span class="meta">Instagram<small>@jainil.30</small></span>
        </a>
        <a class="contact-link glass" href="https://www.linkedin.com/in/jainilpatel301208?utm_source=share_via&utm_content=profile&utm_medium=member_android" target="_blank" rel="noopener noreferrer">
          <span class="ic">&#128188;</span>
          <span class="meta">LinkedIn<small>jainilpatel301208</small></span>
        </a>
      </div>`;
  }

  // ---- Privacy ----
  function renderPrivacy(){
    infoTitle.textContent = 'Privacy';
    infoBody.innerHTML = `<div class="info-body">
      <h4>What stays in your browser</h4>
      <p>Your Dify API key and base URL are kept only in this page's memory for the current session. They are never sent to Claude, never written to a server, and disappear the moment you reload or close the tab.</p>
      <h4>What happens to your photos</h4>
      <p>When you scan a leaf, the image is sent directly from your browser to the Dify agent endpoint you connected — nothing passes through or is stored by this site itself.</p>
      <h4>Journal entries</h4>
      <p>Growth journal notes you add are held in memory for this session only. They are not saved anywhere and will be gone on refresh.</p>
      <h4>Third parties</h4>
      <p>Fonts are loaded from Google Fonts. Your connected Dify instance and its model provider handle diagnosis processing under their own respective privacy terms.</p>
    </div>`;
  }

  // ---- Terms ----
  function renderTerms(){
    infoTitle.textContent = 'Terms';
    infoBody.innerHTML = `<div class="info-body">
      <h4>Informational tool only</h4>
      <p>Plant Doctor AI gives AI-generated suggestions for plant identification and disease diagnosis. It is not a substitute for advice from a professional horticulturist, agronomist, or your local agricultural extension office.</p>
      <h4>No warranty</h4>
      <p>Diagnoses depend on the model connected to your Dify agent and can be wrong or incomplete. Use your own judgment before applying any treatment, especially chemical ones.</p>
      <h4>Your own connection</h4>
      <p>You are responsible for your own Dify API key, usage, and any costs incurred with your model provider. This site does not manage billing or usage limits on your behalf.</p>
      <h4>Fair use</h4>
      <p>Please don't use this tool to upload images unrelated to plants, or in any way that violates your Dify or model provider's own usage policies.</p>
    </div>`;
  }

  // ---- Library: live search across GBIF's global species database ----
  // GBIF (Global Biodiversity Information Facility) is a free, public, no-key-required
  // database covering hundreds of thousands of documented plant species — the closest
  // thing to "every plant on Earth" that's practically searchable in real time.
  const POPULAR_PLANTS = [
    { name:'Monstera Deliciosa', sci:'Monstera deliciosa', desc:'Loves bright, indirect light and lets its soil dry between waterings.', chips:['Indoor','Easy'] },
    { name:'Golden Pothos', sci:'Epipremnum aureum', desc:'Nearly impossible to kill — tolerates low light and irregular watering.', chips:['Indoor','Very Easy'] },
    { name:'Snake Plant', sci:'Dracaena trifasciata', desc:'Thrives on neglect, needs watering only every 2-3 weeks.', chips:['Indoor','Drought tolerant'] },
    { name:'Fiddle Leaf Fig', sci:'Ficus lyrata', desc:'Wants consistent bright light and hates being moved around.', chips:['Indoor','Hard'] },
    { name:'Aloe Vera', sci:'Aloe barbadensis', desc:'A succulent that prefers full sun and minimal watering.', chips:['Indoor/Outdoor','Easy'] },
    { name:'Peace Lily', sci:'Spathiphyllum wallisii', desc:'Droops dramatically when thirsty, recovers fast once watered.', chips:['Indoor','Moderate'] },
    { name:'Spider Plant', sci:'Chlorophytum comosum', desc:'A fast grower that sends out baby plantlets on long runners.', chips:['Indoor','Pet-friendly'] },
    { name:'ZZ Plant', sci:'Zamioculcas zamiifolia', desc:'Stores water in its rhizomes, so it forgives forgetful waterers.', chips:['Indoor','Very Easy'] },
  ];

  const GBIF_PLANT_KINGDOM_KEY = 6; // Plantae

  function renderLibrary(){
    infoTitle.textContent = 'Plant Library';
    infoBody.innerHTML = `
      <div class="modal-sub">Search live across GBIF's global species database — hundreds of thousands of documented plants, not just houseplants. Showing popular picks until you search.</div>
      <input type="text" class="text-input lib-search glass" id="lib-search-input" placeholder="Search any plant, e.g. 'oak', 'basil', 'Rosa'…">
      <div class="lib-list" id="lib-list"></div>
    `;
    const listEl = document.getElementById('lib-list');
    const searchEl = document.getElementById('lib-search-input');
    let debounceTimer = null;
    let requestSeq = 0;

    function paintPopular(){
      listEl.innerHTML = POPULAR_PLANTS.map(p => `
        <div class="lib-card glass">
          <div class="lib-top"><span class="lib-name font-heading">${p.name}</span></div>
          <div class="lib-sci">${p.sci}</div>
          <div class="lib-desc">${p.desc}</div>
          <div class="lib-meta">${p.chips.map(c => `<span class="lib-chip glass">${c}</span>`).join('')}</div>
        </div>
      `).join('');
    }

    function paintLoading(){
      listEl.innerHTML = `<div class="lib-empty">Searching global species database…</div>`;
    }

    function paintError(msg){
      listEl.innerHTML = `<div class="lib-empty">${msg}</div>`;
    }

    async function paintSearch(query){
      const seq = ++requestSeq;
      paintLoading();
      try {
        const url = 'https://api.gbif.org/v1/species/search?q=' + encodeURIComponent(query) +
          '&kingdomKey=' + GBIF_PLANT_KINGDOM_KEY + '&rank=SPECIES&status=ACCEPTED&limit=30';
        const res = await fetch(url);
        if (seq !== requestSeq) return; // a newer search superseded this one
        if (!res.ok) throw new Error('Search failed (' + res.status + ')');
        const data = await res.json();
        const results = (data.results || []).filter(r => r.canonicalName);

        if (!results.length){
          paintError(`No plant species found for "${escapeHtml(query)}". Try a different name.`);
          return;
        }

        listEl.innerHTML = results.map(r => `
          <div class="lib-card glass">
            <div class="lib-top"><span class="lib-name font-heading">${escapeHtml(r.vernacularName || r.canonicalName)}</span></div>
            <div class="lib-sci">${escapeHtml(r.canonicalName)}${r.authorship ? ' ' + escapeHtml(r.authorship) : ''}</div>
            <div class="lib-desc">${escapeHtml([r.family, r.order].filter(Boolean).join(' · ')) || 'Family unclassified'}</div>
            <div class="lib-meta">
              ${r.rank ? `<span class="lib-chip glass">${escapeHtml(r.rank)}</span>` : ''}
              ${r.family ? `<span class="lib-chip glass">${escapeHtml(r.family)}</span>` : ''}
            </div>
          </div>
        `).join('');
      } catch (err) {
        if (seq !== requestSeq) return;
        paintError("Couldn't reach the species database right now. Check your connection and try again.");
      }
    }

    paintPopular();

    searchEl.addEventListener('input', (e) => {
      const q = e.target.value.trim();
      clearTimeout(debounceTimer);
      if (q.length < 2) { requestSeq++; paintPopular(); return; }
      debounceTimer = setTimeout(() => paintSearch(q), 400);
    });
  }

  // ---- Journal (in-memory, session only) ----
  const journalEntries = [];

  function renderJournal(){
    infoTitle.textContent = 'Growth Journal';
    infoBody.innerHTML = `
      <div class="journal-note-banner">Entries live only in this browser tab for now — they'll reset on reload.</div>
      <div class="journal-form">
        <input type="text" class="text-input glass" id="je-plant" placeholder="Plant name (e.g. Monstera)">
        <textarea class="text-input glass" id="je-note" placeholder="What changed today? New leaf, watered, height, anything…"></textarea>
        <button class="scan-again glass-strong" id="je-add-btn">Add Entry</button>
      </div>
      <div id="je-list"></div>
    `;
    paintJournal();
    document.getElementById('je-add-btn').addEventListener('click', () => {
      const plant = document.getElementById('je-plant').value.trim();
      const note = document.getElementById('je-note').value.trim();
      if (!plant || !note) { showToast('Add a plant name and a note first'); return; }
      journalEntries.unshift({ plant, note, date: new Date() });
      document.getElementById('je-plant').value = '';
      document.getElementById('je-note').value = '';
      paintJournal();
    });
  }

  function escapeHtml(str){
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function paintJournal(){
    const listEl = document.getElementById('je-list');
    if (!listEl) return;
    if (!journalEntries.length){
      listEl.innerHTML = `<div class="journal-empty">No entries yet — log your first observation above.</div>`;
      return;
    }
    listEl.innerHTML = journalEntries.map(en => `
      <div class="journal-entry glass">
        <div class="je-top">
          <span>${escapeHtml(en.plant)}</span>
          <span>${en.date.toLocaleDateString()} · ${en.date.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
        </div>
        <div class="je-note">${escapeHtml(en.note)}</div>
      </div>
    `).join('');
  }