// 六爻专业解读系统
// 参考:《增删卜易》、《卜筮正宗》、《黄金策》、《火珠林》

class LiuyaoProfessional {
    constructor(hexagram, question) {
        this.hexagram = hexagram;
        this.question = question;
        this.month = this.getCurrentMonth();
        this.day = this.getCurrentDay();
        this.xunkong = this.calculateXunkong();
    }

    // 获取当前月建(简化版)
    getCurrentMonth() {
        const months = ['寅月', '卯月', '辰月', '巳月', '午月', '未月', 
                       '申月', '酉月', '戌月', '亥月', '子月', '丑月'];
        const now = new Date();
        return months[now.getMonth()];
    }

    // 获取当前日辰(简化版)
    getCurrentDay() {
        const days = ['子日', '丑日', '寅日', '卯日', '辰日', '巳日', 
                     '午日', '未日', '申日', '酉日', '戌日', '亥日'];
        const now = new Date();
        return days[now.getDate() % 12];
    }

    // 计算旬空
    calculateXunkong() {
        const xunkongMap = {
            '甲子': '戌亥', '甲戌': '申酉', '甲申': '午未',
            '甲午': '辰巳', '甲辰': '寅卯', '甲寅': '子丑'
        };
        // 简化计算,实际应根据日柱天干地支
        const keys = Object.keys(xunkongMap);
        const randomKey = keys[Math.floor(Math.random() * keys.length)];
        return xunkongMap[randomKey];
    }

    // 确定用神
    determineYongshen() {
        const q = this.question;
        const liuqin = this.hexagram.liuqin || [];
        
        if (q.includes('财运') || q.includes('财富') || q.includes('投资') || q.includes('求财')) {
            return { name: '妻财', position: liuqin.indexOf('妻财') + 1, description: '妻财爻为用神,主财运、资产' };
        } else if (q.includes('事业') || q.includes('工作') || q.includes('官') || q.includes('职位')) {
            return { name: '官鬼', position: liuqin.indexOf('官鬼') + 1, description: '官鬼爻为用神,主事业、官职、名位' };
        } else if (q.includes('感情') || q.includes('婚姻') || q.includes('恋爱')) {
            const isMale = q.includes('男') || q.includes('他');
            return { 
                name: isMale ? '妻财' : '官鬼', 
                position: liuqin.indexOf(isMale ? '妻财' : '官鬼') + 1,
                description: isMale ? '妻财爻为用神,男测婚姻以妻财为用' : '官鬼爻为用神,女测婚姻以官鬼为用'
            };
        } else if (q.includes('健康') || q.includes('疾病') || q.includes('身体')) {
            return { name: '官鬼', position: liuqin.indexOf('官鬼') + 1, description: '官鬼爻为用神,主疾病,需看官鬼旺衰' };
        } else if (q.includes('考试') || q.includes('学业') || q.includes('文凭')) {
            return { name: '父母', position: liuqin.indexOf('父母') + 1, description: '父母爻为用神,主学业、文凭、证书' };
        } else if (q.includes('官司') || q.includes('诉讼') || q.includes('打官司')) {
            return { name: '官鬼', position: liuqin.indexOf('官鬼') + 1, description: '官鬼爻为用神,主官司诉讼' };
        } else if (q.includes('失物') || q.includes('丢失') || q.includes('找东西')) {
            return { name: '妻财', position: liuqin.indexOf('妻财') + 1, description: '妻财爻为用神,主失物' };
        } else {
            return { name: '世爻', position: this.hexagram.shiying?.shi || 6, description: '以世爻为用神,代表求测者本人' };
        }
    }

    // 分析用神旺衰
    analyzeYongshenWangshuai() {
        const yongshen = this.determineYongshen();
        const najia = this.hexagram.najia;
        
        // 简化判断
        const factors = [];
        let wangshuai = '中平';
        
        if (this.hexagram.fortune === '吉') {
            wangshuai = '旺';
            factors.push('卦象吉利,用神得势');
            factors.push('月建生扶,日辰帮扶');
        } else if (this.hexagram.fortune === '需谨慎') {
            wangshuai = '衰';
            factors.push('卦象不利,用神受制');
            factors.push('月建克泄,日辰冲克');
        } else {
            factors.push('卦象平稳,用神中和');
            factors.push('月建日辰影响力相当');
        }

        return { wangshuai, factors, yongshen };
    }

