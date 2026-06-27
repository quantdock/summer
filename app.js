const START_DATE = dateOnly(2026, 5, 29);
const END_DATE = dateOnly(2026, 7, 30);

function dateOnly(y, m, d) {
  return new Date(y, m, d);
}

function isInRange(d) {
  const t = d.getTime();
  return t >= START_DATE.getTime() && t <= END_DATE.getTime();
}
const TIME_START = 8;
const TIME_END = 21;
const SLOT_MINUTES = 30;
const WEEKDAYS = ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日'];
const WEEKDAY_CLASSES = ['weekday-mon', 'weekday-tue', 'weekday-wed', 'weekday-thu', 'weekday-fri', 'weekday-sat', 'weekday-sun'];
const DATA_VERSION = 4;
const API_SCHEDULE = '/api/schedule';
const PERSON_OPTIONS = ['哥哥', '妹妹'];

const PALETTE = [
  '#92A5D1', '#C5DFF4', '#AEB2D1', '#D9B9D4',
  '#7C9895', '#C9DCC4', '#DAA87C', '#F4EEAC',
];

let scheduleData = { activities: [], colorMap: {} };
let editingContext = null;
let saveInFlight = null;
let calViewYear = 2026;
let calViewMonth = 7;
let selectedDates = new Set();

const $ = (sel) => document.querySelector(sel);

function formatDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDisplayDate(d) {
  return `${d.getMonth() + 1}-${d.getDate()}`;
}

function parseTime(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function formatTimeRange(start, end) {
  return `${start.slice(0, 5)} - ${end.slice(0, 5)}`;
}

function timeToMinutes(h, m) {
  return h * 60 + m;
}

function minutesToTop(minutes) {
  const startMinutes = TIME_START * 60;
  const slotCount = (minutes - startMinutes) / SLOT_MINUTES;
  return slotCount * parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--slot-height') || '28');
}

function durationToHeight(startStr, endStr) {
  const start = parseTime(startStr);
  const end = parseTime(endStr);
  const slots = (end - start) / SLOT_MINUTES;
  const slotHeight = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--slot-height') || '28');
  return slots * slotHeight;
}

function getWeeks() {
  const weeks = [];
  let current = new Date(START_DATE);
  // Align to Monday
  const day = current.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  current.setDate(current.getDate() + diff);

  while (current <= END_DATE) {
    const weekStart = new Date(current);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      days.push(d);
    }
    const weekEnd = days[6];
    if (weekEnd >= START_DATE && weekStart <= END_DATE) {
      weeks.push({ start: weekStart, days });
    }
    current.setDate(current.getDate() + 7);
  }
  return weeks;
}

function getColorForTitle(title) {
  if (scheduleData.colorMap[title] && PALETTE.includes(scheduleData.colorMap[title])) {
    return scheduleData.colorMap[title];
  }
  const used = Object.values(scheduleData.colorMap).filter(c => PALETTE.includes(c));
  const available = PALETTE.find(c => !used.includes(c)) || PALETTE[Object.keys(scheduleData.colorMap).length % PALETTE.length];
  scheduleData.colorMap[title] = available;
  return available;
}

function initColorPalette() {
  const container = $('#activityColorPalette');
  container.innerHTML = '';
  PALETTE.forEach((color) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'color-swatch';
    btn.style.backgroundColor = color;
    btn.dataset.color = color;
    btn.title = color;
    btn.addEventListener('click', () => setSelectedColor(color));
    container.appendChild(btn);
  });
}

function setSelectedColor(color) {
  const value = PALETTE.includes(color) ? color : PALETTE[0];
  $('#activityColor').value = value;
  $('#activityColorPalette').querySelectorAll('.color-swatch').forEach((el) => {
    el.classList.toggle('selected', el.dataset.color === value);
  });
}

function getSelectedColor() {
  const color = $('#activityColor').value;
  return PALETTE.includes(color) ? color : PALETTE[0];
}

