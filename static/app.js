/**
 * VaultKey — SaaS Dashboard Controller
 * Features:
 * - Argon2 + Fernet AES-128 state synchronization
 * - Drag-and-drop category management
 * - Ctrl+N Category Creation
 * - Optional Category (Defaults to Uncategorized)
 * - Username & Password Generator with context badges (Gaming, Work, Office, Stream, Personal)
 * - Save/Download Recovery Key (.txt file)
 * - Bulletproof Auth Gating (Fixes critical recovery cancel bug)
 */

(function () {
    'use strict';

    // Default Preferences
    const DEFAULT_PREFERENCES = {
        layout: 'classic',
        theme: 'dark', // 'dark', 'light', 'system'
        sidebar_collapsed: false,
        view_mode: 'grid', // 'grid' | 'table'
        button_colors: {
            dark: {
                primary_bg: '#ffffff',
                primary_text: '#111111',
                secondary_bg: '#262626',
                secondary_text: '#ffffff',
                primary_hover: '#e4e4e7',
                secondary_hover: '#3f3f46',
                accent: '#ffffff'
            },
            light: {
                primary_bg: '#18181b',
                primary_text: '#ffffff',
                secondary_bg: '#f4f4f5',
                secondary_text: '#18181b',
                primary_hover: '#27272a',
                secondary_hover: '#e4e4e7',
                accent: '#18181b'
            }
        },
        shortcuts: {
            command_palette: 'Ctrl+K',
            settings: 'Ctrl+,',
            toggle_layout: 'Ctrl+Shift+L',
            toggle_theme: 'Ctrl+Shift+D',
            shortcuts_modal: 'Ctrl+/',
            new_category: 'Ctrl+Shift+F',
            new_password: 'Ctrl+Shift+A',
            quick_generator: 'Ctrl+Shift+G'
        },
        sharing: {
            api_url: 'https://vaultkey-share-api.pritishdash44.workers.dev',
            viewer_url: 'https://vaultkey-secret.pages.dev'
        }
    };

    // State
    const state = {
        initialized: false,
        unlocked: false,
        entries: [],
        categories: [],
        recentActivity: [],
        currentFilter: 'all',
        searchQuery: '',
        activeViewEntry: null,
        activeEditEntry: null,
        theme: 'dark',
        preferences: JSON.parse(JSON.stringify(DEFAULT_PREFERENCES)),
        activeSettingsTab: 'appearanceTab',
        activeButtonThemeTarget: 'dark',
        recordingShortcutKey: null,
        commandPaletteFiltered: [],
        commandPaletteActiveIndex: 0,
        draggedEntryId: null,
        pendingDeleteEntry: null,
        contextCategory: null,
        pendingResetSection: null
    };

    // DOM Elements
    const elements = {
        html: document.documentElement,
        app: document.getElementById('app'),
        workspace: document.querySelector('.workspace'),
        topbar: document.querySelector('.topbar'),
        themeToggleBtn: document.getElementById('themeToggleBtn'),
        layoutToggleBtn: document.getElementById('layoutToggleBtn'),
        openSettingsBtn: document.getElementById('openSettingsBtn'),
        shortcutsHelpBtn: document.getElementById('shortcutsHelpBtn'),
        globalSearch: document.getElementById('globalSearch'),
        statTotalCount: document.getElementById('statTotalCount'),
        quickGenBtn: document.getElementById('quickGenBtn'),
        lockVaultBtn: document.getElementById('lockVaultBtn'),
        
        // Navigation & Sidebar
        sidebar: document.querySelector('.sidebar'),
        sidebarCollapseBtn: document.getElementById('sidebarCollapseBtn'),
        sidebarGenNavBtn: document.getElementById('sidebarGenNavBtn'),
        sidebarPaletteNavBtn: document.getElementById('sidebarPaletteNavBtn'),
        sidebarSettingsNavBtn: document.getElementById('sidebarSettingsNavBtn'),
        sidebarThemeToggleBtn: document.getElementById('sidebarThemeToggleBtn'),
        sidebarLayoutToggleBtn: document.getElementById('sidebarLayoutToggleBtn'),
        sidebarLockVaultBtn: document.getElementById('sidebarLockVaultBtn'),
        countAll: document.getElementById('countAll'),
        countRecent: document.getElementById('countRecent'),
        countCategories: document.getElementById('countCategories'),
        categoryNavList: document.getElementById('categoryNavList'),
        sidebarCatSearchWrap: document.getElementById('sidebarCatSearchWrap'),
        sidebarCatSearchInput: document.getElementById('sidebarCatSearchInput'),
        sidebarCatScrollContainer: document.getElementById('sidebarCatScrollContainer'),
        sidebarAddCatBtn: document.getElementById('sidebarAddCatBtn'),
        
        // SaaS Tabs Bar (Layout 2)
        saasTabBar: document.getElementById('saasTabBar'),
        saasTabAll: document.getElementById('saasTabAll'),
        saasTabRecent: document.getElementById('saasTabRecent'),
        saasCountAll: document.getElementById('saasCountAll'),
        saasCountRecent: document.getElementById('saasCountRecent'),
        saasCategoriesScrollWrapper: document.getElementById('saasCategoriesScrollWrapper'),
        saasScrollLeftBtn: document.getElementById('saasScrollLeftBtn'),
        saasScrollRightBtn: document.getElementById('saasScrollRightBtn'),
        saasCategoryTabs: document.getElementById('saasCategoryTabs'),
        saasMoreCatsContainer: document.getElementById('saasMoreCatsContainer'),
        saasMoreCatsBtn: document.getElementById('saasMoreCatsBtn'),
        saasMoreCatsDropdown: document.getElementById('saasMoreCatsDropdown'),
        saasMoreCount: document.getElementById('saasMoreCount'),
        saasDropdownTotalBadge: document.getElementById('saasDropdownTotalBadge'),
        saasMoreCatsList: document.getElementById('saasMoreCatsList'),
        saasCatSearchInput: document.getElementById('saasCatSearchInput'),
        saasAddCatBtn: document.getElementById('saasAddCatBtn'),

        currentViewTitle: document.getElementById('currentViewTitle'),
        currentViewDesc: document.getElementById('currentViewDesc'),
        openNewCategoryModalBtn: document.getElementById('openNewCategoryModalBtn'),
        categoryContextMenu: document.getElementById('categoryContextMenu'),
        contextEditCategoryBtn: document.getElementById('contextEditCategoryBtn'),
        contextDeleteCategoryBtn: document.getElementById('contextDeleteCategoryBtn'),
        
        // Recent Strip
        recentStripSection: document.getElementById('recentStripSection'),
        recentUsesRow: document.getElementById('recentUsesRow'),
        
        // View Mode Switcher & Containers
        viewModeToggleGroup: document.getElementById('viewModeToggleGroup'),
        viewModeGridBtn: document.getElementById('viewModeGridBtn'),
        viewModeTableBtn: document.getElementById('viewModeTableBtn'),
        entriesCardsGrid: document.getElementById('entriesCardsGrid'),
        entriesTableContainer: document.getElementById('entriesTableContainer'),

        // Table & Empty state
        entriesTableBody: document.getElementById('entriesTableBody'),
        emptyState: document.getElementById('emptyState'),
        emptyAddBtn: document.getElementById('emptyAddBtn'),
        openNewEntryModalBtn: document.getElementById('openNewEntryModalBtn'),
        
        // Category Modals
        newCatModal: document.getElementById('newCatModal'),
        newCatForm: document.getElementById('newCatForm'),
        newCatNameInput: document.getElementById('newCatNameInput'),
        editCatModal: document.getElementById('editCatModal'),
        editCatForm: document.getElementById('editCatForm'),
        editCatOldNameInput: document.getElementById('editCatOldNameInput'),
        editCatNewNameInput: document.getElementById('editCatNewNameInput'),

        // Delete Confirmation Modal
        deleteConfirmModal: document.getElementById('deleteConfirmModal'),
        deleteTargetTitle: document.getElementById('deleteTargetTitle'),
        deleteConfirmInput: document.getElementById('deleteConfirmInput'),
        executeDeleteBtn: document.getElementById('executeDeleteBtn'),

        // Add/Edit Modal
        entryModal: document.getElementById('entryModal'),
        entryModalTitle: document.getElementById('entryModalTitle'),
        entryForm: document.getElementById('entryForm'),
        formEntryId: document.getElementById('formEntryId'),
        formTitle: document.getElementById('formTitle'),
        formCategory: document.getElementById('formCategory'),
        categoryCombobox: document.getElementById('categoryCombobox'),
        comboboxToggleBtn: document.getElementById('comboboxToggleBtn'),
        categoryDropdownList: document.getElementById('categoryDropdownList'),
        formAvatar: document.getElementById('formAvatar'),
        avatarCurrentPreview: document.getElementById('avatarCurrentPreview'),
        avatarPreviewLabel: document.getElementById('avatarPreviewLabel'),
        avatarPresetChips: document.getElementById('avatarPresetChips'),
        avatarCustomInput: document.getElementById('avatarCustomInput'),
        formUsername: document.getElementById('formUsername'),
        formPassword: document.getElementById('formPassword'),
        strengthBar: document.getElementById('strengthBar'),
        customFieldsList: document.getElementById('customFieldsList'),
        addCustomFieldBtn: document.getElementById('addCustomFieldBtn'),
        toggleFormPasswordBtn: document.getElementById('toggleFormPasswordBtn'),
        
        // View Modal
        viewModal: document.getElementById('viewModal'),
        viewTitle: document.getElementById('viewTitle'),
        viewCategoryBadge: document.getElementById('viewCategoryBadge'),
        viewUsername: document.getElementById('viewUsername'),
        viewPassword: document.getElementById('viewPassword'),
        viewCustomFieldsBlock: document.getElementById('viewCustomFieldsBlock'),
        viewCustomList: document.getElementById('viewCustomList'),
        viewCopyUsernameBtn: document.getElementById('viewCopyUsernameBtn'),
        viewCopyPasswordBtn: document.getElementById('viewCopyPasswordBtn'),
        viewTogglePwBtn: document.getElementById('viewTogglePwBtn'),
        viewShareBtn: document.getElementById('viewShareBtn'),
        viewEditBtn: document.getElementById('viewEditBtn'),
        viewDeleteBtn: document.getElementById('viewDeleteBtn'),
        
        // Generator Modal
        genModal: document.getElementById('genModal'),
        genResult: document.getElementById('genResult'),
        genLength: document.getElementById('genLength'),
        genLenDisplay: document.getElementById('genLenDisplay'),
        genUpper: document.getElementById('genUpper'),
        genLower: document.getElementById('genLower'),
        genNums: document.getElementById('genNums'),
        genSyms: document.getElementById('genSyms'),
        regenPasswordBtn: document.getElementById('regenPasswordBtn'),
        copyGenResultBtn: document.getElementById('copyGenResultBtn'),
        
        // Settings Modal & Sections
        settingsModal: document.getElementById('settingsModal'),
        settingsTabBtns: document.querySelectorAll('.settings-tab-btn'),
        settingsTabContents: document.querySelectorAll('.settings-tab-content'),
        themeChoiceCards: document.querySelectorAll('.theme-choice-card'),
        cardLayoutClassic: document.getElementById('cardLayoutClassic'),
        cardLayoutSidebar: document.getElementById('cardLayoutSidebar'),
        
        // Button Appearance Controls
        btnThemeTargetDark: document.getElementById('btnThemeTargetDark'),
        btnThemeTargetLight: document.getElementById('btnThemeTargetLight'),
        pickerPrimaryBg: document.getElementById('pickerPrimaryBg'),
        hexPrimaryBg: document.getElementById('hexPrimaryBg'),
        pickerPrimaryText: document.getElementById('pickerPrimaryText'),
        hexPrimaryText: document.getElementById('hexPrimaryText'),
        pickerSecondaryBg: document.getElementById('pickerSecondaryBg'),
        hexSecondaryBg: document.getElementById('hexSecondaryBg'),
        pickerSecondaryText: document.getElementById('pickerSecondaryText'),
        hexSecondaryText: document.getElementById('hexSecondaryText'),
        pickerPrimaryHover: document.getElementById('pickerPrimaryHover'),
        hexPrimaryHover: document.getElementById('hexPrimaryHover'),
        pickerAccent: document.getElementById('pickerAccent'),
        hexAccent: document.getElementById('hexAccent'),
        contrastWarningBox: document.getElementById('contrastWarningBox'),
        contrastWarningText: document.getElementById('contrastWarningText'),
        primaryContrastPill: document.getElementById('primaryContrastPill'),
        secondaryContrastPill: document.getElementById('secondaryContrastPill'),
        previewPrimaryBtn: document.getElementById('previewPrimaryBtn'),
        previewSecondaryBtn: document.getElementById('previewSecondaryBtn'),
        previewAccentBadge: document.getElementById('previewAccentBadge'),
        previewDangerBtn: document.getElementById('previewDangerBtn'),
        resetButtonColorsBtn: document.getElementById('resetButtonColorsBtn'),

        // Shortcuts Tab Controls
        shortcutsTableBody: document.getElementById('shortcutsTableBody'),
        shortcutConflictAlert: document.getElementById('shortcutConflictAlert'),
        shortcutConflictText: document.getElementById('shortcutConflictText'),
        resetShortcutsBtn: document.getElementById('resetShortcutsBtn'),

        // Reset Tab Controls
        resetBtnColorsActionBtn: document.getElementById('resetBtnColorsActionBtn'),
        resetShortcutsActionBtn: document.getElementById('resetShortcutsActionBtn'),
        resetAllPrefsActionBtn: document.getElementById('resetAllPrefsActionBtn'),

        // Command Palette Modal
        commandPaletteModal: document.getElementById('commandPaletteModal'),
        commandPaletteInput: document.getElementById('commandPaletteInput'),
        commandPaletteResults: document.getElementById('commandPaletteResults'),

        // Shortcuts Reference Modal
        shortcutsHelpModal: document.getElementById('shortcutsHelpModal'),
        shortcutsHelpContent: document.getElementById('shortcutsHelpContent'),
        openSettingsShortcutsFromHelpBtn: document.getElementById('openSettingsShortcutsFromHelpBtn'),

        // Confirm Reset Modal
        resetConfirmModal: document.getElementById('resetConfirmModal'),
        resetConfirmMessage: document.getElementById('resetConfirmMessage'),
        confirmResetActionBtn: document.getElementById('confirmResetActionBtn'),

        // Auth Modals
        setupModal: document.getElementById('setupModal'),
        setupForm: document.getElementById('setupForm'),
        setupPassword: document.getElementById('setupPassword'),
        setupPasswordConfirm: document.getElementById('setupPasswordConfirm'),
        
        recoveryKeyModal: document.getElementById('recoveryKeyModal'),
        displayRecoveryKey: document.getElementById('displayRecoveryKey'),
        copyRecoveryKeyBtn: document.getElementById('copyRecoveryKeyBtn'),
        downloadRecoveryKeyBtn: document.getElementById('downloadRecoveryKeyBtn'),
        doneRecoveryKeyBtn: document.getElementById('doneRecoveryKeyBtn'),
        
        loginModal: document.getElementById('loginModal'),
        loginForm: document.getElementById('loginForm'),
        loginPassword: document.getElementById('loginPassword'),
        loginErrorMsg: document.getElementById('loginErrorMsg'),
        openRecoverModalBtn: document.getElementById('openRecoverModalBtn'),
        
        recoverModal: document.getElementById('recoverModal'),
        recoverForm: document.getElementById('recoverForm'),
        recoverKeyInput: document.getElementById('recoverKeyInput'),
        recoverNewPwInput: document.getElementById('recoverNewPwInput'),
        recoverCancelBtn: document.getElementById('recoverCancelBtn'),
        recoverCloseTopBtn: document.getElementById('recoverCloseTopBtn'),
        
        // Secure Share Modal (Zero-Knowledge)
        shareModal: document.getElementById('shareModal'),
        shareConfigStage: document.getElementById('shareConfigStage'),
        shareResultStage: document.getElementById('shareResultStage'),
        shareModalTargetTitle: document.getElementById('shareModalTargetTitle'),
        shareModalTargetUname: document.getElementById('shareModalTargetUname'),
        shareOptPassword: document.getElementById('shareOptPassword'),
        shareOptUsername: document.getElementById('shareOptUsername'),
        shareOptTitle: document.getElementById('shareOptTitle'),
        shareOptCustomWrap: document.getElementById('shareOptCustomWrap'),
        shareOptCustom: document.getElementById('shareOptCustom'),
        shareExpOptions: document.querySelectorAll('input[name="shareExpOption"]'),
        shareCustomExpRow: document.getElementById('shareCustomExpRow'),
        shareCustomExpVal: document.getElementById('shareCustomExpVal'),
        shareCustomExpUnit: document.getElementById('shareCustomExpUnit'),
        generateShareBtn: document.getElementById('generateShareBtn'),
        shareResultTargetTitle: document.getElementById('shareResultTargetTitle'),
        shareModalTimer: document.getElementById('shareModalTimer'),
        shareLinkInput: document.getElementById('shareLinkInput'),
        copyShareLinkBtn: document.getElementById('copyShareLinkBtn'),
        openShareLinkBtn: document.getElementById('openShareLinkBtn'),
        shareCodeDisplay: document.getElementById('shareCodeDisplay'),
        copyShareCodeBtn: document.getElementById('copyShareCodeBtn'),
        copyAllShareInfoBtn: document.getElementById('copyAllShareInfoBtn'),
        revokeCurrentShareBtn: document.getElementById('revokeCurrentShareBtn'),
        shareConfigBackBtn: document.getElementById('shareConfigBackBtn'),

        // Cloud Sharing Settings
        prefSharingApiUrl: document.getElementById('prefSharingApiUrl'),
        prefSharingViewerUrl: document.getElementById('prefSharingViewerUrl'),
        testSharingConnBtn: document.getElementById('testSharingConnBtn'),
        testSharingConnStatus: document.getElementById('testSharingConnStatus'),
        saveSharingSettingsBtn: document.getElementById('saveSharingSettingsBtn'),
        activeSharesList: document.getElementById('activeSharesList'),
        noActiveSharesNotice: document.getElementById('noActiveSharesNotice'),

        toastContainer: document.getElementById('toastContainer')
    };

    // ==================== COLOR & CONTRAST UTILITIES ====================
    function hexToRgb(hex) {
        if (!hex || typeof hex !== 'string') return null;
        let clean = hex.replace('#', '').trim();
        if (clean.length === 3) {
            clean = clean.split('').map(c => c + c).join('');
        }
        if (clean.length !== 6) return null;
        const num = parseInt(clean, 16);
        if (isNaN(num)) return null;
        return {
            r: (num >> 16) & 255,
            g: (num >> 8) & 255,
            b: num & 255
        };
    }

    function getRelativeLuminance(rgb) {
        const a = [rgb.r, rgb.g, rgb.b].map(v => {
            v /= 255;
            return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
    }

    function calculateContrastRatio(hex1, hex2) {
        const rgb1 = hexToRgb(hex1);
        const rgb2 = hexToRgb(hex2);
        if (!rgb1 || !rgb2) return 21.0;
        const l1 = getRelativeLuminance(rgb1);
        const l2 = getRelativeLuminance(rgb2);
        const brighter = Math.max(l1, l2);
        const darker = Math.min(l1, l2);
        return parseFloat(((brighter + 0.05) / (darker + 0.05)).toFixed(1));
    }

    function isValidHex(hex) {
        return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(hex);
    }

    // Toast notification
    function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <span>${type === 'success' ? '✓' : '!'}</span>
            <span>${escapeHtml(message)}</span>
        `;
        elements.toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 200);
        }, 2200);
    }

    // Clipboard helper
    async function copyToClipboard(text, successMsg = 'Copied to clipboard!') {
        if (!text) return;
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
            } else {
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                document.execCommand('copy');
                textArea.remove();
            }
            showToast(successMsg, 'success');
        } catch (err) {
            showToast('Failed to copy to clipboard', 'danger');
        }
    }

    // API Service
    async function apiRequest(endpoint, method = 'GET', body = null) {
        const options = {
            method,
            headers: { 'Content-Type': 'application/json' }
        };
        if (body) {
            options.body = JSON.stringify(body);
        }
        try {
            const res = await fetch(endpoint, options);
            const data = await res.json();
            return { ok: res.ok, status: res.status, data };
        } catch (err) {
            return { ok: false, status: 0, data: { error: 'Network error or server offline.' } };
        }
    }

    // Modal Control Helper
    function openModal(modalEl) {
        if (!modalEl) return;
        modalEl.classList.remove('hidden');
    }

    function closeModal(modalEl) {
        if (!modalEl) return;
        modalEl.classList.add('hidden');
        if (!state.unlocked && modalEl !== elements.loginModal && modalEl !== elements.recoverModal && modalEl !== elements.setupModal) {
            enforceAuthGate();
        }
    }

    // Generic Modal Close Button Listener
    document.querySelectorAll('.modal-close-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const targetId = btn.getAttribute('data-close');
            if (targetId) {
                const el = document.getElementById(targetId);
                if (el) closeModal(el);
            }
        });
    });

    // Close on backdrop click (strictly preventing auth bypass)
    document.querySelectorAll('.modal-backdrop').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                // If vault is locked or uninitialized, do NOT allow backdrop dismiss
                if (!state.unlocked || modal.id === 'loginModal' || modal.id === 'setupModal' || modal.id === 'recoveryKeyModal') {
                    return;
                }
                closeModal(modal);
            }
        });
    });

    // ==================== AUTH GATE (Fixes Bug #8 & #7) ====================
    function enforceAuthGate() {
        if (!state.initialized) {
            // New user: must see setup modal
            elements.workspace.classList.add('vault-locked-blur');
            state.entries = [];
            state.categories = [];
            elements.entriesTableBody.innerHTML = '';
            elements.loginModal.classList.add('hidden');
            elements.recoverModal.classList.add('hidden');
            elements.setupModal.classList.remove('hidden');
            return false;
        }

        if (!state.unlocked) {
            // Locked vault: workspace MUST be blurred and emptied
            elements.workspace.classList.add('vault-locked-blur');
            state.entries = [];
            state.categories = [];
            elements.entriesTableBody.innerHTML = '';
            
            // If recover modal is not currently open, login modal MUST be open
            if (elements.recoverModal.classList.contains('hidden')) {
                elements.loginModal.classList.remove('hidden');
            }
            return false;
        }

        // Vault is unlocked
        elements.workspace.classList.remove('vault-locked-blur');
        return true;
    }

    // Check Status on Load
    async function checkStatus() {
        const res = await apiRequest('/api/status');
        if (!res.ok) {
            showToast('Unable to connect to local vault server', 'danger');
            return;
        }

        state.initialized = Boolean(res.data.initialized);
        state.unlocked = Boolean(res.data.unlocked);

        if (!state.initialized) {
            enforceAuthGate();
        } else if (!state.unlocked) {
            enforceAuthGate();
        } else {
            elements.workspace.classList.remove('vault-locked-blur');
            await loadEntries();
        }
    }

    // Load Entries & Refresh Dashboard
    async function loadEntries() {
        const res = await apiRequest('/api/entries');
        if (!res.ok) {
            if (res.status === 401) {
                state.unlocked = false;
                enforceAuthGate();
            }
            return;
        }

        state.entries = res.data.entries || [];
        state.categories = res.data.categories || [];
        state.recentActivity = deduplicateRecentList(res.data.recent_activity || []);

        renderDashboard();
    }

    // Render Dashboard
    function renderDashboard() {
        elements.statTotalCount.textContent = state.entries.length;
        elements.countAll.textContent = state.entries.length;
        elements.countRecent.textContent = state.recentActivity.length;
        elements.countCategories.textContent = state.categories.length;

        renderCategories();
        renderRecentStrip();
        renderTable();
    }

    // ==================== BRAND ICONS & AVATAR GENERATION ====================
    const BRAND_ICONS = {
        steam: `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.495 0 4.524 2.029 4.524 4.524s-2.029 4.524-4.524 4.524a4.53 4.53 0 0 1-1.777-.363l-4.086 2.91a2.91 2.91 0 0 1 .006.195c0 1.611-1.312 2.924-2.924 2.924-1.397 0-2.569-.982-2.859-2.289L.375 14.542C1.724 20.021 6.386 24 11.979 24c6.627 0 12-5.373 12-12s-5.373-12-12-12zm-3.613 16.035c-.947 0-1.716-.768-1.716-1.715 0-.948.769-1.716 1.716-1.716.947 0 1.715.768 1.715 1.716 0 .947-.768 1.715-1.715 1.715zm7.573-4.83c-1.25 0-2.262-1.012-2.262-2.262 0-1.25 1.012-2.262 2.262-2.262 1.25 0 2.262 1.012 2.262 2.262 0 1.25-1.012 2.262-2.262 2.262z"/></svg>`,
        google: `<svg viewBox="0 0 24 24" width="20" height="20"><path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/><path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.17 0 9.99 0 12s.45 3.83 1.25 5.42l4.03-3.15z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/></svg>`,
        github: `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>`,
        netflix: `<svg viewBox="0 0 24 24" width="20" height="20" fill="#E50914"><path d="M5.398 0v24c1.884-.39 3.754-.88 5.612-1.47V0H5.398zm7.59 0v16.14l4.614 7.86h5.398V0h-5.398v14.47L13.988 0H12.99z"/></svg>`,
        discord: `<svg viewBox="0 0 24 24" width="20" height="20" fill="#5865F2"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>`,
        spotify: `<svg viewBox="0 0 24 24" width="20" height="20" fill="#1DB954"><path d="M12 0C5.372 0 0 5.372 0 12s5.372 12 12 12 12-5.372 12-12S18.628 0 12 0zm5.508 17.308c-.216.353-.674.467-1.027.251-2.814-1.72-6.356-2.109-10.528-1.156-.403.092-.806-.157-.898-.56-.092-.403.157-.806.56-.898 4.568-1.044 8.487-.597 11.642 1.336.353.216.467.674.251 1.027zm1.47-3.267c-.272.441-.849.58-1.29.308-3.221-1.98-8.131-2.553-11.942-1.396-.498.151-1.025-.133-1.176-.631-.151-.498.133-1.025.631-1.176 4.356-1.322 9.776-.682 13.469 1.589.441.272.58.849.308 1.306zm.126-3.41c-3.863-2.294-10.237-2.506-13.916-1.39-.594.18-1.226-.16-1.406-.754-.18-.594.16-1.226.754-1.406 4.234-1.285 11.276-1.037 15.708 1.594.536.318.712 1.01.394 1.546-.318.536-1.01.712-1.534.41z"/></svg>`,
        amazon: `<svg viewBox="0 0 24 24" width="20" height="20" fill="#FF9900"><path d="M13.925 15.688c-2.488 1.838-6.108 2.812-9.256 2.812-4.418 0-8.39-1.636-11.39-4.375-.24-.218-.026-.514.264-.348 3.24 1.854 7.228 2.969 11.314 2.969 2.784 0 5.828-.604 8.605-1.856.423-.19.782.293.463.798zm1.092-1.417c-.318-.407-2.106-.192-2.912-.097-.245.029-.283-.186-.062-.341 1.433-1.009 3.784-.718 4.053-.383.27.336-.07 2.684-1.42 3.794-.207.17-.406.08-.316-.145.297-.736.877-2.31.657-2.828zM15.83 5.437c-.332-.249-.785-.436-1.357-.56-.573-.125-1.205-.187-1.895-.187-1.398 0-2.483.33-3.255.99-.772.66-1.158 1.603-1.158 2.83 0 .749.167 1.378.502 1.888.335.51.815.897 1.44 1.162.625.265 1.378.431 2.26.498l1.465.112v.636c0 .872-.224 1.517-.672 1.936-.448.419-1.127.629-2.036.629-.636 0-1.229-.115-1.78-.344-.551-.23-1.002-.555-1.353-.976l-1.34 1.34c.594.664 1.317 1.168 2.169 1.512.852.344 1.77.516 2.754.516 1.636 0 2.894-.424 3.774-1.272.88-.848 1.32-2.126 1.32-3.834V7.558c0-.858.288-1.287.864-1.287.234 0 .468.033.702.099l.836-1.783c-.49-.24-.97-.417-1.44-.53-.47-.113-.975-.17-1.515-.17-.674 0-1.258.183-1.752.55zm-2.008 3.541v.834l-1.144-.093c-.636-.052-1.118-.184-1.446-.396-.328-.212-.492-.55-.492-1.014 0-.464.185-.826.555-1.086.37-.26.906-.39 1.608-.39.53 0 .973.08 1.33.24.357.16.593.407.708.742.115.335.173.652.173.951l-.292.212z"/></svg>`,
        apple: `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.07c.6-0.73 1.01-1.75.9-2.77-.87.04-1.92.58-2.54 1.31-.56.64-.99 1.67-.86 2.66.98.08 1.96-.51 2.5-1.2"/></svg>`,
        microsoft: `<svg viewBox="0 0 24 24" width="20" height="20"><path fill="#f25022" d="M1 1h10v10H1z"/><path fill="#00a4ef" d="M1 13h10v10H1z"/><path fill="#7fba00" d="M13 1h10v10H13z"/><path fill="#ffb900" d="M13 13h10v10H13z"/></svg>`,
        twitter: `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`,
        x: `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`,
        paypal: `<svg viewBox="0 0 24 24" width="20" height="20" fill="#003087"><path d="M20.067 8.478c-.492.88-1.22 1.547-2.148 1.983-.873.407-1.92.612-3.111.612h-2.133l-.847 5.372h-3.41l2.42-15.347h5.811c1.84 0 3.238.452 4.148 1.344.912.89 1.25 2.158.98 3.766-.184 1.135-.694 2.046-1.71 2.27zm-3.567-3.15c-.47-.487-1.282-.73-2.42-.73h-2.22l-1.077 6.822h1.84c1.233 0 2.115-.262 2.628-.78.524-.528.847-1.342.96-2.423.08-.756-.09-1.385-.45-1.89z"/></svg>`
    };

    function getServiceAvatarHtml(title = '', avatar = '', category = '') {
        const cleanTitle = (title || '').trim();
        const lowerTitle = cleanTitle.toLowerCase();
        const cleanAvatar = (avatar || '').trim();
        const lowerCat = (category || '').toLowerCase();

        // 1. Explicit Custom Avatar
        if (cleanAvatar) {
            if (cleanAvatar.startsWith('emoji:')) {
                return `<div class="card-avatar avatar-emoji">${escapeHtml(cleanAvatar.slice(6))}</div>`;
            }
            if (cleanAvatar.startsWith('<svg') || cleanAvatar.startsWith('&lt;svg')) {
                return `<div class="card-avatar avatar-svg">${cleanAvatar}</div>`;
            }
            return `<div class="card-avatar avatar-emoji">${escapeHtml(cleanAvatar)}</div>`;
        }

        // 2. Auto-detect from Known Brands
        for (const [brand, svg] of Object.entries(BRAND_ICONS)) {
            if (lowerTitle.includes(brand)) {
                return `<div class="card-avatar avatar-brand avatar-brand-${brand}">${svg}</div>`;
            }
        }

        // 3. Category Fallback Icons
        if (lowerCat.includes('gaming') || lowerCat.includes('game')) {
            return `<div class="card-avatar avatar-emoji">🎮</div>`;
        }
        if (lowerCat.includes('work') || lowerCat.includes('office') || lowerCat.includes('job')) {
            return `<div class="card-avatar avatar-emoji">💼</div>`;
        }
        if (lowerCat.includes('finance') || lowerCat.includes('bank') || lowerCat.includes('stock') || lowerCat.includes('crypto')) {
            return `<div class="card-avatar avatar-emoji">💳</div>`;
        }
        if (lowerCat.includes('dev') || lowerCat.includes('tech') || lowerCat.includes('code')) {
            return `<div class="card-avatar avatar-emoji">💻</div>`;
        }
        if (lowerCat.includes('social') || lowerCat.includes('chat')) {
            return `<div class="card-avatar avatar-emoji">🌐</div>`;
        }

        // 4. Clean Letter Monogram
        const letter = (cleanTitle.charAt(0) || 'K').toUpperCase();
        return `<div class="card-avatar avatar-letter">${escapeHtml(letter)}</div>`;
    }

    // Render Categories & Setup Drop Targets with Overflow Management (Issue 1)
    function renderCategories() {
        elements.categoryNavList.innerHTML = '';
        if (elements.saasCategoryTabs) {
            elements.saasCategoryTabs.innerHTML = '';
        }
        if (elements.saasMoreCatsList) {
            elements.saasMoreCatsList.innerHTML = '';
        }

        // Ensure Uncategorized is in the list
        const allCats = state.categories.slice();
        if (!allCats.includes('Uncategorized')) {
            allCats.push('Uncategorized');
        }

        // Common category context menu trigger
        const showCategoryMenu = (e, cat, count, isSystem) => {
            e.preventDefault();
            e.stopPropagation();
            state.contextCategory = { cat, count, isSystem };

            const menuWidth = 160;
            const menuHeight = 85;
            const x = Math.min(e.clientX, window.innerWidth - menuWidth - 8);
            const y = Math.min(e.clientY, window.innerHeight - menuHeight - 8);
            elements.categoryContextMenu.style.left = `${Math.max(8, x)}px`;
            elements.categoryContextMenu.style.top = `${Math.max(8, y)}px`;
            elements.categoryContextMenu.classList.remove('hidden');
        };

        // Common category drop handler
        const handleCategoryDrop = async (e, targetBtn, cat) => {
            e.preventDefault();
            targetBtn.classList.remove('drag-over');
            const entryId = e.dataTransfer.getData('text/plain') || state.draggedEntryId;
            if (!entryId) return;

            const targetCategory = cat;
            const entry = state.entries.find(it => it.id === entryId);
            if (!entry || entry.category === targetCategory) return;

            const res = await apiRequest('/api/entries/category', 'PUT', {
                id: entryId,
                category: targetCategory
            });

            if (res.ok) {
                entry.category = targetCategory;
                showToast(`Moved "${entry.title || entry.uname}" to "${targetCategory}"!`);
                renderDashboard();
            } else {
                showToast('Failed to change category', 'danger');
            }
        };

        // 1. Sidebar Categories (Classic Layout)
        allCats.forEach(cat => {
            const count = state.entries.filter(e => (e.category || 'Uncategorized') === cat).length;
            const isSystem = cat.toLowerCase() === 'uncategorized';

            const li = document.createElement('li');
            li.innerHTML = `
                <button class="nav-item ${state.currentFilter === cat ? 'active' : ''}" data-filter="${escapeHtml(cat)}" data-category="${escapeHtml(cat)}" title="Right-click for options (Edit / Delete)">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                    </svg>
                    <span>${escapeHtml(cat)}</span>
                    <span class="nav-count">${count}</span>
                </button>
            `;

            const btn = li.querySelector('.nav-item');
            btn.addEventListener('click', () => setFilter(cat));
            btn.addEventListener('contextmenu', (e) => showCategoryMenu(e, cat, count, isSystem));
            li.addEventListener('contextmenu', (e) => showCategoryMenu(e, cat, count, isSystem));

            btn.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                btn.classList.add('drag-over');
            });
            btn.addEventListener('dragleave', () => btn.classList.remove('drag-over'));
            btn.addEventListener('drop', (e) => handleCategoryDrop(e, btn, cat));

            elements.categoryNavList.appendChild(li);
        });

        // Sidebar search input filter setup (Issue 1)
        if (elements.sidebarCatSearchWrap) {
            elements.sidebarCatSearchWrap.classList.toggle('hidden', allCats.length <= 6);
        }
        if (elements.sidebarCatSearchInput) {
            elements.sidebarCatSearchInput.oninput = (e) => {
                const q = e.target.value.toLowerCase().trim();
                elements.categoryNavList.querySelectorAll('li').forEach(li => {
                    const btn = li.querySelector('.nav-item');
                    const catName = btn ? (btn.getAttribute('data-category') || '').toLowerCase() : '';
                    li.style.display = catName.includes(q) ? '' : 'none';
                });
            };
        }

        // 2. SaaS Category Tabs & Overflow Management (Layout 2)
        if (elements.saasCategoryTabs) {
            elements.saasCategoryTabs.innerHTML = '';

            // Render ALL category tabs into the scrollable category tab bar
            allCats.forEach(cat => {
                const count = state.entries.filter(e => (e.category || 'Uncategorized') === cat).length;
                const isSystem = cat.toLowerCase() === 'uncategorized';

                const tabBtn = document.createElement('button');
                tabBtn.type = 'button';
                tabBtn.className = `saas-tab ${state.currentFilter === cat ? 'active' : ''}`;
                tabBtn.setAttribute('data-tab-filter', cat);
                tabBtn.setAttribute('data-category', cat);
                tabBtn.setAttribute('title', `${cat} (${count} passwords) - Right-click for options`);
                tabBtn.innerHTML = `
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                    </svg>
                    <span>${escapeHtml(cat)}</span>
                    <span class="saas-tab-badge">${count}</span>
                `;

                tabBtn.addEventListener('click', () => setFilter(cat));
                tabBtn.addEventListener('contextmenu', (e) => showCategoryMenu(e, cat, count, isSystem));
                tabBtn.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    tabBtn.classList.add('drag-over');
                });
                tabBtn.addEventListener('dragleave', () => tabBtn.classList.remove('drag-over'));
                tabBtn.addEventListener('drop', (e) => handleCategoryDrop(e, tabBtn, cat));

                elements.saasCategoryTabs.appendChild(tabBtn);
            });

            // Quick Category Popover / Overflow Dropdown
            if (elements.saasMoreCatsContainer && elements.saasMoreCatsList) {
                if (allCats.length > 5) {
                    elements.saasMoreCatsContainer.classList.remove('hidden');
                    if (elements.saasMoreCount) elements.saasMoreCount.textContent = allCats.length;
                    if (elements.saasDropdownTotalBadge) elements.saasDropdownTotalBadge.textContent = `${allCats.length} total`;

                    const isAnyCatActive = state.currentFilter !== 'all' && state.currentFilter !== 'recent';
                    if (elements.saasMoreCatsBtn) {
                        elements.saasMoreCatsBtn.classList.toggle('active', isAnyCatActive);
                    }

                    elements.saasMoreCatsList.innerHTML = '';
                    allCats.forEach(cat => {
                        const count = state.entries.filter(e => (e.category || 'Uncategorized') === cat).length;
                        const isSystem = cat.toLowerCase() === 'uncategorized';

                        const itemBtn = document.createElement('button');
                        itemBtn.type = 'button';
                        itemBtn.className = `saas-dropdown-item ${state.currentFilter === cat ? 'active' : ''}`;
                        itemBtn.setAttribute('data-tab-filter', cat);
                        itemBtn.setAttribute('data-cat', cat);
                        itemBtn.innerHTML = `
                            <span class="saas-dropdown-name">${escapeHtml(cat)}</span>
                            <span class="saas-dropdown-count">${count}</span>
                        `;

                        itemBtn.addEventListener('click', (e) => {
                            e.stopPropagation();
                            setFilter(cat);
                            if (elements.saasMoreCatsDropdown) {
                                elements.saasMoreCatsDropdown.classList.add('hidden');
                            }
                            const targetTab = elements.saasCategoryTabs.querySelector(`[data-category="${CSS.escape(cat)}"]`);
                            if (targetTab) {
                                targetTab.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                            }
                        });

                        itemBtn.addEventListener('contextmenu', (e) => showCategoryMenu(e, cat, count, isSystem));
                        itemBtn.addEventListener('dragover', (e) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = 'move';
                            itemBtn.classList.add('drag-over');
                        });
                        itemBtn.addEventListener('dragleave', () => itemBtn.classList.remove('drag-over'));
                        itemBtn.addEventListener('drop', (e) => handleCategoryDrop(e, itemBtn, cat));

                        elements.saasMoreCatsList.appendChild(itemBtn);
                    });

                    // Search input filtering for More dropdown
                    if (elements.saasCatSearchInput) {
                        elements.saasCatSearchInput.oninput = (e) => {
                            const q = e.target.value.toLowerCase().trim();
                            elements.saasMoreCatsList.querySelectorAll('.saas-dropdown-item').forEach(item => {
                                const catName = (item.getAttribute('data-cat') || '').toLowerCase();
                                item.style.display = catName.includes(q) ? '' : 'none';
                            });
                        };
                    }
                } else {
                    elements.saasMoreCatsContainer.classList.add('hidden');
                    if (elements.saasMoreCatsDropdown) elements.saasMoreCatsDropdown.classList.add('hidden');
                }
            }

            requestAnimationFrame(() => updateSaasScrollButtons());
        }
        
        elements.countCategories.textContent = allCats.filter(c => c.toLowerCase() !== 'uncategorized').length;
        if (elements.saasCountAll) {
            elements.saasCountAll.textContent = state.entries.length;
        }
        if (elements.saasCountRecent) {
            elements.saasCountRecent.textContent = deduplicateRecentList(state.recentActivity).length;
        }

        // Add views nav listener in sidebar (All Passwords / Recently Used)
        document.querySelectorAll('.sidebar .nav-list:first-of-type .nav-item').forEach(btn => {
            btn.addEventListener('click', () => {
                const filter = btn.getAttribute('data-filter');
                setFilter(filter);
            });
        });

        // Add views nav listeners in SaaS Tab Bar
        if (elements.saasTabAll) {
            elements.saasTabAll.onclick = () => setFilter('all');
        }
        if (elements.saasTabRecent) {
            elements.saasTabRecent.onclick = () => setFilter('recent');
        }
        if (elements.saasAddCatBtn) {
            elements.saasAddCatBtn.onclick = () => {
                if (elements.newCatModal) openModal(elements.newCatModal);
            };
        }

        // Wire More Categories Dropdown toggle
        if (elements.saasMoreCatsBtn && !elements.saasMoreCatsBtn._wired) {
            elements.saasMoreCatsBtn._wired = true;
            elements.saasMoreCatsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (elements.saasMoreCatsDropdown) {
                    const isHidden = elements.saasMoreCatsDropdown.classList.contains('hidden');
                    elements.saasMoreCatsDropdown.classList.toggle('hidden', !isHidden);
                    if (isHidden && elements.saasCatSearchInput) {
                        elements.saasCatSearchInput.value = '';
                        // Focus without scrolling parent containers
                        elements.saasCatSearchInput.focus({ preventScroll: true });
                        elements.saasMoreCatsList.querySelectorAll('.saas-dropdown-item').forEach(i => i.style.display = '');
                    }
                }
            });
        }
    }

    // Dismiss SaaS More Categories dropdown on outside click
    document.addEventListener('click', (e) => {
        if (elements.saasMoreCatsDropdown && !e.target.closest('#saasMoreCatsContainer')) {
            elements.saasMoreCatsDropdown.classList.add('hidden');
        }
    });

    // Set Filter
    function setFilter(filter) {
        state.currentFilter = filter;
        document.querySelectorAll('.sidebar .nav-item').forEach(b => {
            b.classList.toggle('active', b.getAttribute('data-filter') === filter);
        });
        document.querySelectorAll('.saas-tab').forEach(b => {
            b.classList.toggle('active', b.getAttribute('data-tab-filter') === filter);
        });
        document.querySelectorAll('.saas-dropdown-item').forEach(b => {
            b.classList.toggle('active', b.getAttribute('data-tab-filter') === filter);
        });

        if (elements.saasCategoryTabs) {
            const activeTab = elements.saasCategoryTabs.querySelector(`[data-category="${CSS.escape(filter)}"]`);
            if (activeTab) {
                activeTab.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
            }
        }

        if (filter === 'all') {
            elements.currentViewTitle.textContent = 'All Passwords';
            elements.currentViewDesc.textContent = 'Securely encrypted credentials stored on your local disk. Drag & drop onto categories to re-classify.';
            elements.recentStripSection.classList.remove('hidden');
        } else if (filter === 'recent') {
            elements.currentViewTitle.textContent = 'Recently Used Passwords';
            elements.currentViewDesc.textContent = 'Credentials you have recently copied or viewed.';
            elements.recentStripSection.classList.add('hidden');
        } else {
            elements.currentViewTitle.textContent = filter;
            elements.currentViewDesc.textContent = `Credentials filed under category "${filter}".`;
            elements.recentStripSection.classList.add('hidden');
        }

        renderTable();
    }

    // Deduplicate recent activity list by entry_id and (title + username)
    function deduplicateRecentList(list) {
        if (!Array.isArray(list)) return [];
        const seenIds = new Set();
        const seenCombos = new Set();
        const deduped = [];

        for (const evt of list) {
            if (!evt) continue;
            const eid = evt.entry_id;
            const normTitle = (evt.title || '').trim().toLowerCase();
            const normUname = (evt.uname || '').trim().toLowerCase();
            const combo = `${normTitle}::${normUname}`;

            if (eid && seenIds.has(eid)) continue;
            if (combo && seenCombos.has(combo) && (normTitle || normUname)) continue;

            if (eid) seenIds.add(eid);
            if (normTitle || normUname) seenCombos.add(combo);
            deduped.push(evt);
        }
        return deduped;
    }

    // Render Recent Strip (Unique records only, strictly no duplicates)
    function renderRecentStrip() {
        elements.recentUsesRow.innerHTML = '';
        state.recentActivity = deduplicateRecentList(state.recentActivity);

        const uniqueEvents = state.recentActivity.slice(0, 4);
        if (uniqueEvents.length === 0) {
            elements.recentStripSection.classList.add('hidden');
            return;
        }

        elements.recentStripSection.classList.remove('hidden');

        uniqueEvents.forEach(evt => {
            const entry = state.entries.find(e => e.id === evt.entry_id) ||
                          state.entries.find(e => (e.title || '').trim().toLowerCase() === (evt.title || '').trim().toLowerCase() && 
                                                  (e.uname || '').trim().toLowerCase() === (evt.uname || '').trim().toLowerCase());
            const title = evt.title || (entry ? entry.title : 'Account');
            const uname = evt.uname || (entry ? entry.uname : '');
            const timeAgo = formatTimeAgo(evt.timestamp);

            const card = document.createElement('div');
            card.className = 'recent-card';
            card.innerHTML = `
                <div class="recent-card-top">
                    <span class="recent-service">${escapeHtml(title)}</span>
                    <span class="recent-time">${timeAgo}</span>
                </div>
                <div class="recent-uname">${escapeHtml(uname || '—')}</div>
                <div class="recent-actions">
                    <button class="btn btn-secondary btn-xs copy-uname-quick-btn" title="Copy Username">
                        Copy Username
                    </button>
                    <button class="btn btn-primary btn-xs copy-pw-quick-btn" title="Copy Password">
                        Copy Password
                    </button>
                </div>
            `;

            const copyUnameBtn = card.querySelector('.copy-uname-quick-btn');
            const copyPwBtn = card.querySelector('.copy-pw-quick-btn');

            copyUnameBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (entry) {
                    copyToClipboard(entry.uname, `Copied username for ${title}`);
                    logRecentUse(entry.id, entry.title, entry.category, entry.uname, 'copied_username');
                } else if (uname) {
                    copyToClipboard(uname, `Copied username for ${title}`);
                }
            });

            copyPwBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (entry) {
                    copyToClipboard(entry.password, `Copied password for ${title}`);
                    logRecentUse(entry.id, entry.title, entry.category, entry.uname, 'copied_password');
                }
            });

            card.addEventListener('click', () => {
                if (entry) openViewModal(entry);
            });

            elements.recentUsesRow.appendChild(card);
        });
    }

    // Render Cards Grid (Default) and Table Rows with View Switching (Issue 2 & 3 & 4)
    function renderTable() {
        elements.entriesTableBody.innerHTML = '';
        if (elements.entriesCardsGrid) {
            elements.entriesCardsGrid.innerHTML = '';
        }

        let filtered = state.entries;

        if (state.currentFilter === 'recent') {
            const recentIds = state.recentActivity.map(a => a.entry_id);
            filtered = state.entries.filter(e => recentIds.includes(e.id));
        } else if (state.currentFilter !== 'all') {
            filtered = state.entries.filter(e => (e.category || 'Uncategorized') === state.currentFilter);
        }

        if (state.searchQuery) {
            const q = state.searchQuery.toLowerCase();
            filtered = filtered.filter(e => {
                const titleMatch = e.title && e.title.toLowerCase().includes(q);
                const unameMatch = e.uname && e.uname.toLowerCase().includes(q);
                const catMatch = e.category && e.category.toLowerCase().includes(q);
                const cfMatch = e.custom_fields && e.custom_fields.some(cf => 
                    (cf.name && cf.name.toLowerCase().includes(q)) || 
                    (cf.value && cf.value.toLowerCase().includes(q))
                );
                return titleMatch || unameMatch || catMatch || cfMatch;
            });
        }

        if (filtered.length === 0) {
            elements.emptyState.classList.remove('hidden');
            if (elements.entriesCardsGrid) elements.entriesCardsGrid.classList.add('hidden');
            if (elements.entriesTableContainer) elements.entriesTableContainer.classList.add('hidden');
            return;
        }

        elements.emptyState.classList.add('hidden');
        const activeViewMode = state.preferences.view_mode || 'grid';
        if (activeViewMode === 'grid') {
            if (elements.entriesCardsGrid) elements.entriesCardsGrid.classList.remove('hidden');
            if (elements.entriesTableContainer) elements.entriesTableContainer.classList.add('hidden');
        } else {
            if (elements.entriesCardsGrid) elements.entriesCardsGrid.classList.add('hidden');
            if (elements.entriesTableContainer) elements.entriesTableContainer.classList.remove('hidden');
        }

        filtered.forEach(entry => {
            const customFieldsCount = (entry.custom_fields || []).length;
            const catDisplay = entry.category || 'Uncategorized';
            const avatarHtml = getServiceAvatarHtml(entry.title, entry.avatar, entry.category);

            // ==================== 1. PASSWORD CARD (GRID VIEW) ====================
            if (elements.entriesCardsGrid) {
                const card = document.createElement('div');
                card.className = 'password-card';
                card.setAttribute('draggable', 'true');
                card.setAttribute('data-id', entry.id);

                card.innerHTML = `
                    <div class="card-header">
                        <div class="card-avatar-wrap">
                            ${avatarHtml}
                        </div>
                        <div class="card-title-group">
                            <span class="card-service-title" title="${escapeHtml(entry.title || entry.uname)}">${escapeHtml(entry.title || entry.uname)}</span>
                            <span class="badge card-category-badge">${escapeHtml(catDisplay)}</span>
                        </div>
                        <div class="card-header-actions">
                            <button type="button" class="btn btn-icon btn-xs card-btn-share" title="Secure Share (10m temporary link)">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <circle cx="18" cy="5" r="3"></circle>
                                    <circle cx="6" cy="12" r="3"></circle>
                                    <circle cx="18" cy="19" r="3"></circle>
                                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                                </svg>
                            </button>
                        </div>
                    </div>

                    <div class="card-body">
                        <div class="card-field-row">
                            <span class="card-field-label">User</span>
                            <div class="card-field-val-wrap">
                                <span class="mono-text card-uname-text">${escapeHtml(entry.uname || '—')}</span>
                                <button type="button" class="btn btn-secondary btn-xs card-copy-uname-btn" title="Copy Username">
                                    Copy
                                </button>
                            </div>
                        </div>

                        <div class="card-field-row">
                            <span class="card-field-label">Pass</span>
                            <div class="card-field-val-wrap">
                                <span class="mono-text card-pw-text masked-pw">••••••••••••</span>
                                <button type="button" class="btn btn-secondary btn-xs card-toggle-pw-btn" title="Show/Hide">
                                    Show
                                </button>
                                <button type="button" class="btn btn-secondary btn-xs card-copy-pw-btn" title="Copy Password">
                                    Copy
                                </button>
                            </div>
                        </div>

                        ${customFieldsCount > 0 ? `
                            <div class="card-cf-badges">
                                <span class="custom-fields-pill">⚙️ ${customFieldsCount} custom ${customFieldsCount === 1 ? 'field' : 'fields'}</span>
                            </div>
                        ` : ''}
                    </div>

                    <div class="card-footer">
                        <span class="card-drag-handle" title="Drag to a category in sidebar or tabs to reclassify">⋮⋮</span>
                        <div class="card-actions-right">
                            <button type="button" class="btn btn-secondary btn-xs card-share-btn" title="Secure Share (10m temporary link)">Share</button>
                            <button type="button" class="btn btn-secondary btn-xs card-view-btn">View</button>
                            <button type="button" class="btn btn-secondary btn-xs card-edit-btn">Edit</button>
                            <button type="button" class="btn btn-danger btn-xs card-delete-btn">Delete</button>
                        </div>
                    </div>
                `;

                // Card Drag events
                card.addEventListener('dragstart', (e) => {
                    state.draggedEntryId = entry.id;
                    e.dataTransfer.setData('text/plain', entry.id);
                    e.dataTransfer.effectAllowed = 'move';
                    card.classList.add('is-dragging');
                    document.body.classList.add('is-dragging-entry');
                });

                card.addEventListener('dragend', () => {
                    card.classList.remove('is-dragging');
                    document.body.classList.remove('is-dragging-entry');
                    state.draggedEntryId = null;
                    document.querySelectorAll('.sidebar .nav-item, .saas-tab, .saas-dropdown-item').forEach(b => b.classList.remove('drag-over'));
                });

                // Card actions
                const cardPwText = card.querySelector('.card-pw-text');
                const cardToggleBtn = card.querySelector('.card-toggle-pw-btn');
                cardToggleBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const isMasked = cardPwText.classList.contains('masked-pw');
                    if (isMasked) {
                        cardPwText.textContent = entry.password;
                        cardPwText.classList.remove('masked-pw');
                        cardToggleBtn.textContent = 'Hide';
                    } else {
                        cardPwText.textContent = '••••••••••••';
                        cardPwText.classList.add('masked-pw');
                        cardToggleBtn.textContent = 'Show';
                    }
                });

                card.querySelector('.card-copy-uname-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    copyToClipboard(entry.uname, `Username copied for ${entry.title}`);
                    logRecentUse(entry.id, entry.title, entry.category, entry.uname, 'copied_username');
                });

                card.querySelector('.card-copy-pw-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    copyToClipboard(entry.password, `Password copied for ${entry.title}`);
                    logRecentUse(entry.id, entry.title, entry.category, entry.uname, 'copied_password');
                });

                const triggerShare = (e) => {
                    e.stopPropagation();
                    openShareModal(entry);
                };
                card.querySelector('.card-btn-share').addEventListener('click', triggerShare);
                card.querySelector('.card-share-btn').addEventListener('click', triggerShare);

                card.querySelector('.card-view-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    openViewModal(entry);
                });

                card.querySelector('.card-edit-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    openEditModal(entry);
                });

                card.querySelector('.card-delete-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    handleDeleteEntry(entry);
                });

                card.addEventListener('click', () => openViewModal(entry));

                elements.entriesCardsGrid.appendChild(card);
            }

            // ==================== 2. TABLE ROW (TABLE VIEW) ====================
            const tr = document.createElement('tr');
            tr.className = 'draggable-row';
            tr.setAttribute('draggable', 'true');
            tr.setAttribute('data-id', entry.id);

            tr.innerHTML = `
                <td style="width: 28px; text-align: center;">
                    <span class="drag-handle" title="Drag to a category in sidebar or tabs to reclassify">⋮⋮</span>
                </td>
                <td>
                    <div class="account-cell" style="display: flex; align-items: center; gap: 9px;">
                        ${avatarHtml}
                        <span class="account-title">${escapeHtml(entry.title || entry.uname)}</span>
                    </div>
                </td>
                <td>
                    <span class="badge">${escapeHtml(catDisplay)}</span>
                </td>
                <td>
                    <div class="inline-copy-box">
                        <span class="mono-text">${escapeHtml(entry.uname)}</span>
                        <button class="btn btn-secondary btn-xs copy-table-uname-btn" title="Copy Username">
                            Copy
                        </button>
                    </div>
                </td>
                <td>
                    <div class="inline-copy-box">
                        <span class="mono-text masked-pw">••••••••</span>
                        <button class="btn btn-secondary btn-xs copy-table-pw-btn" title="Copy Password">
                            Copy
                        </button>
                    </div>
                </td>
                <td>
                    ${customFieldsCount > 0 
                        ? `<span class="custom-fields-pill">⚙️ ${customFieldsCount} fields</span>` 
                        : `<span class="text-muted text-xs">—</span>`
                    }
                </td>
                <td class="actions-cell">
                    <button class="btn btn-secondary btn-xs share-table-entry-btn" title="Secure Share (10m temporary link)">Share</button>
                    <button class="btn btn-secondary btn-xs view-entry-btn">View</button>
                    <button class="btn btn-secondary btn-xs edit-entry-btn">Edit</button>
                    <button class="btn btn-danger btn-xs delete-entry-btn">Delete</button>
                </td>
            `;

            // Row Drag events
            tr.addEventListener('dragstart', (e) => {
                state.draggedEntryId = entry.id;
                e.dataTransfer.setData('text/plain', entry.id);
                e.dataTransfer.effectAllowed = 'move';
                tr.classList.add('is-dragging');
                document.body.classList.add('is-dragging-entry');
            });

            tr.addEventListener('dragend', () => {
                tr.classList.remove('is-dragging');
                document.body.classList.remove('is-dragging-entry');
                state.draggedEntryId = null;
                document.querySelectorAll('.sidebar .nav-item, .saas-tab, .saas-dropdown-item').forEach(b => b.classList.remove('drag-over'));
            });

            // Row Action listeners
            tr.querySelector('.copy-table-uname-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                copyToClipboard(entry.uname, `Username copied for ${entry.title}`);
                logRecentUse(entry.id, entry.title, entry.category, entry.uname, 'copied_username');
            });

            tr.querySelector('.copy-table-pw-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                copyToClipboard(entry.password, `Password copied for ${entry.title}`);
                logRecentUse(entry.id, entry.title, entry.category, entry.uname, 'copied_password');
            });

            tr.querySelector('.share-table-entry-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                openShareModal(entry);
            });

            tr.querySelector('.view-entry-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                openViewModal(entry);
            });

            tr.querySelector('.edit-entry-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                openEditModal(entry);
            });

            tr.querySelector('.delete-entry-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                handleDeleteEntry(entry);
            });

            tr.addEventListener('click', () => openViewModal(entry));

            elements.entriesTableBody.appendChild(tr);
        });
    }

    // Log Recent Use
    async function logRecentUse(entryId, title, category, uname, action) {
        const res = await apiRequest('/api/recent', 'POST', {
            entry_id: entryId,
            title,
            category: category || 'Uncategorized',
            uname,
            action
        });
        if (res.ok) {
            state.recentActivity = deduplicateRecentList(res.data.recent_activity || []);
            renderRecentStrip();
            elements.countRecent.textContent = state.recentActivity.length;
        }
    }

    // Open View Modal
    function openViewModal(entry) {
        state.activeViewEntry = entry;
        elements.viewTitle.textContent = entry.title || entry.uname;
        elements.viewCategoryBadge.textContent = entry.category || 'Uncategorized';
        elements.viewUsername.textContent = entry.uname;
        elements.viewPassword.textContent = '••••••••••••';
        elements.viewPassword.classList.add('masked-pw');
        elements.viewTogglePwBtn.textContent = 'Show Password';

        // Render Custom Fields in View Modal
        elements.viewCustomList.innerHTML = '';
        const customFields = entry.custom_fields || [];
        if (customFields.length === 0) {
            elements.viewCustomFieldsBlock.classList.add('hidden');
        } else {
            elements.viewCustomFieldsBlock.classList.remove('hidden');
            customFields.forEach(cf => {
                const row = document.createElement('div');
                row.className = 'view-custom-row';
                const isSecret = Boolean(cf.is_secret);
                const displayVal = isSecret ? '••••••••' : cf.value;

                row.innerHTML = `
                    <span class="view-custom-name">${escapeHtml(cf.name)}</span>
                    <span class="view-custom-val ${isSecret ? 'masked-pw' : ''}">${escapeHtml(displayVal)}</span>
                    <div class="view-custom-actions">
                        ${isSecret ? `<button class="btn btn-secondary btn-xs toggle-cf-btn">Show</button>` : ''}
                        <button class="btn btn-secondary btn-xs copy-cf-btn">Copy</button>
                    </div>
                `;

                if (isSecret) {
                    const toggleBtn = row.querySelector('.toggle-cf-btn');
                    const valEl = row.querySelector('.view-custom-val');
                    let shown = false;
                    toggleBtn.addEventListener('click', () => {
                        shown = !shown;
                        valEl.textContent = shown ? cf.value : '••••••••';
                        valEl.classList.toggle('masked-pw', !shown);
                        toggleBtn.textContent = shown ? 'Hide' : 'Show';
                    });
                }

                row.querySelector('.copy-cf-btn').addEventListener('click', () => {
                    copyToClipboard(cf.value, `Copied ${cf.name}`);
                    logRecentUse(entry.id, entry.title, entry.category, entry.uname, 'copied_custom');
                });

                elements.viewCustomList.appendChild(row);
            });
        }

        openModal(elements.viewModal);
        logRecentUse(entry.id, entry.title, entry.category, entry.uname, 'viewed_details');
    }

    // View Modal Actions
    elements.viewCopyUsernameBtn.addEventListener('click', () => {
        if (state.activeViewEntry) {
            copyToClipboard(state.activeViewEntry.uname, 'Username copied to clipboard!');
            logRecentUse(state.activeViewEntry.id, state.activeViewEntry.title, state.activeViewEntry.category, state.activeViewEntry.uname, 'copied_username');
        }
    });

    elements.viewCopyPasswordBtn.addEventListener('click', () => {
        if (state.activeViewEntry) {
            copyToClipboard(state.activeViewEntry.password, 'Password copied to clipboard!');
            logRecentUse(state.activeViewEntry.id, state.activeViewEntry.title, state.activeViewEntry.category, state.activeViewEntry.uname, 'copied_password');
        }
    });

    elements.viewTogglePwBtn.addEventListener('click', () => {
        if (!state.activeViewEntry) return;
        const isMasked = elements.viewPassword.classList.contains('masked-pw');
        if (isMasked) {
            elements.viewPassword.textContent = state.activeViewEntry.password;
            elements.viewPassword.classList.remove('masked-pw');
            elements.viewTogglePwBtn.textContent = 'Hide Password';
        } else {
            elements.viewPassword.textContent = '••••••••••••';
            elements.viewPassword.classList.add('masked-pw');
            elements.viewTogglePwBtn.textContent = 'Show Password';
        }
    });

    elements.viewEditBtn.addEventListener('click', () => {
        if (state.activeViewEntry) {
            closeModal(elements.viewModal);
            openEditModal(state.activeViewEntry);
        }
    });

    if (elements.viewShareBtn) {
        elements.viewShareBtn.addEventListener('click', () => {
            if (state.activeViewEntry) {
                openShareModal(state.activeViewEntry);
            }
        });
    }

    elements.viewDeleteBtn.addEventListener('click', () => {
        if (state.activeViewEntry) {
            closeModal(elements.viewModal);
            handleDeleteEntry(state.activeViewEntry);
        }
    });

    // ==================== NEW & EDIT CATEGORY MODALS (Ctrl + Shift + F) ====================
    function openNewCategoryModal() {
        elements.newCatNameInput.value = '';
        openModal(elements.newCatModal);
        elements.newCatNameInput.focus();
    }

    if (elements.sidebarAddCatBtn) {
        elements.sidebarAddCatBtn.addEventListener('click', openNewCategoryModal);
    }
    if (elements.openNewCategoryModalBtn) {
        elements.openNewCategoryModalBtn.addEventListener('click', openNewCategoryModal);
    }

    elements.newCatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const catName = elements.newCatNameInput.value.trim();
        if (!catName) return;

        const res = await apiRequest('/api/categories', 'POST', { category: catName });
        if (res.ok) {
            closeModal(elements.newCatModal);
            showToast(`Category "${catName}" created!`);
            state.categories = res.data.categories || [];
            renderCategories();
            setFilter(catName);
        } else {
            showToast(res.data.error || 'Failed to create category', 'danger');
        }
    });

    // Requirement 2: Edit Category Popup
    function openEditCategoryModal(cat) {
        elements.editCatOldNameInput.value = cat;
        elements.editCatNewNameInput.value = cat;
        openModal(elements.editCatModal);
        elements.editCatNewNameInput.focus();
        elements.editCatNewNameInput.select();
    }

    elements.editCatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const oldName = elements.editCatOldNameInput.value.trim();
        const newName = elements.editCatNewNameInput.value.trim();
        if (!newName) return;
        if (oldName === newName) {
            closeModal(elements.editCatModal);
            return;
        }

        const res = await apiRequest('/api/categories', 'PUT', {
            old_name: oldName,
            new_name: newName
        });

        if (res.ok) {
            closeModal(elements.editCatModal);
            showToast(`Renamed category to "${newName}"!`);
            state.categories = res.data.categories || [];
            state.entries.forEach(item => {
                if ((item.category || '').toLowerCase() === oldName.toLowerCase()) {
                    item.category = newName;
                }
            });
            if (state.currentFilter.toLowerCase() === oldName.toLowerCase()) {
                state.currentFilter = newName;
            }
            renderCategories();
            renderDashboard();
            setFilter(state.currentFilter);
        } else {
            showToast(res.data.error || 'Failed to rename category', 'danger');
        }
    });

    // Right-Click Context Menu Actions (Edit & Delete Category)
    if (elements.contextEditCategoryBtn) {
        elements.contextEditCategoryBtn.addEventListener('click', () => {
            elements.categoryContextMenu.classList.add('hidden');
            if (state.contextCategory) {
                openEditCategoryModal(state.contextCategory.cat);
            }
        });
    }

    if (elements.contextDeleteCategoryBtn) {
        elements.contextDeleteCategoryBtn.addEventListener('click', () => {
            elements.categoryContextMenu.classList.add('hidden');
            if (state.contextCategory) {
                handleDeleteCategory(state.contextCategory.cat, state.contextCategory.count);
            }
        });
    }

    // Requirement 3: Delete Category ONLY if 0 passwords inside
    function handleDeleteCategory(cat, count) {
        if (!cat) return;
        if (cat.toLowerCase() === 'uncategorized') {
            showToast('The default "Uncategorized" category cannot be deleted.', 'danger');
            return;
        }

        // Live count check
        const liveCount = state.entries.filter(e => (e.category || 'Uncategorized').toLowerCase() === cat.toLowerCase()).length;
        if (liveCount > 0) {
            showToast(`Cannot delete "${cat}": it contains ${liveCount} password profile(s). Move or delete passwords first.`, 'danger');
            return;
        }

        (async () => {
            const res = await apiRequest(`/api/categories?name=${encodeURIComponent(cat)}`, 'DELETE');
            if (res.ok) {
                showToast(`Category "${cat}" deleted.`);
                state.categories = res.data.categories || state.categories.filter(c => c.toLowerCase() !== cat.toLowerCase());
                if (state.currentFilter.toLowerCase() === cat.toLowerCase()) {
                    state.currentFilter = 'all';
                }
                // Always re-render sidebar and dashboard immediately
                renderCategories();
                renderDashboard();
                setFilter(state.currentFilter);
            } else {
                showToast(res.data.error || 'Failed to delete category', 'danger');
            }
        })();
    }

    // Requirement 6: Searchable Combobox Dropdown for Category
    function setupCategoryCombobox() {
        if (!elements.formCategory || !elements.categoryDropdownList) return;

        function getCategoryOptions() {
            const set = new Set();
            state.categories.forEach(c => {
                if (c && c !== '_recent_activity') set.add(c);
            });
            state.entries.forEach(e => {
                if (e.category && e.category !== '_recent_activity') set.add(e.category);
            });
            if (!set.has('Uncategorized')) set.add('Uncategorized');
            return Array.from(set).sort();
        }

        function renderCombobox(filterText = '') {
            const allCats = getCategoryOptions();
            const q = filterText.toLowerCase().trim();
            const matches = allCats.filter(c => c.toLowerCase().includes(q));
            elements.categoryDropdownList.innerHTML = '';

            let exactMatch = false;

            matches.forEach(cat => {
                if (cat.toLowerCase() === q) exactMatch = true;
                const count = state.entries.filter(e => (e.category || 'Uncategorized') === cat).length;
                const div = document.createElement('div');
                div.className = 'combobox-option';
                if (elements.formCategory.value.trim().toLowerCase() === cat.toLowerCase()) {
                    div.classList.add('is-selected');
                }
                div.innerHTML = `
                    <span>${escapeHtml(cat)}</span>
                    <span class="combobox-option-count">${count}</span>
                `;
                div.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    elements.formCategory.value = cat === 'Uncategorized' ? '' : cat;
                    elements.categoryDropdownList.classList.add('hidden');
                });
                elements.categoryDropdownList.appendChild(div);
            });

            if (q && !exactMatch && q !== 'uncategorized') {
                const createDiv = document.createElement('div');
                createDiv.className = 'combobox-option combobox-create-option';
                createDiv.innerHTML = `
                    <span>+ Create "${escapeHtml(filterText.trim())}"</span>
                `;
                createDiv.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    elements.formCategory.value = filterText.trim();
                    elements.categoryDropdownList.classList.add('hidden');
                });
                elements.categoryDropdownList.appendChild(createDiv);
            }

            if (elements.categoryDropdownList.children.length === 0) {
                const emptyDiv = document.createElement('div');
                emptyDiv.className = 'combobox-option text-muted';
                emptyDiv.style.cursor = 'default';
                emptyDiv.textContent = 'No categories found';
                elements.categoryDropdownList.appendChild(emptyDiv);
            }
        }

        elements.formCategory.addEventListener('focus', () => {
            renderCombobox(elements.formCategory.value);
            elements.categoryDropdownList.classList.remove('hidden');
        });

        elements.formCategory.addEventListener('input', () => {
            renderCombobox(elements.formCategory.value);
            elements.categoryDropdownList.classList.remove('hidden');
        });

        elements.formCategory.addEventListener('blur', () => {
            setTimeout(() => {
                elements.categoryDropdownList.classList.add('hidden');
            }, 180);
        });

        if (elements.comboboxToggleBtn) {
            elements.comboboxToggleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const isHidden = elements.categoryDropdownList.classList.contains('hidden');
                if (isHidden) {
                    renderCombobox(elements.formCategory.value);
                    elements.categoryDropdownList.classList.remove('hidden');
                    elements.formCategory.focus();
                } else {
                    elements.categoryDropdownList.classList.add('hidden');
                }
            });
        }
    }


    // ==================== AVATAR PICKER CONTROLLER (Issue 3) ====================
    function updateAvatarPickerPreview(title, avatar) {
        if (!elements.avatarCurrentPreview) return;
        const html = getServiceAvatarHtml(title, avatar, elements.formCategory ? elements.formCategory.value : '');
        elements.avatarCurrentPreview.innerHTML = html;
        if (elements.avatarPreviewLabel) {
            if (avatar && avatar.startsWith('emoji:')) {
                elements.avatarPreviewLabel.textContent = `Custom Emoji: ${avatar.slice(6)}`;
            } else if (avatar) {
                elements.avatarPreviewLabel.textContent = 'Selected Avatar';
            } else {
                elements.avatarPreviewLabel.textContent = title ? 'Auto-detected from service name' : 'Auto-detected from name';
            }
        }
    }

    function setupAvatarPicker() {
        if (!elements.avatarPresetChips) return;

        // Preset chip clicks
        elements.avatarPresetChips.querySelectorAll('.avatar-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                elements.avatarPresetChips.querySelectorAll('.avatar-chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                const avatarVal = chip.getAttribute('data-avatar') || '';
                if (elements.formAvatar) elements.formAvatar.value = avatarVal;
                if (elements.avatarCustomInput) elements.avatarCustomInput.value = '';
                updateAvatarPickerPreview(elements.formTitle.value, avatarVal);
            });
        });

        // Custom emoji input
        if (elements.avatarCustomInput) {
            elements.avatarCustomInput.addEventListener('input', (e) => {
                const val = e.target.value.trim();
                if (val) {
                    elements.avatarPresetChips.querySelectorAll('.avatar-chip').forEach(c => c.classList.remove('active'));
                    if (elements.formAvatar) elements.formAvatar.value = `emoji:${val}`;
                    updateAvatarPickerPreview(elements.formTitle.value, `emoji:${val}`);
                } else {
                    const autoChip = elements.avatarPresetChips.querySelector('.avatar-chip[data-avatar=""]');
                    if (autoChip) autoChip.classList.add('active');
                    if (elements.formAvatar) elements.formAvatar.value = '';
                    updateAvatarPickerPreview(elements.formTitle.value, '');
                }
            });
        }

        // Live preview when typing service name if avatar is Auto
        if (elements.formTitle) {
            elements.formTitle.addEventListener('input', () => {
                if (!elements.formAvatar || !elements.formAvatar.value) {
                    updateAvatarPickerPreview(elements.formTitle.value, '');
                }
            });
        }
    }

    // ==================== ADD / EDIT ENTRY MODAL ====================
    elements.openNewEntryModalBtn.addEventListener('click', () => openNewModal());
    elements.emptyAddBtn.addEventListener('click', () => openNewModal());

    function openNewModal() {
        state.activeEditEntry = null;
        elements.entryModalTitle.textContent = 'Add New Password';
        elements.formEntryId.value = '';
        elements.formTitle.value = '';
        elements.formCategory.value = state.currentFilter !== 'all' && state.currentFilter !== 'recent' && state.currentFilter !== 'Uncategorized' ? state.currentFilter : '';
        elements.formUsername.value = '';
        elements.formPassword.value = '';
        elements.customFieldsList.innerHTML = '';
        elements.strengthBar.style.width = '0%';

        if (elements.formAvatar) elements.formAvatar.value = '';
        if (elements.avatarCustomInput) elements.avatarCustomInput.value = '';
        if (elements.avatarPresetChips) {
            elements.avatarPresetChips.querySelectorAll('.avatar-chip').forEach(c => {
                c.classList.toggle('active', c.getAttribute('data-avatar') === '');
            });
        }
        updateAvatarPickerPreview('', '');

        openModal(elements.entryModal);
        setTimeout(() => {
            if (elements.formTitle) {
                elements.formTitle.focus();
            }
        }, 50);
    }

    function openNewEntryModal() {
        openNewModal();
    }

    function openEditModal(entry) {
        state.activeEditEntry = entry;
        elements.entryModalTitle.textContent = `Edit "${entry.title || entry.uname}"`;
        elements.formEntryId.value = entry.id;
        elements.formTitle.value = entry.title || '';
        elements.formCategory.value = entry.category === 'Uncategorized' ? '' : (entry.category || '');
        elements.formUsername.value = entry.uname || '';
        elements.formPassword.value = entry.password || '';
        elements.customFieldsList.innerHTML = '';

        const av = entry.avatar || '';
        if (elements.formAvatar) elements.formAvatar.value = av;
        if (elements.avatarCustomInput) elements.avatarCustomInput.value = av.startsWith('emoji:') ? av.slice(6) : '';
        if (elements.avatarPresetChips) {
            let matched = false;
            elements.avatarPresetChips.querySelectorAll('.avatar-chip').forEach(c => {
                const matches = c.getAttribute('data-avatar') === av;
                c.classList.toggle('active', matches);
                if (matches) matched = true;
            });
            if (!matched && !av.startsWith('emoji:')) {
                const autoChip = elements.avatarPresetChips.querySelector('.avatar-chip[data-avatar=""]');
                if (autoChip) autoChip.classList.add('active');
            }
        }
        updateAvatarPickerPreview(entry.title || '', av);

        (entry.custom_fields || []).forEach(cf => {
            addCustomFieldRow(cf.name, cf.value, cf.is_secret);
        });

        updateStrengthMeter(entry.password || '');
        openModal(elements.entryModal);
    }

    // Custom Fields (Requirement 4: clean trash icon and positioning)
    function addCustomFieldRow(name = '', value = '', isSecret = false) {
        const row = document.createElement('div');
        row.className = 'custom-field-row';
        row.innerHTML = `
            <input type="text" placeholder="Field Name (e.g. PIN, URL)" class="cf-name" value="${escapeHtml(name)}" required>
            <input type="${isSecret ? 'password' : 'text'}" placeholder="Field Value" class="cf-value" value="${escapeHtml(value)}">
            <label class="secret-checkbox-label">
                <input type="checkbox" class="cf-secret" ${isSecret ? 'checked' : ''}>
                <span>Secret</span>
            </label>
            <button type="button" class="remove-cf-btn" title="Remove Field" aria-label="Remove Field">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
            </button>
        `;

        const secretCheckbox = row.querySelector('.cf-secret');
        const valInput = row.querySelector('.cf-value');
        secretCheckbox.addEventListener('change', () => {
            valInput.type = secretCheckbox.checked ? 'password' : 'text';
        });

        row.querySelector('.remove-cf-btn').addEventListener('click', () => row.remove());
        elements.customFieldsList.appendChild(row);
    }

    elements.addCustomFieldBtn.addEventListener('click', () => addCustomFieldRow());

    // ==================== RANDOM USERNAME GENERATION (Requirement 5) ====================
    const USERNAME_PRESETS = {
        gaming: ['NeonNinja', 'PixelVortex', 'ShadowRider', 'CyberSniper', 'FrostKnight', 'GlitchGamer', 'TitanStrike', 'EchoRecon'],
        work: ['dev.pro', 'lead.engineer', 'ops.cloud', 'alex.work', 'tech.consultant', 'staff.corp', 'specialist.io'],
        office: ['admin.desk', 'staff_internal', 'exec_portal', 'support.office', 'finance_user', 'ops.manager'],
        entertainment: ['StreamVault', 'BingeWatcher', 'SonicEcho', 'CinemaLover', 'MediaCast', 'TrackSurfer'],
        personal: ['alex_online', 'orbit_user', 'aurora_sky', 'daily_echo', 'prime_haven', 'solaris_wave']
    };

    document.querySelectorAll('.uname-badge').forEach(badge => {
        badge.addEventListener('click', () => {
            const preset = badge.getAttribute('data-preset');
            const list = USERNAME_PRESETS[preset] || USERNAME_PRESETS.personal;
            const base = list[Math.floor(Math.random() * list.length)];
            const randNum = Math.floor(10 + Math.random() * 89);
            const username = preset === 'work' ? `${base}${randNum}@teammail.com` : `${base}_${randNum}`;
            elements.formUsername.value = username;
            showToast(`Generated ${preset} username: ${username}`);
        });
    });

    // ==================== PASSWORD PRESETS (Requirement 5) ====================
    document.querySelectorAll('.pw-badge').forEach(badge => {
        badge.addEventListener('click', () => {
            const preset = badge.getAttribute('data-preset');
            let generated = '';
            if (preset === 'pin') {
                generated = generateNumericPin(6);
            } else if (preset === 'ultra') {
                generated = generateSecurePassword(24, true, true, true, true);
            } else {
                generated = generateSecurePassword(16, true, true, true, true);
            }
            elements.formPassword.value = generated;
            elements.formPassword.type = 'text';
            elements.toggleFormPasswordBtn.textContent = 'Hide';
            updateStrengthMeter(generated);
            showToast(`Generated ${preset} password!`);
        });
    });

    elements.toggleFormPasswordBtn.addEventListener('click', () => {
        const isPw = elements.formPassword.type === 'password';
        elements.formPassword.type = isPw ? 'text' : 'password';
        elements.toggleFormPasswordBtn.textContent = isPw ? 'Hide' : 'Show';
    });

    elements.formPassword.addEventListener('input', (e) => {
        updateStrengthMeter(e.target.value);
    });

    function updateStrengthMeter(pw) {
        let score = 0;
        if (pw.length >= 8) score += 25;
        if (pw.length >= 14) score += 25;
        if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score += 25;
        if (/[0-9]/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score += 25;

        elements.strengthBar.style.width = `${score}%`;
        if (score <= 25) {
            elements.strengthBar.style.backgroundColor = 'var(--danger-border)';
        } else if (score <= 50) {
            elements.strengthBar.style.backgroundColor = '#f59e0b';
        } else if (score <= 75) {
            elements.strengthBar.style.backgroundColor = '#3b82f6';
        } else {
            elements.strengthBar.style.backgroundColor = 'var(--success-border)';
        }
    }

    // Save Entry Submission (Requirement 3: optional category defaults to Uncategorized)
    elements.entryForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const entryId = elements.formEntryId.value.trim() || null;
        const title = elements.formTitle.value.trim();
        const category = elements.formCategory.value.trim() || 'Uncategorized';
        const uname = elements.formUsername.value.trim();
        const password = elements.formPassword.value;

        const customFields = [];
        elements.customFieldsList.querySelectorAll('.custom-field-row').forEach(row => {
            const name = row.querySelector('.cf-name').value.trim();
            const value = row.querySelector('.cf-value').value;
            const isSecret = row.querySelector('.cf-secret').checked;
            if (name) {
                customFields.push({ name, value, is_secret: isSecret });
            }
        });

        const avatar = (elements.formAvatar ? elements.formAvatar.value.trim() : '') || null;

        const payload = {
            id: entryId,
            title,
            category,
            uname,
            password,
            avatar,
            custom_fields: customFields
        };

        const method = entryId ? 'PUT' : 'POST';
        const res = await apiRequest('/api/entries', method, payload);

        if (res.ok) {
            closeModal(elements.entryModal);
            showToast(entryId ? 'Password updated successfully!' : 'Password saved successfully!');
            await loadEntries();
        } else {
            showToast(res.data.error || 'Failed to save password', 'danger');
        }
    });

    // Requirement 5: Delete Entry with confirmation popup requiring typing "confirm"
    function handleDeleteEntry(entry) {
        state.pendingDeleteEntry = entry;
        elements.deleteTargetTitle.textContent = entry.title || entry.uname;
        elements.deleteConfirmInput.value = '';
        elements.executeDeleteBtn.disabled = true;
        openModal(elements.deleteConfirmModal);
        setTimeout(() => {
            elements.deleteConfirmInput.focus();
        }, 50);
    }

    elements.deleteConfirmInput.addEventListener('input', (e) => {
        const val = e.target.value.trim().toLowerCase();
        elements.executeDeleteBtn.disabled = val !== 'confirm';
    });

    elements.deleteConfirmInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (!elements.executeDeleteBtn.disabled) {
                elements.executeDeleteBtn.click();
            }
        }
    });

    elements.executeDeleteBtn.addEventListener('click', async () => {
        if (!state.pendingDeleteEntry) return;
        const entry = state.pendingDeleteEntry;
        const entryId = entry.id || '';
        const title = entry.title || '';
        const uname = entry.uname || '';

        const res = await apiRequest(`/api/entries?id=${encodeURIComponent(entryId)}&title=${encodeURIComponent(title)}&uname=${encodeURIComponent(uname)}`, 'DELETE');
        if (res.ok) {
            closeModal(elements.deleteConfirmModal);
            showToast(`Deleted "${entry.title || entry.uname}" permanently.`);
            state.pendingDeleteEntry = null;

            // Immediately purge from active memory so UI reflects delete instantly
            state.entries = state.entries.filter(e => e.id !== entry.id && !(
                (e.title || '').trim().toLowerCase() === (title || '').trim().toLowerCase() &&
                (e.uname || '').trim().toLowerCase() === (uname || '').trim().toLowerCase()
            ));

            // Immediately remove from Recent Password Uses
            state.recentActivity = state.recentActivity.filter(r => 
                r.entry_id !== entry.id && !(
                    (r.title || '').trim().toLowerCase() === (title || '').trim().toLowerCase() &&
                    (r.uname || '').trim().toLowerCase() === (uname || '').trim().toLowerCase()
                )
            );

            // Re-render dashboard cleanly
            renderDashboard();

            // Sync with backend
            await loadEntries();
        } else {
            showToast(res.data.error || 'Could not delete entry', 'danger');
        }
    });

    // ==================== AUTHENTICATION & RECOVERY (Fixes Bug #7 & #8) ====================

    // Setup Master Vault (First-Time User)
    elements.setupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const pw = elements.setupPassword.value;
        const confirmPw = elements.setupPasswordConfirm.value;

        if (pw !== confirmPw) {
            showToast('Passwords do not match.', 'danger');
            return;
        }

        const res = await apiRequest('/api/register', 'POST', { password: pw });
        if (res.ok) {
            state.initialized = true;
            state.unlocked = true;
            closeModal(elements.setupModal);
            elements.displayRecoveryKey.textContent = res.data.recovery_key;
            openModal(elements.recoveryKeyModal);
        } else {
            showToast(res.data.error || 'Setup failed.', 'danger');
        }
    });

    elements.copyRecoveryKeyBtn.addEventListener('click', () => {
        copyToClipboard(elements.displayRecoveryKey.textContent.trim(), 'Recovery key copied to clipboard!');
    });

    // Download Recovery Key file (.txt)
    elements.downloadRecoveryKeyBtn.addEventListener('click', () => {
        const key = elements.displayRecoveryKey.textContent.trim();
        const blob = new Blob([
            `VAULTKEY EMERGENCY ONE-TIME RECOVERY KEY\n` +
            `========================================\n` +
            `Generated: ${new Date().toISOString()}\n\n` +
            `Recovery Key:\n${key}\n\n` +
            `IMPORTANT: Keep this file secure offline. If you forget your master password,\n` +
            `this key is the only way to recover access to your credentials.\n`
        ], { type: 'text/plain;charset=utf-8' });

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'vault_recovery_key.txt';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        showToast('Recovery key downloaded as vault_recovery_key.txt!');
    });

    elements.doneRecoveryKeyBtn.addEventListener('click', async () => {
        closeModal(elements.recoveryKeyModal);
        elements.workspace.classList.remove('vault-locked-blur');
        await loadEntries();
    });

    // Login Unlock Form
    elements.loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        elements.loginErrorMsg.classList.add('hidden');
        const pw = elements.loginPassword.value;

        const res = await apiRequest('/api/login', 'POST', { password: pw });
        if (res.ok) {
            state.unlocked = true;
            closeModal(elements.loginModal);
            elements.loginPassword.value = '';
            elements.workspace.classList.remove('vault-locked-blur');
            showToast('Vault unlocked.');
            await loadEntries();
        } else {
            elements.loginErrorMsg.classList.remove('hidden');
            elements.loginPassword.select();
        }
    });

    // Open Recover Modal
    elements.openRecoverModalBtn.addEventListener('click', () => {
        closeModal(elements.loginModal);
        openModal(elements.recoverModal);
        elements.recoverKeyInput.focus();
    });

    // Cancel Recovery Modal -> Always returns to Login Modal (Fix for Critical Bug #8)
    function returnFromRecoveryToLogin() {
        closeModal(elements.recoverModal);
        openModal(elements.loginModal);
        elements.loginPassword.focus();
    }

    elements.recoverCancelBtn.addEventListener('click', returnFromRecoveryToLogin);
    elements.recoverCloseTopBtn.addEventListener('click', returnFromRecoveryToLogin);

    // Reset Password with Recovery Key
    elements.recoverForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const recKey = elements.recoverKeyInput.value.trim();
        const newPw = elements.recoverNewPwInput.value;

        const res = await apiRequest('/api/recover', 'POST', {
            recovery_key: recKey,
            new_password: newPw
        });

        if (res.ok) {
            state.unlocked = true;
            closeModal(elements.recoverModal);
            elements.workspace.classList.remove('vault-locked-blur');
            showToast('Vault successfully recovered and unlocked!');
            await loadEntries();
        } else {
            showToast(res.data.error || 'Recovery failed. Invalid key.', 'danger');
        }
    });

    // Lock Vault
    elements.lockVaultBtn.addEventListener('click', async () => {
        await apiRequest('/api/logout', 'POST');
        state.unlocked = false;
        enforceAuthGate();
        showToast('Vault session locked.');
    });

    // ==================== GENERATOR UTILITY ====================
    elements.quickGenBtn.addEventListener('click', () => {
        refreshGenerator();
        openModal(elements.genModal);
    });

    elements.genLength.addEventListener('input', (e) => {
        elements.genLenDisplay.textContent = e.target.value;
        refreshGenerator();
    });

    [elements.genUpper, elements.genLower, elements.genNums, elements.genSyms].forEach(cb => {
        cb.addEventListener('change', refreshGenerator);
    });

    elements.regenPasswordBtn.addEventListener('click', refreshGenerator);

    elements.copyGenResultBtn.addEventListener('click', () => {
        copyToClipboard(elements.genResult.textContent.trim(), 'Generated password copied!');
    });

    function refreshGenerator() {
        const len = parseInt(elements.genLength.value, 10);
        const upper = elements.genUpper.checked;
        const lower = elements.genLower.checked;
        const nums = elements.genNums.checked;
        const syms = elements.genSyms.checked;

        elements.genResult.textContent = generateSecurePassword(len, upper, lower, nums, syms);
    }

    function generateSecurePassword(length, upper, lower, nums, syms) {
        let chars = '';
        if (upper) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        if (lower) chars += 'abcdefghijklmnopqrstuvwxyz';
        if (nums) chars += '0123456789';
        if (syms) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';

        if (!chars) chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

        const array = new Uint32Array(length);
        window.crypto.getRandomValues(array);
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars[array[i] % chars.length];
        }
        return result;
    }

    function generateNumericPin(length = 6) {
        const array = new Uint32Array(length);
        window.crypto.getRandomValues(array);
        let result = '';
        for (let i = 0; i < length; i++) {
            result += (array[i] % 10).toString();
        }
        return result;
    }

    // ==================== SEARCH & FILTER ====================
    elements.globalSearch.addEventListener('input', (e) => {
        state.searchQuery = e.target.value.trim();
        renderTable();
    });

    // ==================== VIEW MODE CONTROLLER (Issue 2) ====================
    function setViewMode(mode, syncBackend = true) {
        if (mode !== 'grid' && mode !== 'table') mode = 'grid';
        state.preferences.view_mode = mode;

        if (elements.viewModeGridBtn && elements.viewModeTableBtn) {
            elements.viewModeGridBtn.classList.toggle('active', mode === 'grid');
            elements.viewModeTableBtn.classList.toggle('active', mode === 'table');
        }

        if (elements.entriesCardsGrid && elements.entriesTableContainer) {
            if (mode === 'grid') {
                elements.entriesCardsGrid.classList.remove('hidden');
                elements.entriesTableContainer.classList.add('hidden');
            } else {
                elements.entriesCardsGrid.classList.add('hidden');
                elements.entriesTableContainer.classList.remove('hidden');
            }
        }

        if (syncBackend) {
            savePreferences({ view_mode: mode });
        }
    }

    function setupViewModeSwitcher() {
        if (elements.viewModeGridBtn) {
            elements.viewModeGridBtn.addEventListener('click', () => {
                setViewMode('grid');
                showToast('Switched to Cards Grid view');
            });
        }
        if (elements.viewModeTableBtn) {
            elements.viewModeTableBtn.addEventListener('click', () => {
                setViewMode('table');
                showToast('Switched to Table Rows view');
            });
        }
    }

    // ==================== ZERO-KNOWLEDGE PASSWORD SHARING CONTROLLER ====================
    let shareCountdownInterval = null;
    let currentShareRevocationToken = null;
    let currentActiveShareId = null;

    // Cryptographic Helpers for Zero-Knowledge Sharing
    function bufferToBase64Url(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }

    function bufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    async function encryptPayloadWithPin(payloadObj, pin) {
        if (!window.crypto || !window.crypto.subtle) {
            throw new Error('Web Crypto API is not supported in this runtime.');
        }

        // Generate cryptographically secure random 16-byte salt
        const saltBytes = window.crypto.getRandomValues(new Uint8Array(16));
        const salt = bufferToBase64(saltBytes);

        // Derive 256-bit AES key from 4-digit PIN with PBKDF2-HMAC-SHA256
        const pinKeyMaterial = await window.crypto.subtle.importKey(
            'raw',
            new TextEncoder().encode(pin),
            { name: 'PBKDF2' },
            false,
            ['deriveKey']
        );

        const aesKey = await window.crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: saltBytes,
                iterations: 100000,
                hash: 'SHA-256'
            },
            pinKeyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt']
        );

        // 12-byte initialization vector for AES-GCM
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const encoded = new TextEncoder().encode(JSON.stringify(payloadObj));
        const ciphertextBuffer = await window.crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            aesKey,
            encoded
        );

        // Compute pin_hash for server-side verification and attempt throttling
        const pinHashBuffer = await window.crypto.subtle.digest(
            'SHA-256',
            new TextEncoder().encode(pin + salt)
        );
        const pinHash = Array.from(new Uint8Array(pinHashBuffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');

        return {
            ciphertext: bufferToBase64(ciphertextBuffer),
            iv: bufferToBase64(iv),
            salt,
            pinHash
        };
    }

    function getSharingServiceUrls() {
        const DEFAULT_CLOUD_API = 'https://vaultkey-share-api.pritishdash44.workers.dev';
        const DEFAULT_CLOUD_VIEWER = 'https://vaultkey-secret.pages.dev';

        const prefs = (state.preferences && state.preferences.sharing) || {};
        const localOrigin = window.location.origin || `http://${window.location.host || '127.0.0.1:5432'}`;
        
        let apiUrl = (prefs.api_url || localStorage.getItem('vaultkey_sharing_api') || '').trim().replace(/\/+$/, '');
        let viewerUrl = (prefs.viewer_url || localStorage.getItem('vaultkey_sharing_viewer') || '').trim().replace(/\/+$/, '');

        // If explicitly set to 'local', use local desktop sharing service
        if (apiUrl === 'local' || (apiUrl && apiUrl.startsWith('http://127.0.0.1') && !prefs.api_url)) {
            apiUrl = localOrigin;
            viewerUrl = `${localOrigin}/share.html`;
            return { apiUrl, viewerUrl, isLocal: true };
        }

        // Migrate any empty or placeholder URLs to live Cloudflare production workers
        if (!apiUrl || apiUrl.includes('vaultkey-share.workers.dev') || apiUrl.includes('your-subdomain') || apiUrl.includes('127.0.0.1') || apiUrl.includes('localhost')) {
            apiUrl = DEFAULT_CLOUD_API;
        }
        if (!viewerUrl || viewerUrl.includes('vaultkey-share.pages.dev') || viewerUrl.includes('pritishdash44') || viewerUrl.includes('your-subdomain') || viewerUrl.includes('127.0.0.1') || viewerUrl.includes('localhost')) {
            viewerUrl = DEFAULT_CLOUD_VIEWER;
        }

        return { apiUrl, viewerUrl, isLocal: false };
    }

    // Active Shares Storage Helpers
    function getStoredActiveShares() {
        try {
            const raw = localStorage.getItem('vaultkey_active_shares');
            if (!raw) return [];
            const list = JSON.parse(raw);
            if (!Array.isArray(list)) return [];
            const now = Math.floor(Date.now() / 1000);
            return list.filter(item => item && item.expiresAt > now && !item.revoked);
        } catch (e) {
            return [];
        }
    }

    function saveStoredActiveShare(record) {
        try {
            const list = getStoredActiveShares();
            list.unshift(record);
            localStorage.setItem('vaultkey_active_shares', JSON.stringify(list));
            renderActiveSharesList();
        } catch (e) {}
    }

    function markStoredShareRevoked(shareId) {
        try {
            const list = getStoredActiveShares().map(item => {
                if (item.shareId === shareId) {
                    return { ...item, revoked: true };
                }
                return item;
            }).filter(item => !item.revoked);
            localStorage.setItem('vaultkey_active_shares', JSON.stringify(list));
            renderActiveSharesList();
        } catch (e) {}
    }

    // Open & Reset Share Configuration Dialog
    function openShareModal(entry) {
        if (!entry) return;
        state.activeShareEntry = entry;
        currentShareRevocationToken = null;
        currentActiveShareId = null;

        // Reset to Stage 1: Configuration
        if (elements.shareConfigStage) elements.shareConfigStage.style.display = 'block';
        if (elements.shareResultStage) elements.shareResultStage.style.display = 'none';

        if (elements.shareModalTargetTitle) {
            elements.shareModalTargetTitle.textContent = entry.title || 'Credential';
        }
        if (elements.shareModalTargetUname) {
            elements.shareModalTargetUname.textContent = entry.uname ? `Account: ${entry.uname}` : 'No username';
        }

        // Reset Checkboxes
        if (elements.shareOptPassword) elements.shareOptPassword.checked = true;
        if (elements.shareOptUsername) elements.shareOptUsername.checked = Boolean(entry.uname);
        if (elements.shareOptTitle) elements.shareOptTitle.checked = Boolean(entry.title);

        const hasCustom = Array.isArray(entry.custom_fields) && entry.custom_fields.length > 0;
        if (elements.shareOptCustomWrap) {
            elements.shareOptCustomWrap.style.display = hasCustom ? 'flex' : 'none';
        }
        if (elements.shareOptCustom) {
            elements.shareOptCustom.checked = hasCustom;
        }

        // Reset Expiration to 10 Minutes default
        if (elements.shareExpOptions) {
            elements.shareExpOptions.forEach(radio => {
                radio.checked = radio.value === '600';
            });
        }
        if (elements.shareCustomExpRow) {
            elements.shareCustomExpRow.style.display = 'none';
        }
        if (elements.generateShareBtn) {
            elements.generateShareBtn.disabled = false;
            elements.generateShareBtn.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="18" cy="5" r="3"></circle>
                    <circle cx="6" cy="12" r="3"></circle>
                    <circle cx="18" cy="19" r="3"></circle>
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                </svg>
                Generate Secure Share Link
            `;
        }

        openModal(elements.shareModal);
    }

    // Generate Share Link (Stage 1 -> Stage 2)
    async function handleGenerateShare() {
        const entry = state.activeShareEntry;
        if (!entry) return;

        // Validation: At least one field selected
        const incPw = elements.shareOptPassword && elements.shareOptPassword.checked;
        const incUname = elements.shareOptUsername && elements.shareOptUsername.checked;
        const incTitle = elements.shareOptTitle && elements.shareOptTitle.checked;
        const incCustom = elements.shareOptCustom && elements.shareOptCustom.checked;

        if (!incPw && !incUname && !incTitle && !incCustom) {
            showToast('Please select at least one piece of information to share.', 'warning');
            return;
        }

        // Calculate Expiration Seconds
        let selectedExp = '600';
        if (elements.shareExpOptions) {
            elements.shareExpOptions.forEach(r => {
                if (r.checked) selectedExp = r.value;
            });
        }

        let expiresInSeconds = 600;
        if (selectedExp === 'custom') {
            const customVal = parseInt(elements.shareCustomExpVal ? elements.shareCustomExpVal.value : '30', 10) || 30;
            const customUnit = elements.shareCustomExpUnit ? elements.shareCustomExpUnit.value : 'minutes';
            let mult = 60;
            if (customUnit === 'hours') mult = 3600;
            if (customUnit === 'days') mult = 86400;
            expiresInSeconds = Math.max(60, Math.min(customVal * mult, 7 * 86400));
        } else {
            expiresInSeconds = parseInt(selectedExp, 10) || 600;
        }

        // Build Plaintext Payload
        const payload = {
            v: 1,
            title: incTitle ? (entry.title || '') : '',
            uname: incUname ? (entry.uname || '') : '',
            password: incPw ? (entry.password || '') : '',
            custom_fields: incCustom ? (entry.custom_fields || []) : [],
            created_at: Math.floor(Date.now() / 1000)
        };

        elements.generateShareBtn.disabled = true;
        elements.generateShareBtn.innerHTML = `Encrypting with AES-256 (PIN Protected)...`;

        try {
            // 1. Generate 4-digit security code (OTP) and encrypt with PBKDF2(pin, salt)
            const pin = String(Math.floor(1000 + Math.random() * 9000));
            const { ciphertext, iv, salt, pinHash } = await encryptPayloadWithPin(payload, pin);

            const { apiUrl, viewerUrl } = getSharingServiceUrls();
            const localOrigin = window.location.origin || `http://${window.location.host || '127.0.0.1:5432'}`;

            elements.generateShareBtn.innerHTML = `Uploading encrypted payload...`;

            // 2. Upload ciphertext + IV + salt + pinHash
            // (Plaintext password and decryption PIN NEVER leave the device in the URL!)
            let res = null;
            let usedApiUrl = apiUrl;
            let usedViewerUrl = viewerUrl;

            try {
                res = await fetch(`${apiUrl}/shares`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                        ciphertext,
                        iv,
                        salt,
                        pin_hash: pinHash,
                        title: payload.title || entry.title || 'Credential',
                        uname: payload.uname || entry.uname || '',
                        expires_in: expiresInSeconds
                    })
                });
            } catch (netErr) {
                // If remote worker failed, fallback to local desktop sharing service
                if (apiUrl !== localOrigin) {
                    try {
                        usedApiUrl = localOrigin;
                        usedViewerUrl = `${localOrigin}/share.html`;
                        res = await fetch(`${localOrigin}/shares`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Accept': 'application/json'
                            },
                            body: JSON.stringify({
                                ciphertext,
                                iv,
                                salt,
                                pin_hash: pinHash,
                                title: payload.title || entry.title || 'Credential',
                                uname: payload.uname || entry.uname || '',
                                expires_in: expiresInSeconds
                            })
                        });
                        showToast(`Notice: Remote sharing endpoint (${apiUrl}) unreachable. Generated link via local desktop server.`, 'warning');
                    } catch (fallbackErr) {
                        res = null;
                    }
                }
            }

            if (!res || !res.ok) {
                const errData = res ? await res.json().catch(() => ({})) : {};
                showToast(errData.error || `Unable to reach sharing service at ${apiUrl}. Please check your connection or Cloud Sharing settings.`, 'danger');
                elements.generateShareBtn.disabled = false;
                elements.generateShareBtn.innerHTML = `Generate Secure Share Link`;
                return;
            }

            const data = await res.json();
            const { shareId, expiresAt, revocationToken } = data;
            currentActiveShareId = shareId;
            currentShareRevocationToken = revocationToken;

            // 3. Assemble Clean Share URL (NO key in URL! NO ?api= in URL!)
            const shareUrl = `${usedViewerUrl}#shareId=${shareId}`;

            // Save active share locally for management/revocation
            saveStoredActiveShare({
                shareId,
                entryId: entry.id,
                title: entry.title || 'Credential',
                pin,
                createdAt: Math.floor(Date.now() / 1000),
                expiresAt,
                revocationToken,
                shareUrl,
                apiUrl: usedApiUrl
            });

            // 4. Switch to Stage 2: Generated Result View
            elements.shareConfigStage.style.display = 'none';
            elements.shareResultStage.style.display = 'block';

            if (elements.shareResultTargetTitle) {
                elements.shareResultTargetTitle.textContent = entry.title || 'Protected Credential';
            }
            if (elements.shareLinkInput) {
                elements.shareLinkInput.value = shareUrl;
            }
            if (elements.shareCodeDisplay) {
                elements.shareCodeDisplay.textContent = pin;
            }
            if (elements.revokeCurrentShareBtn) {
                elements.revokeCurrentShareBtn.disabled = false;
                elements.revokeCurrentShareBtn.textContent = 'Revoke Now';
            }

            // Start live countdown timer
            startShareCountdown(expiresAt);

            // Copy link and code
            const shareText = `VaultKey Secure Share — ${entry.title || 'Credential'}\nLink: ${shareUrl}\n4-Digit Security Code: ${pin}`;
            copyToClipboard(shareText, 'Share link & 4-digit code generated and copied!');
        } catch (err) {
            console.error('Encryption/Sharing failed:', err);
            showToast(`Encryption failed: ${err.message}`, 'danger');
            elements.generateShareBtn.disabled = false;
            elements.generateShareBtn.innerHTML = `Generate Secure Share Link`;
        }
    }

    function startShareCountdown(expiresAtSec) {
        if (shareCountdownInterval) clearInterval(shareCountdownInterval);

        const updateTimer = () => {
            const nowSec = Math.floor(Date.now() / 1000);
            const remaining = Math.max(0, expiresAtSec - nowSec);
            const m = Math.floor(remaining / 60);
            const s = remaining % 60;

            if (elements.shareModalTimer) {
                elements.shareModalTimer.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
                if (remaining <= 0) {
                    clearInterval(shareCountdownInterval);
                    elements.shareModalTimer.textContent = 'EXPIRED';
                    elements.shareModalTimer.classList.add('expired');
                    if (elements.shareLinkInput) elements.shareLinkInput.disabled = true;
                    if (elements.revokeCurrentShareBtn) elements.revokeCurrentShareBtn.disabled = true;
                }
            }
        };

        updateTimer();
        shareCountdownInterval = setInterval(updateTimer, 1000);
    }

    // Revoke share on server
    async function executeRevocation(shareId, revocationToken, onSuccess) {
        if (!shareId || !revocationToken) return;

        const { apiUrl } = getSharingServiceUrls();
        try {
            const res = await fetch(`${apiUrl}/shares/${encodeURIComponent(shareId)}`, {
                method: 'DELETE',
                headers: {
                    'X-Revocation-Token': revocationToken,
                    'Accept': 'application/json'
                }
            });

            if (res.ok) {
                markStoredShareRevoked(shareId);
                showToast('Share link permanently revoked and deleted from server.', 'success');
                if (typeof onSuccess === 'function') onSuccess();
            } else {
                const data = await res.json().catch(() => ({}));
                showToast(data.error || 'Failed to revoke share.', 'danger');
            }
        } catch (e) {
            showToast('Network error while revoking share. Please try again.', 'danger');
        }
    }

    // Render Active Shares table in Cloud Sharing Settings Tab
    function renderActiveSharesList() {
        if (!elements.activeSharesList || !elements.noActiveSharesNotice) return;

        const shares = getStoredActiveShares();
        elements.activeSharesList.innerHTML = '';

        if (shares.length === 0) {
            elements.noActiveSharesNotice.style.display = 'block';
            return;
        }

        elements.noActiveSharesNotice.style.display = 'none';
        const now = Math.floor(Date.now() / 1000);

        shares.forEach(item => {
            const card = document.createElement('div');
            card.className = 'active-share-card';

            const remaining = Math.max(0, item.expiresAt - now);
            const m = Math.floor(remaining / 60);
            const s = remaining % 60;
            const timeStr = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

            card.innerHTML = `
                <div class="active-share-info">
                    <div class="active-share-title">${escapeHtml(item.title)}</div>
                    <div class="active-share-meta">Expires in: <strong>${timeStr}</strong> &bull; ID: ${escapeHtml(item.shareId.substring(0, 10))}...</div>
                </div>
                <div class="active-share-actions">
                    <button type="button" class="btn btn-secondary btn-sm copy-btn" title="Copy share link">Copy</button>
                    <button type="button" class="btn btn-danger btn-sm revoke-btn" title="Revoke this share">Revoke</button>
                </div>
            `;

            card.querySelector('.copy-btn').addEventListener('click', () => {
                copyToClipboard(item.shareUrl, 'Share link copied to clipboard!');
            });

            card.querySelector('.revoke-btn').addEventListener('click', () => {
                if (confirm(`Permanently revoke the share for "${item.title}"? The recipient will immediately lose access.`)) {
                    executeRevocation(item.shareId, item.revocationToken, () => {
                        card.remove();
                        if (elements.activeSharesList.children.length === 0) {
                            elements.noActiveSharesNotice.style.display = 'block';
                        }
                    });
                }
            });

            elements.activeSharesList.appendChild(card);
        });
    }

    function setupShareModal() {
        // Expiration radio toggle
        if (elements.shareExpOptions) {
            elements.shareExpOptions.forEach(r => {
                r.addEventListener('change', () => {
                    if (elements.shareCustomExpRow) {
                        elements.shareCustomExpRow.style.display = r.value === 'custom' ? 'flex' : 'none';
                    }
                });
            });
        }

        // Generate button
        if (elements.generateShareBtn) {
            elements.generateShareBtn.addEventListener('click', handleGenerateShare);
        }

        // Copy Share Link button
        if (elements.copyShareLinkBtn) {
            elements.copyShareLinkBtn.addEventListener('click', () => {
                if (elements.shareLinkInput && elements.shareLinkInput.value) {
                    copyToClipboard(elements.shareLinkInput.value, 'Share link copied to clipboard!');
                }
            });
        }

        // Copy Share Code (PIN) button
        if (elements.copyShareCodeBtn) {
            elements.copyShareCodeBtn.addEventListener('click', () => {
                if (elements.shareCodeDisplay && elements.shareCodeDisplay.textContent) {
                    copyToClipboard(elements.shareCodeDisplay.textContent.trim(), '4-Digit PIN copied to clipboard!');
                }
            });
        }

        // Copy All (Link + Code) button
        if (elements.copyAllShareInfoBtn) {
            elements.copyAllShareInfoBtn.addEventListener('click', () => {
                const title = elements.shareResultTargetTitle ? elements.shareResultTargetTitle.textContent : 'Credential';
                const link = elements.shareLinkInput ? elements.shareLinkInput.value : '';
                const pin = elements.shareCodeDisplay ? elements.shareCodeDisplay.textContent.trim() : '';
                const text = `VaultKey Secure Share — ${title}\nLink: ${link}\n4-Digit Security Code: ${pin}\n(Recipient must enter code to unlock and decrypt password)`;
                copyToClipboard(text, 'Share link and 4-digit code copied!');
            });
        }

        // Open Share Link button
        if (elements.openShareLinkBtn) {
            elements.openShareLinkBtn.addEventListener('click', () => {
                if (elements.shareLinkInput && elements.shareLinkInput.value && elements.shareLinkInput.value.startsWith('http')) {
                    window.open(elements.shareLinkInput.value, '_blank');
                }
            });
        }

        // Revoke Current Share button (Stage 2)
        if (elements.revokeCurrentShareBtn) {
            elements.revokeCurrentShareBtn.addEventListener('click', () => {
                if (!currentActiveShareId || !currentShareRevocationToken) return;
                if (confirm('Permanently revoke and destroy this share link immediately?')) {
                    elements.revokeCurrentShareBtn.disabled = true;
                    elements.revokeCurrentShareBtn.textContent = 'Revoking...';
                    executeRevocation(currentActiveShareId, currentShareRevocationToken, () => {
                        elements.revokeCurrentShareBtn.textContent = 'Revoked';
                        if (elements.shareModalTimer) {
                            elements.shareModalTimer.textContent = 'REVOKED';
                            elements.shareModalTimer.classList.add('expired');
                        }
                        if (elements.shareLinkInput) {
                            elements.shareLinkInput.value = 'Share link revoked and destroyed.';
                            elements.shareLinkInput.disabled = true;
                        }
                    });
                }
            });
        }

        // Configure Another button (Back to Stage 1)
        if (elements.shareConfigBackBtn) {
            elements.shareConfigBackBtn.addEventListener('click', () => {
                if (state.activeShareEntry) {
                    openShareModal(state.activeShareEntry);
                }
            });
        }
    }

    // ==================== PREFERENCES & CUSTOMIZATION SYSTEM ====================

    async function initPreferences() {
        // 1. Load from localStorage cache for immediate layout/theme painting
        try {
            const cached = localStorage.getItem('vault_preferences');
            if (cached) {
                const parsed = JSON.parse(cached);
                mergePreferences(parsed);
            }
        } catch (err) {
            console.warn('Error reading cached preferences', err);
        }

        // Apply immediately
        applyLayout(state.preferences.layout, state.preferences.sidebar_collapsed, false);
        applyTheme(state.preferences.theme, false);
        setViewMode(state.preferences.view_mode || 'grid', false);

        // 2. Sync with backend API
        try {
            const res = await apiRequest('/api/preferences');
            if (res.ok && res.data) {
                mergePreferences(res.data);
                applyLayout(state.preferences.layout, state.preferences.sidebar_collapsed, false);
                applyTheme(state.preferences.theme, false);
                setViewMode(state.preferences.view_mode || 'grid', false);
                try {
                    localStorage.setItem('vault_preferences', JSON.stringify(state.preferences));
                } catch (e) {}
            }
        } catch (err) {
            console.warn('Failed syncing preferences with backend', err);
        }

        // Initialize UI components
        setupViewModeSwitcher();
        setupAvatarPicker();
        setupShareModal();
        setupSettingsModule();
        setupCommandPalette();
        setupShortcutsHelpModal();
        setupNavigationButtons();
        setupSaasCategoryControls();
        updateButtonShortcutBadges();
    }

    function mergePreferences(data) {
        if (!data || typeof data !== 'object') return;
        if (data.layout && (data.layout === 'classic' || data.layout === 'sidebar')) {
            state.preferences.layout = data.layout;
        }
        if (typeof data.sidebar_collapsed === 'boolean') {
            state.preferences.sidebar_collapsed = data.sidebar_collapsed;
        }
        if (data.view_mode && (data.view_mode === 'grid' || data.view_mode === 'table')) {
            state.preferences.view_mode = data.view_mode;
        }
        if (data.theme && ['dark', 'light', 'system'].includes(data.theme)) {
            state.preferences.theme = data.theme;
        }
        if (data.button_colors && typeof data.button_colors === 'object') {
            state.preferences.button_colors = {
                dark: { ...DEFAULT_PREFERENCES.button_colors.dark, ...(data.button_colors.dark || {}) },
                light: { ...DEFAULT_PREFERENCES.button_colors.light, ...(data.button_colors.light || {}) }
            };
        }
        if (data.shortcuts && typeof data.shortcuts === 'object') {
            state.preferences.shortcuts = {
                ...DEFAULT_PREFERENCES.shortcuts,
                ...data.shortcuts
            };
        }
        if (data.sharing && typeof data.sharing === 'object') {
            state.preferences.sharing = {
                ...DEFAULT_PREFERENCES.sharing,
                ...data.sharing
            };
        }
    }

    async function savePreferences(updates = {}, syncBackend = true) {
        mergePreferences(updates);
        try {
            localStorage.setItem('vault_preferences', JSON.stringify(state.preferences));
        } catch (e) {}

        if (syncBackend) {
            try {
                await apiRequest('/api/preferences', 'POST', state.preferences);
            } catch (err) {
                console.warn('Failed saving preferences to server', err);
            }
        }
    }

    // ==================== THEME CONTROLLER ====================
    function getEffectiveTheme(themeMode) {
        if (themeMode === 'system') {
            return (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
        }
        return themeMode === 'light' ? 'light' : 'dark';
    }

    function applyTheme(mode, syncBackend = true) {
        if (!['dark', 'light', 'system'].includes(mode)) mode = 'dark';
        state.preferences.theme = mode;
        const effective = getEffectiveTheme(mode);
        state.theme = effective;

        elements.html.setAttribute('data-theme', effective);
        if (elements.app) elements.app.setAttribute('data-theme', effective);

        // Apply custom button colors for the active theme
        applyCurrentButtonColors();

        // Update settings cards and radio inputs
        if (elements.themeChoiceCards) {
            elements.themeChoiceCards.forEach(card => {
                const choice = card.getAttribute('data-theme-choice');
                const isSelected = choice === mode;
                card.classList.toggle('is-active', isSelected);
                const radio = card.querySelector('input[type="radio"]');
                if (radio) radio.checked = isSelected;
            });
        }

        if (syncBackend) {
            savePreferences({ theme: mode });
        }

        const themeLabel = mode === 'system' ? 'System Theme' : `${mode.charAt(0).toUpperCase() + mode.slice(1)} Mode`;
        const tip = `Theme: ${themeLabel} (Ctrl+Shift+D to toggle)`;
        if (elements.themeToggleBtn) {
            elements.themeToggleBtn.setAttribute('title', tip);
            elements.themeToggleBtn.setAttribute('aria-label', tip);
        }
        if (elements.sidebarThemeToggleBtn) {
            elements.sidebarThemeToggleBtn.setAttribute('title', tip);
            elements.sidebarThemeToggleBtn.setAttribute('aria-label', tip);
        }
    }

    function toggleTheme() {
        let next = 'dark';
        if (state.preferences.theme === 'dark') next = 'light';
        else if (state.preferences.theme === 'light') next = 'system';
        else next = 'dark';
        applyTheme(next);
        const label = next === 'system' ? 'System Theme' : `${next.charAt(0).toUpperCase() + next.slice(1)} Mode`;
        showToast(`Appearance: ${label}`);
    }

    if (window.matchMedia) {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
            if (state.preferences.theme === 'system') {
                applyTheme('system', false);
            }
        });
    }

    // ==================== LAYOUT CONTROLLER ====================
    function applyLayout(layout, sidebarCollapsed = false, syncBackend = true) {
        if (layout !== 'classic' && layout !== 'sidebar') layout = 'classic';
        state.preferences.layout = layout;
        state.preferences.sidebar_collapsed = !!sidebarCollapsed;

        elements.html.setAttribute('data-layout', layout);
        if (elements.app) {
            elements.app.setAttribute('data-layout', layout);
            if (layout === 'sidebar' && sidebarCollapsed) {
                elements.app.classList.add('sidebar-collapsed');
                elements.html.classList.add('sidebar-collapsed');
            } else {
                elements.app.classList.remove('sidebar-collapsed');
                elements.html.classList.remove('sidebar-collapsed');
            }
        }

        // Update settings layout selection cards
        if (elements.cardLayoutClassic && elements.cardLayoutSidebar) {
            elements.cardLayoutClassic.classList.toggle('is-active', layout === 'classic');
            elements.cardLayoutSidebar.classList.toggle('is-active', layout === 'sidebar');

            const btnClassic = elements.cardLayoutClassic.querySelector('.select-layout-btn');
            const btnSidebar = elements.cardLayoutSidebar.querySelector('.select-layout-btn');
            if (btnClassic) btnClassic.textContent = layout === 'classic' ? '✓ Active Layout' : 'Select Classic Layout';
            if (btnSidebar) btnSidebar.textContent = layout === 'sidebar' ? '✓ Active Layout' : 'Select SaaS Tabs Layout';
        }

        if (syncBackend) {
            savePreferences({ layout: layout, sidebar_collapsed: !!sidebarCollapsed });
        }

        requestAnimationFrame(() => updateSaasScrollButtons());
    }

    function toggleLayout() {
        const next = state.preferences.layout === 'classic' ? 'sidebar' : 'classic';
        applyLayout(next, state.preferences.sidebar_collapsed);
        showToast(`Layout: ${next === 'classic' ? 'Classic Layout' : 'SaaS Tabs Layout (No Sidebar)'}`);
    }

    function toggleSidebarCollapse() {
        const nextCollapsed = !state.preferences.sidebar_collapsed;
        applyLayout(state.preferences.layout, nextCollapsed);
    }

    // ==================== BUTTON APPEARANCE CONTROLLER ====================
    function getCurrentButtonColors(themeName) {
        const target = themeName || (state.theme === 'light' ? 'light' : 'dark');
        const fallback = DEFAULT_PREFERENCES.button_colors[target];
        const current = (state.preferences.button_colors && state.preferences.button_colors[target])
            ? state.preferences.button_colors[target]
            : fallback;
        return { ...fallback, ...current };
    }

    function applyCurrentButtonColors() {
        const colors = getCurrentButtonColors();
        const rootStyle = document.documentElement.style;

        rootStyle.setProperty('--color-button-primary-bg', colors.primary_bg);
        rootStyle.setProperty('--color-button-primary-text', colors.primary_text);
        rootStyle.setProperty('--color-button-primary-hover', colors.primary_hover || colors.primary_bg);
        rootStyle.setProperty('--color-button-secondary-bg', colors.secondary_bg);
        rootStyle.setProperty('--color-button-secondary-text', colors.secondary_text);
        rootStyle.setProperty('--color-button-secondary-hover', colors.secondary_hover || colors.secondary_bg);
        rootStyle.setProperty('--color-accent', colors.accent || colors.primary_bg);

        updateButtonSettingsUI();
    }

    function updateButtonSettingsUI() {
        const target = state.activeButtonThemeTarget;
        const colors = getCurrentButtonColors(target);

        // Update target theme switcher buttons
        if (elements.btnThemeTargetDark && elements.btnThemeTargetLight) {
            elements.btnThemeTargetDark.classList.toggle('active', target === 'dark');
            elements.btnThemeTargetLight.classList.toggle('active', target === 'light');
        }

        // Sync inputs
        if (elements.pickerPrimaryBg) elements.pickerPrimaryBg.value = colors.primary_bg;
        if (elements.hexPrimaryBg) elements.hexPrimaryBg.value = colors.primary_bg;
        if (elements.pickerPrimaryText) elements.pickerPrimaryText.value = colors.primary_text;
        if (elements.hexPrimaryText) elements.hexPrimaryText.value = colors.primary_text;
        if (elements.pickerSecondaryBg) elements.pickerSecondaryBg.value = colors.secondary_bg;
        if (elements.hexSecondaryBg) elements.hexSecondaryBg.value = colors.secondary_bg;
        if (elements.pickerSecondaryText) elements.pickerSecondaryText.value = colors.secondary_text;
        if (elements.hexSecondaryText) elements.hexSecondaryText.value = colors.secondary_text;
        if (elements.pickerPrimaryHover) elements.pickerPrimaryHover.value = colors.primary_hover || colors.primary_bg;
        if (elements.hexPrimaryHover) elements.hexPrimaryHover.value = colors.primary_hover || colors.primary_bg;
        if (elements.pickerAccent) elements.pickerAccent.value = colors.accent || colors.primary_bg;
        if (elements.hexAccent) elements.hexAccent.value = colors.accent || colors.primary_bg;

        // Contrast calculation
        const primaryRatio = calculateContrastRatio(colors.primary_bg, colors.primary_text);
        const secondaryRatio = calculateContrastRatio(colors.secondary_bg, colors.secondary_text);

        if (elements.primaryContrastPill) {
            elements.primaryContrastPill.textContent = `Primary: ${primaryRatio}:1 (${primaryRatio >= 4.5 ? 'Accessible' : 'Low Contrast'})`;
            elements.primaryContrastPill.style.color = primaryRatio >= 4.5 ? 'var(--color-success)' : 'var(--color-warning)';
        }
        if (elements.secondaryContrastPill) {
            elements.secondaryContrastPill.textContent = `Secondary: ${secondaryRatio}:1 (${secondaryRatio >= 4.5 ? 'Accessible' : 'Low Contrast'})`;
            elements.secondaryContrastPill.style.color = secondaryRatio >= 4.5 ? 'var(--color-success)' : 'var(--color-warning)';
        }

        // Contrast Warning banner
        if (elements.contrastWarningBox) {
            if (primaryRatio < 4.5 || secondaryRatio < 4.5) {
                elements.contrastWarningBox.classList.remove('hidden');
                const culprit = primaryRatio < 4.5 && secondaryRatio < 4.5
                    ? 'Both Primary and Secondary buttons have'
                    : primaryRatio < 4.5 ? 'The Primary button has' : 'The Secondary button has';
                if (elements.contrastWarningText) {
                    elements.contrastWarningText.textContent = `⚠️ Contrast Warning: ${culprit} low contrast (< 4.5:1). Text may be hard to read. Recommended contrast is at least 4.5:1.`;
                }
            } else {
                elements.contrastWarningBox.classList.add('hidden');
            }
        }

        // Live preview elements
        if (elements.previewPrimaryBtn) {
            elements.previewPrimaryBtn.style.backgroundColor = colors.primary_bg;
            elements.previewPrimaryBtn.style.color = colors.primary_text;
            elements.previewPrimaryBtn.style.borderColor = colors.primary_bg;
        }
        if (elements.previewSecondaryBtn) {
            elements.previewSecondaryBtn.style.backgroundColor = colors.secondary_bg;
            elements.previewSecondaryBtn.style.color = colors.secondary_text;
        }
        if (elements.previewAccentBadge) {
            elements.previewAccentBadge.style.backgroundColor = colors.accent || colors.primary_bg;
            elements.previewAccentBadge.style.color = colors.primary_text;
        }
    }

    let saveButtonColorsTimeout = null;
    function handleColorChange(key, value) {
        if (!isValidHex(value)) return;
        const target = state.activeButtonThemeTarget;
        if (!state.preferences.button_colors[target]) {
            state.preferences.button_colors[target] = { ...DEFAULT_PREFERENCES.button_colors[target] };
        }
        state.preferences.button_colors[target][key] = value;

        applyCurrentButtonColors();

        clearTimeout(saveButtonColorsTimeout);
        saveButtonColorsTimeout = setTimeout(() => {
            savePreferences({ button_colors: state.preferences.button_colors });
        }, 300);
    }

    // ==================== SHORTCUTS METADATA & TABLE ====================
    const SHORTCUT_METADATA = {
        command_palette: {
            title: 'Global Search & Command Palette',
            desc: 'Search credentials and trigger application commands quickly',
            default: 'Ctrl+K'
        },
        settings: {
            title: 'Open Settings',
            desc: 'Access Appearance, Layout Selection, Button Colors, and Shortcuts',
            default: 'Ctrl+,'
        },
        toggle_layout: {
            title: 'Toggle Application Layout',
            desc: 'Switch between Classic Layout and Sidebar Workspace Layout',
            default: 'Ctrl+Shift+L'
        },
        toggle_theme: {
            title: 'Toggle Dark / Light Theme',
            desc: 'Cycle between Dark Mode, Light Mode, and System Theme',
            default: 'Ctrl+Shift+D'
        },
        shortcuts_modal: {
            title: 'Keyboard Shortcuts Reference',
            desc: 'Display quick reference guide of all available keyboard shortcuts',
            default: 'Ctrl+/'
        },
        new_category: {
            title: 'Create New Category',
            desc: 'Open category creation dialog (preserves legacy Ctrl+Shift+F)',
            default: 'Ctrl+Shift+F'
        },
        new_password: {
            title: 'Add New Password',
            desc: 'Open the password creation dialog with generator badges',
            default: 'Ctrl+Shift+A'
        },
        quick_generator: {
            title: 'Password Generator Quick Launch',
            desc: 'Open high-entropy password and PIN generator modal',
            default: 'Ctrl+Shift+G'
        }
    };

    function renderShortcutsTable() {
        if (!elements.shortcutsTableBody) return;
        elements.shortcutsTableBody.innerHTML = '';

        for (const [actionId, meta] of Object.entries(SHORTCUT_METADATA)) {
            const currentCombo = state.preferences.shortcuts[actionId] || meta.default;
            const isRecording = state.recordingShortcutKey === actionId;

            const tr = document.createElement('tr');
            if (isRecording) tr.classList.add('recording-shortcut');

            tr.innerHTML = `
                <td><strong>${escapeHtml(meta.title)}</strong></td>
                <td><span class="text-secondary text-xs">${escapeHtml(meta.desc)}</span></td>
                <td>
                    ${isRecording 
                        ? '<span class="badge badge-accent">Press key combo... (Esc to cancel)</span>'
                        : `<kbd>${escapeHtml(currentCombo)}</kbd>`}
                </td>
                <td class="text-right">
                    <button type="button" class="btn btn-secondary btn-xs btn-edit-shortcut" data-action="${actionId}">
                        ${isRecording ? 'Cancel' : 'Edit'}
                    </button>
                </td>
            `;

            tr.querySelector('.btn-edit-shortcut').addEventListener('click', (e) => {
                e.stopPropagation();
                if (state.recordingShortcutKey === actionId) {
                    state.recordingShortcutKey = null;
                    if (elements.shortcutConflictAlert) elements.shortcutConflictAlert.classList.add('hidden');
                } else {
                    state.recordingShortcutKey = actionId;
                    if (elements.shortcutConflictAlert) elements.shortcutConflictAlert.classList.add('hidden');
                }
                renderShortcutsTable();
            });

            elements.shortcutsTableBody.appendChild(tr);
        }

        updateButtonShortcutBadges();
    }

    function updateButtonShortcutBadges() {
        const s = state.preferences.shortcuts;
        if (!s) return;
        const catBadge = document.getElementById('newCategoryKbdBadge');
        if (catBadge && s.new_category) catBadge.textContent = s.new_category;

        const pwBadge = document.getElementById('newPasswordKbdBadge');
        if (pwBadge && s.new_password) pwBadge.textContent = s.new_password;

        if (elements.openNewEntryModalBtn && s.new_password) {
            elements.openNewEntryModalBtn.title = `Add New Password (${s.new_password})`;
        }
        if (elements.openNewCategoryModalBtn && s.new_category) {
            elements.openNewCategoryModalBtn.title = `Create Category (${s.new_category})`;
        }
    }

    function findShortcutConflict(targetAction, keyString) {
        for (const [action, combo] of Object.entries(state.preferences.shortcuts)) {
            if (action !== targetAction && combo.toLowerCase() === keyString.toLowerCase()) {
                return action;
            }
        }
        return null;
    }

    // ==================== SETTINGS MODULE SETUP ====================
    function setupSettingsModule() {
        // Tab switching
        elements.settingsTabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetTab = btn.getAttribute('data-tab');
                state.activeSettingsTab = targetTab;
                elements.settingsTabBtns.forEach(b => b.classList.toggle('active', b === btn));
                elements.settingsTabContents.forEach(pane => {
                    pane.classList.toggle('active', pane.id === targetTab);
                });
                if (targetTab === 'shortcutsTab') {
                    renderShortcutsTable();
                } else if (targetTab === 'buttonsTab') {
                    updateButtonSettingsUI();
                } else if (targetTab === 'sharingTab') {
                    initSharingTabUI();
                }
            });
        });

        // Theme cards click
        elements.themeChoiceCards.forEach(card => {
            card.addEventListener('click', () => {
                const themeVal = card.getAttribute('data-theme-choice');
                applyTheme(themeVal);
            });
        });

        // Layout cards click
        if (elements.cardLayoutClassic) {
            elements.cardLayoutClassic.addEventListener('click', () => {
                applyLayout('classic', state.preferences.sidebar_collapsed);
            });
        }
        if (elements.cardLayoutSidebar) {
            elements.cardLayoutSidebar.addEventListener('click', () => {
                applyLayout('sidebar', state.preferences.sidebar_collapsed);
            });
        }

        // Button customization theme target
        if (elements.btnThemeTargetDark) {
            elements.btnThemeTargetDark.addEventListener('click', () => {
                state.activeButtonThemeTarget = 'dark';
                updateButtonSettingsUI();
            });
        }
        if (elements.btnThemeTargetLight) {
            elements.btnThemeTargetLight.addEventListener('click', () => {
                state.activeButtonThemeTarget = 'light';
                updateButtonSettingsUI();
            });
        }

        // Color input pairs 2-way binding
        const bindColorPair = (picker, hexInput, key) => {
            if (!picker || !hexInput) return;
            picker.addEventListener('input', (e) => {
                hexInput.value = e.target.value;
                handleColorChange(key, e.target.value);
            });
            hexInput.addEventListener('input', (e) => {
                let val = e.target.value.trim();
                if (!val.startsWith('#') && val.length > 0) val = '#' + val;
                if (isValidHex(val)) {
                    picker.value = val;
                    handleColorChange(key, val);
                }
            });
        };

        bindColorPair(elements.pickerPrimaryBg, elements.hexPrimaryBg, 'primary_bg');
        bindColorPair(elements.pickerPrimaryText, elements.hexPrimaryText, 'primary_text');
        bindColorPair(elements.pickerSecondaryBg, elements.hexSecondaryBg, 'secondary_bg');
        bindColorPair(elements.pickerSecondaryText, elements.hexSecondaryText, 'secondary_text');
        bindColorPair(elements.pickerPrimaryHover, elements.hexPrimaryHover, 'primary_hover');
        bindColorPair(elements.pickerAccent, elements.hexAccent, 'accent');

        // Reset Button Colors
        if (elements.resetButtonColorsBtn) {
            elements.resetButtonColorsBtn.addEventListener('click', () => {
                const target = state.activeButtonThemeTarget;
                state.preferences.button_colors[target] = { ...DEFAULT_PREFERENCES.button_colors[target] };
                applyCurrentButtonColors();
                savePreferences({ button_colors: state.preferences.button_colors });
                showToast(`Button colors for ${target} theme reset to default.`);
            });
        }

        // Reset Shortcuts to Defaults
        if (elements.resetShortcutsBtn) {
            elements.resetShortcutsBtn.addEventListener('click', () => {
                state.preferences.shortcuts = { ...DEFAULT_PREFERENCES.shortcuts };
                state.recordingShortcutKey = null;
                if (elements.shortcutConflictAlert) elements.shortcutConflictAlert.classList.add('hidden');
                renderShortcutsTable();
                savePreferences({ shortcuts: state.preferences.shortcuts });
                showToast('Keyboard shortcuts reset to defaults.');
            });
        }

        // Reset Preferences Cards (Reset Tab)
        if (elements.resetBtnColorsActionBtn) {
            elements.resetBtnColorsActionBtn.addEventListener('click', () => {
                openResetConfirmation('button_colors', 'Are you sure you want to reset button colors for all themes back to default?');
            });
        }
        if (elements.resetShortcutsActionBtn) {
            elements.resetShortcutsActionBtn.addEventListener('click', () => {
                openResetConfirmation('shortcuts', 'Are you sure you want to reset all keyboard shortcuts back to standard application defaults?');
            });
        }
        if (elements.resetAllPrefsActionBtn) {
            elements.resetAllPrefsActionBtn.addEventListener('click', () => {
                openResetConfirmation('all', 'Are you sure you want to reset ALL customization preferences (Layout, Theme, Button Colors, and Shortcuts)?');
            });
        }

        if (elements.confirmResetActionBtn) {
            elements.confirmResetActionBtn.addEventListener('click', async () => {
                const section = state.pendingResetSection;
                closeModal(elements.resetConfirmModal);

                try {
                    const res = await apiRequest('/api/preferences/reset', 'POST', { section: section || 'all' });
                    if (res.ok && res.data && res.data.preferences) {
                        mergePreferences(res.data.preferences);
                    } else {
                        // Fallback client reset
                        if (section === 'button_colors') {
                            state.preferences.button_colors = JSON.parse(JSON.stringify(DEFAULT_PREFERENCES.button_colors));
                        } else if (section === 'shortcuts') {
                            state.preferences.shortcuts = JSON.parse(JSON.stringify(DEFAULT_PREFERENCES.shortcuts));
                        } else {
                            state.preferences = JSON.parse(JSON.stringify(DEFAULT_PREFERENCES));
                        }
                    }
                } catch (e) {
                    state.preferences = JSON.parse(JSON.stringify(DEFAULT_PREFERENCES));
                }

                localStorage.setItem('vault_preferences', JSON.stringify(state.preferences));
                applyLayout(state.preferences.layout, state.preferences.sidebar_collapsed, false);
                applyTheme(state.preferences.theme, false);
                renderShortcutsTable();
                updateButtonSettingsUI();
                showToast('Preferences successfully reset.');
            });
        }

        function initSharingTabUI() {
            const { apiUrl, viewerUrl } = getSharingServiceUrls();
            if (elements.prefSharingApiUrl) elements.prefSharingApiUrl.value = apiUrl;
            if (elements.prefSharingViewerUrl) elements.prefSharingViewerUrl.value = viewerUrl;
            if (elements.testSharingConnStatus) {
                elements.testSharingConnStatus.textContent = 'Connects to your Cloudflare Worker API.';
                elements.testSharingConnStatus.style.color = 'var(--text-muted)';
            }
            renderActiveSharesList();
        }

        if (elements.saveSharingSettingsBtn) {
            elements.saveSharingSettingsBtn.addEventListener('click', async () => {
                const newApi = (elements.prefSharingApiUrl ? elements.prefSharingApiUrl.value : '').trim().replace(/\/+$/, '');
                const newViewer = (elements.prefSharingViewerUrl ? elements.prefSharingViewerUrl.value : '').trim().replace(/\/+$/, '');

                if (!state.preferences.sharing) state.preferences.sharing = {};
                state.preferences.sharing.api_url = newApi || 'https://vaultkey-share-api.pritishdash44.workers.dev';
                state.preferences.sharing.viewer_url = newViewer || 'https://vaultkey-secret.pages.dev';

                localStorage.setItem('vaultkey_sharing_api', state.preferences.sharing.api_url);
                localStorage.setItem('vaultkey_sharing_viewer', state.preferences.sharing.viewer_url);

                await savePreferences({ sharing: state.preferences.sharing });
                showToast('Sharing configuration saved successfully.', 'success');
            });
        }

        if (elements.testSharingConnBtn) {
            elements.testSharingConnBtn.addEventListener('click', async () => {
                const targetApi = (elements.prefSharingApiUrl ? elements.prefSharingApiUrl.value : '').trim().replace(/\/+$/, '');
                if (!targetApi) {
                    showToast('Please enter an API URL first.', 'warning');
                    return;
                }
                elements.testSharingConnBtn.disabled = true;
                elements.testSharingConnBtn.textContent = 'Testing...';
                if (elements.testSharingConnStatus) {
                    elements.testSharingConnStatus.textContent = 'Contacting endpoint...';
                    elements.testSharingConnStatus.style.color = 'var(--text-muted)';
                }

                try {
                    const res = await fetch(`${targetApi}/health`, { method: 'GET', headers: { 'Accept': 'application/json' } });
                    if (res.ok) {
                        const data = await res.json().catch(() => ({}));
                        if (elements.testSharingConnStatus) {
                            elements.testSharingConnStatus.textContent = `Connected successfully! (${data.service || 'Sharing API online'})`;
                            elements.testSharingConnStatus.style.color = '#10b981';
                        }
                        showToast('Sharing service reachable and operational!', 'success');
                    } else {
                        if (elements.testSharingConnStatus) {
                            elements.testSharingConnStatus.textContent = `Server responded with status HTTP ${res.status}.`;
                            elements.testSharingConnStatus.style.color = '#f87171';
                        }
                    }
                } catch (e) {
                    if (elements.testSharingConnStatus) {
                        elements.testSharingConnStatus.textContent = `Connection failed: ${e.message}. Check URL and CORS.`;
                        elements.testSharingConnStatus.style.color = '#f87171';
                    }
                    showToast('Could not reach sharing API endpoint.', 'danger');
                } finally {
                    elements.testSharingConnBtn.disabled = false;
                    elements.testSharingConnBtn.textContent = 'Test Connection';
                }
            });
        }
    }

    function openResetConfirmation(section, message) {
        state.pendingResetSection = section;
        if (elements.resetConfirmMessage) elements.resetConfirmMessage.textContent = message;
        openModal(elements.resetConfirmModal);
    }

    function openSettingsModal(targetTabName = null) {
        if (targetTabName) {
            state.activeSettingsTab = targetTabName;
            elements.settingsTabBtns.forEach(btn => {
                btn.classList.toggle('active', btn.getAttribute('data-tab') === targetTabName);
            });
            elements.settingsTabContents.forEach(pane => {
                pane.classList.toggle('active', pane.id === targetTabName);
            });
        }
        renderShortcutsTable();
        updateButtonSettingsUI();
        openModal(elements.settingsModal);
    }

    // ==================== COMMAND PALETTE CONTROLLER ====================
    function getAvailableCommands() {
        const commands = [];

        // Navigation
        commands.push({
            id: 'nav_all',
            category: 'Navigation',
            title: 'All Passwords',
            desc: 'View all saved vault credentials',
            shortcut: '',
            run: () => { setFilter('all'); }
        });
        commands.push({
            id: 'nav_recent',
            category: 'Navigation',
            title: 'Recently Used Passwords',
            desc: 'View recently accessed credentials and quick actions',
            shortcut: '',
            run: () => { setFilter('recent'); }
        });

        // Dynamic categories
        state.categories.forEach(cat => {
            if (cat) {
                commands.push({
                    id: 'nav_cat_' + cat,
                    category: 'Categories',
                    title: `Category: ${cat}`,
                    desc: `Filter passwords by ${cat}`,
                    shortcut: '',
                    run: () => { setFilter(cat); }
                });
            }
        });

        // Actions
        commands.push({
            id: 'action_new_entry',
            category: 'Actions',
            title: 'Add New Password',
            desc: 'Create new encrypted credential entry',
            shortcut: state.preferences.shortcuts.new_password,
            run: () => { openNewEntryModal(); }
        });
        commands.push({
            id: 'action_new_cat',
            category: 'Actions',
            title: 'Create New Category',
            desc: 'Add a new category folder',
            shortcut: state.preferences.shortcuts.new_category,
            run: () => { openNewCategoryModal(); }
        });
        commands.push({
            id: 'action_quick_gen',
            category: 'Actions',
            title: 'Password Generator',
            desc: 'Generate secure high-entropy passwords or PINs',
            shortcut: state.preferences.shortcuts.quick_generator,
            run: () => { refreshGenerator(); openModal(elements.genModal); }
        });

        // Layout Commands
        commands.push({
            id: 'layout_classic',
            category: 'Layout Selection',
            title: 'Switch to Layout 1: Classic Layout',
            desc: 'Use horizontal top navigation bar layout with sidebar (Default)',
            shortcut: '',
            run: () => { applyLayout('classic'); showToast('Switched to Classic Layout'); }
        });
        commands.push({
            id: 'layout_sidebar',
            category: 'Layout Selection',
            title: 'Switch to Layout 2: SaaS Tabs Layout',
            desc: 'Use full-width workspace with horizontal tabs and no sidebar',
            shortcut: '',
            run: () => { applyLayout('sidebar'); showToast('Switched to SaaS Tabs Layout'); }
        });
        commands.push({
            id: 'layout_toggle',
            category: 'Layout Selection',
            title: 'Toggle Application Layout',
            desc: 'Cycle between Classic and SaaS Tabs layouts',
            shortcut: state.preferences.shortcuts.toggle_layout,
            run: () => { toggleLayout(); }
        });

        // Appearance Commands
        commands.push({
            id: 'theme_dark',
            category: 'Appearance',
            title: 'Switch to Dark Mode',
            desc: 'Monochrome charcoal, black, and gray palette',
            shortcut: '',
            run: () => { applyTheme('dark'); showToast('Switched to Dark Mode'); }
        });
        commands.push({
            id: 'theme_light',
            category: 'Appearance',
            title: 'Switch to Light Mode',
            desc: 'Monochrome white and crisp light gray surfaces',
            shortcut: '',
            run: () => { applyTheme('light'); showToast('Switched to Light Mode'); }
        });
        commands.push({
            id: 'theme_system',
            category: 'Appearance',
            title: 'Switch to System Mode',
            desc: 'Sync appearance with operating system preferences',
            shortcut: '',
            run: () => { applyTheme('system'); showToast('Switched to System Mode'); }
        });

        // Settings & Shortcuts
        commands.push({
            id: 'settings_open',
            category: 'Settings',
            title: 'Open Settings',
            desc: 'Access Appearance, Layouts, Button Colors, and Shortcuts',
            shortcut: state.preferences.shortcuts.settings,
            run: () => { openSettingsModal(); }
        });
        commands.push({
            id: 'settings_btn_colors',
            category: 'Settings',
            title: 'Customize Button Colors',
            desc: 'Configure primary, secondary, and accent colors with contrast warnings',
            shortcut: '',
            run: () => { openSettingsModal('buttonsTab'); }
        });
        commands.push({
            id: 'settings_shortcuts',
            category: 'Settings',
            title: 'Customize Keyboard Shortcuts',
            desc: 'Edit application keyboard shortcuts with conflict detection',
            shortcut: '',
            run: () => { openSettingsModal('shortcutsTab'); }
        });
        commands.push({
            id: 'shortcuts_help',
            category: 'Help',
            title: 'Keyboard Shortcuts Reference',
            desc: 'View comprehensive keyboard shortcuts reference cheat sheet',
            shortcut: state.preferences.shortcuts.shortcuts_modal,
            run: () => { openShortcutsHelpModal(); }
        });

        if (state.unlocked) {
            commands.push({
                id: 'action_lock',
                category: 'Security',
                title: 'Lock Vault Session',
                desc: 'Safely lock current vault session and erase decryption keys',
                shortcut: '',
                run: () => { lockVault(); }
            });
        }

        return commands;
    }

    function setupCommandPalette() {
        if (!elements.commandPaletteInput) return;

        elements.commandPaletteInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            filterCommandPalette(query);
        });

        elements.commandPaletteInput.addEventListener('keydown', (e) => {
            const items = elements.commandPaletteResults.querySelectorAll('.command-palette-item');
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (items.length > 0) {
                    state.commandPaletteActiveIndex = (state.commandPaletteActiveIndex + 1) % items.length;
                    highlightCommandPaletteItem();
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (items.length > 0) {
                    state.commandPaletteActiveIndex = (state.commandPaletteActiveIndex - 1 + items.length) % items.length;
                    highlightCommandPaletteItem();
                }
            } else if (e.key === 'Enter') {
                e.preventDefault();
                const activeItem = items[state.commandPaletteActiveIndex];
                if (activeItem) {
                    activeItem.click();
                }
            } else if (e.key === 'Escape') {
                closeModal(elements.commandPaletteModal);
            }
        });
    }

    function openCommandPalette() {
        if (!elements.commandPaletteModal) return;
        elements.commandPaletteInput.value = '';
        state.commandPaletteActiveIndex = 0;
        filterCommandPalette('');
        openModal(elements.commandPaletteModal);
        setTimeout(() => {
            elements.commandPaletteInput.focus();
        }, 50);
    }

    function filterCommandPalette(query) {
        const allCommands = getAvailableCommands();
        const filtered = query
            ? allCommands.filter(c => c.title.toLowerCase().includes(query) || c.category.toLowerCase().includes(query) || (c.desc && c.desc.toLowerCase().includes(query)))
            : allCommands;

        state.commandPaletteFiltered = filtered;
        state.commandPaletteActiveIndex = 0;
        renderCommandPalette();
    }

    function renderCommandPalette() {
        if (!elements.commandPaletteResults) return;
        elements.commandPaletteResults.innerHTML = '';

        if (state.commandPaletteFiltered.length === 0) {
            elements.commandPaletteResults.innerHTML = `
                <div style="padding: 24px; text-align: center; color: var(--text-muted); font-size: 13px;">
                    No commands match your search.
                </div>
            `;
            return;
        }

        let currentCategory = '';
        state.commandPaletteFiltered.forEach((cmd, idx) => {
            if (cmd.category !== currentCategory) {
                currentCategory = cmd.category;
                const catHeader = document.createElement('div');
                catHeader.className = 'command-palette-category';
                catHeader.textContent = currentCategory;
                elements.commandPaletteResults.appendChild(catHeader);
            }

            const item = document.createElement('div');
            item.className = 'command-palette-item';
            if (idx === state.commandPaletteActiveIndex) item.classList.add('is-selected');

            item.innerHTML = `
                <div class="command-palette-item-left">
                    <span>${escapeHtml(cmd.title)}</span>
                    <span class="text-secondary text-xs">${escapeHtml(cmd.desc || '')}</span>
                </div>
                ${cmd.shortcut ? `<kbd>${escapeHtml(cmd.shortcut)}</kbd>` : ''}
            `;

            item.addEventListener('mouseenter', () => {
                state.commandPaletteActiveIndex = idx;
                highlightCommandPaletteItem();
            });

            item.addEventListener('click', () => {
                closeModal(elements.commandPaletteModal);
                cmd.run();
            });

            elements.commandPaletteResults.appendChild(item);
        });
    }

    function highlightCommandPaletteItem() {
        const items = elements.commandPaletteResults.querySelectorAll('.command-palette-item');
        items.forEach((item, idx) => {
            item.classList.toggle('is-selected', idx === state.commandPaletteActiveIndex);
            if (idx === state.commandPaletteActiveIndex) {
                item.scrollIntoView({ block: 'nearest' });
            }
        });
    }

    // ==================== SHORTCUTS REFERENCE MODAL ====================
    function setupShortcutsHelpModal() {
        if (elements.openSettingsShortcutsFromHelpBtn) {
            elements.openSettingsShortcutsFromHelpBtn.addEventListener('click', () => {
                closeModal(elements.shortcutsHelpModal);
                openSettingsModal('shortcutsTab');
            });
        }
    }

    function openShortcutsHelpModal() {
        if (!elements.shortcutsHelpContent) return;
        const s = state.preferences.shortcuts;

        const groups = [
            {
                name: 'Global Navigation & Actions',
                items: [
                    { title: 'Global Search / Command Palette', keys: s.command_palette || 'Ctrl+K' },
                    { title: 'Open Settings', keys: s.settings || 'Ctrl+,' },
                    { title: 'Toggle Layout (Classic / SaaS Tabs)', keys: s.toggle_layout || 'Ctrl+Shift+L' },
                    { title: 'Toggle Dark / Light Appearance', keys: s.toggle_theme || 'Ctrl+Shift+D' },
                    { title: 'Shortcuts Reference Cheat Sheet', keys: s.shortcuts_modal || 'Ctrl+/' },
                    { title: 'Close Active Modal, Menu, or Palette', keys: 'Escape' }
                ]
            },
            {
                name: 'Vault Operations',
                items: [
                    { title: 'Add New Password', keys: s.new_password || 'Ctrl+Shift+A' },
                    { title: 'Create New Category', keys: s.new_category || 'Ctrl+Shift+F' },
                    { title: 'Password Generator Quick Launch', keys: s.quick_generator || 'Ctrl+Shift+G' },
                    { title: 'Quick Filter Search in Dashboard', keys: '/' }
                ]
            },
            {
                name: 'Dialog & Form Controls',
                items: [
                    { title: 'Move focus through controls', keys: 'Tab' },
                    { title: 'Move focus backward', keys: 'Shift+Tab' },
                    { title: 'Submit or activate focused control', keys: 'Enter' },
                    { title: 'Activate supported buttons and switches', keys: 'Space' }
                ]
            }
        ];

        elements.shortcutsHelpContent.innerHTML = '';
        groups.forEach(g => {
            const groupEl = document.createElement('div');
            groupEl.className = 'shortcuts-help-group';
            groupEl.innerHTML = `
                <div class="shortcuts-help-group-title">${escapeHtml(g.name)}</div>
                ${g.items.map(item => `
                    <div class="shortcuts-help-row">
                        <span>${escapeHtml(item.title)}</span>
                        <kbd>${escapeHtml(item.keys)}</kbd>
                    </div>
                `).join('')}
            `;
            elements.shortcutsHelpContent.appendChild(groupEl);
        });

        openModal(elements.shortcutsHelpModal);
    }

    // ==================== NAVIGATION BUTTON BINDINGS ====================
    function setupNavigationButtons() {
        if (elements.openSettingsBtn) {
            elements.openSettingsBtn.addEventListener('click', () => openSettingsModal());
        }
        if (elements.sidebarSettingsNavBtn) {
            elements.sidebarSettingsNavBtn.addEventListener('click', () => openSettingsModal());
        }
        if (elements.layoutToggleBtn) {
            elements.layoutToggleBtn.addEventListener('click', toggleLayout);
        }
        if (elements.sidebarLayoutToggleBtn) {
            elements.sidebarLayoutToggleBtn.addEventListener('click', toggleLayout);
        }
        if (elements.sidebarCollapseBtn) {
            elements.sidebarCollapseBtn.addEventListener('click', toggleSidebarCollapse);
        }
        if (elements.shortcutsHelpBtn) {
            elements.shortcutsHelpBtn.addEventListener('click', openShortcutsHelpModal);
        }
        if (elements.sidebarPaletteNavBtn) {
            elements.sidebarPaletteNavBtn.addEventListener('click', openCommandPalette);
        }
        if (elements.sidebarGenNavBtn) {
            elements.sidebarGenNavBtn.addEventListener('click', () => {
                refreshGenerator();
                openModal(elements.genModal);
            });
        }
        if (elements.themeToggleBtn) {
            elements.themeToggleBtn.addEventListener('click', toggleTheme);
        }
        if (elements.sidebarThemeToggleBtn) {
            elements.sidebarThemeToggleBtn.addEventListener('click', toggleTheme);
        }
        if (elements.sidebarLockVaultBtn) {
            elements.sidebarLockVaultBtn.addEventListener('click', () => {
                if (elements.lockVaultBtn) elements.lockVaultBtn.click();
            });
        }
    }

    // ==================== SAAS CATEGORY CONTROLS & AUTO-SCROLL ====================
    function updateSaasScrollButtons() {
        if (!elements.saasCategoryTabs || !elements.saasScrollLeftBtn || !elements.saasScrollRightBtn) return;
        const el = elements.saasCategoryTabs;
        const canScrollLeft = el.scrollLeft > 6;
        const canScrollRight = el.scrollLeft + el.clientWidth < el.scrollWidth - 6;

        elements.saasScrollLeftBtn.classList.toggle('hidden', !canScrollLeft);
        elements.saasScrollRightBtn.classList.toggle('hidden', !canScrollRight);
    }

    let dragScrollTimer = null;
    function startDragAutoScroll(speed) {
        if (dragScrollTimer) return;
        dragScrollTimer = setInterval(() => {
            if (!elements.saasCategoryTabs) return;
            elements.saasCategoryTabs.scrollLeft += speed;
            updateSaasScrollButtons();
        }, 25);
    }
    function stopDragAutoScroll() {
        if (dragScrollTimer) {
            clearInterval(dragScrollTimer);
            dragScrollTimer = null;
        }
    }

    function setupSaasCategoryControls() {
        if (elements.saasScrollLeftBtn) {
            elements.saasScrollLeftBtn.addEventListener('click', () => {
                if (elements.saasCategoryTabs) {
                    elements.saasCategoryTabs.scrollBy({ left: -220, behavior: 'smooth' });
                }
            });
            elements.saasScrollLeftBtn.addEventListener('dragover', (e) => {
                e.preventDefault();
                elements.saasScrollLeftBtn.classList.add('drag-target-scroll');
                startDragAutoScroll(-16);
            });
            elements.saasScrollLeftBtn.addEventListener('dragleave', () => {
                elements.saasScrollLeftBtn.classList.remove('drag-target-scroll');
                stopDragAutoScroll();
            });
        }

        if (elements.saasScrollRightBtn) {
            elements.saasScrollRightBtn.addEventListener('click', () => {
                if (elements.saasCategoryTabs) {
                    elements.saasCategoryTabs.scrollBy({ left: 220, behavior: 'smooth' });
                }
            });
            elements.saasScrollRightBtn.addEventListener('dragover', (e) => {
                e.preventDefault();
                elements.saasScrollRightBtn.classList.add('drag-target-scroll');
                startDragAutoScroll(16);
            });
            elements.saasScrollRightBtn.addEventListener('dragleave', () => {
                elements.saasScrollRightBtn.classList.remove('drag-target-scroll');
                stopDragAutoScroll();
            });
        }

        if (elements.saasCategoryTabs) {
            elements.saasCategoryTabs.addEventListener('wheel', (e) => {
                if (e.deltaY !== 0) {
                    e.preventDefault();
                    elements.saasCategoryTabs.scrollLeft += e.deltaY;
                    updateSaasScrollButtons();
                }
            }, { passive: false });

            elements.saasCategoryTabs.addEventListener('scroll', updateSaasScrollButtons);

            elements.saasCategoryTabs.addEventListener('dragover', (e) => {
                const rect = elements.saasCategoryTabs.getBoundingClientRect();
                const mouseX = e.clientX;
                const margin = 50;
                if (mouseX - rect.left < margin) {
                    startDragAutoScroll(-14);
                } else if (rect.right - mouseX < margin) {
                    startDragAutoScroll(14);
                } else {
                    stopDragAutoScroll();
                }
            });

            elements.saasCategoryTabs.addEventListener('dragleave', (e) => {
                if (!elements.saasCategoryTabs.contains(e.relatedTarget)) {
                    stopDragAutoScroll();
                }
            });
        }

        let moreOpenHoverTimer = null;
        if (elements.saasMoreCatsBtn) {
            elements.saasMoreCatsBtn.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                elements.saasMoreCatsBtn.classList.add('drag-over');
                if (!moreOpenHoverTimer && elements.saasMoreCatsDropdown && elements.saasMoreCatsDropdown.classList.contains('hidden')) {
                    moreOpenHoverTimer = setTimeout(() => {
                        elements.saasMoreCatsDropdown.classList.remove('hidden');
                        if (elements.saasCatSearchInput) {
                            elements.saasCatSearchInput.value = '';
                            elements.saasMoreCatsList.querySelectorAll('.saas-dropdown-item').forEach(i => i.style.display = '');
                        }
                    }, 300);
                }
            });
            elements.saasMoreCatsBtn.addEventListener('dragleave', () => {
                elements.saasMoreCatsBtn.classList.remove('drag-over');
                if (moreOpenHoverTimer) {
                    clearTimeout(moreOpenHoverTimer);
                    moreOpenHoverTimer = null;
                }
            });
        }

        window.addEventListener('dragend', () => {
            stopDragAutoScroll();
            if (moreOpenHoverTimer) {
                clearTimeout(moreOpenHoverTimer);
                moreOpenHoverTimer = null;
            }
            document.body.classList.remove('is-dragging-entry');
            if (elements.saasScrollLeftBtn) elements.saasScrollLeftBtn.classList.remove('drag-target-scroll');
            if (elements.saasScrollRightBtn) elements.saasScrollRightBtn.classList.remove('drag-target-scroll');
            if (elements.saasMoreCatsBtn) elements.saasMoreCatsBtn.classList.remove('drag-over');
            document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
        });

        window.addEventListener('drop', () => {
            stopDragAutoScroll();
            document.body.classList.remove('is-dragging-entry');
        });

        window.addEventListener('resize', updateSaasScrollButtons);
    }

    // ==================== CENTRALIZED KEYBOARD SHORTCUT MANAGER ====================
    function eventToKeyString(e) {
        const parts = [];
        if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
        if (e.altKey) parts.push('Alt');
        if (e.shiftKey) parts.push('Shift');
        
        let key = e.key;
        if (['Control', 'Shift', 'Alt', 'Meta'].includes(key)) {
            return '';
        }
        if (key === ' ') key = 'Space';
        else if (key.length === 1) key = key.toUpperCase();
        
        parts.push(key);
        return parts.join('+');
    }

    function checkShortcutMatch(e, comboStr) {
        if (!comboStr) return false;
        const current = eventToKeyString(e).toLowerCase();
        return current === comboStr.toLowerCase();
    }

    window.addEventListener('keydown', (e) => {
        // 1. Shortcut recording mode in Settings
        if (state.recordingShortcutKey) {
            if (e.key === 'Escape') {
                state.recordingShortcutKey = null;
                if (elements.shortcutConflictAlert) elements.shortcutConflictAlert.classList.add('hidden');
                renderShortcutsTable();
                e.preventDefault();
                return;
            }

            const keyString = eventToKeyString(e);
            if (!keyString) return; // Wait for non-modifier key

            e.preventDefault();

            // Detect conflicts
            const conflictAction = findShortcutConflict(state.recordingShortcutKey, keyString);
            if (conflictAction) {
                if (elements.shortcutConflictAlert) {
                    elements.shortcutConflictAlert.classList.remove('hidden');
                    const conflictTitle = SHORTCUT_METADATA[conflictAction] ? SHORTCUT_METADATA[conflictAction].title : conflictAction;
                    elements.shortcutConflictText.textContent = `⚠️ Conflict: "${keyString}" is already assigned to "${conflictTitle}". Please choose a different key combination.`;
                }
                return;
            }

            // Valid shortcut - save and apply
            const targetAction = state.recordingShortcutKey;
            state.preferences.shortcuts[targetAction] = keyString;
            state.recordingShortcutKey = null;
            if (elements.shortcutConflictAlert) elements.shortcutConflictAlert.classList.add('hidden');
            renderShortcutsTable();
            savePreferences({ shortcuts: state.preferences.shortcuts });
            showToast(`Shortcut for ${SHORTCUT_METADATA[targetAction].title} updated to ${keyString}`);
            return;
        }

        const isInputTarget = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable;
        const isCommandPaletteOpen = elements.commandPaletteModal && !elements.commandPaletteModal.classList.contains('hidden');

        // Escape key handling
        if (e.key === 'Escape') {
            if (!state.unlocked) {
                if (!elements.recoverModal.classList.contains('hidden')) {
                    returnFromRecoveryToLogin();
                }
                return;
            }

            // Close command palette first if open
            if (isCommandPaletteOpen) {
                closeModal(elements.commandPaletteModal);
                return;
            }

            // Close other modals
            const openModals = document.querySelectorAll('.modal-backdrop:not(.hidden)');
            if (openModals.length > 0) {
                openModals.forEach(m => closeModal(m));
                return;
            }

            if (elements.categoryContextMenu) {
                elements.categoryContextMenu.classList.add('hidden');
            }
            return;
        }

        // Never intercept normal typing in text inputs or textareas unless it is Ctrl/Alt-based
        if (isInputTarget && !e.ctrlKey && !e.metaKey && !e.altKey) {
            return;
        }

        const s = state.preferences.shortcuts;

        // Command Palette / Global Search
        if (checkShortcutMatch(e, s.command_palette) || (e.key === '/' && !isInputTarget)) {
            e.preventDefault();
            if (state.unlocked) {
                openCommandPalette();
            } else {
                elements.globalSearch.focus();
                elements.globalSearch.select();
            }
            return;
        }

        // Open Settings
        if (checkShortcutMatch(e, s.settings)) {
            e.preventDefault();
            openSettingsModal();
            return;
        }

        // Toggle Layout
        if (checkShortcutMatch(e, s.toggle_layout)) {
            e.preventDefault();
            toggleLayout();
            return;
        }

        // Toggle Theme
        if (checkShortcutMatch(e, s.toggle_theme)) {
            e.preventDefault();
            toggleTheme();
            return;
        }

        // Shortcuts Reference Help Modal
        if (checkShortcutMatch(e, s.shortcuts_modal)) {
            e.preventDefault();
            openShortcutsHelpModal();
            return;
        }

        // Create New Category
        if (checkShortcutMatch(e, s.new_category)) {
            e.preventDefault();
            if (state.unlocked) {
                openNewCategoryModal();
            }
            return;
        }

        // Add New Password
        if (checkShortcutMatch(e, s.new_password) || 
            (e.altKey && (e.key === 'n' || e.key === 'N') && !e.ctrlKey && !e.metaKey)) {
            e.preventDefault();
            if (state.unlocked) {
                openNewEntryModal();
            }
            return;
        }

        // Quick Password Generator
        if (checkShortcutMatch(e, s.quick_generator)) {
            e.preventDefault();
            refreshGenerator();
            openModal(elements.genModal);
            return;
        }
    });

    // Dismiss category context menu on outside click or global contextmenu
    document.addEventListener('click', (e) => {
        if (elements.categoryContextMenu && !e.target.closest('#categoryContextMenu')) {
            elements.categoryContextMenu.classList.add('hidden');
        }
    });

    document.addEventListener('contextmenu', (e) => {
        if (elements.categoryContextMenu && !e.target.closest('.nav-item[data-category]')) {
            elements.categoryContextMenu.classList.add('hidden');
        }
    });

    // Helper: Escape HTML
    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // Helper: Relative Time
    function formatTimeAgo(timestamp) {
        if (!timestamp) return 'Recently';
        const now = Math.floor(Date.now() / 1000);
        const diff = now - timestamp;
        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return `${Math.floor(diff / 86400)}d ago`;
    }

    // Boot App
    initPreferences();
    setupCategoryCombobox();
    checkStatus();

})();
