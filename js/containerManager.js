// containerManager.js — универсальный менеджер контейнера
// Поддерживает как слова (quiz), так и фразы (trainer)

function showContainerModal(config) {
    // Удаляем старую модалку
    const oldModal = document.getElementById('containerModal');
    if (oldModal) oldModal.remove();
    
    const {
        title,
        items,
        onReturnItem,
        onReturnAll,
        emptyMessage,
        itemTemplate
    } = config;
    
    const isEmpty = !items || items.length === 0;
    
    // Создаём модалку через createElement (надёжнее)
    const modal = document.createElement('div');
    modal.id = 'containerModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.7);
        display: flex !important;
        justify-content: center;
        align-items: center;
        z-index: 9999999 !important;
        overflow: auto;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: white;
        border-radius: 20px;
        max-width: 500px;
        width: 90%;
        max-height: 80vh;
        display: flex;
        flex-direction: column;
        margin: 20px;
        padding: 0;
        overflow: hidden;
        box-shadow: 0 20px 60px rgba(0,0,0,0.5);
    `;
    
    // Заголовок
    const header = document.createElement('div');
    header.style.cssText = 'padding: 15px 20px; border-bottom: 1px solid #ddd; text-align: center; flex-shrink: 0;';
    header.innerHTML = `<h3 style="margin: 0;">${title || '📦 КОНТЕЙНЕР (' + (items?.length || 0) + ')'}</h3>`;
    modalContent.appendChild(header);
    
    // Список элементов
    const itemsContainer = document.createElement('div');
    itemsContainer.style.cssText = 'overflow-y: auto; flex: 1; padding: 5px 0;';
    
    if (isEmpty) {
        itemsContainer.innerHTML = `<div style="text-align:center; padding:40px; color:#999;">${emptyMessage || '📭 Контейнер пуст'}</div>`;
    } else {
        items.forEach((item) => {
            const display = itemTemplate ? itemTemplate(item) : (item.display || item);
            const itemId = item.id || item.de || item.key || item.display;
            
            const div = document.createElement('div');
            div.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 10px 20px; border-bottom: 1px solid #f0f0f0;';
            div.innerHTML = `
                <span>${display}</span>
                <button class="return-item-btn" data-id="${itemId}" style="padding: 4px 14px; background: #F44336; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 12px; font-weight: bold;">✕ ВЕРНУТЬ</button>
            `;
            
            const btn = div.querySelector('.return-item-btn');
            btn.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                if (onReturnItem) {
                    onReturnItem(id);
                }
            });
            
            itemsContainer.appendChild(div);
        });
    }
    modalContent.appendChild(itemsContainer);
    
    // Нижняя панель
    const footer = document.createElement('div');
    footer.style.cssText = 'padding: 15px 20px; border-top: 1px solid #ddd; display: flex; gap: 10px; flex-shrink: 0;';
    footer.innerHTML = `
        <button id="returnAllBtn" style="flex: 1; padding: 10px; background: #FF9800; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">🔄 ВЕРНУТЬ ВСЁ</button>
        <button id="closeContainerBtn" style="flex: 1; padding: 10px; background: #ddd; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">ЗАКРЫТЬ</button>
    `;
    modalContent.appendChild(footer);
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    console.log('✅ Модалка добавлена в DOM');
    
    // Обработчик "ВЕРНУТЬ ВСЁ"
    document.getElementById('returnAllBtn').addEventListener('click', function() {
        if (!confirm('Вернуть все элементы из контейнера?')) return;
        if (onReturnAll) {
            onReturnAll();
        }
        modal.remove();
    });
    
    // Обработчик "ЗАКРЫТЬ"
    document.getElementById('closeContainerBtn').addEventListener('click', function() {
        modal.remove();
    });
    
    // Закрытие по клику на фон
    modal.addEventListener('click', function(e) {
        if (e.target === modal) modal.remove();
    });
    
    return modal;
}

// Экспорт
window.ContainerManager = {
    show: showContainerModal
};