function resolveActivityColor(act) {
  const stored = act.color || scheduleData.colorMap[act.title];
  if (stored && PALETTE.includes(stored)) return stored;
  return getColorForTitle(act.title);
}

function getTextColor(bgColor) {
  const hex = bgColor.replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#333' : '#fff';
}

function generateId() {
  return 'act_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
}

function getActivityPersons(act) {
  if (Array.isArray(act.persons) && act.persons.length) return act.persons;
  if (act.person) return [act.person];
  return [];
}

function formatPersonsLabel(persons) {
  if (persons.length === PERSON_OPTIONS.length) return '兄妹';
  return persons.join('·');
}

function setPersonCheckboxes(persons) {
  $('#activityPersons').querySelectorAll('input[type="checkbox"]').forEach((cb) => {
    cb.checked = persons.includes(cb.value);
  });
}

function getSelectedPersons() {
  return [...$('#activityPersons').querySelectorAll('input[type="checkbox"]:checked')].map((cb) => cb.value);
}

function getFilterPersons() {
  return [...$('#personFilter').querySelectorAll('input[type="checkbox"]:checked')].map((cb) => cb.value);
}

function isFilterShowAll() {
  return getFilterPersons().length === PERSON_OPTIONS.length;
}

function activityMatchesFilter(act) {
  const selected = getFilterPersons();
  if (!selected.length) return false;
  const persons = getActivityPersons(act);
  return selected.some((p) => persons.includes(p));
}

function getActivitiesForDay(dateKey) {
  return scheduleData.activities.filter(a => a.date === dateKey && activityMatchesFilter(a));
}

function layoutDayActivities(activities) {
  if (!activities.length) return [];

  const items = activities.map((act) => ({
    act,
    start: parseTime(act.startTime),
    end: parseTime(act.endTime),
    col: 0,
    colCount: 1,
  }));

  items.sort((a, b) => a.start - b.start || b.end - a.end);

  const columnEnds = [];
  for (const item of items) {
    let placed = false;
    for (let i = 0; i < columnEnds.length; i++) {
      if (columnEnds[i] <= item.start) {
        item.col = i;
        columnEnds[i] = item.end;
        placed = true;
        break;
      }
    }
    if (!placed) {
      item.col = columnEnds.length;
      columnEnds.push(item.end);
    }
  }

  for (const item of items) {
    const overlapping = items.filter((o) => o.start < item.end && item.start < o.end);
    item.colCount = Math.max(...overlapping.map((o) => o.col)) + 1;
  }

  return items;
}

