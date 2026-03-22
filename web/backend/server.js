const fs = require("fs");
const http = require("http");
const path = require("path");
const crypto = require("crypto");

function loadDotEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    if (!key || Object.prototype.hasOwnProperty.call(process.env, key)) {
      continue;
    }

    let value = line.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadDotEnvFile(path.resolve(__dirname, "..", ".env"));

const PORT = Number(process.env.PORT || 3000);
const PROJECT_ROOT = path.resolve(__dirname, "..");
const FRONTEND_ROOT = path.join(PROJECT_ROOT, "frontend");
const STORE_PROVIDER = String(process.env.STORE_PROVIDER || "file").trim().toLowerCase();
const DATA_PATH = process.env.DATA_PATH
  ? path.resolve(PROJECT_ROOT, process.env.DATA_PATH)
  : path.join(__dirname, "data", "tasks.json");
const FIRESTORE_COLLECTION = String(process.env.FIRESTORE_COLLECTION || "kindle_dashboard").trim();
const FIRESTORE_DOC_ID = String(process.env.FIRESTORE_DOC_ID || "default").trim();
const ALLOW_ORIGINS = String(process.env.ALLOW_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const QW_API_HOST = String(process.env.QW_API_HOST || "devapi.qweather.com").trim();
const QW_API_KEY = String(process.env.QW_API_KEY || "").trim();
const QW_LOCATION = String(process.env.QW_LOCATION || "珠海").trim();
const QW_LANG = String(process.env.QW_LANG || "en").trim();
const QW_UNIT = String(process.env.QW_UNIT || "m").trim();
const QW_TIME_ZONE = String(process.env.QW_TIME_ZONE || "Asia/Shanghai").trim();
const WEATHER_CACHE_MS = Math.max(0, Number(process.env.WEATHER_CACHE_MS || 10800000) || 10800000);

const VALID_PRIORITIES = new Set(["high", "mid", "low"]);
const VALID_SLOTS = new Set(["AM", "PM", "EVE", "NIT"]);
const VALID_STATUSES = new Set(["pending", "completed", "archived"]);

let firestoreDocRef = null;
let storeInitPromise = null;
let qweatherForecastCache = {
  key: "",
  value: null,
  expiresAt: 0
};

function pad(number) {
  return String(number).padStart(2, "0");
}

function normalizeQWeatherHost(host) {
  if (!host) {
    return "";
  }

  return host.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
}

function formatLocalDateTime(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatDateOnly(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseDateOnly(value) {
  if (typeof value !== "string") {
    return null;
  }

  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day, 0, 0, 0, 0);
  const valid = date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;

  if (!valid) {
    return null;
  }

  return { date, normalized: `${year}-${pad(month)}-${pad(day)}` };
}

function parseLocalDateTime(value) {
  if (typeof value !== "string") {
    return null;
  }

  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);

  const date = new Date(year, month - 1, day, hour, minute, 0, 0);
  const valid =
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day &&
    date.getHours() === hour &&
    date.getMinutes() === minute;

  if (!valid) {
    return null;
  }

  return { date, normalized: `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}` };
}

function inferPreferredSlot(date) {
  const hour = date.getHours();
  if (hour < 12) {
    return "AM";
  }
  if (hour < 17) {
    return "PM";
  }
  if (hour < 21) {
    return "EVE";
  }
  return "NIT";
}

function daysBetweenCalendar(startDate, endDate) {
  const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
  return Math.round((end - start) / 86400000);
}

function getSemesterLabel(date) {
  const semesterStart = new Date(2026, 1, 23); // 2026-02-23
  const semesterEnd = new Date(2026, 4, 29); // 2026-05-29
  const current = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (current < semesterStart || current > semesterEnd) {
    return "Not in semester";
  }

  const weekNumber = Math.floor(daysBetweenCalendar(semesterStart, current) / 7) + 1;
  return `Week ${weekNumber} · 2026 Spring`;
}

function isQWeatherConfigured() {
  return Boolean(QW_API_HOST && QW_API_KEY && QW_LOCATION);
}

function buildQWeatherWeather3dUrl() {
  const apiHost = normalizeQWeatherHost(QW_API_HOST);
  const url = new URL(`https://${apiHost}/v7/weather/3d`);
  url.searchParams.set("location", QW_LOCATION);
  url.searchParams.set("lang", QW_LANG);
  url.searchParams.set("unit", QW_UNIT);
  // Public dev host works well with API key in query string.
  if (apiHost === "devapi.qweather.com") {
    url.searchParams.set("key", QW_API_KEY);
  }
  return url;
}

function mapQWeatherForecastDay(day) {
  return {
    date: day.fxDate,
    textDay: day.textDay,
    textNight: day.textNight,
    iconDay: day.iconDay,
    iconNight: day.iconNight,
    tempMin: day.tempMin,
    tempMax: day.tempMax,
    humidity: day.humidity,
    precip: day.precip,
    windDirDay: day.windDirDay,
    windScaleDay: day.windScaleDay
  };
}

function getDateKeyInTimeZone(date, timeZone) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  const parts = formatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  if (!year || !month || !day) {
    return null;
  }
  return `${year}-${month}-${day}`;
}

