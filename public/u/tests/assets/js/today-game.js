// today-game.js - 전략가의 비밀 연구소 (The Strategist's Secret Laboratory)

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

// --- Game State Management ---
let gameState = {};
let currentRandFn = null;

function resetGameState() {
    gameState = {
        day: 1,
        strategy: 50,
        knowledge: 50,
        vision: 50,
        actionPoints: 10,
        maxActionPoints: 10,
        resources: { data: 10, algorithms: 10, computing_power: 5, breakthrough: 0 },
        researchers: [
            { id: "alpha", name: "알파", personality: "분석적인", skill: "데이터 마이닝", competence: 70 },
            { id: "beta", name: "베타", personality: "독창적인", skill: "알고리즘 설계", competence: 60 }
        ],
        maxResearchers: 5,
        currentScenarioId: "intro",
        lastPlayedDate: new Date().toISOString().slice(0, 10),
        manualDayAdvances: 0,
        dailyEventTriggered: false,
        dailyBonus: { researchSuccess: 0 },
        dailyActions: { analyzed: false, simulationRun: false, talkedTo: [], minigamePlayed: false },
        modules: {
            dataServer: { built: false, durability: 100 },
            simulationLab: { built: false, durability: 100 },
            controlTower: { built: false, durability: 100 },
            aiCore: { built: false, durability: 100 },
            quantumComputer: { built: false, durability: 100 }
        },
        labLevel: 0,
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
                { id: "alpha", name: "알파", personality: "분석적인", skill: "데이터 마이닝", competence: 70 },
                { id: "beta", name: "베타", personality: "독창적인", skill: "알고리즘 설계", competence: 60 }
            ];
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
    const researcherListHtml = gameState.researchers.map(r => `<li>${r.name} (${r.skill}) - 유능함: ${r.competence}</li>`).join('');
    statsDiv.innerHTML = `
        <p><b>연구:</b> ${gameState.day}일차</p>
        <p><b>집중력:</b> ${gameState.actionPoints}/${gameState.maxActionPoints}</p>
        <p><b>전략:</b> ${gameState.strategy} | <b>지식:</b> ${gameState.knowledge} | <b>비전:</b> ${gameState.vision}</p>
        <p><b>자원:</b> 데이터 ${gameState.resources.data}, 알고리즘 ${gameState.resources.algorithms}, 컴퓨팅 파워 ${gameState.resources.computing_power}, 기술 혁신 ${gameState.resources.breakthrough || 0}</p>
        <p><b>연구소 레벨:</b> ${gameState.labLevel}</p>
        <p><b>핵심 연구원 (${gameState.researchers.length}/${gameState.maxResearchers}):</b></p>
        <ul>${researcherListHtml}</ul>
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
    } else if (gameState.currentScenarioId === 'action_facility_management') {
        dynamicChoices = gameScenarios.action_facility_management.choices ? [...gameScenarios.action_facility_management.choices] : [];
        if (!gameState.modules.dataServer.built) dynamicChoices.push({ text: "데이터 서버 증축 (데이터 50, 컴퓨팅 파워 20)", action: "build_data_server" });
        if (!gameState.modules.simulationLab.built) dynamicChoices.push({ text: "시뮬레이션 랩 구축 (알고리즘 30, 컴퓨팅 파워 30)", action: "build_simulation_lab" });
        if (!gameState.modules.controlTower.built) dynamicChoices.push({ text: "관제탑 건설 (데이터 100, 알고리즘 50, 컴퓨팅 파워 50)", action: "build_control_tower" });
        if (!gameState.modules.aiCore.built) dynamicChoices.push({ text: "AI 코어 개발 (알고리즘 80, 컴퓨팅 파워 40)", action: "build_ai_core" });
        if (gameState.modules.simulationLab.built && gameState.modules.simulationLab.durability > 0 && !gameState.modules.quantumComputer.built) {
            dynamicChoices.push({ text: "양자 컴퓨터 도입 (알고리즘 50, 컴퓨팅 파워 100)", action: "build_quantum_computer" });
        }
        Object.keys(gameState.modules).forEach(key => {
            const facility = gameState.modules[key];
            if (facility.built && facility.durability < 100) {
                dynamicChoices.push({ text: `${key} 최적화 (알고리즘 10, 컴퓨팅 파워 10)`, action: "maintain_facility", params: { facility: key } });
            }
        });
        dynamicChoices.push({ text: "취소", action: "return_to_intro" });
    } else {
        dynamicChoices = choices ? [...choices] : [];
    }

    choicesDiv.innerHTML = dynamicChoices.map(choice => `<button class="choice-btn" data-action="${choice.action}" data-params='${JSON.stringify(choice.params || {})}''>${choice.text}</button>`).join('');
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
    "intro": { text: "오늘의 연구 과제는 무엇입니까?", choices: [
        { text: "데이터 분석", action: "analyze_data" },
        { text: "연구원과 토론", action: "talk_to_researchers" },
        { text: "시뮬레이션 실행", action: "run_simulation" },
        { text: "자원 수집", action: "show_resource_collection_options" },
        { text: "연구 모듈 관리", action: "show_facility_options" },
        { text: "오늘의 미니게임", action: "play_minigame" }
    ]},
    "daily_event_logical_fallacy": {
        text: "기존 연구에서 치명적인 논리적 오류를 발견했습니다. 어떻게 하시겠습니까?",
        choices: [
            { text: "즉시 오류를 수정하고 보고한다.", action: "handle_fallacy", params: { choice: "report" } },
            { text: "오류를 기반으로 새로운 가설을 세운다.", action: "handle_fallacy", params: { choice: "hypothesize" } },
            { text: "조용히 데이터를 폐기한다.", action: "ignore_event" }
        ]
    },
    "daily_event_power_outage": { text: "갑작스러운 정전으로 서버가 다운되었습니다. (-10 컴퓨팅 파워)", choices: [{ text: "확인", action: "return_to_intro" }] },
    "daily_event_algorithm_bug": { text: "알고리즘에서 버그가 발견되어 연구가 지연됩니다. (-10 알고리즘)", choices: [{ text: "확인", action: "return_to_intro" }] },
    "daily_event_funding": {
        text: "외부 기관에서 연구 자금 지원을 제안했습니다. [데이터 50]을 제공하고 [기술 혁신]을 앞당길 수 있습니다.",
        choices: [
            { text: "제안을 수락한다", action: "accept_funding" },
            { text: "독자적으로 연구하겠다", action: "decline_funding" }
        ]
    },
    "daily_event_new_researcher": {
        choices: [
            { text: "그의 논문을 보고 즉시 채용한다.", action: "welcome_new_unique_researcher" },
            { text: "기존 연구원들과의 시너지를 검토한다.", action: "observe_researcher" },
            { text: "우리 연구소와 방향이 다르다.", action: "reject_researcher" }
        ]
    },
    "game_over_strategy": { text: "전략적 판단 실패로 연구가 막다른 길에 다다랐습니다.", choices: [], final: true },
    "game_over_knowledge": { text: "지식이 부족하여 더 이상 연구를 진행할 수 없습니다.", choices: [], final: true },
    "game_over_vision": { text: "비전을 잃은 연구는 방향을 잃고 표류합니다.", choices: [], final: true },
    "game_over_resources": { text: "연구 자원이 모두 고갈되었습니다.", choices: [], final: true },
    "action_resource_collection": {
        text: "어떤 자원을 수집하시겠습니까?",
        choices: [
            { text: "빅데이터 수집 (데이터)", action: "perform_gather_data" },
            { text: "알고리즘 개발 (알고리즘)", action: "perform_develop_algorithms" },
            { text: "컴퓨팅 파워 증설 (컴퓨팅 파워)", "action": "perform_increase_computing_power" },
            { text: "취소", "action": "return_to_intro" }
        ]
    },
    "action_facility_management": {
        text: "어떤 연구 모듈을 관리하시겠습니까?",
        choices: []
    },
    "resource_collection_result": {
        text: "",
        choices: [{ text: "확인", action: "show_resource_collection_options" }]
    },
    "facility_management_result": {
        text: "",
        choices: [{ text: "확인", action: "show_facility_options" }]
    },
    "fallacy_resolution_result": {
        text: "",
        choices: [{ text: "확인", action: "return_to_intro" }]
    }
};

