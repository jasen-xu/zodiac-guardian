/**
 * 黄历核心数据与农历转换
 * 农历数据由 lunar-javascript 库生成
 */

// ===== 农历数据表 (1900-2100) =====
// bits 19-16: 闰月(0=无), bits 15-4: 月1-12(1=30天,0=29天), bit 0: 闰月天数(1=30,0=29)
const lunarYearData = [
    0x8BD20,0x07520,0x0EA50,0x5B2A0,0x064B0,0x0A9B0,0x4AA61,0x056A0,0x0B590,0x2BAA0,
    0x07520,0x6DA50,0x0B250,0x0A4B0,0x5A4B1,0x02AD0,0x056B0,0x25B50,0x0DA90,0x7E921,
    0x0E920,0x0D250,0x5D2D0,0x0A560,0x02B60,0x4AD51,0x06D40,0x0EA90,0x2F4A0,0x0E920,
    0x66A60,0x052B0,0x0A570,0x59561,0x0B5A0,0x06D40,0x37611,0x07490,0x7B131,0x0A930,
    0x052B0,0x651B1,0x0AAD0,0x056A0,0x4DA51,0x0BA40,0x0B490,0x2D4B0,0x0A950,0x7AAD0,
    0x05360,0x0AAD0,0x5ACA1,0x05B20,0x0DA50,0x3EA21,0x0D4A0,0x85950,0x0A970,0x05560,
    0x65750,0x0AD50,0x06D20,0x47550,0x0EA50,0x064A0,0x364F0,0x0A9B0,0x7ADA0,0x056A0,
    0x0B690,0x5BB20,0x0B520,0x0B250,0x4B2B0,0x0A4B0,0x8AAB0,0x02AD0,0x056D0,0x65A91,
    0x0DA90,0x0D920,0x4E950,0x0D250,0xAE4D0,0x0A560,0x02B60,0x62F50,0x06D50,0x0EA90,
    0x5F520,0x0E920,0x0D260,0x352E0,0x0A570,0x8AD60,0x035A0,0x06D50,0x5B690,0x07490,
    0x06930,0x4A9B0,0x052B0,0x0A5B0,0x2AAE0,0x056A0,0x7DD50,0x0BA40,0x0B490,0x5D530,
    0x0A950,0x052D0,0x455D0,0x0AB50,0x9BAA0,0x05D20,0x0DA50,0x6E8A1,0x0D4A0,0x0C950,
    0x4A9E0,0x05560,0x0AB50,0x2ADA0,0x06D20,0x67650,0x07250,0x064B0,0x56570,0x0CAB0,
    0x055A0,0x356E0,0x0B690,0xBF520,0x0B520,0x0B250,0x6D0B1,0x0A4B0,0x04AB0,0x52BB0,
    0x05AD0,0x0B6A0,0x2DAA0,0x0D920,0x7EA50,0x0D250,0x0A550,0x5A4D1,0x04B60,0x05B50,
    0x36D21,0x0EC90,0x8F920,0x0E920,0x0D260,0x65161,0x0A570,0x04D60,0x43651,0x07550,
    0x07490,0x374B0,0x06930,0x7AAB0,0x052B0,0x0A5B0,0x5ABA0,0x056A0,0x0B650,0x4BAA0,
    0x0B4A0,0x8D950,0x0A950,0x052D0,0x656D0,0x0AB50,0x05AA0,0x45D50,0x0DA50,0x0D4A0,
    0x3E4D0,0x0C960,0x7CCE0,0x05560,0x0AB50,0x5AD21,0x06D20,0x0EA50,0x472A0,0x068B0,
    0x86970,0x04AB0,0x055B0,0x65561,0x0B6A0,0x07520,0x4B950,0x0B450,0x0A8B0,0x2A4F0,
    0x04AB0
];

// ===== 基础数据 =====
const TIAN_GAN = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const DI_ZHI = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
const SHENG_XIAO = ['鼠','牛','虎','兔','龙','蛇','马','羊','猴','鸡','狗','猪'];
const LUNAR_MONTH_NAMES = ['正','二','三','四','五','六','七','八','九','十','冬','腊'];
const LUNAR_DAY_NAMES = [
    '初一','初二','初三','初四','初五','初六','初七','初八','初九','初十',
    '十一','十二','十三','十四','十五','十六','十七','十八','十九','二十',
    '廿一','廿二','廿三','廿四','廿五','廿六','廿七','廿八','廿九','三十'
];
const WEEK_DAYS = ['日','一','二','三','四','五','六'];

