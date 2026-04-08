const STORAGE_KEY = "personal-secretary-app-v1";

const defaultState = {
  currentView: "home",
  selectedMood: "集中",
  freeMemo: "",
  tasks: [
    {
      id: crypto.randomUUID(),
      title: "英語の勉強",
      tags: ["集中", "頭使う"],
      duration: 60,
      priority: 3,
      done: false,
      status: "未着手",
      createdAt: new Date().toISOString()
    },
    {
      id: crypto.randomUUID(),
      title: "散歩",
      tags: ["軽め", "リフレッシュ"],
      duration: 20,
      priority: 1,
      done: false,
      status: "未着手",
      createdAt: new Date().toISOString()
    }
  ],
  events: [
    {
      id: crypto.randomUUID(),
      title: "授業",
      start: `${todayISO()}T09:00`,
      end: `${todayISO()}T10:30`,
      note: ""
    },
    {
      id: crypto.randomUUID(),
      title: "ミーティング",
      start: `${todayISO()}T13:00`,
      end: `${todayISO()}T14:00`,
      note: ""
    }
  ],
  candidates: [
    {
      id: crypto.randomUUID(),
      title: "レポート下書き",
      tags: ["集中", "創作"],
      duration: 45,
      intensity: "中",
      category: "学習"
    },
    {
      id: crypto.randomUUID(),
      title: "軽いストレッチ",
      tags: ["軽め", "回復"],
      duration: 15,
      intensity: "低",
      category: "健康"
    }
  ],
  moods: ["集中", "軽め", "頭使う", "創作", "だるい"],
  logs: [
    {
      date: prevDateISO(),
      note: "少し疲れていたが、やる軸は見えた",
      nextTopic: "午前の集中の流れを整える",
      reward: "音楽を聴いた",
      score: "ふつう"
    }
  ],
  rewards: ["夜にアニメ1話", "お気に入りのお茶"],
  settings: {
    notificationsEnabled: false,
    morningEnabled: false,
    morningTime: "07:30",
    eventReminderEnabled: false,
    nightEnabled: false,
    nightTime: "21:30"
  }
};

let state = loadState();

const views = {
  home: document.getElementById("view-home"),
  schedule: document.getElementById("view-schedule"),
  task: document.getElementById("view-task"),
  candidates: document.getElementById("view-candidates"),
  log: document.getElementById("view-log"),
  settings: document.getElementById("view-settings")
};

const navItems = [
  ["home", "ホーム"],
  ["schedule", "予定"],
  ["task", "タスク"],
  ["candidates", "候補"],
  ["log", "記録"],
  ["settings", "設定"]
];

init();

function init() {
  renderNav();
  render();
  setupEventDelegation();
}

function render() {
  renderHeader();
  renderViews();
  saveState();
}

function renderHeader() {
  const labels = {
    home: "ホーム",
    schedule: "予定",
    task: "タスク",
    candidates: "候補",
    log: "記録",
    settings: "設定"
  };

  document.getElementById("app-header").innerHTML = `
    <div class="header-title">${labels[state.currentView]}</div>
    <div class="header-date">${formatDateJP(new Date())}</div>
  `;
}

function renderNav() {
  const nav = document.getElementById("bottom-nav");
  nav.innerHTML = navItems
    .map(
      ([key, label]) =>
        `<button class="nav-item ${state.currentView === key ? "active" : ""}" data-action="switch-view" data-view="${key}">${label}</button>`
    )
    .join("");
}

function renderViews() {
  Object.entries(views).forEach(([key, el]) => {
    el.hidden = key !== state.currentView;
  });

  renderHomeView();
  renderScheduleView();
  renderTaskView();
  renderCandidatesView();
  renderLogView();
  renderSettingsView();
  renderNav();
}

