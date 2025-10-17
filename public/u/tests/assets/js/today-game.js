// today-game.js - 전략가의 비밀 연구소 (The Strategist's Secret Lab)

// --- Utility Functions ---
function getDailySeed() {
    const today = new Date();
    return today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
}

function mulberry32(seed) {
    return function() {
        seed |= 0;
        seed = seed + 0x6D2B79F5 | 0;
        let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) | 0;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}

function getRandomValue(base, variance) {
    const min = base - variance;
    const max = base + variance;
    return Math.floor(currentRandFn() * (max - min + 1)) + min;
}

function getEulReParticle(word) {
    if (!word || word.length === 0) return "를";
    const lastChar = word[word.length - 1];
    const uni = lastChar.charCodeAt(0);
    if (uni < 0xAC00 || uni > 0xD7A3) return "를";
    return (uni - 0xAC00) % 28 > 0 ? "을" : "를";
}

function getWaGwaParticle(word) {
    if (!word || word.length === 0) return "와";
    const lastChar = word[word.length - 1];
    const uni = lastChar.charCodeAt(0);
    if (uni < 0xAC00 || uni > 0xD7A3) return "와";
    return (uni - 0xAC00) % 28 > 0 ? "과" : "와";
}

// --- Game State Management ---
let gameState = {};
let currentRandFn = null;

function resetGameState() {
    gameState = {
        day: 1,
        strategy: 50, // 전략
        knowledge: 50,  // 지식
        vision: 50,  // 비전
        analysis: 50,     // 분석
        insight: 50,    // 통찰
        actionPoints: 10,
        maxActionPoints: 10,
        resources: { information: 10, funds: 10, technology: 5, breakthroughs: 0 },
        researchers: [
            { id: "vonneumann", name: "폰 노이만", personality: "전략적인", skill: "알고리즘 설계", synergy: 70 },
            { id: "aristotle", name: "아리스토텔레스", personality: "심오한", skill: "데이터 분석", synergy: 60 }
        ],
        maxResearchers: 5,
        currentScenarioId: "intro",
        lastPlayedDate: new Date().toISOString().slice(0, 10),
        manualDayAdvances: 0,
        dailyEventTriggered: false,
        dailyBonus: { researchSuccess: 0 },
        dailyActions: { analyzed: false, simulationRun: false, strategizedWith: [], minigamePlayed: false },
        researchModules: {
            dataServer: { built: false, durability: 100, name: "데이터 서버", description: "방대한 정보를 저장하고 관리합니다.", effect_description: "지식 스탯 보너스 및 정보 자동 획득." },
            simulationLab: { built: false, durability: 100, name: "시뮬레이션 랩", description: "복잡한 시나리오를 예측하고 분석합니다.", effect_description: "분석 능력 향상 및 자금 생성." },
            controlTower: { built: false, durability: 100, name: "관제탑", description: "연구소의 모든 전략적 결정을 통제합니다.", effect_description: "신규 연구원 영입 및 비전 강화." },
            aiCore: { built: false, durability: 100, name: "AI 코어", description: "고급 알고리즘과 인공지능을 개발합니다.", effect_description: "과거 기록을 통해 스탯 및 자원 획득." },
            quantumComputer: { built: false, durability: 100, name: "양자 컴퓨터", description: "미래 기술을 연구하고 혁신을 이끌어냅니다.", effect_description: "고급 연구 및 기술 혁신 활용 잠금 해제." }
        },
        techLevel: 0,
        minigameState: {}
    };
    currentRandFn = mulberry32(getDailySeed() + gameState.day);
}

function saveGameState() {
    localStorage.setItem('intjStrategyGame', JSON.stringify(gameState));
}

