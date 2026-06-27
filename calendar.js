/** 农历与弹窗月历（1900–2100，数据源自 solarlunar） */
const LUNAR_INFO = [
  0x04bd8, 0x04ae0, 0x0a570, 0x054d5, 0x0d260, 0x0d950, 0x16554, 0x056a0, 0x09ad0, 0x055d2,
  0x04ae0, 0x0a5b6, 0x0a4d0, 0x0d250, 0x1d255, 0x0b540, 0x0d6a0, 0x0ada2, 0x095b0, 0x14977,
  0x04970, 0x0a4b0, 0x0b4b5, 0x06a50, 0x06d40, 0x1ab54, 0x02b60, 0x09570, 0x052f2, 0x04970,
  0x06566, 0x0d4a0, 0x0ea50, 0x06e95, 0x05ad0, 0x02b60, 0x186e3, 0x092e0, 0x1c8d7, 0x0c950,
  0x0d4a0, 0x1d8a6, 0x0b550, 0x056a0, 0x1a5b4, 0x025d0, 0x092d0, 0x0d2b2, 0x0a950, 0x0b557,
  0x06ca0, 0x0b550, 0x15355, 0x04da0, 0x0a5b0, 0x14573, 0x052b0, 0x0a9a8, 0x0e950, 0x06aa0,
  0x0aea6, 0x0ab50, 0x04b60, 0x0aae4, 0x0a570, 0x05260, 0x0f263, 0x0d950, 0x05b57, 0x056a0,
  0x096d0, 0x04dd5, 0x04ad0, 0x0a4d0, 0x0d4d4, 0x0d250, 0x0d558, 0x0b540, 0x0b6a0, 0x195a6,
  0x095b0, 0x049b0, 0x0a974, 0x0a4b0, 0x0b27a, 0x06a50, 0x06d40, 0x0af46, 0x0ab60, 0x09570,
  0x04af5, 0x04970, 0x064b0, 0x074a3, 0x0ea50, 0x06b58, 0x05ac0, 0x0ab60, 0x096d5, 0x092e0,
  0x0c960, 0x0d954, 0x0d4a0, 0x0da50, 0x07552, 0x056a0, 0x0abb7, 0x025d0, 0x092d0, 0x0cab5,
  0x0a950, 0x0b4a0, 0x0baa4, 0x0ad50, 0x055d9, 0x04ba0, 0x0a5b0, 0x15176, 0x052b0, 0x0a930,
  0x07954, 0x06aa0, 0x0ad50, 0x05b52, 0x04b60, 0x0a6e6, 0x0a4e0, 0x0d260, 0x0ea65, 0x0d530,
  0x05aa0, 0x076a3, 0x096d0, 0x04afb, 0x04ad0, 0x0a4d0, 0x1d0b6, 0x0d250, 0x0d520, 0x0dd45,
  0x0b5a0, 0x056d0, 0x055b2, 0x049b0, 0x0a577, 0x0a4b0, 0x0aa50, 0x1b255, 0x06d20, 0x0ada0,
  0x14b63, 0x09370, 0x049f8, 0x04970, 0x064b0, 0x168a6, 0x0ea50, 0x06b20, 0x1a6c4, 0x0aae0,
  0x092e0, 0x0d2e3, 0x0c960, 0x0d557, 0x0d4a0, 0x0da50, 0x05d55, 0x056a0, 0x0a6d0, 0x055d4,
  0x052d0, 0x0a9b8, 0x0a950, 0x0b4a0, 0x0b6a6, 0x0ad50, 0x055a0, 0x0aba4, 0x0a5b0, 0x052b0,
  0x0b273, 0x06930, 0x07337, 0x06aa0, 0x0ad50, 0x14b55, 0x04b60, 0x0a570, 0x054e4, 0x0d160,
  0x0e968, 0x0d520, 0x0daa0, 0x16aa6, 0x056d0, 0x04ae0, 0x0a9d4, 0x0a4d0, 0x0d150, 0x0f252,
  0x0d520,
];

const LUNAR_DAYS = ['初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
  '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'];

const SOLAR_HOLIDAYS = {
  '1-1': '元旦',
  '2-14': '情人节',
  '3-8': '妇女节',
  '5-1': '劳动节',
  '5-4': '青年节',
  '6-1': '儿童节',
  '7-1': '建党节',
  '8-1': '建军节',
  '9-10': '教师节',
  '10-1': '国庆节',
  '12-25': '圣诞节',
};

