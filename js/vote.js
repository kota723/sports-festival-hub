import { db } from './firebase-config.js';
import { collection, doc, setDoc, getDocs, runTransaction } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const OBSERVERS = [
    '20211016@mita-is.ed.jp'
];

window.pollsData = [];
window.currentChart = null;

function checkObserver() {
    if (!window.currentUserEmail) return false;
    return OBSERVERS.includes(window.currentUserEmail.trim());
}

window.initVotingSystem = async function () {
    try {
        const pollsRef = collection(db, "polls");
        const snapshot = await getDocs(pollsRef);
        window.pollsData = [];

        snapshot.forEach(docSnap => {
            window.pollsData.push({ id: docSnap.id, ...docSnap.data() });
        });

        // Seed data if database is empty exactly once
        if (window.pollsData.length === 0) {
            const seed = {
                id: 'poll_seed_' + Date.now(),
                title: '【緊急】ラスト1種目はみんなの投票で決定！',
                desc: '1人1票まで！間違えないように選んでね🙌 選ばれた種目が今年の目玉になります！',
                deadline: '2026-06-10T23:59',
                options: [
                    { id: 'opt_A', text: '借り物競走 -改- (ハードすぎる指定品)', votes: 42 },
                    { id: 'opt_B', text: '障害物サバイバル (理不尽極まりない)', votes: 38 }
                ],
                voters: {
                    'dummy_student1@mita-is.ed.jp': 'opt_A',
                    'dummy_student2@mita-is.ed.jp': 'opt_B'
                }
            };
            await setDoc(doc(collection(db, "polls"), seed.id), seed);
            window.pollsData.push(seed);
        }

        window.renderPollsList();
    } catch (e) {
        console.error("Firestore Loading Error:", e);
        alert("投票データの読み込みに失敗しました");
    }
};

window.renderPollsList = function () {
    const activeContainer = document.getElementById('active-polls-container');
    const votedContainer = document.getElementById('voted-polls-container');
    if (!activeContainer || !votedContainer) return;

    activeContainer.innerHTML = '';
    votedContainer.innerHTML = '';

    const obsBtn = document.getElementById('observer-actions');
    if (obsBtn) {
        if (checkObserver()) {
            obsBtn.classList.remove('hidden');
        } else {
            obsBtn.classList.add('hidden');
        }
    }

    const now = new Date().getTime();
    const sortedPolls = [...window.pollsData].sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());

    let activeCount = 0;
    let votedCount = 0;

    sortedPolls.forEach(poll => {
        // Must ensure voters object exists
        if (!poll.voters) poll.voters = {};

        const hasVoted = !!poll.voters[window.currentUserEmail];
        const isPastDeadline = new Date(poll.deadline).getTime() < now;
        const isEndedOrVoted = hasVoted || isPastDeadline;

        const el = document.createElement('div');
        el.className = `bg-white p-6 border-4 border-slate-800 rounded-3xl shadow-[6px_6px_0_#1e293b] flex flex-col md:flex-row md:items-center justify-between cursor-pointer hover:-translate-y-1 transition-all duration-300 ${!isEndedOrVoted ? 'hover:shadow-[10px_10px_0_#1e293b]' : 'opacity-70 grayscale-[30%]'}`;
        el.onclick = () => window.openPollDetail(poll.id);

        const statusBadge = hasVoted
            ? `<span class="bg-indigo-100 text-indigo-800 font-bold px-3 py-1 rounded-full text-xs">投票済み ✅</span>`
            : isPastDeadline
                ? `<span class="bg-slate-200 text-slate-800 font-bold px-3 py-1 rounded-full text-xs">締切終了 ⚠️</span>`
                : `<span class="bg-red-100 text-red-800 font-bold px-3 py-1 rounded-full text-xs animate-pulse">受付中 🔥</span>`;

        el.innerHTML = `
            <div class="mb-4 md:mb-0">
                <div class="mb-2">${statusBadge}</div>
                <h4 class="text-xl font-black text-slate-800 mb-1">${poll.title}</h4>
                <p class="text-xs font-bold text-slate-500">⏰ 期限: ${new Date(poll.deadline).toLocaleString('ja-JP', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
            </div>
            <div class="text-3xl hidden md:block group-hover:translate-x-2 transition-transform">👉</div>
        `;

        if (isEndedOrVoted) {
            votedContainer.appendChild(el);
            votedCount++;
        } else {
            activeContainer.appendChild(el);
            activeCount++;
        }
    });

    if (activeCount === 0) activeContainer.innerHTML = '<p class="text-slate-500 font-bold p-4">現在受付中の投票はありません。</p>';
    if (votedCount === 0) votedContainer.innerHTML = '<p class="text-slate-500 font-bold p-4">完了した投票はまだありません。</p>';
};