function loadGameState() {
    const savedState = localStorage.getItem('intjStrategyGame');
    const today = new Date().toISOString().slice(0, 10);
    if (savedState) {
        let loaded = JSON.parse(savedState);
        if (!loaded.dailyBonus) loaded.dailyBonus = { researchSuccess: 0 };
        if (!loaded.researchers || loaded.researchers.length === 0) {
            loaded.researchers = [
                { id: "vonneumann", name: "폰 노이만", personality: "전략적인", skill: "알고리즘 설계", synergy: 70 },
                { id: "aristotle", name: "아리스토텔레스", personality: "심오한", skill: "데이터 분석", synergy: 60 }
            ];
        }
        if (!loaded.analysis) loaded.analysis = 50;
        if (!loaded.insight) loaded.insight = 50;

        Object.assign(gameState, loaded);

        currentRandFn = mulberry32(getDailySeed() + gameState.day);

        if (gameState.lastPlayedDate !== today) {
            gameState.day += 1;
            gameState.lastPlayedDate = today;
            gameState.manualDayAdvances = 0;
            gameState.dailyEventTriggered = false;
            processDailyEvents();
        }
    } else {
        resetGameState();
        processDailyEvents();
    }
    renderAll();
}

function updateState(changes, displayMessage = null) {
    Object.keys(changes).forEach(key => {
        if (typeof changes[key] === 'object' && changes[key] !== null && !Array.isArray(changes[key])) {
            gameState[key] = { ...gameState[key], ...changes[key] };
        } else {
            gameState[key] = changes[key];
        }
    });
    saveGameState();
    renderAll(displayMessage);
}

// --- UI Rendering ---
function updateGameDisplay(text) {
    const gameArea = document.getElementById('gameArea');
    if(gameArea && text) gameArea.innerHTML = `<p>${text.replace(/\n/g, '<br>')}</p>`;
}

function renderStats() {
    const statsDiv = document.getElementById('gameStats');
    if (!statsDiv) return;
    const researcherListHtml = gameState.researchers.map(r => `<li>${r.name} (${r.skill}) - 시너지: ${r.synergy}</li>`).join('');
    statsDiv.innerHTML = `
        <p><b>연구:</b> ${gameState.day}일차</p>
        <p><b>행동력:</b> ${gameState.actionPoints}/${gameState.maxActionPoints}</p>
        <p><b>전략:</b> ${gameState.strategy} | <b>지식:</b> ${gameState.knowledge} | <b>비전:</b> ${gameState.vision} | <b>분석:</b> ${gameState.analysis} | <b>통찰:</b> ${gameState.insight}</p>
        <p><b>자원:</b> 정보 ${gameState.resources.information}, 자금 ${gameState.resources.funds}, 기술 ${gameState.resources.technology}, 기술 혁신 ${gameState.resources.breakthroughs || 0}</p>
        <p><b>기술 레벨:</b> ${gameState.techLevel}</p>
        <p><b>소속 연구원 (${gameState.researchers.length}/${gameState.maxResearchers}):</b></p>
        <ul>${researcherListHtml}</ul>
        <p><b>연구 모듈:</b></p>
        <ul>${Object.values(gameState.researchModules).filter(m => m.built).map(m => `<li>${m.name} (내구성: ${m.durability}) - ${m.effect_description}</li>`).join('') || '없음'}</ul>
    `;
    const manualDayCounter = document.getElementById('manualDayCounter');
    if(manualDayCounter) manualDayCounter.innerText = gameState.manualDayAdvances;
}

