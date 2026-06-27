// ====================================================================
// vocabularyMode.js — Лексика (с поддержкой раздельной структуры)
// ====================================================================

async function renderVocabulary(container, lesson) {
    // Показываем загрузку
    container.innerHTML = '<div style="text-align: center; padding: 40px; color: #999;">⏳ Загрузка слов...</div>';
    
    // Пытаемся получить лексику из кеша или загрузить отдельно
    let vocab = lesson.vocabulary || [];
    
    // Если лексика пустая — пробуем загрузить из отдельного файла
    if (vocab.length === 0 && lesson.id) {
        try {
            const paddedId = String(lesson.id).padStart(2, '0');
            const response = await fetch(`docs/course/${currentLevel}/vocabulary/vocab_${paddedId}.json`);
            if (response.ok) {
                const data = await response.json();
                vocab = data;
                // Сохраняем в lesson, чтобы при повторном открытии не грузить заново
                lesson.vocabulary = vocab;
                console.log(`✅ Лексика урока ${lesson.id} загружена из отдельного файла`);
            } else {
                console.log(`ℹ️ Отдельный файл лексики для урока ${lesson.id} не найден`);
            }
        } catch(e) {
            console.log(`ℹ️ Ошибка загрузки лексики для урока ${lesson.id}:`, e.message);
        }
    }
    
    // Если всё ещё пусто — показываем сообщение
    if (!vocab || vocab.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 40px; color: #999;">📭 Слова не загружены</div>';
        return;
    }

    let html = '<div class="vocab-grid">';
    vocab.forEach(word => {
        const safeText = word.de.replace(/'/g, "\\'");
        html += `
            <div class="vocab-item">
                <span><strong>${word.de}</strong> — ${word.ru}</span>
                <button class="speak-btn" onclick="speak('${safeText}')" 
                        style="background: #3B6FE0; color: white; border: none; border-radius: 8px; padding: 6px 14px; cursor: pointer; font-size: 13px; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.2); transition: all 0.05s linear;">
                    🔊
                </button>
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
}
