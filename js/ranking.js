const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/1PEZiEMmR2nt2ULJ8dJH-jS-icV_Y3CW1_ZChYkLTNCs/export?format=csv&gid=1031884225";

async function fetchRankingData() {
    console.log("Fetching ranking data...");
    const container = document.getElementById('ranking-content');
    if (!container) return;

    try {
        const response = await fetch(SHEET_CSV_URL);
        if (!response.ok) throw new Error("Network response was not ok");
        
        const csvText = await response.text();
        const rows = csvText.split(/\r?\n/).map(row => {
            return row.split(',').map(cell => cell.replace(/^"(.*)"$/, '$1').trim());
        });
        
        console.log("Data fetched, rows found:", rows.length);
        
        const rankings = {
            overall: parseColumnGroup(rows, 1, 2),
            high3: parseColumnGroup(rows, 6, 7),
            high2: parseColumnGroup(rows, 10, 11),
            high1: parseColumnGroup(rows, 14, 15)
        };
        
        renderRankingUI(rankings);
    } catch (e) {
        console.error("Failed to fetch ranking data:", e);
        container.innerHTML = `
            <div class="text-center py-10 opacity-60">
                <p class="text-sf-red font-bold mb-2">データの読み込みに失敗しました。</p>
                <button onclick="window.refreshRanking()" class="text-sm bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-full font-bold transition">再試行 🔄</button>
            </div>
        `;
    }
}

function parseColumnGroup(rows, classIdx, scoreIdx) {
    const list = [];
    const rankIdx = classIdx - 1;
    
    // Data usually starts from row 3 (index 2)
    for (let i = 2; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length <= scoreIdx) continue;
        
        let rankStr = (row[rankIdx] || "").trim();
        const className = (row[classIdx] || "").trim();
        const score = (row[scoreIdx] || "").trim();
        
        // If we have a class and a score (that's a number), consider it a valid entry
        if (className && score && !isNaN(score.replace(/,/g, ''))) {
            // Clean up rank string (e.g., "1位" -> 1)
            let rankNum = parseInt(rankStr.replace(/[^0-9]/g, ''));
            // Fallback to list length + 1 if rank is missing or not a number
            if (isNaN(rankNum)) rankNum = list.length + 1;
            
            list.push({ rank: rankNum, class: className, score: score });
            if (list.length >= 6) break;
        }
    }
    return list;
}

function renderRankingUI(rankings) {
    const container = document.getElementById('ranking-content');
    if (!container) return;

    let html = `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 animate-fade-in">
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
            <div class="ranking-row flex items-center justify-between p-3 md:p-3 mb-2 animate-fade-in group border border-slate-100 rounded-xl bg-white shadow-sm">
                <div class="flex items-center gap-3">
                    <span class="rank-badge ${rankClass} text-xs">${item.rank}</span>
                    <span class="font-black text-slate-800 text-sm md:text-sm group-hover:text-sf-blue transition">${item.class}</span>
                </div>
                <div class="flex items-center gap-1">
                    <span class="text-lg md:text-xl font-black text-${colorClass}">${item.score}</span>
                    <span class="text-[9px] font-bold text-slate-400">回</span>
                </div>
            </div>
        `;
    }).join('');

    return `
        <div class="bg-slate-50/50 p-4 md:p-5 rounded-[2rem] border-2 border-slate-100 flex flex-col h-full shadow-inner">
            <h4 class="font-wafuu font-black text-base md:text-lg mb-4 flex items-center gap-3 border-b-2 border-slate-200 pb-3">
                <span class="w-1.5 h-5 bg-${colorClass} rounded-full"></span>
                ${title}
            </h4>
            <div class="flex-grow space-y-1">
                ${rowsHtml || '<p class="text-slate-300 text-xs text-center py-8 italic">集計待ち...</p>'}
            </div>
        </div>
    `;
}

// Initial fetch
window.addEventListener('load', () => {
    setTimeout(fetchRankingData, 800);
});

window.refreshRanking = fetchRankingData;
