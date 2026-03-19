import { auth, provider } from './firebase-config.js';
import { signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

// Global variables to hold auth state
window.currentUserEmail = null;
window.isObserver = false;

document.addEventListener('DOMContentLoaded', () => {
    initCountdown();
    // initial UI setup
    updateUIForLogout(false);
});

onAuthStateChanged(auth, (user) => {
    if (user) {
        // Automatically reject non-Mita accounts
        if (!user.email.endsWith("@mita-is.ed.jp")) {
            signOut(auth).then(() => {
                alert("エラー: @mita-is.ed.jp のアカウントでのみログイン可能です！\n(Error: Only @mita-is.ed.jp accounts are allowed)");
            });
            window.currentUserEmail = null;
            updateUIForLogout(true);
            return;
        }

        window.currentUserEmail = user.email;
        updateUIForLogin(user.email);

        // If we are on the vote page, trigger the DB load
        if (window.location.pathname.includes('vote.html') && typeof window.initVotingSystem === 'function') {
            window.initVotingSystem();
        }
    } else {
        window.currentUserEmail = null;
        updateUIForLogout(true);
    }
});

function updateUIForLogin(email) {
    const loginView = document.getElementById('login-view');
    const appView = document.getElementById('app-view');
    const btnLogin = document.getElementById('btn-login');
    const btnLogout = document.getElementById('btn-logout');
    const authBtn = document.getElementById('auth-btn'); // Fallback
    const emailDisplays = document.querySelectorAll('.user-email-display');

    if (loginView) loginView.classList.add('hidden');
    if (appView) appView.classList.remove('hidden');
    if (btnLogin) btnLogin.classList.add('hidden');
    if (btnLogout) btnLogout.classList.remove('hidden');
    if (authBtn) authBtn.classList.remove('hidden');

    emailDisplays.forEach(el => {
        el.innerText = `👤 ${email}`;
        el.classList.remove('hidden');
    });
}

function updateUIForLogout(doRedirect) {
    const loginView = document.getElementById('login-view');
    const appView = document.getElementById('app-view');
    const btnLogin = document.getElementById('btn-login');
    const btnLogout = document.getElementById('btn-logout');
    const authBtn = document.getElementById('auth-btn');
    const emailDisplays = document.querySelectorAll('.user-email-display');

    if (loginView) loginView.classList.remove('hidden');
    if (appView) appView.classList.add('hidden');
    if (btnLogin) btnLogin.classList.remove('hidden');
    if (btnLogout) btnLogout.classList.add('hidden');
    if (authBtn) authBtn.classList.add('hidden');

    emailDisplays.forEach(el => el.classList.add('hidden'));

    if (doRedirect) {
        if (window.location.pathname.indexOf('index.html') === -1 && window.location.pathname.length > 2 && window.location.pathname.endsWith('.html')) {
            window.location.href = 'index.html';
        }
    }
}

// Attached to window so inline HTML onclick handlers can find them
window.showLoginPrompt = async function () {
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        if (!user.email.endsWith("@mita-is.ed.jp")) {
            await signOut(auth);
            alert("エラー: @mita-is.ed.jp のアカウントでのみログイン可能です！");
        }
    } catch (error) {
        console.error(error);
        if (error.code !== 'auth/popup-closed-by-user') {
            alert("ログインに失敗しました: " + error.message);
        }
    }
};

window.globalMockLogin = window.showLoginPrompt;

window.globalMockLogout = async function () {
    try {
        await signOut(auth);
        if (window.location.pathname.includes('vote.html') || window.location.pathname.includes('election.html') || window.location.pathname.includes('rules.html')) {
            window.location.href = 'index.html';
        }
    } catch (error) {
        console.error("サインアウトエラー", error);
    }
};

// Countdown Logic
function initCountdown() {
    const countdownEl = document.getElementById('countdown');
    if (!countdownEl) return;

    const targetDate = new Date('2026-06-17T09:00:00').getTime();

    function update() {
        const now = new Date().getTime();
        const distance = targetDate - now;

        if (distance <= 0) {
            countdownEl.innerHTML = `
                <span class="text-slate-800">00</span><span class="text-slate-400 mx-1">:</span><span class="text-sf-red">00</span><span class="text-slate-400 mx-1">:</span><span class="text-slate-800">00</span><span class="text-slate-400 mx-1">:</span><span class="text-sf-red">00</span>
            `;
            return;
        }

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        const pad = (num) => num.toString().padStart(2, '0');

        countdownEl.innerHTML = `
            <span class="text-slate-800">${pad(days)}</span><span class="text-slate-300 mx-1 md:mx-3">:</span><span class="text-sf-red">${pad(hours)}</span><span class="text-slate-300 mx-1 md:mx-3">:</span><span class="text-slate-800">${pad(minutes)}</span><span class="text-slate-300 mx-1 md:mx-3">:</span><span class="text-sf-red">${pad(seconds)}</span>
        `;
    }
    setInterval(update, 1000);
    update();
}