function pickTodayForecastDay(forecast, referenceDate = new Date()) {
  if (!Array.isArray(forecast?.daily) || forecast.daily.length === 0) {
    return null;
  }

  const todayDateKey = getDateKeyInTimeZone(referenceDate, QW_TIME_ZONE);
  if (!todayDateKey) {
    return forecast.daily[0];
  }

  return forecast.daily.find((day) => day.date === todayDateKey) || forecast.daily[0];
}

function formatWeatherSummaryFromForecast(forecast, referenceDate = new Date()) {
  const today = pickTodayForecastDay(forecast, referenceDate);
  if (!today) {
    return null;
  }

  const condition = today.textDay || today.textNight || "Unknown";
  if (today.tempMin != null && today.tempMax != null) {
    return `${condition} · ${today.tempMin}°C / ${today.tempMax}°C`;
  }
  return condition;
}

async function fetchQWeatherForecast3d() {
  if (!isQWeatherConfigured()) {
    return null;
  }

  const cacheKey = [normalizeQWeatherHost(QW_API_HOST), QW_LOCATION, QW_LANG, QW_UNIT].join("|");
  const now = Date.now();
  if (
    qweatherForecastCache.value &&
    qweatherForecastCache.key === cacheKey &&
    now < qweatherForecastCache.expiresAt
  ) {
    return qweatherForecastCache.value;
  }

  const url = buildQWeatherWeather3dUrl();
  const apiHost = normalizeQWeatherHost(QW_API_HOST);
  const useQueryKeyAuth = apiHost === "devapi.qweather.com";
  const response = await fetch(url, {
    headers: useQueryKeyAuth
      ? undefined
      : {
          "X-QW-Api-Key": QW_API_KEY
        },
    signal: AbortSignal.timeout(8000)
  });

  if (!response.ok) {
    let detail = "";
    try {
      const errorBody = await response.json();
      detail = [errorBody.code, errorBody.error?.type, errorBody.error?.message]
        .filter(Boolean)
        .join(" / ");
    } catch {
      try {
        detail = await response.text();
      } catch {
        detail = "";
      }
    }
    throw new Error(`QWeather HTTP ${response.status}${detail ? ` (${detail})` : ""}`);
  }

  const payload = await response.json();
  if (payload.code !== "200" || !Array.isArray(payload.daily)) {
    throw new Error(`QWeather code ${payload.code || "unknown"}`);
  }

  const forecast = {
    provider: "QWeather",
    location: QW_LOCATION,
    updateTime: payload.updateTime || null,
    fxLink: payload.fxLink || null,
    daily: payload.daily.map(mapQWeatherForecastDay)
  };

  qweatherForecastCache = {
    key: cacheKey,
    value: forecast,
    expiresAt: now + WEATHER_CACHE_MS
  };

  return forecast;
}

function isWithinSchedulingWindow(date) {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return date >= start && date <= end;
}

function compareDue(a, b) {
  const dueA = parseLocalDateTime(a.dueAt).date;
  const dueB = parseLocalDateTime(b.dueAt).date;
  return dueA - dueB;
}

