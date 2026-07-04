/**
 * 四柱五行精析 - 八字排盘与五行分析
 * 基于子平八字体系：天干地支、五行属性、喜用神分析
 */

// ========== 基础数据 ==========
const TIAN_GAN = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const DI_ZHI   = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];

// 天干五行：甲乙-木 丙丁-火 戊己-土 庚辛-金 壬癸-水
const GAN_WUXING = { '甲':'木','乙':'木','丙':'火','丁':'火','戊':'土','己':'土','庚':'金','辛':'金','壬':'水','癸':'水' };

// 地支五行（主气）：子-水 丑-土 寅卯-木 辰-土 巳午-火 未-土 申酉-金 戌-土 亥-水
const ZHI_WUXING = { '子':'水','丑':'土','寅':'木','卯':'木','辰':'土','巳':'火','午':'火','未':'土','申':'金','酉':'金','戌':'土','亥':'水' };

// 地支藏干（本气、中气、余气）
const ZHI_CANG_GAN = {
    '子':['癸'],           '丑':['己','癸','辛'], '寅':['甲','丙','戊'], '卯':['乙'],
    '辰':['戊','乙','癸'], '巳':['丙','庚','戊'], '午':['丁','己'],     '未':['己','丁','乙'],
    '申':['庚','壬','戊'], '酉':['辛'],           '戌':['戊','辛','丁'], '亥':['壬','甲']
};

// 五行颜色
const WX_COLORS = { '金':'#C0C0C0','木':'#4CAF50','水':'#2196F3','火':'#E53935','土':'#D4A017' };
const WX_BG     = { '金':'rgba(192,192,192,0.15)','木':'rgba(76,175,80,0.15)','水':'rgba(33,150,243,0.15)','火':'rgba(229,57,53,0.15)','土':'rgba(212,160,23,0.15)' };

// 时辰映射 (index = DI_ZHI index, hours = [start, end))
const SHICHEN = [
    { name:'子时 (23:00-01:00)', value: 0 },
    { name:'丑时 (01:00-03:00)', value: 1 },
    { name:'寅时 (03:00-05:00)', value: 2 },
    { name:'卯时 (05:00-07:00)', value: 3 },
    { name:'辰时 (07:00-09:00)', value: 4 },
    { name:'巳时 (09:00-11:00)', value: 5 },
    { name:'午时 (11:00-13:00)', value: 6 },
    { name:'未时 (13:00-15:00)', value: 7 },
    { name:'申时 (15:00-17:00)', value: 8 },
    { name:'酉时 (17:00-19:00)', value: 9 },
    { name:'戌时 (19:00-21:00)', value: 10 },
    { name:'亥时 (21:00-23:00)', value: 11 }
];

// API 基础地址
const BAZI_API_BASE = (function() {
    var host = window.location.hostname;
    if (host === 'yi-yao.net' || host === 'yi-dao.net') {
        return 'https://1436877587-1kd9vq3oux.ap-hongkong.tencentscf.com';
    }
    if (host.includes('tencentscf.com')) return '';
    return 'https://1436877587-1kd9vq3oux.ap-hongkong.tencentscf.com';
})();

// ========== 八字排盘核心算法 ==========

/**
 * 计算儒略日数 (Julian Day Number)
 */
function julianDayNumber(year, month, day) {
    var a = Math.floor((14 - month) / 12);
    var y = year + 4800 - a;
    var m = month + 12 * a - 3;
    return day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
}

/**
 * 年柱计算
 * 公式：(year - 4) % 60 得到六十甲子序号
 * 注意：农历年以立春为界，简化处理以公历2月4日为分界
 */
function getYearPillar(year, month, day) {
    // 立春约在2月4日，之前算上一年
    var y = (month < 2 || (month === 2 && day < 4)) ? year - 1 : year;
    var idx = ((y - 4) % 60 + 60) % 60;
    return { gan: TIAN_GAN[idx % 10], zhi: DI_ZHI[idx % 12] };
}

/**
 * 月柱计算（五虎遁月法）
 * 年干决定正月天干：甲己年起丙寅，乙庚年起戊寅，丙辛年起庚寅，丁壬年起壬寅，戊癸年起甲寅
 * 月份以节气为界（简化：每月约在公历5-8日开始）
 */
