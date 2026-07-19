// ====================================================================
// quizMode.js — Тест (выбор перевода из 6 вариантов) + Карточки (все слова уровня)
// ====================================================================

// ====================================================================
// СТАРАЯ ЛОГИКА ДЛЯ ТЕСТА В УРОКАХ (НЕ ТРОГАЕМ)
// ====================================================================

let quizWords = [];
let quizIndex = 0;
let quizCurrentWord = null;
let quizDirection = 'de_to_ru';
let quizStudiedWords = {};
let currentLessonId = null;
let currentLessonData = null;
let allQuizWords = [];

// ===== ДЛЯ РЕЖИМА "ВСЕ СЛОВА УРОВНЯ" (КАРТОЧКИ) =====
let isAllWordsMode = false;
let levelAllWords = [];           // Все слова уровня из файла docs/{level}.json
let levelStudiedWords = {};       // Изученные слова для "Всех слов уровня"
let levelCardWords = [];          // Слова для показа (не изученные)
let levelCardIndex = 0;           // Текущий индекс
let levelCardFlipped = false;     // Перевёрнута ли карточка
let levelDirection = 'de_to_ru';
let currentLevelForCards = 'A1';

// ===== КЛЮЧИ ДЛЯ ХРАНЕНИЯ =====
function getLessonContainerKey(level, lessonId) {
    return 'dm_lesson_studied_' + level + '_' + lessonId;
}

function getLevelContainerKey(level) {
    return 'dm_level_studied_' + level;
}

// ===== ЗАГРУЗКА ПРОГРЕССА ДЛЯ УРОКА =====
function loadLessonStudiedWords(level, lessonId) {
    const key = getLessonContainerKey(level, lessonId);
    try {
        const saved = localStorage.getItem(key);
        if (saved) {
            quizStudiedWords = JSON.parse(saved);
        } else {
            quizStudiedWords = {};
        }
    } catch(e) {
        quizStudiedWords = {};
    }
}

// ===== СОХРАНЕНИЕ ПРОГРЕССА ДЛЯ УРОКА =====
function saveLessonStudiedWords(level, lessonId) {
    const key = getLessonContainerKey(level, lessonId);
    try {
        localStorage.setItem(key, JSON.stringify(quizStudiedWords));
    } catch(e) {
        console.warn('Ошибка сохранения контейнера урока:', e);
    }
}

// ===== ЗАГРУЗКА ПРОГРЕССА ДЛЯ УРОВНЯ (НОВЫЙ КОНТЕЙНЕР) =====
function loadLevelStudiedWords(level) {
    const key = getLevelContainerKey(level);
    try {
        const saved = localStorage.getItem(key);
        if (saved) {
            levelStudiedWords = JSON.parse(saved);
        } else {
            levelStudiedWords = {};
        }
    } catch(e) {
        levelStudiedWords = {};
    }
}

// ===== СОХРАНЕНИЕ ПРОГРЕССА ДЛЯ УРОВНЯ (НОВЫЙ КОНТЕЙНЕР) =====
function saveLevelStudiedWords(level) {
    const key = getLevelContainerKey(level);
    try {
        localStorage.setItem(key, JSON.stringify(levelStudiedWords));
    } catch(e) {
        console.warn('Ошибка сохранения контейнера уровня:', e);
    }
}

// ===== ЗАГРУЗКА ВСЕХ СЛОВ УРОВНЯ ИЗ ФАЙЛА docs/{level}.json =====
async function loadLevelWordsFromFile(level) {
    try {
        const response = await fetch(`docs/${level}.json`);
        if (!response.ok) {
            throw new Error(`Файл docs/${level}.json не найден`);
        }
        const words = await response.json();
        return words;
    } catch(e) {
        console.error('Ошибка загрузки слов уровня:', e);
        return [];
    }
}

// ================================================================
// НОВАЯ ЛОГИКА ДЛЯ "ВСЕХ СЛОВ УРОВНЯ" (КАРТОЧКИ)
// ================================================================

// ===== ВНЕШНИЙ ВЫЗОВ ДЛЯ РЕЖИМА "ВСЕ СЛОВА" =====
window.loadAllWordsMode = async function(level) {
    console.log('🔄 loadAllWordsMode (КАРТОЧКИ) вызван для уровня:', level);
    isAllWordsMode = true;
    currentLevelForCards = level;
    window.currentLevel = level;
    
    levelAllWords = await loadLevelWordsFromFile(level);
    console.log('📚 Загружено слов из файла уровня:', levelAllWords.length);
    
    if (levelAllWords.length === 0) {
        showLevelCardsEmpty();
        return;
    }
    
    loadLevelStudiedWords(level);
    updateLevelCardWords();
    
    if (levelCardWords.length === 0 && levelAllWords.length > 0) {
        levelCardWords = [...levelAllWords];
    }
    
    levelCardIndex = 0;
    levelCardFlipped = false;
    levelDirection = 'de_to_ru';
    
    showLevelCardsInterface();
};

// ===== ОБНОВЛЕНИЕ СПИСКА СЛОВ ДЛЯ ПОКАЗА =====
function updateLevelCardWords() {
    levelCardWords = levelAllWords.filter(word => !levelStudiedWords[word.de]);
    if (levelCardWords.length === 0 && levelAllWords.length > 0) {
        levelCardWords = [...levelAllWords];
    }
    if (levelCardIndex >= levelCardWords.length && levelCardWords.length > 0) {
        levelCardIndex = 0;
    }
}