function renderSchedule() {
  const container = $('#scheduleContainer');
  container.innerHTML = '';
  const weeks = getWeeks();
  const totalSlots = ((TIME_END - TIME_START) * 60) / SLOT_MINUTES;

  weeks.forEach(({ days }) => {
    const block = document.createElement('div');
    block.className = 'week-block';

    // Header row
    const header = document.createElement('div');
    header.className = 'week-header';
    header.innerHTML = '<div class="corner"></div>';
    days.forEach((d, i) => {
      const inRange = isInRange(d);
      const isWeekend = i >= 5;
      const cell = document.createElement('div');
      cell.className = `day-header ${WEEKDAY_CLASSES[i]}${isWeekend ? ' weekend' : ''}`;
      if (inRange) {
        cell.innerHTML = `<div class="date">${formatDisplayDate(d)}</div><div class="weekday">${WEEKDAYS[i]}</div>`;
      } else {
        cell.innerHTML = `<div class="date">—</div><div class="weekday">${WEEKDAYS[i]}</div>`;
        cell.style.opacity = '0.4';
      }
      header.appendChild(cell);
    });
    block.appendChild(header);

    // Body
    const body = document.createElement('div');
    body.className = 'week-body';

    // Time labels
    const timeLabels = document.createElement('div');
    timeLabels.className = 'time-labels';
    for (let s = 0; s < totalSlots; s++) {
      const minutes = TIME_START * 60 + s * SLOT_MINUTES;
      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      const label = document.createElement('div');
      label.className = 'time-label' + (m === 0 ? ' hour-mark' : ' half-hour-mark');
      label.textContent = m === 0 ? `${h}:00` : '';
      timeLabels.appendChild(label);
    }
    body.appendChild(timeLabels);

    // Day columns
    days.forEach((d, dayIndex) => {
      const dateKey = formatDateKey(d);
      const inRange = isInRange(d);
      const isWeekend = dayIndex >= 5;
      const col = document.createElement('div');
      col.className = `day-column${isWeekend ? ' weekend' : ''}`;
      col.dataset.date = dateKey;

      for (let s = 0; s < totalSlots; s++) {
        const minutes = TIME_START * 60 + s * SLOT_MINUTES;
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        const slot = document.createElement('div');
        slot.className = 'time-slot' + (m === 0 ? ' hour-start' : ' half-hour');
        slot.dataset.date = dateKey;
        slot.dataset.time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        if (inRange) {
          slot.addEventListener('click', () => openAddDialog(dateKey, slot.dataset.time));
        } else {
          slot.style.cursor = 'default';
          slot.style.opacity = '0.3';
        }
        col.appendChild(slot);
      }

      if (inRange) {
        const layouts = layoutDayActivities(getActivitiesForDay(dateKey));
        layouts.forEach(({ act, col: colIndex, colCount }) => {
          const el = document.createElement('div');
          el.className = 'activity-block';
          const bg = resolveActivityColor(act);
          el.style.backgroundColor = bg;
          el.style.color = getTextColor(bg);
          const top = minutesToTop(parseTime(act.startTime));
          const height = durationToHeight(act.startTime, act.endTime);
          el.style.top = `${top}px`;
          el.style.height = `${height}px`;

          const widthPct = 100 / colCount;
          const leftPct = colIndex * widthPct;
          el.style.left = `calc(${leftPct}% + 1px)`;
          el.style.width = `calc(${widthPct}% - 2px)`;
          el.style.zIndex = String(2 + colIndex);

          const persons = getActivityPersons(act);
          el.innerHTML = `
            <span class="act-title">${escapeHtml(act.title)}</span>
            <span class="act-time">${formatTimeRange(act.startTime, act.endTime)}</span>
            ${isFilterShowAll() && persons.length ? `<span class="act-person">${escapeHtml(formatPersonsLabel(persons))}</span>` : ''}
          `;
          el.addEventListener('click', (e) => {
            e.stopPropagation();
            openEditDialog(act);
          });
          col.appendChild(el);
        });
      }

      body.appendChild(col);
    });

    block.appendChild(body);
    container.appendChild(block);
  });
}

function isDateSelectable(d) {
  const t = d.getTime();
  return t >= START_DATE.getTime() && t <= END_DATE.getTime();
}

function initCalendarView(dateKey) {
  const d = parseDateKey(dateKey);
  calViewYear = d.getFullYear();
  calViewMonth = d.getMonth() + 1;
  selectedDates = new Set([dateKey]);
  renderMonthCalendar();
}

function renderMonthCalendar() {
  const container = $('#monthCalendar');
  $('#calTitle').textContent = `${calViewYear}年 ${calViewMonth}月`;

  const weeks = buildMonthWeeks(calViewYear, calViewMonth);
  const weekdays = ['一', '二', '三', '四', '五', '六', '日'];

  let html = '<div class="cal-head"><span>周</span>';
  weekdays.forEach((w, i) => {
    html += `<span class="${i >= 5 ? 'weekend' : ''}">${w}</span>`;
  });
  html += '</div>';

  weeks.forEach(({ weekNum, days }) => {
    html += `<div class="cal-row"><div class="cal-week-num">${weekNum}</div>`;
    days.forEach((day, i) => {
      const key = formatDateKey(day);
      const inMonth = day.getMonth() + 1 === calViewMonth;
      const selectable = isDateSelectable(day);
      const selected = selectedDates.has(key);
      const sub = getDaySubLabel(day);
      const classes = [
        'cal-cell',
        i >= 5 ? 'weekend' : '',
        !inMonth ? 'other-month' : '',
        !selectable ? 'disabled' : '',
        selected ? 'selected' : '',
      ].filter(Boolean).join(' ');

      html += `<div class="${classes}" data-date="${key}" data-selectable="${selectable}">
        <span class="cal-solar">${day.getDate()}</span>
        <span class="cal-sub ${sub.kind}">${escapeHtml(sub.text)}</span>
      </div>`;
    });
    html += '</div>';
  });

  container.innerHTML = html;
  container.querySelectorAll('.cal-cell[data-selectable="true"]').forEach((cell) => {
    cell.addEventListener('click', () => toggleCalendarDate(cell.dataset.date));
  });
}