function getMonthPillar(yearGan, month, day) {
    // 节气月份映射（近似值，每月以节为起点）
    var solarTermMonth = [
        { start: [1, 6],  zhi: 1 },  // 小寒 ~ 立春前: 丑月
        { start: [2, 4],  zhi: 2 },  // 立春 ~ 惊蛰前: 寅月
        { start: [3, 6],  zhi: 3 },  // 惊蛰 ~ 清明前: 卯月
        { start: [4, 5],  zhi: 4 },  // 清明 ~ 立夏前: 辰月
        { start: [5, 6],  zhi: 5 },  // 立夏 ~ 芒种前: 巳月
        { start: [6, 6],  zhi: 6 },  // 芒种 ~ 小暑前: 午月
        { start: [7, 7],  zhi: 7 },  // 小暑 ~ 立秋前: 未月
        { start: [8, 7],  zhi: 8 },  // 立秋 ~ 白露前: 申月
        { start: [9, 8],  zhi: 9 },  // 白露 ~ 寒露前: 酉月
        { start: [10, 8], zhi: 10 }, // 寒露 ~ 立冬前: 戌月
        { start: [11, 7], zhi: 11 }, // 立冬 ~ 大雪前: 亥月
        { start: [12, 7], zhi: 0 }   // 大雪 ~ 小寒前: 子月
    ];

    var monthZhi = 1; // 默认寅月
    for (var i = solarTermMonth.length - 1; i >= 0; i--) {
        var sm = solarTermMonth[i];
        if (month > sm.start[0] || (month === sm.start[0] && day >= sm.start[1])) {
            monthZhi = sm.zhi;
            break;
        }
    }

    // 五虎遁月：年干决定月干起始
    var yearGanIdx = TIAN_GAN.indexOf(yearGan);
    // 甲己→丙(2), 乙庚→戊(4), 丙辛→庚(6), 丁壬→壬(8), 戊癸→甲(0)
    var monthGanBase = [2, 4, 6, 8, 0][yearGanIdx % 5];
    // 寅月天干 = monthGanBase, 顺推
    var offset = ((monthZhi - 2) + 12) % 12;
    var monthGanIdx = (monthGanBase + offset) % 10;

    return { gan: TIAN_GAN[monthGanIdx], zhi: DI_ZHI[monthZhi] };
}

/**
 * 日柱计算
 * 基于儒略日数推算：已知 1900-01-01 为甲戌日（六十甲子第11位，index=10）
 */
function getDayPillar(year, month, day) {
    var jdn = julianDayNumber(year, month, day);
    // 1900-01-01 的 JDN = 2415021, 对应甲戌(index=10)
    var baseJdn = 2415021;
    var idx = ((jdn - baseJdn) % 60 + 60) % 60;
    return { gan: TIAN_GAN[idx % 10], zhi: DI_ZHI[idx % 12] };
}

/**
 * 时柱计算（五鼠遁时法）
 * 日干决定子时天干：甲己日起甲子，乙庚日起丙子，丙辛日起戊子，丁壬日起庚子，戊癸日起壬子
 */
function getHourPillar(dayGan, hourZhi) {
    var dayGanIdx = TIAN_GAN.indexOf(dayGan);
    // 甲己→甲(0), 乙庚→丙(2), 丙辛→戊(4), 丁壬→庚(6), 戊癸→壬(8)
    var hourGanBase = [0, 2, 4, 6, 8][dayGanIdx % 5];
    var hourGanIdx = (hourGanBase + hourZhi) % 10;
    return { gan: TIAN_GAN[hourGanIdx], zhi: DI_ZHI[hourZhi] };
}

/**
 * 完整八字排盘
 */
function calculateBazi(year, month, day, hourZhi) {
    var yearPillar  = getYearPillar(year, month, day);
    var monthPillar = getMonthPillar(yearPillar.gan, month, day);
    var dayPillar   = getDayPillar(year, month, day);
    var hourPillar  = getHourPillar(dayPillar.gan, hourZhi);

    // 统计五行（天干 + 地支主气）
    var pillars = [yearPillar, monthPillar, dayPillar, hourPillar];
    var wxCount = { '金': 0, '木': 0, '水': 0, '火': 0, '土': 0 };

    pillars.forEach(function(p) {
        wxCount[GAN_WUXING[p.gan]] += 1;
        wxCount[ZHI_WUXING[p.zhi]] += 1;
    });

    // 藏干五行（辅助统计）
    var hiddenWx = { '金': 0, '木': 0, '水': 0, '火': 0, '土': 0 };
    pillars.forEach(function(p) {
        var cangGans = ZHI_CANG_GAN[p.zhi] || [];
        cangGans.forEach(function(g) {
            hiddenWx[GAN_WUXING[g]] += 0.5; // 藏干权重减半
        });
    });

    return {
        yearPillar: yearPillar,
        monthPillar: monthPillar,
        dayPillar: dayPillar,
        hourPillar: hourPillar,
        dayMaster: dayPillar.gan,
        dayMasterElement: GAN_WUXING[dayPillar.gan],
        fiveElements: wxCount,
        hiddenElements: hiddenWx,
        totalElements: {
            '金': wxCount['金'] + hiddenWx['金'],
            '木': wxCount['木'] + hiddenWx['木'],
            '水': wxCount['水'] + hiddenWx['水'],
            '火': wxCount['火'] + hiddenWx['火'],
            '土': wxCount['土'] + hiddenWx['土']
        }
    };
}

