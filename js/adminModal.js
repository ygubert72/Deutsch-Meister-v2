// ============================================================
// adminModal.js — Админ-панель в модальном окне.
// ============================================================

let adminAllUsers = [];
let adminFilteredUsers = [];

// ========== ОТКРЫТЬ АДМИН-ПАНЕЛЬ ==========
function openAdminPanel() {
    // Проверяем, что пользователь — админ
    if (!window.auth || !window.auth.currentUser || window.auth.currentUser.email !== 'ygubert72@gmail.com') {
        alert('Доступ запрещён. Только для администратора.');
        return;
    }
    
    // Удаляем старую модалку
    const oldModal = document.getElementById('adminModal');
    if (oldModal) oldModal.remove();
    
    // Создаём модалку
    const modal = document.createElement('div');
    modal.id = 'adminModal';
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
        overflow: auto;
        padding: 20px;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: white;
        border-radius: 20px;
        max-width: 1200px;
        width: 100%;
        max-height: 90vh;
        padding: 25px;
        overflow-y: auto;
        position: relative;
        box-shadow: 0 20px 60px rgba(0,0,0,0.5);
    `;
    
    modalContent.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h2 style="margin: 0;">📊 Админ-панель</h2>
            <button onclick="closeAdminPanel()" style="background: none; border: none; font-size: 28px; cursor: pointer; color: #666; padding: 0 10px;">✕</button>
        </div>
        
        <!-- Статистика -->
        <div id="adminStats" style="display: flex; gap: 15px; flex-wrap: wrap; margin-bottom: 20px;"></div>
        
        <!-- Фильтры -->
        <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 20px; background: #f5f5f5; padding: 15px; border-radius: 12px;">
            <select id="adminFilterStatus" style="padding: 8px 12px; border: 2px solid #E0E0E0; border-radius: 8px; font-size: 14px;">
                <option value="all">Все статусы</option>
                <option value="ok">✅ OK</option>
                <option value="monitor">👀 Наблюдение</option>
                <option value="warning">⚠️ Подозрение</option>
                <option value="blocked">🚫 Заблокированы</option>
            </select>
            <select id="adminFilterPremium" style="padding: 8px 12px; border: 2px solid #E0E0E0; border-radius: 8px; font-size: 14px;">
                <option value="all">Все пользователи</option>
                <option value="premium">💎 Премиум</option>
                <option value="free">Бесплатные</option>
            </select>
            <input type="text" id="adminSearchEmail" placeholder="Поиск по email..." style="flex:1; min-width:150px; padding: 8px 12px; border: 2px solid #E0E0E0; border-radius: 8px; font-size: 14px;">
            <button onclick="adminApplyFilters()" style="padding: 8px 20px; background: #3B6FE0; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">🔍 Применить</button>
            <button onclick="adminLoadData()" style="padding: 8px 20px; background: #4CAF50; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">🔄 Обновить</button>
        </div>
        
        <!-- Список пользователей -->
        <div id="adminUsersContainer">
            <div style="text-align: center; padding: 40px; color: #999;">Загрузка данных...</div>
        </div>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Загружаем данные
    adminLoadData();
}

// ========== ЗАКРЫТЬ АДМИН-ПАНЕЛЬ ==========
function closeAdminPanel() {
    const modal = document.getElementById('adminModal');
    if (modal) modal.remove();
}

// ========== ЗАГРУЗКА ДАННЫХ ==========
async function adminLoadData() {
    const container = document.getElementById('adminUsersContainer');
    if (!container) return;
    
    container.innerHTML = '<div style="text-align: center; padding: 40px; color: #999;">Загрузка данных...</div>';
    
    try {
        const snapshot = await window.db.collection('users').get();
        adminAllUsers = [];
        
        snapshot.forEach(doc => {
            const data = doc.data();
            adminAllUsers.push({
                uid: doc.id,
                email: data.email || 'No email',
                createdAt: data.createdAt || 'Unknown',
                hasPremiumAccess: data.hasPremiumAccess === true,
                blocked: data.blocked === true,
                status: data.status || 'ok',
                devices: data.devices || [],
                dailyStats: data.dailyStats || {},
                flags: data.flags || { totalFlags: 0 },
                lastChecked: data.lastChecked || null
            });
        });
        
        adminAllUsers.sort((a, b) => b.flags.totalFlags - a.flags.totalFlags);
        
        adminUpdateStats();
        adminApplyFilters();
        
    } catch(e) {
        console.error('Ошибка загрузки:', e);
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #999;">
                <div style="font-size: 48px; margin-bottom: 15px;">❌</div>
                <div>Ошибка загрузки данных</div>
                <div style="font-size: 14px; color: #666; margin-top: 10px;">${e.message}</div>
            </div>
        `;
    }
}