// 节气数据 (近似日期, 月内第几天)
const JIE_QI_DATA = [
    { name: '小寒', month: 1, day: 6 }, { name: '大寒', month: 1, day: 20 },
    { name: '立春', month: 2, day: 4 }, { name: '雨水', month: 2, day: 19 },
    { name: '惊蛰', month: 3, day: 6 }, { name: '春分', month: 3, day: 21 },
    { name: '清明', month: 4, day: 5 }, { name: '谷雨', month: 4, day: 20 },
    { name: '立夏', month: 5, day: 6 }, { name: '小满', month: 5, day: 21 },
    { name: '芒种', month: 6, day: 6 }, { name: '夏至', month: 6, day: 21 },
    { name: '小暑', month: 7, day: 7 }, { name: '大暑', month: 7, day: 23 },
    { name: '立秋', month: 8, day: 7 }, { name: '处暑', month: 8, day: 23 },
    { name: '白露', month: 9, day: 8 }, { name: '秋分', month: 9, day: 23 },
    { name: '寒露', month: 10, day: 8 }, { name: '霜降', month: 10, day: 23 },
    { name: '立冬', month: 11, day: 7 }, { name: '小雪', month: 11, day: 22 },
    { name: '大雪', month: 12, day: 7 }, { name: '冬至', month: 12, day: 22 }
];

// 建除十二神
const JIAN_CHU = ['建','除','满','平','定','执','破','危','成','收','开','闭'];

// 二十八宿
const ER_SHI_BA_XIU = [
    '角','亢','氐','房','心','尾','箕',  // 东方青龙
    '斗','牛','女','虚','危','室','壁',  // 北方玄武
    '奎','娄','胃','昴','毕','觜','参',  // 西方白虎
    '井','鬼','柳','星','张','翼','轸'   // 南方朱雀
];

// 每日宜忌分类
const YI_JI_CATEGORIES = {
    yi: {
        '嫁娶': '婚姻嫁娶', '祭祀': '祭拜神灵', '祈福': '祈求福报',
        '出行': '外出旅行', '动土': '破土动工', '安葬': '安葬事宜',
        '开市': '开业经商', '交易': '买卖交易', '立券': '签约合同',
        '纳财': '收纳财物', '入宅': '搬入新居', '移徙': '搬迁迁移',
        '开光': '佛像开光', '纳畜': '买入牲畜', '盖屋': '建造房屋',
        '造桥': '建造桥梁', '造船': '建造船只', '掘井': '开掘水井',
        '求嗣': '求子', '解除': '解除灾厄', '修造': '修缮建筑',
        '竖柱': '竖立柱梁', '上梁': '房屋上梁', '纳采': '提亲',
        '订盟': '订立盟约', '安床': '安置睡床', '栽种': '种植',
        '牧养': '畜牧养殖', '求医': '求医问药', '裁衣': '裁剪衣物',
        '经络': '纺织缝纫', '塞穴': '堵塞洞穴', '扫舍': '打扫房屋'
    },
    ji: {
        '嫁娶': '婚姻嫁娶', '祭祀': '祭拜神灵', '祈福': '祈求福报',
        '出行': '外出旅行', '动土': '破土动工', '安葬': '安葬事宜',
        '开市': '开业经商', '交易': '买卖交易', '入宅': '搬入新居',
        '移徙': '搬迁迁移', '破土': '挖地动土', '开池': '开挖池塘',
        '修坟': '修缮坟墓', '立碑': '竖立墓碑', '伐木': '砍伐树木',
        '作灶': '安置炉灶', '分居': '分家另过', '出火': '点火放火',
        '安香': '安置神位', '纳畜': '买入牲畜', '盖屋': '建造房屋'
    }
};

// ===== 农历转换函数 =====

// 获取农历年的信息
function getLunarYearInfo(year) {
    const idx = year - 1900;
    if (idx < 0 || idx >= lunarYearData.length) return null;
    const data = lunarYearData[idx];
    const leapMonth = (data >> 16) & 0xF;
    const months = [];
    for (let m = 1; m <= 12; m++) {
        months.push({ month: m, days: (data & (1 << (4 + m - 1))) ? 30 : 29 });
    }
    if (leapMonth > 0) {
        months.splice(leapMonth, 0, {
            month: leapMonth,
            isLeap: true,
            days: (data & 1) ? 30 : 29
        });
    }
    return { leapMonth, months, data };
}

// 获取农历年的总天数
function getLunarYearDays(year) {
    const info = getLunarYearInfo(year);
    if (!info) return 0;
    return info.months.reduce((sum, m) => sum + m.days, 0);
}