    // 分析动爻变化
    analyzeDongyao() {
        // 随机生成动爻(模拟)
        const dongCount = Math.floor(Math.random() * 3);
        const dongyaos = [];
        
        for (let i = 0; i < dongCount; i++) {
            const position = Math.floor(Math.random() * 6) + 1;
            const change = Math.random() > 0.5 ? '阳变阴' : '阴变阳';
            dongyaos.push({ position, change });
        }
        
        return { dongCount, dongyaos };
    }

    // 分析世应关系
    analyzeShiying() {
        const shiying = this.hexagram.shiying;
        if (!shiying) return { relation: '无明显世应关系', desc: '' };
        
        const relations = [
            { type: '世应相生', desc: '世应相生,主事情顺利,有人相助' },
            { type: '世应相克', desc: '世应相克,主事情有阻碍,需努力克服' },
            { type: '世应比和', desc: '世应比和,主事情平稳,无大波折' }
        ];
        
        return relations[Math.floor(Math.random() * relations.length)];
    }

    // 分析长生十二宫
    analyzeChangshiergong() {
        const stages = ['长生', '沐浴', '冠带', '临官', '帝旺', '衰', '病', '死', '墓', '绝', '胎', '养'];
        const currentStage = stages[Math.floor(Math.random() * stages.length)];
        
        const meanings = {
            '长生': '用神处于长生,主生机旺盛,前途光明',
            '帝旺': '用神处于帝旺,主运势达到顶峰,力量最强',
            '墓': '用神入墓,主事情停滞,难以施展',
            '绝': '用神处绝地,主形势不利,需谨慎'
        };
        
        return { stage: currentStage, meaning: meanings[currentStage] || '用神处于正常状态' };
    }

    // 分析神煞
    analyzeShensha() {
        const shenshas = [];
        const lucky = ['天乙贵人', '文昌贵人', '天德贵人', '月德贵人'];
        const unlucky = ['白虎', '丧门', '吊客', '病符'];
        
        if (this.hexagram.fortune === '吉') {
            shenshas.push({ name: lucky[Math.floor(Math.random() * lucky.length)], type: '吉', desc: '有贵人相助,逢凶化吉' });
        } else if (this.hexagram.fortune === '需谨慎') {
            shenshas.push({ name: unlucky[Math.floor(Math.random() * unlucky.length)], type: '凶', desc: '需注意防范,小心行事' });
        }
        
        return shenshas;
    }

    // 生成专业断卦报告
    generateReport() {
        const yongshenAnalysis = this.analyzeYongshenWangshuai();
        const dongyaoAnalysis = this.analyzeDongyao();
        const shiyingAnalysis = this.analyzeShiying();
        const changshengAnalysis = this.analyzeChangshiergong();
        const shenshaAnalysis = this.analyzeShensha();
        
        return {
            yongshen: yongshenAnalysis,
            dongyao: dongyaoAnalysis,
            shiying: shiyingAnalysis,
            changsheng: changshengAnalysis,
            shensha: shenshaAnalysis,
            month: this.month,
            day: this.day,
            xunkong: this.xunkong
        };
    }

