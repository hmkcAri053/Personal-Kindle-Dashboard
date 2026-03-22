const SLOT_ORDER = ["AM", "PM", "EVE", "NIT"];

const refs = {
  weekday: document.getElementById("weekday"),
  month: document.getElementById("month"),
  day: document.getElementById("day"),
  weatherIcon: document.getElementById("weather-icon"),
  weather: document.getElementById("weather-text"),
  semester: document.getElementById("semester-text"),
  upNextTitle: document.getElementById("up-next-title"),
  upNextCourse: document.getElementById("up-next-course"),
  upNextDate: document.getElementById("up-next-date"),
  upNextLeft: document.getElementById("up-next-left"),
  refreshTime: document.getElementById("refresh-time"),
  pendingCount: document.getElementById("pending-count"),
  urgentCount: document.getElementById("urgent-count"),
  progressFill: document.getElementById("progress-fill"),
  progressText: document.getElementById("progress-text"),
  pendingTaskList: document.getElementById("pending-task-list"),
  completedTaskList: document.getElementById("completed-task-list")
};

function weatherIconSvg(iconCode) {
  const code = Number(iconCode);
  const svg = (content) => `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      ${content}
    </svg>
  `;

  const cloud = svg(`
    <path d="M11.6667 12.6667H6.00001C5.13458 12.6664 4.28627 12.4256 3.54986 11.971C2.81345 11.5164 2.21795 10.866 1.82992 10.0924C1.44189 9.31885 1.2766 8.45263 1.35253 7.59054C1.42847 6.72846 1.74262 5.90447 2.2599 5.21065C2.77718 4.51683 3.4772 3.98052 4.28174 3.66165C5.08628 3.34278 5.96363 3.25391 6.81577 3.40497C7.66791 3.55603 8.46126 3.94107 9.10716 4.51707C9.75306 5.09306 10.2261 5.83731 10.4733 6.66666H11.6667C12.4623 6.66666 13.2254 6.98273 13.788 7.54534C14.3506 8.10795 14.6667 8.87101 14.6667 9.66666C14.6667 10.4623 14.3506 11.2254 13.788 11.788C13.2254 12.3506 12.4623 12.6667 11.6667 12.6667Z" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/>
  `);
  const sun = svg(`
    <circle cx="8" cy="8" r="3" stroke="currentColor"/>
    <path d="M8 1.33334V2.66667M8 13.3333V14.6667M1.33334 8H2.66667M13.3333 8H14.6667M3.28629 3.28629L4.22895 4.22895M11.7711 11.7711L12.7137 12.7137M12.7137 3.28629L11.7711 4.22895M4.22895 11.7711L3.28629 12.7137" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/>
  `);
  const partlyCloudy = svg(`
    <path d="M6.2 5.4a2.7 2.7 0 1 0-5.4 0M3.5 1.3v1M3.5 8.5v1M0.8 4.9h1M5.2 4.9h1M1.6 2.9l.7.7M4.7 6l.7.7M5.4 2.9l-.7.7M2.3 6l-.7.7" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M12 13H6.6C5.95044 12.9997 5.31372 12.8189 4.76142 12.4779C4.20912 12.1369 3.76249 11.6491 3.47144 11.069M12 13C12.5967 13 13.169 12.7629 13.591 12.341C14.0129 11.919 14.25 11.3467 14.25 10.75C14.25 10.1533 14.0129 9.58101 13.591 9.15901C13.169 8.73705 12.5967 8.5 12 8.5H11.105C10.9196 7.87792 10.5649 7.31984 10.0804 6.88805C9.59598 6.45625 9.00097 6.16662 8.36283 6.05077" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/>
  `);
  const moon = svg(`
    <path d="M10.6667 13.3333C8.08934 13.3333 6 11.244 6 8.66667C6 6.71474 7.19856 5.04272 8.90167 4.34442C8.63537 4.28567 8.35854 4.25467 8.07446 4.25467C5.54909 4.25467 3.50293 6.30082 3.50293 8.8262C3.50293 11.3516 5.54909 13.3977 8.07446 13.3977C9.29394 13.3977 10.4019 12.9207 11.2211 12.1433C11.0407 12.2707 10.8565 12.3793 10.6667 13.3333Z" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/>
  `);
  const rain = svg(`
    <path d="M11.6667 10.6667H6.00001C5.13458 10.6664 4.28627 10.4256 3.54986 9.97095C2.81345 9.51635 2.21795 8.86597 1.82992 8.0924C1.44189 7.31884 1.2766 6.45262 1.35253 5.59054C1.42847 4.72846 1.74262 3.90446 2.2599 3.21064C2.77718 2.51682 3.4772 1.98052 4.28174 1.66165C5.08628 1.34278 5.96363 1.2539 6.81577 1.40496C7.66791 1.55603 8.46126 1.94106 9.10716 2.51706C9.75306 3.09306 10.2261 3.8373 10.4733 4.66666H11.6667C12.4623 4.66666 13.2254 4.98273 13.788 5.54534C14.3506 6.10795 14.6667 6.87101 14.6667 7.66666C14.6667 8.46232 14.3506 9.22537 13.788 9.78798C13.2254 10.3506 12.4623 10.6667 11.6667 10.6667Z" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M5 12L4.33334 13.3333M8 12L7.33334 13.3333M11 12L10.3333 13.3333" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/>
  `);
  const thunder = svg(`
    <path d="M11.6667 10.3333H6.00001C5.13458 10.3331 4.28627 10.0923 3.54986 9.63764C2.81345 9.18305 2.21795 8.53267 1.82992 7.7591C1.44189 6.98553 1.2766 6.11932 1.35253 5.25723C1.42847 4.39515 1.74262 3.57115 2.2599 2.87733C2.77718 2.18351 3.4772 1.64721 4.28174 1.32833C5.08628 1.00946 5.96363 0.920592 6.81577 1.07165C7.66791 1.22271 8.46126 1.60775 9.10716 2.18375C9.75306 2.75974 10.2261 3.50399 10.4733 4.33333H11.6667C12.4623 4.33333 13.2254 4.6494 13.788 5.21201C14.3506 5.77462 14.6667 6.53768 14.6667 7.33333C14.6667 8.12899 14.3506 8.89204 13.788 9.45465C13.2254 10.0173 12.4623 10.3333 11.6667 10.3333Z" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M8.2 10.7L6.8 13H8.8L7.8 15.3" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/>
  `);
  const snow = svg(`
    <path d="M11.6667 10.6667H6.00001C5.13458 10.6664 4.28627 10.4256 3.54986 9.97095C2.81345 9.51635 2.21795 8.86597 1.82992 8.0924C1.44189 7.31884 1.2766 6.45262 1.35253 5.59054C1.42847 4.72846 1.74262 3.90446 2.2599 3.21064C2.77718 2.51682 3.4772 1.98052 4.28174 1.66165C5.08628 1.34278 5.96363 1.2539 6.81577 1.40496C7.66791 1.55603 8.46126 1.94106 9.10716 2.51706C9.75306 3.09306 10.2261 3.8373 10.4733 4.66666H11.6667C12.4623 4.66666 13.2254 4.98273 13.788 5.54534C14.3506 6.10795 14.6667 6.87101 14.6667 7.66666C14.6667 8.46232 14.3506 9.22537 13.788 9.78798C13.2254 10.3506 12.4623 10.6667 11.6667 10.6667Z" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M5 12.2V14.2M4.13333 13.2H5.86667M7.6 12.2V14.2M6.73333 13.2H8.46667M10.2 12.2V14.2M9.33333 13.2H11.0667" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/>
  `);
  const fog = svg(`
    <path d="M10.8 6.8H5.6C4.92355 6.79977 4.26348 7.01039 3.71175 7.40259C3.16003 7.79478 2.74376 8.34925 2.52068 8.98984" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M2.33334 10.3333H13.6667M3.33334 12.3333H12.6667M4.66667 14.3333H11.3333" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M11.6667 9H7.00001C6.41027 8.99979 5.83264 8.83266 5.33405 8.51784C4.83547 8.20302 4.43581 7.75334 4.18001 7.22001C3.9242 6.68668 3.82263 6.09188 3.88698 5.50339C3.95132 4.91489 4.17902 4.35613 4.5442 3.89005C4.90938 3.42397 5.39764 3.06897 5.95282 2.86482C6.50801 2.66066 7.10929 2.61548 7.68896 2.73442C8.26864 2.85336 8.80395 3.13166 9.23778 3.53805C9.67161 3.94444 9.98712 4.46379 10.1493 5.03733H11.6667C12.1971 5.03733 12.7058 5.24805 13.0809 5.62312C13.4559 5.99819 13.6667 6.5069 13.6667 7.03733" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/>
  `);
  const wind = svg(`
    <path d="M1.33334 6.66666H10.3333C11.2538 6.66666 12 5.92047 12 5C12 4.07952 11.2538 3.33333 10.3333 3.33333C9.63899 3.33333 9.04383 3.75782 8.79334 4.36166" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M1.33334 9.66666H13C13.9205 9.66666 14.6667 10.4129 14.6667 11.3333C14.6667 12.2538 13.9205 13 13 13C12.3057 13 11.7105 12.5755 11.46 11.9717" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/>
  `);
  const unknown = svg(`
    <circle cx="8" cy="8" r="6.66667" stroke="currentColor"/>
    <path d="M6.8 6.2C6.8 5.53726 7.33726 5 8 5C8.66274 5 9.2 5.53726 9.2 6.2C9.2 6.86274 8.4 7.13333 8 7.66667C7.73333 8.02222 7.73333 8.4 7.73333 8.6M8 11.0667H8.00667" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/>
  `);

  if (!Number.isFinite(code)) return cloud;
  if (code === 100) return sun;
  if (code >= 150 && code <= 154) return moon;
  if (code >= 101 && code <= 104) return partlyCloudy;
  if (code >= 300 && code <= 313) return rain;
  if (code >= 314 && code <= 399) return thunder;
  if (code >= 400 && code <= 499) return snow;
  if (code >= 500 && code <= 515) return fog;
  if (code === 802 || code === 803 || code === 804) return wind;
  if (code === 350) return moon;
  if (code >= 900) return unknown;
  return cloud;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function dotClass(priority) {
  if (priority === "high") {
    return "dot-high";
  }
  if (priority === "low") {
    return "dot-low";
  }
  return "dot-mid";
}

function renderTaskItem(task, completed) {
  const titleClass = task.isUrgent && !completed ? "task-title-urgent" : "";
  const whenClass = task.isUrgent && !completed ? "task-when task-when-urgent" : "task-when";
  const reservation = task.reservationText
    ? `<span class="task-reservation">${escapeHtml(task.reservationText)}</span>`
    : "";

  return `
    <article class="task-item ${completed ? "task-item-completed" : ""}">
      <span class="dot ${dotClass(task.priority)}"></span>
      <div class="task-content">
        <div class="task-main-row">
          <h3 class="${titleClass}">${escapeHtml(task.title)}</h3>
          <span class="${whenClass}">${escapeHtml(task.whenText)}</span>
        </div>
        <div class="task-sub-row">
          <span class="task-course">${escapeHtml(task.courseLabel)}</span>
          <div class="task-sub-right">
            <span class="task-date">${escapeHtml(task.dueDate)}</span>
            ${reservation}
          </div>
        </div>
      </div>
    </article>
  `;
}

function renderEmptyList(container, message) {
  container.innerHTML = `
    <article class="task-item task-item-empty">
      <span class="dot dot-low"></span>
      <div class="task-content">
        <div class="task-main-row">
          <h3>${escapeHtml(message)}</h3>
        </div>
      </div>
    </article>
  `;
}

function renderSlot(slotData) {
  const { slot, task } = slotData;
  const titleEl = document.getElementById(`slot-${slot}-title`);
  const dueEl = document.getElementById(`slot-${slot}-due`);
  const courseEl = document.getElementById(`slot-${slot}-course`);

  if (!task) {
    titleEl.textContent = "No task";
    dueEl.textContent = "-";
    dueEl.classList.remove("time-due-today");
    courseEl.textContent = "-";
    return;
  }

  titleEl.textContent = task.title;
  dueEl.textContent = task.dueLeftText;
  dueEl.classList.toggle("time-due-today", task.whenText === "Due today");
  courseEl.textContent = task.courseCode;
}

function renderDashboard(data) {
  refs.weekday.textContent = data.today.weekday;
  refs.month.textContent = data.today.month;
  refs.day.textContent = String(data.today.day);
  if (refs.weatherIcon) {
    refs.weatherIcon.innerHTML = weatherIconSvg(data.today.weatherIconCode);
    refs.weatherIcon.title = data.today.weatherDate
      ? `Weather for ${data.today.weatherDate}`
      : "Weather icon";
  }
  refs.weather.textContent = data.today.weather;
  refs.semester.textContent = data.today.semester;

  refs.pendingCount.textContent = `${data.summary.pendingCount} pending`;
  refs.urgentCount.textContent = `${data.summary.urgentCount} urgent`;
  refs.progressFill.style.width = `${data.summary.progressPercent}%`;
  refs.progressText.textContent = `${data.summary.completedCount}/${data.summary.totalCount}`;

  if (data.upNext) {
    refs.upNextTitle.textContent = data.upNext.title;
    refs.upNextCourse.textContent = data.upNext.courseLabel;
    refs.upNextDate.textContent = `Due ${data.upNext.dueDate}`;
    refs.upNextLeft.textContent = data.upNext.dueLeftText;
  } else {
    refs.upNextTitle.textContent = "No pending tasks";
    refs.upNextCourse.textContent = "-";
    refs.upNextDate.textContent = "-";
    refs.upNextLeft.textContent = "-";
  }

  SLOT_ORDER.forEach((slot) => {
    const block = document.getElementById(`block-${slot}`);
    block.classList.remove("time-block-strong");
  });

  data.timeBlocks.forEach(renderSlot);

  if (data.highlightedSlot) {
    const block = document.getElementById(`block-${data.highlightedSlot}`);
    if (block) {
      block.classList.add("time-block-strong");
    }
  }

  if (data.tasks.pending.length === 0) {
    renderEmptyList(refs.pendingTaskList, "No pending task");
  } else {
    refs.pendingTaskList.innerHTML = data.tasks.pending.map((task) => renderTaskItem(task, false)).join("");
  }

  if (data.tasks.completed.length === 0) {
    renderEmptyList(refs.completedTaskList, "No completed task");
  } else {
    refs.completedTaskList.innerHTML = data.tasks.completed.map((task) => renderTaskItem(task, true)).join("");
  }

  refs.refreshTime.textContent = `Last refresh ${data.refreshTime}`;
}

async function loadDashboard() {
  const response = await fetch("/api/dashboard");
  if (!response.ok) {
    throw new Error("Failed to load dashboard");
  }
  const data = await response.json();
  renderDashboard(data);
}

(async function init() {
  try {
    await loadDashboard();
    setInterval(() => {
      loadDashboard().catch(() => {});
    }, 30000);
  } catch (error) {
    refs.pendingTaskList.innerHTML = `
      <article class="task-item task-item-empty">
        <span class="dot dot-low"></span>
        <div class="task-content">
          <div class="task-main-row">
            <h3>Cannot reach backend. Start server with: node backend/server.js</h3>
          </div>
        </div>
      </article>
    `;
  }
})();