function renderHomeView() {
  const todayEvents = getTodayEvents();
  const freeSlots = computeFreeSlots(todayEvents);
  const recommended = buildRecommendations();
  const latestLog = getLatestLog();
  const todayTasks = getSortedTodayTasks().slice(0, 6);

  views.home.innerHTML = `
    <section class="card">
      <div class="card-title">${formatDateJP(new Date())}</div>
      <div>今日の進行表</div>
    </section>

    <section class="card">
      <div class="card-title">今日の議題</div>
      <div>${latestLog?.nextTopic || "今夜の記録で設定できます"}</div>
      <div class="subtle">昨日の自分より、少しだけ進めばOK。</div>
    </section>

    <section class="card">
      <div class="card-title">今の気分</div>
      <div class="chips">
        ${state.moods
          .map(
            (mood) =>
              `<button class="chip ${mood === state.selectedMood ? "active" : ""}" data-action="set-mood" data-mood="${mood}">${mood}</button>`
          )
          .join("")}
      </div>
      <div class="card-title" style="margin-top:12px;">おすすめ行動</div>
      <ul class="list">
        ${recommended
          .map(
            (item) => `<li class="list-item">${item.title} / ${item.duration}分 / ${formatTags(item.tags)}</li>`
          )
          .join("")}
      </ul>
      <div class="row" style="margin-top:10px;"><button class="button" data-action="shuffle-recommendation">別案を見る</button></div>
    </section>

    <section class="card">
      <div class="card-title">今日の予定</div>
      <ul class="list">
        ${todayEvents.length
          ? todayEvents
              .map(
                (event) => `<li class="list-item timeline-item">${formatTimeRange(event.start, event.end)} ${event.title}</li>`
              )
              .join("")
          : "<li class='list-item'>予定はありません</li>"}
      </ul>
      <div class="row" style="margin-top:10px;"><button class="button" data-action="switch-view" data-view="schedule">予定画面へ</button></div>
    </section>

    <section class="card">
      <div class="card-title">空き時間</div>
      <ul class="list">
        ${freeSlots
          .map(
            (slot, idx) => `<li class="list-item">${slot.label} / ${slot.minutes}分
                <div class="row" style="margin-top:8px;">
                  <button class="button small" data-action="suggest-for-slot" data-slot="${idx}">候補を見る</button>
                  <button class="button small" data-action="switch-view" data-view="task">タスクを置く</button>
                </div>
              </li>`
          )
          .join("")}
      </ul>
    </section>

    <section class="card">
      <div class="card-title">今日のタスク</div>
      <ul class="list">
        ${todayTasks
          .map(
            (task) => `<li class="list-item">
              <div class="row" style="justify-content:space-between;">
                <label><input type="checkbox" data-action="toggle-task" data-id="${task.id}" ${task.done ? "checked" : ""}/> ${task.title}</label>
                <span class="priority">優先度 ${task.priority}</span>
              </div>
              <div class="subtle">${formatTags(task.tags)} / ${task.duration || "-"}分</div>
            </li>`
          )
          .join("")}
      </ul>
      <div class="row" style="margin-top:10px;"><button class="button" data-action="switch-view" data-view="task">タスク画面へ</button></div>
    </section>

    <details class="card">
      <summary class="card-title" style="margin-bottom:0;">今週の予定</summary>
      <ul class="list" style="margin-top:10px;">${buildWeeklyItems()}</ul>
    </details>

    <section class="card">
      <div class="card-title">昨日の要約</div>
      <div>${latestLog?.note || "まだ記録がありません"}</div>
      <div class="subtle">${latestLog ? latestLog.date : ""} ${latestLog?.score ? ` / 達成度: ${latestLog.score}` : ""}</div>
    </section>

    <section class="card">
      <div class="card-title">今日のご褒美</div>
      <div>${pickTodayReward()}</div>
    </section>

    <section class="card">
      <div class="card-title">自由メモ</div>
      <textarea id="free-memo-input" placeholder="思いつきをメモ...">${escapeHtml(state.freeMemo || "")}</textarea>
      <div class="row" style="margin-top:8px;"><button class="button" data-action="save-free-memo">メモ保存</button></div>
    </section>
  `;
}

