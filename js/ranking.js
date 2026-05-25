const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/1PEZiEMmR2nt2ULJ8dJH-jS-icV_Y3CW1_ZChYkLTNCs/export?format=csv&gid=1031884225";

async function fetchRankingData() {
    try {
        const response = await fetch(SHEET_CSV_URL);
        const csvText = await response.text();
        const rows = csvText.split('\n').map(row => row.split(','));
        
        // Parse rankings from specific columns based on screenshot
        // Row 3-14 usually contain ranks 1-6
        // Overall: B,C (index 1,2)
        // High 3: G,H (index 6,7)
        // High 2: K,L (index 10,11)
        // High 1: O,P (index 14,15)
        
        const rankings = {
            overall: parseColumnGroup(rows, 1, 2),
            high3: parseColumnGroup(rows, 6, 7),
            high2: parseColumnGroup(rows, 10, 11),
            high1: parseColumnGroup(rows, 14, 15)
        };
        
        renderRankingUI(rankings);
    } catch (e) {
        console.error("Failed to fetch ranking data:", e);
        const container = document.getElementById('ranking-content');
        if (container) container.innerHTML = '<p class="text-slate-400 text-center py-8">ランキングデータの読み込みに失敗しました。</p>';
    }
}

function parseColumnGroup(rows, classIdx, scoreIdx) {
    const list = [];
    // Data usually starts from row 3 (index 2) in these sheets
    for (let i = 2; i <= 7; i++) {
        if (!rows[i]) continue;
        const className = (rows[i][classIdx] || "").trim();
        const score = (rows[i][scoreIdx] || "").trim();
        if (className && score) {
            list.push({ rank: i - 1, class: className, score: score });
        }
    }
    return list;
}

function renderRankingUI(rankings) {
    const container = document.getElementById('ranking-content');
    if (!container) return;

    let html = `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
            ${renderColumn('高校総合順位', rankings.overall, 'sf-gold')}
            ${renderColumn('高3 順位', rankings.high3, 'sf-blue')}
            ${renderColumn('高2 順位', rankings.high2, 'sf-red')}
            ${renderColumn('高1 順位', rankings.high1, 'slate-600')}
        </div>
    `;
    
    container.innerHTML = html;
}

function renderColumn(title, data, colorClass) {
    const rowsHtml = data.map(item => {
        const rankClass = item.rank <= 3 ? `rank-${item.rank}` : 'rank-other';
        const teamColor = getTeamColor(item.class);
        
        return `
            <div class="ranking-row flex items-center justify-between p-3 mb-2 animate-fade-in">
                <div class="flex items-center gap-3">
                    <span class="rank-badge ${rankClass}">${item.rank}</span>
                    <span class="font-black text-slate-800">${item.class}</span>
                </div>
                <div class="flex items-center gap-2">
                    <span class="text-2xl font-black text-${colorClass}">${item.score}</span>
                    <span class="text-xs font-bold text-slate-400">回</span>
                </div>
            </div>
        `;
    }).join('');

    return `
        <div class="bg-slate-50/50 p-4 rounded-2xl border-2 border-slate-100">
            <h4 class="font-wafuu font-black text-lg mb-4 flex items-center gap-2 border-b-2 border-slate-200 pb-2">
                <span class="w-2 h-6 bg-${colorClass} rounded-full"></span>
                ${title}
            </h4>
            <div class="space-y-1">
                ${rowsHtml || '<p class="text-slate-400 text-sm text-center py-4">データがありません</p>'}
            </div>
        </div>
    `;
}

function getTeamColor(className) {
    // Basic logic to determine team color from class name if possible
    // Example: S3C might be blue, S3E might be red?
    // Let's keep it simple for now or use the spreadsheet colors if we could parse them
    return 'team-white'; 
}

// Initial fetch
document.addEventListener('DOMContentLoaded', () => {
    // Wait for auth to be checked in main.js if needed, 
    // but ranking can be public.
    setTimeout(fetchRankingData, 1000); 
    // Refresh every 5 minutes
    setInterval(fetchRankingData, 5 * 60 * 1000);
});

window.refreshRanking = fetchRankingData;
