const refs = {
  form: document.getElementById("create-form"),
  dueAt: document.getElementById("due-at"),
  feedback: document.getElementById("feedback"),
  submitLabel: document.getElementById("submit-label"),
  cancelEdit: document.getElementById("cancel-edit"),
  coursePreset: document.getElementById("course-preset"),
  courseCodeInput: document.getElementById("course-code-input"),
  courseNameInput: document.getElementById("course-name-input"),
  tasksBody: document.getElementById("tasks-body"),
  archivedTasksBody: document.getElementById("archived-tasks-body"),
  archivedCount: document.getElementById("archived-count"),
  filters: document.getElementById("filters"),
  scheduleForm: document.getElementById("schedule-form"),
  scheduleTaskId: document.getElementById("schedule-task-id"),
  scheduleDate: document.getElementById("schedule-date"),
  scheduleSlot: document.getElementById("schedule-slot"),
  scheduleFeedback: document.getElementById("schedule-feedback"),
  scheduleBody: document.getElementById("schedule-body"),
  refreshSchedule: document.getElementById("refresh-schedule"),
  clearSchedule: document.getElementById("clear-schedule"),
  summaryTotal: document.getElementById("summary-total"),
  summaryPending: document.getElementById("summary-pending"),
  summaryCompleted: document.getElementById("summary-completed"),
  summaryUrgent: document.getElementById("summary-urgent")
};

const state = {
  tasks: [],
  filter: "all",
  schedule: null,
  editingTaskId: null
};

const PRIORITY_LABELS = {
  high: "高",
  mid: "中",
  low: "低"
};

const STATUS_LABELS = {
  pending: "待办",
  completed: "已完成",
  archived: "已归档"
};

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeUpper(value) {
  return normalizeText(value).toUpperCase();
}

function setSubmitMode(isEditing) {
  const submitButton = refs.form.querySelector("button[type='submit']");
  const submitIcon = submitButton?.querySelector(".material-symbols-outlined");

  if (refs.submitLabel) {
    refs.submitLabel.textContent = isEditing ? "保存修改" : "添加任务";
  }
  if (submitIcon) {
    submitIcon.textContent = isEditing ? "save" : "add_circle";
  }
}

function resetCreateForm() {
  refs.form.reset();
  defaultDueAt();
  if (refs.coursePreset) {
    refs.coursePreset.value = "";
  }
}

function getTaskById(taskId) {
  return state.tasks.find((task) => task.id === taskId) || null;
}

function matchPresetValue(courseCode, courseName) {
  if (!refs.coursePreset) {
    return "";
  }

  const targetCode = normalizeUpper(courseCode);
  const targetName = normalizeText(courseName);
  if (!targetCode && !targetName) {
    return "";
  }

  const matched = Array.from(refs.coursePreset.options).find((option) => {
    if (!option.value) {
      return false;
    }
    const [code, name] = option.value.split("||");
    return normalizeUpper(code) === targetCode && normalizeText(name) === targetName;
  });

  return matched ? matched.value : "";
}

function startTaskEdit(taskId) {
  const task = getTaskById(taskId);
  if (!task) {
    refs.feedback.textContent = "任务不存在";
    return;
  }

  state.editingTaskId = task.id;
  setSubmitMode(true);
  if (refs.cancelEdit) {
    refs.cancelEdit.hidden = false;
  }

  refs.form.elements.title.value = task.title || "";
  refs.form.elements.dueAt.value = String(task.dueAt || "").slice(0, 16);
  refs.form.elements.priority.value = task.priority || "mid";
  refs.form.elements.courseCode.value = task.courseCode || "";
  refs.form.elements.courseName.value = task.courseName || "";

  if (refs.coursePreset) {
    refs.coursePreset.value = matchPresetValue(task.courseCode, task.courseName);
  }

  refs.feedback.textContent = `正在修改：${task.title}`;
}