// ========== ОБНОВЛЕНИЕ СТАТИСТИКИ ==========
function adminUpdateStats() {
    const stats = { ok: 0, monitor: 0, warning: 0, blocked: 0, premium: 0 };
    
    adminAllUsers.forEach(u => {
        if (u.blocked) stats.blocked++;
        else if (u.status === 'warning') stats.warning++;
        else if (u.status === 'monitor') stats.monitor++;
        else stats.ok++;
        if (u.hasPremiumAccess) stats.premium++;
    });
    
    const statsHtml = `
        <div class="stat-item success"><div class="num">${stats.ok}</div><div class="label">✅ OK</div></div>
        <div class="stat-item warning"><div class="num">${stats.monitor}</div><div class="label">👀 Наблюдение</div></div>
        <div class="stat-item danger"><div class="num">${stats.warning}</div><div class="label">⚠️ Подозрение</div></div>
        <div class="stat-item" style="background:#f0f0f0;"><div class="num">${stats.blocked}</div><div class="label">🚫 Заблокированы</div></div>
        <div class="stat-item" style="background:#FFF8E1;"><div class="num">${stats.premium}</div><div class="label">💎 Премиум</div></div>
    `;
    
    const statsContainer = document.getElementById('adminStats');
    if (statsContainer) statsContainer.innerHTML = statsHtml;
}

// ========== ПРИМЕНЕНИЕ ФИЛЬТРОВ ==========
function adminApplyFilters() {
    const statusFilter = document.getElementById('adminFilterStatus')?.value || 'all';
    const premiumFilter = document.getElementById('adminFilterPremium')?.value || 'all';
    const search = document.getElementById('adminSearchEmail')?.value?.toLowerCase() || '';
    
    adminFilteredUsers = adminAllUsers.filter(u => {
        if (statusFilter !== 'all') {
            if (u.blocked && statusFilter !== 'blocked') return false;
            if (!u.blocked && u.status !== statusFilter) return false;
        }
        if (premiumFilter === 'premium' && !u.hasPremiumAccess) return false;
        if (premiumFilter === 'free' && u.hasPremiumAccess) return false;
        if (search && !u.email.toLowerCase().includes(search)) return false;
        return true;
    });
    
    adminRenderUsers();
}

