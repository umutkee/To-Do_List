/* ===== State ===== */
let tasks = [];
let filter = 'all';
let search = '';
let dark = localStorage.getItem('theme') === 'dark';
let selectedPriority = 'normal';
let toastTimer = null;
let pendingUndo = null;
let dragId = null;

const PRIORITY_META = {
  high:   { label: 'Yüksek', dotClass: 'dot dot-rose',    chipLight: 'chip-high-light' },
  normal: { label: 'Normal', dotClass: 'dot dot-amber',   chipLight: 'chip-normal-light' },
  low:    { label: 'Düşük',  dotClass: 'dot dot-emerald', chipLight: 'chip-low-light' },
};

const CATEGORY_META = {
  'kişisel':   { label: 'Kişisel',    emoji: '👤', cls: 'chip-cat-kişisel' },
  'iş':        { label: 'İş',          emoji: '💼', cls: 'chip-cat-iş' },
  'alışveriş': { label: 'Alışveriş',  emoji: '🛒', cls: 'chip-cat-alışveriş' },
  'sağlık':    { label: 'Sağlık',     emoji: '💪', cls: 'chip-cat-sağlık' },
  'öğrenme':   { label: 'Öğrenme',    emoji: '📚', cls: 'chip-cat-öğrenme' },
  'diğer':     { label: 'Diğer',      emoji: '✨', cls: 'chip-cat-diğer' },
};

const EMPTY_MESSAGES = {
  all:     { emoji: '✨', title: 'Henüz görev yok',         sub: 'Yukarıdan ilk görevini ekleyerek başla!' },
  active:  { emoji: '🎉', title: 'Tüm görevler tamam!',     sub: 'Harika iş çıkardın, biraz mola hak ettin.' },
  done:    { emoji: '📋', title: 'Henüz tamamlanan yok',    sub: 'Bir görev bitirdiğinde burada görünecek.' },
  today:   { emoji: '🗓️', title: 'Bugün için görev yok',   sub: 'Bugünün ajandan boş — keyfini çıkar!' },
  overdue: { emoji: '👌', title: 'Gecikmiş görev yok',      sub: 'Her şey planında, harika gidiyorsun!' },
};

/* ===== Helpers ===== */
function stamp() {
  return new Date().toLocaleString('tr-TR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function todayISO() { return new Date().toISOString().slice(0, 10); }

function isToday(iso) {
  if (!iso) return false;
  return iso === todayISO();
}

function isOverdue(iso, done) {
  if (!iso || done) return false;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return new Date(iso) < today;
}

function dueLabel(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.round((d - today) / 86400000);
  if (diff === 0) return 'Bugün';
  if (diff === 1) return 'Yarın';
  if (diff === -1) return 'Dün';
  if (diff < 0) return `${Math.abs(diff)} gün gecikti`;
  if (diff <= 7) return `${diff} gün kaldı`;
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
}

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

/* ===== API ===== */
async function api(action, data = {}) {
  const res = await fetch(window.location.pathname, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...data }),
  });
  return res.json();
}

async function saveTasks() {
  await api('save', { tasks });
}

/* ===== Stats ===== */
function computeStats() {
  const total = tasks.length;
  const done = tasks.filter(t => t.done).length;
  const active = total - done;
  const todayCount = tasks.filter(t => isToday(t.dueDate) && !t.done).length;
  const overdueCount = tasks.filter(t => isOverdue(t.dueDate, t.done)).length;
  const progress = total ? Math.round((done / total) * 100) : 0;
  return { total, done, active, todayCount, overdueCount, progress };
}

function updateStats() {
  const s = computeStats();
  document.getElementById('stat-total').textContent = s.total;
  document.getElementById('stat-active').textContent = s.active;
  document.getElementById('stat-today').textContent = s.todayCount;
  document.getElementById('stat-overdue').textContent = s.overdueCount;
  document.getElementById('progressBar').style.width = s.progress + '%';
  document.getElementById('progressText').textContent = `${s.done} / ${s.total} tamamlandı`;
  document.getElementById('progressPct').textContent = `%${s.progress}`;

  document.getElementById('badge-all').textContent = s.total;
  document.getElementById('badge-active').textContent = s.active;
  document.getElementById('badge-done').textContent = s.done;
  document.getElementById('badge-today').textContent = s.todayCount;
  document.getElementById('badge-overdue').textContent = s.overdueCount;

  const clearBtn = document.getElementById('clearDoneBtn');
  clearBtn.disabled = s.done === 0;
}

