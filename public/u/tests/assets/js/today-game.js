// today-game.js - INTJ - 전략가의 비밀 연구소 (Strategist's Secret Lab)

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
    if (!word || word.length === 0) return "";
    const lastChar = word[word.length - 1];
    const uni = lastChar.charCodeAt(0);
    if (uni < 0xAC00 || uni > 0xD7A3) return "를";
    return (uni - 0xAC00) % 28 > 0 ? "을" : "를";
}

function getWaGwaParticle(word) {
    if (!word || word.length === 0) return "";
    const lastChar = word[word.length - 1];
    const uni = lastChar.charCodeAt(0);
    if (uni < 0xAC00 || uni > 0xD7A3) return "와";
    return (uni - 0xAC00) % 28 > 0 ? "과" : "와";
}

function showFeedback(isSuccess, message) {
    const feedbackMessage = document.getElementById('feedbackMessage');
    if (feedbackMessage) {
        feedbackMessage.innerText = message;
        feedbackMessage.className = `feedback-message ${isSuccess ? 'correct' : 'incorrect'}`;
    }
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
        efficiency: 50,
        precision: 50,
        actionPoints: 10, // Internally actionPoints, but represents 'concentration' in UI
        maxActionPoints: 10,
        resources: { data: 10, algorithms: 10, computing_power: 5, technological_innovation: 0 },
        researchers: [
            { id: "ada", name: "에이다", personality: "분석적인", skill: "데이터 마이닝", trust: 70 },
            { id: "alan", name: "앨런", personality: "독창적인", skill: "알고리즘 설계", trust: 60 }
        ],
        maxResearchers: 5,
        currentScenarioId: "intro",
        lastPlayedDate: new Date().toISOString().slice(0, 10),
        manualDayAdvances: 0,
        dailyEventTriggered: false,
        dailyBonus: { researchSuccess: 0 }, // Re-themed from gatheringSuccess
        dailyActions: { analyzed: false, discussed: false, simulated: false, minigamePlayed: false }, // Re-themed
        researchModules: {
            dataServer: { built: false, durability: 100, name: "데이터 서버", description: "방대한 데이터를 저장하고 처리합니다.", effect_description: "데이터 및 지식 증가." },
            simulationLab: { built: false, durability: 100, name: "시뮬레이션 랩", description: "복잡한 가설을 검증하고 결과를 예측합니다.", effect_description: "전략 및 비전 증가." },
            controlTower: { built: false, durability: 100, name: "관제탑", description: "연구소의 모든 활동을 통제하고 지휘합니다.", effect_description: "효율성 및 전략 증가." },
            aiCore: { built: false, durability: 100, name: "AI 코어", description: "고급 알고리즘을 개발하고 AI를 훈련합니다.", effect_description: "알고리즘 및 정밀도 증가." },
            quantumComputer: { built: false, durability: 100, name: "양자 컴퓨터", description: "미래 기술을 연구하고 혁신을 가속화합니다.", effect_description: "기술 혁신 및 희귀 자원 발견 확률 증가." }
        },
        labLevel: 0, // Re-themed from toolsLevel
        minigameState: {}
    };
    currentRandFn = mulberry32(getDailySeed() + gameState.day);
}

function saveGameState() {
    localStorage.setItem('intjSecretLabGame', JSON.stringify(gameState));
}