// ========== 页面交互逻辑 ==========

document.addEventListener('DOMContentLoaded', function() {
    initForm();
});

/**
 * 初始化表单
 */
function initForm() {
    var yearSelect = document.getElementById('baziYear');
    var monthSelect = document.getElementById('baziMonth');
    var daySelect = document.getElementById('baziDay');

    // 年份下拉 (1940-2030)
    var currentYear = new Date().getFullYear();
    for (var y = 2030; y >= 1940; y--) {
        var opt = document.createElement('option');
        opt.value = y;
        opt.textContent = y + '年';
        if (y === 1990) opt.selected = true;
        yearSelect.appendChild(opt);
    }

    // 月份
    for (var m = 1; m <= 12; m++) {
        var opt = document.createElement('option');
        opt.value = m;
        opt.textContent = m + '月';
        monthSelect.appendChild(opt);
    }

    // 日期
    updateDays();
    yearSelect.addEventListener('change', updateDays);
    monthSelect.addEventListener('change', updateDays);
}

function updateDays() {
    var year = parseInt(document.getElementById('baziYear').value);
    var month = parseInt(document.getElementById('baziMonth').value);
    var daySelect = document.getElementById('baziDay');
    var currentDay = daySelect.value || 15;
    daySelect.innerHTML = '';

    var daysInMonth = new Date(year, month, 0).getDate();
    for (var d = 1; d <= daysInMonth; d++) {
        var opt = document.createElement('option');
        opt.value = d;
        opt.textContent = d + '日';
        if (d === parseInt(currentDay) || (!daySelect.value && d === 15)) opt.selected = true;
        daySelect.appendChild(opt);
    }
}

/**
 * 开始精析
 */
function startBaziAnalysis() {
    var year = parseInt(document.getElementById('baziYear').value);
    var month = parseInt(document.getElementById('baziMonth').value);
    var day = parseInt(document.getElementById('baziDay').value);
    var hourZhi = parseInt(document.getElementById('baziHour').value);
    var gender = document.querySelector('input[name="baziGender"]:checked');

    if (!year || !month || !day) {
        showToast('请选择完整的出生日期'); return;
    }
    if (isNaN(hourZhi)) {
        showToast('请选择出生时辰'); return;
    }
    if (!gender) {
        showToast('请选择性别'); return;
    }

    var bazi = calculateBazi(year, month, day, hourZhi);
    displayBaziResult(bazi, gender.value);
    requestAIAnalysis(bazi, gender.value, year, month, day);
}

/**
 * 显示排盘结果
 */
