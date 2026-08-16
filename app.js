document.addEventListener('DOMContentLoaded', () => {
    initPWA();
    initTheme();
    initNavigation();
    initDashboardWidgets();
    initGlobalSearch();
    initLocationAndPrayer();
    initQuran();
    initHadist();
    initDoa();
    initIbadahTracker();
    initMuslimah();
    initKitab();
    initCSVExport();
    initGlobalModal();
});

// Utility: Toggle Loading Overlay
function toggleLoading(show) {
    const loading = document.getElementById('loading');
    if (show) loading.classList.remove('hidden');
    else loading.classList.add('hidden');
}

// --- PWA SERVICE WORKER ---
function initPWA() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./service-worker.js')
                .then(reg => console.log('PWA Service Worker registered'))
                .catch(err => console.log('PWA Registration failed:', err));
        });
    }
}

// --- GLOBAL MODAL ---
function initGlobalModal() {
    const modal = document.getElementById('global-modal');
    const closeBtn = document.getElementById('btn-close-modal');
    if(!modal) return;
    closeBtn.addEventListener('click', () => {
        modal.classList.remove('show');
        setTimeout(() => modal.classList.add('hidden'), 300); // Wait for transition
    });
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeBtn.click();
        }
    });
}
function openGlobalModal(title, bodyHtml) {
    const modal = document.getElementById('global-modal');
    if(!modal) return;
    document.getElementById('modal-title').innerText = title;
    document.getElementById('modal-body').innerHTML = bodyHtml;
    modal.classList.remove('hidden');
    // delay to allow display:flex to apply before opacity transition
    setTimeout(() => modal.classList.add('show'), 10);
}

// --- DASHBOARD WIDGETS (DRAG & DROP) ---
function initDashboardWidgets() {
    const draggables = document.querySelectorAll('.dashboard-widget');
    const container = document.getElementById('dashboard-grid');
    if (!container || draggables.length === 0) return;

    // Load saved order
    const savedOrder = JSON.parse(localStorage.getItem('myquran_widget_order'));
    if (savedOrder && savedOrder.length > 0) {
        savedOrder.forEach(id => {
            const el = document.getElementById(id);
            if (el) container.appendChild(el);
        });
    }

    draggables.forEach(draggable => {
        draggable.addEventListener('dragstart', () => {
            draggable.classList.add('dragging');
        });

        draggable.addEventListener('dragend', () => {
            draggable.classList.remove('dragging');
            // Save new order
            const currentOrder = [...container.querySelectorAll('.dashboard-widget')].map(el => el.id);
            localStorage.setItem('myquran_widget_order', JSON.stringify(currentOrder));
        });
    });

    container.addEventListener('dragover', e => {
        e.preventDefault();
        const afterElement = getDragAfterElement(container, e.clientY);
        const draggable = document.querySelector('.dragging');
        if (draggable) {
            if (afterElement == null) {
                container.appendChild(draggable);
            } else {
                container.insertBefore(draggable, afterElement);
            }
        }
    });
}
function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.dashboard-widget:not(.dragging)')];
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// --- THEME SYSTEM ---
function initTheme() {
    const btn = document.getElementById('theme-toggle');
    const html = document.documentElement;
    const icon = btn ? btn.querySelector('i') : null;
    
    if(!btn) return;

    if (localStorage.getItem('myquran_theme') === 'light') {
        html.classList.remove('dark');
        if(icon) icon.className = 'fa-solid fa-sun text-base text-emerald-400';
    } else {
        html.classList.add('dark');
        if(icon) icon.className = 'fa-solid fa-moon text-base text-slate-300';
    }

    btn.addEventListener('click', () => {
        if (html.classList.contains('dark')) {
            html.classList.remove('dark');
            localStorage.setItem('myquran_theme', 'light');
            if(icon) icon.className = 'fa-solid fa-sun text-base text-emerald-400';
        } else {
            html.classList.add('dark');
            localStorage.setItem('myquran_theme', 'dark');
            if(icon) icon.className = 'fa-solid fa-moon text-base text-slate-300';
        }
    });
}

// --- PROMINENT GLOBAL UNIFIED SEARCH BAR (PROMPT 1) ---
function initGlobalSearch() {
    const searchInput = document.getElementById('global-search-input');
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        const activeTab = document.querySelector('.tab-pane.active')?.id;

        if (activeTab === 'quran') {
            filterSurahList(query);
        } else if (activeTab === 'doa') {
            filterDoaList(query);
        } else if (activeTab === 'hadist') {
            filterHadistList(query);
        }
    });
}

function filterSurahList(query) {
    const cards = document.querySelectorAll('#surah-list .card');
    cards.forEach(card => {
        const title = card.querySelector('.card-title')?.innerText.toLowerCase() || '';
        const arabic = card.querySelector('.card-title-arabic')?.innerText.toLowerCase() || '';
        if (title.includes(query) || arabic.includes(query)) {
            card.style.display = 'flex';
        } else {
            card.style.display = 'none';
        }
    });
}

function filterDoaList(query) {
    const cards = document.querySelectorAll('#doa-list .card');
    cards.forEach(card => {
        const title = card.innerText.toLowerCase();
        if (title.includes(query)) {
            card.style.display = 'flex';
        } else {
            card.style.display = 'none';
        }
    });
}

function filterHadistList(query) {
    const cards = document.querySelectorAll('#hadist-books .card');
    cards.forEach(card => {
        const title = card.innerText.toLowerCase();
        if (title.includes(query)) {
            card.style.display = 'flex';
        } else {
            card.style.display = 'none';
        }
    });
}

// --- GEOLOCATION & PRAYER TIMES ---
function initLocationAndPrayer() {
    const container = document.getElementById('prayer-times-container');
    const hijriText = document.getElementById('hijri-text');

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                try {
                    const res = await fetch(`https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lng}&method=20`);
                    const json = await res.json();
                    if (json.code === 200) {
                        displayPrayerTimes(json.data.timings);
                        const hijri = json.data.date.hijri;
                        hijriText.innerText = `${hijri.day} ${hijri.month.en} ${hijri.year} H`;
                        
                        const dashHijri = document.getElementById('dash-hijri-text');
                        if(dashHijri) dashHijri.innerText = `${hijri.day} ${hijri.month.en} ${hijri.year} H`;
                    }
                } catch (error) {
                    container.innerHTML = '<p class="text-xs text-slate-400">Gagal memuat jadwal sholat.</p>';
                }
            },
            (error) => {
                container.innerHTML = '<p class="text-xs text-slate-400">Akses lokasi tidak diizinkan.</p>';
            }
        );
    }
}

function displayPrayerTimes(timings) {
    const container = document.getElementById('prayer-times-container');
    const dashContainer = document.getElementById('dash-prayer-times-container');
    if(container) container.innerHTML = '';
    if(dashContainer) dashContainer.innerHTML = '';
    
    const prayers = [
        { id: 'Fajr', name: 'Subuh' },
        { id: 'Dhuhr', name: 'Dzuhur' },
        { id: 'Asr', name: 'Ashar' },
        { id: 'Maghrib', name: 'Maghrib' },
        { id: 'Isha', name: 'Isya' }
    ];

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    let nextPrayerFound = false;

    prayers.forEach(p => {
        const timeStr = timings[p.id];
        const [h, m] = timeStr.split(':').map(Number);
        const prayerMinutes = h * 60 + m;
        
        let isNext = false;
        if (!nextPrayerFound && prayerMinutes > currentMinutes) {
            isNext = true;
            nextPrayerFound = true;
        }

        const div = document.createElement('div');
        div.className = `prayer-time-item ${isNext ? 'next' : ''}`;
        div.innerHTML = `
            <span class="prayer-name">${p.name}</span>
            <span class="prayer-clock">${timeStr}</span>
        `;
        if(container) container.appendChild(div);
        if(dashContainer) dashContainer.appendChild(div.cloneNode(true));
    });
}

// --- NAVIGATION (MODALS) ---
function initNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    // Inject Close Button into every tab-pane
    tabPanes.forEach(pane => {
        if (!pane.querySelector('.btn-close-modal')) {
            const closeBtn = document.createElement('button');
            closeBtn.className = 'btn-close-modal absolute top-6 right-6 w-10 h-10 rounded-full bg-charcoal-800 text-slate-400 hover:text-white flex items-center justify-center transition z-50';
            closeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
            closeBtn.addEventListener('click', () => {
                pane.classList.remove('active');
                navButtons.forEach(b => b.classList.remove('active'));
            });
            pane.style.position = 'fixed';
            pane.appendChild(closeBtn);
        }
    });

    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            
            // If it's already active, close it (toggle)
            if(document.getElementById(targetId).classList.contains('active')) {
                document.getElementById(targetId).classList.remove('active');
                btn.classList.remove('active');
                return;
            }

            // Close all other panes
            navButtons.forEach(b => b.classList.remove('active'));
            document.querySelectorAll(`.nav-btn[data-target="${targetId}"]`).forEach(b => b.classList.add('active'));

            tabPanes.forEach(pane => pane.classList.remove('active'));
            document.getElementById(targetId).classList.add('active');

            // Clear search query on tab change
            const globalSearch = document.getElementById('global-search-input');
            if (globalSearch) globalSearch.value = '';
        });
    });
}

// --- QURAN & STICKY MUROTTAL ZEN STAGE PLAYER (PROMPT 2) ---
const QURAN_API = 'https://equran.id/api/v2';
let currentSurahData = null;
let currentAyatIndex = 0;
let isFullMurottalMode = false;
let isLoopActive = false;