function renderScheduleView() {
  const events = getTodayEvents();
  const freeSlots = computeFreeSlots(events);
  views.schedule.innerHTML = `
    <section class="card">
      <div class="row" style="justify-content:space-between;">
        <div>
          <div class="card-title">日付切替</div>
          <div class="subtle">v1は今日表示固定（週表示は今後拡張）</div>
        </div>
        <button class="button button-primary" data-action="open-modal" data-modal="event">予定追加</button>
      </div>
    </section>

    <section class="card">
      <div class="card-title">タイムライン</div>
      <ul class="list">
        ${events
          .map(
            (event) => `<li class="list-item timeline-item">
              <div><strong>${event.title}</strong></div>
              <div class="subtle">${formatTimeRange(event.start, event.end)}</div>
            </li>`
          )
          .join("")}
      </ul>
    </section>

    <section class="card">
      <div class="card-title">空き時間一覧</div>
      <ul class="list">
        ${freeSlots
          .map(
            (slot, idx) => `<li class="list-item">${slot.label} / ${slot.minutes}分
              <div class="row" style="margin-top:8px;"><button class="button small" data-action="suggest-for-slot" data-slot="${idx}">候補提案</button></div>
            </li>`
          )
          .join("")}
      </ul>
    </section>
  `;
}

function renderTaskView() {
  const tasks = [...state.tasks].sort((a, b) => Number(b.priority || 0) - Number(a.priority || 0));
  views.task.innerHTML = `
    <section class="card">
      <div class="row" style="justify-content:space-between;">
        <div>
          <div class="card-title">タスク一覧</div>
          <div class="subtle">軽量入力 + タグ運用</div>
        </div>
        <button class="button button-primary" data-action="open-modal" data-modal="task">新規追加</button>
      </div>
    </section>

    <section class="card">
      <ul class="list">
        ${tasks
          .map(
            (task) => `<li class="list-item">
              <div class="row" style="justify-content:space-between;align-items:flex-start;">
                <div>
                  <div><strong>${task.title}</strong></div>
                  <div class="subtle">${formatTags(task.tags)} / ${task.duration || "-"}分 / ${task.status || "未着手"}</div>
                </div>
                <span class="priority">優先 ${task.priority || 0}</span>
              </div>
              <div class="row" style="margin-top:8px;">
                <button class="button small" data-action="toggle-task" data-id="${task.id}">${task.done ? "未完了に戻す" : "完了"}</button>
                <button class="button small button-danger" data-action="delete-task" data-id="${task.id}">削除</button>
              </div>
            </li>`
          )
          .join("")}
      </ul>
    </section>
  `;
}

function renderCandidatesView() {
  views.candidates.innerHTML = `
    <section class="card">
      <div class="row" style="justify-content:space-between;">
        <div>
          <div class="card-title">行動候補</div>
          <div class="subtle">提案エンジンの素材を管理</div>
        </div>
        <button class="button button-primary" data-action="open-modal" data-modal="candidate">候補追加</button>
      </div>
    </section>

    <section class="card">
      <ul class="list">
        ${state.candidates
          .map(
            (c) => `<li class="list-item">
                <div><strong>${c.title}</strong></div>
                <div class="subtle">${formatTags(c.tags)} / ${c.duration}分 / 強度:${c.intensity} / ${c.category || "-"}</div>
              </li>`
          )
          .join("")}
      </ul>
    </section>
  `;
}

function renderLogView() {
  views.log.innerHTML = `
    <section class="card">
      <div class="card-title">夜の記録</div>
      <div class="subtle">翌朝の議題を残します</div>
      <div style="margin-top:10px;display:grid;gap:8px;">
        <label>今日の一言<textarea id="log-note" placeholder="今日はどうだった？"></textarea></label>
        <label>明日の議題<input id="log-topic" type="text" placeholder="明日の軸" /></label>
        <label>今日のご褒美<input id="log-reward" type="text" placeholder="例: アニメ1話" /></label>
        <label>達成度
          <select id="log-score">
            <option>よくできた</option>
            <option selected>ふつう</option>
            <option>あまり進まなかった</option>
          </select>
        </label>
      </div>
      <div class="row" style="margin-top:10px;">
        <button class="button button-primary" data-action="save-log">保存</button>
        <button class="button" data-action="prepare-next-day">明日の提案を準備</button>
      </div>
    </section>
  `;
}