function toggleCalendarDate(dateKey) {
  if (!isDateSelectable(parseDateKey(dateKey))) return;
  if (selectedDates.has(dateKey)) {
    if (selectedDates.size > 1) selectedDates.delete(dateKey);
  } else {
    selectedDates.add(dateKey);
  }
  renderMonthCalendar();
}

function shiftCalendarMonth(delta) {
  calViewMonth += delta;
  if (calViewMonth > 12) {
    calViewMonth = 1;
    calViewYear++;
  } else if (calViewMonth < 1) {
    calViewMonth = 12;
    calViewYear--;
  }
  renderMonthCalendar();
}

function getSelectedCalendarDates() {
  return [...selectedDates].sort();
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function openAddDialog(dateKey, timeStr) {
  editingContext = { mode: 'add' };
  $('#dialogTitle').textContent = '添加日程';
  $('#datePickerGroup').hidden = false;
  initCalendarView(dateKey);
  const selected = getFilterPersons();
  const defaultPersons = selected.length ? selected : [...PERSON_OPTIONS];
  setPersonCheckboxes(defaultPersons);
  $('#activityTitle').value = '';
  $('#activityStart').value = timeStr;
  const endMinutes = parseTime(timeStr) + 90;
  const eh = Math.floor(endMinutes / 60);
  const em = endMinutes % 60;
  $('#activityEnd').value = `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;
  setSelectedColor(PALETTE[0]);
  $('#deleteBtn').hidden = true;
  $('#editDialog').showModal();
}

function openEditDialog(act) {
  editingContext = { mode: 'edit', activity: act };
  $('#dialogTitle').textContent = '编辑日程';
  $('#datePickerGroup').hidden = true;
  setPersonCheckboxes(getActivityPersons(act));
  $('#activityTitle').value = act.title;
  $('#activityStart').value = act.startTime.slice(0, 5);
  $('#activityEnd').value = act.endTime.slice(0, 5);
  setSelectedColor(resolveActivityColor(act));
  $('#deleteBtn').hidden = false;
  $('#editDialog').showModal();
}

async function saveActivityFromForm(e) {
  e.preventDefault();
  const persons = getSelectedPersons();
  const title = $('#activityTitle').value.trim();
  const startTime = $('#activityStart').value;
  const endTime = $('#activityEnd').value;
  const color = getSelectedColor();

  if (!persons.length) {
    showToast('请至少选择一位参与人');
    return;
  }
  if (!title) {
    showToast('请填写活动名称');
    return;
  }
  if (parseTime(startTime) >= parseTime(endTime)) {
    showToast('结束时间必须晚于开始时间');
    return;
  }

  scheduleData.colorMap[title] = color;
  let addedCount = 0;

  if (editingContext.mode === 'add') {
    const dates = getSelectedCalendarDates();
    if (!dates.length) {
      showToast('请至少选择一个日期');
      return;
    }
    dates.forEach((date) => {
      scheduleData.activities.push({
        id: generateId(),
        persons,
        date,
        title,
        startTime,
        endTime,
        color,
      });
    });
    addedCount = dates.length;
  } else {
    const act = editingContext.activity;
    const idx = scheduleData.activities.findIndex(a => a.id === act.id);
    if (idx >= 0) {
      scheduleData.activities[idx] = { ...act, persons, title, startTime, endTime, color };
      delete scheduleData.activities[idx].person;
    }
    scheduleData.activities.forEach(a => {
      if (a.title === title) a.color = color;
    });
  }

  try {
    await persistSchedule();
    $('#editDialog').close();
    renderSchedule();
    showToast(addedCount > 1 ? `已添加 ${addedCount} 天` : '已保存');
  } catch {
    showToast('保存失败，请确认 server.py 正在运行');
  }
}

async function deleteActivity() {
  if (editingContext?.mode !== 'edit') return;
  const id = editingContext.activity.id;
  scheduleData.activities = scheduleData.activities.filter(a => a.id !== id);
  try {
    await persistSchedule();
    $('#editDialog').close();
    renderSchedule();
    showToast('已删除');
  } catch {
    showToast('保存失败，请确认 server.py 正在运行');
  }
}

function normalizeScheduleData(data) {
  if (!data || typeof data !== 'object') {
    return { version: DATA_VERSION, activities: [], colorMap: {} };
  }
  const activities = (Array.isArray(data.activities) ? data.activities : []).map((a) => {
    const persons = Array.isArray(a.persons) && a.persons.length
      ? a.persons
      : (a.person ? [a.person] : []);
    const { person, ...rest } = a;
    return { ...rest, persons };
  });
  return {
    version: typeof data.version === 'number' ? data.version : DATA_VERSION,
    activities,
    colorMap: data.colorMap && typeof data.colorMap === 'object' ? data.colorMap : {},
  };
}

function setSaveStatus(state, text) {
  const el = $('#saveStatus');
  el.hidden = !text;
  el.textContent = text || '';
  el.className = 'save-status' + (state ? ` ${state}` : '');
}

async function loadScheduleFromServer() {
  const resp = await fetch(API_SCHEDULE, { cache: 'no-store' });
  if (!resp.ok) throw new Error('load failed');
  return normalizeScheduleData(await resp.json());
}

async function persistSchedule() {
  scheduleData.version = DATA_VERSION;
  const payload = JSON.stringify(scheduleData);

  if (saveInFlight) await saveInFlight;

  saveInFlight = (async () => {
    setSaveStatus('saving', '保存中…');
    const resp = await fetch(API_SCHEDULE, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
    });
    if (!resp.ok) throw new Error('save failed');
    setSaveStatus('', '已同步');
    setTimeout(() => {
      if ($('#saveStatus').textContent === '已同步') setSaveStatus('', '');
    }, 2000);
  })();

  try {
    await saveInFlight;
  } catch (err) {
    setSaveStatus('error', '保存失败');
    throw err;
  } finally {
    saveInFlight = null;
  }
}

function showToast(msg) {
  const toast = $('#toast');
  toast.textContent = msg;
  toast.hidden = false;
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => { toast.hidden = true; }, 2500);
}

function initEvents() {
  initColorPalette();
  $('#personFilter').addEventListener('change', renderSchedule);
  $('#calPrev').addEventListener('click', () => shiftCalendarMonth(-1));
  $('#calNext').addEventListener('click', () => shiftCalendarMonth(1));
  $('#editForm').addEventListener('submit', saveActivityFromForm);
  $('#cancelBtn').addEventListener('click', () => $('#editDialog').close());
  $('#deleteBtn').addEventListener('click', deleteActivity);

  $('#activityTitle').addEventListener('input', (e) => {
    const title = e.target.value.trim();
    if (title && scheduleData.colorMap[title]) {
      setSelectedColor(scheduleData.colorMap[title]);
    }
  });
}

async function init() {
  initEvents();

  try {
    scheduleData = await loadScheduleFromServer();
    $('#loadError').hidden = true;
  } catch {
    $('#loadError').hidden = false;
    scheduleData = { version: DATA_VERSION, activities: [], colorMap: {} };
  }

  renderSchedule();
}

init();
