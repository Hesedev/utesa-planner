// plannerCore.js
// Algoritmo determinista, greedy y eficiente para generar ruta mínima por ciclo.
// Exporta: runPlanner(materiasArray, aprobadasArray, maxMaterias, maxCreditos, options)
// - materiasArray: array de objetos {codigo, nombre, creditos, prerequisitos[], corequisitos[], cuatrimestre, tipo, reglas}
// - aprobadasArray: array de códigos ya aprobados
// - maxMaterias: límite de materias por ciclo
// - maxCreditos: límite de créditos por ciclo
// - options: { preferEarlierCuatr (default true), debug (default false) }

export function runPlanner(materiasInput, aprobadasArray = [], maxMaterias = 4, maxCreditos = 18, options = {}) {
    const preferEarlierCuatr = options.preferEarlierCuatr ?? true;
    const debug = options.debug ?? false;

    if (!Array.isArray(materiasInput)) return [];

    // 1) Filtrar electivas (no se agendan automáticamente)
    const materiasFiltered = materiasInput.filter(m => (m.tipo ?? "normal") !== "electiva");

    // 2) Normalizar estructura y crear índices
    const materias = materiasFiltered.map((m, i) => ({
        codigo: String(m.codigo ?? "").trim(),
        nombre: String(m.nombre ?? ""),
        creditos: Number.isFinite(Number(m.creditos)) ? Number(m.creditos) : 0,
        prerequisitos: Array.isArray(m.prerequisitos) ? m.prerequisitos.slice() : [],
        corequisitos: Array.isArray(m.corequisitos) ? m.corequisitos.slice() : [],
        cuatrimestre: Number.isFinite(Number(m.cuatrimestre)) ? Number(m.cuatrimestre) : 999,
        reglas: (m.reglas && typeof m.reglas === "object") ? { ...m.reglas } : {}
    }));

    const n = materias.length;
    if (n === 0) return [];

    const codeToIdx = new Map();
    const codigoByIdx = Array(n).fill("");
    const cuatr = Array(n).fill(999);
    for (let i = 0; i < n; i++) {
        const code = materias[i].codigo;
        codeToIdx.set(code, i);
        codigoByIdx[i] = code;
        cuatr[i] = materias[i].cuatrimestre;
    }

    // 3) Precompute prereq mask & coreq adjacency & requires_all_until
    const prereqMask = Array.from({ length: n }, () => 0n);
    const coreqList = Array.from({ length: n }, () => []);
    const requiresAllUntil = Array(n).fill(null);

    for (let i = 0; i < n; i++) {
        const m = materias[i];
        for (const pre of m.prerequisitos || []) {
            const idx = codeToIdx.get(pre);
            if (idx === undefined) {
                if (debug) console.warn(`Prerequisito desconocido "${pre}" para ${m.codigo}`);
                continue;
            }
            prereqMask[i] |= (1n << BigInt(idx));
        }
        for (const co of m.corequisitos || []) {
            const idx = codeToIdx.get(co);
            if (idx === undefined) {
                if (debug) console.warn(`Corequisito desconocido "${co}" para ${m.codigo}`);
                continue;
            }
            coreqList[i].push(idx);
        }
        if (m.reglas?.requires_all_until != null) {
            const v = Number(m.reglas.requires_all_until);
            if (Number.isFinite(v)) requiresAllUntil[i] = v;
        }
    }

    // helpers
    function bitCount(x) { let v = BigInt(x); let c = 0; while (v) { c += Number(v & 1n); v >>= 1n; } return c; }
    function maskToCodes(mask) {
        const out = [];
        for (let i = 0; i < n; i++) if (((mask >> BigInt(i)) & 1n) === 1n) out.push(codigoByIdx[i]);
        return out;
    }

    // Build coreq closure for a seed index given currentlyTakenMask.
    // Returns setMask (BigInt) including seed and all reachable coreqs that are not already taken,
    // or null if closure invalid (some course in closure has prereqs or requires_all_until not satisfied by currentTakenMask).
    function buildCoreqClosure(seedIdx, currentTakenMask) {
        const stack = [seedIdx];
        let closure = 0n;
        const visited = new Set();

        while (stack.length) {
            const u = stack.pop();
            if (visited.has(u)) continue;
            visited.add(u);
            if (((currentTakenMask >> BigInt(u)) & 1n) === 0n) closure |= (1n << BigInt(u));
            for (const coIdx of coreqList[u] || []) {
                if (!visited.has(coIdx)) stack.push(coIdx);
            }
        }

        // validate closure: prereqs and requires_all_until must be satisfied by currentTakenMask (NOT by closure)
        for (let u = 0; u < n; u++) {
            if (((closure >> BigInt(u)) & 1n) === 1n) {
                if ((prereqMask[u] & ~currentTakenMask) !== 0n) return null;
                const lim = requiresAllUntil[u];
                if (lim != null) {
                    // every subject with cuatrimestre <= lim must already be in currentTakenMask
                    for (let v = 0; v < n; v++) {
                        if (cuatr[v] <= lim && (((currentTakenMask >> BigInt(v)) & 1n) === 0n)) return null;
                    }
                }
            }
        }
        return closure;
    }

    // Compute eligible seeds (courses) given currentTakenMask
    function computeEligibleSeeds(currentTakenMask) {
        const seeds = [];
        for (let i = 0; i < n; i++) {
            if (((currentTakenMask >> BigInt(i)) & 1n) === 1n) continue; // already taken
            // prereqs must be subset of currentTakenMask (cannot be satisfied same cycle)
            if ((prereqMask[i] & ~currentTakenMask) !== 0n) continue;
            // requires_all_until
            const lim = requiresAllUntil[i];
            if (lim != null) {
                let ok = true;
                for (let v = 0; v < n; v++) {
                    if (cuatr[v] <= lim && (((currentTakenMask >> BigInt(v)) & 1n) === 0n)) { ok = false; break; }
                }
                if (!ok) continue;
            }
            seeds.push(i);
        }
        return seeds;
    }

    // compute a simple "unlock score": how many courses have this as prereq (helps prioritization)
    const unlockCount = Array(n).fill(0);
    for (let i = 0; i < n; i++) {
        const preMask = prereqMask[i];
        for (let j = 0; j < n; j++) {
            if (((preMask >> BigInt(j)) & 1n) === 1n) unlockCount[j] += 1;
        }
    }

    // main iterative greedy loop
    let takenMask = 0n;
    for (const code of (aprobadasArray || [])) {
        const idx = codeToIdx.get(code);
        if (idx !== undefined) takenMask |= (1n << BigInt(idx));
    }

    const allMask = (1n << BigInt(n)) - 1n;
    if ((takenMask & allMask) === allMask) return []; // ya completado

    const plan = [];
    const visitedStates = new Set(); // to detect stagnation, store takenMask string

    while (true) {
        if (((takenMask) & allMask) === allMask) break; // terminado

        const stateKey = takenMask.toString();
        if (visitedStates.has(stateKey)) {
            // no progreso posible (loop), break
            if (debug) console.warn("Planner: estado ya visto, rompiendo bucle para evitar loop.");
            break;
        }
        visitedStates.add(stateKey);

        // 1) obtener seeds elegibles (candidatos base)
        const seeds = computeEligibleSeeds(takenMask);
        if (!seeds || seeds.length === 0) {
            if (debug) console.warn("Planner: no hay cursos elegibles desde el estado actual. Salida parcial.");
            break;
        }

        // 2) para cada seed, construir closure y guardarlo si válido
        const closures = [];
        for (const s of seeds) {
            const clo = buildCoreqClosure(s, takenMask);
            if (clo == null) continue;
            // compute closure size & credits
            let size = 0, creds = 0;
            for (let j = 0; j < n; j++) {
                if (((clo >> BigInt(j)) & 1n) === 1n) { size++; creds += materias[j].creditos; }
            }
            if (size === 0) continue; // nothing to take
            if (creds > maxCreditos) continue; // impossible closure for a single cycle
            closures.push({ seed: s, mask: clo, size, creds, minCuatr: minCuatrOfMask(clo), unlock: computeUnlockPotential(clo) });
        }

        if (closures.length === 0) {
            if (debug) console.warn("Planner: no closures válidas (coreqs/prereqs/limits). Salida parcial.");
            break;
        }

        // 3) ordenar closures por prioridad:
        // preferEarlierCuatr -> menor minCuatr first
        // then larger size (fill cycle)
        // then larger unlock potential
        closures.sort((a, b) => {
            if (preferEarlierCuatr) {
                if (a.minCuatr !== b.minCuatr) return a.minCuatr - b.minCuatr;
            }
            if (b.size !== a.size) return b.size - a.size;
            if (b.unlock !== a.unlock) return b.unlock - a.unlock;
            return a.creds - b.creds; // prefer less credits if tie
        });

        // 4) greedy pack closures into this cycle without overlap until limits reached
        let cycleMask = 0n;
        let cycleCount = 0;
        let cycleCreds = 0;
        for (const c of closures) {
            // skip if overlaps with already taken or with cycleMask
            if ((c.mask & takenMask) !== 0n) {
                // some elements already taken (shouldn't happen because buildCoreqClosure excluded taken ones),
                // but skip overlapping elements anyway
                continue;
            }
            if ((c.mask & cycleMask) !== 0n) continue;
            if (cycleCount + c.size > maxMaterias) continue;
            if (cycleCreds + c.creds > maxCreditos) continue;
            // accept closure
            cycleMask |= c.mask;
            cycleCount += c.size;
            cycleCreds += c.creds;
            // optimization: if cycle full, break
            if (cycleCount === maxMaterias || cycleCreds === maxCreditos) break;
        }

        if (cycleMask === 0n) {
            // Nothing could be scheduled this cycle due to limits (e.g., closures too big to fit).
            // Strategy: attempt to schedule the *single* smallest closure that fits partially (split not allowed),
            // or relax ordering by trying closures sorted by size ascending.
            const sortedBySmall = closures.slice().sort((a, b) => a.size - b.size || a.creds - b.creds);
            let singleMask = 0n, singleSize = 0, singleCred = 0;
            for (const c of sortedBySmall) {
                if (c.size <= maxMaterias && c.creds <= maxCreditos) { singleMask = c.mask; singleSize = c.size; singleCred = c.creds; break; }
            }
            if (singleMask === 0n) {
                if (debug) console.warn("Planner: no closure cabe en un ciclo por límites de maxMaterias/maxCreditos. Salida parcial.");
                break;
            }
            cycleMask = singleMask;
            cycleCount = singleSize;
            cycleCreds = singleCred;
        }

        // 5) commit cycle: mark as taken and push codes to plan
        const codes = maskToCodes(cycleMask);
        plan.push(codes);

        takenMask |= cycleMask;

        // progress guard: if after committing no new bits set, break to avoid infinite loop (defensive)
        if (maskEquals(takenMask & allMask, takenMask & allMask) && plan.length > n * 2) {
            // defensive break (shouldn't happen)
            if (debug) console.warn("Planner: demasiados ciclos sin progreso estable detectados. Rompiendo.");
            break;
        }
    } // end while

    // final check: if we progressed at all return plan, otherwise return []
    if (plan.length === 0) {
        if (debug) console.warn("runPlanner: no se generó ningún ciclo (posible falta de prerrequisitos o restricciones muy estrictas).");
        return [];
    }

    return plan;

    // ---------- helpers locales ----------
    function minCuatrOfMask(mask) {
        let minC = Infinity;
        for (let i = 0; i < n; i++) if (((mask >> BigInt(i)) & 1n) === 1n) minC = Math.min(minC, cuatr[i]);
        return minC === Infinity ? 999 : minC;
    }
    function computeUnlockPotential(mask) {
        // sum of unlockCount of elements in mask
        let s = 0;
        for (let i = 0; i < n; i++) if (((mask >> BigInt(i)) & 1n) === 1n) s += (unlockCount[i] || 0);
        return s;
    }
    function maskEquals(a, b) { return a.toString() === b.toString(); }
}
