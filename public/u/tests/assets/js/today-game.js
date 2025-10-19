// today-game.js - INTJ - 전략가의 비밀 연구소 (The Strategist's Secret Laboratory)

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
        strategy: 50,
        knowledge: 50,
        vision: 50,
        influence: 50,
        efficiency: 50,
        actionPoints: 10, // Represents '집중력'
        maxActionPoints: 10,
        resources: { data: 10, algorithms: 10, computing_power: 5, breakthroughs: 0 },
        researchers: [
            { id: "newton", name: "뉴턴", personality: "분석적인", skill: "데이터 마이닝", loyalty: 70 },
            { id: "tesla", name: "테슬라", personality: "독창적인", skill: "알고리즘 설계", loyalty: 60 }
        ],
        maxResearchers: 5,
        currentScenarioId: "intro",
        lastPlayedDate: new Date().toISOString().slice(0, 10),
        manualDayAdvances: 0,
        dailyEventTriggered: false,
        dailyBonus: { researchSuccess: 0 },
        dailyActions: { analyzed: false, debated: false, simulated: [], minigamePlayed: false },
        researchModules: {
            dataServer: { built: false, durability: 100, name: "데이터 서버", description: "방대한 데이터를 저장하고 처리합니다.", effect_description: "데이터 자동 생성 및 지식 보너스." },
            simulationLab: { built: false, durability: 100, name: "시뮬레이션 랩", description: "가설을 검증하고 미래를 예측합니다.", effect_description: "알고리즘 생성 및 전략 능력 향상." },
            controlTower: { built: false, durability: 100, name: "관제탑", description: "연구소의 모든 활동을 총괄합니다.", effect_description: "새로운 연구원 영입 및 영향력 강화." },
            aiCore: { built: false, durability: 100, name: "AI 코어", description: "스스로 학습하고 발전하는 인공지능입니다.", effect_description: "과거 기록을 통해 스탯 및 자원 획득." },
            quantumComputer: { built: false, durability: 100, name: "양자 컴퓨터", description: "기존의 한계를 뛰어넘는 연산을 수행합니다.", effect_description: "기술 혁신 획득 및 고급 연구 잠금 해제." }
        },
        labLevel: 0,
        minigameState: {}
    };
    currentRandFn = mulberry32(getDailySeed() + gameState.day);
}

function saveGameState() {
    localStorage.setItem('intjLabGame', JSON.stringify(gameState));
}