// ===== ПОКАЗАТЬ, ЧТО СЛОВ НЕТ =====
function showLevelCardsEmpty() {
    const content = document.getElementById('content');
    if (!content) return;
    
    content.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #999;">
            <div style="font-size: 48px; margin-bottom: 15px;">📭</div>
            <div>Нет слов для уровня ${currentLevelForCards}</div>
            <div style="font-size: 14px; margin-top: 10px;">Файл docs/${currentLevelForCards}.json не найден или пуст.</div>
            <button class="back-btn" onclick="window.renderLevel()" style="margin-top: 20px;">← НАЗАД</button>
        </div>
    `;
    document.getElementById('modeIndicator').textContent = `📚 Все слова уровня ${currentLevelForCards}`;
    updateCounter();
}

// ===== ПОСТРОЕНИЕ ИНТЕРФЕЙСА КАРТОЧЕК =====
function showLevelCardsInterface() {
    const content = document.getElementById('content');
    if (!content) {
        console.error('❌ content не найден!');
        return;
    }
    console.log('✅ showLevelCardsInterface: показываем карточки для всех слов уровня');
    buildLevelCardsHTML(content);
}

// ===== ПОСТРОЕНИЕ HTML ДЛЯ КАРТОЧЕК =====
function buildLevelCardsHTML(container) {
    if (!container) {
        console.error('❌ buildLevelCardsHTML: container не передан');
        return;
    }
    
    const hasWords = levelCardWords.length > 0;

    let html = `
        <div style="text-align: center; display: flex; flex-direction: column; height: 100%;">
            ${!hasWords ? `
                <div style="padding: 40px; color: #999;">
                    <div style="font-size: 48px; margin-bottom: 15px;">📭</div>
                    <div>Нет слов для этого уровня</div>
                    <button class="back-btn" onclick="window.renderLevel()" style="margin-top: 20px;">← НАЗАД</button>
                </div>
            ` : `
                <!-- Верхняя панель -->
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 10px; flex-shrink: 0;">
                    <button class="back-btn" onclick="window.renderLevel()" style="padding: 8px 16px; background: #3B6FE0; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 13px;">
                        ← НАЗАД
                    </button>
                    <div id="levelCardsHeaderControls" style="display: flex; align-items: center; gap: 10px;">
                        <button id="levelCardsDirBtn" class="dir-btn" style="background: #3B6FE0; color: white; padding: 8px 16px; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 13px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                            ${levelDirection === 'de_to_ru' ? 'De → Ru' : 'Ru → De'}
                        </button>
                        <span id="levelCardsCounter" style="font-size: 14px; color: #888; font-weight: bold; min-width: 60px;">0 / 0</span>
                    </div>
                </div>
                
                <!-- Заголовок -->
                <h2 style="margin: 5px 0 15px 0; flex-shrink: 0;">📚 Все слова уровня ${currentLevelForCards}</h2>
                
                <!-- Контейнер для карточек (относительное позиционирование для наложения) -->
                <div id="levelCardsCardWrapper" style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 200px; position: relative; overflow: hidden; touch-action: none;">
                    
                    <!-- Следующая карточка (для анимации при свайпе) -->
                    <div id="levelCardsCardNext" 
                         style="
                            position: absolute;
                            top: 0;
                            left: 0;
                            right: 0;
                            bottom: 0;
                            background: #FFFFFF; 
                            border-radius: 20px; 
                            box-shadow: 0 8px 24px rgba(0,0,0,0.12); 
                            max-width: 500px; 
                            width: 100%;
                            margin: 0 auto;
                            min-height: 200px;
                            display: flex; 
                            align-items: center; 
                            justify-content: center; 
                            text-align: center; 
                            padding: 30px 20px;
                            z-index: 1;
                            opacity: 0;
                            transform: translateX(0%) scale(0.95);
                            transition: none;
                            touch-action: none;
                            user-select: none;
                            -webkit-user-select: none;
                            pointer-events: none;
                         ">
                        <div id="levelCardsCardNextText" style="font-size: 32px; font-weight: bold; color: #1A1A1A; word-break: break-word;"></div>
                    </div>
                    
                    <!-- Текущая карточка -->
                    <div id="levelCardsCard" 
                         style="
                            position: relative;
                            background: #FFFFFF; 
                            border-radius: 20px; 
                            box-shadow: 0 8px 24px rgba(0,0,0,0.12); 
                            max-width: 500px; 
                            width: 100%;
                            min-height: 200px;
                            display: flex; 
                            align-items: center; 
                            justify-content: center; 
                            text-align: center; 
                            padding: 30px 20px;
                            cursor: pointer;
                            transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.3s ease;
                            touch-action: none;
                            user-select: none;
                            -webkit-user-select: none;
                            z-index: 2;
                            will-change: transform, opacity;
                         "
                         onclick="window._flipLevelCard()">
                        <div id="levelCardsCardText" style="font-size: 32px; font-weight: bold; color: #1A1A1A; word-break: break-word;">
                            Загрузка...
                        </div>
                    </div>
                </div>
                
                <!-- Подсказка под карточкой -->
                <div id="levelCardsHint" style="font-size: 14px; color: #999; margin: 8px 0 12px 0; flex-shrink: 0;">
                    👆 Нажмите на карточку, чтобы увидеть перевод
                </div>
                
                <!-- Ряд 1: ИЗУЧЕНО, КОНТЕЙНЕР, ОЗВУЧИТЬ, ПЕРЕМЕШАТЬ -->
                <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin: 4px 0; flex-shrink: 0;">
                    <button class="ctrl-btn" id="levelCardsStudyBtn" style="padding: 6px 14px; background: #4CAF50; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 12px;">✅ ИЗУЧЕНО</button>
                    <button class="ctrl-btn" id="levelCardsContainerBtn" style="padding: 6px 14px; background: #FF9800; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 12px;">📦 КОНТЕЙНЕР</button>
                    <button class="ctrl-btn" id="levelCardsSpeakBtn" style="padding: 6px 14px; background: #E8F0FE; border: 2px solid #D0D0D0; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 12px;">🔊 ОЗВУЧИТЬ</button>
                    <button class="ctrl-btn" id="levelCardsShuffleBtn" style="padding: 6px 14px; background: #9C27B0; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 12px;">🔄 ПЕРЕМЕШАТЬ</button>
                </div>
                
                <!-- Ряд 2: ◀ НАЗАД, ВПЕРЕД ▶, ⏮ В НАЧАЛО -->
                <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin: 4px 0 10px 0; flex-shrink: 0;">
                    <button class="ctrl-btn" id="levelCardsPrevBtn" style="padding: 6px 14px; background: #E8F0FE; border: 2px solid #D0D0D0; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 12px;">◀ НАЗАД</button>
                    <button class="ctrl-btn" id="levelCardsNextBtn" style="padding: 6px 14px; background: #E8F0FE; border: 2px solid #D0D0D0; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 12px;">ВПЕРЕД ▶</button>
                    <button class="ctrl-btn" id="levelCardsResetStartBtn" style="padding: 6px 14px; background: #E8F0FE; border: 2px solid #D0D0D0; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 12px;">⏮ В НАЧАЛО</button>
                </div>
            `}
        </div>
    `;

    container.innerHTML = html;
    console.log('✅ buildLevelCardsHTML: контент вставлен');

    if (!hasWords) return;

    // ===== ПРИВЯЗКА ОБРАБОТЧИКОВ =====
    
    const dirBtn = document.getElementById('levelCardsDirBtn');
    if (dirBtn) {
        dirBtn.addEventListener('click', function() {
            levelDirection = levelDirection === 'de_to_ru' ? 'ru_to_de' : 'de_to_ru';
            this.textContent = levelDirection === 'de_to_ru' ? 'De → Ru' : 'Ru → De';
            showLevelCard();
        });
    }

    document.getElementById('levelCardsStudyBtn').addEventListener('click', levelStudyWord);
    document.getElementById('levelCardsContainerBtn').addEventListener('click', function() {
        const studied = getLevelStudiedWordsList();
        if (!studied || studied.length === 0) {
            alert('📦 Контейнер пуст\n\nВыучите слова, чтобы они появились здесь.');
            return;
        }
        showLevelContainer();
    });
    document.getElementById('levelCardsSpeakBtn').addEventListener('click', levelSpeakWord);
    document.getElementById('levelCardsShuffleBtn').addEventListener('click', levelShuffleWords);
    document.getElementById('levelCardsPrevBtn').addEventListener('click', levelPrevCard);
    document.getElementById('levelCardsNextBtn').addEventListener('click', levelNextCard);
    document.getElementById('levelCardsResetStartBtn').addEventListener('click', levelResetStart);

    // ===== СВАЙП (только мобильные устройства) =====
    setupLevelCardsSwipe();

    showLevelCard();
}

// ===== НАСТРОЙКА СВАЙПА (ИСПРАВЛЕННАЯ ВЕРСИЯ) =====
function setupLevelCardsSwipe() {
    const card = document.getElementById('levelCardsCard');
    const nextCard = document.getElementById('levelCardsCardNext');
    const nextText = document.getElementById('levelCardsCardNextText');
    
    if (!card) return;
    
    const isMobile = window.innerWidth <= 768;
    if (!isMobile) {
        console.log('🖥️ Десктопный режим — свайп отключён');
        return;
    }
    
    console.log('📱 Мобильный режим — свайп включён');
    
    let startX = 0;
    let startY = 0;
    let isDragging = false;
    let isSwiping = false;
    let currentTranslate = 0;
    let isAnimating = false;
    
    // Получаем следующее слово для предпросмотра
    function updateNextCard(direction) {
        if (levelCardWords.length === 0) return;
        let nextIndex;
        if (direction === 'next') {
            nextIndex = (levelCardIndex + 1) % levelCardWords.length;
        } else {
            nextIndex = (levelCardIndex - 1 + levelCardWords.length) % levelCardWords.length;
        }
        const nextWord = levelCardWords[nextIndex];
        if (nextWord && nextText) {
            const isDeToRu = levelDirection === 'de_to_ru';
            nextText.textContent = isDeToRu ? nextWord.de : nextWord.ru;
        }
    }
    
    // touchstart
    card.addEventListener('touchstart', function(e) {
        if (isAnimating) return;
        const touch = e.touches[0];
        startX = touch.clientX;
        startY = touch.clientY;
        isDragging = true;
        isSwiping = false;
        currentTranslate = 0;
        
        // Показываем следующую карточку с небольшим отступом
        nextCard.style.display = 'flex';
        nextCard.style.opacity = '0.3';
        nextCard.style.transform = 'scale(0.92)';
        nextCard.style.transition = 'none';
        
        // Определяем направление и показываем соответствующую карточку
        // Пока не знаем направление, показываем следующую
        updateNextCard('next');
    }, { passive: true });
    
    // touchmove
    card.addEventListener('touchmove', function(e) {
        if (!isDragging || isAnimating) return;
        
        const touch = e.touches[0];
        const deltaX = touch.clientX - startX;
        const deltaY = touch.clientY - startY;
        
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 5) {
            isSwiping = true;
            e.preventDefault();
            
            // Ограничиваем перемещение
            const maxDrag = 150;
            let progress = deltaX / maxDrag;
            progress = Math.max(-1, Math.min(1, progress));
            currentTranslate = progress * maxDrag;
            
            // Двигаем текущую карточку
            const translateX = progress * 100;
            const opacity = 1 - Math.abs(progress) * 0.3;
            const scale = 1 - Math.abs(progress) * 0.05;
            
            card.style.transition = 'none';
            card.style.transform = `translateX(${translateX}%) scale(${scale})`;
            card.style.opacity = opacity;
            
            // Показываем следующую карточку с отступом
            const nextTranslate = -30 + (Math.abs(progress) * 30);
            const nextOpacity = 0.3 + Math.abs(progress) * 0.7;
            const nextScale = 0.92 + Math.abs(progress) * 0.08;
            
            // Определяем направление
            if (progress > 0) {
                // Свайп вправо → предыдущая карточка
                updateNextCard('prev');
                nextCard.style.transform = `translateX(${-50 + (Math.abs(progress) * 50)}%) scale(${nextScale})`;
            } else {
                // Свайп влево → следующая карточка
                updateNextCard('next');
                nextCard.style.transform = `translateX(${50 - (Math.abs(progress) * 50)}%) scale(${nextScale})`;
            }
            nextCard.style.opacity = nextOpacity;
            nextCard.style.transition = 'none';
        }
    }, { passive: false });
    
    // touchend
    card.addEventListener('touchend', function(e) {
        if (!isDragging || isAnimating) {
            isDragging = false;
            return;
        }
        isDragging = false;
        
        const touch = e.changedTouches[0];
        const deltaX = touch.clientX - startX;
        
        if (isSwiping && Math.abs(deltaX) > 30) {
            isAnimating = true;
            
            // Свайп влево → следующее
            if (deltaX < 0) {
                card.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.3s ease';
                card.style.transform = 'translateX(-110%) scale(0.9)';
                card.style.opacity = '0';
                
                // Анимируем появление следующей карточки
                nextCard.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.3s ease';
                nextCard.style.transform = 'translateX(0%) scale(1)';
                nextCard.style.opacity = '1';
                
                setTimeout(() => {
                    levelCardIndex = (levelCardIndex + 1) % levelCardWords.length;
                    levelCardFlipped = false;
                    showLevelCard();
                    
                    // Сбрасываем анимационную карточку
                    nextCard.style.transition = 'none';
                    nextCard.style.transform = 'scale(0.92)';
                    nextCard.style.opacity = '0';
                    nextCard.style.display = 'none';
                    
                    card.style.transition = 'none';
                    card.style.transform = 'translateX(0%) scale(1)';
                    card.style.opacity = '1';
                    
                    isAnimating = false;
                    setTimeout(() => {
                        card.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.3s ease';
                    }, 50);
                }, 320);
            }
            // Свайп вправо → предыдущее
            else if (deltaX > 30) {
                card.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.3s ease';
                card.style.transform = 'translateX(110%) scale(0.9)';
                card.style.opacity = '0';
                
                nextCard.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.3s ease';
                nextCard.style.transform = 'translateX(0%) scale(1)';
                nextCard.style.opacity = '1';
                
                setTimeout(() => {
                    levelCardIndex = (levelCardIndex - 1 + levelCardWords.length) % levelCardWords.length;
                    levelCardFlipped = false;
                    showLevelCard();
                    
                    nextCard.style.transition = 'none';
                    nextCard.style.transform = 'scale(0.92)';
                    nextCard.style.opacity = '0';
                    nextCard.style.display = 'none';
                    
                    card.style.transition = 'none';
                    card.style.transform = 'translateX(0%) scale(1)';
                    card.style.opacity = '1';
                    
                    isAnimating = false;
                    setTimeout(() => {
                        card.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.3s ease';
                    }, 50);
                }, 320);
            } else {
                // Свайп слишком короткий — возвращаем карточку
                card.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.3s ease';
                card.style.transform = 'translateX(0%) scale(1)';
                card.style.opacity = '1';
                
                nextCard.style.transition = 'opacity 0.2s ease';
                nextCard.style.opacity = '0';
                setTimeout(() => {
                    nextCard.style.display = 'none';
                    nextCard.style.transform = 'scale(0.92)';
                }, 250);
                
                isAnimating = false;
            }
        } else {
            // Не свайп — возвращаем карточку
            card.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.3s ease';
            card.style.transform = 'translateX(0%) scale(1)';
            card.style.opacity = '1';
            
            nextCard.style.transition = 'opacity 0.2s ease';
            nextCard.style.opacity = '0';
            setTimeout(() => {
                nextCard.style.display = 'none';
                nextCard.style.transform = 'scale(0.92)';
            }, 250);
            
            isAnimating = false;
        }
        
        isSwiping = false;
    }, { passive: true });
    
    card.addEventListener('touchcancel', function() {
        isDragging = false;
        isSwiping = false;
        isAnimating = false;
        card.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.3s ease';
        card.style.transform = 'translateX(0%) scale(1)';
        card.style.opacity = '1';
        nextCard.style.transition = 'opacity 0.2s ease';
        nextCard.style.opacity = '0';
        setTimeout(() => {
            nextCard.style.display = 'none';
            nextCard.style.transform = 'scale(0.92)';
        }, 250);
    }, { passive: true });
}

// ===== ПОЛУЧИТЬ СЛОВО ПО ИНДЕКСУ (С ЗАЦИКЛИВАНИЕМ) =====
function getLevelCardWord(index) {
    if (levelCardWords.length === 0) return null;
    const safeIndex = ((index % levelCardWords.length) + levelCardWords.length) % levelCardWords.length;
    return levelCardWords[safeIndex];
}

// ===== ПОЛУЧИТЬ ТЕКСТ ДЛЯ КАРТОЧКИ =====
function getLevelCardDisplay(word, flipped) {
    if (!word) return '';
    const isDeToRu = levelDirection === 'de_to_ru';
    
    if (!flipped) {
        return isDeToRu ? word.de : word.ru;
    } else {
        return isDeToRu ? word.ru : word.de;
    }
}

// ===== ПОКАЗ КАРТОЧКИ =====
function showLevelCard() {
    const cardText = document.getElementById('levelCardsCardText');
    const counter = document.getElementById('levelCardsCounter');
    const hint = document.getElementById('levelCardsHint');
    const card = document.getElementById('levelCardsCard');
    
    if (!cardText || !card) return;

    if (levelCardWords.length === 0) {
        cardText.textContent = '📭 Нет слов';
        if (counter) counter.textContent = '0 / 0';
        return;
    }

    const currentWord = getLevelCardWord(levelCardIndex);
    if (!currentWord) {
        cardText.textContent = 'Ошибка загрузки';
        return;
    }

    const displayText = getLevelCardDisplay(currentWord, levelCardFlipped);
    cardText.textContent = displayText;
    
    if (hint) {
        if (levelCardFlipped) {
            hint.textContent = '👆 Нажмите на карточку, чтобы скрыть перевод';
            hint.style.color = '#FF9800';
        } else {
            hint.textContent = '👆 Нажмите на карточку, чтобы увидеть перевод';
            hint.style.color = '#999';
        }
    }
    
    if (counter) {
        const currentPos = (levelCardIndex % levelCardWords.length) + 1;
        counter.textContent = `${currentPos} / ${levelCardWords.length}`;
    }
}

// ===== ПЕРЕВОРОТ КАРТОЧКИ =====
window._flipLevelCard = function() {
    if (levelCardWords.length === 0) return;
    levelCardFlipped = !levelCardFlipped;
    showLevelCard();
};

// ===== КНОПКА: ИЗУЧЕНО =====
function levelStudyWord() {
    if (levelCardWords.length === 0) return;
    
    const currentWord = getLevelCardWord(levelCardIndex);
    if (!currentWord) return;
    
    levelStudiedWords[currentWord.de] = true;
    saveLevelStudiedWords(currentLevelForCards);
    
    updateLevelCardWords();
    
    if (levelCardWords.length === 0 && levelAllWords.length > 0) {
        levelCardWords = [...levelAllWords];
    }
    
    if (levelCardWords.length > 0) {
        levelCardIndex = (levelCardIndex + 1) % levelCardWords.length;
    } else {
        levelCardIndex = 0;
    }
    levelCardFlipped = false;
    showLevelCard();
}

// ===== КНОПКА: ОЗВУЧИТЬ =====
function levelSpeakWord() {
    if (levelCardWords.length === 0) return;
    const currentWord = getLevelCardWord(levelCardIndex);
    if (currentWord && currentWord.de) {
        if (typeof window.speak === 'function') {
            window.speak(currentWord.de);
        }
    }
}

// ===== КНОПКА: ПЕРЕМЕШАТЬ =====
function levelShuffleWords() {
    if (levelCardWords.length === 0) return;
    
    for (let i = levelCardWords.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [levelCardWords[i], levelCardWords[j]] = [levelCardWords[j], levelCardWords[i]];
    }
    
    levelCardIndex = 0;
    levelCardFlipped = false;
    showLevelCard();
}

// ===== КНОПКА: НАЗАД =====
function levelPrevCard() {
    if (levelCardWords.length === 0) return;
    levelCardIndex = (levelCardIndex - 1 + levelCardWords.length) % levelCardWords.length;
    levelCardFlipped = false;
    showLevelCard();
}

// ===== КНОПКА: ВПЕРЕД =====
function levelNextCard() {
    if (levelCardWords.length === 0) return;
    levelCardIndex = (levelCardIndex + 1) % levelCardWords.length;
    levelCardFlipped = false;
    showLevelCard();
}

// ===== КНОПКА: В НАЧАЛО =====
function levelResetStart() {
    if (levelCardWords.length === 0) return;
    levelCardIndex = 0;
    levelCardFlipped = false;
    showLevelCard();
}

// ===== ПОЛУЧЕНИЕ СПИСКА ИЗУЧЕННЫХ СЛОВ ДЛЯ УРОВНЯ =====
function getLevelStudiedWordsList() {
    if (!levelAllWords) return [];
    return levelAllWords.filter(word => levelStudiedWords[word.de]);
}

// ===== КОНТЕЙНЕР ДЛЯ "ВСЕХ СЛОВ УРОВНЯ" =====
function showLevelContainer() {
    const oldModal = document.getElementById('levelContainerModal');
    if (oldModal) oldModal.remove();

    const modal = document.createElement('div');
    modal.id = 'levelContainerModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.7);
        display: flex !important;
        justify-content: center;
        align-items: center;
        z-index: 9999999 !important;
        overflow: auto;
    `;

    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: white;
        border-radius: 20px;
        max-width: 500px;
        width: 90%;
        max-height: 80vh;
        display: flex;
        flex-direction: column;
        margin: 20px;
        padding: 0;
        overflow: hidden;
        box-shadow: 0 20px 60px rgba(0,0,0,0.5);
    `;

    const currentStudied = getLevelStudiedWordsList();
    const title = `📦 КОНТЕЙНЕР УРОВНЯ ${currentLevelForCards} (${currentStudied.length} слов)`;

    const header = document.createElement('div');
    header.style.cssText = 'padding: 15px 20px; border-bottom: 1px solid #ddd; text-align: center; flex-shrink: 0;';
    header.innerHTML = `<h3 style="margin: 0;">${title}</h3>`;
    modalContent.appendChild(header);

    const itemsContainer = document.createElement('div');
    itemsContainer.style.cssText = 'overflow-y: auto; flex: 1; padding: 5px 0;';
    
    if (currentStudied.length === 0) {
        itemsContainer.innerHTML = `<div style="text-align:center; padding:40px; color:#999;">📭 Контейнер пуст</div>`;
    } else {
        currentStudied.forEach((word) => {
            const item = document.createElement('div');
            item.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 10px 20px; border-bottom: 1px solid #f0f0f0;';
            item.innerHTML = `
                <span><strong>${word.de}</strong> — ${word.ru}</span>
                <button class="unstudy-level-btn" data-word="${word.de}" style="padding: 4px 14px; background: #F44336; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 12px; font-weight: bold;">✕ ВЕРНУТЬ</button>
            `;
            
            const btn = item.querySelector('.unstudy-level-btn');
            btn.addEventListener('click', function() {
                const wordDe = this.getAttribute('data-word');
                delete levelStudiedWords[wordDe];
                saveLevelStudiedWords(currentLevelForCards);
                
                updateLevelCardWords();
                if (levelCardWords.length === 0 && levelAllWords.length > 0) {
                    levelCardWords = [...levelAllWords];
                }
                if (levelCardWords.length > 0 && levelCardIndex >= levelCardWords.length) {
                    levelCardIndex = 0;
                }
                
                modal.remove();
                showLevelContainer();
                showLevelCard();
            });
            
            itemsContainer.appendChild(item);
        });
    }
    modalContent.appendChild(itemsContainer);

    const footer = document.createElement('div');
    footer.style.cssText = 'padding: 15px 20px; border-top: 1px solid #ddd; display: flex; gap: 10px; flex-shrink: 0;';
    footer.innerHTML = `
        <button id="levelReturnAllBtn" style="flex: 1; padding: 10px; background: #FF9800; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">🔄 ВЕРНУТЬ ВСЁ</button>
        <button id="levelCloseContainerBtn" style="flex: 1; padding: 10px; background: #ddd; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">ЗАКРЫТЬ</button>
    `;
    modalContent.appendChild(footer);

    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    document.getElementById('levelReturnAllBtn').addEventListener('click', function() {
        if (!confirm('Вернуть все слова из контейнера?')) return;
        levelAllWords.forEach(word => { delete levelStudiedWords[word.de]; });
        saveLevelStudiedWords(currentLevelForCards);
        updateLevelCardWords();
        if (levelCardWords.length === 0 && levelAllWords.length > 0) {
            levelCardWords = [...levelAllWords];
        }
        levelCardIndex = 0;
        levelCardFlipped = false;
        modal.remove();
        showLevelCard();
    });

    document.getElementById('levelCloseContainerBtn').addEventListener('click', function() {
        modal.remove();
    });

    modal.addEventListener('click', function(e) {
        if (e.target === modal) modal.remove();
    });
}

// ====================================================================
// СТАРАЯ ЛОГИКА ДЛЯ ТЕСТА В УРОКАХ (НЕ ТРОГАЕМ)
// ====================================================================

function renderQuiz(container, lesson) {
    isAllWordsMode = false;
    currentLessonData = lesson;
    currentLessonId = lesson.id || 1;
    window.currentLevel = lesson.level || 'A1';
    
    loadLessonStudiedWords(window.currentLevel, currentLessonId);
    
    let quizData = lesson.quiz || [];
    
    if (!quizData || quizData.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 40px; color: #999;">📭 Нет слов для теста</div>';
        return;
    }

    allQuizWords = [...quizData];
    quizWords = quizData.filter(word => !quizStudiedWords[word.de]);
    
    if (quizWords.length === 0 && allQuizWords.length > 0) {
        quizWords = [...allQuizWords];
    }
    
    quizIndex = 0;
    quizDirection = 'de_to_ru';

    showQuizInterface(container);
}

function showQuizInterface(container) {
    if (!container) {
        console.error('❌ container не передан в showQuizInterface');
        return;
    }
    buildQuizHTML(container);
}

function buildQuizHTML(container) {
    if (!container) {
        console.error('❌ buildQuizHTML: container не передан');
        return;
    }
    
    const hasWords = allQuizWords.length > 0;

    const headerControls = document.getElementById('modeHeaderControls');
    if (headerControls) {
        headerControls.innerHTML = `
            <button id="quizDirBtn" class="dir-btn" style="background: #3B6FE0; color: white; padding: 10px 20px; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 13px; box-shadow: 0 2px 4px rgba(0,0,0,0.2); transition: all 0.08s ease;">
                ${quizDirection === 'de_to_ru' ? 'De → Ru' : 'Ru → De'}
            </button>
        `;
    }

    let html = `
        <div style="text-align: center;">
            ${!hasWords ? `
                <div style="padding: 40px; color: #999;">
                    <div style="font-size: 48px; margin-bottom: 15px;">📭</div>
                    <div>Нет слов для этого режима</div>
                </div>
            ` : `
                <div style="background: #FFFFFF; border-radius: 20px; box-shadow: 0 8px 24px rgba(0,0,0,0.1); max-width: 550px; margin: 15px auto; min-height: 150px; display: flex; align-items: center; justify-content: center; text-align: center; padding: 20px;">
                    <div style="font-size: 32px; font-weight: bold; color: #1A1A1A;" id="quizQuestion">Загрузка...</div>
                </div>
                <div class="quiz-grid" id="quizGrid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; max-width: 700px; margin: 20px auto;"></div>
                <div style="font-size: 14px; color: #888; margin-top: 10px;" id="quizProgress">0 / 0</div>
                
                <div class="btn-group" style="display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin: 10px 0 5px 0;">
                    <button class="ctrl-btn" id="quizStudyBtn" style="padding: 6px 14px; background: #4CAF50; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 12px;">✅ ИЗУЧЕНО</button>
                    <button class="ctrl-btn" id="quizContainerBtn" style="padding: 6px 14px; background: #FF9800; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 12px;">📦 КОНТЕЙНЕР</button>
                    <button class="ctrl-btn" id="quizSpeakBtn" style="padding: 6px 14px; background: #E8F0FE; border: 2px solid #D0D0D0; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 12px;">🔊 ОЗВУЧИТЬ</button>
                </div>
                
                <div class="btn-group" style="display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin: 5px 0 10px 0;">
                    <button class="ctrl-btn" id="quizPrevBtn" style="padding: 6px 14px; background: #E8F0FE; border: 2px solid #D0D0D0; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 12px;">◀ НАЗАД</button>
                    <button class="ctrl-btn" id="quizNextBtn" style="padding: 6px 14px; background: #E8F0FE; border: 2px solid #D0D0D0; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 12px;">ВПЕРЕД ▶</button>
                    <button class="ctrl-btn" id="quizResetStartBtn" style="padding: 6px 14px; background: #E8F0FE; border: 2px solid #D0D0D0; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 12px;">⏮ В НАЧАЛО</button>
                </div>
            `}
        </div>
    `;

    container.innerHTML = html;
    console.log('✅ buildQuizHTML: контент вставлен');

    if (!hasWords) return;
    
    const dirBtn = document.getElementById('quizDirBtn');
    if (dirBtn) {
        dirBtn.addEventListener('click', function() {
            quizDirection = quizDirection === 'de_to_ru' ? 'ru_to_de' : 'de_to_ru';
            this.textContent = quizDirection === 'de_to_ru' ? 'De → Ru' : 'Ru → De';
            showQuizQuestion();
        });
    }

    document.getElementById('quizStudyBtn').addEventListener('click', function() {
        if (quizCurrentWord) {
            quizStudiedWords[quizCurrentWord.de] = true;
            saveLessonStudiedWords(window.currentLevel, currentLessonId);
            
            quizWords = allQuizWords.filter(w => !quizStudiedWords[w.de]);
            
            if (quizWords.length === 0 && allQuizWords.length > 0) {
                quizWords = [...allQuizWords];
            }
            
            if (quizIndex >= quizWords.length && quizWords.length > 0) {
                quizIndex = 0;
            }
            
            showQuizQuestion();
        }
    });

    document.getElementById('quizContainerBtn').addEventListener('click', function() {
        const studied = getLessonStudiedWordsList();
        if (!studied || studied.length === 0) {
            alert('📦 Контейнер пуст\n\nВыучите слова, чтобы они появились здесь.');
            return;
        }
        showLessonContainer();
    });

    document.getElementById('quizSpeakBtn').addEventListener('click', function() {
        if (quizCurrentWord && quizCurrentWord.de) {
            if (typeof window.speak === 'function') {
                window.speak(quizCurrentWord.de);
            }
        }
    });

    document.getElementById('quizPrevBtn').addEventListener('click', function() {
        if (quizWords.length > 0 && quizIndex > 0) {
            quizIndex--;
            showQuizQuestion();
        }
    });

    document.getElementById('quizNextBtn').addEventListener('click', function() {
        if (quizWords.length > 0) {
            quizIndex = (quizIndex + 1) % quizWords.length;
            showQuizQuestion();
        }
    });

    document.getElementById('quizResetStartBtn').addEventListener('click', function() {
        if (quizWords.length > 0) {
            quizIndex = 0;
            showQuizQuestion();
        }
    });

    showQuizQuestion();
}

function getLessonStudiedWordsList() {
    if (!allQuizWords) return [];
    return allQuizWords.filter(word => quizStudiedWords[word.de]);
}

function showLessonContainer() {
    const oldModal = document.getElementById('containerModal');
    if (oldModal) oldModal.remove();

    const modal = document.createElement('div');
    modal.id = 'containerModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.7);
        display: flex !important;
        justify-content: center;
        align-items: center;
        z-index: 9999999 !important;
        overflow: auto;
    `;

    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: white;
        border-radius: 20px;
        max-width: 500px;
        width: 90%;
        max-height: 80vh;
        display: flex;
        flex-direction: column;
        margin: 20px;
        padding: 0;
        overflow: hidden;
        box-shadow: 0 20px 60px rgba(0,0,0,0.5);
    `;

    const currentStudied = getLessonStudiedWordsList();
    const title = `📦 КОНТЕЙНЕР УРОКА ${currentLessonId} (${currentStudied.length} слов)`;

    const header = document.createElement('div');
    header.style.cssText = 'padding: 15px 20px; border-bottom: 1px solid #ddd; text-align: center; flex-shrink: 0;';
    header.innerHTML = `<h3 style="margin: 0;">${title}</h3>`;
    modalContent.appendChild(header);

    const itemsContainer = document.createElement('div');
    itemsContainer.style.cssText = 'overflow-y: auto; flex: 1; padding: 5px 0;';
    
    if (currentStudied.length === 0) {
        itemsContainer.innerHTML = `<div style="text-align:center; padding:40px; color:#999;">📭 Контейнер пуст</div>`;
    } else {
        currentStudied.forEach((word) => {
            const item = document.createElement('div');
            item.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 10px 20px; border-bottom: 1px solid #f0f0f0;';
            item.innerHTML = `
                <span><strong>${word.de}</strong> — ${word.ru}</span>
                <button class="unstudy-btn" data-word="${word.de}" style="padding: 4px 14px; background: #F44336; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 12px; font-weight: bold;">✕ ВЕРНУТЬ</button>
            `;
            
            const btn = item.querySelector('.unstudy-btn');
            btn.addEventListener('click', function() {
                const wordDe = this.getAttribute('data-word');
                delete quizStudiedWords[wordDe];
                saveLessonStudiedWords(window.currentLevel, currentLessonId);
                
                quizWords = allQuizWords.filter(w => !quizStudiedWords[w.de]);
                if (quizWords.length === 0 && allQuizWords.length > 0) {
                    quizWords = [...allQuizWords];
                }
                if (quizWords.length > 0 && quizIndex >= quizWords.length) {
                    quizIndex = 0;
                }
                
                modal.remove();
                showLessonContainer();
                showQuizQuestion();
            });
            
            itemsContainer.appendChild(item);
        });
    }
    modalContent.appendChild(itemsContainer);

    const footer = document.createElement('div');
    footer.style.cssText = 'padding: 15px 20px; border-top: 1px solid #ddd; display: flex; gap: 10px; flex-shrink: 0;';
    footer.innerHTML = `
        <button id="returnAllBtn" style="flex: 1; padding: 10px; background: #FF9800; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">🔄 ВЕРНУТЬ ВСЁ</button>
        <button id="closeContainerBtn" style="flex: 1; padding: 10px; background: #ddd; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">ЗАКРЫТЬ</button>
    `;
    modalContent.appendChild(footer);

    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    document.getElementById('returnAllBtn').addEventListener('click', function() {
        if (!confirm('Вернуть все слова из контейнера?')) return;
        allQuizWords.forEach(word => { delete quizStudiedWords[word.de]; });
        saveLessonStudiedWords(window.currentLevel, currentLessonId);
        quizWords = [...allQuizWords];
        quizIndex = 0;
        modal.remove();
        showQuizQuestion();
    });

    document.getElementById('closeContainerBtn').addEventListener('click', function() {
        modal.remove();
    });

    modal.addEventListener('click', function(e) {
        if (e.target === modal) modal.remove();
    });
}

function showQuizQuestion() {
    const questionEl = document.getElementById('quizQuestion');
    const gridEl = document.getElementById('quizGrid');
    const progressEl = document.getElementById('quizProgress');
    
    if (!questionEl || !gridEl) return;

    if (quizWords.length === 0) {
        questionEl.textContent = '🎉 Все слова изучены!';
        gridEl.innerHTML = '';
        if (progressEl) progressEl.textContent = '0 / 0';
        return;
    }

    quizCurrentWord = quizWords[quizIndex];
    const isDeToRu = quizDirection === 'de_to_ru';
    const question = isDeToRu ? quizCurrentWord.de : quizCurrentWord.ru;
    const correctAnswer = isDeToRu ? quizCurrentWord.ru : quizCurrentWord.de;

    questionEl.textContent = question;
    if (progressEl) progressEl.textContent = `${quizIndex + 1} / ${quizWords.length}`;

    const allWords = [...allQuizWords];
    const otherWords = allWords.filter(w => w !== quizCurrentWord);
    
    const shuffled = [...otherWords];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    const options = [quizCurrentWord, ...shuffled.slice(0, 5)];
    for (let i = options.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [options[i], options[j]] = [options[j], options[i]];
    }

    gridEl.innerHTML = '';
    options.forEach((opt) => {
        const btn = document.createElement('button');
        btn.className = 'quiz-opt';
        btn.textContent = isDeToRu ? opt.ru : opt.de;
        btn.style.cssText = 'padding: 16px; background: #FFFFFF; border: 2px solid #D0D0D0; border-radius: 16px; cursor: pointer; font-size: 16px; transition: all 0.05s linear; text-align: center; box-shadow: 0 3px 4px rgba(0,0,0,0.1);';
        btn.addEventListener('click', function() {
            const isCorrect = isDeToRu ? (opt.ru === correctAnswer) : (opt.de === correctAnswer);
            if (isCorrect) {
                this.style.background = '#C8E6C9';
                this.style.borderColor = '#4CAF50';
                setTimeout(() => {
                    quizIndex = (quizIndex + 1) % quizWords.length;
                    showQuizQuestion();
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
        gridEl.appendChild(btn);
    });
}

// ===== ЭКСПОРТ =====
window.renderQuiz = renderQuiz;
window.loadAllWordsMode = loadAllWordsMode;