/* ===== Filtering ===== */
function visibleTasks() {
  let list = [...tasks];
  if (filter === 'active') list = list.filter(t => !t.done);
  else if (filter === 'done') list = list.filter(t => t.done);
  else if (filter === 'today') list = list.filter(t => isToday(t.dueDate));
  else if (filter === 'overdue') list = list.filter(t => isOverdue(t.dueDate, t.done));
  const q = search.trim().toLowerCase();
  if (q) list = list.filter(t => t.text.toLowerCase().includes(q));
  return list;
}

/* ===== Render ===== */
function renderTasks() {
  updateStats();
  const list = document.getElementById('taskList');
  list.innerHTML = '';
  const visible = visibleTasks();

  if (!visible.length) {
    const m = tasks.length ? EMPTY_MESSAGES[filter] : EMPTY_MESSAGES.all;
    list.innerHTML = `
      <div class="glass empty-state">
        <div class="empty-emoji">${m.emoji}</div>
        <h3 class="empty-title">${m.title}</h3>
        <p class="empty-sub">${m.sub}</p>
      </div>`;
    return;
  }

  visible.forEach(task => {
    const el = buildTaskEl(task);
    list.appendChild(el);
  });
}

function buildTaskEl(task) {
  const overdue = isOverdue(task.dueDate, task.done);
  const today = isToday(task.dueDate);
  const meta = PRIORITY_META[task.priority];
  const cat = CATEGORY_META[task.category];

  const row = document.createElement('div');
  row.className = 'glass task-row' + (task.done ? ' done' : '');
  row.draggable = true;
  row.dataset.id = task.id;

  // Priority bar
  const bar = document.createElement('div');
  bar.className = `priority-bar priority-bar-${task.priority}`;
  row.appendChild(bar);

  // Checkbox
  const cb = document.createElement('button');
  cb.className = 'task-checkbox' + (task.done ? ' checked' : '');
  cb.setAttribute('aria-label', 'Tamamla');
  cb.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg>`;
  cb.addEventListener('click', () => toggleTask(task.id));
  row.appendChild(cb);

  // Content
  const content = document.createElement('div');
  content.className = 'task-content';

  const textEl = document.createElement('div');
  textEl.className = 'task-text' + (task.done ? ' done-text' : '');
  textEl.textContent = task.text;
  textEl.title = 'Düzenlemek için çift tıkla';
  textEl.addEventListener('dblclick', () => startEdit(row, task));
  content.appendChild(textEl);

  // Meta chips
  const metaRow = document.createElement('div');
  metaRow.className = 'task-meta';

  // Priority chip
  const prioWrap = document.createElement('div');
  prioWrap.style.position = 'relative';
  const prioChip = document.createElement('button');
  prioChip.className = `chip chip-priority ${meta.chipLight}`;
  prioChip.innerHTML = `<span class="${meta.dotClass}"></span>${meta.label}`;
  prioChip.setAttribute('aria-label', 'Öncelik değiştir');

  // Priority dropdown
  const menu = document.createElement('div');
  menu.className = 'priority-menu glass';
  ['high', 'normal', 'low'].forEach(p => {
    const pm = PRIORITY_META[p];
    const btn = document.createElement('button');
    btn.className = 'priority-menu-item';
    btn.innerHTML = `<span class="${pm.dotClass}"></span>${pm.label}`;
    btn.addEventListener('click', e => {
      e.stopPropagation();
      changePriority(task.id, p);
      menu.classList.remove('open');
    });
    menu.appendChild(btn);
  });

  prioChip.addEventListener('click', e => {
    e.stopPropagation();
    const isOpen = menu.classList.contains('open');
    document.querySelectorAll('.priority-menu.open').forEach(m => m.classList.remove('open'));
    if (!isOpen) menu.classList.add('open');
  });
  prioWrap.appendChild(prioChip);
  prioWrap.appendChild(menu);
  metaRow.appendChild(prioWrap);

  // Category chip
  const catChip = document.createElement('span');
  catChip.className = `chip ${cat.cls}`;
  catChip.textContent = `${cat.emoji} ${cat.label}`;
  metaRow.appendChild(catChip);

  // Due date chip
  if (task.dueDate) {
    const label = dueLabel(task.dueDate);
    const dateChip = document.createElement('span');
    dateChip.className = 'chip ' + (overdue ? 'chip-overdue' : today ? 'chip-today' : 'chip-normal-date');
    dateChip.innerHTML = `<svg class="chip-cal-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>${label}`;
    metaRow.appendChild(dateChip);
  }

  // Created
  const created = document.createElement('span');
  created.className = 'task-created';
  created.textContent = task.created;
  metaRow.appendChild(created);

  content.appendChild(metaRow);
  row.appendChild(content);

  // Actions
  const actions = document.createElement('div');
  actions.className = 'task-actions';

  const editBtn = document.createElement('button');
  editBtn.className = 'btn-edit';
  editBtn.title = 'Düzenle';
  editBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>`;
  editBtn.addEventListener('click', () => startEdit(row, task));
  actions.appendChild(editBtn);

  const delBtn = document.createElement('button');
  delBtn.className = 'btn-delete';
  delBtn.title = 'Sil';
  delBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14zM10 11v6M14 11v6"/></svg>`;
  delBtn.addEventListener('click', () => removeTask(task.id));
  actions.appendChild(delBtn);

  row.appendChild(actions);

  // Drag & drop
  row.addEventListener('dragstart', e => {
    e.dataTransfer.effectAllowed = 'move';
    dragId = task.id;
    row.classList.add('dragging');
  });
  row.addEventListener('dragend', () => {
    dragId = null;
    row.classList.remove('dragging');
  });
  row.addEventListener('dragover', e => { e.preventDefault(); row.classList.add('drop-target'); });
  row.addEventListener('dragleave', () => row.classList.remove('drop-target'));
  row.addEventListener('drop', e => {
    e.preventDefault();
    row.classList.remove('drop-target');
    if (dragId && dragId !== task.id) {
      const fromIdx = tasks.findIndex(t => t.id === dragId);
      const toIdx = tasks.findIndex(t => t.id === task.id);
      if (fromIdx >= 0 && toIdx >= 0) {
        const [moved] = tasks.splice(fromIdx, 1);
        tasks.splice(toIdx, 0, moved);
        saveTasks();
        renderTasks();
      }
    }
  });

  return row;
}

