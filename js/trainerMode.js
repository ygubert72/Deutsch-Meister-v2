// ====================================================================
// trainerMode.js — Тренажёр (только слова из текущего урока)
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

// ===== ШАБЛОНЫ ТОЛЬКО ДЛЯ УРОКА 1 (50 слов) =====
function getTemplatesForLesson1() {
    return [
        // ===== Приветствия и прощания =====
        { ru: "Привет!", de: "Hallo!", required: ["hallo"] },
        { ru: "Пока!", de: "Tschüss!", required: ["tschüss"] },
        { ru: "Доброе утро!", de: "Guten Morgen!", required: ["guten", "morgen"] },
        { ru: "Добрый день!", de: "Guten Tag!", required: ["guten", "tag"] },
        { ru: "Добрый вечер!", de: "Guten Abend!", required: ["guten", "abend"] },
        { ru: "Спокойной ночи!", de: "Gute Nacht!", required: ["gute", "nacht"] },
        { ru: "До свидания!", de: "Auf Wiedersehen!", required: ["auf", "wiedersehen"] },
        { ru: "До скорого!", de: "Bis bald!", required: ["bis", "bald"] },
        { ru: "До встречи!", de: "Bis später!", required: ["bis", "später"] },
        
        // ===== Вежливые слова =====
        { ru: "Пожалуйста!", de: "Bitte!", required: ["bitte"] },
        { ru: "Спасибо!", de: "Danke!", required: ["danke"] },
        { ru: "Большое спасибо!", de: "Vielen Dank!", required: ["vielen", "dank"] },
        { ru: "Извините!", de: "Entschuldigung!", required: ["entschuldigung"] },
        { ru: "Без проблем.", de: "Kein Problem.", required: ["kein", "problem"] },
        
        // ===== Утверждения =====
        { ru: "Да", de: "Ja", required: ["ja"] },
        { ru: "Нет", de: "Nein", required: ["nein"] },
        { ru: "Возможно", de: "Vielleicht", required: ["vielleicht"] },
        { ru: "Конечно", de: "Natürlich", required: ["natürlich"] },
        { ru: "Точно", de: "Genau", required: ["genau"] },
        
        // ===== Люди и семья =====
        { ru: "Мужчина", de: "Der Mann.", required: ["der", "mann"] },
        { ru: "Женщина", de: "Die Frau.", required: ["die", "frau"] },
        { ru: "Ребёнок", de: "Das Kind.", required: ["das", "kind"] },
        { ru: "Мальчик", de: "Der Junge.", required: ["der", "junge"] },
        { ru: "Девочка", de: "Das Mädchen.", required: ["das", "mädchen"] },
        { ru: "Человек", de: "Der Mensch.", required: ["der", "mensch"] },
        { ru: "Отец", de: "Der Vater.", required: ["der", "vater"] },
        { ru: "Мать", de: "Die Mutter.", required: ["die", "mutter"] },
        { ru: "Брат", de: "Der Bruder.", required: ["der", "bruder"] },
        { ru: "Сестра", de: "Die Schwester.", required: ["die", "schwester"] },
        { ru: "Сын", de: "Der Sohn.", required: ["der", "sohn"] },
        { ru: "Дочь", de: "Die Tochter.", required: ["die", "tochter"] },
        { ru: "Родители", de: "Die Eltern.", required: ["die", "eltern"] },
        { ru: "Семья", de: "Die Familie.", required: ["die", "familie"] },
        { ru: "Друг", de: "Der Freund.", required: ["der", "freund"] },
        { ru: "Подруга", de: "Die Freundin.", required: ["die", "freundin"] },
        
        // ===== Страны =====
        { ru: "Германия", de: "Deutschland.", required: ["deutschland"] },
        { ru: "Россия", de: "Russland.", required: ["russland"] },
        { ru: "США", de: "Die USA.", required: ["die", "usa"] },
        { ru: "Франция", de: "Frankreich.", required: ["frankreich"] },
        { ru: "Италия", de: "Italien.", required: ["italien"] },
        { ru: "Испания", de: "Spanien.", required: ["spanien"] },
        { ru: "Турция", de: "Die Türkei.", required: ["die", "türkei"] },
        { ru: "Австрия", de: "Österreich.", required: ["österreich"] },
        { ru: "Швейцария", de: "Die Schweiz.", required: ["die", "schweiz"] },
        
        // ===== Города и дома =====
        { ru: "Город", de: "Die Stadt.", required: ["die", "stadt"] },
        { ru: "Деревня", de: "Das Dorf.", required: ["das", "dorf"] },
        { ru: "Дом", de: "Das Haus.", required: ["das", "haus"] },
        { ru: "Квартира", de: "Die Wohnung.", required: ["die", "wohnung"] },
        { ru: "Комната", de: "Das Zimmer.", required: ["das", "zimmer"] },
        { ru: "Кухня", de: "Die Küche.", required: ["die", "küche"] },
        
        // ===== Мебель и вещи =====
        { ru: "Стол", de: "Der Tisch.", required: ["der", "tisch"] },
        { ru: "Стул", de: "Der Stuhl.", required: ["der", "stuhl"] },
        { ru: "Кровать", de: "Das Bett.", required: ["das", "bett"] },
        { ru: "Книга", de: "Das Buch.", required: ["das", "buch"] },
        { ru: "Собака", de: "Der Hund.", required: ["der", "hund"] },
        { ru: "Кошка", de: "Die Katze.", required: ["die", "katze"] },
        
        // ===== Простые предложения =====
        { ru: "Это мужчина.", de: "Das ist ein Mann.", required: ["das", "ist", "ein", "mann"] },
        { ru: "Это женщина.", de: "Das ist eine Frau.", required: ["das", "ist", "eine", "frau"] },
        { ru: "Это ребёнок.", de: "Das ist ein Kind.", required: ["das", "ist", "ein", "kind"] },
        { ru: "Это мой отец.", de: "Das ist mein Vater.", required: ["das", "ist", "mein", "vater"] },
        { ru: "Это моя мать.", de: "Das ist meine Mutter.", required: ["das", "ist", "meine", "mutter"] },
        { ru: "Это мой брат.", de: "Das ist mein Bruder.", required: ["das", "ist", "mein", "bruder"] },
        { ru: "Это моя сестра.", de: "Das ist meine Schwester.", required: ["das", "ist", "meine", "schwester"] },
        { ru: "Это мой друг.", de: "Das ist mein Freund.", required: ["das", "ist", "mein", "freund"] },
        { ru: "Это моя подруга.", de: "Das ist meine Freundin.", required: ["das", "ist", "meine", "freundin"] },
        { ru: "Это моя семья.", de: "Das ist meine Familie.", required: ["das", "ist", "meine", "familie"] },
        { ru: "Это мой дом.", de: "Das ist mein Haus.", required: ["das", "ist", "mein", "haus"] },
        { ru: "Это моя квартира.", de: "Das ist meine Wohnung.", required: ["das", "ist", "meine", "wohnung"] },
        { ru: "Это моя комната.", de: "Das ist mein Zimmer.", required: ["das", "ist", "mein", "zimmer"] },
        { ru: "Это моя кухня.", de: "Das ist meine Küche.", required: ["das", "ist", "meine", "küche"] },
        { ru: "Это моя книга.", de: "Das ist mein Buch.", required: ["das", "ist", "mein", "buch"] },
        { ru: "Это моя собака.", de: "Das ist mein Hund.", required: ["das", "ist", "mein", "hund"] },
        { ru: "Это моя кошка.", de: "Das ist meine Katze.", required: ["das", "ist", "meine", "katze"] }
    ];
}

function renderTrainer(container, lesson) {
    const vocab = lesson.vocabulary || [];
    
    if (vocab.length < 5) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #999;">
                <div style="font-size: 48px; margin-bottom: 15px;">📝</div>
                <div>Недостаточно слов для тренажёра.</div>
                <div style="font-size: 14px; margin-top: 10px;">В уроке должно быть минимум 5 слов.</div>
            </div>
        `;
        return;
    }

    // Создаём карту слов из лексики урока
    const wordMap = {};
    vocab.forEach(w => {
        const key = w.de.toLowerCase().replace(/[.,!?;:]/g, '');
        wordMap[key] = w;
    });

    // Берём шаблоны для урока 1
    const templates = getTemplatesForLesson1();

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
}

// ===== ОСТАЛЬНЫЕ ФУНКЦИИ (showTrainerSentence, updateTrainerDisplay) =====
// ... (остаются без изменений)