function renderSettingsView() {
  views.settings.innerHTML = `
    <section class="card">
      <div class="card-title">通知設定</div>
      <div class="subtle">Notification APIを使用</div>
      <div style="display:grid;gap:8px;margin-top:8px;">
        <label><input type="checkbox" data-action="toggle-setting" data-key="morningEnabled" ${state.settings.morningEnabled ? "checked" : ""}/> 朝通知</label>
        <label>朝通知時刻 <input type="time" data-action="time-setting" data-key="morningTime" value="${state.settings.morningTime}" /></label>
        <label><input type="checkbox" data-action="toggle-setting" data-key="eventReminderEnabled" ${state.settings.eventReminderEnabled ? "checked" : ""}/> 予定前通知</label>
        <label><input type="checkbox" data-action="toggle-setting" data-key="nightEnabled" ${state.settings.nightEnabled ? "checked" : ""}/> 夜通知</label>
        <label>夜通知時刻 <input type="time" data-action="time-setting" data-key="nightTime" value="${state.settings.nightTime}" /></label>
      </div>
      <div class="row" style="margin-top:10px;"><button class="button" data-action="request-notification">通知許可をリクエスト</button></div>
    </section>

    <section class="card">
      <div class="card-title">気分タグ管理</div>
      <div class="chips">${state.moods.map((mood) => `<span class="chip">${mood}</span>`).join("")}</div>
      <div class="row" style="margin-top:8px;">
        <input id="new-mood" type="text" placeholder="新しい気分タグ" />
        <button class="button" data-action="add-mood">追加</button>
      </div>
    </section>

    <section class="card">
      <div class="card-title">ご褒美候補</div>
      <ul class="list">${state.rewards.map((r) => `<li class='list-item'>${r}</li>`).join("")}</ul>
      <div class="row" style="margin-top:8px;">
        <input id="new-reward" type="text" placeholder="ご褒美を追加" />
        <button class="button" data-action="add-reward">追加</button>
      </div>
    </section>

    <section class="card">
      <div class="card-title">データ管理</div>
      <div class="row">
        <button class="button" data-action="export-data">JSONエクスポート</button>
        <button class="button button-danger" data-action="reset-data">初期化</button>
      </div>
      <div style="margin-top:8px;">
        <input type="file" id="import-file" accept="application/json" />
        <div class="row" style="margin-top:8px;"><button class="button" data-action="import-data">JSONインポート</button></div>
      </div>
    </section>
  `;
}