function stopTaskEdit(message = "") {
  state.editingTaskId = null;
  setSubmitMode(false);
  if (refs.cancelEdit) {
    refs.cancelEdit.hidden = true;
  }
  resetCreateForm();
  refs.feedback.textContent = message;
}

function toDateInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function defaultDueAt() {
  const nextHour = new Date();
  nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);

  const year = nextHour.getFullYear();
  const month = String(nextHour.getMonth() + 1).padStart(2, "0");
  const day = String(nextHour.getDate()).padStart(2, "0");
  const hour = String(nextHour.getHours()).padStart(2, "0");
  const minute = String(nextHour.getMinutes()).padStart(2, "0");

  refs.dueAt.value = `${year}-${month}-${day}T${hour}:${minute}`;
}

function setScheduleDateRange() {
  const today = new Date();
  const maxDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 6);

  refs.scheduleDate.min = toDateInput(today);
  refs.scheduleDate.max = toDateInput(maxDate);

  if (!refs.scheduleDate.value) {
    refs.scheduleDate.value = refs.scheduleDate.min;
  }
}

function matchesFilter(task) {
  if (state.filter === "all") {
    return true;
  }
  return task.status === state.filter;
}

function getActiveTasks() {
  return state.tasks.filter((task) => task.status !== "archived");
}

function getArchivedTasks() {
  return state.tasks.filter((task) => task.status === "archived");
}

function priorityClass(priority) {
  if (priority === "high") {
    return "priority-high";
  }
  if (priority === "low") {
    return "priority-low";
  }
  return "priority-mid";
}

function statusClass(status) {
  if (status === "completed") {
    return "status-completed";
  }
  if (status === "archived") {
    return "status-archived";
  }
  return "status-pending";
}

function renderSummary() {
  const activeTasks = getActiveTasks();
  const total = activeTasks.length;
  const pending = activeTasks.filter((task) => task.status === "pending").length;
  const completed = activeTasks.filter((task) => task.status === "completed").length;
  const urgent = activeTasks.filter((task) => task.status === "pending" && task.isUrgent).length;

  refs.summaryTotal.textContent = String(total);
  refs.summaryPending.textContent = String(pending);
  refs.summaryCompleted.textContent = String(completed);
  refs.summaryUrgent.textContent = String(urgent);
  if (refs.archivedCount) {
    refs.archivedCount.textContent = String(getArchivedTasks().length);
  }
}

