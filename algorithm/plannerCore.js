// plannerCore.js
// Algoritmo A* para generar la ruta mínima de materias por ciclo.
// Exporta: runPlanner(materiasArray, aprobadasArray, maxMaterias, maxCreditos, options)
// - materiasArray: array de objetos {codigo, nombre, creditos, prerequisitos[], corequisitos[], cuatrimestre, tipo, reglas}
// - aprobadasArray: array de códigos ya aprobados
// - maxMaterias: límite de materias por ciclo
// - maxCreditos: límite de créditos por ciclo
// - options: { maxCombosLimit, expansionCap, preferEarlierCuatr } (opcionales)

export function runPlanner(materiasInput, aprobadasArray = [], maxMaterias = 4, maxCreditos = 18, options = {}) {
    const maxCombosLimit = options.maxCombosLimit ?? 4000;
    const expansionCap = options.expansionCap ?? 400000;
    const preferEarlierCuatr = options.preferEarlierCuatr ?? true;

    // 1) Filtrar electivas (no se toman automáticamente)
    const materiasFiltered = materiasInput.filter(m => (m.tipo ?? "obligatoria") !== "electiva");

    // 2) Normalizar y crear índices
    const materias = materiasFiltered.map(m => ({
        codigo: (m.codigo ?? "").toString(),
        nombre: (m.nombre ?? "").toString(),
        creditos: Number(m.creditos ?? 0),
        prerequisitos: Array.isArray(m.prerequisitos) ? m.prerequisitos.slice() : [],
        corequisitos: Array.isArray(m.corequisitos) ? m.corequisitos.slice() : [],
        cuatrimestre: Number(m.cuatrimestre ?? 999),
        reglas: m.reglas ? { ...m.reglas } : {}
    }));

    const n = materias.length;
    if (n === 0) return [];

    const codeToIdx = new Map();
    materias.forEach((m, i) => {
        if (!m.codigo) console.warn("Materia sin código detectada en input, índice:", i);
        codeToIdx.set(m.codigo, i);
    });

    // 3) Construir prereq mask y coreq lists y requiresAllUntil
    const prereqMask = Array(n).fill(0n);
    const coreqList = Array.from({ length: n }, () => []);
    const requiresAllUntil = Array(n).fill(null);
    const cuatr = materias.map(m => m.cuatrimestre);
    const codigoByIdx = materias.map(m => m.codigo);

    for (let i = 0; i < n; i++) {
        const m = materias[i];
        for (let pre of m.prerequisitos) {
            const idx = codeToIdx.get(pre);
            if (idx === undefined) {
                console.warn(`Prerequisito desconocido "${pre}" referenciado por ${m.codigo}. Ignorando esa referencia.`);
                continue;
            }
            prereqMask[i] |= (1n << BigInt(idx));
        }
        for (let co of m.corequisitos) {
            const idx = codeToIdx.get(co);
            if (idx === undefined) {
                console.warn(`Corequisito desconocido "${co}" referenciado por ${m.codigo}. Ignorando esa referencia.`);
                continue;
            }
            coreqList[i].push(idx);
        }
        if (m.reglas?.requires_all_until != null) requiresAllUntil[i] = Number(m.reglas.requires_all_until);
    }

    const allMask = (1n << BigInt(n)) - 1n;

    // bit utilities
    function bitCount(x) {
        let c = 0;
        while (x) { c += Number(x & 1n); x >>= 1n; }
        return c;
    }
    function maskToCodes(mask) {
        const out = [];
        for (let i = 0; i < n; i++) {
            if (((mask >> BigInt(i)) & 1n) === 1n) out.push(codigoByIdx[i]);
        }
        return out;
    }

    // coreq closure builder: returns mask of closure (excluding already taken),
    // or null if invalid (some prereqs or requires_all_until violated)
    function buildCoreqClosure(seedIdx, currentTakenMask) {
        const stack = [seedIdx];
        let closure = 0n;
        const visited = new Set();

        while (stack.length) {
            const u = stack.pop();
            if (visited.has(u)) continue;
            visited.add(u);
            // if already taken, don't include it in closure (it's satisfied)
            if (((currentTakenMask >> BigInt(u)) & 1n) === 0n) {
                closure |= (1n << BigInt(u));
            }
            for (const co of coreqList[u]) {
                if (!visited.has(co)) stack.push(co);
            }
        }

        // validate that for every course in closure, its prereqs are subset of currentTakenMask
        for (let u = 0; u < n; u++) {
            if (((closure >> BigInt(u)) & 1n) === 1n) {
                // prereqs must be already in currentTakenMask (cannot be satisfied by coreqs)
                if ((prereqMask[u] & ~currentTakenMask) !== 0n) return null;
                // requires_all_until must be satisfied already (cannot be satisfied by coreqs)
                const lim = requiresAllUntil[u];
                if (lim != null) {
                    for (let v = 0; v < n; v++) {
                        if (cuatr[v] <= lim && (((currentTakenMask >> BigInt(v)) & 1n) === 0n)) return null;
                    }
                }
            }
        }

        return closure;
    }

    // longest prereq chain remaining (lower bound)
    function longestChainRemaining(currentTakenMask) {
        const memo = Array(n).fill(-1);
        function dfs(u) {
            if (((currentTakenMask >> BigInt(u)) & 1n) === 1n) return 0;
            if (memo[u] !== -1) return memo[u];

            let preMask = prereqMask[u] & ~currentTakenMask;
            if (preMask === 0n) { memo[u] = 1; return 1; }

            let best = 0;
            for (let v = 0; v < n; v++) {
                if (((preMask >> BigInt(v)) & 1n) === 1n) {
                    const d = dfs(v);
                    if (d > best) best = d;
                }
            }
            memo[u] = best + 1;
            return memo[u];
        }

        let globalMax = 0;
        for (let u = 0; u < n; u++) {
            if (((currentTakenMask >> BigInt(u)) & 1n) === 0n) {
                const d = dfs(u);
                if (d > globalMax) globalMax = d;
            }
        }
        return globalMax;
    }

    // compute eligible groups (closures) for given taken mask and respecting maxCreditos
    function computeEligibleGroups(currentTakenMask, maxCreditosPerGroup) {
        const groups = [];
        for (let i = 0; i < n; i++) {
            if (((currentTakenMask >> BigInt(i)) & 1n) === 1n) continue; // already taken
            // prereqs must be subset of currentTakenMask (cannot satisfy prereqs in same cycle)
            if ((prereqMask[i] & ~currentTakenMask) !== 0n) continue;

            // requires_all_until for this course must already be satisfied
            const lim = requiresAllUntil[i];
            if (lim != null) {
                let ok = true;
                for (let v = 0; v < n; v++) {
                    if (cuatr[v] <= lim && (((currentTakenMask >> BigInt(v)) & 1n) === 0n)) { ok = false; break; }
                }
                if (!ok) continue;
            }

            const closure = buildCoreqClosure(i, currentTakenMask);
            if (closure == null) continue;

            // compute credit sum of closure
            let creditSum = 0;
            for (let j = 0; j < n; j++) {
                if (((closure >> BigInt(j)) & 1n) === 1n) creditSum += materias[j].creditos;
            }
            if (creditSum > maxCreditosPerGroup) continue;

            const size = bitCount(closure);
            const priority = preferEarlierCuatr ? computeGroupPriority(closure) : size;
            groups.push({ mask: closure, size, creditos: creditSum, priority });
        }

        groups.sort((a, b) => a.priority - b.priority || a.size - b.size);
        return groups;
    }

    function computeGroupPriority(mask) {
        let minC = Infinity;
        for (let i = 0; i < n; i++) if (((mask >> BigInt(i)) & 1n) === 1n) minC = Math.min(minC, cuatr[i]);
        return minC === Infinity ? 999 : minC;
    }

    // generate non-overlapping combos of groups (bounded by maxMaterias and maxCreditos)
    function generateGroupCombos(groups, maxSize, maxCred) {
        const combos = [];
        const G = groups.length;
        let totalCount = 0;

        function backtrack(idx, currentMask, currentSize, currentCred) {
            // pruning
            if (currentSize > maxSize) return;
            if (currentCred > maxCred) return;

            if (currentMask !== 0n) {
                combos.push({ mask: currentMask, size: currentSize, creditos: currentCred });
                totalCount++;
                if (totalCount > maxCombosLimit) return;
            }

            for (let j = idx; j < G; j++) {
                const g = groups[j];
                if ((currentMask & g.mask) !== 0n) continue; // overlap
                if (currentSize + g.size > maxSize) continue;
                if (currentCred + g.creditos > maxCred) continue;
                backtrack(j + 1, currentMask | g.mask, currentSize + g.size, currentCred + g.creditos);
                if (totalCount > maxCombosLimit) return;
            }
        }

        backtrack(0, 0n, 0, 0);
        // sort by fullness (prefer fuller cycles)
        combos.sort((a, b) => b.size - a.size || a.creditos - b.creditos);
        return combos.map(c => c.mask);
    }

    // heuristic: admissible lower bound
    function heuristicLowerBound(currentTakenMask, maxByMat) {
        const remaining = n - bitCount(currentTakenMask);
        if (remaining <= 0) return 0;
        const capBound = Math.ceil(remaining / maxByMat);
        const chain = longestChainRemaining(currentTakenMask);
        return Math.max(capBound, chain);
    }

    // Min priority queue (binary heap)
    class MinPQ {
        constructor() { this.heap = []; }
        push(item, priority) { this.heap.push({ item, priority }); this._siftUp(this.heap.length - 1); }
        pop() {
            if (this.heap.length === 0) return null;
            const it = this.heap[0].item;
            const last = this.heap.pop();
            if (this.heap.length > 0) { this.heap[0] = last; this._siftDown(0); }
            return it;
        }
        isEmpty() { return this.heap.length === 0; }
        _siftUp(i) {
            while (i > 0) {
                const p = Math.floor((i - 1) / 2);
                if (this.heap[p].priority <= this.heap[i].priority) break;
                [this.heap[p], this.heap[i]] = [this.heap[i], this.heap[p]];
                i = p;
            }
        }
        _siftDown(i) {
            const n = this.heap.length;
            while (true) {
                let l = 2 * i + 1, r = 2 * i + 2, smallest = i;
                if (l < n && this.heap[l].priority < this.heap[smallest].priority) smallest = l;
                if (r < n && this.heap[r].priority < this.heap[smallest].priority) smallest = r;
                if (smallest === i) break;
                [this.heap[i], this.heap[smallest]] = [this.heap[smallest], this.heap[i]];
                i = smallest;
            }
        }
    }

    // A* search
    const startMask = (function () {
        let m = 0n;
        for (const code of aprobadasArray) {
            const idx = codeToIdx.get(code);
            if (idx !== undefined) m |= (1n << BigInt(idx));
        }
        return m;
    })();

    if ((startMask & allMask) === allMask) return []; // already finished

    const pq = new MinPQ();
    const startNode = { takenMask: startMask, g: 0, parent: null, action: 0n, f: heuristicLowerBound(startMask, maxMaterias) };
    pq.push(startNode, startNode.f);

    const visitedBest = new Map(); // key(mask) -> best g
    const parentInfo = new Map();  // key(mask) -> { parentKey, actionMask }

    function keyOf(mask) { return mask.toString(); }
    visitedBest.set(keyOf(startMask), 0);
    parentInfo.set(keyOf(startMask), { parent: null, action: 0n });

    let expansions = 0;
    let goalNode = null;

    while (!pq.isEmpty()) {
        const node = pq.pop();
        expansions++;
        const { takenMask, g } = node;

        // goal?
        if ((takenMask & allMask) === allMask) { goalNode = node; break; }

        // generate groups and combos
        const groups = computeEligibleGroups(takenMask, maxCreditos);
        if (groups.length === 0) continue;

        const combos = generateGroupCombos(groups, maxMaterias, maxCreditos);
        if (!combos || combos.length === 0) continue;

        for (const comboMask of combos) {
            const newTaken = takenMask | comboMask;
            const newKey = keyOf(newTaken);
            const newG = g + 1;
            const prev = visitedBest.get(newKey);
            if (prev !== undefined && prev <= newG) continue;
            visitedBest.set(newKey, newG);
            parentInfo.set(newKey, { parent: keyOf(takenMask), action: comboMask });
            const newNode = { takenMask: newTaken, g: newG, parent: keyOf(takenMask), action: comboMask, f: newG + heuristicLowerBound(newTaken, maxMaterias) };
            pq.push(newNode, newNode.f);
        }

        if (expansions > expansionCap) {
            console.warn("A* expansion cap reached; returning best-effort partial plan.");
            break;
        }
    }

    // reconstruct plan
    function reconstructFrom(maskKey) {
        const actionsRev = [];
        let cur = maskKey;
        while (true) {
            const info = parentInfo.get(cur);
            if (!info || !info.parent) break;
            actionsRev.push(info.action);
            cur = info.parent;
        }
        actionsRev.reverse();
        return actionsRev.map(maskToCodes);
    }

    if (goalNode) {
        return reconstructFrom(keyOf(goalNode.takenMask));
    } else {
        // fallback: choose visited state with most courses taken
        let bestMask = startMask;
        let bestCount = bitCount(startMask);
        for (const k of visitedBest.keys()) {
            const m = BigInt(k);
            const c = bitCount(m);
            if (c > bestCount) { bestCount = c; bestMask = m; }
        }
        if (bestCount === bitCount(startMask)) {
            // nothing progressed
            return [];
        }
        return reconstructFrom(keyOf(bestMask));
    }
}