function setupEventDelegation() {
  document.body.addEventListener("click", (event) => {
    const target = event.target.closest("[data-action]");
    if (!target) return;

    const action = target.dataset.action;

    if (action === "switch-view") {
      state.currentView = target.dataset.view;
      render();
      return;
    }

    if (action === "set-mood") {
      state.selectedMood = target.dataset.mood;
      render();
      return;
    }

    if (action === "shuffle-recommendation") {
      state.candidates = [...state.candidates.slice(1), state.candidates[0]];
      render();
      return;
    }

    if (action === "toggle-task") {
      const task = state.tasks.find((t) => t.id === target.dataset.id);
      if (!task) return;
      task.done = !task.done;
      task.status = task.done ? "完了" : "未着手";
      render();
      return;
    }

    if (action === "delete-task") {
      state.tasks = state.tasks.filter((t) => t.id !== target.dataset.id);
      render();
      return;
    }

    if (action === "open-modal") {
      openModal(target.dataset.modal);
      return;
    }

    if (action === "save-log") {
      const note = document.getElementById("log-note")?.value.trim() || "";
      const nextTopic = document.getElementById("log-topic")?.value.trim() || "";
      const reward = document.getElementById("log-reward")?.value.trim() || "";
      const score = document.getElementById("log-score")?.value || "ふつう";
      if (!note && !nextTopic && !reward) return;
      state.logs.push({ date: todayISO(), note, nextTopic, reward, score });
      if (reward) state.rewards.unshift(reward);
      alert("記録を保存しました。");
      render();
      return;
    }

    if (action === "prepare-next-day") {
      state.currentView = "home";
      render();
      return;
    }

    if (action === "save-free-memo") {
      state.freeMemo = document.getElementById("free-memo-input")?.value || "";
      saveState();
      alert("メモを保存しました。");
      return;
    }

    if (action === "request-notification") {
      requestNotificationPermission();
      return;
    }

    if (action === "toggle-setting") {
      const key = target.dataset.key;
      state.settings[key] = target.checked;
      saveState();
      return;
    }

    if (action === "time-setting") {
      return;
    }

    if (action === "add-mood") {
      const input = document.getElementById("new-mood");
      const value = input?.value.trim();
      if (!value || state.moods.includes(value)) return;
      state.moods.push(value);
      input.value = "";
      render();
      return;
    }

    if (action === "add-reward") {
      const input = document.getElementById("new-reward");
      const value = input?.value.trim();
      if (!value) return;
      state.rewards.unshift(value);
      input.value = "";
      render();
      return;
    }

    if (action === "export-data") {
      exportData();
      return;
    }

    if (action === "import-data") {
      importData();
      return;
    }

    if (action === "reset-data") {
      if (!confirm("本当に初期化しますか？")) return;
      state = structuredClone(defaultState);
      render();
      return;
    }

    if (action === "suggest-for-slot") {
      const slotIndex = Number(target.dataset.slot);
      showSlotSuggestion(slotIndex);
      return;
    }

    if (action === "modal-save") {
      const modalType = target.dataset.modalType;
      if (modalType === "task") saveTaskFromModal();
      if (modalType === "event") saveEventFromModal();
      if (modalType === "candidate") saveCandidateFromModal();
      return;
    }

    if (action === "close-modal") {
      closeModal();
    }
  });

  document.body.addEventListener("change", (event) => {
    const target = event.target;
    if (target.matches("[data-action='time-setting']")) {
      const key = target.dataset.key;
      state.settings[key] = target.value;
      saveState();
    }
  });
}

function openModal(type) {
  const modal = document.getElementById("modal-root");
  let html = "";

  if (type === "task") {
    html = `
      <h3>タスク追加</h3>
      <div style="display:grid;gap:8px;">
        <input id="modal-task-title" placeholder="タスク名" />
        <input id="modal-task-tags" placeholder="タグ（カンマ区切り）" />
        <input id="modal-task-duration" type="number" placeholder="所要時間（分）" />
        <input id="modal-task-priority" type="number" min="1" max="5" placeholder="優先度（1-5）" />
      </div>
      <div class="row" style="margin-top:10px;">
        <button class="button button-primary" data-action="modal-save" data-modal-type="task">保存</button>
        <button class="button" data-action="close-modal">閉じる</button>
      </div>
    `;
  }

  if (type === "event") {
    html = `
      <h3>予定追加</h3>
      <div style="display:grid;gap:8px;">
        <input id="modal-event-title" placeholder="予定タイトル" />
        <input id="modal-event-date" type="date" value="${todayISO()}" />
        <input id="modal-event-start" type="time" value="09:00" />
        <input id="modal-event-end" type="time" value="10:00" />
      </div>
      <div class="row" style="margin-top:10px;">
        <button class="button button-primary" data-action="modal-save" data-modal-type="event">保存</button>
        <button class="button" data-action="close-modal">閉じる</button>
      </div>
    `;
  }

  if (type === "candidate") {
    html = `
      <h3>候補追加</h3>
      <div style="display:grid;gap:8px;">
        <input id="modal-candidate-title" placeholder="行動名" />
        <input id="modal-candidate-tags" placeholder="タグ（カンマ区切り）" />
        <input id="modal-candidate-duration" type="number" placeholder="所要時間（分）" />
        <select id="modal-candidate-intensity">
          <option>低</option><option selected>中</option><option>高</option>
        </select>
        <input id="modal-candidate-category" placeholder="カテゴリ" />
      </div>
      <div class="row" style="margin-top:10px;">
        <button class="button button-primary" data-action="modal-save" data-modal-type="candidate">保存</button>
        <button class="button" data-action="close-modal">閉じる</button>
      </div>
    `;
  }

  modal.innerHTML = html;
  modal.showModal();
}

