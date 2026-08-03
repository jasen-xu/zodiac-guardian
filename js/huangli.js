/**
 * 黄历择日 - 页面交互逻辑
 */

let currentEventType = '嫁娶';
let calendarYear, calendarMonth;

document.addEventListener('DOMContentLoaded', function() {
    const today = new Date();
    calendarYear = today.getFullYear();
    calendarMonth = today.getMonth() + 1;

    initDatePicker();
    renderToday();
    renderCalendar();
});

// 初始化日期选择器
function initDatePicker() {
    const now = new Date();
    const yearSel = document.getElementById('yearSelect');
    const monthSel = document.getElementById('monthSelect');
    const daySel = document.getElementById('daySelect');

    for (let y = 1950; y <= 2060; y++) {
        const opt = document.createElement('option');
        opt.value = y; opt.textContent = y + '年';
        if (y === now.getFullYear()) opt.selected = true;
        yearSel.appendChild(opt);
    }
    for (let m = 1; m <= 12; m++) {
        const opt = document.createElement('option');
        opt.value = m; opt.textContent = m + '月';
        if (m === now.getMonth() + 1) opt.selected = true;
        monthSel.appendChild(opt);
    }
    updateDayOptions();
}

function updateDayOptions() {
    const year = parseInt(document.getElementById('yearSelect').value);
    const month = parseInt(document.getElementById('monthSelect').value);
    const daySel = document.getElementById('daySelect');
    const maxDay = new Date(year, month, 0).getDate();
    const curDay = parseInt(daySel.value) || new Date().getDate();

    daySel.innerHTML = '';
    for (let d = 1; d <= maxDay; d++) {
        const opt = document.createElement('option');
        opt.value = d; opt.textContent = d + '日';
        if (d === Math.min(curDay, maxDay)) opt.selected = true;
        daySel.appendChild(opt);
    }
}

// 渲染今日黄历
function renderToday() {
    const today = new Date();
    renderHuangLi(today.getFullYear(), today.getMonth() + 1, today.getDate(), 'today');
}

// 渲染指定日期的黄历
function renderHuangLi(year, month, day, prefix) {
    const info = getHuangLi(year, month, day);
    if (!info) return;

    const solarEl = document.getElementById(prefix + 'Solar');
    const lunarEl = document.getElementById(prefix + 'Lunar');
    const ganzhiEl = document.getElementById(prefix + 'Ganzhi');
    const yijiEl = document.getElementById(prefix + 'YiJi');

    // 公历日期
    solarEl.innerHTML = `
        <span class="solar-year">${info.solar.year}年</span>
        <span class="solar-date">${info.solar.month}月${info.solar.day}日</span>
        <span class="solar-week">星期${info.solar.weekDay}</span>
    `;

    // 农历日期
    lunarEl.innerHTML = `
        <span class="lunar-date-text">${info.lunar.monthName}${info.lunar.dayName}</span>
        ${info.lunar.jieQi ? `<span class="jieqi-badge">${info.lunar.jieQi}</span>` : ''}
    `;

    // 干支信息
    ganzhiEl.innerHTML = `
        <div class="ganzhi-item"><span class="gz-label">年柱</span><span class="gz-value">${info.lunar.yearGanZhi}</span></div>
        <div class="ganzhi-item"><span class="gz-label">月柱</span><span class="gz-value">${info.lunar.monthGanZhi}</span></div>
        <div class="ganzhi-item"><span class="gz-label">日柱</span><span class="gz-value">${info.lunar.dayGanZhi}</span></div>
        <div class="ganzhi-item"><span class="gz-label">生肖</span><span class="gz-value">${info.lunar.shengXiao}</span></div>
        <div class="ganzhi-item"><span class="gz-label">建除</span><span class="gz-value">${info.lunar.jianChu}</span></div>
        <div class="ganzhi-item"><span class="gz-label">星宿</span><span class="gz-value">${info.lunar.xiu}</span></div>
    `;

    // 宜忌
    const yiHtml = info.yi.map(item => `<span class="yi-tag">${item}</span>`).join('');
    const jiHtml = info.ji.map(item => `<span class="ji-tag">${item}</span>`).join('');
    yijiEl.innerHTML = `
        <div class="yiji-section">
            <div class="yiji-label"><span class="yiji-icon yi-icon">宜</span></div>
            <div class="yiji-tags">${yiHtml}</div>
        </div>
        <div class="yiji-section">
            <div class="yiji-label"><span class="yiji-icon ji-icon">忌</span></div>
            <div class="yiji-tags">${jiHtml}</div>
        </div>
    `;
}