/* ===== Actions ===== */
function addTask() {
  const input = document.getElementById('taskInput');
  const trimmed = input.value.trim();
  if (!trimmed) return;

  const dueDate = document.getElementById('dueDateInput').value;
  const category = document.getElementById('categorySelect').value;

  tasks.unshift({
    id: uuid(),
    text: trimmed,
    done: false,
    priority: selectedPriority,
    category,
    created: stamp(),
    dueDate: dueDate || undefined,
  });

  input.value = '';
  document.getElementById('dueDateInput').value = '';
  input.focus();
  saveTasks();
  renderTasks();
}

function toggleTask(id) {
  tasks = tasks.map(t => {
    if (t.id !== id) return t;
    const done = !t.done;
    return { ...t, done, completedAt: done ? stamp() : undefined };
  });
  saveTasks();
  renderTasks();
}

function removeTask(id) {
  const idx = tasks.findIndex(t => t.id === id);
  if (idx < 0) return;
  const removed = tasks[idx];
  tasks.splice(idx, 1);
  saveTasks();
  renderTasks();
  showToast('Görev silindi', () => {
    tasks.splice(idx, 0, removed);
    saveTasks();
    renderTasks();
  });
}

function changePriority(id, priority) {
  tasks = tasks.map(t => t.id === id ? { ...t, priority } : t);
  saveTasks();
  renderTasks();
}