function loadGameState() {
    const savedState = localStorage.getItem('intjLabGame');
    const today = new Date().toISOString().slice(0, 10);
    if (savedState) {
        let loaded = JSON.parse(savedState);
        if (!loaded.dailyBonus) loaded.dailyBonus = { researchSuccess: 0 };
        if (!loaded.researchModules) {
            loaded.researchModules = {
                dataServer: { built: false, durability: 100, name: "데이터 서버" },
                simulationLab: { built: false, durability: 100, name: "시뮬레이션 랩" },
                controlTower: { built: false, durability: 100, name: "관제탑" },
                aiCore: { built: false, durability: 100, name: "AI 코어" },
                quantumComputer: { built: false, durability: 100, name: "양자 컴퓨터" }
            };
        }
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
    const researcherListHtml = gameState.researchers.map(r => `<li>${r.name} (${r.skill}) - 충성도: ${r.loyalty}</li>`).join('');
    statsDiv.innerHTML = `
        <p><b>${gameState.day}일차 연구</b></p>
        <p><b>집중력:</b> ${gameState.actionPoints}/${gameState.maxActionPoints}</p>
        <p><b>전략:</b> ${gameState.strategy} | <b>지식:</b> ${gameState.knowledge} | <b>비전:</b> ${gameState.vision} | <b>영향력:</b> ${gameState.influence} | <b>효율성:</b> ${gameState.efficiency}</p>
        <p><b>자원:</b> 데이터 ${gameState.resources.data}, 알고리즘 ${gameState.resources.algorithms}, 컴퓨팅 파워 ${gameState.resources.computing_power}, 기술 혁신 ${gameState.resources.breakthroughs || 0}</p>
        <p><b>연구소 레벨:</b> ${gameState.labLevel}</p>
        <p><b>소속 연구원 (${gameState.researchers.length}/${gameState.maxResearchers}):</b></p>
        <ul>${researcherListHtml}</ul>
        <p><b>연구 모듈:</b></p>
        <ul>${Object.values(gameState.researchModules).filter(m => m.built).map(m => `<li>${m.name} (내구성: ${m.durability})</li>`).join('') || '없음'}</ul>
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
        dynamicChoices = [];
        if (!gameState.researchModules.dataServer.built) dynamicChoices.push({ text: "데이터 서버 구축 (데이터 50, 컴퓨팅 파워 20)", action: "build_dataServer" });
        if (!gameState.researchModules.simulationLab.built) dynamicChoices.push({ text: "시뮬레이션 랩 구축 (알고리즘 30, 컴퓨팅 파워 30)", action: "build_simulationLab" });
        if (!gameState.researchModules.controlTower.built) dynamicChoices.push({ text: "관제탑 건설 (데이터 100, 알고리즘 50)", action: "build_controlTower" });
        if (!gameState.researchModules.aiCore.built) dynamicChoices.push({ text: "AI 코어 개발 (알고리즘 80, 컴퓨팅 파워 40)", action: "build_aiCore" });
        if (gameState.researchModules.simulationLab.built && !gameState.researchModules.quantumComputer.built) {
            dynamicChoices.push({ text: "양자 컴퓨터 도입 (컴퓨팅 파워 150, 기술 혁신 5)", action: "build_quantumComputer" });
        }
        Object.keys(gameState.researchModules).forEach(key => {
            const module = gameState.researchModules[key];
            if (module.built && module.durability < 100) {
                dynamicChoices.push({ text: `${module.name} 최적화 (알고리즘 10, 컴퓨팅 파워 10)`, action: "maintain_module", params: { module: key } });
            }
        });
        dynamicChoices.push({ text: "취소", action: "return_to_intro" });
    } else {
        dynamicChoices = choices ? [...choices] : [];
    }

    choicesDiv.innerHTML = dynamicChoices.map(choice => `<button class="choice-btn" data-action="${choice.action}" data-params='${JSON.stringify(choice.params || {})}' >${choice.text}</button>`).join('');
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

// --- Game Data (INTJ Themed) ---
const gameScenarios = {
    "intro": { text: "오늘은 연구소를 위해 무엇을 하시겠습니까?", choices: [
        { text: "데이터 분석", action: "analyze_data" },
        { text: "연구원과 토론", action: "debate_with_researchers" },
        { text: "시뮬레이션 실행", action: "run_simulation" },
        { text: "자원 확보", action: "show_resource_gathering_options" },
        { text: "연구 모듈 관리", action: "show_module_management_options" },
        { text: "지적 유희", action: "show_intellectual_pastimes_options" },
        { text: "오늘의 논리 퍼즐", action: "play_minigame" }
    ]},
    "action_resource_gathering": {
        text: "어떤 자원을 확보하시겠습니까?",
        choices: [
            { text: "데이터 수집", action: "gather_data" },
            { text: "알고리즘 설계", action: "design_algorithms" },
            { text: "컴퓨팅 파워 증설", action: "expand_computing_power" },
            { text: "취소", action: "return_to_intro" }
        ]
    },
    "action_module_management": { text: "어떤 연구 모듈을 관리하시겠습니까?", choices: [] },
    "intellectual_pastimes_menu": {
        text: "어떤 지적 유희를 즐기시겠습니까?",
        choices: [
            { text: "체스 (집중력 1 소모)", action: "play_chess" },
            { text: "고전 연구 (집중력 1 소모)", action: "study_classics" },
            { text: "취소", action: "return_to_intro" }
        ]
    },
    // Game Over Scenarios
    "game_over_strategy": { text: "치명적인 전략적 오류로 인해 연구 프로젝트가 실패했습니다. 연구소는 폐쇄됩니다.", choices: [], final: true },
    "game_over_knowledge": { text: "지식의 한계에 부딪혔습니다. 더 이상 연구를 진척시킬 수 없습니다.", choices: [], final: true },
    "game_over_vision": { text: "비전을 잃은 연구는 방향을 잃고 표류합니다. 당신의 리더십은 끝났습니다.", choices: [], final: true },
    "game_over_resources": { text: "연구 자원이 모두 고갈되어 더 이상 연구소를 운영할 수 없습니다.", choices: [], final: true },
};

const analyzeDataOutcomes = [
    { weight: 30, condition: (gs) => gs.knowledge > 60, effect: (gs) => { const v = getRandomValue(10, 5); return { changes: { strategy: gs.strategy + v }, message: "데이터 속에서 핵심 패턴을 발견하여 완벽한 전략을 수립했습니다! (+${v} 전략)" }; } },
    { weight: 25, condition: () => true, effect: (gs) => { const v = getRandomValue(5, 2); return { changes: { vision: gs.vision + v }, message: "데이터 분석을 통해 미래에 대한 새로운 비전을 얻었습니다. (+${v} 비전)" }; } },
    { weight: 20, condition: () => true, effect: (gs) => { const v = getRandomValue(5, 2); return { changes: { resources: { ...gs.resources, data: gs.resources.data - v } }, message: "데이터 처리 중 오류가 발생하여 일부 데이터를 잃었습니다. (-${v} 데이터)" }; } },
    { weight: 15, condition: (gs) => gs.knowledge < 40, effect: (gs) => { const v = getRandomValue(5, 2); return { changes: { efficiency: gs.efficiency - v }, message: "지식이 부족하여 데이터 분석이 비효율적으로 진행됩니다. (-${v} 효율성)" }; } },
];

const debateOutcomes = [
    { weight: 40, condition: (gs, researcher) => researcher.loyalty < 80, effect: (gs, researcher) => { const v = getRandomValue(10, 5); const updated = gs.researchers.map(r => r.id === researcher.id ? { ...r, loyalty: Math.min(100, r.loyalty + v) } : r); return { changes: { researchers: updated }, message: `${researcher.name}${getWaGwaParticle(researcher.name)}의 논리적인 토론으로 그의 충성도를 얻었습니다. (+${v} 충성도)` }; } },
    { weight: 30, condition: () => true, effect: (gs, researcher) => { const v = getRandomValue(5, 2); return { changes: { knowledge: gs.knowledge + v }, message: `${researcher.name}에게서 새로운 지식을 습득했습니다. (+${v} 지식)` }; } },
    { weight: 20, condition: (gs) => gs.strategy < 40, effect: (gs, researcher) => { const v = getRandomValue(10, 3); const updated = gs.researchers.map(r => r.id === researcher.id ? { ...r, loyalty: Math.max(0, r.loyalty - v) } : r); return { changes: { researchers: updated }, message: `당신의 전략이 논리적으로 부족하여 ${researcher.name}이(가) 반박합니다. (-${v} 충성도)` }; } },
];

const simulationOutcomes = [
    { weight: 40, condition: (gs) => gs.strategy > 60, effect: (gs) => { const v = getRandomValue(10, 3); return { changes: { vision: gs.vision + v }, message: "시뮬레이션이 성공적으로 완료되어, 당신의 비전이 더욱 명확해졌습니다. (+${v} 비전)" }; } },
    { weight: 30, condition: () => true, effect: (gs) => { const v = getRandomValue(10, 3); return { changes: { efficiency: gs.efficiency + v }, message: "시뮬레이션을 통해 가장 효율적인 경로를 발견했습니다. (+${v} 효율성)" }; } },
    { weight: 20, condition: (gs) => gs.knowledge < 40, effect: (gs) => { const v = getRandomValue(10, 4); return { changes: { influence: gs.influence - v }, message: "지식 부족으로 시뮬레이션에 오류가 발생하여 영향력이 감소했습니다. (-${v} 영향력)" }; } },
];

const minigames = [
    {
        name: "논리 오류 찾기",
        description: "주어진 명제들 사이의 논리적 오류를 찾아내세요.",
        start: (gameArea, choicesDiv) => {
            const fallacies = [{ q: "모든 까마귀는 검다. 저 새는 검지 않다. 따라서 저 새는 까마귀가 아니다.", a: ["참이다", "거짓이다"], correct: 0 }, { q: "성공한 사람들은 모두 아침형 인간이다. 나도 아침형 인간이 되면 성공할 것이다.", a: ["참이다", "거짓이다"], correct: 1 }];
            gameState.minigameState = { score: 0, stage: 1, problems: fallacies.sort(() => currentRandFn() - 0.5) };
            minigames[0].render(gameArea, choicesDiv);
        },
        render: (gameArea, choicesDiv) => {
            const state = gameState.minigameState;
            if (state.stage > state.problems.length) { minigames[0].end(); return; }
            const problem = state.problems[state.stage - 1];
            gameArea.innerHTML = `<p><b>명제 ${state.stage}:</b> ${problem.q}</p>`;
            choicesDiv.innerHTML = problem.a.map((ans, i) => `<button class="choice-btn" data-index="${i}">${ans}</button>`).join('');
            choicesDiv.querySelectorAll('.choice-btn').forEach(button => button.addEventListener('click', () => minigames[0].processAction('select_option', parseInt(button.dataset.index))));
        },
        processAction: (actionType, value) => {
            const state = gameState.minigameState;
            const problem = state.problems[state.stage - 1];
            if (value === problem.correct) { state.score += 50; updateGameDisplay("정확한 지적입니다!"); } else { updateGameDisplay("오류를 발견하지 못했습니다."); }
            state.stage++;
            setTimeout(() => minigames[0].render(document.getElementById('gameArea'), document.getElementById('gameChoices')), 1500);
        },
        end: () => {
            const rewards = calculateMinigameReward(minigames[0].name, gameState.minigameState.score);
            updateState({ strategy: gameState.strategy + rewards.strategy, knowledge: gameState.knowledge + rewards.knowledge, currentScenarioId: 'intro' }, rewards.message);
        }
    },
];

function calculateMinigameReward(minigameName, score) {
    let rewards = { strategy: 0, knowledge: 0, message: "" };
    if (score >= 100) { rewards.strategy = 15; rewards.knowledge = 10; rewards.message = "완벽한 논증입니다! (+15 전략, +10 지식)"; } 
    else if (score >= 50) { rewards.strategy = 10; rewards.knowledge = 5; rewards.message = "날카로운 분석입니다. (+10 전략, +5 지식)"; } 
    else { rewards.strategy = 5; rewards.message = "논리적 사고를 훈련했습니다. (+5 전략)"; }
    return rewards;
}

function spendActionPoint() {
    if (gameState.actionPoints <= 0) { updateGameDisplay("집중력이 부족합니다."); return false; }
    updateState({ actionPoints: gameState.actionPoints - 1 });
    return true;
}

const gameActions = {
    analyze_data: () => {
        if (!spendActionPoint()) return;
        const possibleOutcomes = analyzeDataOutcomes.filter(o => !o.condition || o.condition(gameState));
        const totalWeight = possibleOutcomes.reduce((sum, o) => sum + o.weight, 0);
        const rand = currentRandFn() * totalWeight;
        let cumulativeWeight = 0;
        let chosenOutcome = possibleOutcomes.find(o => (cumulativeWeight += o.weight) >= rand) || possibleOutcomes[0];
        const result = chosenOutcome.effect(gameState);
        updateState(result.changes, result.message);
    },
    debate_with_researchers: () => {
        if (!spendActionPoint()) return;
        const researcher = gameState.researchers[Math.floor(currentRandFn() * gameState.researchers.length)];
        const possibleOutcomes = debateOutcomes.filter(o => !o.condition || o.condition(gameState, researcher));
        const totalWeight = possibleOutcomes.reduce((sum, o) => sum + o.weight, 0);
        const rand = currentRandFn() * totalWeight;
        let cumulativeWeight = 0;
        let chosenOutcome = possibleOutcomes.find(o => (cumulativeWeight += o.weight) >= rand) || possibleOutcomes[0];
        const result = chosenOutcome.effect(gameState, researcher);
        updateState(result.changes, result.message);
    },
    run_simulation: () => {
        if (!spendActionPoint()) return;
        const possibleOutcomes = simulationOutcomes.filter(o => !o.condition || o.condition(gameState));
        const totalWeight = possibleOutcomes.reduce((sum, o) => sum + o.weight, 0);
        const rand = currentRandFn() * totalWeight;
        let cumulativeWeight = 0;
        let chosenOutcome = possibleOutcomes.find(o => (cumulativeWeight += o.weight) >= rand) || possibleOutcomes[0];
        const result = chosenOutcome.effect(gameState);
        updateState(result.changes, result.message);
    },
    show_resource_gathering_options: () => updateState({ currentScenarioId: 'action_resource_gathering' }),
    show_module_management_options: () => updateState({ currentScenarioId: 'action_module_management' }),
    show_intellectual_pastimes_options: () => updateState({ currentScenarioId: 'intellectual_pastimes_menu' }),
    gather_data: () => {
        if (!spendActionPoint()) return;
        const gain = getRandomValue(10, 4);
        updateState({ resources: { ...gameState.resources, data: gameState.resources.data + gain } }, `유의미한 데이터를 수집했습니다. (+${gain} 데이터)`);
    },
    design_algorithms: () => {
        if (!spendActionPoint()) return;
        const gain = getRandomValue(10, 4);
        updateState({ resources: { ...gameState.resources, algorithms: gameState.resources.algorithms + gain } }, `효율적인 알고리즘을 설계했습니다. (+${gain} 알고리즘)`);
    },
    expand_computing_power: () => {
        if (!spendActionPoint()) return;
        const gain = getRandomValue(5, 2);
        updateState({ resources: { ...gameState.resources, computing_power: gameState.resources.computing_power + gain } }, `컴퓨팅 파워를 증설했습니다. (+${gain} 컴퓨팅 파워)`);
    },
    build_dataServer: () => {
        if (!spendActionPoint()) return;
        const cost = { data: 50, computing_power: 20 };
        if (gameState.resources.data >= cost.data && gameState.resources.computing_power >= cost.computing_power) {
            gameState.researchModules.dataServer.built = true;
            const v = getRandomValue(10, 3);
            updateState({ knowledge: gameState.knowledge + v, resources: { ...gameState.resources, data: gameState.resources.data - cost.data, computing_power: gameState.resources.computing_power - cost.computing_power } }, `데이터 서버를 구축했습니다! (+${v} 지식)`);
        } else { updateState({}, "자원이 부족합니다."); }
    },
    build_simulationLab: () => {
        if (!spendActionPoint()) return;
        const cost = { algorithms: 30, computing_power: 30 };
        if (gameState.resources.algorithms >= cost.algorithms && gameState.resources.computing_power >= cost.computing_power) {
            gameState.researchModules.simulationLab.built = true;
            const v = getRandomValue(10, 3);
            updateState({ strategy: gameState.strategy + v, resources: { ...gameState.resources, algorithms: gameState.resources.algorithms - cost.algorithms, computing_power: gameState.resources.computing_power - cost.computing_power } }, `시뮬레이션 랩을 구축했습니다! (+${v} 전략)`);
        } else { updateState({}, "자원이 부족합니다."); }
    },
    build_controlTower: () => {
        if (!spendActionPoint()) return;
        const cost = { data: 100, algorithms: 50 };
        if (gameState.resources.data >= cost.data && gameState.resources.algorithms >= cost.algorithms) {
            gameState.researchModules.controlTower.built = true;
            const v = getRandomValue(15, 5);
            updateState({ influence: gameState.influence + v, resources: { ...gameState.resources, data: gameState.resources.data - cost.data, algorithms: gameState.resources.algorithms - cost.algorithms } }, `관제탑을 건설했습니다! (+${v} 영향력)`);
        } else { updateState({}, "자원이 부족합니다."); }
    },
    build_aiCore: () => {
        if (!spendActionPoint()) return;
        const cost = { algorithms: 80, computing_power: 40 };
        if (gameState.resources.algorithms >= cost.algorithms && gameState.resources.computing_power >= cost.computing_power) {
            gameState.researchModules.aiCore.built = true;
            const v = getRandomValue(15, 5);
            updateState({ knowledge: gameState.knowledge + v, resources: { ...gameState.resources, algorithms: gameState.resources.algorithms - cost.algorithms, computing_power: gameState.resources.computing_power - cost.computing_power } }, `AI 코어를 개발했습니다! (+${v} 지식)`);
        } else { updateState({}, "자원이 부족합니다."); }
    },
    build_quantumComputer: () => {
        if (!spendActionPoint()) return;
        const cost = { computing_power: 150, breakthroughs: 5 };
        if (gameState.resources.computing_power >= cost.computing_power && gameState.resources.breakthroughs >= cost.breakthroughs) {
            gameState.researchModules.quantumComputer.built = true;
            const v = getRandomValue(20, 5);
            updateState({ vision: gameState.vision + v, resources: { ...gameState.resources, computing_power: gameState.resources.computing_power - cost.computing_power, breakthroughs: gameState.resources.breakthroughs - cost.breakthroughs } }, `양자 컴퓨터를 도입했습니다! (+${v} 비전)`);
        } else { updateState({}, "자원이 부족합니다."); }
    },
    maintain_module: (params) => {
        if (!spendActionPoint()) return;
        const moduleKey = params.module;
        const cost = { algorithms: 10, computing_power: 10 };
        if (gameState.resources.algorithms >= cost.algorithms && gameState.resources.computing_power >= cost.computing_power) {
            gameState.researchModules[moduleKey].durability = 100;
            updateState({ resources: { ...gameState.resources, algorithms: gameState.resources.algorithms - cost.algorithms, computing_power: gameState.resources.computing_power - cost.computing_power } }, `${gameState.researchModules[moduleKey].name} 모듈을 최적화했습니다.`);
        } else { updateState({}, "자원이 부족합니다."); }
    },
    play_chess: () => {
        if (!spendActionPoint()) return;
        const rand = currentRandFn();
        if (rand < 0.5) {
            const v = getRandomValue(10, 5);
            updateState({ strategy: gameState.strategy + v }, `체스 대결에서 승리하여 전략이 상승했습니다! (+${v} 전략)`);
        } else {
            const v = getRandomValue(5, 2);
            updateState({ strategy: gameState.strategy - v }, `체스 대결에서 아쉽게 패배했습니다. (-${v} 전략)`);
        }
    },
    study_classics: () => {
        if (!spendActionPoint()) return;
        const rand = currentRandFn();
        if (rand < 0.6) {
            const v = getRandomValue(10, 5);
            updateState({ knowledge: gameState.knowledge + v }, `고전 연구를 통해 깊은 지식을 얻었습니다. (+${v} 지식)`);
        } else {
            updateState({}, `고전은 너무 따분했습니다.`);
        }
    },
    play_minigame: () => {
        if (!spendActionPoint()) return;
        const minigame = minigames[0];
        gameState.currentScenarioId = `minigame_${minigame.name}`;
        updateState({ dailyActions: { ...gameState.dailyActions, minigamePlayed: true } });
        updateGameDisplay(minigame.description);
        minigame.start(document.getElementById('gameArea'), document.getElementById('gameChoices'));
    },
    return_to_intro: () => updateState({ currentScenarioId: 'intro' }),
    manualNextDay: () => {
        if (gameState.manualDayAdvances >= 5) { updateGameDisplay("오늘은 더 이상 다음 날로 넘어갈 수 없습니다."); return; }
        updateState({
            manualDayAdvances: gameState.manualDayAdvances + 1,
            day: gameState.day + 1,
            dailyEventTriggered: false
        });
        processDailyEvents();
    },
};

function applyStatEffects() {
    let message = "";
    if (gameState.strategy >= 70) { message += "뛰어난 전략으로 연구 효율이 증가합니다. "; }
    if (gameState.knowledge >= 70) { const v = getRandomValue(5, 2); gameState.resources.algorithms += v; message += `방대한 지식을 기반으로 새로운 알고리즘을 발견했습니다. (+${v} 알고리즘) `; }
    if (gameState.vision >= 70) { const v = getRandomValue(2, 1); gameState.researchers.forEach(r => r.loyalty = Math.min(100, r.loyalty + v)); message += `당신의 비전에 연구원들이 감화되어 충성도가 상승합니다. (+${v} 충성도) `; }
    if (gameState.influence < 30) { gameState.actionPoints -= 1; message += "영향력이 부족하여 집중력이 1 감소합니다. "; }
    if (gameState.efficiency < 30) { Object.keys(gameState.researchModules).forEach(key => { if(gameState.researchModules[key].built) gameState.researchModules[key].durability -= 1; }); message += "효율성이 저하되어 연구 모듈들이 노후화됩니다. "; }
    return message;
}

const weightedDailyEvents = [
    { id: "logical_fallacy", weight: 10, condition: () => gameState.knowledge < 40, onTrigger: () => { const v = getRandomValue(10, 3); updateState({ knowledge: gameState.knowledge - v, strategy: gameState.strategy - v }, `연구에서 치명적인 논리적 오류가 발견되었습니다. (-${v} 지식, -${v} 전략)`); } },
    { id: "power_outage", weight: 5, condition: () => true, onTrigger: () => { const v = getRandomValue(15, 5); updateState({ resources: { ...gameState.resources, computing_power: gameState.resources.computing_power - v }, efficiency: gameState.efficiency - 5 }, `갑작스러운 정전으로 컴퓨팅 파워가 손실되고 효율성이 저하됩니다. (-${v} 컴퓨팅 파워, -5 효율성)`); } },
    { id: "new_discovery", weight: 15, condition: () => true, onTrigger: () => { const v = getRandomValue(10, 5); updateState({ vision: gameState.vision + v }, `획기적인 발견으로 새로운 비전이 생겼습니다! (+${v} 비전)`); } },
];

function processDailyEvents() {
    if (gameState.dailyEventTriggered) return;
    currentRandFn = mulberry32(getDailySeed() + gameState.day);
    updateState({ actionPoints: 10, dailyEventTriggered: true });
    const statEffectMessage = applyStatEffects();
    let dailyMessage = "새로운 연구의 날이 밝았습니다. " + statEffectMessage;

    if (gameState.strategy <= 0) { gameState.currentScenarioId = "game_over_strategy"; }
    else if (gameState.knowledge <= 0) { gameState.currentScenarioId = "game_over_knowledge"; }
    else if (gameState.vision <= 0) { gameState.currentScenarioId = "game_over_vision"; }
    else if (gameState.resources.data <= 0 && gameState.day > 1) { gameState.currentScenarioId = "game_over_resources"; }

    let eventId = "intro";
    const possibleEvents = weightedDailyEvents.filter(event => !event.condition || event.condition());
    if (possibleEvents.length > 0) {
        const totalWeight = possibleEvents.reduce((sum, event) => sum + event.weight, 0);
        const rand = currentRandFn() * totalWeight;
        let cumulativeWeight = 0;
        let chosenEvent = possibleEvents.find(event => (cumulativeWeight += event.weight) >= rand);
        if (chosenEvent) {
            eventId = chosenEvent.id;
            if (chosenEvent.onTrigger) chosenEvent.onTrigger();
        }
    }
    if (!gameScenarios[gameState.currentScenarioId]) {
        gameState.currentScenarioId = eventId;
    }
    updateGameDisplay(dailyMessage + (gameScenarios[gameState.currentScenarioId]?.text || ''));
    renderChoices(gameScenarios[gameState.currentScenarioId]?.choices || []);
    saveGameState();
}

function initDailyGame() {
    loadGameState();
}

function resetGame() {
    if (confirm("정말로 연구소를 폐쇄하시겠습니까? 모든 데이터가 사라집니다.")) {
        localStorage.removeItem('intjLabGame');
        resetGameState();
        saveGameState();
        location.reload();
    }
}

window.onload = function() {
    try {
        initDailyGame();
        document.getElementById('resetGameBtn').addEventListener('click', resetGame);
        document.getElementById('nextDayBtn').addEventListener('click', gameActions.manualNextDay);
    } catch (e) {
        console.error("오늘의 게임 생성 중 오류 발생:", e);
        document.getElementById('gameDescription').innerText = "콘텐츠를 불러오는 데 실패했습니다. 페이지를 새로고침해 주세요.";
    }
};