window.showPollList = function () {
    document.getElementById('polls-list-view').classList.remove('hidden');
    document.getElementById('poll-detail-view').classList.add('hidden');
    document.getElementById('poll-create-view').classList.add('hidden');
    window.renderPollsList();
};

window.showCreateForm = function () {
    document.getElementById('polls-list-view').classList.add('hidden');
    document.getElementById('poll-create-view').classList.remove('hidden');
};

window.addOptionField = function () {
    const container = document.getElementById('create-options-container');
    const inputCount = container.querySelectorAll('input').length;
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'create-option-input w-full bg-slate-50 border-2 border-slate-400 rounded-xl p-3 font-bold mt-3';
    input.placeholder = `選択肢 ${inputCount + 1}`;
    container.appendChild(input);
};

window.submitNewPoll = async function () {
    const title = document.getElementById('create-title').value.trim();
    const desc = document.getElementById('create-desc').value.trim();
    const deadline = document.getElementById('create-deadline').value;

    if (!title || !desc || !deadline) {
        alert("すべての項目を入力してください！");
        return;
    }

    const inputs = document.querySelectorAll('.create-option-input');
    const options = [];
    inputs.forEach((inp, idx) => {
        if (inp.value.trim()) {
            options.push({
                id: `opt_${Date.now()}_${idx}`,
                text: inp.value.trim(),
                votes: 0
            });
        }
    });

    if (options.length < 2) {
        alert("選択肢は最低２つ必要です！");
        return;
    }

    const newPoll = {
        id: `poll_${Date.now()}`,
        title,
        desc,
        deadline,
        options,
        voters: {}
    };

    try {
        await setDoc(doc(db, "polls", newPoll.id), newPoll);
        alert("新規投票を作成しました🚀");

        document.getElementById('create-title').value = '';
        document.getElementById('create-desc').value = '';
        document.getElementById('create-deadline').value = '';

        await window.initVotingSystem();
        window.showPollList();
    } catch (e) {
        console.error(e);
        alert("保存に失敗しました：" + e.message);
    }
};