function saveTaskFromModal() {
  const title = document.getElementById("modal-task-title")?.value.trim();
  if (!title) return;
  const tags = parseTags(document.getElementById("modal-task-tags")?.value || "");
  const duration = Number(document.getElementById("modal-task-duration")?.value || 0) || null;
  const priority = Number(document.getElementById("modal-task-priority")?.value || 1);

  state.tasks.unshift({
    id: crypto.randomUUID(),
    title,
    tags,
    duration,
    priority,
    done: false,
    status: "未着手",
    createdAt: new Date().toISOString()
  });

  closeModal();
  render();
}

function saveEventFromModal() {
  const title = document.getElementById("modal-event-title")?.value.trim();
  const date = document.getElementById("modal-event-date")?.value;
  const start = document.getElementById("modal-event-start")?.value;
  const end = document.getElementById("modal-event-end")?.value;
  if (!title || !date || !start || !end) return;

  state.events.push({
    id: crypto.randomUUID(),
    title,
    start: `${date}T${start}`,
    end: `${date}T${end}`,
    note: ""
  });

  closeModal();
  render();
}

function saveCandidateFromModal() {
  const title = document.getElementById("modal-candidate-title")?.value.trim();
  if (!title) return;

  state.candidates.unshift({
    id: crypto.randomUUID(),
    title,
    tags: parseTags(document.getElementById("modal-candidate-tags")?.value || ""),
    duration: Number(document.getElementById("modal-candidate-duration")?.value || 15),
    intensity: document.getElementById("modal-candidate-intensity")?.value || "中",
    category: document.getElementById("modal-candidate-category")?.value || ""
  });

  closeModal();
  render();
}

function closeModal() {
  const modal = document.getElementById("modal-root");
  modal.close();
}

function buildRecommendations() {
  const mood = state.selectedMood;
  const freeSlots = computeFreeSlots(getTodayEvents());
  const maxSlot = Math.max(...freeSlots.map((s) => s.minutes), 30);

  const pool = [
    ...state.tasks.map((task) => ({ ...task, source: "task" })),
    ...state.candidates.map((candidate) => ({ ...candidate, source: "candidate", priority: candidate.priority ?? 1 }))
  ];

  return pool
    .filter((item) => !item.done)
    .filter((item) => !item.duration || item.duration <= maxSlot)
    .sort((a, b) => {
      const moodScoreA = a.tags?.includes(mood) ? 2 : 0;
      const moodScoreB = b.tags?.includes(mood) ? 2 : 0;
      const priorityA = Number(a.priority || 0);
      const priorityB = Number(b.priority || 0);
      return moodScoreB + priorityB - (moodScoreA + priorityA);
    })
    .slice(0, 3);
}

function showSlotSuggestion(slotIndex) {
  const slots = computeFreeSlots(getTodayEvents());
  const slot = slots[slotIndex];
  if (!slot) return;
  const suggestions = buildRecommendations().filter((item) => !item.duration || item.duration <= slot.minutes);
  const text = suggestions.length
    ? suggestions.map((item) => `・${item.title} (${item.duration || "?"}分)`).join("\n")
    : "該当する候補がありません";
  alert(`${slot.label} (${slot.minutes}分) に入る候補\n${text}`);
}