function renderTasks() {
  const filtered = getActiveTasks().filter(matchesFilter);

  if (filtered.length === 0) {
    refs.tasksBody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-row">当前筛选下没有任务</td>
      </tr>
    `;
    return;
  }

  refs.tasksBody.innerHTML = filtered
    .map((task) => {
      const primaryAction =
        task.status === "pending"
          ? `<button class="action-btn" data-action="complete" data-task-id="${escapeHtml(task.id)}">完成</button>`
          : `<button class="action-btn" data-action="reopen" data-task-id="${escapeHtml(task.id)}">恢复</button>`;
      const archiveAction = `<button class="action-btn" data-action="archive" data-task-id="${escapeHtml(task.id)}">归档</button>`;

      const reservation = task.reservationText
        ? `<div class="table-reservation">${escapeHtml(task.reservationText)}</div>`
        : "";

      const priorityLabel = PRIORITY_LABELS[task.priority] || task.priority;
      const statusLabel = STATUS_LABELS[task.status] || task.status;

      return `
        <tr>
          <td>
            <div class="task-title">${escapeHtml(task.title)}</div>
            <div class="task-subline">${escapeHtml(task.dueLeftText || task.whenText)}</div>
          </td>
          <td>
            <div class="course-label" title="${escapeHtml(task.courseLabel)}">${escapeHtml(task.courseLabel)}</div>
          </td>
          <td>
            <div class="due-main">${escapeHtml(task.dueDate)}</div>
            <div class="due-hint">${escapeHtml(task.whenText)}</div>
            ${reservation}
          </td>
          <td>
            <span class="task-chip ${escapeHtml(priorityClass(task.priority))}">${escapeHtml(priorityLabel)}</span>
          </td>
          <td>
            <span class="status-tag ${escapeHtml(statusClass(task.status))}">${escapeHtml(statusLabel)}</span>
          </td>
          <td>
            <div class="actions">
              <button class="action-btn" data-action="edit" data-task-id="${escapeHtml(task.id)}">修改</button>
              ${primaryAction}
              ${archiveAction}
              <button class="action-btn action-btn-danger" data-action="delete" data-task-id="${escapeHtml(task.id)}">删除</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

function renderArchivedTasks() {
  if (!refs.archivedTasksBody) {
    return;
  }

  const archived = getArchivedTasks();

  if (refs.archivedCount) {
    refs.archivedCount.textContent = String(archived.length);
  }

  if (archived.length === 0) {
    refs.archivedTasksBody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-row">暂无归档任务</td>
      </tr>
    `;
    return;
  }

  refs.archivedTasksBody.innerHTML = archived
    .map((task) => {
      const priorityLabel = PRIORITY_LABELS[task.priority] || task.priority;
      const archivedAtText = task.archivedAt ? String(task.archivedAt).replace("T", " ") : "-";
      const completedAtText = task.completedAt ? String(task.completedAt).replace("T", " ") : "-";

      return `
        <tr>
          <td>
            <div class="task-title">${escapeHtml(task.title)}</div>
            <div class="task-subline">完成: ${escapeHtml(completedAtText)} · 归档: ${escapeHtml(archivedAtText)}</div>
          </td>
          <td>
            <div class="course-label" title="${escapeHtml(task.courseLabel)}">${escapeHtml(task.courseLabel)}</div>
          </td>
          <td>
            <div class="due-main">${escapeHtml(task.dueDate)}</div>
            <div class="due-hint">${escapeHtml(task.whenText)}</div>
          </td>
          <td>
            <span class="task-chip ${escapeHtml(priorityClass(task.priority))}">${escapeHtml(priorityLabel)}</span>
          </td>
          <td>
            <span class="status-tag ${escapeHtml(statusClass(task.status))}">${escapeHtml(STATUS_LABELS.archived)}</span>
          </td>
          <td>
            <div class="actions">
              <button class="action-btn" data-action="restore-completed" data-task-id="${escapeHtml(task.id)}">恢复到已完成</button>
              <button class="action-btn" data-action="restore-pending" data-task-id="${escapeHtml(task.id)}">恢复到待办</button>
              <button class="action-btn action-btn-danger" data-action="delete" data-task-id="${escapeHtml(task.id)}">删除</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

function renderScheduleTaskOptions() {
  const pending = state.tasks.filter((task) => task.status === "pending");
  const currentValue = refs.scheduleTaskId.value;

  if (pending.length === 0) {
    refs.scheduleTaskId.innerHTML = '<option value="">暂无待办任务</option>';
    refs.scheduleTaskId.disabled = true;
    refs.scheduleSlot.disabled = true;
    refs.scheduleDate.disabled = true;
    refs.clearSchedule.disabled = true;
    refs.scheduleForm.querySelector("button[type='submit']").disabled = true;
    return;
  }

  refs.scheduleTaskId.disabled = false;
  refs.scheduleSlot.disabled = false;
  refs.scheduleDate.disabled = false;
  refs.clearSchedule.disabled = false;
  refs.scheduleForm.querySelector("button[type='submit']").disabled = false;

  refs.scheduleTaskId.innerHTML = pending
    .map((task) => {
      const selected = currentValue === task.id ? "selected" : "";
      return `<option value="${escapeHtml(task.id)}" ${selected}>${escapeHtml(task.title)} · ${escapeHtml(task.courseCode)}</option>`;
    })
    .join("");
}

function renderScheduleBoard() {
  if (!state.schedule || !Array.isArray(state.schedule.rows) || state.schedule.rows.length === 0) {
    refs.scheduleBody.innerHTML = `
      <tr>
        <td colspan="5" class="empty-row">暂无排程数据</td>
      </tr>
    `;
    return;
  }

  refs.scheduleBody.innerHTML = state.schedule.rows
    .map((row) => {
      const cells = row.slots
        .map((entry) => {
          if (!entry.task) {
            return '<td class="schedule-cell"><span class="schedule-empty">-</span></td>';
          }

          return `
            <td class="schedule-cell">
              <div class="schedule-cell-task">
                <span class="schedule-cell-title">${escapeHtml(entry.task.title)}</span>
                <span class="schedule-cell-meta">${escapeHtml(entry.task.courseCode)} · Due ${escapeHtml(entry.task.dueDate)}</span>
                <button
                  class="action-btn"
                  data-action="pick-schedule"
                  data-task-id="${escapeHtml(entry.task.id)}"
                  data-scheduled-date="${escapeHtml(row.date)}"
                  data-scheduled-slot="${escapeHtml(entry.slot)}"
                >编辑</button>
              </div>
            </td>
          `;
        })
        .join("");

      return `
        <tr>
          <td>${escapeHtml(row.label)}</td>
          ${cells}
        </tr>
      `;
    })
    .join("");
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.message || "请求失败");
  }

  return payload;
}

async function loadTasks() {
  const payload = await requestJson("/api/tasks");
  state.tasks = Array.isArray(payload.tasks) ? payload.tasks : [];
  renderSummary();
  renderTasks();
  renderArchivedTasks();
  renderScheduleTaskOptions();
}

async function loadSchedule() {
  const payload = await requestJson("/api/schedule?days=7");
  state.schedule = payload;
  renderScheduleBoard();
}

async function refreshAll() {
  await Promise.all([loadTasks(), loadSchedule()]);
}

refs.form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(refs.form);
  const payload = {
    title: String(formData.get("title") || "").trim(),
    courseCode: String(formData.get("courseCode") || "").trim().toUpperCase(),
    courseName: String(formData.get("courseName") || "").trim(),
    dueAt: String(formData.get("dueAt") || "").trim(),
    priority: String(formData.get("priority") || "mid").trim()
  };

  const submit = refs.form.querySelector("button[type='submit']");
  submit.disabled = true;
  refs.feedback.textContent = state.editingTaskId ? "更新中..." : "保存中...";

  try {
    if (state.editingTaskId) {
      await requestJson(`/api/tasks/${encodeURIComponent(state.editingTaskId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      await refreshAll();
      stopTaskEdit("任务已更新");
    } else {
      await requestJson("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      refs.feedback.textContent = "任务已添加";
      resetCreateForm();
      await refreshAll();
    }
  } catch (error) {
    refs.feedback.textContent = error.message;
  } finally {
    submit.disabled = false;
  }
});

if (refs.cancelEdit) {
  refs.cancelEdit.addEventListener("click", () => {
    stopTaskEdit("已取消修改");
  });
}

refs.scheduleForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const taskId = refs.scheduleTaskId.value;
  if (!taskId) {
    refs.scheduleFeedback.textContent = "请先选择任务";
    return;
  }

  const payload = {
    scheduledDate: refs.scheduleDate.value,
    scheduledSlot: refs.scheduleSlot.value
  };

  const submit = refs.scheduleForm.querySelector("button[type='submit']");
  submit.disabled = true;
  refs.scheduleFeedback.textContent = "设置中...";

  try {
    await requestJson(`/api/tasks/${encodeURIComponent(taskId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    refs.scheduleFeedback.textContent = "预约已更新";
    await refreshAll();
  } catch (error) {
    refs.scheduleFeedback.textContent = error.message;
  } finally {
    submit.disabled = false;
  }
});

refs.clearSchedule.addEventListener("click", async () => {
  const taskId = refs.scheduleTaskId.value;
  if (!taskId) {
    refs.scheduleFeedback.textContent = "请先选择任务";
    return;
  }

  refs.clearSchedule.disabled = true;
  refs.scheduleFeedback.textContent = "清空中...";

  try {
    await requestJson(`/api/tasks/${encodeURIComponent(taskId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheduledDate: null, scheduledSlot: null })
    });

    refs.scheduleFeedback.textContent = "预约已清空";
    await refreshAll();
  } catch (error) {
    refs.scheduleFeedback.textContent = error.message;
  } finally {
    refs.clearSchedule.disabled = false;
  }
});

refs.refreshSchedule.addEventListener("click", async () => {
  refs.refreshSchedule.disabled = true;
  refs.scheduleFeedback.textContent = "刷新中...";

  try {
    await loadSchedule();
    refs.scheduleFeedback.textContent = "排程已刷新";
  } catch (error) {
    refs.scheduleFeedback.textContent = error.message;
  } finally {
    refs.refreshSchedule.disabled = false;
  }
});

refs.filters.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const button = target.closest("button[data-filter]");
  if (!button) {
    return;
  }

  state.filter = button.dataset.filter || "all";

  refs.filters.querySelectorAll("button").forEach((item) => {
    item.classList.toggle("active", item === button);
  });

  renderTasks();
});

async function handleTaskAction(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const button = target.closest("button[data-action]");
  if (!button) {
    return;
  }

  const taskId = button.dataset.taskId;
  const action = button.dataset.action;

  if (!taskId || !action) {
    return;
  }

  if (action === "edit") {
    startTaskEdit(taskId);
    return;
  }

  button.disabled = true;

  try {
    if (action === "complete") {
      await requestJson(`/api/tasks/${encodeURIComponent(taskId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" })
      });
    } else if (action === "reopen") {
      await requestJson(`/api/tasks/${encodeURIComponent(taskId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "pending" })
      });
    } else if (action === "archive") {
      await requestJson(`/api/tasks/${encodeURIComponent(taskId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "archived" })
      });
    } else if (action === "restore-completed") {
      await requestJson(`/api/tasks/${encodeURIComponent(taskId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" })
      });
    } else if (action === "restore-pending") {
      await requestJson(`/api/tasks/${encodeURIComponent(taskId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "pending" })
      });
    } else if (action === "delete") {
      const confirmed = window.confirm("确定要删除这个任务吗？");
      if (!confirmed) {
        button.disabled = false;
        return;
      }

      await requestJson(`/api/tasks/${encodeURIComponent(taskId)}`, {
        method: "DELETE"
      });
    }

    await refreshAll();
    if (state.editingTaskId && !getTaskById(state.editingTaskId)) {
      stopTaskEdit("操作成功");
      return;
    }
    refs.feedback.textContent = "操作成功";
  } catch (error) {
    refs.feedback.textContent = error.message;
    button.disabled = false;
  }
}

refs.tasksBody.addEventListener("click", handleTaskAction);
if (refs.archivedTasksBody) {
  refs.archivedTasksBody.addEventListener("click", handleTaskAction);
}

refs.scheduleBody.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const button = target.closest("button[data-action='pick-schedule']");
  if (!button) {
    return;
  }

  const taskId = button.dataset.taskId || "";
  const scheduledDate = button.dataset.scheduledDate || "";
  const scheduledSlot = button.dataset.scheduledSlot || "";

  if (taskId) {
    refs.scheduleTaskId.value = taskId;
  }
  if (scheduledDate) {
    refs.scheduleDate.value = scheduledDate;
  }
  if (scheduledSlot) {
    refs.scheduleSlot.value = scheduledSlot;
  }

  refs.scheduleFeedback.textContent = "已载入该排程，可直接修改";
});

(async function init() {
  defaultDueAt();
  setScheduleDateRange();

  try {
    await refreshAll();
  } catch (error) {
    refs.feedback.textContent = `加载失败: ${error.message}`;
  }
})();
