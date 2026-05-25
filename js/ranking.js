const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/1PEZiEMmR2nt2ULJ8dJH-jS-icV_Y3CW1_ZChYkLTNCs/export?format=csv&gid=1031884225";

async function fetchRankingData() {
    console.log("Fetching ranking data...");
    const container = document.getElementById('ranking-content');
    if (!container) return;

    try {
        const response = await fetch(SHEET_CSV_URL);
        if (!response.ok) throw new Error("Network response was not ok");
        
        const csvText = await response.text();
        const rows = csvText.split('\n').map(row => {
            // Basic CSV parser that handles commas inside quotes roughly
            return row.split(',').map(cell => cell.replace(/^"(.*)"$/, '$1').trim());
        });
        
        console.log("Data fetched, rows found:", rows.length);
        
        const rankings = {
            overall: parseColumnGroup(rows, 1, 2),
            high3: parseColumnGroup(rows, 6, 7),
            high2: parseColumnGroup(rows, 10, 11),
            high1: parseColumnGroup(rows, 14, 15)
        };
        
        if (rankings.overall.length === 0) {
            container.innerHTML = `
                <div class="text-center py-10">
                    <p class="text-slate-400 font-bold mb-4">現在、集計データが空か公開設定待ちです。</p>
                    <p class="text-xs text-slate-300">スプレッドシートの「ウェブに公開」設定を確認してください。</p>
                </div>
            `;
            return;
        }

        renderRankingUI(rankings);
    } catch (e) {
        console.error("Failed to fetch ranking data:", e);
        container.innerHTML = `
            <div class="text-center py-10 opacity-60">
                <p class="text-sf-red font-bold mb-2">データの読み込みに失敗しました。</p>
                <p class="text-xs text-slate-400 mb-4">スプレッドシートの共有設定（ウェブに公開）を確認してください。</p>
                <button onclick="window.refreshRanking()" class="text-sm bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-full font-bold transition">再試行 🔄</button>
            </div>
        `;
    }
}

function parseColumnGroup(rows, classIdx, scoreIdx) {
    const list = [];
    // Data usually starts from some row, looking at the previous attempt
    // Let's search for "1位" or similar in column A or the column before classIdx
    
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row) continue;
        
        const rankValue = (row[classIdx-1] || "").trim();
        const className = (row[classIdx] || "").trim();
        const score = (row[scoreIdx] || "").trim();
        
        // Match things like "1位", "1", etc.
        if ((rankValue.includes("位") || (!isNaN(rankValue) && rankValue !== "")) && className && score && score !== "回数") {
            const numRank = parseInt(rankValue.replace("位", ""));
            list.push({ rank: numRank, class: className, score: score });
        }
    }
    // Limit to top 6
    return list.slice(0, 6);
}

function renderRankingUI(rankings) {
    const container = document.getElementById('ranking-content');
    if (!container) return;

    let html = `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            ${renderColumn('総合順位', rankings.overall, 'sf-gold')}
            ${renderColumn('高3', rankings.high3, 'sf-blue')}
            ${renderColumn('高2', rankings.high2, 'sf-red')}
            ${renderColumn('高1', rankings.high1, 'slate-500')}
        </div>
    `;
    
    container.innerHTML = html;
}

function renderColumn(title, data, colorClass) {
    const rowsHtml = data.map(item => {
        const rankClass = item.rank <= 3 ? `rank-${item.rank}` : 'rank-other';
        
        return `
            <div class="ranking-row flex items-center justify-between p-3 md:p-4 mb-2 animate-fade-in group">
                <div class="flex items-center gap-3">
                    <span class="rank-badge ${rankClass} text-xs md:text-sm">${item.rank}</span>
                    <span class="font-black text-slate-800 text-sm md:text-base group-hover:text-sf-blue transition">${item.class}</span>
                </div>
                <div class="flex items-center gap-1 md:gap-2">
                    <span class="text-xl md:text-2xl font-black text-${colorClass}">${item.score}</span>
                    <span class="text-[10px] md:text-xs font-bold text-slate-400">回</span>
                </div>
            </div>
        `;
    }).join('');

    return `
        <div class="bg-slate-50/30 p-4 md:p-5 rounded-3xl border-2 border-slate-100/50 backdrop-blur-sm flex flex-col h-full">
            <h4 class="font-wafuu font-black text-base md:text-lg lg:text-xl mb-4 md:mb-6 flex items-center gap-3 border-b-2 border-slate-200 pb-3">
                <span class="w-1.5 h-6 bg-${colorClass} rounded-full"></span>
                ${title}
            </h4>
            <div class="flex-grow space-y-1">
                ${rowsHtml || '<p class="text-slate-400 text-xs text-center py-6">集計中...</p>'}
            </div>
        </div>
    `;
}

// Initial fetch when window loads
window.addEventListener('load', () => {
    // Small delay to ensure everything is ready
    setTimeout(fetchRankingData, 500);
});

window.refreshRanking = fetchRankingData;
