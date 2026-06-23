// ====================================================================
// vocabularyMode.js — Лексика
// ====================================================================

function renderVocabulary(container, lesson) {
    const vocab = lesson.vocabulary || [];
    if (vocab.length === 0) {
        container.innerHTML = '<div>Слова не загружены</div>';
        return;
    }

    let html = '<div class="vocab-grid">';
    vocab.forEach(word => {
        const safeText = word.de.replace(/'/g, "\\'");
        html += `
            <div class="vocab-item">
                <span><strong>${word.de}</strong> — ${word.ru}</span>
                <button class="speak-btn" onclick="speak('${safeText}')">🔊</button>
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
}