function taskView(task, now = new Date()) {
  const dueInfo = parseLocalDateTime(task.dueAt);
  const dueDate = dueInfo.date;
  const dayDiff = daysBetweenCalendar(now, dueDate);
  const unit = Math.abs(dayDiff) === 1 ? "day" : "days";

  let whenText = "Due today";
  let dueLeftText = "Due today";

  if (dayDiff > 0) {
    whenText = `In ${dayDiff} ${unit}`;
    dueLeftText = `${dayDiff} ${unit} left`;
  } else if (dayDiff < 0) {
    whenText = `${Math.abs(dayDiff)} ${unit} overdue`;
    dueLeftText = `${Math.abs(dayDiff)} ${unit} overdue`;
  }

  let reservationText = "";
  if (task.scheduledDate && task.scheduledSlot) {
    const reservationDate = parseDateOnly(task.scheduledDate)?.date;
    if (reservationDate) {
      reservationText = `已预约 ${reservationDate.getMonth() + 1}/${reservationDate.getDate()} ${task.scheduledSlot}`;
    }
  }

  return {
    id: task.id,
    title: task.title,
    courseCode: task.courseCode,
    courseName: task.courseName,
    courseLabel: task.courseName ? `${task.courseCode} · ${task.courseName}` : task.courseCode,
    dueAt: task.dueAt,
    dueDate: `${pad(dueDate.getMonth() + 1)}/${pad(dueDate.getDate())}`,
    whenText,
    dueLeftText,
    timeSlot: task.timeSlot,
    scheduledDate: task.scheduledDate || null,
    scheduledSlot: task.scheduledSlot || null,
    reservationText,
    priority: task.priority,
    status: task.status,
    completedAt: task.completedAt || null,
    archivedAt: task.archivedAt || null,
    isUrgent: dayDiff <= 1
  };
}

function seedTasks() {
  const base = new Date();
  const today = formatDateOnly(base);
  const tomorrow = formatDateOnly(new Date(base.getFullYear(), base.getMonth(), base.getDate() + 1));
  const plus2 = formatDateOnly(new Date(base.getFullYear(), base.getMonth(), base.getDate() + 2));

  const makeDue = (days, hour, minute) => {
    const date = new Date(base.getFullYear(), base.getMonth(), base.getDate() + days, hour, minute, 0, 0);
    return formatLocalDateTime(date);
  };

  const createdAt = formatLocalDateTime(base);

  return [
    {
      id: crypto.randomUUID(),
      title: "Calculus Midterm Review",
      courseCode: "MAD3033",
      courseName: "Calculus II",
      dueAt: makeDue(2, 9, 0),
      timeSlot: "AM",
      scheduledDate: today,
      scheduledSlot: "AM",
      priority: "mid",
      status: "pending",
      createdAt,
      completedAt: null,
      archivedAt: null
    },
    {
      id: crypto.randomUUID(),
      title: "Lab 3: Binary Tree Traversal",
      courseCode: "COP3530",
      courseName: "Data Structures",
      dueAt: makeDue(0, 15, 0),
      timeSlot: "PM",
      scheduledDate: today,
      scheduledSlot: "PM",
      priority: "high",
      status: "pending",
      createdAt,
      completedAt: null,
      archivedAt: null
    },
    {
      id: crypto.randomUUID(),
      title: "Essay Draft v2",
      courseCode: "ENG2210",
      courseName: "English Writing",
      dueAt: makeDue(3, 18, 30),
      timeSlot: "EVE",
      scheduledDate: tomorrow,
      scheduledSlot: "EVE",
      priority: "mid",
      status: "pending",
      createdAt,
      completedAt: null,
      archivedAt: null
    },
    {
      id: crypto.randomUUID(),
      title: "Chapter 7 Exercises",
      courseCode: "STA3032",
      courseName: "Probability",
      dueAt: makeDue(5, 20, 0),
      timeSlot: "NIT",
      scheduledDate: tomorrow,
      scheduledSlot: "NIT",
      priority: "low",
      status: "pending",
      createdAt,
      completedAt: null,
      archivedAt: null
    },
    {
      id: crypto.randomUUID(),
      title: "Group Project Proposal",
      courseCode: "CEN4010",
      courseName: "Software Engineering",
      dueAt: makeDue(7, 14, 0),
      timeSlot: "PM",
      scheduledDate: plus2,
      scheduledSlot: "PM",
      priority: "low",
      status: "pending",
      createdAt,
      completedAt: null,
      archivedAt: null
    },
    {
      id: crypto.randomUUID(),
      title: "Linear Algebra HW4",
      courseCode: "MAS3105",
      courseName: "Linear Algebra",
      dueAt: makeDue(4, 10, 0),
      timeSlot: "AM",
      scheduledDate: tomorrow,
      scheduledSlot: "AM",
      priority: "low",
      status: "pending",
      createdAt,
      completedAt: null,
      archivedAt: null
    },
    {
      id: crypto.randomUUID(),
      title: "Reading Report · Paper Review",
      courseCode: "ENC3241",
      courseName: "Academic Writing",
      dueAt: makeDue(8, 19, 30),
      timeSlot: "EVE",
      scheduledDate: plus2,
      scheduledSlot: "EVE",
      priority: "low",
      status: "pending",
      createdAt,
      completedAt: null,
      archivedAt: null
    },
    {
      id: crypto.randomUUID(),
      title: "Discrete Math Quiz Prep",
      courseCode: "MAD2104",
      courseName: "Discrete Mathematics",
      dueAt: makeDue(-1, 10, 0),
      timeSlot: "AM",
      scheduledDate: null,
      scheduledSlot: null,
      priority: "mid",
      status: "completed",
      createdAt,
      completedAt: makeDue(-1, 12, 0),
      archivedAt: null
    },
    {
      id: crypto.randomUUID(),
      title: "Physics Problem Set",
      courseCode: "PHY2048",
      courseName: "General Physics",
      dueAt: makeDue(-2, 21, 0),
      timeSlot: "NIT",
      scheduledDate: null,
      scheduledSlot: null,
      priority: "mid",
      status: "completed",
      createdAt,
      completedAt: makeDue(-2, 22, 0),
      archivedAt: null
    }
  ];
}