function computeFreeSlots(events) {
  const startOfDay = 8 * 60;
  const endOfDay = 22 * 60;
  const sorted = [...events].sort((a, b) => new Date(a.start) - new Date(b.start));
  const slots = [];
  let cursor = startOfDay;

  for (const event of sorted) {
    const s = toMinutes(event.start);
    const e = toMinutes(event.end);
    if (s > cursor) {
      slots.push({ start: cursor, end: s, minutes: s - cursor, label: `${toHHMM(cursor)}-${toHHMM(s)}` });
    }
    cursor = Math.max(cursor, e);
  }

  if (cursor < endOfDay) {
    slots.push({ start: cursor, end: endOfDay, minutes: endOfDay - cursor, label: `${toHHMM(cursor)}-${toHHMM(endOfDay)}` });
  }

  return slots;
}

function getSortedTodayTasks() {
  return [...state.tasks]
    .filter((task) => !task.done)
    .sort((a, b) => {
      const moodA = a.tags?.includes(state.selectedMood) ? 1 : 0;
      const moodB = b.tags?.includes(state.selectedMood) ? 1 : 0;
      if (moodB !== moodA) return moodB - moodA;
      if ((b.priority || 0) !== (a.priority || 0)) return (b.priority || 0) - (a.priority || 0);
      return (a.duration || 999) - (b.duration || 999);
    });
}

function buildWeeklyItems() {
  const now = new Date();
  const weekEnd = new Date(now);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const weekly = state.events
    .filter((event) => {
      const d = new Date(event.start);
      return d >= now && d <= weekEnd;
    })
    .sort((a, b) => new Date(a.start) - new Date(b.start))
    .slice(0, 5);

  if (!weekly.length) return "<li class='list-item'>今週の予定はありません</li>";

  return weekly
    .map((event) => `<li class='list-item'>${formatDateShort(event.start)} ${event.title} (${formatTimeRange(event.start, event.end)})</li>`)
    .join("");
}

function getTodayEvents() {
  return state.events
    .filter((event) => event.start.startsWith(todayISO()))
    .sort((a, b) => new Date(a.start) - new Date(b.start));
}

function getLatestLog() {
  return [...state.logs].sort((a, b) => (a.date < b.date ? 1 : -1))[0];
}

function pickTodayReward() {
  return state.rewards[0] || "小さなご褒美を設定してみましょう";
}

function requestNotificationPermission() {
  if (!("Notification" in window)) {
    alert("このブラウザは通知に対応していません。");
    return;
  }
  Notification.requestPermission().then((permission) => {
    state.settings.notificationsEnabled = permission === "granted";
    saveState();
    alert(permission === "granted" ? "通知が有効になりました。" : "通知は許可されませんでした。");
  });
}

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `secretary-backup-${todayISO()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importData() {
  const file = document.getElementById("import-file")?.files?.[0];
  if (!file) return alert("ファイルを選択してください。");
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = JSON.parse(reader.result);
      state = { ...defaultState, ...imported };
      render();
      alert("インポートしました。");
    } catch {
      alert("JSONの読み込みに失敗しました。");
    }
  };
  reader.readAsText(file);
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(defaultState);
    return { ...structuredClone(defaultState), ...JSON.parse(raw) };
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function parseTags(input) {
  return input
    .split(/[,#\s]+/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function formatTags(tags = []) {
  return tags.map((tag) => `#${tag}`).join(" ");
}

function formatDateJP(date) {
  return date.toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit", weekday: "short" });
}

function formatDateShort(dateString) {
  const d = new Date(dateString);
  return d.toLocaleDateString("ja-JP", { month: "2-digit", day: "2-digit", weekday: "short" });
}

function formatTimeRange(start, end) {
  return `${start.slice(11, 16)}-${end.slice(11, 16)}`;
}

function toMinutes(dateTimeLocal) {
  const [h, m] = dateTimeLocal.slice(11, 16).split(":").map(Number);
  return h * 60 + m;
}

function toHHMM(minutes) {
  const h = String(Math.floor(minutes / 60)).padStart(2, "0");
  const m = String(minutes % 60).padStart(2, "0");
  return `${h}:${m}`;
}

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function prevDateISO() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function escapeHtml(text) {
  return text.replace(/[&<>'"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c]));
}