const LUNAR_HOLIDAYS = {
  '1-1': '春节',
  '1-15': '元宵',
  '5-5': '端午',
  '7-7': '七夕',
  '8-15': '中秋',
  '9-9': '重阳',
  '12-8': '腊八',
  '12-30': '除夕',
};

// 2026 年节气（月-日）
const SOLAR_TERMS_2026 = {
  '2-4': '立春', '2-18': '雨水', '3-5': '惊蛰', '3-20': '春分',
  '4-4': '清明', '4-20': '谷雨', '5-5': '立夏', '5-21': '小满',
  '6-5': '芒种', '6-21': '夏至', '7-7': '小暑', '7-23': '大暑',
  '8-7': '立秋', '8-23': '处暑', '9-7': '白露', '9-23': '秋分',
  '10-8': '寒露', '10-23': '霜降', '11-7': '立冬', '11-22': '小雪',
  '12-7': '大雪', '12-22': '冬至',
};

function lunarYearDays(y) {
  let sum = 348;
  const info = LUNAR_INFO[y - 1900];
  for (let i = 0x8000; i > 0x8; i >>= 1) {
    sum += info & i ? 1 : 0;
  }
  return sum + leapDays(y);
}

function leapMonth(y) {
  return LUNAR_INFO[y - 1900] & 0xf;
}

function leapDays(y) {
  if (leapMonth(y)) return LUNAR_INFO[y - 1900] & 0x10000 ? 30 : 29;
  return 0;
}

function monthDays(y, m) {
  return LUNAR_INFO[y - 1900] & (0x10000 >> m) ? 30 : 29;
}

function solarToLunar(date) {
  const base = new Date(1900, 0, 31);
  let offset = Math.floor((date - base) / 86400000);
  let year = 1900;
  let temp;

  for (; year < 2101 && offset > 0; year++) {
    temp = lunarYearDays(year);
    offset -= temp;
  }
  if (offset < 0) {
    offset += temp;
    year--;
  }

  const leap = leapMonth(year);
  let isLeap = false;
  let month = 1;

  for (; month < 13 && offset > 0; month++) {
    if (leap > 0 && month === leap + 1 && !isLeap) {
      month--;
      isLeap = true;
      temp = leapDays(year);
    } else {
      temp = monthDays(year, month);
    }
    if (isLeap && month === leap + 1) isLeap = false;
    offset -= temp;
  }

  if (offset === 0 && leap > 0 && month === leap + 1) {
    if (isLeap) {
      isLeap = false;
    } else {
      isLeap = true;
      month--;
    }
  }
  if (offset < 0) {
    offset += temp;
    month--;
  }

  return { year, month, day: offset + 1, isLeap };
}

function getDaySubLabel(date) {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const solarKey = `${m}-${d}`;

  if (SOLAR_HOLIDAYS[solarKey]) {
    return { text: SOLAR_HOLIDAYS[solarKey], kind: 'holiday' };
  }

  const lunar = solarToLunar(date);
  const lunarKey = `${lunar.month}-${lunar.day}`;
  if (LUNAR_HOLIDAYS[lunarKey]) {
    return { text: LUNAR_HOLIDAYS[lunarKey], kind: 'holiday' };
  }

  const term = SOLAR_TERMS_2026[solarKey];
  if (term && date.getFullYear() === 2026) {
    return { text: term, kind: 'term' };
  }

  return { text: LUNAR_DAYS[lunar.day - 1], kind: 'lunar' };
}

function isoWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function dateKeyFromParts(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function parseDateKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function buildMonthWeeks(year, month) {
  const first = new Date(year, month - 1, 1);
  const start = new Date(first);
  const dow = start.getDay();
  start.setDate(start.getDate() - (dow === 0 ? 6 : dow - 1));

  const weeks = [];
  let cursor = new Date(start);

  for (let w = 0; w < 6; w++) {
    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push({
      weekNum: isoWeekNumber(days[0]),
      days,
    });
    if (w >= 4 && days[6].getMonth() !== month - 1 && days[0].getMonth() !== month - 1) break;
  }
  return weeks;
}