function createSeedStore() {
  return {
    metadata: {
      weather: "Cloudy · 3°C / 8°C",
      semester: "Week 8 · 2026 Spring"
    },
    tasks: seedTasks()
  };
}

function normalizeStore(store) {
  const normalized = store && typeof store === "object" ? { ...store } : {};

  if (!Array.isArray(normalized.tasks)) {
    normalized.tasks = [];
  }
  if (!normalized.metadata || typeof normalized.metadata !== "object") {
    normalized.metadata = {};
  }

  return normalized;
}

function getFirestoreDocRef() {
  if (STORE_PROVIDER !== "firestore") {
    return null;
  }

  if (firestoreDocRef) {
    return firestoreDocRef;
  }

  let Firestore;
  try {
    ({ Firestore } = require("@google-cloud/firestore"));
  } catch {
    throw new Error(
      'Missing dependency "@google-cloud/firestore". Run "npm install" before using STORE_PROVIDER=firestore.'
    );
  }

  const db = new Firestore();
  firestoreDocRef = db.collection(FIRESTORE_COLLECTION).doc(FIRESTORE_DOC_ID);
  return firestoreDocRef;
}

function ensureDataFile() {
  fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });

  if (fs.existsSync(DATA_PATH)) {
    return;
  }

  const store = createSeedStore();
  fs.writeFileSync(DATA_PATH, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

async function ensureFirestoreStore() {
  const docRef = getFirestoreDocRef();
  const snapshot = await docRef.get();

  if (snapshot.exists) {
    return;
  }

  const seedStore = createSeedStore();
  try {
    await docRef.create(seedStore);
  } catch (error) {
    const code = typeof error.code === "number" ? error.code : String(error.code || "");
    if (code !== 6 && code !== "6" && code !== "already-exists") {
      throw error;
    }
  }
}

async function ensureStore() {
  if (storeInitPromise) {
    await storeInitPromise;
    return;
  }

  storeInitPromise = (async () => {
    if (STORE_PROVIDER === "firestore") {
      await ensureFirestoreStore();
      return;
    }

    if (STORE_PROVIDER !== "file") {
      throw new Error(`Unsupported STORE_PROVIDER: ${STORE_PROVIDER}`);
    }

    ensureDataFile();
  })();

  try {
    await storeInitPromise;
  } catch (error) {
    storeInitPromise = null;
    throw error;
  }
}

async function loadStore() {
  await ensureStore();

  if (STORE_PROVIDER === "firestore") {
    const docRef = getFirestoreDocRef();
    const snapshot = await docRef.get();

    if (!snapshot.exists) {
      return normalizeStore(createSeedStore());
    }

    return normalizeStore(snapshot.data());
  }

  const raw = fs.readFileSync(DATA_PATH, "utf8");
  return normalizeStore(JSON.parse(raw));
}

async function saveStore(store) {
  const normalized = normalizeStore(store);

  if (STORE_PROVIDER === "firestore") {
    const docRef = getFirestoreDocRef();
    await docRef.set(JSON.parse(JSON.stringify(normalized)));
    return;
  }

  fs.writeFileSync(DATA_PATH, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
}

function buildDashboard(store, options = {}) {
  const now = new Date();
  const todayKey = formatDateOnly(now);
  const semesterLabel = getSemesterLabel(now);
  const weatherText = options.weatherText || store.metadata.weather || "Cloudy · 3°C / 8°C";
  const todayForecast = pickTodayForecastDay(options.weatherForecast3d, now);

  const pendingTasksRaw = store.tasks.filter((task) => task.status === "pending").sort(compareDue);
  const completedTasksRaw = store.tasks.filter((task) => task.status === "completed").sort(compareDue);

  const pendingTasks = pendingTasksRaw.map((task) => taskView(task, now));
  const completedTasks = completedTasksRaw.map((task) => taskView(task, now));

  const upNext = pendingTasks[0] || null;
  const highlightedSlot = upNext ? upNext.timeSlot : "AM";

  const timeBlocks = ["AM", "PM", "EVE", "NIT"].map((slot) => {
    const slotTask = pendingTasks.find((task) => task.scheduledDate === todayKey && task.scheduledSlot === slot) || null;
    return { slot, task: slotTask };
  });

  const highlighted = timeBlocks.find((item) => item.task);
  const totalCount = pendingTasks.length + completedTasks.length;
  const completedCount = completedTasks.length;
  const progressPercent = totalCount === 0 ? 0 : Number(((completedCount / totalCount) * 100).toFixed(2));
  const urgentCount = pendingTasks.filter((task) => task.isUrgent).length;

  return {
    today: {
      weekday: now.toLocaleDateString("en-US", { weekday: "short" }),
      month: now.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
      day: now.getDate(),
      weather: weatherText,
      weatherDate: todayForecast?.date || null,
      weatherIconCode: todayForecast?.iconDay || todayForecast?.iconNight || null,
      semester: semesterLabel
    },
    summary: {
      pendingCount: pendingTasks.length,
      urgentCount,
      totalCount,
      completedCount,
      progressPercent
    },
    upNext,
    timeBlocks,
    highlightedSlot: highlighted ? highlighted.slot : highlightedSlot,
    tasks: {
      pending: pendingTasks,
      completed: completedTasks
    },
    weatherForecast3d: options.weatherForecast3d || null,
    refreshTime: `${now.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Shanghai"
    })} UTC+8`
  };
}

function buildSchedule(store, days = 7) {
  const now = new Date();
  const safeDays = Number.isFinite(days) ? Math.min(Math.max(days, 1), 14) : 7;
  const pendingTasks = store.tasks.filter((task) => task.status === "pending").map((task) => taskView(task, now));
  const slots = ["AM", "PM", "EVE", "NIT"];

  const rows = [];
  for (let offset = 0; offset < safeDays; offset += 1) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    const dateKey = formatDateOnly(date);
    const weekday = date.toLocaleDateString("en-US", { weekday: "short" });
    const dateLabel = `${date.getMonth() + 1}/${date.getDate()}`;

    const slotEntries = slots.map((slot) => {
      const task = pendingTasks.find((item) => item.scheduledDate === dateKey && item.scheduledSlot === slot) || null;
      return { slot, task };
    });

    rows.push({
      date: dateKey,
      label: `${dateLabel} ${weekday}`,
      slots: slotEntries
    });
  }

  return { days: safeDays, rows };
}

function appendVaryHeader(res, value) {
  const existing = res.getHeader("Vary");
  if (!existing) {
    res.setHeader("Vary", value);
    return;
  }

  const values = new Set(
    String(existing)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  );
  values.add(value);
  res.setHeader("Vary", Array.from(values).join(", "));
}

function setCorsHeaders(req, res) {
  const origin = req.headers.origin;
  if (!origin) {
    return true;
  }

  if (ALLOW_ORIGINS.length === 0) {
    return true;
  }

  const allowAll = ALLOW_ORIGINS.includes("*");
  const allowed = allowAll || ALLOW_ORIGINS.includes(origin);

  if (!allowed) {
    return false;
  }

  appendVaryHeader(res, "Origin");
  res.setHeader("Access-Control-Allow-Origin", allowAll ? "*" : origin);
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    String(req.headers["access-control-request-headers"] || "Content-Type")
  );
  res.setHeader("Access-Control-Max-Age", "3600");
  return true;
}

