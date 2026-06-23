// ===== РАСШИРЕННЫЕ ШАБЛОНЫ ДЛЯ УРОВНЯ A1 =====
function getTemplatesForLevel(level) {
    // Полный набор шаблонов для A1 (будет расти с каждым уроком)
    const allTemplates = [
        // ===== УРОК 1: Приветствия и прощания =====
        { ru: "Привет!", de: "Hallo!", required: ["hallo"] },
        { ru: "Пока!", de: "Tschüss!", required: ["tschüss"] },
        { ru: "Доброе утро!", de: "Guten Morgen!", required: ["guten", "morgen"] },
        { ru: "Добрый день!", de: "Guten Tag!", required: ["guten", "tag"] },
        { ru: "Добрый вечер!", de: "Guten Abend!", required: ["guten", "abend"] },
        { ru: "Спокойной ночи!", de: "Gute Nacht!", required: ["gute", "nacht"] },
        { ru: "До свидания!", de: "Auf Wiedersehen!", required: ["auf", "wiedersehen"] },
        { ru: "До скорого!", de: "Bis bald!", required: ["bis", "bald"] },
        { ru: "До встречи!", de: "Bis später!", required: ["bis", "später"] },
        
        // ===== УРОК 1: Вежливые слова =====
        { ru: "Пожалуйста!", de: "Bitte!", required: ["bitte"] },
        { ru: "Спасибо!", de: "Danke!", required: ["danke"] },
        { ru: "Большое спасибо!", de: "Vielen Dank!", required: ["vielen", "dank"] },
        { ru: "Извините!", de: "Entschuldigung!", required: ["entschuldigung"] },
        { ru: "Без проблем.", de: "Kein Problem.", required: ["kein", "problem"] },
        
        // ===== УРОК 1: Утверждения и отрицания =====
        { ru: "Да", de: "Ja", required: ["ja"] },
        { ru: "Нет", de: "Nein", required: ["nein"] },
        { ru: "Возможно", de: "Vielleicht", required: ["vielleicht"] },
        { ru: "Конечно", de: "Natürlich", required: ["natürlich"] },
        { ru: "Точно", de: "Genau", required: ["genau"] },
        
        // ===== УРОК 1: Представление =====
        { ru: "Привет! Меня зовут Анна.", de: "Hallo! Ich heiße Anna.", required: ["hallo", "ich", "heiße"] },
        { ru: "Меня зовут Анна.", de: "Ich heiße Anna.", required: ["ich", "heiße"] },
        { ru: "Как тебя зовут?", de: "Wie heißt du?", required: ["wie", "heißt", "du"] },
        { ru: "Я Анна.", de: "Ich bin Anna.", required: ["ich", "bin"] },
        { ru: "Я Том.", de: "Ich bin Tom.", required: ["ich", "bin"] },
        { ru: "Ты мой друг.", de: "Du bist mein Freund.", required: ["du", "bist", "mein", "freund"] },
        { ru: "Ты моя подруга.", de: "Du bist meine Freundin.", required: ["du", "bist", "meine", "freundin"] },
        { ru: "Это мой друг.", de: "Das ist mein Freund.", required: ["das", "ist", "mein", "freund"] },
        { ru: "Это моя подруга.", de: "Das ist meine Freundin.", required: ["das", "ist", "meine", "freundin"] },
        { ru: "Он мой брат.", de: "Er ist mein Bruder.", required: ["er", "ist", "mein", "bruder"] },
        { ru: "Она моя сестра.", de: "Sie ist meine Schwester.", required: ["sie", "ist", "meine", "schwester"] },
        { ru: "Это мой отец.", de: "Das ist mein Vater.", required: ["das", "ist", "mein", "vater"] },
        { ru: "Это моя мать.", de: "Das ist meine Mutter.", required: ["das", "ist", "meine", "mutter"] },
        { ru: "Это моя семья.", de: "Das ist meine Familie.", required: ["das", "ist", "meine", "familie"] },
        { ru: "Мой брат.", de: "Mein Bruder.", required: ["mein", "bruder"] },
        { ru: "Моя сестра.", de: "Meine Schwester.", required: ["meine", "schwester"] },
        { ru: "Мой отец.", de: "Mein Vater.", required: ["mein", "vater"] },
        { ru: "Моя мать.", de: "Meine Mutter.", required: ["meine", "mutter"] },
        { ru: "Мы друзья.", de: "Wir sind Freunde.", required: ["wir", "sind", "freunde"] },
        { ru: "Мы семья.", de: "Wir sind eine Familie.", required: ["wir", "sind", "familie"] },
        { ru: "Мы счастливы.", de: "Wir sind glücklich.", required: ["wir", "sind", "glücklich"] },
        
        // ===== УРОК 1: Вопросы о месте =====
        { ru: "Где ты?", de: "Wo bist du?", required: ["wo", "bist", "du"] },
        { ru: "Я здесь.", de: "Ich bin hier.", required: ["ich", "bin", "hier"] },
        { ru: "Я из России.", de: "Ich komme aus Russland.", required: ["ich", "komme", "aus", "russland"] },
        { ru: "Я из Германии.", de: "Ich komme aus Deutschland.", required: ["ich", "komme", "aus", "deutschland"] },
        { ru: "Откуда ты?", de: "Woher kommst du?", required: ["woher", "kommst", "du"] },
        { ru: "Где ты живёшь?", de: "Wo wohnst du?", required: ["wo", "wohnst", "du"] },
        { ru: "Я живу в Берлине.", de: "Ich wohne in Berlin.", required: ["ich", "wohne", "in"] },
        { ru: "Я живу в Кёльне.", de: "Ich wohne in Köln.", required: ["ich", "wohne", "in"] },
        
        // ===== УРОК 1: Предметы и вещи =====
        { ru: "Это моя книга.", de: "Das ist mein Buch.", required: ["das", "ist", "mein", "buch"] },
        { ru: "Это мой дом.", de: "Das ist mein Haus.", required: ["das", "ist", "mein", "haus"] },
        { ru: "Это моя квартира.", de: "Das ist meine Wohnung.", required: ["das", "ist", "meine", "wohnung"] },
        { ru: "Это моя комната.", de: "Das ist mein Zimmer.", required: ["das", "ist", "mein", "zimmer"] },
        { ru: "Это моя кухня.", de: "Das ist meine Küche.", required: ["das", "ist", "meine", "küche"] },
        { ru: "Квартира большая.", de: "Die Wohnung ist groß.", required: ["die", "wohnung", "ist", "groß"] },
        { ru: "Комната маленькая.", de: "Das Zimmer ist klein.", required: ["das", "zimmer", "ist", "klein"] },
        { ru: "Кухня чистая.", de: "Die Küche ist sauber.", required: ["die", "küche", "ist", "sauber"] },
        { ru: "Ванная светлая.", de: "Das Bad ist hell.", required: ["das", "bad", "ist", "hell"] },
        
        // ===== УРОК 1: Мебель =====
        { ru: "Стол.", de: "Der Tisch.", required: ["der", "tisch"] },
        { ru: "Стул.", de: "Der Stuhl.", required: ["der", "stuhl"] },
        { ru: "Кровать.", de: "Das Bett.", required: ["das", "bett"] },
        { ru: "Стол круглый.", de: "Der Tisch ist rund.", required: ["der", "tisch", "ist", "rund"] },
        { ru: "Стул удобный.", de: "Der Stuhl ist bequem.", required: ["der", "stuhl", "ist", "bequem"] },
        { ru: "Кровать новая.", de: "Das Bett ist neu.", required: ["das", "bett", "ist", "neu"] },
        { ru: "Шкаф старый.", de: "Der Schrank ist alt.", required: ["der", "schrank", "ist", "alt"] },
        
        // ===== УРОК 1: Животные =====
        { ru: "Собака.", de: "Der Hund.", required: ["der", "hund"] },
        { ru: "Кошка.", de: "Die Katze.", required: ["die", "katze"] },
        { ru: "Собака большая.", de: "Der Hund ist groß.", required: ["der", "hund", "ist", "groß"] },
        { ru: "Кошка милая.", de: "Die Katze ist süß.", required: ["die", "katze", "ist", "süß"] },
        
        // ===== УРОК 1: Состояния =====
        { ru: "Я устал.", de: "Ich bin müde.", required: ["ich", "bin", "müde"] },
        { ru: "Я голоден.", de: "Ich habe Hunger.", required: ["ich", "habe", "hunger"] },
        { ru: "Я хочу пить.", de: "Ich habe Durst.", required: ["ich", "habe", "durst"] },
        { ru: "Я счастлив.", de: "Ich bin glücklich.", required: ["ich", "bin", "glücklich"] },
        
        // ===== УРОК 1: Вопросы =====
        { ru: "Как дела?", de: "Wie geht es dir?", required: ["wie", "geht", "es", "dir"] },
        { ru: "У меня всё хорошо.", de: "Mir geht es gut.", required: ["mir", "geht", "es", "gut"] },
        { ru: "У тебя есть время?", de: "Hast du Zeit?", required: ["hast", "du", "zeit"] },
        { ru: "Сегодня у меня нет времени.", de: "Heute habe ich keine Zeit.", required: ["heute", "habe", "ich", "keine", "zeit"] },
        { ru: "Ты понимаешь меня?", de: "Verstehst du mich?", required: ["verstehst", "du", "mich"] },
        { ru: "Я понимаю.", de: "Ich verstehe.", required: ["ich", "verstehe"] },
        { ru: "Я не понимаю.", de: "Ich verstehe nicht.", required: ["ich", "verstehe", "nicht"] },
        
        // ===== УРОК 1: Ответы =====
        { ru: "Спасибо, хорошо!", de: "Danke, gut!", required: ["danke", "gut"] },
        { ru: "Не очень хорошо.", de: "Nicht so gut.", required: ["nicht", "so", "gut"] },
        { ru: "Это правильно.", de: "Das ist richtig.", required: ["das", "ist", "richtig"] },
        { ru: "Это неправильно.", de: "Das ist falsch.", required: ["das", "ist", "falsch"] },
        { ru: "Ты прав.", de: "Du hast recht.", required: ["du", "hast", "recht"] },
        
        // ===== УРОК 1: Действия =====
        { ru: "Что ты делаешь?", de: "Was machst du?", required: ["was", "machst", "du"] },
        { ru: "Я учу немецкий.", de: "Ich lerne Deutsch.", required: ["ich", "lerne", "deutsch"] },
        { ru: "Я работаю.", de: "Ich arbeite.", required: ["ich", "arbeite"] },
        { ru: "Он работает.", de: "Er arbeitet.", required: ["er", "arbeitet"] },
        { ru: "Она работает.", de: "Sie arbeitet.", required: ["sie", "arbeitet"] },
        { ru: "Мы работаем.", de: "Wir arbeiten.", required: ["wir", "arbeiten"] },
        
        // ===== УРОК 1: Время =====
        { ru: "Сегодня понедельник.", de: "Heute ist Montag.", required: ["heute", "ist", "montag"] },
        { ru: "Завтра вторник.", de: "Morgen ist Dienstag.", required: ["morgen", "ist", "dienstag"] },
        { ru: "Сейчас девять часов.", de: "Es ist neun Uhr.", required: ["es", "ist", "neun", "uhr"] },
        
        // ===== УРОК 1: Семья =====
        { ru: "У меня есть брат.", de: "Ich habe einen Bruder.", required: ["ich", "habe", "einen", "bruder"] },
        { ru: "У меня есть сестра.", de: "Ich habe eine Schwester.", required: ["ich", "habe", "eine", "schwester"] },
        { ru: "У тебя есть брат?", de: "Hast du einen Bruder?", required: ["hast", "du", "einen", "bruder"] },
        { ru: "У тебя есть сестра?", de: "Hast du eine Schwester?", required: ["hast", "du", "eine", "schwester"] },
        { ru: "У меня есть кошка.", de: "Ich habe eine Katze.", required: ["ich", "habe", "eine", "katze"] },
        { ru: "У нас есть кошка.", de: "Wir haben eine Katze.", required: ["wir", "haben", "eine", "katze"] },
        { ru: "У неё нет детей.", de: "Sie hat keine Kinder.", required: ["sie", "hat", "keine", "kinder"] }
    ];
    
    return allTemplates;
}