// ========== ОТОБРАЖЕНИЕ ПОЛЬЗОВАТЕЛЕЙ ==========
function adminRenderUsers() {
    const container = document.getElementById('adminUsersContainer');
    if (!container) return;
    
    if (adminFilteredUsers.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:40px;color:#999;">📭 Пользователи не найдены</div>';
        return;
    }
    
    let html = '';
    
    adminFilteredUsers.forEach(user => {
        const today = new Date().toISOString().split('T')[0];
        const stats = user.dailyStats[today] || { sessions: 0, totalMinutes: 0, uniqueIPs: [], uniqueCities: [] };
        const flags = user.flags || { totalFlags: 0 };
        
        const statusClass = user.blocked ? 'blocked' : 
                           user.status === 'warning' ? 'danger' : 
                           user.status === 'monitor' ? 'warning' : '';
        
        const statusLabel = user.blocked ? '🚫 Заблокирован' :
                           user.status === 'warning' ? '⚠️ Подозрение' :
                           user.status === 'monitor' ? '👀 Наблюдение' : '✅ OK';
        
        const statusColor = user.blocked ? 'status-blocked' :
                           user.status === 'warning' ? 'status-warning' :
                           user.status === 'monitor' ? 'status-monitor' : 'status-ok';
        
        const deviceCount = user.devices.length;
        const ipCount = stats.uniqueIPs?.length || 0;
        const cityCount = stats.uniqueCities?.length || 0;
        
        html += `
            <div class="user-card ${statusClass}" style="background:white; border-radius:12px; padding:20px; margin-bottom:15px; box-shadow:0 2px 8px rgba(0,0,0,0.1); border-left:4px solid ${user.blocked ? '#9E9E9E' : user.status === 'warning' ? '#F44336' : user.status === 'monitor' ? '#FF9800' : '#4CAF50'}; ${user.blocked ? 'opacity:0.7;' : ''}">
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:12px;">
                    <div>
                        <span style="font-size:18px; font-weight:bold;">${user.email}</span>
                        ${user.hasPremiumAccess ? ' <span style="background:#FFD700; padding:2px 8px; border-radius:10px; font-size:11px; font-weight:bold;">💎 ПРЕМИУМ</span>' : ''}
                        <span class="user-status ${statusColor}" style="padding:4px 12px; border-radius:20px; font-size:12px; font-weight:bold;">${statusLabel}</span>
                    </div>
                    <div style="font-size:12px; color:#999;">Регистрация: ${new Date(user.createdAt).toLocaleDateString()}</div>
                </div>
                
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-top:10px;">
                    <div style="background:#f8f9fa; border-radius:8px; padding:12px;">
                        <h4 style="font-size:13px; color:#666; margin-bottom:8px; text-transform:uppercase;">📊 Активность сегодня</h4>
                        <div style="display:flex; justify-content:space-between; padding:4px 0; font-size:14px; border-bottom:1px solid #eee;"><span>Сессии</span><span style="font-weight:500;">${stats.sessions || 0}</span></div>
                        <div style="display:flex; justify-content:space-between; padding:4px 0; font-size:14px; border-bottom:1px solid #eee;"><span>Время</span><span style="font-weight:500;">${Math.round((stats.totalMinutes || 0) / 60)}ч ${(stats.totalMinutes || 0) % 60}м</span></div>
                        <div style="display:flex; justify-content:space-between; padding:4px 0; font-size:14px; border-bottom:1px solid #eee;"><span>Устройства</span><span style="font-weight:500;">${deviceCount}</span></div>
                        <div style="display:flex; justify-content:space-between; padding:4px 0; font-size:14px; border-bottom:1px solid #eee;"><span>Уникальные IP</span><span style="font-weight:500;">${ipCount}</span></div>
                        <div style="display:flex; justify-content:space-between; padding:4px 0; font-size:14px;"><span>Города</span><span style="font-weight:500;">${cityCount}</span></div>
                    </div>
                    
                    <div style="background:#f8f9fa; border-radius:8px; padding:12px;">
                        <h4 style="font-size:13px; color:#666; margin-bottom:8px; text-transform:uppercase;">🚩 Флаги (${flags.totalFlags})</h4>
                        <div style="display:flex; justify-content:space-between; padding:4px 0; font-size:14px; border-bottom:1px solid #eee;"><span>Много устройств (>2)</span><span style="padding:2px 8px; border-radius:12px; font-size:11px; background:${flags.multipleDevices ? '#FFCDD2' : '#E8F5E9'}; color:${flags.multipleDevices ? '#F44336' : '#4CAF50'};">${flags.multipleDevices ? '⚠️ Да' : '✅ Нет'}</span></div>
                        <div style="display:flex; justify-content:space-between; padding:4px 0; font-size:14px; border-bottom:1px solid #eee;"><span>Разные города (>2)</span><span style="padding:2px 8px; border-radius:12px; font-size:11px; background:${flags.differentCities ? '#FFCDD2' : '#E8F5E9'}; color:${flags.differentCities ? '#F44336' : '#4CAF50'};">${flags.differentCities ? '⚠️ Да' : '✅ Нет'}</span></div>
                        <div style="display:flex; justify-content:space-between; padding:4px 0; font-size:14px; border-bottom:1px solid #eee;"><span>Высокая активность (>3ч)</span><span style="padding:2px 8px; border-radius:12px; font-size:11px; background:${flags.highActivity ? '#FFCDD2' : '#E8F5E9'}; color:${flags.highActivity ? '#F44336' : '#4CAF50'};">${flags.highActivity ? '⚠️ Да' : '✅ Нет'}</span></div>
                        <div style="display:flex; justify-content:space-between; padding:4px 0; font-size:14px; border-bottom:1px solid #eee;"><span>Много IP (>3)</span><span style="padding:2px 8px; border-radius:12px; font-size:11px; background:${flags.manyIPs ? '#FFCDD2' : '#E8F5E9'}; color:${flags.manyIPs ? '#F44336' : '#4CAF50'};">${flags.manyIPs ? '⚠️ Да' : '✅ Нет'}</span></div>
                        <div style="display:flex; justify-content:space-between; padding:4px 0; font-size:14px;"><span>Неестественное время</span><span style="padding:2px 8px; border-radius:12px; font-size:11px; background:${flags.unnaturalHours ? '#FFCDD2' : '#E8F5E9'}; color:${flags.unnaturalHours ? '#F44336' : '#4CAF50'};">${flags.unnaturalHours ? '⚠️ Да' : '✅ Нет'}</span></div>
                    </div>
                </div>
                
                <div style="margin-top:12px; display:flex; gap:8px; flex-wrap:wrap;">
                    ${!user.blocked ? `
                        <button onclick="adminBlockUser('${user.uid}')" style="padding:6px 14px; background:#F44336; color:white; border:none; border-radius:8px; cursor:pointer; font-size:12px; font-weight:bold;">🚫 Заблокировать</button>
                        ${user.status === 'warning' ? `<button onclick="adminSetStatus('${user.uid}', 'ok')" style="padding:6px 14px; background:#9E9E9E; color:white; border:none; border-radius:8px; cursor:pointer; font-size:12px; font-weight:bold;">✅ Снять подозрение</button>` : ''}
                        ${user.status === 'monitor' ? `<button onclick="adminSetStatus('${user.uid}', 'ok')" style="padding:6px 14px; background:#9E9E9E; color:white; border:none; border-radius:8px; cursor:pointer; font-size:12px; font-weight:bold;">✅ Снять наблюдение</button>` : ''}
                    ` : `
                        <button onclick="adminUnblockUser('${user.uid}')" style="padding:6px 14px; background:#4CAF50; color:white; border:none; border-radius:8px; cursor:pointer; font-size:12px; font-weight:bold;">🔓 Разблокировать</button>
                    `}
                    ${!user.hasPremiumAccess ? `
                        <button onclick="adminGivePremium('${user.uid}')" style="padding:6px 14px; background:#FFD700; color:#333; border:none; border-radius:8px; cursor:pointer; font-size:12px; font-weight:bold;">💎 Дать премиум</button>
                    ` : `
                        <button onclick="adminRemovePremium('${user.uid}')" style="padding:6px 14px; background:#F44336; color:white; border:none; border-radius:8px; cursor:pointer; font-size:12px; font-weight:bold;">🔒 Снять премиум</button>
                    `}
                    <button onclick="adminShowLogs('${user.uid}')" style="padding:6px 14px; background:#E0E0E0; color:#333; border:none; border-radius:8px; cursor:pointer; font-size:12px; font-weight:bold;">📋 Логи</button>
                    <button onclick="adminDeleteUser('${user.uid}')" style="padding:6px 14px; background:#555; color:white; border:none; border-radius:8px; cursor:pointer; font-size:12px; font-weight:bold;">🗑️ Удалить</button>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// ========== ДЕЙСТВИЯ АДМИНА ==========
async function adminBlockUser(uid) {
    if (!confirm('Заблокировать пользователя?')) return;
    try {
        await window.db.collection('users').doc(uid).update({ blocked: true, status: 'blocked' });
        await adminLogAction(uid, 'blocked');
        adminLoadData();
    } catch(e) { alert('Ошибка: ' + e.message); }
}

async function adminUnblockUser(uid) {
    if (!confirm('Разблокировать пользователя?')) return;
    try {
        await window.db.collection('users').doc(uid).update({ blocked: false, status: 'ok' });
        await adminLogAction(uid, 'unblocked');
        adminLoadData();
    } catch(e) { alert('Ошибка: ' + e.message); }
}

async function adminSetStatus(uid, status) {
    try {
        await window.db.collection('users').doc(uid).update({ status: status });
        await adminLogAction(uid, 'status_changed', { newStatus: status });
        adminLoadData();
    } catch(e) { alert('Ошибка: ' + e.message); }
}

async function adminGivePremium(uid) {
    if (!confirm('Дать премиум-доступ этому пользователю?')) return;
    try {
        await window.db.collection('users').doc(uid).update({
            hasPremiumAccess: true,
            premiumActivatedAt: new Date().toISOString()
        });
        await adminLogAction(uid, 'premium_given');
        adminLoadData();
    } catch(e) { alert('Ошибка: ' + e.message); }
}

async function adminRemovePremium(uid) {
    if (!confirm('Снять премиум-доступ?')) return;
    try {
        await window.db.collection('users').doc(uid).update({
            hasPremiumAccess: false,
            premiumActivatedAt: null
        });
        await adminLogAction(uid, 'premium_removed');
        adminLoadData();
    } catch(e) { alert('Ошибка: ' + e.message); }
}

async function adminDeleteUser(uid) {
    if (!confirm('⚠️ УДАЛИТЬ ПОЛЬЗОВАТЕЛЯ? Это действие НЕЛЬЗЯ отменить!')) return;
    if (!confirm('Вы уверены? Все данные пользователя будут удалены навсегда.')) return;
    try {
        await window.db.collection('users').doc(uid).delete();
        await adminLogAction(uid, 'deleted');
        alert('✅ Пользователь удалён');
        adminLoadData();
    } catch(e) { alert('Ошибка: ' + e.message); }
}

async function adminLogAction(uid, action, details = {}) {
    try {
        const user = window.auth.currentUser;
        await window.db.collection('admin_actions').add({
            userId: uid,
            adminEmail: user.email,
            action: action,
            details: details,
            timestamp: new Date().toISOString()
        });
    } catch(e) { console.error('Ошибка логирования:', e); }
}

// ========== ЛОГИ ==========
async function adminShowLogs(uid) {
    try {
        const logsSnapshot = await window.db.collection('admin_logs')
            .where('userId', '==', uid)
            .orderBy('timestamp', 'desc')
            .limit(50)
            .get();
        
        let logs = [];
        logsSnapshot.forEach(doc => logs.push(doc.data()));
        
        if (logs.length === 0) {
            alert('📭 Логов у этого пользователя пока нет');
            return;
        }
        
        let text = '📋 Логи пользователя:\n\n';
        logs.forEach(log => {
            const time = new Date(log.timestamp).toLocaleString();
            let flagText = '';
            if (log.flags) {
                const activeFlags = Object.entries(log.flags)
                    .filter(([k,v]) => v === true && k !== 'totalFlags')
                    .map(([k]) => k);
                if (activeFlags.length > 0) {
                    flagText = ' 🚩 ' + activeFlags.join(', ');
                }
            }
            text += `${time} — ${log.event || 'flags_increased'}${flagText}\n`;
        });
        
        alert(text);
        
    } catch(e) {
        console.error('Ошибка загрузки логов:', e);
        alert('Ошибка загрузки логов');
    }
}

// ========== ЭКСПОРТ ==========
window.openAdminPanel = openAdminPanel;
window.closeAdminPanel = closeAdminPanel;
window.adminLoadData = adminLoadData;
window.adminApplyFilters = adminApplyFilters;
window.adminBlockUser = adminBlockUser;
window.adminUnblockUser = adminUnblockUser;
window.adminSetStatus = adminSetStatus;
window.adminGivePremium = adminGivePremium;
window.adminRemovePremium = adminRemovePremium;
window.adminDeleteUser = adminDeleteUser;
window.adminShowLogs = adminShowLogs;

console.log('🛡️ adminModal.js загружен');
