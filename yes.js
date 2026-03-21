document.addEventListener("DOMContentLoaded", () => {
    const canvas = document.getElementById("game");
    const ctx = canvas.getContext("2d");
    const upgradeContainer = document.getElementById("upgradeContainer");
    const levelUpOverlay = document.getElementById("levelUpOverlay");
    const pauseOverlay = document.getElementById("pauseOverlay");
    const inventoryList = document.getElementById("inventoryList");
    const resumeBtn = document.getElementById("resumeBtn");
    const deathOverlay = document.getElementById("deathOverlay");
    const overlay = document.getElementById("overlay");
    const startBtn = document.getElementById("startBtn");
    const bossUI = document.getElementById("bossUI");
    const bossBarFill = document.getElementById("bossBarFill");
    const cdHUD = document.getElementById("cooldownHUD");

    const keys = {};
    const mouse = { x: 0, y: 0, down: false };
    let inputBuffer = "", wave = 1, running = false, isPaused = false;
    let slowActive = false, slowTimer = 0, isLaser = false, lastShot = 0;
    let lastHitPos = { x: 0, y: 0 }, manualMarker = null;
    let enemies = [], bullets = [], expOrbs = [], particles = [], shocks = [], boomerangs = [], enemyBullets = [];
    let molotovs = []; 
    let godMode = false;

    const playerInventory = {};

    const player = {
        x: window.innerWidth / 2, y: window.innerHeight / 2, r: 15,
        speed: 6.4, maxHp: 100, hp: 100, level: 1, exp: 0, nextExp: 50,
        pierce: 0, critChance: 0.1, bulletDamage: 10, fireRate: 400,
        vampireMode: false, dashAbility: false, dashCD: 0, dashMaxCD: 3000,
        novaAbility: false, novaCD: 0, novaMaxCD: 5000,
        chronoAbility: false, chronoCD: 0, chronoMaxCD: 60000,
        hasGuardian: false, guardianAngle: 0, 
        hasDrone: false, droneX: 0, droneY: 0, droneLastShot: 0,
        hasBombDrone: false, bombDroneX: 0, bombDroneY: 0, bombDroneLastShot: 0,
        hasQuickDrone: false, quickDroneX: 0, quickDroneY: 0, quickDroneLastShot: 0,
        hasTeslaDrone: false, teslaDroneX: 0, teslaDroneY: 0, teslaDroneLastShot: 0,
        hasAllInOne: false, allInOneX: 0, allInOneY: 0, allInOneLastShot: 0,
        hasBoomerang: false, boomerangOrbit: false, lastBoomerang: 0,
        hasVerticalLaser: false, 
        verticalLaserTimer: 5000,
        verticalLaserPhase: 'recharging',
        verticalLaserHitSet: new Set(),
        hasMolotov: false,
        hasNapalmSpread: false, // New Boolean
        lastMolotov: 0,
    };

    const rarityWeights = { common: 100, rare: 30, epic: 15, legendary: 5, mythic: 1 };

    const upgrades = [
        { t: "Glaive Orbit", d: "Boomerangs orbit you", f: () => { player.boomerangOrbit = true; }, rarity: 'mythic', unique: true },
        { t: "All-In-One", d: "Consumes all drones. Chaining explosions & +5% Damage.", f: () => { 
            player.hasAllInOne = true;
            player.hasDrone = player.hasBombDrone = player.hasQuickDrone = player.hasTeslaDrone = false;
            player.bulletDamage *= 1.05; 
            player.allInOneX = player.x; player.allInOneY = player.y;
        }, rarity: 'mythic', unique: true },
        { t: "Pulse Nova", d: "Q: Mark | 2: Detonate (HP % DMG)", f: () => { player.novaAbility = true; }, rarity: 'epic', unique: true },
        { t: "Dual Guardians", d: "Rotating spheres", f: () => { player.hasGuardian = true; }, rarity: 'epic', unique: true },
        { t: "Tactical Drone", d: "Piercing auto-drone (Scales with Level)", f: () => { player.hasDrone = true; player.droneX = player.x; player.droneY = player.y; }, rarity: 'rare', unique: true },
        { t: "Bomb Drone", d: "AOE drone (Scales with Max HP)", f: () => { player.hasBombDrone = true; player.bombDroneX = player.x; player.bombDroneY = player.y; }, rarity: 'epic', unique: true },
        { t: "Quickfire Drone", d: "Rapid fire (Scales with Missing HP)", f: () => { player.hasQuickDrone = true; player.quickDroneX = player.x; player.quickDroneY = player.y; }, rarity: 'epic', unique: true },
        { t: "Tesla Drone", d: "Legendary chain (2% Max HP DMG)", f: () => { player.hasTeslaDrone = true; player.teslaDroneX = player.x; player.teslaDroneY = player.y; }, rarity: 'legendary', unique: true },
        { t: "Chrono-Stasis", d: "1: Slow time", f: () => { player.chronoAbility = true; }, rarity: 'legendary', unique: true },
        { t: "True Vampirism", d: "Heal 2HP on hit", f: () => { player.vampireMode = true; }, rarity: 'legendary', unique: true },
        { t: "Phase Dash", d: "SPACE: Dash", f: () => { player.dashAbility = true; }, rarity: 'epic', unique: true },
        { t: "Boomerang", d: "Fires returning blades", f: () => { player.hasBoomerang = true; }, rarity: 'rare', unique: true },
        { t: "Railgun Barrel", d: "+1 Pierce", f: () => { player.pierce++; }, rarity: 'rare', unique: false },
        { t: "Laser Sight", d: "Red lasers, +1 Pierce", f: () => { isLaser = true; player.pierce++; }, rarity: 'rare', unique: true },
        { t: "Heavy Rounds", d: "+2 Damage", f: () => { player.bulletDamage += 2; }, rarity: 'common', unique: false },
        { t: "Rapid Fire", d: "-15% Reload", f: () => { player.fireRate *= 0.85; }, rarity: 'common', unique: false },
        { t: "Overdrive Legs", d: "+15% Speed", f: () => { player.speed *= 1.15; }, rarity: 'common', unique: false },
        { t: "Vitality", d: "+20 Max HP", f: () => { player.maxHp += 20; player.hp += 20; }, rarity: 'common', unique: false },
        { t: "Molotov", d: "Fire 2 puddles (7.5s CD). Deals DOT.", f: () => { player.hasMolotov = true; player.lastMolotov = -7500; }, rarity: 'rare', unique: true },
        { t: "Napalm Spread", d: "Fires 2 extra Molotovs to the sides.", f: () => { player.hasNapalmSpread = true; }, rarity: 'epic', unique: true },
        { t: "Vertical Laser", d: "Sweep beam (HP % DMG)", f: () => { player.hasVerticalLaser = true; }, rarity: 'epic', unique: true }
    ];

    function dealPercentDamage(enemy, minPct, maxPct, bossMin, bossMax) {
        const isBoss = !!enemy.isBoss;
        const low = isBoss ? bossMin : minPct;
        const high = isBoss ? bossMax : maxPct;
        const percent = low + Math.random() * (high - low);
        enemy.hp -= enemy.maxHp * percent;
        enemy.flash = isBoss ? 5 : 15;
    }

    function togglePause() {
        if (!running) return;
        isPaused = !isPaused;
        if (isPaused) { renderInventory(); pauseOverlay.classList.remove("hidden"); }
        else { pauseOverlay.classList.add("hidden"); }
    }

    function renderInventory() {
        inventoryList.innerHTML = "";
        const items = Object.entries(playerInventory);
        if (items.length === 0) { inventoryList.innerHTML = "<div style='color:#555'>No upgrades installed.</div>"; return; }
        items.forEach(([name, count]) => {
            const row = document.createElement("div"); row.className = "inventory-item";
            row.innerHTML = `<span>${name.toUpperCase()}</span> <span>x${count}</span>`;
            inventoryList.appendChild(row);
        });
    }

    window.addEventListener("keydown", (e) => { 
        if (e.key === "Escape") { togglePause(); return; }
        let keyName = e.key.toLowerCase();
        // Handle arrow keys - store them without the "arrow" prefix for easier checking
        if (e.key.startsWith("Arrow")) keyName = "arrow" + e.key.substring(5).toLowerCase();
        keys[keyName] = true; 
        inputBuffer += keyName;
        if (inputBuffer.slice(-6) === "tyuiop") { document.getElementById("devMenu").style.display = "block"; populateCheatMenu(); inputBuffer = ""; }
        if (keyName === "q") { manualMarker = { x: mouse.x, y: mouse.y }; spawnSpark(mouse.x, mouse.y, "#ff00ff"); }
    });
    window.addEventListener("keyup", (e) => { 
        let keyName = e.key.toLowerCase();
        if (e.key.startsWith("Arrow")) keyName = "arrow" + e.key.substring(5).toLowerCase();
        keys[keyName] = false; 
    });
    window.addEventListener("mousemove", (e) => { mouse.x = e.clientX; mouse.y = e.clientY; });
    window.addEventListener("mousedown", () => { mouse.down = true; });
    window.addEventListener("mouseup", () => { mouse.down = false; });
    resumeBtn.onclick = () => togglePause();

    function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
    window.addEventListener("resize", resize); resize();

    function spawnShock(x, y, maxR, color) { shocks.push({ x, y, r: 0, maxR, life: 1.0, color }); }
    function spawnSpark(x, y, color = "#fff") { for(let i=0; i<10; i++) particles.push({ x, y, vx: (Math.random()-0.5)*10, vy: (Math.random()-0.5)*10, life: 1.0, color }); }

    function useDash() {
        const a = Math.atan2(mouse.y - player.y, mouse.x - player.x);
        player.x += Math.cos(a) * 150; player.y += Math.sin(a) * 150;
        spawnSpark(player.x, player.y, "cyan");
    }

    function useNova() {
        const target = manualMarker || lastHitPos;
        if (target.x === 0 && target.y === 0) return;
        enemies.forEach(e => {
            if (Math.hypot(e.x - target.x, e.y - target.y) < 250) { 
                dealPercentDamage(e, 0.30, 0.50, 0.01, 0.03);
                spawnShock(e.x, e.y, 40, "white"); 
            }
        });
        spawnShock(target.x, target.y, 250, "#ff00ff"); manualMarker = null;
    }

    function spawnWave() {
        // Boss spawning: wave 25, 75, 125, 175, then every 50 waves after that
        const isBossWave = (wave >= 25 && (wave - 25) % 50 === 0);
        
        if (isBossWave) {
            enemies.push({ 
                x: canvas.width/2, y: -100, r: 50, hp: 800 + (wave * 100), maxHp: 800 + (wave * 100), 
                speed: 1.28, isBoss: true, flash: 0, lastDash: performance.now(), dashing: false, dashTimer: 0,
                burnTimer: 0, lastBurnTick: 0, burnCooldown: 0
            });
            bossUI.style.display = "block";
        } else {
            bossUI.style.display = "none";
            const count = 6 + (wave * 2);
            for (let i = 0; i < count; i++) {
                let hp, speed, r, color, x, y;
                let roll = Math.random();
                if (wave >= 5 && roll < 0.15) { hp = 30 + wave * 15; speed = 1.2; r = 25; color = "#4a0000"; } 
                else if (wave >= 10 && roll > 0.85) { hp = 5 + wave * 3; speed = 3.5 + (Math.random() * 1); r = 10; color = "cyan"; } 
                else { hp = 10 + wave * 7; speed = 1.92 + (Math.random() * 0.64); r = 15; color = "red"; }
                
                // Spawn from all sides
                const side = Math.floor(Math.random() * 4);
                if (side === 0) { // Top
                    x = Math.random() * canvas.width;
                    y = -50 - (Math.random() * 100);
                } else if (side === 1) { // Bottom
                    x = Math.random() * canvas.width;
                    y = canvas.height + 50 + (Math.random() * 100);
                } else if (side === 2) { // Left
                    x = -50 - (Math.random() * 100);
                    y = Math.random() * canvas.height;
                } else { // Right
                    x = canvas.width + 50 + (Math.random() * 100);
                    y = Math.random() * canvas.height;
                }
                
                enemies.push({ x, y, r: r, hp: hp, maxHp: hp, speed: speed, flash: 0, color: color, burnTimer: 0, lastBurnTick: 0, burnCooldown: 0 });
            }
        }
    }

    let lastHp = player.maxHp;
    
    function updateHUD() {
        // Update stats text
        document.getElementById("stats").innerText = `WAVE: ${wave} | LVL: ${player.level}`;
        
        // Update HP bar
        const hpPct = (player.hp / player.maxHp) * 100;
        document.getElementById("hpFill").style.width = hpPct + "%";
        
        // Flash effect when taking damage
        if (player.hp < lastHp) {
            const hudEl = document.getElementById("hud");
            hudEl.classList.remove("damaged");
            void hudEl.offsetWidth; // Trigger reflow to restart animation
            hudEl.classList.add("damaged");
        }
        lastHp = player.hp;
        
        // Update EXP bar
        const expPct = (player.exp / player.nextExp) * 100;
        document.getElementById("expFill").style.width = expPct + "%";
        
        // Update cooldown HUD
        let html = "";
        if (player.dashAbility) {
            let pct = (player.dashCD / player.dashMaxCD) * 100;
            let statusText = player.dashCD > 0 ? "RECHARGING..." : "SYSTEM READY";
            html += `<div class="cd-item" style="border-color: cyan"><div style="font-size: 11px; color: #aaa;">DASH [SPACE]</div><div style="font-size: 13px; font-weight: bold; margin: 2px 0;">${statusText}</div><div class="cd-bar-bg"><div class="cd-bar-fill" style="width:${pct}%"></div></div></div>`;
        }
        if (player.novaAbility) {
            let pct = (player.novaCD / player.novaMaxCD) * 100;
            let statusText = player.novaCD > 0 ? "RELOADING BOLT" : "CORE CHARGED";
            html += `<div class="cd-item" style="border-color: #ff00ff"><div style="font-size: 11px; color: #aaa;">PULSE NOVA [2]</div><div style="font-size: 13px; font-weight: bold; margin: 2px 0;">${statusText}</div><div class="cd-bar-bg"><div class="cd-bar-fill" style="width:${pct}%"></div></div></div>`;
        }
        if (player.chronoAbility) {
            let pct = (player.chronoCD / player.chronoMaxCD) * 100;
            let statusText = player.chronoCD > 0 ? "STABILIZING TIME" : "STASIS AVAILABLE";
            html += `<div class="cd-item" style="border-color: #ffaa00"><div style="font-size: 11px; color: #aaa;">CHRONO DRIVE [1]</div><div style="font-size: 13px; font-weight: bold; margin: 2px 0;">${statusText}</div><div class="cd-bar-bg"><div class="cd-bar-fill" style="width:${pct}%"></div></div></div>`;
        }
        cdHUD.innerHTML = html;
    }

    function update(t) {
        if (godMode) player.hp = player.maxHp;
        let vx = 0, vy = 0;
        if (keys["w"] || keys["arrowup"]) vy -= 1; if (keys["s"] || keys["arrowdown"]) vy += 1; if (keys["a"] || keys["arrowleft"]) vx -= 1; if (keys["d"] || keys["arrowright"]) vx += 1;
        if (vx !== 0 || vy !== 0) { const length = Math.sqrt(vx * vx + vy * vy); player.x += (vx / length) * player.speed; player.y += (vy / length) * player.speed; }
        if (keys[" "] && player.dashAbility && player.dashCD <= 0) { useDash(); player.dashCD = player.dashMaxCD; }
        if (player.dashCD > 0) player.dashCD -= 16.6;
        if (keys["1"] && player.chronoAbility && player.chronoCD <= 0) { slowActive = true; slowTimer = 5000; player.chronoCD = player.chronoMaxCD; }
        if (player.chronoCD > 0) player.chronoCD -= 16.6;
        if (slowTimer > 0) { slowTimer -= 16.6; if (slowTimer <= 0) slowActive = false; }
        if (keys["2"] && player.novaAbility && player.novaCD <= 0) { useNova(); player.novaCD = player.novaMaxCD; }
        if (player.novaCD > 0) player.novaCD -= 16.6;

        player.x = Math.max(player.r, Math.min(canvas.width - player.r, player.x));
        player.y = Math.max(player.r, Math.min(canvas.height - player.r, player.y));
        updateHUD();

        if (player.hasMolotov && t - player.lastMolotov > 7500) {
            let directions = [{vx: 0, vy: -5}, {vx: 0, vy: 5}];
            if (player.hasNapalmSpread) {
                directions.push({vx: -5, vy: 0}, {vx: 5, vy: 0});
            }
            directions.forEach(dir => {
                molotovs.push({ x: player.x, y: player.y, vx: dir.vx, vy: dir.vy, timer: 600, landed: false, life: 5000 });
            });
            player.lastMolotov = t;
        } else if (player.hasMolotov && player.lastMolotov === -7500) {
            player.lastMolotov = t - 7500;
        }

        molotovs.forEach(m => {
            if (!m.landed) {
                m.x += m.vx; m.y += m.vy; m.timer -= 16.6;
                if (m.timer <= 0) { m.landed = true; spawnShock(m.x, m.y, 40, "orange"); }
            } else {
                m.life -= 16.6;
                enemies.forEach(e => {
                    if (Math.hypot(m.x - e.x, m.y - e.y) < 60) {
                        if (e.burnTimer <= 0 && e.burnCooldown <= 0) {
                            e.burnTimer = 5000;
                            e.burnCooldown = m.life;
                        }
                    }
                });
            }
        });
        molotovs = molotovs.filter(m => m.life > 0);

        enemies.forEach(e => {
            if (e.burnTimer > 0) {
                e.burnTimer -= 16.6;
                if (t - e.lastBurnTick > 1000) {
                    e.hp -= 2;
                    e.flash = 5;
                    e.lastBurnTick = t;
                }
            }
            if (e.burnCooldown > 0) {
                e.burnCooldown -= 16.6;
            }
        });

        if (player.hasVerticalLaser) {
            player.verticalLaserTimer -= 16.6;
            if (player.verticalLaserPhase === 'recharging') {
                if (player.verticalLaserTimer <= 0) { player.verticalLaserPhase = 'firing'; player.verticalLaserTimer = 1000; player.verticalLaserHitSet.clear(); }
            } else {
                if (player.verticalLaserTimer <= 0) { player.verticalLaserPhase = 'recharging'; player.verticalLaserTimer = 5000; }
            }
        }

        shocks.forEach(s => { if (s.isBolt) { s.life -= 0.1; } else { s.r += 4; s.life -= 0.05; } });
        shocks = shocks.filter(s => s.life > 0);

        if (player.hasBoomerang && t - player.lastBoomerang > 2000) {
            const a = Math.atan2(mouse.y - player.y, mouse.x - player.x);
            boomerangs.push({ x: player.x, y: player.y, vx: Math.cos(a)*8, vy: Math.sin(a)*8, r: 8, returning: false, dist: 0, angle: a });
            player.lastBoomerang = t;
        }
        boomerangs.forEach(b => {
            if (player.boomerangOrbit) { b.angle += 0.05; b.x = player.x + Math.cos(b.angle) * 150; b.y = player.y + Math.sin(b.angle) * 150; }
            else { if (!b.returning) { b.x += b.vx; b.y += b.vy; b.dist += 8; if (b.dist > 300) b.returning = true; } else { const a = Math.atan2(player.y - b.y, player.x - b.x); b.x += Math.cos(a)*10; b.y += Math.sin(a)*10; if (Math.hypot(player.x-b.x, player.y-b.y) < 20) b.dead = true; } }
            enemies.forEach(e => { if (Math.hypot(b.x-e.x, b.y-e.y) < b.r+e.r) { e.hp -= 2; e.flash = 2; } });
        });
        boomerangs = boomerangs.filter(b => !b.dead);

        if (player.hasGuardian) {
            player.guardianAngle += 0.08;
            [0, Math.PI].forEach(offset => {
                const gx = player.x + Math.cos(player.guardianAngle + offset) * 90; const gy = player.y + Math.sin(player.guardianAngle + offset) * 90;
                enemies.forEach(e => { if (Math.hypot(gx-e.x, gy-e.y) < 15+e.r) { e.hp -= 3; e.flash = 2; } });
            });
        }

        if (player.hasDrone) {
            const tx = player.x - 40; const ty = player.y - 40; player.droneX += (tx - player.droneX) * 0.15; player.droneY += (ty - player.droneY) * 0.15;
            if (t - player.droneLastShot > 660 && enemies.length > 0) { const target = enemies[0]; const a = Math.atan2(target.y - player.droneY, target.x - player.droneX); bullets.push({ x: player.droneX, y: player.droneY, vx: Math.cos(a)*12, vy: Math.sin(a)*12, r: 4, pierce: Math.floor(player.level / 5), hitSet: new Set() }); player.droneLastShot = t; }
        }
        if (player.hasBombDrone) {
            const tx = player.x + 40; const ty = player.y - 40; player.bombDroneX += (tx - player.bombDroneX) * 0.15; player.bombDroneY += (ty - player.bombDroneY) * 0.15;
            if (t - player.bombDroneLastShot > 880 && enemies.length > 0) { const target = enemies[0]; const a = Math.atan2(target.y - player.bombDroneY, target.x - player.bombDroneX); bullets.push({ x: player.bombDroneX, y: player.bombDroneY, vx: Math.cos(a)*10, vy: Math.sin(a)*10, r: 6, pierce: 0, isBomb: true, hitSet: new Set() }); player.bombDroneLastShot = t; }
        }
        if (player.hasQuickDrone) {
            const tx = player.x - 45; const ty = player.y + 10; player.quickDroneX += (tx - player.quickDroneX) * 0.15; player.quickDroneY += (ty - player.quickDroneY) * 0.15;
            if (t - player.quickDroneLastShot > 330 && enemies.length > 0) { const target = enemies[0]; const a = Math.atan2(target.y - player.quickDroneY, target.x - player.quickDroneX); bullets.push({ x: player.quickDroneX, y: player.quickDroneY, vx: Math.cos(a)*14, vy: Math.sin(a)*14, r: 3, pierce: 0, isQuick: true, hitSet: new Set() }); player.quickDroneLastShot = t; }
        }
        if (player.hasTeslaDrone) {
            const tx = player.x + 45; const ty = player.y + 10; player.teslaDroneX += (tx - player.teslaDroneX) * 0.15; player.teslaDroneY += (ty - player.teslaDroneY) * 0.15;
            if (t - player.teslaDroneLastShot > 990 && enemies.length > 0) { const target = enemies[0]; const a = Math.atan2(target.y - player.teslaDroneY, target.x - player.teslaDroneX); bullets.push({ x: player.teslaDroneX, y: player.teslaDroneY, vx: Math.cos(a)*9, vy: Math.sin(a)*9, r: 4, pierce: 0, isTesla: true, hitSet: new Set() }); player.teslaDroneLastShot = t; }
        }
        if (player.hasAllInOne) {
            const tx = player.x; const ty = player.y - 60; player.allInOneX += (tx - player.allInOneX) * 0.15; player.allInOneY += (ty - player.allInOneY) * 0.15;
            if (t - player.allInOneLastShot > 825 && enemies.length > 0) { const target = enemies[0]; const a = Math.atan2(target.y - player.allInOneY, target.x - player.allInOneX); bullets.push({ x: player.allInOneX, y: player.allInOneY, vx: Math.cos(a)*11, vy: Math.sin(a)*11, r: 6, pierce: 0, isAllInOne: true, hitSet: new Set() }); player.allInOneLastShot = t; }
        }

        if (mouse.down && t - lastShot > player.fireRate) { const a = Math.atan2(mouse.y - player.y, mouse.x - player.x); bullets.push({ x: player.x, y: player.y, vx: Math.cos(a)*10, vy: Math.sin(a)*10, r: isLaser ? 8 : 5, pierce: player.pierce, isLaser: isLaser, hitSet: new Set() }); lastShot = t; }

        bullets.forEach(b => {
            b.x += b.vx; b.y += b.vy;
            enemies.forEach(e => {
                if (!b.hitSet.has(e) && Math.hypot(b.x-e.x, b.y-e.y) < b.r+e.r) {
                    let dmg = player.bulletDamage; if (b.isQuick) dmg = 8 * (1 + (1 - (player.hp / player.maxHp))); if (Math.random() < player.critChance) dmg *= 2;
                    e.hp -= dmg; b.hitSet.add(e); e.flash = 5; 
                    if(b.isBomb) { const radius = 60 + (player.maxHp * 0.2); spawnShock(b.x, b.y, radius, "orange"); enemies.forEach(e2 => { if(Math.hypot(b.x - e2.x, b.y - e2.y) < radius) { e2.hp -= 25; e2.flash = 5; } }); b.pierce = -1; } 
                    else if (b.isTesla) { let lastX = b.x, lastY = b.y, found = 0; for (let i = 0; i < enemies.length && found < 5; i++) { let e2 = enemies[i]; if (e2 !== e) { dealPercentDamage(e2, 0.02, 0.02, 0.005, 0.005); shocks.push({ x: lastX, y: lastY, tx: e2.x, ty: e2.y, life: 1.0, isBolt: true }); lastX = e2.x; lastY = e2.y; found++; } } b.pierce = -1; } 
                    else if (b.isAllInOne) { const radius = 70; spawnShock(b.x, b.y, radius, "red"); enemies.forEach(eT => { if(Math.hypot(b.x - eT.x, b.y - eT.y) < radius) { eT.hp -= 25; eT.flash = 5; } }); let lastX = b.x, lastY = b.y, found = 0; for (let i = 0; i < enemies.length && found < 2; i++) { let eN = enemies[i]; if (eN !== e && !b.hitSet.has(eN)) { shocks.push({ x: lastX, y: lastY, tx: eN.x, ty: eN.y, life: 1.0, isBolt: true }); spawnShock(eN.x, eN.y, radius, "red"); enemies.forEach(eEx => { if(Math.hypot(eN.x - eEx.x, eN.y - eEx.y) < radius) { eEx.hp -= 25; eEx.flash = 5; } }); lastX = eN.x; lastY = eN.y; found++; b.hitSet.add(eN); } } b.pierce = -1; } 
                    else { b.pierce--; }
                    if (player.vampireMode) player.hp = Math.min(player.hp + 2, player.maxHp); lastHitPos = { x: e.x, y: e.y };
                }
            });
        });
        bullets = bullets.filter(b => b.pierce >= 0 && b.x > -100 && b.x < canvas.width + 100);

        enemyBullets.forEach(eb => {
            if (eb.homing) { const a = Math.atan2(player.y - eb.y, player.x - eb.x); eb.vx += Math.cos(a)*0.2; eb.vy += Math.sin(a)*0.2; const s = Math.hypot(eb.vx, eb.vy); if (s > 4) { eb.vx = (eb.vx/s)*4; eb.vy = (eb.vy/s)*4; } }
            eb.x += eb.vx; eb.y += eb.vy; eb.life -= 16.6;
            if (Math.hypot(player.x - eb.x, player.y - eb.y) < player.r + 5) { player.hp -= 10; eb.life = 0; }
        });
        enemyBullets = enemyBullets.filter(eb => eb.life > 0);

        enemies.forEach(e => {
            if (player.hasVerticalLaser && player.verticalLaserPhase === 'firing') {
                const laserY = canvas.height - ((1 - (player.verticalLaserTimer / 1000)) * canvas.height);
                if (e.y >= laserY && !player.verticalLaserHitSet.has(e)) { dealPercentDamage(e, 0.30, 0.50, 0.01, 0.03); player.verticalLaserHitSet.add(e); spawnShock(e.x, e.y, 40, "#ff66aa"); }
            }
            let s = (slowActive ? e.speed * 0.5 : e.speed);
            if(e.isBoss) {
                bossBarFill.style.width = (e.hp / e.maxHp) * 100 + "%";
                if (!e.dashing && t - e.lastDash > 5000) { e.dashing = true; e.dashTimer = 20; e.lastDash = t; const dist = Math.hypot(player.x - e.x, player.y - e.y); e.dashVX = ((player.x - e.x) / dist) * 25; e.dashVY = ((player.y - e.y) / dist) * 25; }
                if (e.dashing) { e.x += e.dashVX; e.y += e.dashVY; e.dashTimer--; if (e.dashTimer <= 0) { e.dashing = false; if (e.hp < e.maxHp / 2) { for(let i=0; i<12; i++) { const angle = (Math.PI*2/12)*i; enemyBullets.push({ x: e.x, y: e.y, vx: Math.cos(angle)*5, vy: Math.sin(angle)*5, homing: false, life: 3000 }); } } } }
                else { const d = Math.hypot(player.x - e.x, player.y - e.y); e.x += (player.x - e.x) / d * s; e.y += (player.y - e.y) / d * s; }
            } else {
                const d = Math.hypot(player.x - e.x, player.y - e.y); e.x += (player.x - e.x) / d * s; e.y += (player.y - e.y) / d * s;
            }
            if (Math.hypot(player.x - e.x, player.y - e.y) < player.r + e.r) player.hp -= 0.5;
            if (e.flash > 0) e.flash--;
        });

        enemies = enemies.filter(e => { if (e.hp <= 0) { for(let i=0; i<(e.isBoss?30:1); i++) expOrbs.push({ x: e.x+(Math.random()-0.5)*40, y: e.y+(Math.random()-0.5)*40, r: 4 }); return false; } return true; });
        expOrbs = expOrbs.filter(o => { if (Math.hypot(player.x - o.x, player.y - o.y) < player.r + o.r) { player.exp += 10; if (player.exp >= player.nextExp) { player.level++; player.exp = 0; player.nextExp *= 1.15; showLevelUp(); } return false; } return true; });

        if (enemies.length === 0) { wave++; spawnWave(); }
        if (player.hp <= 0 && !godMode) { running = false; document.getElementById("deathStats").innerText = `WAVE: ${wave}`; deathOverlay.classList.remove("hidden"); }
    }

    function draw() {
        ctx.fillStyle = "#111"; ctx.fillRect(0, 0, canvas.width, canvas.height);

        molotovs.forEach(m => {
            ctx.fillStyle = m.landed ? "rgba(255, 69, 0, 0.4)" : "orange";
            ctx.beginPath(); ctx.arc(m.x, m.y, m.landed ? 60 : 6, 0, Math.PI * 2); ctx.fill();
        });

        if (player.hasVerticalLaser) {
            let indColor = "#333"; if (player.verticalLaserPhase === 'recharging') { const pct = 1 - (player.verticalLaserTimer / 5000); if (pct > 0.7) indColor = `rgb(${Math.floor((pct-0.7)*3*255)},0,0)`; } else indColor = "#fff";
            ctx.fillStyle = indColor; ctx.fillRect(5, canvas.height-30, 20, 20); ctx.fillRect(canvas.width-25, canvas.height-30, 20, 20);
            if (player.verticalLaserPhase === 'firing') { const laserY = canvas.height - ((1 - (player.verticalLaserTimer / 1000)) * canvas.height); ctx.fillStyle = "rgba(255, 0, 102, 0.25)"; ctx.fillRect(0, laserY, canvas.width, canvas.height-laserY); ctx.fillStyle = "#ff66aa"; ctx.fillRect(0, laserY-4, canvas.width, 8); }
        }
        if (player.novaAbility) { const target = manualMarker || lastHitPos; if (target.x !== 0 || target.y !== 0) { ctx.beginPath(); ctx.strokeStyle = "#ff00ff"; ctx.lineWidth = 2; ctx.setLineDash([5, 5]); ctx.arc(target.x, target.y, 30 + Math.sin(Date.now()*0.01)*5, 0, Math.PI*2); ctx.stroke(); ctx.setLineDash([]); } }
        shocks.forEach(s => { ctx.beginPath(); ctx.globalAlpha = s.life; if (s.isBolt) { ctx.strokeStyle = "white"; ctx.lineWidth = 3; ctx.moveTo(s.x, s.y); ctx.lineTo(s.tx, s.ty); } else { ctx.strokeStyle = s.color; ctx.lineWidth = 4; ctx.arc(s.x, s.y, s.r, 0, Math.PI*2); } ctx.stroke(); });
        ctx.globalAlpha = 1.0; ctx.fillStyle = "cyan"; expOrbs.forEach(o => { ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, Math.PI*2); ctx.fill(); });
        bullets.forEach(b => { if (b.isAllInOne) ctx.fillStyle = `hsl(${Date.now() % 360}, 100%, 70%)`; else ctx.fillStyle = b.isTesla ? "yellow" : (b.isQuick ? "cyan" : (isLaser ? "#ff0066" : "yellow")); ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI*2); ctx.fill(); });
        enemyBullets.forEach(eb => { ctx.fillStyle = eb.homing ? "#aa00ff" : "#ff0000"; ctx.beginPath(); ctx.arc(eb.x, eb.y, 5, 0, Math.PI*2); ctx.fill(); });
        ctx.fillStyle = player.boomerangOrbit ? "gold" : "white"; boomerangs.forEach(b => { ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(Date.now() * 0.02); ctx.fillRect(-b.r, -b.r, b.r*2, b.r*2); ctx.restore(); });
        if (player.hasGuardian) { [0, Math.PI].forEach(offset => { const gx = player.x + Math.cos(player.guardianAngle + offset) * 90; const gy = player.y + Math.sin(player.guardianAngle + offset) * 90; ctx.beginPath(); ctx.fillStyle = "rgba(0, 255, 255, 0.3)"; ctx.arc(gx, gy, 12, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.fillStyle = "#00ffff"; ctx.arc(gx, gy, 6, 0, Math.PI*2); ctx.fill(); }); }
        if (player.hasDrone) { ctx.save(); ctx.translate(player.droneX, player.droneY); ctx.rotate(Date.now()*0.005); ctx.fillStyle = "#ff00ff"; ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-7, 7); ctx.lineTo(-7, -7); ctx.closePath(); ctx.fill(); ctx.restore(); }
        if (player.hasBombDrone) { ctx.save(); ctx.translate(player.bombDroneX, player.bombDroneY); ctx.rotate(Date.now()*-0.005); ctx.fillStyle = "orange"; ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(-8, 8); ctx.lineTo(-8, -8); ctx.closePath(); ctx.fill(); ctx.restore(); }
        if (player.hasQuickDrone) { ctx.save(); ctx.translate(player.quickDroneX, player.quickDroneY); ctx.rotate(Date.now()*0.012); ctx.fillStyle = "cyan"; ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(-5, 5); ctx.lineTo(-5, -5); ctx.closePath(); ctx.fill(); ctx.restore(); }
        if (player.hasTeslaDrone) { ctx.save(); ctx.translate(player.teslaDroneX, player.teslaDroneY); ctx.rotate(Date.now()*0.003); ctx.fillStyle = "yellow"; ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-10, 5); ctx.lineTo(-10, -5); ctx.closePath(); ctx.fill(); ctx.restore(); }
        if (player.hasAllInOne) { ctx.save(); ctx.translate(player.allInOneX, player.allInOneY); ctx.rotate(Date.now()*0.01); ctx.fillStyle = `hsl(${Date.now() % 360}, 100%, 70%)`; ctx.beginPath(); ctx.moveTo(15, 0); ctx.lineTo(-10, 10); ctx.lineTo(-10, -10); ctx.closePath(); ctx.fill(); ctx.restore(); }
        enemies.forEach(e => { 
            ctx.fillStyle = e.flash > 0 ? "white" : (e.color || "red"); 
            ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, Math.PI*2); ctx.fill(); 
            if (e.burnTimer > 0) {
                ctx.fillStyle = "rgba(255, 165, 0, 0.8)";
                ctx.beginPath(); ctx.arc(e.x, e.y - e.r, 6 + Math.sin(Date.now()*0.02)*2, 0, Math.PI*2); ctx.fill();
            }
        });
        ctx.fillStyle = "lime"; ctx.beginPath(); ctx.arc(player.x, player.y, player.r, 0, Math.PI*2); ctx.fill();
    }

    function applyUpgrade(upg) { upg.f(); playerInventory[upg.t] = (playerInventory[upg.t] || 0) + 1; }
    
    function showLevelUp() {
        isPaused = true; 
        levelUpOverlay.classList.remove("hidden"); 
        upgradeContainer.innerHTML = "";
        let pool = upgrades.filter(u => {
            if (u.unique) {
                if (u.t === "All-In-One") { if (!(player.hasDrone && player.hasBombDrone && player.hasQuickDrone && player.hasTeslaDrone)) return false; }
                if (u.t === "Tactical Drone" && (player.hasDrone || player.hasAllInOne)) return false;
                if (u.t === "Bomb Drone" && (player.hasBombDrone || player.hasAllInOne)) return false;
                if (u.t === "Quickfire Drone" && (player.hasQuickDrone || player.hasAllInOne)) return false;
                if (u.t === "Tesla Drone" && (player.hasTeslaDrone || player.hasAllInOne)) return false;
                if (u.t === "True Vampirism" && player.vampireMode) return false;
                if (u.t === "Laser Sight" && isLaser) return false;
                if (u.t === "Dual Guardians" && player.hasGuardian) return false;
                if (u.t === "Phase Dash" && player.dashAbility) return false;
                if (u.t === "Pulse Nova" && player.novaAbility) return false;
                if (u.t === "Chrono-Stasis" && player.chronoAbility) return false;
                if (u.t === "Boomerang" && player.hasBoomerang) return false;
                if (u.t === "Glaive Orbit" && (!player.hasBoomerang || player.boomerangOrbit)) return false;
                if (u.t === "Vertical Laser" && player.hasVerticalLaser) return false;
                if (u.t === "Molotov" && player.hasMolotov) return false;
                // PREREQUISITE LOGIC FOR NAPALM SPREAD
                if (u.t === "Napalm Spread") {
                    if (!player.hasMolotov || player.hasNapalmSpread) return false;
                }
            }
            return true;
        });
        const chosen = []; 
        while(chosen.length < 3 && pool.length > 0) { 
            const pick = (()=>{
                let tot=0;pool.forEach(u=>tot+=rarityWeights[u.rarity]);
                let rnd=Math.random()*tot;
                for(let i=0;i<pool.length;i++){rnd-=rarityWeights[pool[i].rarity];if(rnd<=0)return pool[i];}return pool[0];
            })(); 
            chosen.push(pick); 
            pool = pool.filter(u => u !== pick); 
        }
        chosen.forEach(upg => { 
            const card = document.createElement("div"); 
            card.className = `upgradeCard ${upg.rarity}`; 
            card.innerHTML = `<h3>${upg.t}</h3><p>${upg.d}</p>`; 
            card.onclick = () => { applyUpgrade(upg); isPaused = false; levelUpOverlay.classList.add("hidden"); }; 
            upgradeContainer.appendChild(card); 
        });
    }

    function loop(t) { 
        if (running && !isPaused) update(t); 
        draw(); 
        requestAnimationFrame(loop); 
    }

    function populateCheatMenu() {
        const list = document.getElementById("upgradeInjectionList"); list.innerHTML = "";
        const g = document.createElement("button"); g.className = "cheatBtn"; g.style.background = godMode ? "#00ffff" : "#333"; g.innerText = godMode ? "[ON] GOD MODE" : "[OFF] GOD MODE"; g.onclick = () => { godMode = !godMode; populateCheatMenu(); }; list.appendChild(g);
        ['mythic', 'legendary', 'epic', 'rare', 'common'].forEach(rarity => {
            const filtered = upgrades.filter(u => u.rarity === rarity);
            if (filtered.length > 0) { const h = document.createElement("div"); h.className = "rarityHeader"; h.innerText = `— ${rarity} —`; list.appendChild(h); filtered.forEach(upg => { const b = document.createElement("button"); b.className = "cheatBtn"; b.innerText = `[+] ${upg.t}`; b.onclick = () => applyUpgrade(upg); list.appendChild(b); }); }
        });
    }

    document.getElementById("cheatAll").onclick = () => upgrades.forEach(u => applyUpgrade(u));
    document.getElementById("cheatSkip").onclick = () => enemies = [];
    document.getElementById("cheatLevel").onclick = () => { player.exp = player.nextExp; };
    document.getElementById("cheatHeal").onclick = () => player.hp = player.maxHp;
    document.getElementById("closeDev").onclick = () => document.getElementById("devMenu").style.display='none';
    startBtn.onclick = () => { overlay.classList.add("hidden"); running = true; spawnWave(); };
    
    requestAnimationFrame(loop);
});
