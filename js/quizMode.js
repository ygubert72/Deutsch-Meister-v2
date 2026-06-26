// В quizMode.js, в обработчике кнопки "В КОНТЕЙНЕР":
document.getElementById('quizContainerBtn').addEventListener('click', function() {
    const studied = getStudiedWordsList();
    if (!studied || studied.length === 0) {
        alert('📦 Контейнер пуст\n\nВыучите слова, чтобы они появились здесь.');
        return;
    }
    
    // Используем универсальный контейнер
    window.ContainerManager.show({
        title: `📦 КОНТЕЙНЕР (${studied.length} слов)`,
        items: studied,
        emptyMessage: '📭 Контейнер пуст',
        itemTemplate: function(word) {
            return `<strong>${word.de}</strong> — ${word.ru}`;
        },
        onReturnItem: function(wordDe, callback) {
            delete quizStudiedWords[wordDe];
            saveQuizState();
            const lesson = currentLessonData || window.currentLesson;
            if (lesson) {
                const vocab = lesson.vocabulary || [];
                quizWords = vocab.filter(w => !quizStudiedWords[w.de]);
            }
            if (quizWords.length > 0 && quizIndex >= quizWords.length) {
                quizIndex = 0;
            }
            if (callback) callback();
            if (getStudiedWordsList().length === 0) {
                if (quizWords.length > 0) showQuizQuestion();
            }
        },
        onReturnAll: function(callback) {
            const lesson = currentLessonData || window.currentLesson;
            if (lesson) {
                const vocab = lesson.vocabulary || [];
                vocab.forEach(word => { delete quizStudiedWords[word.de]; });
            }
            saveQuizState();
            const lesson2 = currentLessonData || window.currentLesson;
            if (lesson2) {
                quizWords = [...lesson2.vocabulary];
            }
            quizIndex = 0;
            if (callback) callback();
            showQuizQuestion();
        }
    });
});
