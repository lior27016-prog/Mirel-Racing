class InputHandler {
    constructor(car) {
        this.car = car;
        this.keys = {};
        
        window.addEventListener('keydown', (e) => this.handleKeyDown(e));
        window.addEventListener('keyup', (e) => this.handleKeyUp(e));
        
        // Touch controls for mobile
        this.setupTouchControls();
    }

    handleKeyDown(e) {
        this.keys[e.key.toLowerCase()] = true;
        this.updateCarInput();
    }

    handleKeyUp(e) {
        this.keys[e.key.toLowerCase()] = false;
        this.updateCarInput();
    }

    updateCarInput() {
        // Throttle: W or ArrowUp
        if (this.keys['w'] || this.keys['arrowup']) {
            this.car.throttle = 1;
            this.car.brake = 0;
        }
        // Brake/Reverse: S or ArrowDown
        else if (this.keys['s'] || this.keys['arrowdown']) {
            this.car.brake = 1;
            this.car.throttle = 0;
        }
        // No input
        else {
            this.car.throttle = 0;
            this.car.brake = 0;
        }

        // Steering: A/D or ArrowLeft/ArrowRight
        if (this.keys['a'] || this.keys['arrowleft']) {
            this.car.steering = -1;
        }
        else if (this.keys['d'] || this.keys['arrowright']) {
            this.car.steering = 1;
        }
        else {
            this.car.steering = 0;
        }
    }

    setupTouchControls() {
        // Left button area - steering
        const leftArea = document.createElement('div');
        leftArea.style.cssText = `
            position: fixed;
            bottom: 30px;
            left: 30px;
            width: 100px;
            height: 100px;
            background: rgba(255, 255, 255, 0.1);
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 100;
        `;
        leftArea.innerHTML = '🎮';
        document.body.appendChild(leftArea);

        // Right button area - throttle/brake
        const rightArea = document.createElement('div');
        rightArea.style.cssText = `
            position: fixed;
            bottom: 30px;
            right: 30px;
            width: 100px;
            height: 100px;
            background: rgba(255, 255, 255, 0.1);
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 100;
        `;
        rightArea.innerHTML = '⚡';
        document.body.appendChild(rightArea);

        // Show touch controls on mobile
        if (this.isMobile()) {
            leftArea.style.display = 'flex';
            rightArea.style.display = 'flex';

            // Touch handlers
            leftArea.addEventListener('touchstart', (e) => {
                const touch = e.touches[0];
                const rect = leftArea.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const offsetX = touch.clientX - centerX;
                this.car.steering = Math.max(-1, Math.min(1, offsetX / 50));
            });

            leftArea.addEventListener('touchend', () => {
                this.car.steering = 0;
            });

            rightArea.addEventListener('touchstart', (e) => {
                const touch = e.touches[0];
                const rect = rightArea.getBoundingClientRect();
                const centerY = rect.top + rect.height / 2;
                const offsetY = touch.clientY - centerY;
                
                if (offsetY < -20) {
                    this.car.throttle = 1;
                    this.car.brake = 0;
                } else if (offsetY > 20) {
                    this.car.brake = 1;
                    this.car.throttle = 0;
                }
            });

            rightArea.addEventListener('touchend', () => {
                this.car.throttle = 0;
                this.car.brake = 0;
            });
        }
    }

    isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }
}

// Initialize input handler when game loads
window.addEventListener('load', () => {
    // Input handler will be created when game starts
});

// Create input handler after game is initialized
const originalStartGame = window.startGame;
window.startGame = function() {
    originalStartGame();
    if (game && game.playerCar) {
        new InputHandler(game.playerCar);
    }
};