window.openPollDetail = function (pollId) {
    document.getElementById('polls-list-view').classList.add('hidden');
    document.getElementById('poll-detail-view').classList.remove('hidden');

    const poll = window.pollsData.find(p => p.id === pollId);
    const content = document.getElementById('poll-detail-content');
    if (!poll) {
        content.innerHTML = '<p>エラー: 見つかりません</p>';
        return;
    }

    const hasVoted = !!(poll.voters && poll.voters[window.currentUserEmail]);
    const isPastDeadline = new Date(poll.deadline).getTime() < new Date().getTime();

    let html = `
        <div class="mb-8">
            <h2 class="text-3xl font-black text-slate-800 mb-3">${poll.title}</h2>
            <p class="text-slate-600 font-bold bg-white p-4 border-2 border-slate-200 rounded-xl mb-4 leading-relaxed">${poll.desc}</p>
            <p class="text-sm font-bold text-slate-500">⏰ 受付終了時間: ${new Date(poll.deadline).toLocaleString('ja-JP')}</p>
        </div>
    `;

    if (hasVoted || isPastDeadline) {
        html += renderResults(poll);
    } else {
        html += `<div class="space-y-4">`;
        poll.options.forEach((opt, idx) => {
            const colors = ['bg-sf-blue text-white shadow-[6px_6px_0_#1e293b]', 'bg-sf-red text-white shadow-[6px_6px_0_#1e293b]', 'bg-yellow-400 text-slate-900 shadow-[6px_6px_0_#1e293b]', 'bg-green-500 text-white shadow-[6px_6px_0_#1e293b]'];
            const colorClass = colors[idx % colors.length];

            html += `
                <button onclick="window.submitUserVote('${poll.id}', '${opt.id}')" 
                    class="w-full text-left p-6 border-4 border-slate-800 rounded-2xl transform hover:-translate-y-2 transition-transform duration-200 active:translate-y-0 active:shadow-none ${colorClass}">
                    <div class="font-black text-2xl mb-1">Option ${idx + 1}</div>
                    <div class="font-bold text-lg opacity-90">${opt.text}</div>
                </button>
            `;
        });
        html += `</div>`;
    }

    if (checkObserver()) {
        html += `
            <div class="mt-16 bg-slate-900 text-slate-100 p-8 rounded-3xl border-4 border-slate-800 shadow-[8px_8px_0_#1e293b]">
                <h3 class="text-2xl font-black mb-4 flex items-center gap-2">👁️ オブザーバー用データパネル</h3>
                <p class="text-sm opacity-70 mb-6">※この一覧はObserver権限を持つユーザーにのみ表示されています。</p>
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr class="border-b-2 border-slate-700">
                                <th class="py-3 px-4 font-bold">メールアドレス</th>
                                <th class="py-3 px-4 font-bold w-16 text-center">学年</th>
                                <th class="py-3 px-4 font-bold">選択した項目</th>
                            </tr>
                        </thead>
                        <tbody>
        `;

        let voterCount = 0;
        if (poll.voters) {
            for (const [email, optionId] of Object.entries(poll.voters)) {
                const opt = poll.options.find(o => o.id === optionId);
                const optText = opt ? opt.text : '不明';

                let grade = "👨‍🏫"; // 教員など
                const yearMatch = email.substring(0, 4);
                if (yearMatch === "2021") grade = "高3";
                else if (yearMatch === "2022") grade = "高2";
                else if (yearMatch === "2023") grade = "高1";
                else if (yearMatch === "2024") grade = "中3";
                else if (yearMatch === "2025") grade = "中2";
                else if (yearMatch === "2026") grade = "中1";

                html += `
                    <tr class="border-b border-slate-700/50 hover:bg-slate-800 transition">
                        <td class="py-3 px-4 font-mono text-sm">${email}</td>
                        <td class="py-3 px-4 text-center">
                            <span class="bg-indigo-900/50 border border-indigo-400/30 text-indigo-100 font-bold py-1 px-2 rounded-lg text-xs tracking-wider">${grade}</span>
                        </td>
                        <td class="py-3 px-4 font-bold text-sm">${optText}</td>
                    </tr>
                `;
                voterCount++;
            }
        }

        if (voterCount === 0) html += `<tr><td colspan="2" class="py-4 text-center text-slate-500 font-bold">まだ投票者がいません</td></tr>`;

        html += `</tbody></table></div></div>`;
    }

    content.innerHTML = html;

    if (hasVoted || isPastDeadline) {
        window.initPollChart(poll);
    }
};