function calculateMinigameReward(minigameName, score) {
    let rewards = { strategy: 0, knowledge: 0, vision: 0, message: "" };

    switch (minigameName) {
        case "기억력 순서 맞추기":
            if (score >= 51) {
                rewards.knowledge = 15;
                rewards.strategy = 10;
                rewards.vision = 5;
                rewards.message = `완벽한 기억력입니다! 모든 데이터 패턴을 기억했습니다. (+15 지식, +10 전략, +5 비전)`;
            } else if (score >= 21) {
                rewards.knowledge = 10;
                rewards.strategy = 5;
                rewards.message = `훌륭한 기억력입니다. (+10 지식, +5 전략)`;
            } else if (score >= 0) {
                rewards.knowledge = 5;
                rewards.message = `훈련을 완료했습니다. (+5 지식)`;
            } else {
                rewards.message = `훈련을 완료했지만, 아쉽게도 보상은 없습니다.`;
            }
            break;
        case "시스템 최적화":
            rewards.strategy = 10;
            rewards.message = `시스템의 비효율을 제거했습니다! (+10 전략)`;
            break;
        case "미래 예측 시뮬레이션":
            rewards.vision = 10;
            rewards.message = `시뮬레이션을 통해 미래를 예측했습니다. (+10 비전)`;
            break;
        case "복잡계 퍼즐":
            rewards.knowledge = 10;
            rewards.message = `복잡한 문제의 해답을 찾았습니다. (+10 지식)`;
            break;
        case "논리 오류 찾기":
            rewards.strategy = 5;
            rewards.knowledge = 5;
            rewards.message = `논리적 오류를 수정하여 시스템을 개선했습니다. (+5 전략, +5 지식)`;
            break;
        default:
            rewards.message = `미니게임 ${minigameName}을(를) 완료했습니다.`;
            break;
    }
    return rewards;
}

