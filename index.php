<?php
// API modu: AJAX istekleri için JSON döndür
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    header('Content-Type: application/json');
    $body = json_decode(file_get_contents('php://input'), true);
    $action = $body['action'] ?? '';
    $file = __DIR__ . '/tasks.json';
    $tasks = file_exists($file) ? json_decode(file_get_contents($file), true) : [];

    if ($action === 'load') {
        if (empty($tasks)) {
            $tasks = seedTasks();
            file_put_contents($file, json_encode($tasks));
        }
        echo json_encode($tasks);
    } elseif ($action === 'save') {
        $tasks = $body['tasks'] ?? [];
        file_put_contents($file, json_encode($tasks));
        echo json_encode(['ok' => true]);
    }
    exit;
}

function seedTasks() {
    $now = (new DateTime())->format('d.m.Y H:i');
    $today = (new DateTime())->format('Y-m-d');
    $tomorrow = (new DateTime('+1 day'))->format('Y-m-d');
    $plus3 = (new DateTime('+3 days'))->format('Y-m-d');
    return [
        ['id' => uniqid(), 'text' => 'Örnek Görev-1', 'done' => false, 'priority' => 'high', 'category' => 'iş', 'created' => $now, 'dueDate' => $today],
        ['id' => uniqid(), 'text' => 'Örnek Görev-2', 'done' => false, 'priority' => 'normal', 'category' => 'alışveriş', 'created' => $now, 'dueDate' => $tomorrow],
        ['id' => uniqid(), 'text' => 'Örnek Görev-3', 'done' => true, 'priority' => 'low', 'category' => 'sağlık', 'created' => $now, 'completedAt' => $now],
        ['id' => uniqid(), 'text' => 'Örnek Görev-4', 'done' => false, 'priority' => 'normal', 'category' => 'öğrenme', 'created' => $now, 'dueDate' => $plus3],
    ];
}
?>
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Yapılacaklar</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="style.css" />
</head>
<body>

<div id="app" class="relative min-h-screen overflow-hidden">
  <!-- Animated background blobs -->
  <div class="blobs" aria-hidden="true">
    <div class="blob blob-1"></div>
    <div class="blob blob-2"></div>
    <div class="blob blob-3"></div>
  </div>

  <div class="container">

    <!-- Header -->
    <header class="glass header-card">
      <div class="header-left">
        <div class="header-logo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg>
        </div>
        <div>
          <h1 class="header-title">Yapılacaklar</h1>
          <p class="header-sub" id="dateLabel"></p>
        </div>
      </div>
      <button id="themeBtn" class="theme-btn" aria-label="Tema değiştir">
        <svg id="sunIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:none"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>
        <svg id="moonIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
      </button>
    </header>

    <!-- Stats -->
    <section class="stats-grid">
      <div class="glass stat-card">
        <div class="stat-bar stat-bar-violet"></div>
        <div class="stat-row">
          <span class="stat-label">Toplam</span>
          <span class="stat-icon stat-icon-violet">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>
          </span>
        </div>
        <div class="stat-value" id="stat-total">0</div>
      </div>
      <div class="glass stat-card">
        <div class="stat-bar stat-bar-blue"></div>
        <div class="stat-row">
          <span class="stat-label">Aktif</span>
          <span class="stat-icon stat-icon-blue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
          </span>
        </div>
        <div class="stat-value" id="stat-active">0</div>
      </div>
      <div class="glass stat-card">
        <div class="stat-bar stat-bar-amber"></div>
        <div class="stat-row">
          <span class="stat-label">Bugün</span>
          <span class="stat-icon stat-icon-amber">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
          </span>
        </div>
        <div class="stat-value" id="stat-today">0</div>
      </div>
      <div class="glass stat-card">
        <div class="stat-bar stat-bar-rose"></div>
        <div class="stat-row">
          <span class="stat-label">Gecikmiş</span>
          <span class="stat-icon stat-icon-rose">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01"/></svg>
          </span>
        </div>
        <div class="stat-value" id="stat-overdue">0</div>
      </div>
    </section>

    <!-- Progress -->
    <section class="glass progress-card">
      <div class="progress-header">
        <span class="progress-title">İlerleme</span>
        <span class="progress-sub" id="progressText">0 / 0 tamamlandı</span>
      </div>
      <div class="progress-track">
        <div class="progress-bar" id="progressBar" style="width:0%"></div>
      </div>
      <div class="progress-pct" id="progressPct">%0</div>
    </section>

    <!-- Add Task -->
    <section class="glass add-card">
      <div class="add-row">
        <div class="input-wrap">
          <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
          <input id="taskInput" type="text" placeholder="Yeni görev ekle..." maxlength="200" autocomplete="off" />
        </div>
        <button id="addBtn" class="btn-add">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
          Ekle
        </button>
      </div>

      <button id="toggleAdvanced" class="toggle-advanced">
        <svg id="chevronIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>
        Öncelik, kategori ve tarih ekle
      </button>

      <div id="advancedPanel" class="advanced-panel" style="display:none">
        <div class="advanced-grid">
          <div class="field-group">
            <label class="field-label">Öncelik</label>
            <div class="priority-btns">
              <button class="priority-btn" data-priority="low">
                <span class="dot dot-emerald"></span>Düşük
              </button>
              <button class="priority-btn active" data-priority="normal">
                <span class="dot dot-amber"></span>Normal
              </button>
              <button class="priority-btn" data-priority="high">
                <span class="dot dot-rose"></span>Yüksek
              </button>
            </div>
          </div>
          <div class="field-group">
            <label class="field-label">Kategori</label>
            <select id="categorySelect">
              <option value="kişisel">👤 Kişisel</option>
              <option value="iş">💼 İş</option>
              <option value="alışveriş">🛒 Alışveriş</option>
              <option value="sağlık">💪 Sağlık</option>
              <option value="öğrenme">📚 Öğrenme</option>
              <option value="diğer">✨ Diğer</option>
            </select>
          </div>
          <div class="field-group">
            <label class="field-label">Bitiş tarihi</label>
            <input type="date" id="dueDateInput" />
          </div>
        </div>
      </div>
    </section>

    <!-- Toolbar -->
    <section class="toolbar">
      <div class="search-wrap">
        <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
        <input id="searchInput" type="text" placeholder="Görevlerde ara... (Ctrl + /)" />
      </div>
      <div class="filter-bar">
        <div class="filter-btns" id="filterBtns">
          <button class="filter-btn active" data-filter="all">Tümü <span class="badge" id="badge-all">0</span></button>
          <button class="filter-btn" data-filter="active">Aktif <span class="badge" id="badge-active">0</span></button>
          <button class="filter-btn" data-filter="done">Tamamlanan <span class="badge" id="badge-done">0</span></button>
          <button class="filter-btn" data-filter="today">Bugün <span class="badge" id="badge-today">0</span></button>
          <button class="filter-btn" data-filter="overdue">Gecikmiş <span class="badge" id="badge-overdue">0</span></button>
        </div>
        <button id="clearDoneBtn" class="btn-clear-done" disabled>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14zM10 11v6M14 11v6"/></svg>
          Tamamlananları sil
        </button>
      </div>
    </section>

    <!-- Task List -->
    <section id="taskList" class="task-list"></section>

    <footer class="footer">Verileriniz sunucuda güvenle saklanır.</footer>
  </div>
</div>

<!-- Toast -->
<div id="toast" class="toast" aria-live="polite"></div>

<script src="app.js"></script>
</body>
</html>