window.submitUserVote = async function (pollId, optionId) {
    if (!confirm("本当にこの選択肢で投票しますか？(※後から変更はできません)")) return;
    if (!window.currentUserEmail) {
        alert("先にログインしてください！");
        return;
    }

    const pollRef = doc(db, "polls", pollId);

    try {
        let pollTitle = "";
        let optionText = "";

        await runTransaction(db, async (transaction) => {
            const sfDoc = await transaction.get(pollRef);
            if (!sfDoc.exists()) throw "該当の投票が見つかりません。";
            const currentData = sfDoc.data();

            pollTitle = currentData.title;
            const votedOpt = currentData.options.find(o => o.id === optionId);
            if (votedOpt) optionText = votedOpt.text;

            if (currentData.voters && currentData.voters[window.currentUserEmail]) {
                throw "既に投票済みです。";
            }
            if (new Date(currentData.deadline).getTime() < new Date().getTime()) {
                throw "投票期限が過ぎています。";
            }

            const newOptions = currentData.options.map(opt => {
                if (opt.id === optionId) {
                    return { ...opt, votes: opt.votes + 1 };
                }
                return opt;
            });
            const newVoters = { ...(currentData.voters || {}), [window.currentUserEmail]: optionId };

            transaction.update(pollRef, {
                options: newOptions,
                voters: newVoters
            });
        });

        // GASへデータを送信 (バックグラウンド実行のためawait不要)
        const gasUrl = "https://script.google.com/macros/s/AKfycbxot6RLnzgzQ8y3_YeptOonmwBmkbMs5WBoLfPL5wn1jG1I02IDNAnpkRDGv2EZfy0/exec";
        fetch(gasUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                timestamp: new Date().toLocaleString('ja-JP'),
                email: window.currentUserEmail,
                pollTitle: pollTitle || "不明な投票",
                optionText: optionText || "不明な選択肢"
            })
        }).catch(e => console.error("Webhook Error", e));

        alert("投票が完了しました！グラフで結果を確認してください。");
        await window.initVotingSystem(); // Reload all data
        window.openPollDetail(pollId); // Render with new results

    } catch (e) {
        console.error(e);
        alert(e);
    }
};

function renderResults(poll) {
    const hasVoted = !!(poll.voters && poll.voters[window.currentUserEmail]);
    let myOptText = '';

    if (hasVoted) {
        const myVoteId = poll.voters[window.currentUserEmail];
        const myOpt = poll.options.find(o => o.id === myVoteId);
        myOptText = myOpt ? myOpt.text : '';
    }

    let topMessage = hasVoted ?
        `<div class="bg-indigo-50 border-2 border-indigo-200 text-indigo-800 p-4 rounded-xl mb-8 font-bold text-center shadow-inner">
            🎉 投票完了！あなたの選択: 「${myOptText}」
        </div>` :
        `<div class="bg-slate-200 border-2 border-slate-300 text-slate-800 p-4 rounded-xl mb-8 font-bold text-center shadow-inner">
            ⚠️ 期限終了により投票は締め切られました。
        </div>`;

    return `
        ${topMessage}
        <div class="bg-white p-8 border-4 border-slate-800 rounded-3xl shadow-[6px_6px_0_#1e293b]">
            <h4 class="text-xl font-black mb-6 text-center text-slate-800">📊 リアルタイム投票結果</h4>
            <div class="relative w-full max-w-md mx-auto aspect-[4/3] mb-6">
                <canvas id="pollResultsChart"></canvas>
            </div>
            <div class="space-y-3">
                ${poll.options.map(opt => `
                    <div class="flex justify-between items-center font-bold px-4 py-2 bg-slate-50 rounded-lg border border-slate-200">
                        <span class="truncate pr-4">${opt.text}</span>
                        <span class="text-sf-blue font-black">${opt.votes} 票</span>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

window.initPollChart = function (poll) {
    const ctx = document.getElementById('pollResultsChart');
    if (!ctx) return;

    if (window.currentChart) {
        window.currentChart.destroy();
    }

    const labels = poll.options.map(o => o.text.substring(0, 15) + '...');
    const data = poll.options.map(o => o.votes);

    const bgColors = ['rgba(54, 162, 235, 0.8)', 'rgba(255, 99, 132, 0.8)', 'rgba(255, 206, 86, 0.8)', 'rgba(75, 192, 192, 0.8)'];
    const borderColors = ['#0047AB', '#DC143C', '#B8860B', '#008080'];

    window.currentChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: bgColors,
                borderColor: borderColors,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#1e293b', font: { weight: 'bold', family: "'Inter', 'Noto Sans JP', sans-serif" } }
                }
            },
            animation: { animateScale: true, animateRotate: true }
        }
    });
};