function jsonResponse(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Content-Length": Buffer.byteLength(payload)
  });
  res.end(payload);
}

function textResponse(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "text/plain; charset=utf-8",
    "Content-Length": Buffer.byteLength(body)
  });
  res.end(body);
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error("Body too large"));
        req.destroy();
      }
    });

    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });

    req.on("error", (error) => reject(error));
  });
}

function assertNoScheduleConflict(tasks) {
  const bookedSlots = new Map();

  for (const task of tasks) {
    if (task.status !== "pending" || !task.scheduledDate || !task.scheduledSlot) {
      continue;
    }

    const key = `${task.scheduledDate}#${task.scheduledSlot}`;
    const existingTask = bookedSlots.get(key);
    if (existingTask) {
      throw new Error(`schedule conflict: ${task.scheduledDate} ${task.scheduledSlot} is already occupied`);
    }
    bookedSlots.set(key, task.id);
  }
}

function validateNewTask(input) {
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const courseCode = typeof input.courseCode === "string" ? input.courseCode.trim().toUpperCase() : "";
  const courseName = typeof input.courseName === "string" ? input.courseName.trim() : "";
  const dueAtInfo = parseLocalDateTime(input.dueAt);
  const rawTimeSlot = typeof input.timeSlot === "string" ? input.timeSlot.trim() : "";
  const priority = typeof input.priority === "string" ? input.priority.trim() : "mid";
  const rawScheduledDate = input.scheduledDate;
  const rawScheduledSlot = input.scheduledSlot;
  let scheduledDate = null;
  let scheduledSlot = null;

  if (!title) {
    throw new Error("title is required");
  }
  if (!courseCode) {
    throw new Error("courseCode is required");
  }
  if (!dueAtInfo) {
    throw new Error("dueAt must be YYYY-MM-DDTHH:mm");
  }
  if (rawTimeSlot && !VALID_SLOTS.has(rawTimeSlot)) {
    throw new Error("timeSlot must be one of AM, PM, EVE, NIT");
  }
  if (!VALID_PRIORITIES.has(priority)) {
    throw new Error("priority must be one of high, mid, low");
  }

  const timeSlot = rawTimeSlot || inferPreferredSlot(dueAtInfo.date);

  if (rawScheduledDate != null && rawScheduledDate !== "") {
    const scheduledDateInfo = parseDateOnly(String(rawScheduledDate));
    if (!scheduledDateInfo) {
      throw new Error("scheduledDate must be YYYY-MM-DD");
    }
    if (!isWithinSchedulingWindow(scheduledDateInfo.date)) {
      throw new Error("scheduledDate must be within today and the next 6 days");
    }
    scheduledDate = scheduledDateInfo.normalized;
  }

  if (rawScheduledSlot != null && rawScheduledSlot !== "") {
    const slot = String(rawScheduledSlot).trim();
    if (!VALID_SLOTS.has(slot)) {
      throw new Error("scheduledSlot must be one of AM, PM, EVE, NIT");
    }
    scheduledSlot = slot;
  }

  if ((scheduledDate && !scheduledSlot) || (!scheduledDate && scheduledSlot)) {
    throw new Error("scheduledDate and scheduledSlot must be set together");
  }

  return {
    id: crypto.randomUUID(),
    title,
    courseCode,
    courseName,
    dueAt: dueAtInfo.normalized,
    timeSlot,
    scheduledDate,
    scheduledSlot,
    priority,
    status: "pending",
    createdAt: formatLocalDateTime(new Date()),
    completedAt: null,
    archivedAt: null
  };
}

