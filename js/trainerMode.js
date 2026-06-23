// ====================================================================
// trainerMode.js — Тренажёр (шаблоны из файла урока)
// ====================================================================

let trainerSentences = [];
let trainerIndex = 0;
let trainerCurrentSentence = null;
let trainerSelectedWords = [];
let trainerAvailableWords = [];
let trainerActiveWords = {};
let trainerHintIndex = 0;
let trainerHintWords = [];
let trainerDirection = 'ru_to_de';
let allVocabWords = [];

// ===== ЗАГРУЗКА ВСЕХ СЛОВ ИЗ ПРОЙДЕННЫХ УРОКОВ =====
async function loadAllVocabulary(level, currentLessonId) {
    try {
        const response = await fetch(`docs/course/${level}/index.json`);
        if (!response.ok) throw new Error('Курс не найден');
        const courseData = await response.json();
        
        let allWords = [];
        
        for (const lessonInfo of courseData.lessons) {
            if (lessonInfo.id > currentLessonId) break;
            
            try {
                const lessonResponse = await fetch(`docs/course/${level}/lessons/${lessonInfo.file}`);
                if (lessonResponse.ok) {
                    const lessonData = await lessonResponse.json();
                    if (lessonData.vocabulary) {
                        allWords = allWords.concat(lessonData.vocabulary);
                    }
                }
            } catch(e) {
                console.warn('Не удалось загрузить урок:', lessonInfo.id);
            }
        }
        
        return allWords;
    } catch(e) {
        console.error('Ошибка загрузки лексики:', e);
        return [];
    }
}

function renderTrainer(container, lesson) {
    const lessonId = lesson.id || 1;
    
    container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #999;">
            <div style="font-size: 48px; margin-bottom: 15px;">⏳</div>
            <div>Загрузка слов для тренажёра...</div>
        </div>
    `;
    
    // Берём шаблоны из самого урока
    const templates = lesson.trainer?.templates || [];
    
    if (templates.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #999;">
                <div style="font-size: 48px; margin-bottom: 15px;">📝</div>
                <div>Для этого урока нет шаблонов для тренажёра.</div>
            </div>
        `;
        return;
    }
    
    // Загружаем слова из всех пройденных уроков
    loadAllVocabulary(currentLevel, lessonId).then(vocab => {
        allVocabWords = vocab;
        
        if (allVocabWords.length < 5) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #999;">
                    <div style="font-size: 48px; margin-bottom: 15px;">📝</div>
                    <div>Недостаточно слов для тренажёра.</div>
                    <div style="font-size: 14px; margin-top: 10px;">Пройдите больше уроков, чтобы увеличить количество слов.</div>
                </div>
            `;
            return;
        }
        
        // Создаём карту слов
        const wordMap = {};
        allVocabWords.forEach(w => {
            const key = w.de.toLowerCase().replace(/[.,!?;:]/g, '');
            wordMap[key] = w;
        });
        
        // Фильтруем шаблоны
        const availableTemplates = templates.filter(template => {
            const words = template.de.toLowerCase().replace(/[.,!?;:]/g, '').split(/\s+/);
            return words.every(w => {
                const cleanW = w.replace(/[.,!?;:]/g, '');
                return wordMap[cleanW] !== undefined;
            });
        });
        
        if (availableTemplates.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #999;">
                    <div style="font-size: 48px; margin-bottom: 15px;">📝</div>
                    <div>Недостаточно подходящих слов для осмысленных предложений.</div>
                    <div style="font-size: 14px; margin-top: 10px;">Попробуйте другой урок.</div>
                </div>
            `;
            return;
        }
        
        // Перемешиваем и берём до 20 предложений
        const shuffled = [...availableTemplates];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        
        const maxSentences = Math.min(shuffled.length, 20);
        trainerSentences = shuffled.slice(0, maxSentences);
        
        trainerIndex = 0;
        trainerDirection = 'ru_to_de';
        showTrainerSentence(container);
    }).catch(e => {
        console.error('Ошибка загрузки слов:', e);
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #999;">
                <div style="font-size: 48px; margin-bottom: 15px;">❌</div>
                <div>Ошибка загрузки слов для тренажёра.</div>
                <div style="font-size: 14px; margin-top: 10px;">${e.message}</div>
            </div>
        `;
    });
}

// ===== showTrainerSentence и updateTrainerDisplay остаются без изменений =====