function renderChoices(choices) {
    const choicesDiv = document.getElementById('gameChoices');
    if (!choicesDiv) return;
    let dynamicChoices = [];

    if (gameState.currentScenarioId === 'intro') {
        dynamicChoices = gameScenarios.intro.choices;
    } else if (gameState.currentScenarioId === 'action_module_management') {
        dynamicChoices = gameScenarios.action_module_management.choices ? [...gameScenarios.action_module_management.choices] : [];
        if (!gameState.researchModules.dataServer.built) dynamicChoices.push({ text: "데이터 서버 구축 (정보 50, 자금 20)", action: "build_dataServer" });
        if (!gameState.researchModules.simulationLab.built) dynamicChoices.push({ text: "시뮬레이션 랩 구축 (자금 30, 기술 30)", action: "build_simulationLab" });
        if (!gameState.researchModules.controlTower.built) dynamicChoices.push({ text: "관제탑 건설 (정보 100, 자금 50, 기술 50)", action: "build_controlTower" });
        if (!gameState.researchModules.aiCore.built) dynamicChoices.push({ text: "AI 코어 개발 (자금 80, 기술 40)", action: "build_aiCore" });
        if (gameState.researchModules.simulationLab.built && gameState.researchModules.simulationLab.durability > 0 && !gameState.researchModules.quantumComputer.built) {
            dynamicChoices.push({ text: "양자 컴퓨터 도입 (자금 50, 기술 100)", action: "build_quantumComputer" });
        }
        Object.keys(gameState.researchModules).forEach(key => {
            const module = gameState.researchModules[key];
            if (module.built && module.durability < 100) {
                dynamicChoices.push({ text: `${module.name} 최적화 (자금 10, 기술 10)`, action: "maintain_module", params: { module: key } });
            }
        });
        dynamicChoices.push({ text: "취소", action: "return_to_intro" });
    } else {
        dynamicChoices = choices ? [...choices] : [];
    }

    choicesDiv.innerHTML = dynamicChoices.map(choice => `<button class="choice-btn" data-action="${choice.action}" data-params='${JSON.stringify(choice.params || {})}'>${choice.text}</button>`).join('');
    choicesDiv.querySelectorAll('.choice-btn').forEach(button => {
        button.addEventListener('click', () => {
            const action = button.dataset.action;
            if (gameActions[action]) {
                gameActions[action](JSON.parse(button.dataset.params || '{}'));
            }
        });
    });
}

function renderAll(customDisplayMessage = null) {
    const desc = document.getElementById('gameDescription');
    if (desc) desc.style.display = 'none';
    renderStats();
    
    if (!gameState.currentScenarioId.startsWith('minigame_')) {
        const scenario = gameScenarios[gameState.currentScenarioId] || gameScenarios.intro;
        updateGameDisplay(customDisplayMessage || scenario.text);
        renderChoices(scenario.choices);
    }
}

// --- Game Data (to be themed for INTJ) ---
const gameScenarios = {
    "intro": { text: "오늘은 연구소에서 무엇을 할까요?", choices: [
        { text: "데이터 분석", action: "analyze_data" },
        { text: "연구원과 전략 회의", action: "strategize_with_researchers" },
        { text: "시뮬레이션 실행", action: "run_simulation" },
        { text: "자원 수집", action: "show_resource_gathering_options" },
        { text: "연구 모듈 관리", action: "show_module_options" },
        { text: "비전 탐색", action: "show_vision_exploration_options" },
        { text: "오늘의 전략 과제", action: "play_minigame" }
    ]},
    // ... more INTJ-themed scenarios
};

// ... (Full game logic will be implemented here)

// --- Initialization ---
window.onload = function() {
    try {
        initDailyGame();
        document.getElementById('resetGameBtn').addEventListener('click', resetGame);
        document.getElementById('nextDayBtn').addEventListener('click', () => {
            if (gameState.manualDayAdvances >= 5) {
                updateGameDisplay("오늘은 더 이상 수동으로 날짜를 넘길 수 없습니다. 내일 다시 시도해주세요.");
                return;
            }
            updateState({
                manualDayAdvances: gameState.manualDayAdvances + 1,
                day: gameState.day + 1,
                lastPlayedDate: new Date().toISOString().slice(0, 10),
                dailyEventTriggered: false
            });
            processDailyEvents();
        });
    } catch (e) {
        console.error("오늘의 게임 생성 중 오류 발생:", e);
        document.getElementById('gameDescription').innerText = "콘텐츠를 불러오는 데 실패했습니다. 페이지를 새로고침해 주세요.";
    }
};