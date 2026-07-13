// ============================================================
// cardsMode.js — Карточки (все слова уровня из файла)
// ============================================================

let cardsWords = [];
let cardsIndex = 0;
let cardsLevel = 'A1';
let cardsDirection = 'de_to_ru';
let cardsStudied = {};
let cardsContainer = {};
const CARDS_STUDIED_KEY = 'dm_cards_studied';
const CARDS_CONTAINER_KEY = 'dm_cards_container';

// ========== ЗАГРУЗКА ПРОГРЕССА ==========
function loadCardsProgress(level) {
    try {
        const studied = localStorage.getItem(CARDS_STUDIED_KEY + '_' + level);
        if (studied) cardsStudied = JSON.parse(studied);
        else cardsStudied = {};
        
        const container = localStorage.getItem(CARDS_CONTAINER_KEY + '_' + level);
        if (container) cardsContainer = JSON.parse(container);
        else cardsContainer = {};
    } catch(e) {
        cardsStudied = {};
        cardsContainer = {};
    }
}

function saveCardsProgress(level) {
    try {
        localStorage.setItem(CARDS_STUDIED_KEY + '_' + level, JSON.stringify(cardsStudied));
        localStorage.setItem(CARDS_CONTAINER_KEY + '_' + level, JSON.stringify(cardsContainer));
    } catch(e) {}
}

// ========== ЗАГРУЗКА ВСЕХ СЛОВ УРОВНЯ ==========
async function loadAllWordsForLevel(level) {
    try {
        const response = await fetch(`docs/${level}.json`);
        if (!response.ok) throw new Error('Файл не найден');
        const data = await response.json();
        return data;
    } catch(e) {
        console.error('Ошибка загрузки слов уровня:', e);
        // Если файла нет — собираем из уроков
        return await loadWordsFromLessons(level);
    }
}

// ========== ЗАГРУЗКА СЛОВ ИЗ УРОКОВ (ЗАПАСНОЙ ВАРИАНТ) ==========
async function loadWordsFromLessons(level) {
    try {
        const indexResponse = await fetch(`docs/${level}/index.json`);
        const indexData = await indexResponse.json();
        let allWords = [];
        const seen = new Set();
        for (const lesson of indexData.lessons) {
            const lessonFile = `docs/${level}/lessons/lesson_${String(lesson.id).padStart(2, '0')}.json`;
            try {
                const response = await fetch(lessonFile);
                if (response.ok) {
                    const data = await response.json();
                    if (data.quiz) {
                        for (const w of data.quiz) {
                            if (w.de && !seen.has(w.de)) {
                                seen.add(w.de);
                                allWords.push(w);
                            }
                        }
                    }
                }
            } catch(e) {}
        }
        return allWords;
    } catch(e) {
        return [];
    }
}

// ========== ОСНОВНАЯ ФУНКЦИЯ ==========
async function renderCards(container, level) {
    cardsLevel = level;
    loadCardsProgress(level);
    
    const allWords = await loadAllWordsForLevel(level);
    if (!allWords || allWords.length === 0) {
        container.innerHTML = `
            <div style="text-align:center;padding:40px;color:#999;">
                <div style="font-size:48px;margin-bottom:15px;">📭</div>
                <div>Нет слов для уровня ${level}</div>
                <div style="font-size:14px;margin-top:10px;">Загрузите файл ${level}.json в папку docs</div>
            </div>
        `;
        return;
    }
    
    cardsWords = allWords.filter(w => {
        const key = w.de;
        return !cardsStudied[key] && !cardsContainer[key];
    });
    
    if (cardsWords.length === 0) {
        container.innerHTML = `
            <div style="text-align:center;padding:40px;">
                <div style="font-size:48px;margin-bottom:15px;">🎉</div>
                <div style="font-size:20px;margin-bottom:10px;">Все слова уровня изучены!</div>
                <div style="font-size:14px;color:#888;">
                    ${Object.keys(cardsStudied).length} слов в контейнере
                </div>
                <button onclick="resetCards('${level}')" style="margin-top:15px;padding:10px 25px;background:#FF9800;color:white;border:none;border-radius:8px;cursor:pointer;">
                    🔄 Сбросить прогресс
                </button>
                <button onclick="showCardsContainer('${level}')" style="margin-top:15px;padding:10px 25px;background:#3B6FE0;color:white;border:none;border-radius:8px;cursor:pointer;margin-left:10px;">
                    📦 Контейнер
                </button>
            </div>
        `;
        return;
    }
    
    cardsIndex = 0;
    showCard(container);
}