// Audio Player DOM
const audioEl = document.getElementById('global-audio');
const zenStagePlayer = document.getElementById('murottal-zen-stage');
const zenSurahTitle = document.getElementById('zen-surah-title');
const zenVerseCounter = document.getElementById('zen-verse-counter');
const btnZenPlayPause = document.getElementById('btn-zen-play-pause');
const btnZenPrev = document.getElementById('btn-zen-prev');
const btnZenNext = document.getElementById('btn-zen-next');
const btnZenLoop = document.getElementById('btn-zen-loop');
const btnZenClose = document.getElementById('btn-zen-close');
const zenBlockTimeline = document.getElementById('zen-block-timeline');
const zenTimeCurrent = document.getElementById('zen-time-current');
const zenTimeDuration = document.getElementById('zen-time-duration');

function formatSeconds(sec) {
    if (isNaN(sec) || !isFinite(sec)) return "00:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function initQuran() {
    fetch(`${QURAN_API}/surat`)
        .then(res => res.json())
        .then(json => renderSurahList(json.data))
        .catch(() => document.getElementById('surah-list').innerHTML = '<p class="text-xs text-slate-400">Error memuat surah.</p>');

    document.getElementById('back-to-surah-list').addEventListener('click', () => {
        document.getElementById('surah-detail').classList.add('hidden');
        document.getElementById('surah-list').classList.remove('hidden');
        document.querySelector('.prayer-widget').classList.remove('hidden');
    });

    // Murottal Player Triggers
    document.getElementById('btn-play-surah-murottal').addEventListener('click', () => {
        if (currentSurahData) {
            isFullMurottalMode = true;
            currentAyatIndex = 0;
            openZenStage();
        }
    });

    btnZenClose.addEventListener('click', closeZenStage);

    // Audio Playback Controls
    btnZenPlayPause.addEventListener('click', () => {
        if (audioEl.paused) {
            audioEl.play();
        } else {
            audioEl.pause();
        }
    });

    btnZenPrev.addEventListener('click', () => {
        if (currentAyatIndex > 0) {
            currentAyatIndex--;
            playCurrentAyatAudio();
        }
    });

    btnZenNext.addEventListener('click', () => {
        if (currentSurahData && currentAyatIndex < currentSurahData.ayat.length - 1) {
            currentAyatIndex++;
            playCurrentAyatAudio();
        }
    });

    // Loop toggle
    if (btnZenLoop) {
        btnZenLoop.addEventListener('click', () => {
            isLoopActive = !isLoopActive;
            if(isLoopActive) {
                btnZenLoop.classList.remove('text-slate-500');
                btnZenLoop.classList.add('text-emerald-400', 'bg-slate-700');
            } else {
                btnZenLoop.classList.add('text-slate-500');
                btnZenLoop.classList.remove('text-emerald-400', 'bg-slate-700');
            }
        });
    }

    // Audio Engine Events
    audioEl.addEventListener('play', () => {
        btnZenPlayPause.innerHTML = '<i class="fa-solid fa-pause"></i>';
    });

    audioEl.addEventListener('pause', () => {
        btnZenPlayPause.innerHTML = '<i class="fa-solid fa-play"></i>';
    });

    audioEl.addEventListener('timeupdate', () => {
        zenTimeCurrent.innerText = formatSeconds(audioEl.currentTime);
        zenTimeDuration.innerText = formatSeconds(audioEl.duration);
    });

    audioEl.addEventListener('ended', () => {
        if (isLoopActive) {
            audioEl.currentTime = 0;
            audioEl.play();
        } else if (currentSurahData && currentAyatIndex < currentSurahData.ayat.length - 1) {
            currentAyatIndex++;
            playCurrentAyatAudio();
        } else {
            closeZenStage();
        }
    });
}

function openZenStage() {
    zenStagePlayer.classList.remove('hidden');
    buildVisualTimeline();
    playCurrentAyatAudio();
}

function buildVisualTimeline() {
    if (!currentSurahData || !zenBlockTimeline) return;
    zenBlockTimeline.innerHTML = '';
    currentSurahData.ayat.forEach((_, idx) => {
        const block = document.createElement('div');
        block.className = 'timeline-block';
        block.id = `timeline-block-${idx}`;
        block.addEventListener('click', () => {
            currentAyatIndex = idx;
            playCurrentAyatAudio();
        });
        zenBlockTimeline.appendChild(block);
    });
}

function closeZenStage() {
    zenStagePlayer.classList.add('hidden');
    audioEl.pause();
    document.querySelectorAll('.ayat-item').forEach(el => el.classList.remove('playing-active'));
}

