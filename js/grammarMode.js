// ====================================================================
// grammarMode.js — Грамматика
// ====================================================================

function renderGrammar(container, lesson) {
    let html = `<div style="line-height: 1.8;">${lesson.grammar || ''}</div>`;
    
    if (lesson.examples && lesson.examples.length) {
        html += `<h4>📝 Примеры:</h4><div style="margin-top: 10px;">`;
        lesson.examples.forEach(ex => {
            const safeText = ex.de.replace(/'/g, "\\'");
            html += `
                <div style="background: #E8F0FE; padding: 10px; border-radius: 8px; margin: 8px 0; display: flex; justify-content: space-between; align-items: center;">
                    <span><strong>${ex.de}</strong> — ${ex.ru}</span>
                    <button class="speak-btn" onclick="speak('${safeText}')" 
                            style="background: #3B6FE0; color: white; border: none; border-radius: 8px; padding: 6px 14px; cursor: pointer; font-size: 13px; font-weight: bold; box-shadow: 0 4px 0 #1a3f8a; transition: all 0.05s linear;">
                        🔊
                    </button>
                </div>
            `;
        });
        html += `</div>`;
    }
    
    container.innerHTML = html;
}
