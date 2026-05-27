class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.minimap = document.getElementById('minimap');
        this.minimapCtx = this.minimap.getContext('2d');
        
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        this.track = new Track();
        this.cars = [];
        this.aiDrivers = [];
        this.playerCar = null;
        this.gameState = 'menu';
        this.paused = false;
        this.startTime = 0;
        this.elapsedTime = 0;
        this.difficulty = 'medium';
        this.maxLaps = 3;
        this.gameFinished = false;
        this.finalStats = null;
        
        this.gameLoop();
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.minimap.width = 150;
        this.minimap.height = 150;
    }

    startNewGame() {
        this.cars = [];
        this.aiDrivers = [];
        this.gameState = 'playing';
        this.paused = false;
        this.startTime = Date.now();
        this.elapsedTime = 0;
        this.gameFinished = false;
        this.finalStats = null;
        
        // Create player car
        const startPos = this.track.waypoints[0];
        this.playerCar = new Car(startPos.x, startPos.y, '#ff6b6b');
        this.cars.push(this.playerCar);
        
        // Create AI opponents
        const opponentCount = parseInt(document.getElementById('opponentCount').value) || 2;
        const colors = ['#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7'];
        
        for (let i = 0; i < opponentCount; i++) {
            const offset = (i + 1) * 80;
            const aiCar = new Car(
                startPos.x - offset,
                startPos.y + (Math.random() - 0.5) * 50,
                colors[i % colors.length]
            );
            this.cars.push(aiCar);
            
            const aiDriver = new AIDriver(aiCar, this.track, this.difficulty);
            this.aiDrivers.push(aiDriver);
        }
        
        this.updateHUD();
    }

    update() {
        if (this.gameState !== 'playing' || this.paused) return;
        
        this.elapsedTime = (Date.now() - this.startTime) / 1000;
        
        // Update player car
        this.playerCar.update();
        
        // Update AI drivers
        for (let aiDriver of this.aiDrivers) {
            aiDriver.update(this.cars, this);
            aiDriver.car.update();
        }
        
        // Check collisions
        for (let i = 0; i < this.cars.length; i++) {
            for (let j = i + 1; j < this.cars.length; j++) {
                if (checkCollision(this.cars[i], this.cars[j])) {
                    this.handleCarCollision(this.cars[i], this.cars[j]);
                }
            }
        }
        
        // Check track collisions (bounce back)
        for (let car of this.cars) {
            if (checkTrackCollision(car, this.track)) {
                car.velocity = car.velocity.multiply(-0.3);
                car.position = car.position.add(car.velocity);
            }
        }
        
        // Check checkpoints
        for (let car of this.cars) {
            for (let cp of this.track.checkpoints) {
                const dist = car.position.distance(cp.position);
                if (dist < cp.radius) {
                    if (!car.checkpointsHit.includes(cp.index)) {
                        car.checkpointsHit.push(cp.index);
                    }
                }
            }
        }
        
        // Check lap completion
        for (let car of this.cars) {
            if (car.checkpointsHit.length >= this.track.checkpoints.length) {
                car.lap++;
                car.checkpointsHit = [];
                
                if (car === this.playerCar && car.lap > this.maxLaps) {
                    this.finishGame();
                }
            }
        }
        
        this.updateHUD();
    }

    handleCarCollision(car1, car2) {
        const normal = car2.position.subtract(car1.position).normalize();
        const relativeVelocity = car2.velocity.subtract(car1.velocity);
        const velocityAlongNormal = relativeVelocity.dot(normal);
        
        if (velocityAlongNormal < 0) return;
        
        const impulse = normal.multiply(-velocityAlongNormal * 0.5);
        car1.velocity = car1.velocity.add(impulse);
        car2.velocity = car2.velocity.subtract(impulse);
        
        // Separate cars
        const overlap = (car1.width + car2.width) / 2 - car1.position.distance(car2.position);
        if (overlap > 0) {
            const separationVector = normal.multiply((overlap + 1) / 2);
            car1.position = car1.position.subtract(separationVector);
            car2.position = car2.position.add(separationVector);
        }
    }

    finishGame() {
        this.gameState = 'finished';
        this.gameFinished = true;
        
        // Calculate final positions
        const racePositions = calculateRacePosition(this.cars, this.track);
        const playerPosition = racePositions.find(p => p.car === this.playerCar).position;
        
        this.finalStats = {
            position: playerPosition,
            totalCars: this.cars.length,
            time: Math.floor(this.elapsedTime),
            speed: Math.floor(this.playerCar.velocity.magnitude() * 10) / 10
        };
        
        this.showGameOver();
    }

    render() {
        // Clear canvas
        this.ctx.fillStyle = 'rgba(135, 206, 235, 0.1)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Save camera position
        this.ctx.save();
        
        // Center camera on player
        const cameraX = this.canvas.width / 2 - this.playerCar.position.x;
        const cameraY = this.canvas.height / 2 - this.playerCar.position.y;
        this.ctx.translate(cameraX, cameraY);
        
        // Draw track
        this.track.render(this.ctx);
        
        // Draw cars
        for (let car of this.cars) {
            car.render(this.ctx);
        }
        
        this.ctx.restore();
        
        // Draw minimap
        this.renderMinimap();
    }

    renderMinimap() {
        const width = this.minimap.width;
        const height = this.minimap.height;
        const scale = 0.15;
        
        // Clear minimap
        this.minimapCtx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.minimapCtx.fillRect(0, 0, width, height);
        
        // Draw track on minimap
        this.minimapCtx.strokeStyle = 'rgba(100, 100, 100, 0.6)';
        this.minimapCtx.lineWidth = 2;
        this.minimapCtx.beginPath();
        for (let i = 0; i < this.track.waypoints.length; i++) {
            const wp = this.track.waypoints[i];
            const x = (wp.x - this.playerCar.position.x) * scale + width / 2;
            const y = (wp.y - this.playerCar.position.y) * scale + height / 2;
            if (i === 0) this.minimapCtx.moveTo(x, y);
            else this.minimapCtx.lineTo(x, y);
        }
        this.minimapCtx.stroke();
        
        // Draw cars on minimap
        for (let car of this.cars) {
            const x = (car.position.x - this.playerCar.position.x) * scale + width / 2;
            const y = (car.position.y - this.playerCar.position.y) * scale + height / 2;
            this.minimapCtx.fillStyle = car === this.playerCar ? '#ff6b6b' : car.color;
            this.minimapCtx.beginPath();
            this.minimapCtx.arc(x, y, 4, 0, Math.PI * 2);
            this.minimapCtx.fill();
        }
    }

    updateHUD() {
        if (this.gameState !== 'playing') return;
        
        const speed = Math.floor(this.playerCar.velocity.magnitude() * 10);
        document.getElementById('speedDisplay').textContent = speed;
        
        const racePositions = calculateRacePosition(this.cars, this.track);
        const position = racePositions.find(p => p.car === this.playerCar).position;
        document.getElementById('positionDisplay').textContent = position;
        
        const minutes = Math.floor(this.elapsedTime / 60);
        const seconds = Math.floor(this.elapsedTime % 60);
        document.getElementById('timeDisplay').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    showGameOver() {
        const gameOverMenu = document.getElementById('gameOverMenu');
        const gameOverTitle = document.getElementById('gameOverTitle');
        const gameStats = document.getElementById('gameStats');
        
        if (this.finalStats.position === 1) {
            gameOverTitle.textContent = '🏆 ניצחת!';
        } else {
            gameOverTitle.textContent = `סיים במקום ${this.finalStats.position}`;
        }
        
        gameStats.innerHTML = `
            <div>מקום: ${this.finalStats.position}/${this.finalStats.totalCars}</div>
            <div>זמן: ${this.finalStats.time} שניות</div>
            <div>מהירות סיום: ${this.finalStats.speed} km/h</div>
        `;
        
        gameOverMenu.classList.add('active');
    }

    gameLoop() {
        this.update();
        if (this.gameState === 'playing') {
            this.render();
        }
        requestAnimationFrame(() => this.gameLoop());
    }
}