function applyTaskPatch(task, patch) {
  if (typeof patch.title === "string") {
    const title = patch.title.trim();
    if (!title) {
      throw new Error("title cannot be empty");
    }
    task.title = title;
  }

  if (typeof patch.courseCode === "string") {
    const courseCode = patch.courseCode.trim().toUpperCase();
    if (!courseCode) {
      throw new Error("courseCode cannot be empty");
    }
    task.courseCode = courseCode;
  }

  if (typeof patch.courseName === "string") {
    task.courseName = patch.courseName.trim();
  }

  if (typeof patch.dueAt === "string") {
    const dueAtInfo = parseLocalDateTime(patch.dueAt);
    if (!dueAtInfo) {
      throw new Error("dueAt must be YYYY-MM-DDTHH:mm");
    }
    task.dueAt = dueAtInfo.normalized;
  }

  if (typeof patch.timeSlot === "string") {
    const timeSlot = patch.timeSlot.trim();
    if (!VALID_SLOTS.has(timeSlot)) {
      throw new Error("timeSlot must be one of AM, PM, EVE, NIT");
    }
    task.timeSlot = timeSlot;
  }

  if (typeof patch.priority === "string") {
    const priority = patch.priority.trim();
    if (!VALID_PRIORITIES.has(priority)) {
      throw new Error("priority must be one of high, mid, low");
    }
    task.priority = priority;
  }

  const hasScheduledDate = Object.prototype.hasOwnProperty.call(patch, "scheduledDate");
  const hasScheduledSlot = Object.prototype.hasOwnProperty.call(patch, "scheduledSlot");
  if (hasScheduledDate || hasScheduledSlot) {
    let nextScheduledDate = task.scheduledDate || null;
    let nextScheduledSlot = task.scheduledSlot || null;

    if (hasScheduledDate) {
      if (patch.scheduledDate === null || patch.scheduledDate === "") {
        nextScheduledDate = null;
      } else {
        const scheduledDateInfo = parseDateOnly(String(patch.scheduledDate));
        if (!scheduledDateInfo) {
          throw new Error("scheduledDate must be YYYY-MM-DD");
        }
        if (!isWithinSchedulingWindow(scheduledDateInfo.date)) {
          throw new Error("scheduledDate must be within today and the next 6 days");
        }
        nextScheduledDate = scheduledDateInfo.normalized;
      }
    }

    if (hasScheduledSlot) {
      if (patch.scheduledSlot === null || patch.scheduledSlot === "") {
        nextScheduledSlot = null;
      } else {
        const slot = String(patch.scheduledSlot).trim();
        if (!VALID_SLOTS.has(slot)) {
          throw new Error("scheduledSlot must be one of AM, PM, EVE, NIT");
        }
        nextScheduledSlot = slot;
      }
    }

    if ((nextScheduledDate && !nextScheduledSlot) || (!nextScheduledDate && nextScheduledSlot)) {
      throw new Error("scheduledDate and scheduledSlot must be set together");
    }

    task.scheduledDate = nextScheduledDate;
    task.scheduledSlot = nextScheduledSlot;
  }

  if (typeof patch.status === "string") {
    const status = patch.status.trim();
    if (!VALID_STATUSES.has(status)) {
      throw new Error("status must be pending, completed, or archived");
    }
    const prevStatus = task.status;
    task.status = status;

    if (status === "pending") {
      task.completedAt = null;
      task.archivedAt = null;
    } else if (status === "completed") {
      if (prevStatus !== "completed" || !task.completedAt) {
        task.completedAt = formatLocalDateTime(new Date());
      }
      task.archivedAt = null;
    } else if (status === "archived") {
      if (!task.completedAt) {
        task.completedAt = formatLocalDateTime(new Date());
      }
      task.archivedAt = formatLocalDateTime(new Date());
    }
  }
}