// 公历转农历
function solarToLunar(year, month, day) {
    const baseDate = new Date(1900, 0, 31); // 1900年正月初一
    const targetDate = new Date(year, month - 1, day);
    let offset = Math.round((targetDate - baseDate) / 86400000);

    let lunarYear = 1900;
    let yearDays;
    for (let i = 0; i < lunarYearData.length; i++) {
        yearDays = getLunarYearDays(1900 + i);
        if (offset < yearDays) break;
        offset -= yearDays;
        lunarYear++;
    }

    const info = getLunarYearInfo(lunarYear);
    if (!info) return null;

    let lunarMonth = 0, lunarDay = 0, isLeap = false;
    for (let i = 0; i < info.months.length; i++) {
        const m = info.months[i];
        if (offset < m.days) {
            lunarMonth = m.month;
            lunarDay = offset + 1;
            isLeap = m.isLeap || false;
            break;
        }
        offset -= m.days;
    }

    // 天干地支 - 年
    const yearGanIdx = (lunarYear - 4) % 10;
    const yearZhiIdx = (lunarYear - 4) % 12;
    const yearGanZhi = TIAN_GAN[yearGanIdx] + DI_ZHI[yearZhiIdx];
    const shengXiao = SHENG_XIAO[yearZhiIdx];

    // 天干地支 - 日 (基准: 2000-01-01 = 甲午日)
    const daysSince2000 = Math.round((targetDate - new Date(2000, 0, 1)) / 86400000);
    const dayGanIdx = ((daysSince2000 % 10) + 10) % 10;
    const dayZhiIdx = (((daysSince2000 + 6) % 12) + 12) % 12;
    const dayGanZhi = TIAN_GAN[dayGanIdx] + DI_ZHI[dayZhiIdx];

    // 月干支 (简化计算)
    const monthIdx = (lunarMonth - 1 + 12) % 12;
    const monthGanBase = (yearGanIdx % 5) * 2 + 2;
    const monthGanIdx = (monthGanBase + monthIdx) % 10;
    const monthZhiIdx = (monthIdx + 2) % 12;
    const monthGanZhi = TIAN_GAN[monthGanIdx] + DI_ZHI[monthZhiIdx];

    // 建除十二神
    const jianChuIdx = (dayZhiIdx - monthZhiIdx + 12) % 12;
    const jianChu = JIAN_CHU[jianChuIdx];

    // 二十八宿
    const xiuIdx = ((daysSince2000 + 6) % 28 + 28) % 28;
    const xiu = ER_SHI_BA_XIU[xiuIdx];

    // 节气
    let jieQi = null;
    for (const jq of JIE_QI_DATA) {
        if (jq.month === month && jq.day === day) {
            jieQi = jq.name;
            break;
        }
    }

    return {
        year: lunarYear,
        month: lunarMonth,
        day: lunarDay,
        isLeap,
        monthName: (isLeap ? '闰' : '') + LUNAR_MONTH_NAMES[lunarMonth - 1] + '月',
        dayName: LUNAR_DAY_NAMES[lunarDay - 1],
        yearGanZhi,
        monthGanZhi,
        dayGanZhi,
        shengXiao,
        jianChu,
        xiu,
        jieQi
    };
}

// 根据建除十二神生成宜忌
function getYiJiByJianChu(jianChu, dayGanZhi) {
    const yiJiMap = {
        '建': { yi: ['祭祀','祈福','出行'], ji: ['动土','开市'] },
        '除': { yi: ['祭祀','祈福','求医','解除'], ji: ['嫁娶','开市'] },
        '满': { yi: ['祭祀','祈福','纳财','开市'], ji: ['出行','安葬'] },
        '平': { yi: ['祭祀','修造','塞穴'], ji: ['嫁娶','开市','出行'] },
        '定': { yi: ['祭祀','祈福','嫁娶','纳采'], ji: ['动土','出行'] },
        '执': { yi: ['祭祀','祈福','修造','盖屋'], ji: ['开市','移徙'] },
        '破': { yi: ['求医','解除','扫舍'], ji: ['嫁娶','开市','祈福'] },
        '危': { yi: ['祭祀','祈福','安床'], ji: ['出行','开市','嫁娶'] },
        '成': { yi: ['嫁娶','开市','入宅','纳财'], ji: ['诉讼'] },
        '收': { yi: ['祭祀','祈福','纳财','嫁娶'], ji: ['出行','开市'] },
        '开': { yi: ['祭祀','祈福','嫁娶','开市','出行'], ji: ['安葬'] },
        '闭': { yi: ['祭祀','修造','塞穴'], ji: ['开市','出行','嫁娶'] }
    };
    return yiJiMap[jianChu] || { yi: ['祭祀'], ji: ['动土'] };
}

// 获取指定日期的完整黄历信息
function getHuangLi(year, month, day) {
    const lunar = solarToLunar(year, month, day);
    if (!lunar) return null;

    const yiJi = getYiJiByJianChu(lunar.jianChu, lunar.dayGanZhi);

    // 根据日期添加更多宜忌
    const dayOfWeek = new Date(year, month - 1, day).getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
        yiJi.yi.push('休息');
    }

    return {
        solar: { year, month, day, weekDay: WEEK_DAYS[dayOfWeek] },
        lunar,
        yi: yiJi.yi,
        ji: yiJi.ji
    };
}