const minigames = [
    {
        name: "기억력 순서 맞추기",
        description: "화면에 나타나는 데이터 패턴 순서를 기억하고 정확하게 입력하세요. 단계가 올라갈수록 어려워집니다!",
        start: (gameArea, choicesDiv) => {
            gameState.minigameState = { currentSequence: [], playerInput: [], stage: 1, score: 0, showingSequence: false };
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
                <div class="number-pad">
                    ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => `<button class="choice-btn num-btn" data-value="${num}">${num}</button>`).join('')}
                    <button class="choice-btn num-btn" data-value="0">0</button>
                    <button class="choice-btn submit-btn" data-action="submitSequence">입력 완료</button>
                    <button class="choice-btn reset-btn" data-action="resetInput">초기화</button>
                </div>
            `;
            choicesDiv.querySelectorAll('.num-btn').forEach(button => {
                button.addEventListener('click', () => minigames[0].processAction('addInput', button.dataset.value));
            });
            choicesDiv.querySelector('.submit-btn').addEventListener('click', () => minigames[0].processAction('submitSequence'));
            choicesDiv.querySelector('.reset-btn').addEventListener('click', () => minigames[0].processAction('resetInput'));
        },
        showSequence: () => {
            gameState.minigameState.showingSequence = true;
            gameState.minigameState.currentSequence = [];
            const sequenceLength = gameState.minigameState.stage + 2;
            for (let i = 0; i < sequenceLength; i++) {
                gameState.minigameState.currentSequence.push(Math.floor(currentRandFn() * 10));
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
                gameState.minigameState.playerInput.push(parseInt(value));
                document.getElementById('playerInputDisplay').innerText = gameState.minigameState.playerInput.join(' ');
            } else if (actionType === 'resetInput') {
                gameState.minigameState.playerInput = [];
                document.getElementById('playerInputDisplay').innerText = '';
            } else if (actionType === 'submitSequence') {
                const correct = gameState.minigameState.currentSequence.every((num, i) => num === gameState.minigameState.playerInput[i]);

                if (correct && gameState.minigameState.playerInput.length === gameState.minigameState.currentSequence.length) {
                    gameState.minigameState.score += gameState.minigameState.currentSequence.length * 10;
                    gameState.minigameState.stage++;
                    gameState.minigameState.playerInput = [];
                    updateGameDisplay("정답입니다! 다음 단계로 넘어갑니다.");
                    minigames[0].render(document.getElementById('gameArea'), document.getElementById('gameChoices'));
                    setTimeout(() => minigames[0].showSequence(), 1500);
                } else {
                    updateGameDisplay("오답입니다. 게임 종료.");
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
                currentScenarioId: 'intro'
            }, rewards.message);
            gameState.minigameState = {};
        }
    },
    { name: "시스템 최적화", description: "주어진 시스템의 비효율적인 부분을 찾아 최적화하세요.", start: (ga, cd) => { ga.innerHTML = "<p>시스템 최적화 - 개발 중</p>"; cd.innerHTML = "<button class='choice-btn' onclick='minigames[1].end()'>종료</button>"; gameState.minigameState = { score: 10 }; }, render: () => {}, processAction: () => {}, end: () => { const r = calculateMinigameReward(minigames[1].name, gameState.minigameState.score); updateState({ strategy: gameState.strategy + r.strategy, knowledge: gameState.knowledge + r.knowledge, vision: gameState.vision + r.vision, currentScenarioId: 'intro' }, r.message); gameState.minigameState = {}; } },
    { name: "미래 예측 시뮬레이션", description: "현재 데이터를 기반으로 미래를 예측하고 최적의 전략을 선택하세요.", start: (ga, cd) => { ga.innerHTML = "<p>미래 예측 시뮬레이션 - 개발 중</p>"; cd.innerHTML = "<button class='choice-btn' onclick='minigames[2].end()'>종료</button>"; gameState.minigameState = { score: 15 }; }, render: () => {}, processAction: () => {}, end: () => { const r = calculateMinigameReward(minigames[2].name, gameState.minigameState.score); updateState({ strategy: gameState.strategy + r.strategy, knowledge: gameState.knowledge + r.knowledge, vision: gameState.vision + r.vision, currentScenarioId: 'intro' }, r.message); gameState.minigameState = {}; } },
    { name: "복잡계 퍼즐", description: "여러 변수가 얽힌 복잡한 퍼즐을 논리적으로 해결하세요.", start: (ga, cd) => { ga.innerHTML = "<p>복잡계 퍼즐 - 개발 중</p>"; cd.innerHTML = "<button class='choice-btn' onclick='minigames[3].end()'>종료</button>"; gameState.minigameState = { score: 20 }; }, render: () => {}, processAction: () => {}, end: () => { const r = calculateMinigameReward(minigames[3].name, gameState.minigameState.score); updateState({ strategy: gameState.strategy + r.strategy, knowledge: gameState.knowledge + r.knowledge, vision: gameState.vision + r.vision, currentScenarioId: 'intro' }, r.message); gameState.minigameState = {}; } },
    { name: "논리 오류 찾기", description: "주어진 가설에서 논리적 오류를 찾아내세요.", start: (ga, cd) => { ga.innerHTML = "<p>논리 오류 찾기 - 개발 중</p>"; cd.innerHTML = "<button class='choice-btn' onclick='minigames[4].end()'>종료</button>"; gameState.minigameState = { score: 25 }; }, render: () => {}, processAction: () => {}, end: () => { const r = calculateMinigameReward(minigames[4].name, gameState.minigameState.score); updateState({ strategy: gameState.strategy + r.strategy, knowledge: gameState.knowledge + r.knowledge, vision: gameState.vision + r.vision, currentScenarioId: 'intro' }, r.message); gameState.minigameState = {}; } }
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
        if (gameState.dailyActions.analyzed) { updateState({ dailyActions: { ...gameState.dailyActions, analyzed: true } }, "오늘은 이미 모든 데이터를 분석했습니다."); return; }
        
        let changes = { dailyActions: { ...gameState.dailyActions, analyzed: true } };
        let message = "데이터를 분석하여 새로운 패턴을 찾습니다.";
        const rand = currentRandFn();
        if (rand < 0.3) { message += " 새로운 알고리즘 아이디어를 얻었습니다. (+2 알고리즘)"; changes.resources = { ...gameState.resources, algorithms: gameState.resources.algorithms + 2 }; }
        else if (rand < 0.6) { message += " 시스템의 효율성을 높일 방법을 찾았습니다. (+2 전략)"; changes.strategy = gameState.strategy + 2; }
        else { message += " 특별한 것은 발견하지 못했습니다."; }
        
        updateState(changes, message);
    },
    talk_to_researchers: () => {
        if (!spendActionPoint()) return;
        const researcher = gameState.researchers[Math.floor(currentRandFn() * gameState.researchers.length)];
        if (gameState.dailyActions.talkedTo.includes(researcher.id)) { updateState({ dailyActions: { ...gameState.dailyActions, talkedTo: [...gameState.dailyActions.talkedTo, researcher.id] } }, `${researcher.name}${getWaGwaParticle(researcher.name)} 이미 토론했습니다.`); return; }
        
        let changes = { dailyActions: { ...gameState.dailyActions, talkedTo: [...gameState.dailyActions.talkedTo, researcher.id] } };
        let message = `${researcher.name}${getWaGwaParticle(researcher.name)} 토론했습니다. `;
        if (researcher.competence > 80) { message += "그의 통찰력 덕분에 연구의 비전이 명확해졌습니다. (+5 비전)"; changes.vision = gameState.vision + 5; }
        else if (researcher.competence < 40) { message += "그의 비논리적인 주장에 지식이 하락합니다. (-5 지식)"; changes.knowledge = gameState.knowledge - 5; }
        else { message += "그와의 토론을 통해 새로운 지식을 얻었습니다. (+2 지식)"; changes.knowledge = gameState.knowledge + 2; }
        
        updateState(changes, message);
    },
    run_simulation: () => {
        if (!spendActionPoint()) return;
        if (gameState.dailyActions.simulationRun) {
            const message = "오늘은 이미 시뮬레이션을 실행했습니다. (-5 전략)";
            gameState.strategy -= 5;
            updateState({ strategy: gameState.strategy }, message);
            return;
        }
        updateState({ dailyActions: { ...gameState.dailyActions, simulationRun: true } });
        const rand = currentRandFn();
        let message = "시뮬레이션을 실행했습니다. ";
        if (rand < 0.5) { message += "예상치 못한 변수를 발견하여 전략이 더욱 견고해졌습니다. (+10 전략, +5 비전)"; updateState({ strategy: gameState.strategy + 10, vision: gameState.vision + 5 }); }
        else { message += "시뮬레이션 결과, 현재 전략의 유효성을 확인했습니다. (+5 전략)"; updateState({ strategy: gameState.strategy + 5 }); }
        updateGameDisplay(message);
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
    handle_fallacy: (params) => {
        if (!spendActionPoint()) return;
        const { choice } = params;
        let message = "";
        let reward = { strategy: 0, knowledge: 0, vision: 0 };
        
        if (choice === "report") {
            message = "오류를 즉시 수정하여 연구의 정확성을 높였습니다. (+5 지식, +5 전략)";
            reward.knowledge += 5;
            reward.strategy += 5;
        } else {
            message = "오류를 새로운 관점의 발판으로 삼았습니다. (+5 비전, -5 지식)";
            reward.vision += 5;
            reward.knowledge -= 5;
        }
        
        updateState({ ...reward, currentScenarioId: 'fallacy_resolution_result' }, message);
    },
    ignore_event: () => {
        if (!spendActionPoint()) return;
        const message = "오류를 무시했습니다. 연구의 신뢰도가 하락합니다. (-10 지식, -5 전략)";
        updateState({ knowledge: gameState.knowledge - 10, strategy: gameState.strategy - 5, currentScenarioId: 'fallacy_resolution_result' }, message);
    },
    show_resource_collection_options: () => updateState({ currentScenarioId: 'action_resource_collection' }),
    show_facility_options: () => updateState({ currentScenarioId: 'action_facility_management' }),
    perform_gather_data: () => {
        if (!spendActionPoint()) return;
        const successChance = Math.min(0.95, 0.6 + (gameState.labLevel * 0.1) + (gameState.dailyBonus.researchSuccess || 0));
        let message = "";
        let changes = {};
        if (currentRandFn() < successChance) {
            message = "데이터 수집에 성공했습니다! (+5 데이터)";
            changes.resources = { ...gameState.resources, data: gameState.resources.data + 5 };
        } else {
            message = "데이터 수집에 실패했습니다.";
        }
        updateState(changes, message);
    },
    perform_develop_algorithms: () => {
        if (!spendActionPoint()) return;
        const successChance = Math.min(0.95, 0.6 + (gameState.labLevel * 0.1) + (gameState.dailyBonus.researchSuccess || 0));
        let message = "";
        let changes = {};
        if (currentRandFn() < successChance) {
            message = "알고리즘 개발에 성공했습니다! (+5 알고리즘)";
            changes.resources = { ...gameState.resources, algorithms: gameState.resources.algorithms + 5 };
        } else {
            message = "알고리즘 개발에 실패했습니다.";
        }
        updateState(changes, message);
    },
    perform_increase_computing_power: () => {
        if (!spendActionPoint()) return;
        const successChance = Math.min(0.95, 0.6 + (gameState.labLevel * 0.1) + (gameState.dailyBonus.researchSuccess || 0));
        let message = "";
        let changes = {};
        if (currentRandFn() < successChance) {
            message = "컴퓨팅 파워 증설에 성공했습니다! (+5 컴퓨팅 파워)";
            changes.resources = { ...gameState.resources, computing_power: gameState.resources.computing_power + 5 };
        } else {
            message = "증설에 실패했습니다.";
        }
        updateState(changes, message);
    },
    build_data_server: () => {
        if (!spendActionPoint()) return;
        const cost = { data: 50, computing_power: 20 };
        let message = "";
        let changes = {};
        if (gameState.resources.computing_power >= cost.computing_power && gameState.resources.data >= cost.data) {
            gameState.modules.dataServer.built = true;
            message = "데이터 서버를 증축했습니다!";
            changes.vision = gameState.vision + 10;
            changes.resources = { ...gameState.resources, computing_power: gameState.resources.computing_power - cost.computing_power, data: gameState.resources.data - cost.data };
        } else {
            message = "자원이 부족하여 증축할 수 없습니다.";
        }
        updateState(changes, message);
    },
    build_simulation_lab: () => {
        if (!spendActionPoint()) return;
        const cost = { algorithms: 30, computing_power: 30 };
        let message = "";
        let changes = {};
        if (gameState.resources.algorithms >= cost.algorithms && gameState.resources.computing_power >= cost.computing_power) {
            gameState.modules.simulationLab.built = true;
            message = "시뮬레이션 랩을 구축했습니다!";
            changes.knowledge = gameState.knowledge + 10;
            changes.resources = { ...gameState.resources, algorithms: gameState.resources.algorithms - cost.algorithms, computing_power: gameState.resources.computing_power - cost.computing_power };
        } else {
            message = "자원이 부족하여 구축할 수 없습니다.";
        }
        updateState(changes, message);
    },
    build_control_tower: () => {
        if (!spendActionPoint()) return;
        const cost = { data: 100, algorithms: 50, computing_power: 50 };
        let message = "";
        let changes = {};
        if (gameState.resources.algorithms >= cost.algorithms && gameState.resources.computing_power >= cost.computing_power && gameState.resources.data >= cost.data) {
            gameState.modules.controlTower.built = true;
            message = "관제탑을 건설했습니다!";
            changes.vision = gameState.vision + 20;
            changes.knowledge = gameState.knowledge + 20;
            changes.resources = { ...gameState.resources, algorithms: gameState.resources.algorithms - cost.algorithms, computing_power: gameState.resources.computing_power - cost.computing_power, data: gameState.resources.data - cost.data };
        } else {
            message = "자원이 부족하여 건설할 수 없습니다.";
        }
        updateState(changes, message);
    },
    build_ai_core: () => {
        if (!spendActionPoint()) return;
        const cost = { algorithms: 80, computing_power: 40 };
        let message = "";
        let changes = {};
        if (gameState.resources.algorithms >= cost.algorithms && gameState.resources.computing_power >= cost.computing_power) {
            gameState.modules.aiCore.built = true;
            message = "AI 코어를 개발했습니다!";
            changes.strategy = gameState.strategy + 15;
            changes.vision = gameState.vision + 10;
            changes.resources = { ...gameState.resources, algorithms: gameState.resources.algorithms - cost.algorithms, computing_power: gameState.resources.computing_power - cost.computing_power };
        } else {
            message = "자원이 부족하여 개발할 수 없습니다.";
        }
        updateState(changes, message);
    },
    build_quantum_computer: () => {
        if (!spendActionPoint()) return;
        const cost = { algorithms: 50, computing_power: 100 };
        let message = "";
        let changes = {};
        if (gameState.resources.algorithms >= cost.algorithms && gameState.resources.computing_power >= cost.computing_power) {
            gameState.modules.quantumComputer.built = true;
            message = "양자 컴퓨터를 도입했습니다!";
            changes.resources = { ...gameState.resources, algorithms: gameState.resources.algorithms - cost.algorithms, computing_power: gameState.resources.computing_power - cost.computing_power };
        } else {
            message = "자원이 부족하여 도입할 수 없습니다.";
        }
        updateState(changes, message);
    },
    maintain_facility: (params) => {
        if (!spendActionPoint()) return;
        const facilityKey = params.facility;
        const cost = { algorithms: 10, computing_power: 10 };
        let message = "";
        let changes = {};
        if (gameState.resources.algorithms >= cost.algorithms && gameState.resources.computing_power >= cost.computing_power) {
            gameState.modules[facilityKey].durability = 100;
            message = `${facilityKey} 모듈의 최적화를 완료했습니다. 내구도가 100으로 회복되었습니다.`;
            changes.resources = { ...gameState.resources, algorithms: gameState.resources.algorithms - cost.algorithms, computing_power: gameState.resources.computing_power - cost.computing_power };
        } else {
            message = "최적화에 필요한 자원이 부족합니다.";
        }
        updateState(changes, message);
    },
    upgrade_lab: () => {
        if (!spendActionPoint()) return;
        const cost = 20 * (gameState.labLevel + 1);
        if (gameState.resources.algorithms >= cost && gameState.resources.computing_power >= cost) {
            gameState.labLevel++;
            updateState({ resources: { ...gameState.resources, algorithms: gameState.resources.algorithms - cost, computing_power: gameState.resources.computing_power - cost }, labLevel: gameState.labLevel });
            updateGameDisplay(`연구소를 업그레이드했습니다! 모든 연구 성공률이 10% 증가합니다. (현재 레벨: ${gameState.labLevel})`);
        } else { updateGameDisplay(`업그레이드에 필요한 자원이 부족합니다. (알고리즘 ${cost}, 컴퓨팅 파워 ${cost} 필요)`); }
        updateState({ currentScenarioId: 'intro' });
    },
    review_archives: () => {
        if (!spendActionPoint()) return;
        const rand = currentRandFn();
        if (rand < 0.3) { updateState({ resources: { ...gameState.resources, algorithms: gameState.resources.algorithms + 20, computing_power: gameState.resources.computing_power + 20 } }); updateGameDisplay("과거 기록에서 잊혀진 자원을 발견했습니다! (+20 알고리즘, +20 컴퓨팅 파워)"); }
        else if (rand < 0.5) { updateState({ strategy: gameState.strategy + 10, vision: gameState.vision + 10 }); updateGameDisplay("과거 기록에서 미래를 예측할 통찰을 얻었습니다. (+10 전략, +10 비전)"); }
        else { updateGameDisplay("과거 기록을 검토했지만, 특별한 것은 발견하지 못했습니다."); }
        updateState({ currentScenarioId: 'intro' });
    },
    accept_funding: () => {
        if (!spendActionPoint()) return;
        if (gameState.resources.data >= 50) {
            updateState({ resources: { ...gameState.resources, data: gameState.resources.data - 50, breakthrough: (gameState.resources.breakthrough || 0) + 1 } });
            updateGameDisplay("연구 자금을 지원받아 기술 혁신을 앞당겼습니다! 연구소의 비전이 더욱 명확해집니다.");
        } else { updateGameDisplay("제공할 데이터가 부족합니다."); }
        updateState({ currentScenarioId: 'intro' });
    },
    decline_funding: () => {
        if (!spendActionPoint()) return;
        updateGameDisplay("외부 지원을 거절하고 독자적인 연구를 계속하기로 했습니다.");
        updateState({ currentScenarioId: 'intro' });
    },
    return_to_intro: () => updateState({ currentScenarioId: 'intro' }),
    play_minigame: () => {
        if (gameState.dailyActions.minigamePlayed) { updateGameDisplay("오늘의 미니게임은 이미 플레이했습니다."); return; }
        if (!spendActionPoint()) return;
        
        const minigameIndex = (gameState.day - 1) % minigames.length;
        const minigame = minigames[minigameIndex];
        
        gameState.currentScenarioId = `minigame_${minigame.name}`;
        
        updateState({ dailyActions: { ...gameState.dailyActions, minigamePlayed: true } }); 
        
        updateGameDisplay(minigame.description);
        minigame.start(document.getElementById('gameArea'), document.getElementById('gameChoices'));
    }
};

function applyStatEffects() {
    let message = "";
    if (gameState.strategy >= 70) {
        gameState.dailyBonus.researchSuccess += 0.1;
        message += "뛰어난 전략 덕분에 연구 성공률이 증가합니다. ";
    }
    if (gameState.strategy < 30) {
        gameState.researchers.forEach(r => r.competence = Math.max(0, r.competence - 5));
        message += "잘못된 전략으로 인해 연구원들의 유능함이 하락합니다. ";
    }

    if (gameState.knowledge >= 70) {
        gameState.maxActionPoints += 1;
        gameState.actionPoints = gameState.maxActionPoints;
        message += "방대한 지식 덕분에 집중력이 증가합니다. ";
    }
    if (gameState.knowledge < 30) {
        gameState.maxActionPoints = Math.max(5, gameState.maxActionPoints - 1);
        gameState.actionPoints = Math.min(gameState.actionPoints, gameState.maxActionPoints);
        message += "지식이 부족하여 연구에 차질이 생깁니다. ";
    }

    if (gameState.vision >= 70) {
        Object.keys(gameState.modules).forEach(key => {
            if (gameState.modules[key].built) gameState.modules[key].durability = Math.min(100, gameState.modules[key].durability + 1);
        });
        message += "명확한 비전 덕분에 연구 모듈 관리가 더 잘 이루어집니다. ";
    }
    if (gameState.vision < 30) {
        Object.keys(gameState.modules).forEach(key => {
            if (gameState.modules[key].built) gameState.modules[key].durability = Math.max(0, gameState.modules[key].durability - 2);
        });
        message += "비전이 흔들려 연구 모듈이 빠르게 노후화됩니다. ";
    }
    return message;
}

function generateRandomResearcher() {
    const names = ["오메가", "감마", "델타", "시그마"];
    const personalities = ["논리적인", "독창적인", "비판적인", "체계적인"];
    const skills = ["데이터 마이닝", "알고리즘 설계", "시스템 분석", "양자 역학"];
    const randomId = Math.random().toString(36).substring(2, 9);

    return {
        id: randomId,
        name: names[Math.floor(currentRandFn() * names.length)],
        personality: personalities[Math.floor(currentRandFn() * personalities.length)],
        skill: skills[Math.floor(currentRandFn() * skills.length)],
        competence: 50
    };
}

// --- Daily/Initialization Logic ---
function processDailyEvents() {
    if (gameState.dailyEventTriggered) return;
    currentRandFn = mulberry32(getDailySeed() + gameState.day);

    updateState({
        actionPoints: 10,
        maxActionPoints: 10,
        dailyActions: { analyzed: false, simulationRun: false, talkedTo: [], minigamePlayed: false },
        dailyEventTriggered: true,
        dailyBonus: { researchSuccess: 0 }
    });

    const statEffectMessage = applyStatEffects();

    let skillBonusMessage = "";
    let durabilityMessage = "";

    gameState.researchers.forEach(r => {
        if (r.skill === '데이터 마이닝') { gameState.resources.data++; skillBonusMessage += `${r.name}의 능력 덕분에 데이터를 추가로 얻었습니다. `; }
        else if (r.skill === '알고리즘 설계') { gameState.resources.algorithms++; skillBonusMessage += `${r.name}의 도움으로 알고리즘을 추가로 얻었습니다. `; }
        else if (r.skill === '시스템 분석') { gameState.strategy++; skillBonusMessage += `${r.name} 덕분에 연구소의 전략이 +1 향상되었습니다. `; }
    });

    Object.keys(gameState.modules).forEach(key => {
        const facility = gameState.modules[key];
        if(facility.built) {
            facility.durability -= 1;
            if(facility.durability <= 0) {
                facility.built = false;
                durabilityMessage += `${key} 모듈이 파손되었습니다! 보수가 필요합니다. `; 
            }
        }
    });

    gameState.resources.data -= gameState.researchers.length * 2;
    let dailyMessage = "새로운 연구일이 시작되었습니다. ";
    dailyMessage += statEffectMessage + skillBonusMessage + durabilityMessage;
    if (gameState.resources.data < 0) {
        gameState.knowledge -= 10;
        dailyMessage += "데이터가 부족하여 지식이 정체됩니다! (-10 지식)";
    }
    
    const rand = currentRandFn();
    let eventId = "intro";
    if (rand < 0.15) { eventId = "daily_event_power_outage"; updateState({resources: {...gameState.resources, computing_power: Math.max(0, gameState.resources.computing_power - 10)}}); }
    else if (rand < 0.30) { eventId = "daily_event_algorithm_bug"; updateState({resources: {...gameState.resources, algorithms: Math.max(0, gameState.resources.algorithms - 10)}}); }
    else if (rand < 0.5 && gameState.researchers.length >= 2) { eventId = "daily_event_logical_fallacy"; }
    else if (rand < 0.7 && gameState.modules.controlTower.built && gameState.researchers.length < gameState.maxResearchers) {
        eventId = "daily_event_new_researcher";
        const newResearcher = generateRandomResearcher();
        gameState.pendingNewResearcher = newResearcher;
        gameScenarios["daily_event_new_researcher"].text = `새로운 연구원 ${newResearcher.name}(${newResearcher.personality}, ${newResearcher.skill})이(가) 합류하고 싶어 합니다. (현재 연구원 수: ${gameState.researchers.length} / ${gameState.maxResearchers})`;
    }
    else if (rand < 0.85 && gameState.modules.controlTower.built) { eventId = "daily_event_funding"; }
    
    gameState.currentScenarioId = eventId;
    updateGameDisplay(dailyMessage + (gameScenarios[eventId]?.text || ''));
    renderChoices(gameScenarios[eventId].choices);
    saveGameState();
}

function initDailyGame() {
    loadGameState();
}

function resetGame() {
    if (confirm("정말로 연구소를 초기화하시겠습니까? 모든 연구 데이터가 사라집니다.")) {
        localStorage.removeItem('intjStrategyGame');
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
