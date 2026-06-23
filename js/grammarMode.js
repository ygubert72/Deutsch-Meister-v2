// ========== НОВАЯ ФУНКЦИЯ ДЛЯ РАБОТЫ С COURSE MANAGER ==========
// Эта функция позволяет использовать упражнения из нового формата уроков

function initGrammarFromLesson(lessonData) {
    // Сохраняем данные урока в глобальную переменную
    window.currentLessonData = lessonData;
    
    // Если есть упражнения - показываем их
    if (lessonData.practice && lessonData.practice.length > 0) {
        // Используем существующую логику для отображения упражнений
        window.currentExercises = lessonData.practice;
        window.currentExerciseIndex = 0;
        
        // Создаем контейнер для упражнений
        const container = document.getElementById('lessonContent');
        if (container) {
            // Создаем временный контейнер для грамматики
            const grammarContainer = document.createElement('div');
            grammarContainer.id = 'grammarContent';
            container.appendChild(grammarContainer);
            
            // Показываем первое упражнение
            if (typeof window.showGrammarExercise === 'function') {
                window.showGrammarExercise(lessonData.practice[0]);
            }
        }
    }
}

// Экспортируем функцию
window.initGrammarFromLesson = initGrammarFromLesson;