function playCurrentAyatAudio() {
    if (!currentSurahData) return;
    const verse = currentSurahData.ayat[currentAyatIndex];
    if (!verse) return;

    // Audio URL (Misyari Rasyid "05")
    const audioUrl = verse.audio["05"] || verse.audio["01"];
    audioEl.src = audioUrl;
    audioEl.play().catch(err => console.log('Autoplay handled:', err));

    // Update Player Info
    zenSurahTitle.innerText = `Surah ${currentSurahData.namaLatin}`;
    zenVerseCounter.innerText = `Ayat ${verse.nomorAyat} dari ${currentSurahData.jumlahAyat} • Misyari Rasyid`;

    // Update Visual Timeline
    if (zenBlockTimeline) {
        Array.from(zenBlockTimeline.children).forEach((block, idx) => {
            block.className = 'timeline-block'; // reset
            if (idx < currentAyatIndex) block.classList.add('played');
            else if (idx === currentAyatIndex) block.classList.add('active');
        });
    }

    // Save Last Read to localStorage
    localStorage.setItem('myquran_last_read', JSON.stringify({
        namaSurah: currentSurahData.namaLatin,
        nomorAyat: verse.nomorAyat,
        nomorSurah: currentSurahData.nomor
    }));
    updateLastReadDashboard();

    // Highlight & Scroll to active verse in detail view
    document.querySelectorAll('.ayat-item').forEach(el => el.classList.remove('playing-active'));
    const activeEl = document.getElementById(`ayat-${verse.nomorAyat}`);
    if (activeEl) {
        activeEl.classList.add('playing-active');
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function renderSurahList(surahs) {
    const container = document.getElementById('surah-list');
    container.innerHTML = '';
    
    surahs.forEach(surah => {
        const card = document.createElement('div');
        card.className = 'card bg-charcoal-800/50 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 cursor-pointer hover:border-emerald-500/40 transition-all duration-300 flex flex-col justify-between gap-4 shadow-xl';
        card.innerHTML = `
            <div class="card-header flex items-center justify-between">
                <div class="card-number w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-extrabold text-xs flex items-center justify-center">
                    ${surah.nomor}
                </div>
                <div class="card-title-arabic font-arabic text-2xl text-white font-medium">${surah.nama}</div>
            </div>
            <div>
                <div class="card-title text-base font-bold text-white tracking-tight">${surah.namaLatin}</div>
                <div class="card-subtitle text-xs text-slate-400 mt-1">${surah.arti} • ${surah.jumlahAyat} Ayat</div>
            </div>
        `;
        card.addEventListener('click', () => loadSurahDetail(surah.nomor));
        container.appendChild(card);
    });
}

async function loadSurahDetail(nomorSurah) {
    document.getElementById('surah-list').classList.add('hidden');
    const prayerWidget = document.querySelector('.prayer-widget');
    if(prayerWidget) prayerWidget.classList.add('hidden');
    document.getElementById('surah-detail').classList.remove('hidden');
    
    // Tahfidz mode logic
    const tahfidzToggle = document.getElementById('toggle-tahfidz');
    const ayatContainer = document.getElementById('ayat-list');
    ayatContainer.innerHTML = '';
    
    const handleTahfidzToggle = (e) => {
        if(e.target.checked) ayatContainer.classList.add('mode-tahfidz-active');
        else {
            ayatContainer.classList.remove('mode-tahfidz-active');
            // Reveal all words if turned off
            document.querySelectorAll('.tahfidz-word').forEach(el => el.classList.remove('revealed'));
        }
    };
    if (tahfidzToggle) {
        tahfidzToggle.removeEventListener('change', handleTahfidzToggle);
        tahfidzToggle.addEventListener('change', handleTahfidzToggle);
        // Apply immediately if already checked
        if (tahfidzToggle.checked) ayatContainer.classList.add('mode-tahfidz-active');
        else ayatContainer.classList.remove('mode-tahfidz-active');
    }

    try {
        toggleLoading(true);
        // Fetch Surah & Tafsir concurrently
        const [surahRes, tafsirRes] = await Promise.all([
            fetch(`${QURAN_API}/surat/${nomorSurah}`),
            fetch(`${QURAN_API}/tafsir/${nomorSurah}`).catch(() => null)
        ]);
        const jsonSurah = await surahRes.json();
        const jsonTafsir = tafsirRes ? await tafsirRes.json() : null;
        
        currentSurahData = jsonSurah.data;
        const tafsirData = jsonTafsir && jsonTafsir.data ? jsonTafsir.data.tafsir : [];
        
        document.getElementById('detail-surah-name').innerText = currentSurahData.namaLatin;
        document.getElementById('detail-surah-arti').innerText = currentSurahData.arti;
        document.getElementById('detail-surah-info').innerText = `${currentSurahData.tempatTurun} • ${currentSurahData.jumlahAyat} Ayat`;
        
        const bismillahHeader = document.getElementById('bismillah-header');
        if (nomorSurah === 1 || nomorSurah === 9) bismillahHeader.classList.add('hidden');
        else bismillahHeader.classList.remove('hidden');

        currentSurahData.ayat.forEach((ayat, idx) => {
            const div = document.createElement('div');
            div.className = 'ayat-item bg-charcoal-800/40 border border-slate-800/80 rounded-3xl p-6 sm:p-8 transition-all duration-300';
            div.id = `ayat-${ayat.nomorAyat}`;
            
            // Masking split
            const words = ayat.teksArab.split(' ');
            const maskedHtml = words.map(w => `<span class="tahfidz-word inline-block">${w}</span>`).join(' ');

            div.innerHTML = `
                <div class="ayat-header flex items-center justify-between mb-6">
                    <span class="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                        ${currentSurahData.nomor}:${ayat.nomorAyat}
                    </span>
                    <div class="flex items-center gap-2">
                        <button class="btn-tafsir-ayat px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-[10px] font-bold text-slate-300 hover:text-emerald-400 hover:bg-slate-700 transition" title="Baca Tafsir">
                            Tafsir
                        </button>
                        <button class="btn-play-ayat w-8 h-8 rounded-full bg-slate-800 border border-slate-700 text-slate-300 hover:text-emerald-400 flex items-center justify-center transition" title="Putar Ayat Ini">
                            <i class="fa-solid fa-play text-xs"></i>
                        </button>
                    </div>
                </div>
                <div class="ayat-arabic font-arabic text-3xl sm:text-4xl text-right leading-loose text-white mb-4" dir="rtl">${maskedHtml}</div>
                <div class="ayat-translation text-sm sm:text-base text-slate-300 leading-relaxed">${ayat.teksIndonesia}</div>
            `;
            
            // Tahfidz Word Reveal Listener
            div.querySelectorAll('.tahfidz-word').forEach(word => {
                word.addEventListener('click', () => word.classList.toggle('revealed'));
            });

            // Single Verse Play Button Listener
            div.querySelector('.btn-play-ayat').addEventListener('click', () => {
                currentAyatIndex = idx;
                openZenStage();
            });

            // Tafsir Modal Listener
            div.querySelector('.btn-tafsir-ayat').addEventListener('click', () => {
                const tafsirObj = tafsirData.find(t => t.ayat == ayat.nomorAyat);
                const teksTafsir = tafsirObj ? tafsirObj.teks : 'Tafsir tidak tersedia untuk ayat ini.';
                openGlobalModal(
                    `Tafsir Surah ${currentSurahData.namaLatin} Ayat ${ayat.nomorAyat}`,
                    `<div class="mb-4 text-right font-arabic text-2xl text-white leading-loose">${ayat.teksArab}</div>
                     <p class="mb-6 italic text-slate-400">${ayat.teksIndonesia}</p>
                     <div class="border-t border-slate-700 pt-4 text-slate-200">
                        <h4 class="font-bold text-emerald-400 mb-2">Tafsir Kemenag:</h4>
                        ${teksTafsir}
                     </div>`
                );
            });

            ayatContainer.appendChild(div);
        });

    } catch (error) {
        ayatContainer.innerHTML = '<p class="text-xs text-rose-400">Gagal memuat ayat Al-Quran.</p>';
    } finally {
        toggleLoading(false);
    }
}

// --- DAILY WORSHIP HABIT TRACKER WITH CIRCULAR PROGRESS RING (PROMPT 3) ---
const trackerTasks = {
    wajib: ['Subuh', 'Dzuhur', 'Ashar', 'Maghrib', 'Isya'],
    sunnah: ['Tahajud', 'Dhuha', 'Rawatib'],
    amalan: ['Baca Al-Quran', 'Zikir Pagi', 'Zikir Petang', 'Sedekah']
};
let trackerCurrentDate = new Date();

function initIbadahTracker() {
    renderHabitTracker();

    document.getElementById('prev-day').addEventListener('click', () => {
        trackerCurrentDate.setDate(trackerCurrentDate.getDate() - 1);
        renderHabitTracker();
    });

    document.getElementById('next-day').addEventListener('click', () => {
        if (trackerCurrentDate.toDateString() !== new Date().toDateString()) {
            trackerCurrentDate.setDate(trackerCurrentDate.getDate() + 1);
            renderHabitTracker();
        }
    });
}

function renderHabitTracker() {
    const dateKey = 'myquran_tracker_' + trackerCurrentDate.toISOString().split('T')[0];
    const state = JSON.parse(localStorage.getItem(dateKey) || '{}');

    let totalTasks = 0;
    let completedTasks = 0;

    ['wajib', 'sunnah', 'amalan'].forEach(cat => {
        const container = document.getElementById(`tracker-${cat}`);
        if (!container) return;
        container.innerHTML = '';

        trackerTasks[cat].forEach(t => {
            totalTasks++;
            const tid = `task-${cat}-${t.replace(/\s+/g, '-').toLowerCase()}`;
            const isChecked = state[tid] ? true : false;
            if (isChecked) completedTasks++;

            const div = document.createElement('div');
            div.className = 'check-item flex items-center justify-between p-3.5 rounded-2xl bg-charcoal-800/50 border border-slate-800/80 hover:border-slate-700 transition-all duration-300 cursor-pointer';
            div.innerHTML = `
                <div class="flex items-center gap-3">
                    <input type="checkbox" id="${tid}" ${isChecked ? 'checked' : ''} class="w-5 h-5 rounded-lg border-2 border-slate-700 bg-charcoal-900 checked:bg-emerald-500 checked:border-emerald-500 text-charcoal-950 focus:ring-0 focus:ring-offset-0 cursor-pointer transition">
                    <label for="${tid}" class="text-sm font-semibold text-slate-200 cursor-pointer select-none ${isChecked ? 'line-through text-slate-500' : ''}">${t}</label>
                </div>
                ${isChecked ? '<i class="fa-solid fa-circle-check text-emerald-400 text-sm"></i>' : '<i class="fa-regular fa-circle text-slate-600 text-sm"></i>'}
            `;

            container.appendChild(div);

            div.querySelector('input').addEventListener('change', (e) => {
                const currentState = JSON.parse(localStorage.getItem(dateKey) || '{}');
                currentState[tid] = e.target.checked;
                localStorage.setItem(dateKey, JSON.stringify(currentState));
                renderHabitTracker(); // Re-render progress ring
            });
        });
    });

    // Update Date Display
    const dateStr = trackerCurrentDate.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' });
    const isToday = trackerCurrentDate.toDateString() === new Date().toDateString();
    document.getElementById('current-date-display').innerText = isToday ? `Hari Ini (${dateStr})` : dateStr;

    // Update Circular Progress Ring SVG & Banner (PROMPT 3)
    const percentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    document.getElementById('tracker-summary-title').innerText = `${completedTasks} dari ${totalTasks} Amalan Selesai`;
    document.getElementById('progress-ring-text').innerText = `${percentage}%`;
    
    const circle = document.getElementById('progress-ring-circle');
    if (circle) {
        circle.setAttribute('stroke-dasharray', `${percentage}, 100`);
    }

    // Update Dashboard Tracker (PROMPT 3)
    const dashTitle = document.getElementById('dash-tracker-title');
    if(dashTitle) dashTitle.innerText = `${completedTasks}/${totalTasks}`;
    const dashProgressText = document.getElementById('dash-progress-text');
    if(dashProgressText) dashProgressText.innerText = `${percentage}%`;
    const dashCircle = document.getElementById('dash-progress-ring');
    if (dashCircle) dashCircle.setAttribute('stroke-dasharray', `${percentage}, 100`);

    // Update Sidebar Badge (Deep-Tech Feature)
    const badge = document.getElementById('nav-badge-ibadah');
    if (badge) {
        const wajibTasks = trackerTasks.wajib.length;
        let completedWajib = 0;
        trackerTasks.wajib.forEach(t => {
            const tid = `task-wajib-${t.replace(/\s+/g, '-').toLowerCase()}`;
            if (state[tid]) completedWajib++;
        });
        const uncompletedWajib = wajibTasks - completedWajib;
        if (isToday && uncompletedWajib > 0) {
            badge.innerText = uncompletedWajib;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }
}

// --- CSV EXPORT ---
function initCSVExport() {
    const btn = document.getElementById('btn-export-csv');
    if (!btn) return;
    btn.addEventListener('click', () => {
        let csvContent = "Tanggal,Sholat Wajib,Sholat Sunnah,Amalan Lainnya,Persentase\n";
        
        // Ambil semua key dari localStorage yang berhubungan dengan tracker
        const keys = Object.keys(localStorage).filter(k => k.startsWith('myquran_tracker_')).sort();
        if (keys.length === 0) {
            alert('Belum ada data ibadah yang tersimpan.');
            return;
        }

        keys.forEach(key => {
            const date = key.replace('myquran_tracker_', '');
            const state = JSON.parse(localStorage.getItem(key));
            
            let w = 0, s = 0, a = 0;
            if(state['task-wajib-subuh']) w++;
            if(state['task-wajib-dzuhur']) w++;
            if(state['task-wajib-ashar']) w++;
            if(state['task-wajib-maghrib']) w++;
            if(state['task-wajib-isya']) w++;

            if(state['task-sunnah-tahajud']) s++;
            if(state['task-sunnah-dhuha']) s++;
            if(state['task-sunnah-rawatib']) s++;

            if(state['task-amalan-baca-al-quran']) a++;
            if(state['task-amalan-zikir-pagi']) a++;
            if(state['task-amalan-zikir-petang']) a++;
            if(state['task-amalan-sedekah']) a++;

            const total = 12;
            const completed = w + s + a;
            const percentage = Math.round((completed / total) * 100);

            csvContent += `${date},${w}/5,${s}/3,${a}/4,${percentage}%\n`;
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "myquran_tracker_history.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
}

function updateLastReadDashboard() {
    const dashLastSurah = document.getElementById('dash-last-surah');
    const dashLastAyat = document.getElementById('dash-last-ayat');
    if (!dashLastSurah || !dashLastAyat) return;

    const saved = JSON.parse(localStorage.getItem('myquran_last_read'));
    if (saved) {
        dashLastSurah.innerText = saved.namaSurah;
        dashLastAyat.innerText = `Ayat ${saved.nomorAyat}`;
        
        // Make the widget clickable to load this surah
        const widget = document.getElementById('widget-lastread');
        if (widget) {
            // prevent multiple listeners
            const newWidget = widget.cloneNode(true);
            widget.parentNode.replaceChild(newWidget, widget);
            
            newWidget.addEventListener('click', (e) => {
                // Ignore if dragging
                if(newWidget.classList.contains('dragging')) return;
                // Switch to Quran tab
                document.querySelector('.nav-btn[data-target="quran"]').click();
                loadSurahDetail(saved.nomorSurah);
            });
            newWidget.style.cursor = 'pointer';
        }
    }
}
document.addEventListener('DOMContentLoaded', updateLastReadDashboard);

// --- HADIST, DOA, MUSLIMAH, KITAB ---
function initHadist() {
    const HADIST_API = 'https://hadis-api-id.vercel.app/hadith';
    const books = [
        { id: 'bukhari', name: 'HR. Bukhari', avail: 7008 },
        { id: 'muslim', name: 'HR. Muslim', avail: 5362 },
        { id: 'abudaud', name: 'HR. Abu Daud', avail: 4590 },
        { id: 'tirmidzi', name: 'HR. Tirmidzi', avail: 3625 }
    ];
    const container = document.getElementById('hadist-books');
    books.forEach(b => {
        const card = document.createElement('div');
        card.className = 'card bg-charcoal-800/50 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 cursor-pointer hover:border-emerald-500/40 transition-all duration-300 flex flex-col justify-between shadow-xl';
        card.innerHTML = `<div class="card-title text-base font-bold text-white">${b.name}</div><div class="card-subtitle text-xs text-emerald-400 font-semibold mt-2">${b.avail} Hadist Shahih</div>`;
        card.addEventListener('click', async () => {
            document.getElementById('hadist-books').classList.add('hidden');
            document.getElementById('hadist-detail').classList.remove('hidden');
            document.getElementById('hadist-book-name').innerText = b.name;
            toggleLoading(true);
            try {
                const res = await fetch(`${HADIST_API}/${b.id}?limit=20`);
                const json = await res.json();
                const list = document.getElementById('hadist-list');
                list.innerHTML = '';
                json.items.forEach(h => {
                    list.innerHTML += `
                        <div class="ayat-item bg-charcoal-800/40 border border-slate-800/80 rounded-3xl p-6 sm:p-8">
                            <div class="mb-4"><span class="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">Hadist No. ${h.number}</span></div>
                            <div class="font-arabic text-2xl sm:text-3xl text-right leading-loose text-white mb-4">${h.arab}</div>
                            <div class="text-sm text-slate-300 leading-relaxed">${h.id}</div>
                        </div>
                    `;
                });
            } catch(e) {}
            toggleLoading(false);
        });
        container.appendChild(card);
    });

    document.getElementById('back-to-hadist-list').addEventListener('click', () => {
        document.getElementById('hadist-detail').classList.add('hidden');
        document.getElementById('hadist-books').classList.remove('hidden');
    });
}

const doaData = [
    { title: 'DOA SEBELUM MAKAN', arabic: 'اللَّهُمَّ بَارِكْ لَنَا فِيمَا رَزَقْتَنَا وَقِنَا عَذَابَ النَّارِ', text: 'Allahumma baarik lanaa fiimaa rozaqtanaa wa qinaa \'adzaaban naar.', trans: 'Ya Allah, berkahilah kami dalam rezeki yang telah Engkau berikan kepada kami dan peliharalah kami dari siksa api neraka.' },
    { title: 'DOA SESUDAH MAKAN', arabic: 'الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنَا وَسَقَانَا وَجَعَلَنَا مُسْلِمِينَ', text: 'Alhamdulillahilladzi ath\'amanaa wa saqoonaa wa ja\'alanaa muslimiin.', trans: 'Segala puji bagi Allah yang telah memberi kami makan dan minum serta menjadikan kami termasuk golongan orang muslim.' },
    { title: 'DOA SEBELUM TIDUR', arabic: 'بِاسْمِكَ اللَّهُمَّ أَحْيَا وَبِاسْمِكَ أَمُوتُ', text: 'Bismikallahumma ahyaa wa bismika amuut.', trans: 'Dengan nama-Mu ya Allah aku hidup, dan dengan nama-Mu aku mati.' },
    { title: 'DOA BANGUN TIDUR', arabic: 'الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ', text: 'Alhamdulillahilladzi ahyaanaa ba\'da maa amaatanaa wa ilaihin nusyuur.', trans: 'Segala puji bagi Allah, yang telah membangunkan kami setelah menidurkan kami, dan kepada-Nya lah kami dibangkitkan.' }
];

function initDoa() {
    const container = document.getElementById('doa-list');
    function render(data) {
        container.innerHTML = '';
        data.forEach(d => {
            container.innerHTML += `
                <div class="card bg-charcoal-800/40 border border-slate-800/80 rounded-3xl p-6 shadow-xl">
                    <div class="text-xs font-bold text-emerald-400 tracking-wider mb-3">${d.title}</div>
                    <div class="font-arabic text-2xl text-right leading-loose text-white mb-3">${d.arabic}</div>
                    <div class="text-xs font-semibold text-slate-300 italic mb-2">${d.text}</div>
                    <div class="text-xs text-slate-400 leading-relaxed">${d.trans}</div>
                </div>
            `;
        });
    }
    render(doaData);
}

function initMuslimah() {
    const data = [
        { title: 'PENGERTIAN HAIDH (MENSTRUASI)', content: 'Haidh adalah darah kebiasaan yang keluar dari rahim wanita sehat pada waktu-waktu tertentu. Selama masa haidh, wanita diharamkan untuk sholat, puasa, thawaf, dan menyentuh mushaf Al-Quran.' },
        { title: 'MASA HAIDH DAN SUCI', content: 'Minimal masa haidh adalah sehari semalam (24 jam), dan maksimal 15 hari 15 malam. Masa suci antara dua haidh minimal adalah 15 hari.' },
        { title: 'NIFAS (DARAH PASCA MELAHIRKAN)', content: 'Nifas adalah darah yang keluar setelah proses melahirkan. Masa maksimal nifas umumnya adalah 40 hari (atau 60 hari menurut madzhab Syafi\'i).' },
        { title: 'ISTIHADAH (DARAH PENYAKIT)', content: 'Istihadah adalah darah yang keluar di luar masa haidh dan nifas. Wanita istihadah tetap wajib sholat dan puasa setelah membersihkan diri dan berwudhu setiap kali masuk waktu sholat.' }
    ];
    const container = document.getElementById('muslimah-accordion');
    data.forEach(d => {
        const div = document.createElement('div');
        div.className = 'bg-charcoal-800/40 border border-slate-800/80 rounded-3xl overflow-hidden';
        div.innerHTML = `
            <button class="accordion-header w-full p-6 text-left font-bold text-sm text-white flex items-center justify-between hover:bg-slate-800/30 transition">
                <span>${d.title}</span> <i class="fa-solid fa-chevron-down text-slate-400 text-xs"></i>
            </button>
            <div class="accordion-content px-6 text-xs text-slate-300 leading-relaxed">
                <p>${d.content}</p>
            </div>
        `;
        div.querySelector('.accordion-header').addEventListener('click', (e) => {
            const content = div.querySelector('.accordion-content');
            content.classList.toggle('open');
            e.currentTarget.querySelector('i').className = content.classList.contains('open') ? 'fa-solid fa-chevron-up text-emerald-400 text-xs' : 'fa-solid fa-chevron-down text-slate-400 text-xs';
        });
        container.appendChild(div);
    });
}

function initKitab() {
    const data = [
        { title: 'RIYADHUS SHALIHIN', author: 'Imam An-Nawawi', desc: 'Kitab kumpulan hadist shahih paling populer mengenai adab dan akhlak sehari-hari.' },
        { title: 'AL-HIKAM', author: 'Ibn Athaillah As-Sakandari', desc: 'Kitab hikmah dan tasawuf yang sangat mendalam untuk pembersihan jiwa.' },
        { title: 'BULUGHUL MARAM', author: 'Ibnu Hajar Al-Asqalani', desc: 'Kitab perujukan hadist hukum fiqh utama bagi penuntut ilmu.' },
        { title: 'TAFSIR IBNU KATSIR', author: 'Ibnu Katsir', desc: 'Rujukan utama penafsiran Al-Quran ayat demi ayat secara shahih.' }
    ];
    const container = document.getElementById('kitab-list');
    data.forEach(d => {
        container.innerHTML += `
            <div class="card bg-charcoal-800/40 border border-slate-800/80 rounded-3xl p-6 shadow-xl">
                <div class="text-base font-bold text-white mb-1">${d.title}</div>
                <div class="inline-block px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-3">Oleh: ${d.author}</div>
                <div class="text-xs text-slate-400 leading-relaxed">${d.desc}</div>
            </div>
        `;
    });
}

// --- ARTICLES SYSTEM ---
async function loadArticles() {
    try {
        const res = await fetch('http://localhost:3050/api/articles');
        if(res.ok) {
            const articles = await res.json();
            const grid = document.getElementById('cms-articles-grid');
            const list = document.getElementById('admin-articles-list');
            
            if(grid) {
                if(articles.length === 0) {
                    grid.innerHTML = '<p class="text-xs text-slate-500 col-span-full">Belum ada artikel.</p>';
                } else {
                    grid.innerHTML = articles.map(art => `
                        <a href="article.html?id=${art.id}" target="_blank" class="bg-charcoal-800/40 border border-slate-800/80 rounded-2xl overflow-hidden shadow-lg group hover:border-slate-600 transition-colors cursor-pointer flex flex-col">
                            <div class="h-40 overflow-hidden relative">
                                <img src="${art.cover ? '/uploads/'+art.cover : 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiMzMzMiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZmlsbD0iI2ZmZiIgZm9udC1zaXplPSIyNCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgYWxpZ25tZW50LWJhc2VsaW5lPSJtaWRkbGUiPkFydGlrZWw8L3RleHQ+PC9zdmc+'}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700">
                                <div class="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors"></div>
                            </div>
                            <div class="p-5 flex-1 flex flex-col">
                                <p class="text-[10px] text-sky-400 font-bold mb-2 uppercase">${new Date(art.createdAt).toLocaleDateString('id-ID')}</p>
                                <h4 class="text-sm font-bold text-white leading-snug group-hover:text-sky-300 transition-colors">${art.title}</h4>
                            </div>
                        </a>
                    `).join('');
                }
            }

            if(list) {
                if(articles.length === 0) {
                    list.innerHTML = '<p class="text-xs text-slate-500">Belum ada artikel.</p>';
                } else {
                    list.innerHTML = articles.map(art => `
                        <div class="flex justify-between items-center bg-charcoal-900 border border-slate-700 p-3 rounded-xl">
                            <div>
                                <h5 class="text-sm font-bold text-white">${art.title}</h5>
                                <p class="text-[10px] text-slate-500">${new Date(art.createdAt).toLocaleDateString('id-ID')}</p>
                            </div>
                            <div class="flex gap-2">
                                <a href="article.html?id=${art.id}" target="_blank" class="w-8 h-8 rounded bg-slate-700 text-slate-300 flex items-center justify-center hover:bg-slate-600 hover:text-white transition cursor-pointer" title="Lihat"><i class="fa-solid fa-eye text-xs"></i></a>
                                <button class="w-8 h-8 rounded bg-rose-500/20 text-rose-500 flex items-center justify-center hover:bg-rose-500 hover:text-white transition cursor-pointer" title="Hapus" onclick="deleteArticle(${art.id})"><i class="fa-solid fa-trash-can text-xs"></i></button>
                            </div>
                        </div>
                    `).join('');
                }
            }
        }
    } catch(e) {
        console.error("Gagal memuat artikel", e);
    }
}

window.deleteArticle = async (id) => {
    if(!confirm("Yakin ingin menghapus artikel ini?")) return;
    try {
        const res = await fetch(`http://localhost:3050/api/articles/${id}`, { method: 'DELETE' });
        if(res.ok) {
            loadArticles();
        }
    } catch(e) {
        alert("Error menghapus artikel");
    }
};

document.addEventListener('DOMContentLoaded', loadArticles);



// --- DEEP-TECH: ZAKAT CALCULATOR ---
function initZakat() {
    const goldInput = document.getElementById('zakat-gold-price');
    const malInput = document.getElementById('zakat-mal-input');
    const nisabText = document.getElementById('nisab-value-text');
    const statusText = document.getElementById('zakat-mal-status');
    const resultText = document.getElementById('zakat-mal-result');
    if (!goldInput || !malInput) return;

    const calculateZakat = () => {
        const goldPrice = parseInt(goldInput.value) || 0;
        const totalMal = parseInt(malInput.value) || 0;
        
        const nisabValue = 85 * goldPrice;
        nisabText.innerText = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(nisabValue);

        if (totalMal >= nisabValue) {
            const zakat = totalMal * 0.025;
            statusText.innerText = 'Wajib Zakat (Telah Mencapai Nisab)';
            statusText.className = 'text-xs text-emeraldaccent-500 font-bold mt-1';
            resultText.innerText = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(zakat);
            resultText.className = 'text-lg font-extrabold text-emeraldaccent-500 mt-1';
        } else {
            statusText.innerText = 'Belum Mencapai Nisab';
            statusText.className = 'text-xs text-rose-400 font-bold mt-1';
            resultText.innerText = 'Rp 0';
            resultText.className = 'text-lg font-extrabold text-white mt-1';
        }
    };

    goldInput.addEventListener('input', calculateZakat);
    malInput.addEventListener('input', calculateZakat);
    calculateZakat(); // Init
}
document.addEventListener('DOMContentLoaded', initZakat);


// --- HEADER SEARCH TOGGLE ---
function initSearchToggle() {
    const btnToggleSearch = document.getElementById('btn-toggle-search');
    const searchOverlay = document.getElementById('search-overlay');
    const btnCloseSearch = document.getElementById('btn-close-search');
    const searchInput = document.getElementById('global-search-input');

    if (!btnToggleSearch || !searchOverlay) return;

    btnToggleSearch.addEventListener('click', () => {
        searchOverlay.classList.remove('opacity-0', 'pointer-events-none', 'w-0');
        searchOverlay.classList.add('w-64', 'md:w-80');
        setTimeout(() => searchInput.focus(), 300);
    });

    btnCloseSearch.addEventListener('click', () => {
        searchOverlay.classList.add('opacity-0', 'pointer-events-none', 'w-0');
        searchOverlay.classList.remove('w-64', 'md:w-80');
        searchInput.value = '';
    });
}
document.addEventListener('DOMContentLoaded', initSearchToggle);

// --- AUDIO PLAYER CLOSE LOGIC ---
function initAudioPlayerClose() {
    const btnCloseZen = document.getElementById('btn-zen-close');
    const zenStage = document.getElementById('murottal-zen-stage');
    const globalAudio = document.getElementById('global-audio');
    
    if (btnCloseZen && zenStage && globalAudio) {
        btnCloseZen.addEventListener('click', () => {
            zenStage.classList.add('hidden');
            globalAudio.pause();
            globalAudio.currentTime = 0;
        });
    }
}
document.addEventListener('DOMContentLoaded', initAudioPlayerClose);


// --- DEEP-TECH: PRIVACY BLUR (CTRL+B) ---
function initPrivacyBlur() {
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && (e.key === 'b' || e.key === 'B')) {
            e.preventDefault();
            document.body.classList.toggle('privacy-mode');
        }
    });
}
document.addEventListener('DOMContentLoaded', initPrivacyBlur);


// --- DEEP-TECH: JURNAL SYUKUR & KHATAM TARGET ---
function initJurnalKhatam() {
    // Jurnal Syukur
    const inputJurnal = document.getElementById('jurnal-input');
    const btnSaveJurnal = document.getElementById('btn-save-jurnal');
    if (inputJurnal && btnSaveJurnal) {
        // Simple btoa/atob base64 for 'encryption' feel
        const saved = localStorage.getItem('myquran_jurnal_syukur');
        if (saved) {
            try { inputJurnal.value = atob(saved); } catch(e) {}
        }
        btnSaveJurnal.addEventListener('click', () => {
            const val = inputJurnal.value;
            localStorage.setItem('myquran_jurnal_syukur', btoa(val));
            const oriText = btnSaveJurnal.innerText;
            btnSaveJurnal.innerText = "Tersimpan!";
            btnSaveJurnal.classList.add('bg-emeraldaccent-500', 'text-white');
            setTimeout(() => {
                btnSaveJurnal.innerText = oriText;
                btnSaveJurnal.classList.remove('bg-emeraldaccent-500', 'text-white');
            }, 2000);
        });
    }

    // Target Khatam
    const targetDays = document.getElementById('khatam-target-days');
    const btnCalcKhatam = document.getElementById('btn-calc-khatam');
    const resultText = document.getElementById('khatam-result-text');
    if (targetDays && btnCalcKhatam) {
        btnCalcKhatam.addEventListener('click', () => {
            const days = parseInt(targetDays.value) || 30;
            const totalPages = 604; // Standard Madinah Quran
            const pagesPerDay = Math.ceil(totalPages / days);
            const pagesPerPrayer = Math.ceil(pagesPerDay / 5);
            resultText.innerHTML = `Untuk khatam dalam <b>${days} hari</b>, Anda perlu membaca:<br><span class="text-indigo-400 font-bold text-lg">${pagesPerDay} Halaman/hari</span> (Atau <b>${pagesPerPrayer} Halaman</b> setiap selesai sholat wajib).`;
        });
    }
}
document.addEventListener('DOMContentLoaded', initJurnalKhatam);


// --- DEEP-TECH: HAID & QADHA TRACKER ---
function initQadhaTracker() {
    // Haid
    const btnStart = document.getElementById('btn-haid-start');
    const btnEnd = document.getElementById('btn-haid-end');
    const statusText = document.getElementById('haid-status-text');
    if (btnStart && btnEnd) {
        let isHaid = localStorage.getItem('myquran_haid_status') === 'true';
        const updateUI = () => {
            if(isHaid) {
                statusText.innerText = "Sedang Haid (Bebas Kewajiban Sholat)";
                statusText.className = "font-bold text-rose-400";
            } else {
                statusText.innerText = "Suci";
                statusText.className = "font-bold text-emeraldaccent-500";
            }
        };
        updateUI();

        btnStart.addEventListener('click', () => { isHaid = true; localStorage.setItem('myquran_haid_status', 'true'); updateUI(); });
        btnEnd.addEventListener('click', () => { isHaid = false; localStorage.setItem('myquran_haid_status', 'false'); updateUI(); });
    }

    // Qadha Puasa
    const btnMin = document.getElementById('btn-qadha-minus');
    const btnPlus = document.getElementById('btn-qadha-plus');
    const qCount = document.getElementById('qadha-count');
    if (btnMin && btnPlus) {
        let count = parseInt(localStorage.getItem('myquran_qadha_count') || '0');
        qCount.innerText = count;

        btnMin.addEventListener('click', () => {
            if(count > 0) count--;
            qCount.innerText = count;
            localStorage.setItem('myquran_qadha_count', count);
        });
        btnPlus.addEventListener('click', () => {
            count++;
            qCount.innerText = count;
            localStorage.setItem('myquran_qadha_count', count);
        });
    }
}
document.addEventListener('DOMContentLoaded', initQadhaTracker);


// --- DEEP-TECH: FIDYAH CALCULATOR ---
function initFidyah() {
    const mealPrice = document.getElementById('fidyah-meal-price');
    const fidyahDays = document.getElementById('fidyah-days');
    const fidyahResult = document.getElementById('fidyah-result');
    if (mealPrice && fidyahDays) {
        const calc = () => {
            const price = parseInt(mealPrice.value) || 0;
            const days = parseInt(fidyahDays.value) || 0;
            const total = price * days;
            fidyahResult.innerText = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(total);
        };
        mealPrice.addEventListener('input', calc);
        fidyahDays.addEventListener('input', calc);
        calc();
    }
}
document.addEventListener('DOMContentLoaded', initFidyah);


// --- DEEP-TECH: KOMPAS KIBLAT WEBAR ---
function initKiblat() {
    const btnInit = document.getElementById('btn-init-compass');
    const container = document.getElementById('compass-container');
    const arrow = document.getElementById('compass-arrow');
    const degText = document.getElementById('compass-deg');
    if (!btnInit) return;

    // Approximate Qibla from Indonesia is around 295 degrees NW.
    // Full app needs real Haversine formula based on user GPS.
    const QIBLA_BEARING = 295; 

    btnInit.addEventListener('click', () => {
        if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
            // iOS 13+ devices
            DeviceOrientationEvent.requestPermission()
                .then(permissionState => {
                    if (permissionState === 'granted') {
                        startCompass();
                    } else {
                        alert("Izin sensor ditolak.");
                    }
                })
                .catch(console.error);
        } else {
            // Non iOS 13+ devices
            startCompass();
        }
    });

    function startCompass() {
        btnInit.classList.add('hidden');
        container.classList.remove('hidden');
        
        window.addEventListener('deviceorientationabsolute', handler, true);
        window.addEventListener('deviceorientation', handler, true); // Fallback
    }

    function handler(e) {
        let compass = e.webkitCompassHeading || Math.abs(e.alpha - 360);
        if (compass) {
            let qiblaDirection = QIBLA_BEARING - compass;
            arrow.style.transform = `rotate(${qiblaDirection}deg)`;
            degText.innerText = Math.round(compass) + '° (Utara)';
        }
    }
}
document.addEventListener('DOMContentLoaded', initKiblat);


// --- DEEP-TECH: POMODORO MUROTTAL MODE ---
let pomodoroTimer = null;
let pomodoroTimeLeft = 25 * 60; // 25 mins

function initPomodoro() {
    const btnPomo = document.getElementById('btn-zen-pomodoro');
    const timerText = document.getElementById('zen-pomodoro-timer');
    if(!btnPomo) return;

    btnPomo.addEventListener('click', () => {
        if (pomodoroTimer) {
            // Stop Pomodoro
            clearInterval(pomodoroTimer);
            pomodoroTimer = null;
            timerText.classList.add('hidden');
            btnPomo.classList.remove('text-white', 'bg-rose-500');
            btnPomo.classList.add('text-slate-500', 'bg-slate-800/80');
            pomodoroTimeLeft = 25 * 60;
        } else {
            // Start Pomodoro
            timerText.classList.remove('hidden');
            btnPomo.classList.remove('text-slate-500', 'bg-slate-800/80');
            btnPomo.classList.add('text-white', 'bg-rose-500');
            
            // Auto play audio if paused
            if(audioEl && audioEl.paused) audioEl.play();

            pomodoroTimer = setInterval(() => {
                pomodoroTimeLeft--;
                if(pomodoroTimeLeft <= 0) {
                    clearInterval(pomodoroTimer);
                    pomodoroTimer = null;
                    if(audioEl) audioEl.pause();
                    alert("Waktu Pomodoro Selesai! Saatnya istirahat.");
                    timerText.classList.add('hidden');
                    btnPomo.classList.remove('text-white', 'bg-rose-500');
                    btnPomo.classList.add('text-slate-500', 'bg-slate-800/80');
                    pomodoroTimeLeft = 25 * 60;
                } else {
                    const m = Math.floor(pomodoroTimeLeft / 60).toString().padStart(2, '0');
                    const s = (pomodoroTimeLeft % 60).toString().padStart(2, '0');
                    timerText.innerText = `${m}:${s}`;
                }
            }, 1000);
        }
    });
}
document.addEventListener('DOMContentLoaded', initPomodoro);


// ============================================================================
// FASE 2: BACKEND NODE.JS & AI INTEGRATION
// ============================================================================

// --- DEEP-TECH: COMMUNITY LEDGER (API) ---
function initLedger() {
    const tableBody = document.getElementById('ledger-table-body');
    const balanceText = document.getElementById('ledger-balance');
    const btnSubmit = document.getElementById('btn-submit-ledger');
    
    if (!tableBody || !btnSubmit) return;

    const fetchLedger = async () => {
        try {
            // Adjust URL if deployed. Uses relative for same-origin (Express serving static)
            const res = await fetch('http://localhost:3050/api/ledger');
            if(!res.ok) throw new Error("Gagal mengambil data");
            const data = await res.json();
            
            tableBody.innerHTML = '';
            let balance = 0;
            
            if(data.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-slate-500">Belum ada transaksi.</td></tr>';
                return;
            }

            data.forEach(item => {
                const isIncome = item.type === 'income';
                if(isIncome) balance += item.amount;
                else balance -= item.amount;

                const dateStr = new Date(item.date).toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year:'numeric'});
                const formattedAmt = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(item.amount);
                
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td class="px-4 py-3">${dateStr}</td>
                    <td class="px-4 py-3 font-bold">${item.desc}</td>
                    <td class="px-4 py-3 text-right font-mono ${isIncome ? 'text-emeraldaccent-500' : 'text-rose-400'}">${isIncome ? '+' : '-'}${formattedAmt}</td>
                    <td class="px-4 py-3 text-center"><span class="px-2 py-1 rounded-full text-[10px] font-bold ${isIncome ? 'bg-emeraldaccent-500/20 text-emeraldaccent-500' : 'bg-rose-500/20 text-rose-400'}">${isIncome ? 'IN' : 'OUT'}</span></td>
                `;
                tableBody.appendChild(tr);
            });
            
            balanceText.innerText = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(balance);
        } catch (e) {
            console.error(e);
            tableBody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-rose-500">Gagal terhubung ke Server. Pastikan Node.js berjalan.</td></tr>';
        }
    };

    fetchLedger();

    btnSubmit.addEventListener('click', async () => {
        const type = document.getElementById('ledger-type').value;
        const amount = document.getElementById('ledger-amount').value;
        const desc = document.getElementById('ledger-desc').value;

        if(!amount || !desc) {
            alert("Harap isi nominal dan keterangan!");
            return;
        }

        const oriText = btnSubmit.innerText;
        btnSubmit.innerText = "Menyimpan...";
        btnSubmit.disabled = true;

        try {
            const res = await fetch('http://localhost:3050/api/ledger', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type, amount, desc })
            });
            
            if(res.ok) {
                document.getElementById('ledger-amount').value = '';
                document.getElementById('ledger-desc').value = '';
                fetchLedger();
            } else {
                alert("Gagal menyimpan data.");
            }
        } catch (e) {
            alert("Error: Server backend mati.");
        } finally {
            btnSubmit.innerText = oriText;
            btnSubmit.disabled = false;
        }
    });
}
document.addEventListener('DOMContentLoaded', initLedger);


// --- DEEP-TECH: AI TAJWID ANALYZER ---
function initAITajwid() {
    const btnRecord = document.getElementById('btn-tajwid-record');
    const statusText = document.getElementById('tajwid-status');
    const ripple = document.getElementById('tajwid-ripple');
    const resultBox = document.getElementById('tajwid-result');
    const scoreText = document.getElementById('tajwid-score');
    const notesText = document.getElementById('tajwid-notes');
    
    if(!btnRecord) return;

    let mediaRecorder;
    let audioChunks = [];
    let isRecording = false;

    btnRecord.addEventListener('click', async () => {
        if(!isRecording) {
            // Start recording
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorder = new MediaRecorder(stream);
                
                mediaRecorder.ondataavailable = e => {
                    if (e.data.size > 0) audioChunks.push(e.data);
                };

                mediaRecorder.onstop = async () => {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                    audioChunks = []; // reset
                    
                    statusText.innerText = "Memproses AI...";
                    btnRecord.innerText = "Mohon Tunggu";
                    btnRecord.disabled = true;
                    ripple.classList.add('hidden');

                    // Send to backend
                    const formData = new FormData();
                    formData.append('audio', audioBlob, 'record.webm');

                    try {
                        const res = await fetch('http://localhost:3050/api/tajwid', {
                            method: 'POST',
                            body: formData
                        });
                        if(res.ok) {
                            const data = await res.json();
                            if(data.success) {
                                resultBox.classList.remove('hidden');
                                scoreText.innerText = data.analysis.score;
                                notesText.innerText = data.analysis.notes;
                                statusText.innerText = "Analisis Selesai";
                            }
                        }
                    } catch(e) {
                        alert("Gagal terhubung ke Server AI Tajwid.");
                        statusText.innerText = "Siap Merekam";
                    }
                    
                    btnRecord.innerText = "Rekam Ulang";
                    btnRecord.disabled = false;
                };

                // Start
                audioChunks = [];
                mediaRecorder.start();
                isRecording = true;
                
                btnRecord.innerText = "Berhenti & Analisis";
                btnRecord.classList.replace('bg-rose-500/20', 'bg-rose-600');
                btnRecord.classList.replace('text-rose-400', 'text-white');
                statusText.innerText = "Merekam Suara (Maks 15 detik)...";
                statusText.classList.add('text-rose-400');
                ripple.classList.remove('hidden');
                resultBox.classList.add('hidden');
                
                // Auto stop after 15 seconds
                setTimeout(() => {
                    if(isRecording) btnRecord.click();
                }, 15000);
                
            } catch(e) {
                alert("Izin microphone ditolak atau tidak tersedia.");
            }
        } else {
            // Stop recording
            isRecording = false;
            mediaRecorder.stop();
            btnRecord.classList.replace('bg-rose-600', 'bg-rose-500/20');
            btnRecord.classList.replace('text-white', 'text-rose-400');
            statusText.classList.remove('text-rose-400');
        }
    });

    // --- QRIS INFAQ MODAL ---
    const btnQris = document.getElementById('btn-qris-infaq');
    const qrisModal = document.getElementById('qris-modal');
    const btnCloseQris = document.getElementById('btn-close-qris');

    if(btnQris && qrisModal) {
        const toggleQris = () => {
            if(qrisModal.classList.contains('hidden')) {
                qrisModal.classList.remove('hidden');
                // trigger transition
                setTimeout(() => qrisModal.classList.remove('opacity-0'), 10);
            } else {
                qrisModal.classList.add('opacity-0');
                setTimeout(() => qrisModal.classList.add('hidden'), 300);
            }
        };

        btnQris.addEventListener('click', toggleQris);
        if(btnCloseQris) btnCloseQris.addEventListener('click', toggleQris);
    }
}
document.addEventListener('DOMContentLoaded', initAITajwid);



// ============================================================================
// FASE 3: CMS & PORTAL MASJID AL MUTHMAINNAH
// ============================================================================

function initCMS() {
    const heroImg = document.getElementById('cms-hero-img');
    const heroName = document.getElementById('cms-masjid-name');
    const welcomeText = document.getElementById('cms-welcome-text');
    const footerName = document.getElementById('footer-masjid-name');
    const activitiesList = document.getElementById('cms-activities-list');
    
    // Admin fields
    const adminName = document.getElementById('admin-masjid-name');
    const adminWelcome = document.getElementById('admin-welcome-text');
    const adminPreview = document.getElementById('admin-banner-preview');

    const loadCMS = async () => {
        try {
            const res = await fetch('http://localhost:3050/api/cms');
            if(res.ok) {
                const data = await res.json();
                
                // Update UI
                if(heroName) heroName.innerText = data.masjidName;
                if(welcomeText) welcomeText.innerText = data.welcomeText;
                if(footerName) footerName.innerText = data.masjidName;
                
                if(data.heroBanner && heroImg) {
                    const imgUrl = `http://localhost:3050/uploads/${data.heroBanner}`;
                    heroImg.src = imgUrl;
                    if(adminPreview) adminPreview.src = imgUrl;
                }

                // Update Admin fields
                if(adminName) adminName.value = data.masjidName;
                if(adminWelcome) adminWelcome.value = data.welcomeText;

                // Activities (Kept for backward compatibility or overridden by /api/kajian)
                if(activitiesList && data.activities && data.activities.length > 0 && !document.getElementById('admin-kajian-title')) {
                    // We will override this with real API data if Kajian API is used.
                }

                // Jum'ah Info
                if(data.jumatInfo) {
                    const khatib = document.getElementById('cms-jumat-khatib');
                    const imam = document.getElementById('cms-jumat-imam');
                    const adKhatib = document.getElementById('admin-jumat-khatib');
                    const adImam = document.getElementById('admin-jumat-imam');
                    if(khatib) khatib.innerText = data.jumatInfo.khatib || '-';
                    if(imam) imam.innerText = data.jumatInfo.imam || '-';
                    if(adKhatib) adKhatib.value = data.jumatInfo.khatib || '';
                    if(adImam) adImam.value = data.jumatInfo.imam || '';
                }

                // Announcements
                if(data.announcements) {
                    const ann = document.getElementById('cms-announcements');
                    const adAnn = document.getElementById('admin-announcements');
                    if(ann) ann.innerText = data.announcements;
                    if(adAnn) adAnn.value = data.announcements;
                }

                // Contact Info
                if(data.contactInfo) {
                    const addr = document.getElementById('footer-address');
                    const phone = document.getElementById('footer-phone');
                    const email = document.getElementById('footer-email');
                    const adAddr = document.getElementById('admin-contact-address');
                    const adPhone = document.getElementById('admin-contact-phone');
                    const adEmail = document.getElementById('admin-contact-email');
                    
                    if(addr) addr.innerText = data.contactInfo.address || '';
                    if(phone) phone.innerText = data.contactInfo.phone || '';
                    if(email) email.innerText = data.contactInfo.email || '';
                    if(adAddr) adAddr.value = data.contactInfo.address || '';
                    if(adPhone) adPhone.value = data.contactInfo.phone || '';
                    if(adEmail) adEmail.value = data.contactInfo.email || '';
                }

                // Gallery
                if(data.gallery) {
                    const galGrid = document.getElementById('cms-gallery-grid');
                    const adGalGrid = document.getElementById('admin-gallery-grid');
                    let htmlGal = '';
                    let htmlAdGal = '';
                    
                    if(data.gallery.length === 0) {
                        htmlGal = '<p class="text-xs text-slate-500 col-span-full">Belum ada foto.</p>';
                        htmlAdGal = '<p class="text-xs text-slate-500 col-span-full">Belum ada foto.</p>';
                    } else {
                        data.gallery.forEach(img => {
                            const url = `http://localhost:3050/uploads/${img}`;
                            htmlGal += `
                                <div class="rounded-xl overflow-hidden border border-slate-700 shadow-md aspect-square relative group">
                                    <img src="${url}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500">
                                    <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <i class="fa-solid fa-magnifying-glass text-white text-xl"></i>
                                    </div>
                                </div>
                            `;
                            htmlAdGal += `
                                <div class="rounded-xl overflow-hidden border border-slate-700 shadow-md aspect-square relative group">
                                    <img src="${url}" class="w-full h-full object-cover">
                                    <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <button class="w-8 h-8 rounded-full bg-rose-500 text-white flex items-center justify-center hover:bg-rose-600 shadow-lg cursor-pointer transition transform hover:scale-110" onclick="deleteGalleryImage('${img}')" title="Hapus Foto">
                                            <i class="fa-solid fa-trash-can text-sm"></i>
                                        </button>
                                    </div>
                                </div>
                            `;
                        });
                    }
                    if(galGrid) galGrid.innerHTML = htmlGal;
                    if(adGalGrid) adGalGrid.innerHTML = htmlAdGal;
                }
            }
        } catch(e) {
            console.error("Gagal memuat CMS", e);
        }
    };

    loadCMS();

    // --- KAJIAN (KEGIATAN) CRUD ---
    window.loadKajian = async () => {
        try {
            const res = await fetch('http://localhost:3050/api/kajian');
            if(res.ok) {
                const kajian = await res.json();
                const pubList = document.getElementById('cms-activities-list');
                const adList = document.getElementById('admin-kajian-list');
                
                let pubHtml = '';
                let adHtml = '';
                
                if (kajian.length === 0) {
                    pubHtml = '<p class="text-xs text-slate-500 text-center py-4">Belum ada jadwal kajian.</p>';
                    adHtml = '<p class="text-xs text-slate-500">Belum ada kajian.</p>';
                } else {
                    kajian.forEach(k => {
                        pubHtml += `
                            <div class="p-4 bg-charcoal-900 border border-slate-700 rounded-xl flex gap-4 items-center">
                                <div class="w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center text-emeraldaccent-500 shrink-0">
                                    <i class="fa-solid fa-microphone-lines"></i>
                                </div>
                                <div>
                                    <h4 class="text-sm font-bold text-white">${k.title}</h4>
                                    <p class="text-xs text-slate-400 mt-1"><i class="fa-solid fa-user-tie mr-1"></i> ${k.speaker}</p>
                                    <p class="text-[10px] text-emerald-400 mt-1"><i class="fa-solid fa-clock mr-1"></i> ${k.time}</p>
                                </div>
                            </div>
                        `;
                        adHtml += `
                            <div class="p-3 bg-charcoal-900 border border-slate-700 rounded-xl flex justify-between items-center">
                                <div>
                                    <h4 class="text-sm font-bold text-white">${k.title}</h4>
                                    <p class="text-[10px] text-slate-400">${k.speaker} | ${k.time}</p>
                                </div>
                                <button onclick="deleteKajian(${k.id})" class="w-8 h-8 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center hover:bg-rose-500 hover:text-white transition cursor-pointer">
                                    <i class="fa-solid fa-trash-can text-xs"></i>
                                </button>
                            </div>
                        `;
                    });
                }
                
                if(pubList) pubList.innerHTML = pubHtml;
                if(adList) adList.innerHTML = adHtml;
            }
        } catch(e) {
            console.error("Gagal memuat Kajian", e);
        }
    };

    window.deleteKajian = async (id) => {
        if(!confirm("Yakin ingin menghapus kajian ini?")) return;
        try {
            const res = await fetch(`http://localhost:3050/api/kajian/${id}`, { method: 'DELETE' });
            if(res.ok) loadKajian();
        } catch(e) {
            alert('Gagal menghapus kajian');
        }
    };

    const btnSaveKajian = document.getElementById('btn-save-kajian');
    if (btnSaveKajian) {
        btnSaveKajian.addEventListener('click', async () => {
            const title = document.getElementById('admin-kajian-title').value;
            const speaker = document.getElementById('admin-kajian-speaker').value;
            const time = document.getElementById('admin-kajian-time').value;
            
            if(!title || !speaker || !time) return alert("Semua kolom kajian harus diisi!");
            
            const oriText = btnSaveKajian.innerText;
            btnSaveKajian.innerText = "Menyimpan...";
            
            try {
                const res = await fetch('http://localhost:3050/api/kajian', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title, speaker, time })
                });
                if(res.ok) {
                    document.getElementById('admin-kajian-title').value = '';
                    document.getElementById('admin-kajian-speaker').value = '';
                    document.getElementById('admin-kajian-time').value = '';
                    loadKajian();
                }
            } catch(e) {
                alert('Gagal menyimpan kajian');
            }
            
            btnSaveKajian.innerText = oriText;
        });
    }

    loadKajian();

    // Clone Hijri & Prayer Times to Landing
    const dashHijri = document.getElementById('dash-hijri-text');
    const landHijri = document.getElementById('landing-hijri-text');
    const dashPrayer = document.getElementById('dash-prayer-times-container');
    const landPrayer = document.getElementById('landing-prayer-times');
    
    // Using MutationObserver to sync dashboard prayer times to landing page
    if(dashHijri && landHijri) {
        const observer = new MutationObserver(() => {
            landHijri.innerText = dashHijri.innerText;
            if(dashPrayer && landPrayer && dashPrayer.innerHTML !== '<p class="text-xs text-slate-400">Memuat lokasi...</p>') {
                // Format slightly different for landing (grid)
                const items = dashPrayer.querySelectorAll('.flex.justify-between');
                let html = '';
                items.forEach(item => {
                    const name = item.querySelector('span:first-child').innerText;
                    const time = item.querySelector('span:last-child').innerText;
                    html += `<div class="bg-charcoal-900 border border-slate-700 p-2 rounded-xl">
                                <p class="text-[10px] text-slate-400 uppercase font-bold mb-1">${name}</p>
                                <p class="text-sm text-emerald-400 font-extrabold">${time}</p>
                             </div>`;
                });
                if(html) landPrayer.innerHTML = html;
            }
        });
        observer.observe(dashHijri, { childList: true, characterData: true, subtree: true });
        observer.observe(dashPrayer, { childList: true, characterData: true, subtree: true });
    }

    // Admin Features
    const btnSaveText = document.getElementById('btn-save-cms-text');
    if(btnSaveText) {
        btnSaveText.addEventListener('click', async () => {
            const token = localStorage.getItem('adminToken');
            if(!token) return alert("Belum login!");
            
            const ori = btnSaveText.innerText;
            btnSaveText.innerText = 'Menyimpan...';
            try {
                const res = await fetch('http://localhost:3050/api/cms', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        masjidName: adminName.value,
                        welcomeText: adminWelcome.value
                    })
                });
                if(res.ok) {
                    alert("Teks berhasil disimpan!");
                    loadCMS();
                }
            } catch(e) {
                alert("Error menyimpan teks");
            }
            btnSaveText.innerText = ori;
        });
    }

    const btnUploadBanner = document.getElementById('btn-upload-banner');
    const bannerFile = document.getElementById('admin-banner-file');
    if(btnUploadBanner && bannerFile) {
        btnUploadBanner.addEventListener('click', async () => {
            if(!bannerFile.files[0]) return alert("Pilih file gambar dulu!");
            
            const formData = new FormData();
            formData.append('banner', bannerFile.files[0]);

            const ori = btnUploadBanner.innerText;
            btnUploadBanner.innerText = 'Mengunggah...';
            try {
                const res = await fetch('http://localhost:3050/api/upload-banner', {
                    method: 'POST',
                    body: formData
                });
                if(res.ok) {
                    alert("Banner berhasil diubah!");
                    loadCMS();
                }
            } catch(e) {
                alert("Error mengunggah banner");
            }
            btnUploadBanner.innerText = ori;
        });
    }
    const btnSaveJumat = document.getElementById('btn-save-jumat-info');
    if(btnSaveJumat) {
        btnSaveJumat.addEventListener('click', async () => {
            const token = localStorage.getItem('adminToken');
            if(!token) return alert("Belum login!");
            
            const ori = btnSaveJumat.innerText;
            btnSaveJumat.innerText = 'Menyimpan...';
            try {
                const res = await fetch('http://localhost:3050/api/cms', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        jumatInfo: {
                            khatib: document.getElementById('admin-jumat-khatib').value,
                            imam: document.getElementById('admin-jumat-imam').value
                        },
                        announcements: document.getElementById('admin-announcements').value
                    })
                });
                if(res.ok) {
                    alert("Info Jumat & Pengumuman disimpan!");
                    loadCMS();
                }
            } catch(e) {
                alert("Error menyimpan info jumat");
            }
            btnSaveJumat.innerText = ori;
        });
    }

    const btnSaveContact = document.getElementById('btn-save-contact');
    if(btnSaveContact) {
        btnSaveContact.addEventListener('click', async () => {
            const token = localStorage.getItem('adminToken');
            if(!token) return alert("Belum login!");
            
            const ori = btnSaveContact.innerText;
            btnSaveContact.innerText = 'Menyimpan...';
            try {
                const res = await fetch('http://localhost:3050/api/cms', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contactInfo: {
                            address: document.getElementById('admin-contact-address').value,
                            phone: document.getElementById('admin-contact-phone').value,
                            email: document.getElementById('admin-contact-email').value
                        }
                    })
                });
                if(res.ok) {
                    alert("Kontak berhasil disimpan!");
                    loadCMS();
                }
            } catch(e) {
                alert("Error menyimpan kontak");
            }
            btnSaveContact.innerText = ori;
        });
    }

    const btnUploadGallery = document.getElementById('btn-upload-gallery');
    const galleryFile = document.getElementById('admin-gallery-file');
    if(btnUploadGallery && galleryFile) {
        btnUploadGallery.addEventListener('click', async () => {
            if(!galleryFile.files[0]) return alert("Pilih foto terlebih dahulu!");
            
            const formData = new FormData();
            formData.append('photo', galleryFile.files[0]);

            const ori = btnUploadGallery.innerHTML;
            btnUploadGallery.innerHTML = 'Mengunggah...';
            try {
                const res = await fetch('http://localhost:3050/api/upload-gallery', {
                    method: 'POST',
                    body: formData
                });
                if(res.ok) {
                    alert("Foto berhasil ditambahkan ke galeri!");
                    galleryFile.value = '';
                    loadCMS();
                }
            } catch(e) {
                alert("Error mengunggah galeri");
            }
            btnUploadGallery.innerHTML = ori;
        });
    }

    // Global delete gallery function
    window.deleteGalleryImage = async (filename) => {
        if(!confirm("Yakin ingin menghapus foto ini?")) return;
        try {
            const res = await fetch(`http://localhost:3050/api/gallery/${filename}`, {
                method: 'DELETE'
            });
            if(res.ok) {
                loadCMS();
            }
        } catch(e) {
            alert("Error menghapus foto");
        }
    };

    // Article Submit Form
    const btnSaveArt = document.getElementById('btn-save-article');
    if(btnSaveArt) {
        btnSaveArt.addEventListener('click', async () => {
            const title = document.getElementById('admin-art-title').value.trim();
            const bodyHtml = document.getElementById('admin-art-body').innerHTML.trim();
            const coverInput = document.getElementById('admin-art-cover');

            if(!title || !bodyHtml) {
                return alert("Judul dan Isi Artikel tidak boleh kosong!");
            }

            const formData = new FormData();
            formData.append('title', title);
            formData.append('content', bodyHtml);
            if(coverInput.files[0]) {
                formData.append('cover', coverInput.files[0]);
            }

            const ori = btnSaveArt.innerHTML;
            btnSaveArt.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Menyimpan...';

            try {
                const res = await fetch('http://localhost:3050/api/articles', {
                    method: 'POST',
                    body: formData
                });
                if(res.ok) {
                    alert("Artikel berhasil dipublikasikan!");
                    document.getElementById('admin-art-title').value = '';
                    document.getElementById('admin-art-body').innerHTML = '';
                    document.getElementById('admin-art-cover').value = '';
                    loadArticles(); // reload articles
                }
            } catch(e) {
                alert("Error menyimpan artikel");
            }
            btnSaveArt.innerHTML = ori;
        });
    }
}
document.addEventListener('DOMContentLoaded', initCMS);