// ========== ПОКАЗ КАРТОЧКИ ==========
function showCard(container) {
    if (cardsIndex >= cardsWords.length) {
        cardsIndex = 0;
        renderCards(container, cardsLevel);
        return;
    }
    
    const word = cardsWords[cardsIndex];
    const isDeToRu = cardsDirection === 'de_to_ru';
    const question = isDeToRu ? word.de : word.ru;
    const correctAnswer = isDeToRu ? word.ru : word.de;
    
    const allWords = [...cardsWords];
    const otherWords = allWords.filter(w => w.de !== word.de);
    const shuffled = [...otherWords];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    const options = [word, ...shuffled.slice(0, 3)];
    for (let i = options.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [options[i], options[j]] = [options[j], options[i]];
    }
    
    const total = cardsWords.length;
    const studiedCount = Object.keys(cardsStudied).length;
    const containerCount = Object.keys(cardsContainer).length;
    
    let html = `
        <div style="text-align:center;padding:10px 0;">
            <div style="display:flex;justify-content:space-between;align-items:center;max-width:550px;margin:0 auto 10px auto;">
                <button onclick="showCardsContainer('${cardsLevel}')" style="padding:5px 12px;background:#FF9800;color:white;border:none;border-radius:6px;cursor:pointer;font-size:12px;font-weight:bold;">📦 КОНТЕЙНЕР (${containerCount})</button>
                <button onclick="switchCardsDirection()" style="padding:5px 12px;background:#3B6FE0;color:white;border:none;border-radius:6px;cursor:pointer;font-size:12px;font-weight:bold;">
                    ${cardsDirection === 'de_to_ru' ? 'De → Ru' : 'Ru → De'}
                </button>
            </div>
            
            <div style="font-size:13px;color:#888;margin-bottom:5px;">
                🃏 Карточки ${cardsLevel} · ${studiedCount + containerCount} изучено из ${total + studiedCount + containerCount}
            </div>
            
            <div style="background:#FFFFFF;border-radius:20px;box-shadow:0 8px 24px rgba(0,0,0,0.1);max-width:550px;margin:10px auto;min-height:150px;display:flex;align-items:center;justify-content:center;text-align:center;padding:20px;">
                <div style="font-size:32px;font-weight:bold;color:#1A1A1A;">${question}</div>
            </div>
            
            <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;max-width:550px;margin:15px auto;">
                ${options.map(opt => `
                    <button class="card-option" data-word="${opt.de}" style="
                        padding:14px;
                        background:#FFFFFF;
                        border:2px solid #D0D0D0;
                        border-radius:12px;
                        cursor:pointer;
                        font-size:16px;
                        transition:all 0.1s;
                        font-family:inherit;
                    ">${isDeToRu ? opt.ru : opt.de}</button>
                `).join('')}
            </div>
            
            <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin:10px 0;">
                <button id="cardsStudyBtn" style="padding:8px 16px;background:#4CAF50;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:bold;font-size:13px;">✅ ИЗУЧЕНО</button>
                <button id="cardsContainerBtn" style="padding:8px 16px;background:#FF9800;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:bold;font-size:13px;">📦 В КОНТЕЙНЕР</button>
                <button id="cardsPrevBtn" style="padding:8px 16px;background:#E8F0FE;border:2px solid #D0D0D0;border-radius:8px;cursor:pointer;font-weight:bold;font-size:13px;">◀</button>
                <button id="cardsNextBtn" style="padding:8px 16px;background:#E8F0FE;border:2px solid #D0D0D0;border-radius:8px;cursor:pointer;font-weight:bold;font-size:13px;">▶</button>
                <button id="cardsResetBtn" style="padding:8px 16px;background:#E8F0FE;border:2px solid #D0D0D0;border-radius:8px;cursor:pointer;font-weight:bold;font-size:13px;">⏮ В НАЧАЛО</button>
            </div>
            
            <div style="font-size:13px;color:#888;margin-top:5px;">
                ${cardsIndex + 1} / ${cardsWords.length}
            </div>
        </div>
    `;
    
    container.innerHTML = html;
    
    // Обработчики
    document.querySelectorAll('.card-option').forEach(btn => {
        btn.addEventListener('click', function() {
            const selectedWord = this.dataset.word;
            const isCorrect = selectedWord === word.de;
            
            if (isCorrect) {
                this.style.background = '#C8E6C9';
                this.style.borderColor = '#4CAF50';
                setTimeout(() => {
                    cardsIndex++;
                    showCard(container);
                }, 400);
            } else {
                this.style.background = '#FFCDD2';
                this.style.borderColor = '#F44336';
                setTimeout(() => {
                    this.style.background = '#FFFFFF';
                    this.style.borderColor = '#D0D0D0';
                }, 500);
            }
        });
    });
    
    document.getElementById('cardsStudyBtn').addEventListener('click', function() {
        const key = word.de;
        cardsStudied[key] = true;
        saveCardsProgress(cardsLevel);
        cardsWords = cardsWords.filter(w => w.de !== key);
        if (cardsWords.length === 0) {
            renderCards(container, cardsLevel);
        } else {
            if (cardsIndex >= cardsWords.length) cardsIndex = 0;
            showCard(container);
        }
    });
    
    document.getElementById('cardsContainerBtn').addEventListener('click', function() {
        const key = word.de;
        cardsContainer[key] = true;
        saveCardsProgress(cardsLevel);
        cardsWords = cardsWords.filter(w => w.de !== key);
        if (cardsWords.length === 0) {
            renderCards(container, cardsLevel);
        } else {
            if (cardsIndex >= cardsWords.length) cardsIndex = 0;
            showCard(container);
        }
    });
    
    document.getElementById('cardsPrevBtn').addEventListener('click', function() {
        if (cardsIndex > 0) {
            cardsIndex--;
            showCard(container);
        }
    });
    
    document.getElementById('cardsNextBtn').addEventListener('click', function() {
        if (cardsIndex < cardsWords.length - 1) {
            cardsIndex++;
            showCard(container);
        }
    });
    
    document.getElementById('cardsResetBtn').addEventListener('click', function() {
        if (cardsWords.length > 0) {
            cardsIndex = 0;
            showCard(container);
        }
    });
}