function serveStaticFile(req, res, pathname) {
  const routePath = pathname === "/" ? "/index.html" : pathname;
  const decodedPath = decodeURIComponent(routePath);
  const filePath = path.normalize(path.join(FRONTEND_ROOT, decodedPath));

  if (!filePath.startsWith(FRONTEND_ROOT)) {
    textResponse(res, 403, "Forbidden");
    return;
  }

  fs.stat(filePath, (error, stats) => {
    if (error || !stats.isFile()) {
      textResponse(res, 404, "Not Found");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType =
      {
        ".html": "text/html; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".js": "application/javascript; charset=utf-8",
        ".json": "application/json; charset=utf-8",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".svg": "image/svg+xml",
        ".ico": "image/x-icon"
      }[ext] || "application/octet-stream";

    fs.readFile(filePath, (readError, fileBuffer) => {
      if (readError) {
        textResponse(res, 500, "Failed to read file");
        return;
      }

      res.writeHead(200, {
        "Content-Type": contentType,
        "Content-Length": fileBuffer.length
      });
      res.end(fileBuffer);
    });
  });
}

async function handleApi(req, res, requestUrl) {
  const pathname = requestUrl.pathname;
  const method = req.method || "GET";

  if (method === "GET" && pathname === "/api/health") {
    jsonResponse(res, 200, {
      status: "ok",
      storeProvider: STORE_PROVIDER,
      timestamp: new Date().toISOString()
    });
    return;
  }

  if (method === "GET" && pathname === "/api/dashboard") {
    const store = await loadStore();
    let weatherForecast3d = null;
    let weatherText = null;

    try {
      weatherForecast3d = await fetchQWeatherForecast3d();
      weatherText = formatWeatherSummaryFromForecast(weatherForecast3d, new Date());
    } catch (error) {
      console.warn(`[weather] Failed to fetch QWeather 3d forecast: ${error.message || error}`);
    }

    jsonResponse(
      res,
      200,
      buildDashboard(store, {
        weatherText,
        weatherForecast3d
      })
    );
    return;
  }

  if (method === "GET" && pathname === "/api/weather/forecast3d") {
    if (!isQWeatherConfigured()) {
      jsonResponse(res, 503, {
        message: "QWeather is not configured",
        requiredEnv: ["QW_API_KEY"],
        optionalEnv: ["QW_API_HOST", "QW_LOCATION", "WEATHER_CACHE_MS"],
        location: QW_LOCATION
      });
      return;
    }

    try {
      const forecast3d = await fetchQWeatherForecast3d();
      jsonResponse(res, 200, {
        forecast3d,
        summaryText: formatWeatherSummaryFromForecast(forecast3d, new Date()),
        todayDateInWeatherTimezone: getDateKeyInTimeZone(new Date(), QW_TIME_ZONE),
        weatherTimeZone: QW_TIME_ZONE
      });
    } catch (error) {
      jsonResponse(res, 502, {
        message: "Failed to fetch QWeather forecast",
        error: error.message || String(error)
      });
    }
    return;
  }

  if (method === "GET" && pathname === "/api/tasks") {
    const store = await loadStore();
    const tasks = store.tasks.sort(compareDue).map((task) => taskView(task));
    jsonResponse(res, 200, { tasks });
    return;
  }

  if (method === "GET" && pathname === "/api/schedule") {
    const store = await loadStore();
    const days = Number(requestUrl.searchParams.get("days") || 7);
    jsonResponse(res, 200, buildSchedule(store, days));
    return;
  }

  if (method === "POST" && pathname === "/api/tasks") {
    try {
      const body = await parseJsonBody(req);
      const task = validateNewTask(body);

      const store = await loadStore();
      store.tasks.push(task);
      assertNoScheduleConflict(store.tasks);
      await saveStore(store);

      jsonResponse(res, 201, { task: taskView(task) });
    } catch (error) {
      jsonResponse(res, 400, { message: error.message || "Invalid task payload" });
    }
    return;
  }

  if (method === "PATCH" && pathname.startsWith("/api/tasks/")) {
    const taskId = pathname.slice("/api/tasks/".length);

    if (!taskId) {
      jsonResponse(res, 404, { message: "Task id is required" });
      return;
    }

    try {
      const body = await parseJsonBody(req);
      const store = await loadStore();
      const task = store.tasks.find((item) => item.id === taskId);

      if (!task) {
        jsonResponse(res, 404, { message: "Task not found" });
        return;
      }

      applyTaskPatch(task, body);
      assertNoScheduleConflict(store.tasks);
      await saveStore(store);

      jsonResponse(res, 200, { task: taskView(task) });
    } catch (error) {
      jsonResponse(res, 400, { message: error.message || "Invalid task patch" });
    }
    return;
  }

  if (method === "DELETE" && pathname.startsWith("/api/tasks/")) {
    const taskId = pathname.slice("/api/tasks/".length);

    if (!taskId) {
      jsonResponse(res, 404, { message: "Task id is required" });
      return;
    }

    const store = await loadStore();
    const index = store.tasks.findIndex((item) => item.id === taskId);

    if (index < 0) {
      jsonResponse(res, 404, { message: "Task not found" });
      return;
    }

    const [removed] = store.tasks.splice(index, 1);
    await saveStore(store);
    jsonResponse(res, 200, { task: taskView(removed) });
    return;
  }

  jsonResponse(res, 404, { message: "API route not found" });
}

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  try {
    if (requestUrl.pathname === "/healthz") {
      textResponse(res, 200, "ok");
      return;
    }

    if (requestUrl.pathname.startsWith("/api/")) {
      const corsAllowed = setCorsHeaders(req, res);
      if (!corsAllowed) {
        jsonResponse(res, 403, { message: "Origin not allowed" });
        return;
      }

      if ((req.method || "GET") === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }

      await handleApi(req, res, requestUrl);
      return;
    }

    serveStaticFile(req, res, requestUrl.pathname);
  } catch (error) {
    jsonResponse(res, 500, { message: error.message || "Internal server error" });
  }
});

async function startServer() {
  await ensureStore();

  server.listen(PORT, () => {
    console.log(`Dashboard server listening on port ${PORT} (store=${STORE_PROVIDER})`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