function displayBaziResult(bazi, gender) {
    document.getElementById('baziFormSection').style.display = 'none';
    document.getElementById('baziResultSection').style.display = 'block';

    // 四柱展示
    var pillars = [
        { label: '年柱', data: bazi.yearPillar },
        { label: '月柱', data: bazi.monthPillar },
        { label: '日柱', data: bazi.dayPillar },
        { label: '时柱', data: bazi.hourPillar }
    ];

    var pillarsHtml = pillars.map(function(p) {
        var ganWx = GAN_WUXING[p.data.gan];
        var zhiWx = ZHI_WUXING[p.data.zhi];
        var cangGans = ZHI_CANG_GAN[p.data.zhi] || [];
        var cangHtml = cangGans.map(function(g) {
            var wx = GAN_WUXING[g];
            return '<span class="cang-gan" style="color:' + WX_COLORS[wx] + '">' + g + '<small>' + wx + '</small></span>';
        }).join('');

        return '<div class="pillar-card">' +
            '<div class="pillar-label">' + p.label + '</div>' +
            '<div class="pillar-gan" style="background:' + WX_BG[ganWx] + ';border-color:' + WX_COLORS[ganWx] + '">' +
                '<span class="pillar-char">' + p.data.gan + '</span>' +
                '<span class="pillar-wx" style="color:' + WX_COLORS[ganWx] + '">' + ganWx + '</span>' +
            '</div>' +
            '<div class="pillar-zhi" style="background:' + WX_BG[zhiWx] + ';border-color:' + WX_COLORS[zhiWx] + '">' +
                '<span class="pillar-char">' + p.data.zhi + '</span>' +
                '<span class="pillar-wx" style="color:' + WX_COLORS[zhiWx] + '">' + zhiWx + '</span>' +
            '</div>' +
            '<div class="pillar-cang">' + cangHtml + '</div>' +
        '</div>';
    }).join('');

    document.getElementById('pillarsDisplay').innerHTML = pillarsHtml;

    // 日主信息
    var dmWx = bazi.dayMasterElement;
    document.getElementById('dayMasterInfo').innerHTML =
        '<span class="dm-label">日主</span>' +
        '<span class="dm-gan" style="color:' + WX_COLORS[dmWx] + '">' + bazi.dayMaster + ' (' + dmWx + ')</span>' +
        '<span class="dm-gender">' + (gender === 'male' ? '♂ 男' : '♀ 女') + '</span>';

    // 五行分布图
    var wxNames = ['金', '木', '水', '火', '土'];
    var maxVal = Math.max.apply(null, wxNames.map(function(w) { return bazi.totalElements[w]; }));
    if (maxVal === 0) maxVal = 1;

    var chartHtml = wxNames.map(function(wx) {
        var count = bazi.fiveElements[wx];
        var hidden = bazi.hiddenElements[wx];
        var total = count + hidden;
        var pct = (total / maxVal) * 100;
        return '<div class="wx-bar-row">' +
            '<span class="wx-bar-label" style="color:' + WX_COLORS[wx] + '">' + wx + '</span>' +
            '<div class="wx-bar-track">' +
                '<div class="wx-bar-fill" style="width:' + pct + '%;background:' + WX_COLORS[wx] + '"></div>' +
                '<div class="wx-bar-hidden" style="width:' + ((hidden / maxVal) * 100) + '%;background:' + WX_COLORS[wx] + ';opacity:0.3"></div>' +
            '</div>' +
            '<span class="wx-bar-count">' + count + (hidden > 0 ? '<small>+' + hidden.toFixed(1) + '</small>' : '') + '</span>' +
        '</div>';
    }).join('');

    document.getElementById('wxChart').innerHTML = chartHtml;

    // 五行缺失提示
    var missing = [];
    var weak = [];
    wxNames.forEach(function(wx) {
        if (bazi.fiveElements[wx] === 0 && bazi.hiddenElements[wx] === 0) missing.push(wx);
        else if (bazi.totalElements[wx] <= 1) weak.push(wx);
    });

    var summaryHtml = '';
    if (missing.length > 0) {
        summaryHtml += '<div class="wx-summary-item wx-missing">五行缺：' +
            missing.map(function(w) { return '<span style="color:' + WX_COLORS[w] + '">' + w + '</span>'; }).join('、') +
            '</div>';
    }
    if (weak.length > 0) {
        summaryHtml += '<div class="wx-summary-item wx-weak">五行弱：' +
            weak.map(function(w) { return '<span style="color:' + WX_COLORS[w] + '">' + w + '</span>'; }).join('、') +
            '</div>';
    }
    var strong = [];
    wxNames.forEach(function(wx) {
        if (bazi.totalElements[wx] >= 3) strong.push(wx);
    });
    if (strong.length > 0) {
        summaryHtml += '<div class="wx-summary-item wx-strong">五行旺：' +
            strong.map(function(w) { return '<span style="color:' + WX_COLORS[w] + '">' + w + '</span>'; }).join('、') +
            '</div>';
    }
    document.getElementById('wxSummary').innerHTML = summaryHtml;
}

/**
 * 请求 AI 深度解读
 */