let game;

function startGame() {
    document.getElementById('mainMenu').classList.remove('active');
    document.getElementById('gameContainer').classList.add('active');
    if (!game) {
        game = new Game();
    }
    game.startNewGame();
}

function togglePause() {
    if (game.gameState === 'playing') {
        game.paused = !game.paused;
        const pauseMenu = document.getElementById('pauseMenu');
        game.paused ? pauseMenu.classList.add('active') : pauseMenu.classList.remove('active');
    }
}

function showSettings() {
    document.getElementById('mainMenu').classList.remove('active');
    document.getElementById('settingsMenu').classList.add('active');
}

function updateDifficulty() {
    const difficulty = document.getElementById('difficultySelect').value;
    if (game) game.difficulty = difficulty;
}

function showLeaderboard() {
    document.getElementById('mainMenu').classList.remove('active');
    document.getElementById('leaderboardMenu').classList.add('active');
    updateLeaderboardDisplay();
}

function backToMenu() {
    document.getElementById('settingsMenu').classList.remove('active');
    document.getElementById('leaderboardMenu').classList.remove('active');
    document.getElementById('pauseMenu').classList.remove('active');
    document.getElementById('gameOverMenu').classList.remove('active');
    document.getElementById('gameContainer').classList.remove('active');
    document.getElementById('mainMenu').classList.add('active');
}

function saveScore() {
    const playerName = document.getElementById('playerName').value || 'שחקן אנונימי';
    const leaderboard = JSON.parse(localStorage.getItem('mirelRacingLeaderboard')) || [];
    
    const score = {
        name: playerName,
        position: game.finalStats.position,
        time: game.finalStats.time,
        date: new Date().toLocaleDateString('he-IL')
    };
    
    leaderboard.push(score);
    leaderboard.sort((a, b) => a.position - b.position || a.time - b.time);
    leaderboard.splice(10); // Keep top 10
    
    localStorage.setItem('mirelRacingLeaderboard', JSON.stringify(leaderboard));
    
    backToMenu();
}

function updateLeaderboardDisplay() {
    const leaderboard = JSON.parse(localStorage.getItem('mirelRacingLeaderboard')) || [];
    const list = document.getElementById('leaderboardList');
    
    if (leaderboard.length === 0) {
        list.innerHTML = '<p style="text-align: center; opacity: 0.7;">אין ניקודים עדיין</p>';
        return;
    }
    
    list.innerHTML = leaderboard.map((score, index) => `
        <div class="leaderboard-entry">
            <span class="rank">#${index + 1}</span>
            <span class="name">${score.name}</span>
            <span class="score">מקום ${score.position}</span>
        </div>
    `).join('');
}

function clearLeaderboard() {
    if (confirm('האם אתה בטוח שברצונך לנקות את טבלת הדירוג?')) {
        localStorage.removeItem('mirelRacingLeaderboard');
        updateLeaderboardDisplay();
    }
}