function clearDone() {
  const removed = tasks.filter(t => t.done);
  if (!removed.length) return;
  tasks = tasks.filter(t => !t.done);
  saveTasks();
  renderTasks();
  showToast(`${removed.length} tamamlanan görev silindi`, () => {
    tasks = [...tasks, ...removed];
    saveTasks();
    renderTasks();
  });
}

/* ===== Edit ===== */
function startEdit(row, task) {
  const textEl = row.querySelector('.task-text');
  if (!textEl) return;

  const input = document.createElement('input');
  input.type = 'text';
  input.value = task.text;
  input.className = 'task-edit-input';
  textEl.replaceWith(input);
  input.focus();
  input.select();

  row.draggable = false;

  const save = () => {
    const txt = input.value.trim();
    if (txt && txt !== task.text) {
      task.text = txt;
      tasks = tasks.map(t => t.id === task.id ? { ...t, text: txt } : t);
      saveTasks();
    }
    renderTasks();
  };

  input.addEventListener('blur', save);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') save();
    if (e.key === 'Escape') renderTasks();
  });
}

/* ===== Toast ===== */
function showToast(msg, undoFn) {
  if (toastTimer) clearTimeout(toastTimer);
  pendingUndo = undoFn || null;

  const toast = document.getElementById('toast');
  toast.innerHTML = `
    <svg class="toast-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/></svg>
    <span>${msg}</span>
    ${undoFn ? '<button class="toast-undo" id="undoBtn">Geri al</button>' : ''}
  `;
  toast.className = 'toast show';

  if (undoFn) {
    document.getElementById('undoBtn').addEventListener('click', () => {
      undoFn();
      toast.className = 'toast';
    });
  }

  toastTimer = setTimeout(() => {
    toast.className = 'toast';
    pendingUndo = null;
  }, 4000);
}

/* ===== Theme ===== */
function applyTheme() {
  document.documentElement.classList.toggle('dark', dark);
  localStorage.setItem('theme', dark ? 'dark' : 'light');
  document.getElementById('sunIcon').style.display = dark ? 'block' : 'none';
  document.getElementById('moonIcon').style.display = dark ? 'none' : 'block';
}

/* ===== Date label ===== */
function setDateLabel() {
  const label = new Date().toLocaleDateString('tr-TR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
  document.getElementById('dateLabel').textContent = `Günün akışını yönet · ${label}`;
}

/* ===== Bootstrap ===== */
async function init() {
  applyTheme();
  setDateLabel();

  // Load tasks from server
  tasks = await api('load');
  renderTasks();

  /* Theme button */
  document.getElementById('themeBtn').addEventListener('click', () => {
    dark = !dark;
    applyTheme();
  });

  /* Add task */
  document.getElementById('addBtn').addEventListener('click', addTask);
  document.getElementById('taskInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') addTask();
  });

  /* Advanced toggle */
  const toggleBtn = document.getElementById('toggleAdvanced');
  const panel = document.getElementById('advancedPanel');
  toggleBtn.addEventListener('click', () => {
    const open = panel.style.display !== 'none';
    panel.style.display = open ? 'none' : 'block';
    toggleBtn.textContent = open ? 'Öncelik, kategori ve tarih ekle' : 'Detayları gizle';
    toggleBtn.classList.toggle('open', !open);
    // Re-add SVG icon
    const svg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>`;
    toggleBtn.insertAdjacentHTML('afterbegin', svg);
  });

  /* Priority buttons */
  document.querySelectorAll('.priority-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.priority-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedPriority = btn.dataset.priority;
    });
  });

  /* Filter buttons */
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filter = btn.dataset.filter;
      renderTasks();
    });
  });

  /* Search */
  document.getElementById('searchInput').addEventListener('input', e => {
    search = e.target.value;
    renderTasks();
  });

  /* Clear done */
  document.getElementById('clearDoneBtn').addEventListener('click', clearDone);

  /* Close priority menus on outside click */
  document.addEventListener('click', () => {
    document.querySelectorAll('.priority-menu.open').forEach(m => m.classList.remove('open'));
  });

  /* Keyboard shortcut Ctrl+/ */
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === '/') {
      e.preventDefault();
      document.getElementById('taskInput').focus();
    }
  });
}

document.addEventListener('DOMContentLoaded', init);
