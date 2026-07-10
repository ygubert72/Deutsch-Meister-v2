// ============================================================
// shareModal.js — Модальное окно "Поделиться"
// ============================================================

function openShareModal() {
    const oldModal = document.getElementById('shareModal');
    if (oldModal) oldModal.remove();
    
    const url = window.location.href;
    const text = '🇩🇪 Учите немецкий язык с Deutsch-Meister!';
    
    const shareLinks = {
        telegram: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
        whatsapp: `https://api.whatsapp.com/send?text=${encodeURIComponent(text + ' ' + url)}`,
        vk: `https://vk.com/share.php?url=${encodeURIComponent(url)}&title=${encodeURIComponent(text)}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
        email: `mailto:?subject=${encodeURIComponent('Deutsch-Meister')}&body=${encodeURIComponent(text + '\n\n' + url)}`
    };
    
    const modal = document.createElement('div');
    modal.id = 'shareModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.6);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000000;
        padding: 20px;
        backdrop-filter: blur(4px);
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: white;
        border-radius: 24px;
        max-width: 420px;
        width: 100%;
        padding: 30px 25px 25px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.4);
        position: relative;
        animation: shareFadeIn 0.25s ease;
    `;
    
    const style = document.getElementById('shareModalStyle');
    if (!style) {
        const newStyle = document.createElement('style');
        newStyle.id = 'shareModalStyle';
        newStyle.textContent = `
            @keyframes shareFadeIn {
                from { opacity: 0; transform: scale(0.95) translateY(15px); }
                to { opacity: 1; transform: scale(1) translateY(0); }
            }
        `;
        document.head.appendChild(newStyle);
    }
    
    modalContent.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h3 style="margin: 0; font-size: 20px; color: #1A1A1A;">🔗 Поделиться приложением</h3>
            <button onclick="closeShareModal()" style="background: none; border: none; font-size: 28px; cursor: pointer; color: #999; padding: 0 5px; line-height: 1;">✕</button>
        </div>
        
        <p style="color: #666; font-size: 14px; margin-bottom: 20px; text-align: center;">
            Выберите способ, чтобы поделиться с друзьями:
        </p>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <button onclick="shareTo('telegram')" style="display: flex; align-items: center; justify-content: center; gap: 10px; padding: 14px; background: #0088cc; color: white; border: none; border-radius: 14px; cursor: pointer; font-size: 15px; font-weight: 500; transition: all 0.08s ease;">
                <span style="font-size: 20px;">📲</span> Telegram
            </button>
            
            <button onclick="shareTo('whatsapp')" style="display: flex; align-items: center; justify-content: center; gap: 10px; padding: 14px; background: #25D366; color: white; border: none; border-radius: 14px; cursor: pointer; font-size: 15px; font-weight: 500; transition: all 0.08s ease;">
                <span style="font-size: 20px;">💬</span> WhatsApp
            </button>
            
            <button onclick="shareTo('vk')" style="display: flex; align-items: center; justify-content: center; gap: 10px; padding: 14px; background: #0077FF; color: white; border: none; border-radius: 14px; cursor: pointer; font-size: 15px; font-weight: 500; transition: all 0.08s ease;">
                <span style="font-size: 20px;">📘</span> VK
            </button>
            
            <button onclick="shareTo('instagram')" style="display: flex; align-items: center; justify-content: center; gap: 10px; padding: 14px; background: linear-gradient(135deg, #833AB4, #E1306C, #FD1D1D); color: white; border: none; border-radius: 14px; cursor: pointer; font-size: 15px; font-weight: 500; transition: all 0.08s ease;">
                <span style="font-size: 20px;">📷</span> Instagram
            </button>
            
            <button onclick="shareTo('facebook')" style="display: flex; align-items: center; justify-content: center; gap: 10px; padding: 14px; background: #1877F2; color: white; border: none; border-radius: 14px; cursor: pointer; font-size: 15px; font-weight: 500; transition: all 0.08s ease;">
                <span style="font-size: 20px;">📱</span> Facebook
            </button>
            
            <button onclick="shareTo('email')" style="display: flex; align-items: center; justify-content: center; gap: 10px; padding: 14px; background: #EA4335; color: white; border: none; border-radius: 14px; cursor: pointer; font-size: 15px; font-weight: 500; transition: all 0.08s ease;">
                <span style="font-size: 20px;">✉️</span> Email
            </button>
        </div>
        
        <div style="margin-top: 15px; text-align: center;">
            <button onclick="copyLink()" style="padding: 12px 20px; background: #f5f5f5; color: #333; border: 2px solid #E0E0E0; border-radius: 12px; cursor: pointer; font-size: 14px; font-weight: 500; width: 100%; transition: all 0.08s ease;">
                📋 Скопировать ссылку
            </button>
        </div>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    modal.addEventListener('click', function(e) {
        if (e.target === modal) closeShareModal();
    });
}

function closeShareModal() {
    const modal = document.getElementById('shareModal');
    if (modal) modal.remove();
}

function shareTo(platform) {
    const url = window.location.href;
    const text = '🇩🇪 Учите немецкий язык с Deutsch-Meister!';
    
    const links = {
        telegram: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
        whatsapp: `https://api.whatsapp.com/send?text=${encodeURIComponent(text + ' ' + url)}`,
        vk: `https://vk.com/share.php?url=${encodeURIComponent(url)}&title=${encodeURIComponent(text)}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
        email: `mailto:?subject=${encodeURIComponent('Deutsch-Meister')}&body=${encodeURIComponent(text + '\n\n' + url)}`
    };
    
    if (platform === 'instagram') {
        copyLink();
        return;
    }
    
    if (links[platform]) {
        window.open(links[platform], '_blank', 'width=600,height=500');
    }
}

function copyLink() {
    const url = window.location.href;
    if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(() => {
            const btn = document.querySelector('#shareModal button:last-child');
            if (btn) {
                const originalText = btn.textContent;
                btn.textContent = '✅ Скопировано!';
                btn.style.background = '#4CAF50';
                btn.style.color = 'white';
                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.style.background = '#f5f5f5';
                    btn.style.color = '#333';
                }, 2000);
            }
        }).catch(() => {
            fallbackCopy(url);
        });
    } else {
        fallbackCopy(url);
    }
}

function fallbackCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
        document.execCommand('copy');
        alert('✅ Ссылка скопирована!');
    } catch (e) {
        prompt('Скопируйте ссылку:', text);
    }
    document.body.removeChild(textarea);
}

window.openShareModal = openShareModal;
window.closeShareModal = closeShareModal;
window.shareTo = shareTo;
window.copyLink = copyLink;

console.log('🔗 shareModal.js загружен');