async function requestAIAnalysis(bazi, gender, year, month, day) {
    var aiSection = document.getElementById('aiAnalysisSection');
    var aiContent = document.getElementById('aiAnalysisContent');
    aiSection.style.display = 'block';
    aiContent.innerHTML = '<div class="ai-loading"><div class="ai-spinner"></div><p>大师正在推演五行命理...</p></div>';

    try {
        var requestBody = {
            yearPillar: bazi.yearPillar,
            monthPillar: bazi.monthPillar,
            dayPillar: bazi.dayPillar,
            hourPillar: bazi.hourPillar,
            dayMaster: bazi.dayMaster,
            dayMasterElement: bazi.dayMasterElement,
            fiveElements: bazi.fiveElements,
            hiddenElements: bazi.hiddenElements,
            gender: gender,
            birthDate: year + '年' + month + '月' + day + '日'
        };

        var response = await fetch(BAZI_API_BASE + '/api/bazi', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        var result = await response.json();

        if (result.success) {
            var html = markdownToHTML(result.data.interpretation);
            aiContent.innerHTML = '<div class="ai-result-box"><div class="ai-result-text">' + html + '</div></div>';
        } else {
            throw new Error(result.error || 'AI 服务异常');
        }
    } catch (error) {
        aiContent.innerHTML =
            '<div class="ai-error">' +
            '<p>AI 五行分析服务暂时不可用</p>' +
            '<p class="ai-error-detail">原因: ' + error.message + '</p>' +
            '<p class="ai-error-hint">排盘结果已生成，可参考五行分布图自行分析</p>' +
            '</div>';
    }
}

/**
 * 简易 Markdown 转 HTML（支持表格、标题、加粗、列表）
 */
function markdownToHTML(md) {
    if (!md) return '';
    var lines = md.split('\n');
    var html = '';
    var inTable = false;
    var tableRows = [];

    function flushTable() {
        if (tableRows.length === 0) return '';
        var out = '<div class="ai-table-wrap"><table class="ai-table"><thead><tr>';
        // First row = headers
        var headers = tableRows[0];
        headers.forEach(function(h) { out += '<th>' + h.trim() + '</th>'; });
        out += '</tr></thead><tbody>';
        // Data rows (skip separator row if present)
        for (var i = 1; i < tableRows.length; i++) {
            var row = tableRows[i];
            // Skip separator rows like |---|---|---|
            if (row.every(function(c) { return /^[-:]+$/.test(c.trim()); })) continue;
            out += '<tr>';
            row.forEach(function(c) { out += '<td>' + c.trim() + '</td>'; });
            out += '</tr>';
        }
        out += '</tbody></table></div>';
        tableRows = [];
        return out;
    }

    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        var trimmed = line.trim();

        // Detect table row (starts with |)
        if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
            var cells = trimmed.slice(1, -1).split('|');
            tableRows.push(cells);
            inTable = true;
            continue;
        } else if (inTable) {
            // End of table
            html += flushTable();
            inTable = false;
        }

        // Empty line
        if (trimmed === '') {
            html += '<br>';
            continue;
        }

        // Headers
        if (trimmed.startsWith('### ')) {
            html += '<h4 class="ai-h4">' + inlineMarkdown(trimmed.slice(4)) + '</h4>';
            continue;
        }
        if (trimmed.startsWith('## ')) {
            html += '<h3 class="ai-h3">' + inlineMarkdown(trimmed.slice(3)) + '</h3>';
            continue;
        }
        if (trimmed.startsWith('# ')) {
            html += '<h3 class="ai-h3">' + inlineMarkdown(trimmed.slice(2)) + '</h3>';
            continue;
        }

        // Horizontal rule
        if (/^[-*_]{3,}$/.test(trimmed)) {
            html += '<hr class="ai-hr">';
            continue;
        }

        // List items
        if (/^[-*+]\s/.test(trimmed)) {
            html += '<div class="ai-list-item">' + inlineMarkdown(trimmed.replace(/^[-*+]\s/, '')) + '</div>';
            continue;
        }

        // Numbered list
        if (/^\d+[.)]\s/.test(trimmed)) {
            html += '<div class="ai-list-item ai-ol">' + inlineMarkdown(trimmed.replace(/^\d+[.)]\s/, '')) + '</div>';
            continue;
        }

        // Regular paragraph
        html += '<p class="ai-p">' + inlineMarkdown(trimmed) + '</p>';
    }

    // Flush remaining table
    if (inTable) html += flushTable();

    return html;
}

/**
 * 处理行内 Markdown（加粗、斜体、行内代码）
 */
function inlineMarkdown(text) {
    // Bold: **text**
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Italic: *text*
    text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
    // Inline code: `text`
    text = text.replace(/`(.+?)`/g, '<code>$1</code>');
    return text;
}

/**
 * 重新分析
 */
function resetBazi() {
    document.getElementById('baziFormSection').style.display = 'block';
    document.getElementById('baziResultSection').style.display = 'none';
    document.getElementById('aiAnalysisSection').style.display = 'none';
}

function showToast(msg) {
    if (typeof Toast !== 'undefined') Toast.warning(msg);
    else alert(msg);
}