function initAdminAuth() {
    const btnOpenAdmin = document.getElementById('btn-open-admin-login');
    const modal = document.getElementById('admin-login-modal');
    const btnCancel = document.getElementById('btn-cancel-login');
    const btnSubmit = document.getElementById('btn-submit-login');
    const userIn = document.getElementById('login-username');
    const passIn = document.getElementById('login-password');
    const btnLogout = document.getElementById('btn-admin-logout');

    if(!btnOpenAdmin || !modal) return;

    const showModal = () => {
        modal.classList.remove('hidden');
        setTimeout(() => {
            modal.classList.remove('opacity-0');
            modal.querySelector('div').classList.remove('scale-95');
        }, 10);
    };

    const hideModal = () => {
        modal.classList.add('opacity-0');
        modal.querySelector('div').classList.add('scale-95');
        setTimeout(() => modal.classList.add('hidden'), 300);
    };

    btnOpenAdmin.addEventListener('click', () => {
        // If already logged in, just go to admin tab
        if(localStorage.getItem('adminToken')) {
            showTab('admin');
        } else {
            showModal();
        }
    });
    btnCancel.addEventListener('click', hideModal);

    btnSubmit.addEventListener('click', async () => {
        const ori = btnSubmit.innerText;
        btnSubmit.innerText = 'Memeriksa...';
        try {
            const res = await fetch('http://localhost:3050/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: userIn.value, password: passIn.value })
            });
            const data = await res.json();
            if(data.success) {
                localStorage.setItem('adminToken', data.token);
                hideModal();
                showTab('admin');
            } else {
                alert("Username atau Password salah!");
            }
        } catch(e) {
            alert("Error server.");
        }
        btnSubmit.innerText = ori;
    });

    if(btnLogout) {
        btnLogout.addEventListener('click', () => {
            localStorage.removeItem('adminToken');
            showTab('landing'); // Back to home
            alert("Berhasil keluar dari Admin Panel.");
        });
    }
}
document.addEventListener('DOMContentLoaded', initAdminAuth);

function showTab(targetId) {
    document.querySelectorAll('.tab-pane').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
    
    const targetPane = document.getElementById(targetId);
    if(targetPane) targetPane.classList.add('active');
    
    const navBtn = document.querySelector(`.nav-btn[data-target="${targetId}"]`);
    if(navBtn) navBtn.classList.add('active');
}

