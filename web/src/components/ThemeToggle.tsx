'use client';

import { useSyncExternalStore } from 'react';

type Theme = 'dark' | 'light';
const storageKey = 'sahyopt-theme';

function subscribe(onChange: () => void) {
    function onStorage(event: StorageEvent) {
        if (event.key !== storageKey) return;
        document.documentElement.dataset.theme = event.newValue === 'light' ? 'light' : 'dark';
        onChange();
    }
    window.addEventListener('sahyopt-theme-change', onChange);
    window.addEventListener('storage', onStorage);
    return () => {
        window.removeEventListener('sahyopt-theme-change', onChange);
        window.removeEventListener('storage', onStorage);
    };
}

function getTheme(): Theme {
    return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

export default function ThemeToggle() {
    const theme = useSyncExternalStore(subscribe, getTheme, () => 'dark' as Theme);

    function selectTheme(value: Theme) {
        document.documentElement.dataset.theme = value;
        try { localStorage.setItem(storageKey, value); } catch { /* Theme still works without storage. */ }
        window.dispatchEvent(new Event('sahyopt-theme-change'));
    }

    return (
        <div className="theme-settings">
            <span className="theme-label">Appearance</span>
            <div className="theme-switch" role="group" aria-label="Color theme">
                <button type="button" aria-pressed={theme === 'light'} onClick={() => selectTheme('light')}>
                    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" />
                    </svg>
                    Light
                </button>
                <button type="button" aria-pressed={theme === 'dark'} onClick={() => selectTheme('dark')}>
                    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M20.5 14A8.5 8.5 0 0 1 10 3.5 8.5 8.5 0 1 0 20.5 14Z" />
                    </svg>
                    Dark
                </button>
            </div>
        </div>
    );
}
