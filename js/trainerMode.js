// В trainerMode.js, в обработчике кнопки "В КОНТЕЙНЕР":
document.getElementById('trainerContainerBtn').addEventListener('click', function() {
    const studied = getStudiedSentencesList();
    if (!studied || studied.length === 0) {
        alert('📦 Контейнер пуст\n\nВыучите фразы, чтобы они появились здесь.');
        return;
    }
    
    // Используем универсальный контейнер
    window.ContainerManager.show({
        title: `📦 КОНТЕЙНЕР (${studied.length} фраз)`,
        items: studied,
        emptyMessage: '📭 Контейнер пуст',
        itemTemplate: function(sentence) {
            return `<strong>${sentence.de}</strong> — ${sentence.ru}`;
        },
        onReturnItem: function(key, callback) {
            delete trainerStudiedSentences[key];
            saveTrainerState();
            const lesson = trainerCurrentLessonData || window.currentLesson;
            if (lesson) {
                const templates = lesson.trainer?.templates || [];
                trainerSentences = templates.filter(t => {
                    const k = t.de + '|' + t.ru;
                    return !trainerStudiedSentences[k];
                });
            }
            if (trainerSentences.length === 0) {
                const lesson2 = trainerCurrentLessonData || window.currentLesson;
                if (lesson2) {
                    trainerSentences = [...lesson2.trainer.templates];
                    trainerStudiedSentences = {};
                    localStorage.removeItem('dm_trainer_studied_' + trainerCurrentLessonId);
                }
            }
            if (trainerIndex >= trainerSentences.length) {
                trainerIndex = 0;
            }
            if (callback) callback();
            const container = document.getElementById('modeContent');
            if (container) {
                showTrainerSentence(container);
            }
        },
        onReturnAll: function(callback) {
            const lesson = trainerCurrentLessonData || window.currentLesson;
            if (lesson) {
                const templates = lesson.trainer?.templates || [];
                templates.forEach(t => {
                    const key = t.de + '|' + t.ru;
                    delete trainerStudiedSentences[key];
                });
            }
            saveTrainerState();
            const lesson2 = trainerCurrentLessonData || window.currentLesson;
            if (lesson2) {
                trainerSentences = [...lesson2.trainer.templates];
            }
            trainerIndex = 0;
            if (callback) callback();
            const container = document.getElementById('modeContent');
            if (container) {
                showTrainerSentence(container);
            }
        }
    });
});