function loadGameState() {
    const savedState = localStorage.getItem('intjSecretLabGame');
    const today = new Date().toISOString().slice(0, 10);
    if (savedState) {
        let loaded = JSON.parse(savedState);
        // Patch for old save files
        if (!loaded.dailyBonus) loaded.dailyBonus = { researchSuccess: 0 };
        if (!loaded.researchers || loaded.researchers.length === 0) {
            loaded.researchers = [
                { id: "ada", name: "에이다", personality: "분석적인", skill: "데이터 마이닝", trust: 70 },
                { id: "alan", name: "앨런", personality: "독창적인", skill: "알고리즘 설계", trust: 60 }
            ];
        }
        // Ensure new stats are initialized if loading old save
        if (loaded.strategy === undefined) loaded.strategy = 50;
        if (loaded.knowledge === undefined) loaded.knowledge = 50;
        if (loaded.vision === undefined) loaded.vision = 50;
        if (loaded.efficiency === undefined) loaded.efficiency = 50;
        if (loaded.precision === undefined) loaded.precision = 50;
        if (loaded.labLevel === undefined) loaded.labLevel = 0;

        Object.assign(gameState, loaded);

        // Always initialize currentRandFn after loading state
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
    const researcherListHtml = gameState.researchers.map(r => `<li>${r.name} (${r.skill}) - 신뢰도: ${r.trust}</li>`).join('');
    statsDiv.innerHTML = `
        <p><b>날짜:</b> ${gameState.day}일</p>
        <p><b>집중력:</b> ${gameState.actionPoints}/${gameState.maxActionPoints}</p>
        <p><b>전략:</b> ${gameState.strategy} | <b>지식:</b> ${gameState.knowledge} | <b>비전:</b> ${gameState.vision} | <b>효율성:</b> ${gameState.efficiency} | <b>정밀도:</b> ${gameState.precision}</p>
        <p><b>자원:</b> 데이터 ${gameState.resources.data}, 알고리즘 ${gameState.resources.algorithms}, 컴퓨팅 파워 ${gameState.resources.computing_power}, 기술 혁신 ${gameState.resources.technological_innovation || 0}</p>
        <p><b>연구소 레벨:</b> ${gameState.labLevel}</p>
        <p><b>연구원 (${gameState.researchers.length}/${gameState.maxResearchers}):</b></p>
        <ul>${researcherListHtml}</ul>
        <p><b>구축된 연구 모듈:</b></p>
        <ul>${Object.values(gameState.researchModules).filter(m => m.built).map(m => `<li>${m.name} (내구도: ${m.durability}) - ${m.effect_description}</li>`).join('') || '없음'}</ul>
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
        // Build options
        if (!gameState.researchModules.dataServer.built) dynamicChoices.push({ text: "데이터 서버 구축 (데이터 50, 알고리즘 20)", action: "build_dataServer" });
        if (!gameState.researchModules.simulationLab.built) dynamicChoices.push({ text: "시뮬레이션 랩 구축 (알고리즘 30, 컴퓨팅 파워 30)", action: "build_simulationLab" });
        if (!gameState.researchModules.controlTower.built) dynamicChoices.push({ text: "관제탑 구축 (데이터 100, 알고리즘 50, 컴퓨팅 파워 50)", action: "build_controlTower" });
        if (!gameState.researchModules.aiCore.built) dynamicChoices.push({ text: "AI 코어 구축 (알고리즘 80, 컴퓨팅 파워 40)", action: "build_aiCore" });
        if (gameState.researchModules.simulationLab.built && gameState.researchModules.simulationLab.durability > 0 && !gameState.researchModules.quantumComputer.built) {
            dynamicChoices.push({ text: "양자 컴퓨터 구축 (알고리즘 50, 컴퓨팅 파워 100)", action: "build_quantumComputer" });
        }
        // Maintenance options
        Object.keys(gameState.researchModules).forEach(key => {
            const module = gameState.researchModules[key];
            if (module.built && module.durability < 100) {
                dynamicChoices.push({ text: `${module.name} 최적화 (알고리즘 10, 컴퓨팅 파워 10)`, action: "optimize_module", params: { module: key } });
            }
        });
        dynamicChoices.push({ text: "취소", action: "return_to_intro" });
    } else { // For any other scenario, use its predefined choices
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

// --- Game Data ---
const gameScenarios = {
    "intro": { text: "비밀 연구소에서 무엇을 할까요?", choices: [
        { text: "데이터 분석", action: "analyze_data" },
        { text: "연구원과 토론", action: "discuss_with_researcher" },
        { text: "시뮬레이션 실행", action: "run_simulation" },
        { text: "자원 수집", action: "show_resource_collection_options" },
        { text: "연구 모듈 관리", action: "show_module_management_options" },
        { text: "심층 연구", action: "show_deep_research_options" },
        { text: "오늘의 발견", action: "play_minigame" }
    ]},
    "daily_event_power_outage": {
        text: "", // Set by onTrigger
        choices: [{ text: "확인", action: "return_to_intro" }]
    },
    "daily_event_algorithm_bug": {
        text: "", // Set by onTrigger
        choices: [{ text: "확인", action: "return_to_intro" }]
    },
    "daily_event_logical_error": {
        text: "연구 중 치명적인 논리적 오류를 발견했습니다. 연구소의 정밀도가 흔들리고 있습니다.",
        choices: [
            { text: "오류의 원인을 분석하고 수정한다 (집중력 1 소모)", action: "fix_logical_error" },
            { text: "오류를 무시하고 진행한다", action: "ignore_logical_error" }
        ]
    },
    "daily_event_data_corruption": {
        text: "", // Set by onTrigger
        choices: [{ text: "확인", action: "return_to_intro" }]
    },
    "daily_event_researcher_dispute": {
        text: "에이다와 앨런 사이에 연구 방향에 대한 작은 의견 차이가 생겼습니다. 둘 다 당신의 판단을 기다리는 것 같습니다.",
        choices: [
            { text: "에이다의 관점을 먼저 들어준다.", action: "handle_researcher_dispute", params: { first: "ada", second: "alan" } },
            { text: "앨런의 관점을 먼저 들어준다.", action: "handle_researcher_dispute", params: { first: "alan", second: "ada" } },
            { text: "둘을 불러 효율적인 해결책을 찾는다.", action: "mediate_researcher_dispute" },
            { text: "신경 쓰지 않는다.", action: "ignore_event" }
        ]
    },
    "daily_event_new_researcher": {
        choices: [
            { text: "유능한 인재를 영입한다.", action: "welcome_new_unique_researcher" },
            { text: "연구소에 필요한지 좀 더 지켜본다.", action: "observe_researcher" },
            { text: "정중히 거절한다.", action: "reject_researcher" }
        ]
    },
    "daily_event_external_funding": {
        text: "외부 기관에서 연구 자금 지원을 제안했습니다. 그들은 [데이터 50개]를 [기술 혁신 5개]와 교환하자고 제안합니다.",
        choices: [
            { text: "제안을 수락한다", action: "accept_funding" },
            { text: "제안을 거절한다", action: "decline_funding" }
        ]
    },
    "daily_event_breakthrough_discovery": {
        text: "", // Set by onTrigger
        choices: [{ text: "확인", action: "return_to_intro" }]
    },
    "daily_event_vision_crisis": {
        text: "연구소의 비전이 흐려지고 있습니다. 미래에 대한 확신이 흔들립니다.",
        choices: [
            { text: "원대한 비전을 재정립한다 (집중력 1 소모)", action: "reaffirm_vision" },
            { text: "혼란 속에서 방황한다", action: "wander_in_confusion" }
        ]
    },
    "game_over_strategy": { text: "연구소의 전략이 고갈되어 더 이상 나아갈 방향을 찾을 수 없습니다. 비밀 연구소는 혼란에 빠졌습니다.", choices: [], final: true },
    "game_over_knowledge": { text: "연구소의 지식이 부족하여 더 이상 새로운 기술을 개발할 수 없습니다. 연구는 중단되었습니다.", choices: [], final: true },
    "game_over_vision": { text: "연구소의 비전이 사라져 모든 연구원들이 목표를 잃었습니다. 비밀 연구소는 폐쇄되었습니다.", choices: [], final: true },
    "game_over_efficiency": { text: "연구소의 효율성이 바닥을 쳤습니다. 모든 작업이 지연되고 자원이 낭비됩니다.", choices: [], final: true },
    "game_over_precision": { text: "연구소의 정밀도가 떨어져 모든 결과가 신뢰할 수 없게 되었습니다. 연구는 실패했습니다.", choices: [], final: true },
    "game_over_resources": { text: "연구소의 자원이 모두 고갈되어 더 이상 운영할 수 없습니다.", choices: [], final: true },
    "action_resource_collection": {
        text: "어떤 자원을 수집하시겠습니까?",
        choices: [
            { text: "데이터 수집", action: "gather_data" },
            { text: "알고리즘 설계", action: "gather_algorithms" },
            { text: "컴퓨팅 파워 확보", "action": "gather_computing_power" },
            { text: "취소", "action": "return_to_intro" }
        ]
    },
    "action_module_management": {
        text: "어떤 연구 모듈을 관리하시겠습니까?",
        choices: [] // Choices will be dynamically added in renderChoices
    },
    "resource_collection_result": {
        text: "", // Text will be set dynamically by updateGameDisplay
        choices: [{ text: "확인", action: "show_resource_collection_options" }] // Return to gathering menu
    },
    "module_management_result": {
        text: "", // Text will be set dynamically by updateGameDisplay
        choices: [{ text: "확인", action: "show_module_management_options" }] // Return to facility management menu
    },
    "researcher_dispute_resolution_result": {
        text: "", // This will be set dynamically
        choices: [{ text: "확인", action: "return_to_intro" }]
    },
    "logical_error_resolution_result": {
        text: "", // This will be set dynamically
        choices: [{ text: "확인", action: "return_to_intro" }]
    },
    "deep_research_menu": {
        text: "어떤 심층 연구를 하시겠습니까?",
        choices: [
            { text: "알고리즘 디버깅 (집중력 1 소모)", action: "debug_algorithm" },
            { text: "미래 예측 (집중력 1 소모)", action: "predict_future" },
            { text: "취소", action: "return_to_intro" }
        ]
    },
};

const simulationOutcomes = [
    {
        condition: (gs) => gs.efficiency < 40,
        weight: 40,
        effect: (gs) => {
            const efficiencyLoss = getRandomValue(10, 4);
            const precisionLoss = getRandomValue(5, 2);
            const strategyLoss = getRandomValue(5, 2);
            return {
                changes: { efficiency: gs.efficiency - efficiencyLoss, precision: gs.precision - precisionLoss, strategy: gs.strategy - strategyLoss },
                message: `시뮬레이션이 시작되자마자 연구원들의 불만이 터져 나왔습니다. 낮은 효율성으로 인해 분위기가 험악합니다. (-${efficiencyLoss} 효율성, -${precisionLoss} 정밀도, -${strategyLoss} 전략)`
            };
        }
    },
    {
        condition: (gs) => gs.precision > 70 && gs.knowledge > 60,
        weight: 30,
        effect: (gs) => {
            const efficiencyGain = getRandomValue(15, 5);
            const precisionGain = getRandomValue(10, 3);
            const strategyGain = getRandomValue(10, 3);
            return {
                changes: { efficiency: gs.efficiency + efficiencyGain, precision: gs.precision + precisionGain, strategy: gs.strategy + strategyGain },
                message: `높은 정밀도와 지식을 바탕으로 성공적인 시뮬레이션이 완료되었습니다! (+${efficiencyGain} 효율성, +${precisionGain} 정밀도, +${strategyGain} 전략)`
            };
        }
    },
    {
        condition: (gs) => gs.resources.data < gs.researchers.length * 4,
        weight: 25,
        effect: (gs) => {
            const knowledgeGain = getRandomValue(10, 3);
            const strategyGain = getRandomValue(5, 2);
            return {
                changes: { knowledge: gs.knowledge + knowledgeGain, strategy: gs.strategy + strategyGain },
                message: `데이터가 부족한 상황에 대해 논의했습니다. 모두가 효율적인 데이터 수집에 동의하며 당신의 리더십을 신뢰했습니다. (+${knowledgeGain} 지식, +${strategyGain} 전략)`
            };
        }
    },
    {
        condition: (gs) => gs.researchers.some(r => r.trust < 50),
        weight: 20,
        effect: (gs) => {
            const researcher = gs.researchers.find(r => r.trust < 50);
            const trustGain = getRandomValue(10, 4);
            const efficiencyGain = getRandomValue(5, 2);
            const strategyGain = getRandomValue(5, 2);
            const updatedResearchers = gs.researchers.map(r => r.id === researcher.id ? { ...r, trust: Math.min(100, r.trust + trustGain) } : r);
            return {
                changes: { researchers: updatedResearchers, efficiency: gs.efficiency + efficiencyGain, strategy: gs.strategy + strategyGain },
                message: `${researcher.name}${getWaGwaParticle(researcher.name)} 시뮬레이션 중, ${researcher.name}이(가) 조심스럽게 불만을 토로했습니다. 그의 의견을 존중하고 해결을 약속하자 신뢰를 얻었습니다. (+${trustGain} ${researcher.name} 신뢰도, +${efficiencyGain} 효율성, +${strategyGain} 전략)`
            };
        }
    },
    {
        condition: () => true, // Default positive outcome
        weight: 20,
        effect: (gs) => {
            const efficiencyGain = getRandomValue(5, 2);
            const precisionGain = getRandomValue(3, 1);
            return {
                changes: { efficiency: gs.efficiency + efficiencyGain, precision: gs.precision + precisionGain },
                message: `평범한 시뮬레이션이었지만, 모두가 한자리에 모여 데이터를 분석한 것만으로도 의미가 있었습니다. (+${efficiencyGain} 효율성, +${precisionGain} 정밀도)`
            };
        }
    },
    {
        condition: (gs) => gs.strategy < 40 || gs.knowledge < 40,
        weight: 25, // Increased weight when conditions met
        effect: (gs) => {
            const efficiencyLoss = getRandomValue(5, 2);
            const precisionLoss = getRandomValue(5, 2);
            const strategyLoss = getRandomValue(5, 2);
            return {
                changes: { efficiency: gs.efficiency - efficiencyLoss, precision: gs.precision - precisionLoss, strategy: gs.strategy - strategyLoss },
                message: `시뮬레이션은 길어졌지만, 의견 차이만 확인하고 끝났습니다. 연구원들의 효율성과 정밀도, 당신의 전략이 약간 감소했습니다. (-${efficiencyLoss} 효율성, -${precisionLoss} 정밀도, -${strategyLoss} 전략)`
            };
        }
    }
];

const analysisOutcomes = [
    {
        condition: (gs) => gs.resources.data < 20,
        weight: 30,
        effect: (gs) => {
            const dataGain = getRandomValue(10, 5);
            return {
                changes: { resources: { ...gs.resources, data: gs.resources.data + dataGain } },
                message: `데이터 분석 중 새로운 데이터 세트를 발견했습니다! (+${dataGain} 데이터)`
            };
        }
    },
    {
        condition: (gs) => gs.resources.algorithms < 20,
        weight: 25,
        effect: (gs) => {
            const algorithmGain = getRandomValue(10, 5);
            return {
                changes: { resources: { ...gs.resources, algorithms: gs.resources.algorithms + algorithmGain } },
                message: `데이터 분석 중 효율적인 알고리즘을 발견했습니다! (+${algorithmGain} 알고리즘)`
            };
        }
    },
    {
        condition: () => true, // General positive discovery
        weight: 20,
        effect: (gs) => {
            const knowledgeGain = getRandomValue(5, 2);
            const strategyGain = getRandomValue(5, 2);
            return {
                changes: { knowledge: gs.knowledge + knowledgeGain, strategy: gs.strategy + strategyGain },
                message: `데이터를 분석하며 새로운 전략을 얻었습니다. (+${knowledgeGain} 지식, +${strategyGain} 전략)`
            };
        }
    },
    {
        condition: () => true, // Always possible
        weight: 25, // Increased weight for more frequent occurrence
        effect: (gs) => {
            const actionLoss = getRandomValue(2, 1);
            const efficiencyLoss = getRandomValue(5, 2);
            const precisionLoss = getRandomValue(5, 2);
            return {
                changes: { actionPoints: gs.actionPoints - actionLoss, efficiency: gs.efficiency - efficiencyLoss, precision: gs.precision - precisionLoss },
                message: `데이터 분석에 너무 깊이 빠져 집중력을 소모하고 효율성과 정밀도가 감소했습니다. (-${actionLoss} 집중력, -${efficiencyLoss} 효율성, -${precisionLoss} 정밀도)`
            };
        }
    },
    {
        condition: () => true, // Always possible
        weight: 15, // Increased weight for more frequent occurrence
        effect: (gs) => {
            const visionLoss = getRandomValue(5, 2);
            const knowledgeLoss = getRandomValue(5, 2);
            return {
                changes: { vision: gs.vision - visionLoss, knowledge: gs.knowledge - knowledgeLoss },
                message: `데이터 분석 중 예상치 못한 오류에 부딪혀 비전과 지식이 약간 감소했습니다. (-${visionLoss} 비전, -${knowledgeLoss} 지식)`
            };
        }
    }
];

const discussionOutcomes = [
    {
        condition: (gs, researcher) => researcher.trust < 60,
        weight: 40,
        effect: (gs, researcher) => {
            const trustGain = getRandomValue(10, 5);
            const knowledgeGain = getRandomValue(5, 2);
            const strategyGain = getRandomValue(5, 2);
            const updatedResearchers = gs.researchers.map(r => r.id === researcher.id ? { ...r, trust: Math.min(100, r.trust + trustGain) } : r);
            return {
                changes: { researchers: updatedResearchers, knowledge: gs.knowledge + knowledgeGain, strategy: gs.strategy + strategyGain },
                message: `${researcher.name}${getWaGwaParticle(researcher.name)} 깊은 토론을 나누며 신뢰와 당신의 전략을 얻었습니다. (+${trustGain} ${researcher.name} 신뢰도, +${knowledgeGain} 지식, +${strategyGain} 전략)`
            };
        }
    },
    {
        condition: (gs, researcher) => researcher.personality === "독창적인",
        weight: 20,
        effect: (gs, researcher) => {
            const visionGain = getRandomValue(10, 3);
            const strategyGain = getRandomValue(5, 2);
            return {
                changes: { vision: gs.vision + visionGain, strategy: gs.strategy + strategyGain },
                message: `${researcher.name}${getWaGwaParticle(researcher.name)}와 독창적인 토론을 나누며 비전과 전략이 상승했습니다. (+${visionGain} 비전, +${strategyGain} 전략)`
            };
        }
    },
    {
        condition: (gs, researcher) => researcher.skill === "데이터 마이닝",
        weight: 15,
        effect: (gs, researcher) => {
            const dataGain = getRandomValue(5, 2);
            return {
                changes: { resources: { ...gs.resources, data: gs.resources.data + dataGain } },
                message: `${researcher.name}${getWaGwaParticle(researcher.name)}에게서 데이터 마이닝에 대한 유용한 정보를 얻어 데이터를 추가로 확보했습니다. (+${dataGain} 데이터)`
            };
        }
    },
    {
        condition: (gs, researcher) => true, // Default positive outcome
        weight: 25,
        effect: (gs, researcher) => {
            const efficiencyGain = getRandomValue(5, 2);
            const precisionGain = getRandomValue(3, 1);
            return {
                changes: { efficiency: gs.efficiency + efficiencyGain, precision: gs.precision + precisionGain },
                message: `${researcher.name}${getWaGwaParticle(researcher.name)} 소소한 토론을 나누며 효율성과 정밀도가 조금 더 단단해졌습니다. (+${efficiencyGain} 효율성, +${precisionGain} 정밀도)`
            };
        }
    },
    {
        condition: (gs, researcher) => gs.efficiency < 40 || researcher.trust < 40,
        weight: 20, // Increased weight when conditions met
        effect: (gs, researcher) => {
            const trustLoss = getRandomValue(10, 3);
            const efficiencyLoss = getRandomValue(5, 2);
            const strategyLoss = getRandomValue(5, 2);
            const updatedResearchers = gs.researchers.map(r => r.id === researcher.id ? { ...r, trust: Math.max(0, r.trust - trustLoss) } : r);
            return {
                changes: { researchers: updatedResearchers, efficiency: gs.efficiency - efficiencyLoss, strategy: gs.strategy - strategyLoss },
                message: `${researcher.name}${getWaGwaParticle(researcher.name)} 토론 중 오해를 사서 신뢰도와 효율성, 당신의 전략이 감소했습니다. (-${trustLoss} ${researcher.name} 신뢰도, -${efficiencyLoss} 효율성, -${strategyLoss} 전략)`
            };
        }
    },
    {
        condition: (gs) => gs.efficiency < 30,
        weight: 15, // Increased weight when conditions met
        effect: (gs, researcher) => {
            const actionLoss = getRandomValue(1, 0);
            const knowledgeLoss = getRandomValue(5, 2);
            return {
                changes: { actionPoints: gs.actionPoints - actionLoss, knowledge: gs.knowledge - knowledgeLoss },
                message: `${researcher.name}${getWaGwaParticle(researcher.name)} 토론이 길어졌지만, 특별한 소득은 없었습니다. 당신의 지식이 감소했습니다. (-${actionLoss} 집중력, -${knowledgeLoss} 지식)`
            };
        }
    }
];

function calculateMinigameReward(minigameName, score) {
    let rewards = { strategy: 0, knowledge: 0, vision: 0, efficiency: 0, precision: 0, message: "" };

    switch (minigameName) {
        case "데이터 패턴 순서 맞추기":
            if (score >= 51) {
                rewards.strategy = 15;
                rewards.knowledge = 10;
                rewards.vision = 5;
                rewards.efficiency = 5;
                rewards.message = `최고의 데이터 분석가 되셨습니다! (+15 전략, +10 지식, +5 비전, +5 효율성)`;
            } else if (score >= 21) {
                rewards.strategy = 10;
                rewards.knowledge = 5;
                rewards.efficiency = 3;
                rewards.message = `훌륭한 데이터 분석입니다! (+10 전략, +5 지식, +3 효율성)`;
            } else if (score >= 0) {
                rewards.strategy = 5;
                rewards.message = `데이터 패턴 순서 맞추기를 완료했습니다. (+5 전략)`;
            } else {
                rewards.message = `데이터 패턴 순서 맞추기를 완료했지만, 아쉽게도 보상은 없습니다.`;
            }
            break;
        case "시스템 최적화": // Placeholder for now, but re-themed
            rewards.efficiency = 2;
            rewards.precision = 1;
            rewards.message = `시스템 최적화를 완료했습니다. (+2 효율성, +1 정밀도)`;
            break;
        case "미래 예측 시뮬레이션": // Placeholder for now, but re-themed
            rewards.vision = 2;
            rewards.strategy = 1;
            rewards.message = `미래 예측 시뮬레이션을 완료했습니다. (+2 비전, +1 전략)`;
            break;
        case "복잡계 퍼즐": // Placeholder for now, but re-themed
            rewards.knowledge = 2;
            rewards.precision = 1;
            rewards.message = `복잡계 퍼즐을 완료했습니다. (+2 지식, +1 정밀도)`;
            break;
        case "논리 오류 찾기": // Placeholder for now, but re-themed
            rewards.precision = 2;
            rewards.efficiency = 1;
            rewards.message = `논리 오류 찾기를 완료했습니다. (+2 정밀도, +1 효율성)`;
            break;
        default:
            rewards.message = `미니게임 ${minigameName}${getEulReParticle(minigameName)} 완료했습니다.`;
            break;
    }
    return rewards;
}

const minigames = [
    {
        name: "데이터 패턴 순서 맞추기",
        description: "화면에 나타나는 데이터 패턴의 순서를 기억하고 정확하게 입력하세요. 단계가 올라갈수록 어려워집니다!",
        start: (gameArea, choicesDiv) => {
            gameState.minigameState = {
                currentSequence: [],
                playerInput: [],
                stage: 1,
                score: 0,
                showingSequence: false
            };
            minigames[0].render(gameArea, choicesDiv);
            minigames[0].showSequence();
        },
        render: (gameArea, choicesDiv) => {
            gameArea.innerHTML = `
                <p><b>단계:</b> ${gameState.minigameState.stage} | <b>점수:</b> ${gameState.minigameState.score}</p>
                <p id="sequenceDisplay" style="font-size: 2em; font-weight: bold; min-height: 1.5em;"></p>
                <p>순서를 기억하고 입력하세요:</p>
                <div id="playerInputDisplay" style="font-size: 1.5em; min-height: 1.5em;">${gameState.minigameState.playerInput.join(' ')}</div>
            `;
            choicesDiv.innerHTML = `
                <div class="pattern-pad">
                    ${["0", "1", "A", "B", "C", "D", "E", "F", "G", "H"].map(pattern => `<button class="choice-btn pattern-btn" data-value="${pattern}">${pattern}</button>`).join('')}
                    <button class="choice-btn submit-btn" data-action="submitSequence">입력 완료</button>
                    <button class="choice-btn reset-btn" data-action="resetInput">초기화</button>
                </div>
            `;
            choicesDiv.querySelectorAll('.pattern-btn').forEach(button => {
                button.addEventListener('click', () => minigames[0].processAction('addInput', button.dataset.value));
            });
            choicesDiv.querySelector('.submit-btn').addEventListener('click', () => minigames[0].processAction('submitSequence'));
            choicesDiv.querySelector('.reset-btn').addEventListener('click', () => minigames[0].processAction('resetInput'));
        },
        showSequence: () => {
            gameState.minigameState.showingSequence = true;
            gameState.minigameState.currentSequence = [];
            const patterns = ["0", "1", "A", "B", "C", "D", "E", "F", "G", "H"];
            const sequenceLength = gameState.minigameState.stage + 2; // e.g., stage 1 -> 3 patterns
            for (let i = 0; i < sequenceLength; i++) {
                gameState.minigameState.currentSequence.push(patterns[Math.floor(currentRandFn() * patterns.length)]);
            }

            const sequenceDisplay = document.getElementById('sequenceDisplay');
            let i = 0;
            const interval = setInterval(() => {
                if (i < gameState.minigameState.currentSequence.length) {
                    sequenceDisplay.innerText = gameState.minigameState.currentSequence[i];
                    i++;
                } else {
                    clearInterval(interval);
                    sequenceDisplay.innerText = "입력하세요!";
                    gameState.minigameState.showingSequence = false;
                }
            }, 800);
        },
        processAction: (actionType, value = null) => {
            if (gameState.minigameState.showingSequence) return;

            if (actionType === 'addInput') {
                gameState.minigameState.playerInput.push(value);
                document.getElementById('playerInputDisplay').innerText = gameState.minigameState.playerInput.join(' ');
            } else if (actionType === 'resetInput') {
                gameState.minigameState.playerInput = [];
                document.getElementById('playerInputDisplay').innerText = '';
            } else if (actionType === 'submitSequence') {
                const correct = gameState.minigameState.currentSequence.every((pattern, i) => pattern === gameState.minigameState.playerInput[i]);

                if (correct && gameState.minigameState.playerInput.length === gameState.minigameState.currentSequence.length) {
                    gameState.minigameState.score += gameState.minigameState.currentSequence.length * 10;
                    gameState.minigameState.stage++;
                    gameState.minigameState.playerInput = [];
                    updateGameDisplay("정답입니다! 다음 단계로 넘어갑니다.");
                    minigames[0].render(document.getElementById('gameArea'), document.getElementById('gameChoices'));
                    setTimeout(() => minigames[0].showSequence(), 1500);
                } else {
                    updateGameDisplay("틀렸습니다! 게임 종료.");
                    minigames[0].end();
                }
            }
        },
        end: () => {
            const rewards = calculateMinigameReward(minigames[0].name, gameState.minigameState.score);
            updateState({
                strategy: gameState.strategy + rewards.strategy,
                knowledge: gameState.knowledge + rewards.knowledge,
                vision: gameState.vision + rewards.vision,
                efficiency: gameState.efficiency + rewards.efficiency,
                precision: gameState.precision + rewards.precision,
                currentScenarioId: 'intro'
            }, rewards.message);
            gameState.minigameState = {};
        }
    },
    {
        name: "시스템 최적화",
        description: "주어진 시스템의 비효율적인 부분을 찾아 최적화하는 게임입니다.",
        start: (gameArea, choicesDiv) => {
            gameState.minigameState = { score: 10 };
            gameArea.innerHTML = `<p>${minigames[1].description}</p><p>게임을 시작합니다!</p>`;
            choicesDiv.innerHTML = `<button class="choice-btn" onclick="minigames[1].processAction('endGame')">게임 종료</button>`;
        },
        render: () => {},
        processAction: (actionType) => {
            if (actionType === 'endGame') {
                minigames[1].end();
            }
        },
        end: () => {
            const rewards = calculateMinigameReward(minigames[1].name, gameState.minigameState.score);
            updateState({
                efficiency: gameState.efficiency + rewards.efficiency,
                precision: gameState.precision + rewards.precision,
                currentScenarioId: 'intro'
            }, rewards.message);
            gameState.minigameState = {};
        }
    },
    {
        name: "미래 예측 시뮬레이션",
        description: "현재 데이터를 기반으로 미래를 예측하고 최적의 전략을 선택하는 게임입니다.",
        start: (gameArea, choicesDiv) => {
            gameState.minigameState = { score: 15 };
            gameArea.innerHTML = `<p>${minigames[2].description}</p><p>게임을 시작합니다!</p>`;
            choicesDiv.innerHTML = `<button class="choice-btn" onclick="minigames[2].processAction('endGame')">게임 종료</button>`;
        },
        render: () => {},
        processAction: (actionType) => {
            if (actionType === 'endGame') {
                minigames[2].end();
            }
        },
        end: () => {
            const rewards = calculateMinigameReward(minigames[2].name, gameState.minigameState.score);
            updateState({
                vision: gameState.vision + rewards.vision,
                strategy: gameState.strategy + rewards.strategy,
                currentScenarioId: 'intro'
            }, rewards.message);
            gameState.minigameState = {};
        }
    },
    {
        name: "복잡계 퍼즐",
        description: "여러 변수가 얽힌 복잡한 퍼즐을 논리적으로 해결하는 게임입니다.",
        start: (gameArea, choicesDiv) => {
            gameState.minigameState = { score: 20 };
            gameArea.innerHTML = `<p>${minigames[3].description}</p><p>게임을 시작합니다!</p>`;
            choicesDiv.innerHTML = `<button class="choice-btn" onclick="minigames[3].processAction('endGame')">게임 종료</button>`;
        },
        render: () => {},
        processAction: (actionType) => {
            if (actionType === 'endGame') {
                minigames[3].end();
            }
        },
        end: () => {
            const rewards = calculateMinigameReward(minigames[3].name, gameState.minigameState.score);
            updateState({
                knowledge: gameState.knowledge + rewards.knowledge,
                precision: gameState.precision + rewards.precision,
                currentScenarioId: 'intro'
            }, rewards.message);
            gameState.minigameState = {};
        }
    },
    {
        name: "논리 오류 찾기",
        description: "주어진 가설에서 논리적 오류를 찾아내는 게임입니다.",
        start: (gameArea, choicesDiv) => {
            gameState.minigameState = { score: 25 };
            gameArea.innerHTML = `<p>${minigames[4].description}</p><p>게임을 시작합니다!</p>`;
            choicesDiv.innerHTML = `<button class="choice-btn" onclick="minigames[4].processAction('endGame')">게임 종료</button>`;
        },
        render: () => {},
        processAction: (actionType) => {
            if (actionType === 'endGame') {
                minigames[4].end();
            }
        },
        end: () => {
            const rewards = calculateMinigameReward(minigames[4].name, gameState.minigameState.score);
            updateState({
                precision: gameState.precision + rewards.precision,
                efficiency: gameState.efficiency + rewards.efficiency,
                currentScenarioId: 'intro'
            }, rewards.message);
            gameState.minigameState = {};
        }
    }
];

// --- Game Actions ---
function spendActionPoint() {
    if (gameState.actionPoints <= 0) {
        updateGameDisplay("집중력이 부족합니다.");
        return false;
    }
    updateState({ actionPoints: gameState.actionPoints - 1 });
    return true;
}

const gameActions = {
    analyze_data: () => {
        if (!spendActionPoint()) return;

        const possibleOutcomes = analysisOutcomes.filter(outcome => outcome.condition(gameState));
        const totalWeight = possibleOutcomes.reduce((sum, outcome) => sum + outcome.weight, 0);
        const rand = currentRandFn() * totalWeight;

        let cumulativeWeight = 0;
        let chosenOutcome = possibleOutcomes.find(outcome => {
            cumulativeWeight += outcome.weight;
            return rand < cumulativeWeight;
        });

        if (!chosenOutcome) { // Fallback to default if something goes wrong
            chosenOutcome = analysisOutcomes.find(o => o.condition());
        }

        const result = chosenOutcome.effect(gameState);
        updateState({ ...result.changes, dailyActions: { ...gameState.dailyActions, analyzed: true } }, result.message);
    },
    discuss_with_researcher: () => {
        if (!spendActionPoint()) return;
        const researcher = gameState.researchers[Math.floor(currentRandFn() * gameState.researchers.length)];
        if (gameState.dailyActions.discussed) { updateState({ dailyActions: { ...gameState.dailyActions, discussed: true } }, `${researcher.name}${getWaGwaParticle(researcher.name)} 이미 충분히 토론했습니다.`); return; }

        const possibleOutcomes = discussionOutcomes.filter(outcome => outcome.condition(gameState, researcher));
        const totalWeight = possibleOutcomes.reduce((sum, outcome) => sum + outcome.weight, 0);
        const rand = currentRandFn() * totalWeight;

        let cumulativeWeight = 0;
        let chosenOutcome = possibleOutcomes.find(outcome => {
            cumulativeWeight += outcome.weight;
            return rand < cumulativeWeight;
        });

        if (!chosenOutcome) { // Fallback to default if something goes wrong
            chosenOutcome = discussionOutcomes.find(o => o.condition());
        }

        const result = chosenOutcome.effect(gameState, researcher);
        updateState({ ...result.changes, dailyActions: { ...gameState.dailyActions, discussed: true } }, result.message);
    },
    run_simulation: () => {
        if (!spendActionPoint()) return;

        const possibleOutcomes = simulationOutcomes.filter(outcome => outcome.condition(gameState));
        const totalWeight = possibleOutcomes.reduce((sum, outcome) => sum + outcome.weight, 0);
        const rand = currentRandFn() * totalWeight;

        let cumulativeWeight = 0;
        let chosenOutcome = possibleOutcomes.find(outcome => {
            cumulativeWeight += outcome.weight;
            return rand < cumulativeWeight;
        });

        if (!chosenOutcome) { // Fallback to default if something goes wrong
            chosenOutcome = simulationOutcomes.find(o => o.condition());
        }

        const result = chosenOutcome.effect(gameState);
        updateState(result.changes, result.message);
    },
    manualNextDay: () => {
        if (gameState.manualDayAdvances >= 5) { updateGameDisplay("오늘은 더 이상 수동으로 날짜를 넘길 수 없습니다. 내일 다시 시도해주세요."); return; }
        updateState({
            manualDayAdvances: gameState.manualDayAdvances + 1,
            day: gameState.day + 1,
            lastPlayedDate: new Date().toISOString().slice(0, 10),
            dailyEventTriggered: false
        });
        processDailyEvents();
    },
    handle_researcher_dispute: (params) => {
        if (!spendActionPoint()) return;
        const { first, second } = params;
        let message = "";
        let reward = { efficiency: 0, precision: 0, strategy: 0 };

        const trustGain = getRandomValue(10, 3);
        const trustLoss = getRandomValue(5, 2);
        const efficiencyGain = getRandomValue(5, 2);
        const strategyGain = getRandomValue(5, 2);

        const updatedResearchers = gameState.researchers.map(r => {
            if (r.id === first) {
                r.trust = Math.min(100, r.trust + trustGain);
                message += `${r.name}의 관점을 먼저 들어주었습니다. ${r.name}의 신뢰도가 상승했습니다. `;
                reward.efficiency += efficiencyGain;
                reward.strategy += strategyGain;
            } else if (r.id === second) {
                r.trust = Math.max(0, r.trust - trustLoss);
                message += `${second}의 신뢰도가 약간 하락했습니다. `;
            }
            return r;
        });

        updateState({ ...reward, researchers: updatedResearchers, currentScenarioId: 'researcher_dispute_resolution_result' }, message);
    },
    mediate_researcher_dispute: () => {
        if (!spendActionPoint()) return;
        const efficiencyGain = getRandomValue(10, 3);
        const precisionGain = getRandomValue(5, 2);
        const strategyGain = getRandomValue(5, 2);
        const message = `당신의 효율적인 중재로 에이다와 앨런의 의견 차이가 해결되었습니다. 연구소의 효율성과 당신의 전략이 강화되었습니다! (+${efficiencyGain} 효율성, +${precisionGain} 정밀도, +${strategyGain} 전략)`;
        updateState({ efficiency: gameState.efficiency + efficiencyGain, precision: gameState.precision + precisionGain, strategy: gameState.strategy + strategyGain, currentScenarioId: 'researcher_dispute_resolution_result' }, message);
    },
    ignore_event: () => {
        if (!spendActionPoint()) return;
        const efficiencyLoss = getRandomValue(10, 3);
        const precisionLoss = getRandomValue(5, 2);
        const message = `의견 차이를 무시했습니다. 연구원들의 불만이 커지고 연구소의 분위기가 침체됩니다. (-${efficiencyLoss} 효율성, -${precisionLoss} 정밀도)`;
        const updatedResearchers = gameState.researchers.map(r => {
            r.trust = Math.max(0, r.trust - 5);
            return r;
        });
        updateState({ efficiency: gameState.efficiency - efficiencyLoss, precision: gameState.precision - precisionLoss, researchers: updatedResearchers, currentScenarioId: 'researcher_dispute_resolution_result' }, message);
    },
    fix_logical_error: () => {
        if (!spendActionPoint()) return;
        const cost = 1; // Action point cost
        let message = "";
        let changes = {};
        if (gameState.actionPoints >= cost) {
            const precisionGain = getRandomValue(10, 3);
            const efficiencyGain = getRandomValue(5, 2);
            message = `논리적 오류를 분석하고 수정했습니다. 연구소의 정밀도와 효율성이 상승합니다. (+${precisionGain} 정밀도, +${efficiencyGain} 효율성)`;
            changes.precision = gameState.precision + precisionGain;
            changes.efficiency = gameState.efficiency + efficiencyGain;
            changes.actionPoints = gameState.actionPoints - cost;
        } else {
            message = "오류를 수정할 집중력이 부족합니다.";
        }
        updateState({ ...changes, currentScenarioId: 'logical_error_resolution_result' }, message);
    },
    ignore_logical_error: () => {
        if (!spendActionPoint()) return;
        const precisionLoss = getRandomValue(10, 3);
        const strategyLoss = getRandomValue(5, 2);
        updateState({ precision: gameState.precision - precisionLoss, strategy: gameState.strategy - strategyLoss, currentScenarioId: 'logical_error_resolution_result' }, `논리적 오류를 무시했습니다. (-${precisionLoss} 정밀도, -${strategyLoss} 전략)`);
    },
    gather_data: () => {
        if (!spendActionPoint()) return;
        const successChance = Math.min(0.95, 0.6 + (gameState.labLevel * 0.1) + (gameState.dailyBonus.researchSuccess || 0));
        let message = "";
        let changes = {};
        if (currentRandFn() < successChance) {
            const dataGain = getRandomValue(5, 2);
            message = `데이터를 성공적으로 수집했습니다! (+${dataGain} 데이터)`;
            changes.resources = { ...gameState.resources, data: gameState.resources.data + dataGain };
        } else {
            message = "데이터 수집에 실패했습니다.";
        }
        updateState(changes, message);
    },
    gather_algorithms: () => {
        if (!spendActionPoint()) return;
        const successChance = Math.min(0.95, 0.6 + (gameState.labLevel * 0.1) + (gameState.dailyBonus.researchSuccess || 0));
        let message = "";
        let changes = {};
        if (currentRandFn() < successChance) {
            const algorithmGain = getRandomValue(5, 2);
            message = `알고리즘을 성공적으로 설계했습니다! (+${algorithmGain} 알고리즘)`;
            changes.resources = { ...gameState.resources, algorithms: gameState.resources.algorithms + algorithmGain };
        } else {
            message = "알고리즘 설계에 실패했습니다.";
        }
        updateState(changes, message);
    },
    gather_computing_power: () => {
        if (!spendActionPoint()) return;
        const successChance = Math.min(0.95, 0.6 + (gameState.labLevel * 0.1) + (gameState.dailyBonus.researchSuccess || 0));
        let message = "";
        let changes = {};
        if (currentRandFn() < successChance) {
            const computingPowerGain = getRandomValue(5, 2);
            message = `컴퓨팅 파워를 성공적으로 확보했습니다! (+${computingPowerGain} 컴퓨팅 파워)`;
            changes.resources = { ...gameState.resources, computing_power: gameState.resources.computing_power + computingPowerGain };
        } else {
            message = "컴퓨팅 파워 확보에 실패했습니다.";
        }
        updateState(changes, message);
    },
    build_dataServer: () => {
        if (!spendActionPoint()) return;
        const cost = { data: 50, algorithms: 20 };
        let message = "";
        let changes = {};
        if (gameState.resources.data >= cost.data && gameState.resources.algorithms >= cost.algorithms) {
            gameState.researchModules.dataServer.built = true;
            const knowledgeGain = getRandomValue(10, 3);
            message = `데이터 서버를 구축했습니다! (+${knowledgeGain} 지식)`;
            changes.knowledge = gameState.knowledge + knowledgeGain;
            changes.resources = { ...gameState.resources, data: gameState.resources.data - cost.data, algorithms: gameState.resources.algorithms - cost.algorithms };
        } else {
            message = "자원이 부족하여 구축할 수 없습니다.";
        }
        updateState(changes, message);
    },
    build_simulationLab: () => {
        if (!spendActionPoint()) return;
        const cost = { algorithms: 30, computing_power: 30 };
        let message = "";
        let changes = {};
        if (gameState.resources.algorithms >= cost.algorithms && gameState.resources.computing_power >= cost.computing_power) {
            gameState.researchModules.simulationLab.built = true;
            const strategyGain = getRandomValue(10, 3);
            message = `시뮬레이션 랩을 구축했습니다! (+${strategyGain} 전략)`;
            changes.strategy = gameState.strategy + strategyGain;
            changes.resources = { ...gameState.resources, algorithms: gameState.resources.algorithms - cost.algorithms, computing_power: gameState.resources.computing_power - cost.computing_power };
        } else {
            message = "자원이 부족하여 구축할 수 없습니다.";
        }
        updateState(changes, message);
    },
    build_controlTower: () => {
        if (!spendActionPoint()) return;
        const cost = { data: 100, algorithms: 50, computing_power: 50 };
        let message = "";
        let changes = {};
        if (gameState.resources.data >= cost.data && gameState.resources.algorithms >= cost.algorithms && gameState.resources.computing_power >= cost.computing_power) {
            gameState.researchModules.controlTower.built = true;
            const efficiencyGain = getRandomValue(20, 5);
            const strategyGain = getRandomValue(20, 5);
            message = `관제탑을 구축했습니다! (+${efficiencyGain} 효율성, +${strategyGain} 전략)`;
            changes.efficiency = gameState.efficiency + efficiencyGain;
            changes.strategy = gameState.strategy + strategyGain;
            changes.resources = { ...gameState.resources, data: gameState.resources.data - cost.data, algorithms: gameState.resources.algorithms - cost.algorithms, computing_power: gameState.resources.computing_power - cost.computing_power };
        } else {
            message = "자원이 부족하여 구축할 수 없습니다.";
        }
        updateState(changes, message);
    },
    build_aiCore: () => {
        if (!spendActionPoint()) return;
        const cost = { algorithms: 80, computing_power: 40 };
        let message = "";
        let changes = {};
        if (gameState.resources.algorithms >= cost.algorithms && gameState.resources.computing_power >= cost.computing_power) {
            gameState.researchModules.aiCore.built = true;
            const precisionGain = getRandomValue(15, 5);
            const efficiencyGain = getRandomValue(10, 3);
            message = `AI 코어를 구축했습니다! (+${precisionGain} 정밀도, +${efficiencyGain} 효율성)`;
            changes.precision = gameState.precision + precisionGain;
            changes.efficiency = gameState.efficiency + efficiencyGain;
            changes.resources = { ...gameState.resources, algorithms: gameState.resources.algorithms - cost.algorithms, computing_power: gameState.resources.computing_power - cost.computing_power };
        } else {
            message = "자원이 부족하여 구축할 수 없습니다.";
        }
        updateState(changes, message);
    },
    build_quantumComputer: () => {
        if (!spendActionPoint()) return;
        const cost = { algorithms: 50, computing_power: 100 };
        let message = "";
        let changes = {};
        if (gameState.resources.algorithms >= cost.algorithms && gameState.resources.computing_power >= cost.computing_power) {
            gameState.researchModules.quantumComputer.built = true;
            message = "양자 컴퓨터를 구축했습니다!";
            changes.resources = { ...gameState.resources, algorithms: gameState.resources.algorithms - cost.algorithms, computing_power: gameState.resources.computing_power - cost.computing_power };
        } else {
            message = "자원이 부족하여 구축할 수 없습니다.";
        }
        updateState(changes, message);
    },
    optimize_module: (params) => {
        if (!spendActionPoint()) return;
        const moduleKey = params.module;
        const cost = { algorithms: 10, computing_power: 10 };
        let message = "";
        let changes = {};
        if (gameState.resources.algorithms >= cost.algorithms && gameState.resources.computing_power >= cost.computing_power) {
            gameState.researchModules[moduleKey].durability = 100;
            message = `${gameState.researchModules[moduleKey].name} 모듈의 최적화를 완료했습니다. 내구도가 100으로 회복되었습니다.`;
            changes.resources = { ...gameState.resources, algorithms: gameState.resources.algorithms - cost.algorithms, computing_power: gameState.resources.computing_power - cost.computing_power };
        } else {
            message = "최적화에 필요한 자원이 부족합니다.";
        }
        updateState(changes, message);
    },
    debug_algorithm: () => {
        if (!spendActionPoint()) return;
        let message = "";
        let changes = {};
        const rand = currentRandFn();

        if (rand < 0.1) { // Big Win
            const dataGain = getRandomValue(30, 10);
            const algorithmGain = getRandomValue(20, 5);
            const computingPowerGain = getRandomValue(15, 5);
            message = `알고리즘 디버깅 대성공! 엄청난 자원을 얻었습니다! (+${dataGain} 데이터, +${algorithmGain} 알고리즘, +${computingPowerGain} 컴퓨팅 파워)`;
            changes.resources = { ...gameState.resources, data: gameState.resources.data + dataGain, algorithms: gameState.resources.algorithms + algorithmGain, computing_power: gameState.resources.computing_power + computingPowerGain };
        } else if (rand < 0.4) { // Small Win
            const precisionGain = getRandomValue(10, 5);
            message = `알고리즘 디버깅 성공! 정밀도가 향상됩니다. (+${precisionGain} 정밀도)`;
            changes.precision = gameState.precision + precisionGain;
        } else if (rand < 0.7) { // Small Loss
            const precisionLoss = getRandomValue(5, 2);
            message = `아쉽게도 디버깅 실패! 정밀도가 조금 떨어집니다. (-${precisionLoss} 정밀도)`;
            changes.precision = gameState.precision - precisionLoss;
        } else { // No Change
            message = `알고리즘 디버깅 결과는 아무것도 아니었습니다.`;
        }
        updateState({ ...changes, currentScenarioId: 'deep_research_menu' }, message);
    },
    predict_future: () => {
        if (!spendActionPoint()) return;
        let message = "";
        let changes = {};
        const rand = currentRandFn();

        if (rand < 0.2) { // Big Catch (Technological Innovation)
            const innovationGain = getRandomValue(3, 1);
            message = `미래 예측 대성공! 기술 혁신을 얻었습니다! (+${innovationGain} 기술 혁신)`;
            changes.resources = { ...gameState.resources, technological_innovation: (gameState.resources.technological_innovation || 0) + innovationGain };
        } else if (rand < 0.6) { // Normal Catch (Knowledge)
            const knowledgeGain = getRandomValue(10, 5);
            message = `지식을 얻었습니다! (+${knowledgeGain} 지식)`;
            changes.resources = { ...gameState.resources, knowledge: gameState.resources.knowledge + knowledgeGain };
        } else { // No Change
            message = `아쉽게도 아무것도 얻지 못했습니다.`;
        }
        updateState({ ...changes, currentScenarioId: 'deep_research_menu' }, message);
    },
    return_to_intro: () => updateState({ currentScenarioId: 'intro' }),
    play_minigame: () => {
        if (gameState.dailyActions.minigamePlayed) { updateGameDisplay("오늘의 발견은 이미 플레이했습니다."); return; }
        if (!spendActionPoint()) return;

        const minigameIndex = (gameState.day - 1) % minigames.length;
        const minigame = minigames[minigameIndex];

        gameState.currentScenarioId = `minigame_${minigame.name}`;

        updateState({ dailyActions: { ...gameState.dailyActions, minigamePlayed: true } });

        updateGameDisplay(minigame.description);
        minigame.start(document.getElementById('gameArea'), document.getElementById('gameChoices'));
    },
    show_deep_research_options: () => updateState({ currentScenarioId: 'deep_research_menu' }),
};

function applyStatEffects() {
    let message = "";
    // High Strategy: Resource creation success chance increase
    if (gameState.strategy >= 70) {
        gameState.dailyBonus.researchSuccess += 0.1;
        message += "높은 전략 덕분에 새로운 자원 수집 성공률이 증가합니다. ";
    }
    // Low Strategy: Knowledge decrease
    if (gameState.strategy < 30) {
        gameState.knowledge = Math.max(0, gameState.knowledge - getRandomValue(5, 2));
        message += "전략 부족으로 지식이 감소합니다. ";
    }

    // High Knowledge: Action points increase
    if (gameState.knowledge >= 70) {
        gameState.maxActionPoints += 1;
        gameState.actionPoints = gameState.maxActionPoints;
        message += "넘치는 지식으로 집중력이 증가합니다. ";
    }
    // Low Knowledge: Action points decrease
    if (gameState.knowledge < 30) {
        gameState.maxActionPoints = Math.max(5, gameState.maxActionPoints - 1);
        gameState.actionPoints = Math.min(gameState.actionPoints, gameState.maxActionPoints);
        message += "지식 부족으로 집중력이 감소합니다. ";
    }

    // High Vision: Efficiency and Precision boost
    if (gameState.vision >= 70) {
        const efficiencyGain = getRandomValue(5, 2);
        const precisionGain = getRandomValue(5, 2);
        gameState.efficiency = Math.min(100, gameState.efficiency + efficiencyGain);
        gameState.precision = Math.min(100, gameState.precision + precisionGain);
        message += `당신의 높은 비전 덕분에 연구소의 효율성과 정밀도가 향상됩니다! (+${efficiencyGain} 효율성, +${precisionGain} 정밀도) `;
    }
    // Low Vision: Efficiency and Precision decrease
    if (gameState.vision < 30) {
        const efficiencyLoss = getRandomValue(5, 2);
        const precisionLoss = getRandomValue(5, 2);
        gameState.efficiency = Math.max(0, gameState.efficiency - efficiencyLoss);
        gameState.precision = Math.max(0, gameState.precision - precisionLoss);
        message += "비전이 약화되어 연구소의 효율성과 정밀도가 흐려집니다. (-${efficiencyLoss} 효율성, -${precisionLoss} 정밀도) ";
    }

    // High Efficiency: Strategy boost or rare resource discovery
    if (gameState.efficiency >= 70) {
        const strategyGain = getRandomValue(5, 2);
        gameState.strategy = Math.min(100, gameState.strategy + strategyGain);
        message += "당신의 효율적인 접근이 새로운 전략을 불러일으킵니다. (+${strategyGain} 전략) ";
        if (currentRandFn() < 0.2) { // 20% chance for technological innovation discovery
            const amount = getRandomValue(1, 1);
            gameState.resources.technological_innovation += amount;
            message += `기술 혁신을 발견했습니다! (+${amount} 기술 혁신) `;
        }
    }
    // Low Efficiency: Strategy decrease or action point loss
    if (gameState.efficiency < 30) {
        const strategyLoss = getRandomValue(5, 2);
        gameState.strategy = Math.max(0, gameState.strategy - strategyLoss);
        message += "효율성 부족으로 전략이 감소합니다. (-${strategyLoss} 전략) ";
        if (currentRandFn() < 0.1) { // 10% chance for action point loss
            const actionLoss = getRandomValue(1, 0);
            gameState.actionPoints = Math.max(0, gameState.actionPoints - actionLoss);
            message += "비효율적인 연구로 집중력을 낭비했습니다. (-${actionLoss} 집중력) ";
        }
    }

    // High Precision: Researcher trust increase
    if (gameState.precision >= 70) {
        gameState.researchers.forEach(r => r.trust = Math.min(100, r.trust + getRandomValue(2, 1)));
        message += "높은 정밀도 덕분에 연구원들의 신뢰가 깊어집니다. ";
    }
    // Low Precision: Researcher trust decrease
    if (gameState.precision < 30) {
        gameState.researchers.forEach(r => r.trust = Math.max(0, r.trust - getRandomValue(5, 2)));
        message += "낮은 정밀도로 인해 연구원들의 신뢰가 하락합니다. ";
    }

    return message;
}

function generateRandomResearcher() {
    const names = ["리사", "벤", "클레어", "데이비드", "에밀리"];
    const personalities = ["분석적인", "논리적인", "혁신적인", "체계적인"];
    const skills = ["데이터 마이닝", "알고리즘 설계", "시스템 분석"];
    const randomId = Math.random().toString(36).substring(2, 9);

    return {
        id: randomId,
        name: names[Math.floor(currentRandFn() * names.length)],
        personality: personalities[Math.floor(currentRandFn() * personalities.length)],
        skill: skills[Math.floor(currentRandFn() * skills.length)],
        trust: 50
    };
}

// --- Daily/Initialization Logic ---
const weightedDailyEvents = [
    { id: "daily_event_power_outage", weight: 10, condition: () => true, onTrigger: () => {
        const computingPowerLoss = getRandomValue(10, 5);
        gameScenarios.daily_event_power_outage.text = `갑작스러운 정전으로 컴퓨팅 파워 일부가 손실되었습니다. (-${computingPowerLoss} 컴퓨팅 파워)`;
        updateState({ resources: { ...gameState.resources, computing_power: Math.max(0, gameState.resources.computing_power - computingPowerLoss) } });
    } },
    { id: "daily_event_algorithm_bug", weight: 10, condition: () => true, onTrigger: () => {
        const precisionLoss = getRandomValue(10, 5);
        gameScenarios.daily_event_algorithm_bug.text = `알고리즘에 치명적인 버그가 발생했습니다. 정밀도가 감소합니다. (-${precisionLoss} 정밀도)`;
        updateState({ precision: Math.max(0, gameState.precision - precisionLoss) });
    } },
    { id: "daily_event_logical_error", weight: 15, condition: () => true },
    { id: "daily_event_data_corruption", weight: 7, condition: () => true, onTrigger: () => {
        const dataLoss = getRandomValue(10, 5);
        gameScenarios.daily_event_data_corruption.text = `데이터 손상으로 인해 데이터 일부가 유실되었습니다. (-${dataLoss} 데이터)`;
        updateState({ resources: { ...gameState.resources, data: Math.max(0, gameState.resources.data - dataLoss) } });
    } },
    { id: "daily_event_researcher_dispute", weight: 15, condition: () => gameState.researchers.length >= 2 },
    { id: "daily_event_new_researcher", weight: 10, condition: () => gameState.researchModules.controlTower.built && gameState.researchers.length < gameState.maxResearchers, onTrigger: () => {
        const newResearcher = generateRandomResearcher();
        gameState.pendingNewResearcher = newResearcher;
        gameScenarios["daily_event_new_researcher"].text = `새로운 연구원 ${newResearcher.name}(${newResearcher.personality}, ${newResearcher.skill})이(가) 연구소에 합류하고 싶어 합니다. (현재 연구원 수: ${gameState.researchers.length} / ${gameState.maxResearchers})`;
    }},
    { id: "daily_event_external_funding", weight: 10, condition: () => gameState.researchModules.controlTower.built },
    { id: "daily_event_breakthrough_discovery", weight: 15, condition: () => true, onTrigger: () => {
        const innovationGain = getRandomValue(3, 1);
        const visionGain = getRandomValue(10, 5);
        gameScenarios.daily_event_breakthrough_discovery.text = `획기적인 발견으로 기술 혁신과 비전이 증가합니다! (+${innovationGain} 기술 혁신, +${visionGain} 비전)`;
        updateState({ resources: { ...gameState.resources, technological_innovation: gameState.resources.technological_innovation + innovationGain }, vision: gameState.vision + visionGain });
    } },
    { id: "daily_event_vision_crisis", weight: 12, condition: () => gameState.vision < 50 },
];

function processDailyEvents() {
    if (gameState.dailyEventTriggered) return;
    currentRandFn = mulberry32(getDailySeed() + gameState.day);

    // Reset daily actions and action points
    updateState({
        actionPoints: 10, // Reset to base maxActionPoints
        maxActionPoints: 10, // Reset maxActionPoints to base
        dailyActions: { analyzed: false, discussed: false, simulated: false, minigamePlayed: false },
        dailyEventTriggered: true,
        dailyBonus: { researchSuccess: 0 } // Reset daily bonus
    });

    // Apply stat effects
    const statEffectMessage = applyStatEffects();

    let skillBonusMessage = "";
    let durabilityMessage = "";

    // Daily skill bonus & durability decay
    gameState.researchers.forEach(r => {
        if (r.skill === '데이터 마이닝') { gameState.resources.data++; skillBonusMessage += `${r.name}의 데이터 마이닝 기술 덕분에 데이터를 추가로 얻었습니다. `; }
        else if (r.skill === '알고리즘 설계') { gameState.resources.algorithms++; skillBonusMessage += `${r.name}의 알고리즘 설계 기술 덕분에 알고리즘을 추가로 얻었습니다. `; }
        else if (r.skill === '시스템 분석') { gameState.resources.computing_power++; skillBonusMessage += `${r.name}의 시스템 분석 기술 덕분에 컴퓨팅 파워를 추가로 얻었습니다. `; }
    });

    Object.keys(gameState.researchModules).forEach(key => {
        const module = gameState.researchModules[key];
        if(module.built) {
            module.durability -= 1;
            if(module.durability <= 0) {
                module.built = false;
                durabilityMessage += `${key} 모듈이 파손되었습니다! 최적화가 필요합니다. `; 
            }
        }
    });

    gameState.resources.data -= gameState.researchers.length * 2; // Data consumption
    let dailyMessage = "새로운 날이 시작되었습니다. ";
    dailyMessage += statEffectMessage + skillBonusMessage + durabilityMessage;
    if (gameState.resources.data < 0) {
        gameState.knowledge -= 10;
        dailyMessage += "데이터가 부족하여 연구원들이 힘들어합니다! (-10 지식)";
    } else {
        dailyMessage += "";
    }

    // Check for game over conditions
    if (gameState.strategy <= 0) { gameState.currentScenarioId = "game_over_strategy"; }
    else if (gameState.knowledge <= 0) { gameState.currentScenarioId = "game_over_knowledge"; }
    else if (gameState.vision <= 0) { gameState.currentScenarioId = "game_over_vision"; }
    else if (gameState.efficiency <= 0) { gameState.currentScenarioId = "game_over_efficiency"; }
    else if (gameState.precision <= 0) { gameState.currentScenarioId = "game_over_precision"; }
    else if (gameState.resources.data < -(gameState.researchers.length * 5)) { gameState.currentScenarioId = "game_over_resources"; }

    // --- New Weighted Random Event Logic ---
    let eventId = "intro";
    const possibleEvents = weightedDailyEvents.filter(event => !event.condition || event.condition());
    const totalWeight = possibleEvents.reduce((sum, event) => sum + event.weight, 0);
    const rand = currentRandFn() * totalWeight;

    let cumulativeWeight = 0;
    let chosenEvent = null;

    for (const event of possibleEvents) {
        cumulativeWeight += event.weight;
        if (rand < cumulativeWeight) {
            chosenEvent = event;
            break;
        }
    }

    if (chosenEvent) {
        eventId = chosenEvent.id;
        if (chosenEvent.onTrigger) {
            chosenEvent.onTrigger();
        }
    }

    gameState.currentScenarioId = eventId;
    updateGameDisplay(dailyMessage + (gameScenarios[eventId]?.text || ''));
    renderChoices(gameScenarios[eventId].choices);
    saveGameState();
}

function initDailyGame() {
    loadGameState();
}

function resetGame() {
    if (confirm("정말로 비밀 연구소를 포기하시겠습니까? 모든 연구 성과가 사라집니다.")) {
        localStorage.removeItem('intjSecretLabGame');
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
