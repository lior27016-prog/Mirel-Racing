<!DOCTYPE html>
<html lang="he">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🏎️ Mirel Racing</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { width: 100%; height: 100%; overflow: hidden; touch-action: none; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); font-family: Arial, sans-serif; }
        .menu { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.95); display: flex; align-items: center; justify-content: center; z-index: 1000; opacity: 1; pointer-events: all; flex-direction: column; }
        .menu.hidden { opacity: 0; pointer-events: none; }
        .menu-content { background: linear-gradient(135deg, #667eea, #764ba2); padding: 40px; border-radius: 20px; text-align: center; color: white; max-width: 90vw; }
        .menu h1 { font-size: 3em; margin-bottom: 15px; }
        .menu h2 { font-size: 2em; margin-bottom: 25px; }
        .menu p { margin-bottom: 20px; font-size: 1.1em; }
        .btn { display: block; width: 100%; padding: 15px; margin: 10px 0; border: none; border-radius: 10px; font-size: 1.1em; font-weight: bold; cursor: pointer; background: #ff6b6b; color: white; transition: all 0.3s; }
        .btn:active { transform: scale(0.95); background: #ff5252; }
        #gameContainer { position: fixed; top: 0; left: 0; width: 100%; height: 100%; display: none; }
        canvas { display: block; width: 100%; height: 100%; }
        .hud { position: fixed; top: 15px; left: 15px; right: 15px; background: rgba(0,0,0,0.7); color: white; padding: 12px 20px; border-radius: 10px; font-weight: bold; font-size: 0.9em; z-index: 100; }
        .hud-item { display: inline-block; margin-right: 25px; }
        .pause-btn { position: fixed; bottom: 20px; left: 20px; padding: 12px 18px; background: #ff6b6b; color: white; border: none; border-radius: 8px; cursor: pointer; z-index: 100; font-weight: bold; font-size: 1em; }
        #touchLeft, #touchRight { position: fixed; bottom: 20px; width: 90px; height: 90px; background: rgba(255,255,255,0.2); border: 2px solid rgba(255,255,255,0.4); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2.5em; z-index: 100; touch-action: none; }
        #touchLeft { left: 20px; }
        #touchRight { right: 20px; }
    </style>
</head>
<body>
    <div id="mainMenu" class="menu">
        <div class="menu-content">
            <h1>🏎️ Mirel Racing</h1>
            <p>משחק מכוניות בריימה גבוהה</p>
            <button class="btn" onclick="startGame()">התחל משחק</button>
            <button class="btn" onclick="showInstructions()">הוראות</button>
        </div>
    </div>

    <div id="instructionsMenu" class="menu hidden">
        <div class="menu-content">
            <h2>הוראות</h2>
            <p style="text-align: right; line-height: 2; font-size: 0.95em;">
                <strong>מקלדת:</strong><br>
                W - אצבע | S - בלימה | A/D - סטייה | P - השהה<br><br>
                <strong>פלאפון:</strong><br>
                עיגול שמאל - סטייה<br>
                עיגול ימין - אצבע/בלימה
            </p>
            <button class="btn" onclick="startGame()">התחל משחק</button>
            <button class="btn" onclick="hideInstructions()">חזור</button>
        </div>
    </div>

    <div id="pauseMenu" class="menu hidden">
        <div class="menu-content">
            <h2>משחק מושהה</h2>
            <button class="btn" onclick="togglePause()">המשך</button>
            <button class="btn" onclick="goToMenu()">חזור לתפריט</button>
        </div>
    </div>

    <div id="gameContainer">
        <canvas id="gameCanvas"></canvas>
        <div class="hud">
            <span class="hud-item">מהירות: <span id="speed">0</span> km/h</span>
            <span class="hud-item">זמן: <span id="time">0:00</span></span>
        </div>
        <button class="pause-btn" onclick="togglePause()">⏸ השהה</button>
        <div id="touchLeft">⬅️</div>
        <div id="touchRight">⬆️</div>
    </div>

    <script>
        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d', { alpha: false });
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        window.addEventListener('resize', () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        });

        class V2 {
            constructor(x = 0, y = 0) { this.x = x; this.y = y; }
            add(v) { return new V2(this.x + v.x, this.y + v.y); }
            mul(s) { return new V2(this.x * s, this.y * s); }
            mag() { return Math.sqrt(this.x * this.x + this.y * this.y); }
        }

        class Car {
            constructor(x, y, color) {
                this.p = new V2(x, y);
                this.v = new V2(0, 0);
                this.a = 0;
                this.w = 28; this.h = 50;
                this.ms = 14;
                this.t = this.b = this.s = 0;
            }
            update() {
                this.a += this.s * 0.11;
                const dx = Math.sin(this.a), dy = -Math.cos(this.a);
                let f = this.t ? 0.2 : (this.b ? -0.16 : 0);
                const sp = this.v.mag() + f;
                this.v = new V2(dx * Math.max(-7, Math.min(this.ms, sp)), dy * Math.max(-7, Math.min(this.ms, sp)));
                this.v = this.v.mul(0.96);
                this.p = this.p.add(this.v);
                if (this.p.x < -50) this.p.x = canvas.width + 50;
                if (this.p.x > canvas.width + 50) this.p.x = -50;
                if (this.p.y < -50) this.p.y = canvas.height + 50;
                if (this.p.y > canvas.height + 50) this.p.y = -50;
            }
            draw(c, col) {
                c.save();
                c.translate(this.p.x, this.p.y);
                c.rotate(this.a);
                c.fillStyle = col;
                c.fillRect(-this.w / 2, -this.h / 2, this.w, this.h);
                c.fillStyle = '#ffeb3b';
                c.fillRect(-this.w / 2 + 3, -this.h / 2 - 3, this.w - 6, 4);
                c.restore();
            }
        }

        const p = new Car(canvas.width / 2, canvas.height / 2, '#ff6b6b');
        const e = [new Car(100, 100), new Car(canvas.width - 100, 100), new Car(canvas.width / 2, canvas.height - 100)];
        const cols = ['#4ecdc4', '#45b7d1', '#96ceb4'];
        let run = 0, pause = 0, st = 0;
        const k = {};

        window.addEventListener('keydown', (e) => { k[e.key.toLowerCase()] = 1; upd(); });
        window.addEventListener('keyup', (e) => { k[e.key.toLowerCase()] = 0; upd(); });

        function upd() {
            p.t = k['w'] || k['arrowup'] ? 1 : 0;
            p.b = k['s'] || k['arrowdown'] ? 1 : 0;
            p.s = 0;
            if (k['a'] || k['arrowleft']) p.s = -1;
            if (k['d'] || k['arrowright']) p.s = 1;
        }

        const tl = document.getElementById('touchLeft');
        const tr = document.getElementById('touchRight');

        tl.addEventListener('touchmove', (e) => {
            const t = e.touches[0];
            const r = tl.getBoundingClientRect();
            const c = r.left + r.width / 2;
            p.s = Math.max(-1, Math.min(1, (t.clientX - c) / (r.width / 2)));
        }, false);
        tl.addEventListener('touchend', () => { p.s = 0; });

        tr.addEventListener('touchmove', (e) => {
            const t = e.touches[0];
            const r = tr.getBoundingClientRect();
            const cy = r.top + r.height / 2;
            const o = t.clientY - cy;
            if (o < -15) { p.t = 1; p.b = 0; }
            else if (o > 15) { p.t = 0; p.b = 1; }
            else { p.t = p.b = 0; }
        }, false);
        tr.addEventListener('touchend', () => { p.t = p.b = 0; });

        function loop() {
            if (run && !pause) {
                p.update();
                e.forEach((c, i) => {
                    c.t = 0.6;
                    c.s = Math.sin(Date.now() / 1000 + c.p.x) * 0.4;
                    c.update();
                });
                const sp = Math.floor(p.v.mag() * 10);
                document.getElementById('speed').textContent = sp;
                const el = (Date.now() - st) / 1000;
                const m = Math.floor(el / 60);
                const s = Math.floor(el % 60);
                document.getElementById('time').textContent = `${m}:${s.toString().padStart(2, '0')}`;
            }

            ctx.fillStyle = '#87ceeb';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.strokeStyle = 'rgba(100,100,100,0.2)';
            ctx.lineWidth = 1;
            for (let i = 0; i < canvas.width; i += 50) {
                ctx.beginPath();
                ctx.moveTo(i, 0);
                ctx.lineTo(i, canvas.height);
                ctx.stroke();
            }

            p.draw(ctx, '#ff6b6b');
            e.forEach((c, i) => c.draw(ctx, cols[i]));
            requestAnimationFrame(loop);
        }

        function startGame() {
            run = 1; pause = 0; st = Date.now();
            document.getElementById('mainMenu').classList.add('hidden');
            document.getElementById('instructionsMenu').classList.add('hidden');
            document.getElementById('pauseMenu').classList.add('hidden');
            document.getElementById('gameContainer').style.display = 'block';
        }

        function showInstructions() {
            document.getElementById('mainMenu').classList.add('hidden');
            document.getElementById('instructionsMenu').classList.remove('hidden');
        }

        function hideInstructions() {
            document.getElementById('instructionsMenu').classList.add('hidden');
            document.getElementById('mainMenu').classList.remove('hidden');
        }

        function togglePause() {
            if (!run) return;
            pause = !pause;
            document.getElementById('pauseMenu').classList.toggle('hidden');
        }

        function goToMenu() {
            run = pause = 0;
            document.getElementById('gameContainer').style.display = 'none';
            document.getElementById('pauseMenu').classList.add('hidden');
            document.getElementById('mainMenu').classList.remove('hidden');
        }

        loop();
    </script>
</body>
</html>