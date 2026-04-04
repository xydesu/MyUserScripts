// ==UserScript==
// @name         osu! 個人資料增強
// @namespace    http://tampermonkey.net/
// @version      1.7
// @description  Enhances osu! user profile pages by adding beatmap cover thumbnails to score lists and a toggle button to hide unearned medals in the achievements section.
// @author       xydesu
// @match        https://osu.ppy.sh/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=osu.ppy.sh
// @grant        GM_addStyle
// @grant        window.onurlchange
// @downloadURL  https://github.com/xydesu/MyUserScripts/raw/refs/heads/main/osu%21%20%E5%80%8B%E4%BA%BA%E8%B3%87%E6%96%99%E5%A2%9E%E5%BC%B7-1.0.user.js
// @updateURL    https://github.com/xydesu/MyUserScripts/raw/refs/heads/main/osu%21%20%E5%80%8B%E4%BA%BA%E8%B3%87%E6%96%99%E5%A2%9E%E5%BC%B7-1.0.user.js
// ==/UserScript==

(function() {
    'use strict';

    // ==========================================
    // 1. 全域設定與樣式 (Global Settings & Styles)
    // ==========================================
    
    // 儲存成就篩選的切換狀態
    let isHideLockedEnabled = false;

    // 注入縮圖與動畫的自訂 CSS
    GM_addStyle(`
        /* 動畫關鍵幀 */
        @keyframes customFadeInUp {
            from { opacity: 0; transform: translateY(10px); }
            to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes customThumbIn {
            from { opacity: 0; transform: scale(0.75); }
            to   { opacity: 1; transform: scale(1); }
        }
        @keyframes customFadeIn {
            from { opacity: 0; }
            to   { opacity: 1; }
        }
        @keyframes customFadeOut {
            from { opacity: 1; }
            to   { opacity: 0; }
        }

        /* 成績列表行淡入上移 */
        .play-detail.custom-animated {
            animation: customFadeInUp 0.35s ease both;
        }

        /* 縮圖彈入 */
        .custom-beatmap-thumb {
            width: 50px;
            height: 35px;
            border-radius: 4px;
            margin-left: 10px;
            margin-right: 10px;
            object-fit: cover;
            flex-shrink: 0;
            animation: customThumbIn 0.25s ease both;
        }

        /* 成就徽章懸停效果 */
        .medals-group .badge-achievement {
            transition: transform 0.15s ease, filter 0.15s ease;
        }
        .medals-group .badge-achievement:hover {
            transform: scale(1.1);
            filter: drop-shadow(0 0 8px rgba(255, 102, 170, 0.55));
        }

        /* 開關按鈕淡入 */
        #toggle-locked-medals-wrapper {
            animation: customFadeIn 0.4s ease both;
        }

        /* 成就徽章隱藏/顯示動畫 */
        .medals-group__medal--hiding {
            animation: customFadeOut 0.3s ease both;
        }
        .medals-group__medal--showing {
            animation: customFadeIn 0.3s ease both;
        }
    `);

    // ==========================================
    // 2. 功能一：成績列表縮圖 (Beatmap Thumbnails)
    // ==========================================
    
    function injectThumbnails() {
        const playDetails = document.querySelectorAll('.play-detail__group--top');
        let newRowIndex = 0;

        playDetails.forEach(group => {
            if (group.querySelector('.custom-beatmap-thumb')) return;

            const titleLink = group.querySelector('.play-detail__title');
            if (!titleLink) return;

            const href = titleLink.getAttribute('href');
            if (!href) return;

            const match = href.match(/beatmapsets\/(\d+)/);
            if (match && match[1]) {
                const setId = match[1];
                const img = document.createElement('img');

                img.src = `https://assets.ppy.sh/beatmaps/${setId}/covers/list.jpg`;
                img.className = 'custom-beatmap-thumb';
                img.alt = 'Beatmap Thumbnail';
                img.onerror = function() { this.style.display = 'none'; };

                const rankIcon = group.querySelector('.play-detail__icon--main');
                if (rankIcon) {
                    rankIcon.insertAdjacentElement('afterend', img);
                }

                // 為整個成績列表行加上入場動畫（含錯開的延遲）
                const row = group.closest('.play-detail');
                if (row && !row.classList.contains('custom-animated')) {
                    row.style.animationDelay = `${newRowIndex * 40}ms`;
                    row.classList.add('custom-animated');
                    newRowIndex++;
                }
            }
        });
    }

    // ==========================================
    // 3. 功能二：成就隱藏開關 (Medals Toggle)
    // ==========================================

    function getCurrentUserId() {
        const jsonEl = document.getElementById('json-current-user');
        if (jsonEl) {
            try {
                const data = JSON.parse(jsonEl.textContent);
                return data && data.id ? String(data.id) : null;
            } catch (e) {}
        }
        return null;
    }

    function getProfileUserId() {
        const jsonEl = document.getElementById('json-user');
        if (jsonEl) {
            try {
                const data = JSON.parse(jsonEl.textContent);
                return data && data.id ? String(data.id) : null;
            } catch (e) {}
        }
        const urlMatch = window.location.pathname.match(/^\/users\/(\d+)/);
        return urlMatch ? urlMatch[1] : null;
    }

    function isOwnProfile() {
        const currentId = getCurrentUserId();
        const profileId = getProfileUserId();
        return currentId !== null && profileId !== null && currentId === profileId;
    }
    
    // 處理分類標題 (若該分類下沒有已獲得成就，隱藏整個分類)
    function updateGroupsVisibility() {
        const medalGroups = document.querySelectorAll('.medals-group__group');
        medalGroups.forEach(group => {
            const allMedals = Array.from(group.querySelectorAll('.badge-achievement'));
            if (allMedals.length === 0) return;

            const allHidden = allMedals.every(m => m.style.display === 'none');

            if (isHideLockedEnabled && allHidden) {
                group.style.display = 'none';
            } else {
                group.style.display = '';
            }
        });
    }

    function updateMedalsVisibility() {
        const lockedMedals = document.querySelectorAll('.badge-achievement--locked');

        if (isHideLockedEnabled) {
            // 淡出後隱藏
            lockedMedals.forEach(medal => {
                const wrapper = medal;
                if (wrapper.style.display === 'none') return;
                wrapper.classList.remove('medals-group__medal--showing');
                wrapper.classList.add('medals-group__medal--hiding');
                wrapper.addEventListener('animationend', () => {
                    wrapper.style.display = 'none';
                    wrapper.classList.remove('medals-group__medal--hiding');
                    updateGroupsVisibility();
                }, { once: true });
            });
        } else {
            // 先顯示元素，再淡入
            lockedMedals.forEach(medal => {
                const wrapper = medal;
                wrapper.style.display = '';
                wrapper.classList.remove('medals-group__medal--hiding');
                wrapper.classList.add('medals-group__medal--showing');
                wrapper.addEventListener('animationend', () => {
                    wrapper.classList.remove('medals-group__medal--showing');
                }, { once: true });
            });
            updateGroupsVisibility();
        }
    }

    function injectToggle() {
        if (!isOwnProfile()) return;
        if (document.getElementById('toggle-locked-medals-wrapper')) return;

        const titleElements = Array.from(document.querySelectorAll('.title--page-extra'));
        const titleElement = titleElements.find(el => el.textContent.includes('成就') || el.textContent.includes('Medals'));

        if (!titleElement) return;

        const titleContainer = titleElement.closest('.u-relative');
        if (!titleContainer) return;

        titleContainer.style.position = 'relative';

        const toggleWrapper = document.createElement('div');
        toggleWrapper.id = 'toggle-locked-medals-wrapper';
        toggleWrapper.style.cssText = `
            position: absolute; 
            right: 40px; 
            top: 25%; 
            transform: translateY(-50%); 
            background: hsl(var(--hsl-b2)); 
            padding: 4px 12px; 
            border-radius: 20px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        `;

        const label = document.createElement('label');
        label.style.cssText = 'cursor: pointer; display: flex; align-items: center; gap: 8px; margin: 0; font-size: 14px; font-weight: normal;';

        const switchDiv = document.createElement('div');
        switchDiv.className = 'osu-switch-v2';

        const checkbox = document.createElement('input');
        checkbox.className = 'osu-switch-v2__input';
        checkbox.type = 'checkbox';
        checkbox.id = 'toggle-locked-medals-checkbox';

        const switchSpan = document.createElement('span');
        switchSpan.className = 'osu-switch-v2__content';

        switchDiv.appendChild(checkbox);
        switchDiv.appendChild(switchSpan);

        const labelText = document.createElement('span');
        labelText.textContent = '只顯示已獲得';

        label.appendChild(switchDiv);
        label.appendChild(labelText);

        checkbox.addEventListener('change', (e) => {
            isHideLockedEnabled = e.target.checked;
            updateMedalsVisibility();
        });

        toggleWrapper.appendChild(label);
        titleContainer.appendChild(toggleWrapper);
    }

    // ==========================================
    // 4. 統一的觀察器 (Unified MutationObserver)
    // ==========================================

    function isUserProfilePage() {
        return /^\/users\//.test(window.location.pathname);
    }

    function onPageLoad() {
        if (!isUserProfilePage()) return;
        // 切換頁面時重置成就篩選狀態
        isHideLockedEnabled = false;
        injectThumbnails();
        if (document.querySelector('.medals-group')) {
            injectToggle();
        }
    }

    const observer = new MutationObserver((mutations) => {
        let hasAddedNodes = false;
        for (const mutation of mutations) {
            if (mutation.addedNodes.length > 0) {
                hasAddedNodes = true;
                break;
            }
        }

        // 只要 DOM 有新增節點，就同時檢查並執行兩個功能的邏輯
        if (hasAddedNodes && isUserProfilePage()) {
            injectThumbnails();

            if (document.querySelector('.medals-group')) {
                injectToggle();
                if (isHideLockedEnabled) {
                    updateMedalsVisibility();
                }
            }
        }
    });

    // 觀察 documentElement 以在 Turbolinks 替換 body 後仍能持續運作
    observer.observe(document.documentElement, { childList: true, subtree: true });

    // 攔截 history.pushState，捕捉 React Router 等所有 SPA 框架的頁面跳轉
    const _origPushState = history.pushState.bind(history);
    history.pushState = function() {
        _origPushState.apply(this, arguments);
        onPageLoad();
    };

    // 監聽各種頁面切換事件
    window.addEventListener('popstate', onPageLoad);           // 瀏覽器前進/後退
    document.addEventListener('turbolinks:load', onPageLoad); // Turbolinks 5
    document.addEventListener('turbo:load', onPageLoad);      // Turbo Drive (@hotwired/turbo)

    // 初始載入時先手動執行一次
    onPageLoad();

})();