// 日期选择变化
function onDateChange() {
    updateDayOptions();
    const year = parseInt(document.getElementById('yearSelect').value);
    const month = parseInt(document.getElementById('monthSelect').value);
    const day = parseInt(document.getElementById('daySelect').value);

    renderHuangLi(year, month, day, 'selected');
    document.getElementById('selectedHuangli').style.display = 'block';

    // 同步日历
    calendarYear = year;
    calendarMonth = month;
    renderCalendar();
}

// 回到今天
function goToday() {
    const today = new Date();
    document.getElementById('yearSelect').value = today.getFullYear();
    document.getElementById('monthSelect').value = today.getMonth() + 1;
    updateDayOptions();
    document.getElementById('daySelect').value = today.getDate();
    document.getElementById('selectedHuangli').style.display = 'none';
    calendarYear = today.getFullYear();
    calendarMonth = today.getMonth() + 1;
    renderCalendar();
}

// 选择事项类型
function selectEventType(btn) {
    document.querySelectorAll('.event-type-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentEventType = btn.dataset.type;
}

// 查找吉日
function searchAuspiciousDates() {
    const today = new Date();
    const results = [];

    // 搜索未来60天
    for (let i = 1; i <= 60; i++) {
        const d = new Date(today.getTime() + i * 86400000);
        const info = getHuangLi(d.getFullYear(), d.getMonth() + 1, d.getDate());
        if (info && info.yi.includes(currentEventType)) {
            results.push(info);
            if (results.length >= 6) break;
        }
    }

    const container = document.getElementById('auspiciousResults');
    if (results.length === 0) {
        container.innerHTML = '<p class="no-result">近期未找到适合「' + currentEventType + '」的日子</p>';
    } else {
        container.innerHTML = '<h4 class="results-title">近期吉日推荐（' + currentEventType + '）</h4>' +
            results.map(r => `
                <div class="result-card">
                    <div class="result-date">
                        <span class="result-solar">${r.solar.year}/${r.solar.month}/${r.solar.day}</span>
                        <span class="result-week">周${r.solar.weekDay}</span>
                    </div>
                    <div class="result-lunar">${r.lunar.monthName}${r.lunar.dayName} · ${r.lunar.jianChu} · ${r.lunar.dayGanZhi}</div>
                </div>
            `).join('');
    }
    container.style.display = 'block';
}

// 渲染月历
function renderCalendar() {
    document.getElementById('calendarTitle').textContent = `${calendarYear}年${calendarMonth}月`;

    const grid = document.getElementById('calendarGrid');
    const firstDay = new Date(calendarYear, calendarMonth - 1, 1).getDay();
    const daysInMonth = new Date(calendarYear, calendarMonth, 0).getDate();
    const today = new Date();

    let html = '<div class="cal-weekday">日</div><div class="cal-weekday">一</div><div class="cal-weekday">二</div><div class="cal-weekday">三</div><div class="cal-weekday">四</div><div class="cal-weekday">五</div><div class="cal-weekday">六</div>';

    // 空白填充
    for (let i = 0; i < firstDay; i++) {
        html += '<div class="cal-empty"></div>';
    }

    for (let d = 1; d <= daysInMonth; d++) {
        const lunar = solarToLunar(calendarYear, calendarMonth, d);
        const isToday = calendarYear === today.getFullYear() && calendarMonth === today.getMonth() + 1 && d === today.getDate();
        const lunarText = lunar ? (lunar.dayName === '初一' ? lunar.monthName.replace('月','') + '月' : lunar.dayName.replace('初一','一').replace('十五','望')) : '';
        const jieQiText = lunar && lunar.jieQi ? `<span class="cal-jieqi">${lunar.jieQi}</span>` : '';

        html += `<div class="cal-day${isToday ? ' cal-today' : ''}" onclick="onCalDayClick(${d})">
            <span class="cal-solar">${d}</span>
            <span class="cal-lunar">${jieQiText || lunarText}</span>
        </div>`;
    }

    grid.innerHTML = html;
}

function onCalDayClick(day) {
    document.getElementById('yearSelect').value = calendarYear;
    document.getElementById('monthSelect').value = calendarMonth;
    updateDayOptions();
    document.getElementById('daySelect').value = day;
    renderHuangLi(calendarYear, calendarMonth, day, 'selected');
    document.getElementById('selectedHuangli').style.display = 'block';
    document.getElementById('selectedHuangli').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function changeMonth(delta) {
    calendarMonth += delta;
    if (calendarMonth > 12) { calendarMonth = 1; calendarYear++; }
    if (calendarMonth < 1) { calendarMonth = 12; calendarYear--; }
    renderCalendar();
}

function goBack() {
    window.history.back();
}