// ========== ПЕРЕКЛЮЧЕНИЕ НАПРАВЛЕНИЯ ==========
function switchCardsDirection() {
    cardsDirection = cardsDirection === 'de_to_ru' ? 'ru_to_de' : 'de_to_ru';
    const container = document.getElementById('modeContent');
    if (container && cardsWords.length > 0) {
        showCard(container);
    }
}

// ========== ПОКАЗ КОНТЕЙНЕРА ==========
function showCardsContainer(level) {
    const container = document.getElementById('modeContent');
    if (!container) return;
    
    const items = Object.keys(cardsContainer);
    if (items.length === 0) {
        alert('📦 Контейнер пуст');
        return;
    }
    
    // Просто показываем список в модалке
    let text = '📦 КОНТЕЙНЕР КАРТОЧЕК (' + items.length + ' слов):\n\n';
    // Нужно получить слова из файла, чтобы показать их
    loadAllWordsForLevel(level).then(allWords => {
        items.forEach(key => {
            const word = allWords.find(w => w.de === key);
            if (word) {
                text += word.de + ' — ' + word.ru + '\n';
            }
        });
        alert(text);
    });
}

// ========== СБРОС ПРОГРЕССА ==========
function resetCards(level) {
    if (!confirm(`Сбросить весь прогресс Карточек для уровня ${level}?`)) return;
    localStorage.removeItem(CARDS_STUDIED_KEY + '_' + level);
    localStorage.removeItem(CARDS_CONTAINER_KEY + '_' + level);
    cardsStudied = {};
    cardsContainer = {};
    const container = document.getElementById('modeContent');
    renderCards(container, level);
}

// Экспорт
window.renderCards = renderCards;
window.resetCards = resetCards;
window.switchCardsDirection = switchCardsDirection;
window.showCardsContainer = showCardsContainer;