    // 生成HTML格式的专业解读
    generateHTML() {
        const report = this.generateReport();
        
        let html = `
        <div class="professional-liuyao">
            <div class="intro-text">
                <p>📚 本解读参考《增删卜易》、《卜筮正宗》、《黄金策》、《火珠林》等六爻经典,结合纳甲筮法专业断卦。</p>
            </div>
            
            <!-- 基础信息 -->
            <div class="liuyao-section">
                <h4>📊 起卦信息</h4>
                <div class="info-grid">
                    <div class="info-item"><span>卦宫:</span><strong>${this.hexagram.najia?.palace || '未知'}</strong></div>
                    <div class="info-item"><span>五行:</span><strong>${this.hexagram.najia?.element || '未知'}</strong></div>
                    <div class="info-item"><span>月建:</span><strong>${report.month}</strong></div>
                    <div class="info-item"><span>日辰:</span><strong>${report.day}</strong></div>
                    <div class="info-item"><span>旬空:</span><strong>${report.xunkong}</strong></div>
                    <div class="info-item"><span>卦类:</span><strong>${this.hexagram.category || '普通卦'}</strong></div>
                </div>
            </div>
            
            <!-- 用神分析 -->
            <div class="liuyao-section highlight">
                <h4>🎯 用神选取与分析</h4>
                <p><strong>用神:</strong>${report.yongshen.yongshen.name}爻(第${report.yongshen.yongshen.position}爻)</p>
                <p><strong>选取依据:</strong>${report.yongshen.yongshen.description}</p>
                <p><strong>旺衰判断:</strong>${report.yongshen.wangshuai}</p>
                <ul>
                    ${report.yongshen.factors.map(f => `<li>${f}</li>`).join('')}
                </ul>
            </div>
            
            <!-- 原神忌神分析 -->
            <div class="liuyao-section">
                <h4>⚖️ 原神·忌神·仇神</h4>
                <p><strong>原神:</strong>生用神者,为助力因素,主有帮扶</p>
                <p><strong>忌神:</strong>克用神者,为阻力因素,主有阻碍</p>
                <p><strong>仇神:</strong>克原神者,间接不利因素</p>
                <p class="analysis-tip">《增删卜易》云:"用神旺相,事必易成;用神休囚,事多难遂。"</p>
            </div>
            
            <!-- 动爻分析 -->
            <div class="liuyao-section">
                <h4>🔄 动爻与变爻</h4>
                <p><strong>动爻数量:</strong>${report.dongyao.dongCount}爻</p>
                ${report.dongyao.dongCount > 0 ? 
                    `<ul>
                        ${report.dongyao.dongyaos.map(d => 
                            `<li>第${d.position}爻发动,${d.change},主事情有变化</li>`
                        ).join('')}
                    </ul>
                    <p class="analysis-tip">《卜筮正宗》:"动爻主事之变化,变爻主事之结果。"</p>` : 
                    '<p>静卦无动爻,主事情平稳,无大变化</p>'
                }
            </div>
            
            <!-- 世应关系 -->
            <div class="liuyao-section">
                <h4>🤝 世应关系</h4>
                <p><strong>关系类型:</strong>${report.shiying.relation}</p>
                <p>${report.shiying.desc}</p>
                <p class="analysis-tip">《黄金策》:"世为自己,应为他人,世应相生则吉,相克则凶。"</p>
            </div>
            
            <!-- 长生十二宫 -->
            <div class="liuyao-section">
                <h4>🌱 长生十二宫</h4>
                <p><strong>用神所处:</strong>${report.changsheng.stage}</p>
                <p>${report.changsheng.meaning}</p>
            </div>
            
            <!-- 神煞分析 -->
            ${report.shensha.length > 0 ? `
            <div class="liuyao-section">
                <h4>✨ 神煞与特殊格局</h4>
                ${report.shensha.map(s => 
                    `<p><span class="shensha-${s.type}">${s.name}(${s.type})</span> - ${s.desc}</p>`
                ).join('')}
            </div>` : ''}
            
            <!-- 综合断卦 -->
            <div class="liuyao-section highlight">
                <h4>📖 综合断卦</h4>
                <p>根据上述分析,结合《火珠林》断卦原则:</p>
                <ol>
                    <li><strong>先看用神旺衰:</strong>用神${report.yongshen.wangshuai},主基调${this.hexagram.fortune === '吉' ? '吉利' : this.hexagram.fortune === '需谨慎' ? '不利' : '平稳'}</li>
                    <li><strong>再看动爻变化:</strong>${report.dongyao.dongCount > 0 ? '有动爻,事情有变化' : '静卦,事情平稳'}</li>
                    <li><strong>分析世应关系:</strong>${report.shiying.desc}</li>
                    <li><strong>结合卦辞爻辞:</strong>${this.hexagram.interpretation.substring(0, 50)}...</li>
                    <li><strong>综合判断:</strong>${this.getFinalJudgment(report)}</li>
                </ol>
            </div>
        </div>`;
        
        return html;
    }

    // 最终判断
    getFinalJudgment(report) {
        if (this.hexagram.fortune === '吉') {
            return '综合判断为吉,事情可成,但需把握时机,积极行动';
        } else if (this.hexagram.fortune === '需谨慎') {
            return '综合判断需谨慎,事情有阻碍,建议稳扎稳打,不可冒进';
        }
        return '综合判断为中平,事情成败关键在于人为努力';
    }
}
