// ============================================================
// donateModal.js — Модальное окно "Помочь проекту"
// ============================================================

function openDonateModal() {
    const oldModal = document.getElementById('donateModal');
    if (oldModal) oldModal.remove();
    
    const modal = document.createElement('div');
    modal.id = 'donateModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000000;
        padding: 20px;
        overflow: auto;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: white;
        border-radius: 20px;
        max-width: 420px;
        width: 100%;
        max-height: 90vh;
        padding: 30px 25px 25px;
        overflow-y: auto;
        position: relative;
        box-shadow: 0 20px 60px rgba(0,0,0,0.4);
    `;
    
    modalContent.innerHTML = `
        <button onclick="closeDonateModal()" style="
            position: absolute;
            top: 12px;
            right: 16px;
            background: none;
            border: none;
            font-size: 28px;
            cursor: pointer;
            color: #999;
            padding: 0 5px;
            line-height: 1;
            transition: color 0.2s;
        " onmouseover="this.style.color='#333'" onmouseout="this.style.color='#999'">✕</button>
        
        <div style="text-align: center; margin-bottom: 20px;">
            <div style="font-size: 48px; margin-bottom: 10px;">💛</div>
            <h2 style="margin: 0; font-size: 22px; color: #1A1A1A;">Помочь проекту</h2>
            <p style="color: #666; font-size: 14px; margin-top: 5px;">
                Поддержите развитие Deutsch-Meister!
            </p>
        </div>
        
        <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 15px;">
            <p style="color: #888; font-size: 14px; margin: 0;">
                Способы поддержки будут добавлены позже.
            </p>
            <p style="color: #bbb; font-size: 12px; margin-top: 10px;">
                Спасибо, что вы с нами! 🙏
            </p>
        </div>
        
        <button onclick="closeDonateModal()" style="
            width: 100%;
            padding: 12px;
            background: #3B6FE0;
            color: white;
            border: none;
            border-radius: 12px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
            transition: all 0.08s ease;
        ">Закрыть</button>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    modal.onclick = function(e) {
        if (e.target === modal) closeDonateModal();
    };
}

function closeDonateModal() {
    const modal = document.getElementById('donateModal');
    if (modal) modal.remove();
}

// Экспорт
window.openDonateModal = openDonateModal;
window.closeDonateModal = closeDonateModal;

console.log('💛 donateModal.js загружен');
