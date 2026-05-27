class Vector2 {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    add(v) {
        return new Vector2(this.x + v.x, this.y + v.y);
    }

    subtract(v) {
        return new Vector2(this.x - v.x, this.y - v.y);
    }

    multiply(scalar) {
        return new Vector2(this.x * scalar, this.y * scalar);
    }

    magnitude() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    normalize() {
        const mag = this.magnitude();
        if (mag === 0) return new Vector2(0, 0);
        return new Vector2(this.x / mag, this.y / mag);
    }

    distance(v) {
        return this.subtract(v).magnitude();
    }

    dot(v) {
        return this.x * v.x + this.y * v.y;
    }

    rotate(angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return new Vector2(
            this.x * cos - this.y * sin,
            this.x * sin + this.y * cos
        );
    }
}

class Car {
    constructor(x, y, color = '#ff6b6b') {
        this.position = new Vector2(x, y);
        this.velocity = new Vector2(0, 0);
        this.acceleration = new Vector2(0, 0);
        this.angle = 0;
        this.angularVelocity = 0;

        // Car properties
        this.width = 30;
        this.height = 50;
        this.maxSpeed = 15;
        this.acceleration_rate = 0.3;
        this.brake_rate = 0.25;
        this.friction = 0.98;
        this.turning_speed = 0.15;
        this.max_turning_speed = 0.2;
        this.color = color;

        // Input state
        this.throttle = 0;
        this.brake = 0;
        this.steering = 0;

        // Lap tracking
        this.lapTime = 0;
        this.totalDistance = 0;
        this.checkpointsHit = [];
        this.lap = 1;
    }

    update(deltaTime = 1) {
        // Apply steering
        this.angularVelocity = this.steering * this.turning_speed;
        this.angularVelocity = Math.max(-this.max_turning_speed, Math.min(this.max_turning_speed, this.angularVelocity));
        this.angle += this.angularVelocity;

        // Calculate forward direction
        const forwardDir = new Vector2(
            Math.sin(this.angle),
            -Math.cos(this.angle)
        );

        // Apply throttle and braking
        let engineForce = 0;
        if (this.throttle > 0) {
            engineForce = this.acceleration_rate * this.throttle;
        }
        if (this.brake > 0) {
            engineForce = -this.brake_rate * this.brake;
        }

        // Update velocity
        const speed = this.velocity.magnitude();
        let targetSpeed = speed + engineForce;
        targetSpeed = Math.max(-this.maxSpeed / 2, Math.min(this.maxSpeed, targetSpeed));

        // Apply friction
        this.velocity = this.velocity.multiply(this.friction);

        // Set new velocity in forward direction
        this.velocity = forwardDir.multiply(targetSpeed);

        // Update position
        this.position = this.position.add(this.velocity);

        // Track total distance
        this.totalDistance += this.velocity.magnitude();
        this.lapTime += deltaTime;
    }

    render(ctx) {
        ctx.save();
        ctx.translate(this.position.x, this.position.y);
        ctx.rotate(this.angle);

        // Car body
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);

        // Car windows
        ctx.fillStyle = 'rgba(100, 150, 255, 0.6)';
        ctx.fillRect(-this.width / 2 + 4, -this.height / 2 + 8, this.width - 8, 10);
        ctx.fillRect(-this.width / 2 + 4, this.height / 2 - 18, this.width - 8, 10);

        // Front indicator
        ctx.fillStyle = 'yellow';
        ctx.fillRect(-this.width / 2 + 5, -this.height / 2 - 3, this.width - 10, 3);

        // Headlights
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(-this.width / 4, -this.height / 2 - 1, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(this.width / 4, -this.height / 2 - 1, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    getCorners() {
        const cos = Math.cos(this.angle);
        const sin = Math.sin(this.angle);
        const corners = [
            [-this.width / 2, -this.height / 2],
            [this.width / 2, -this.height / 2],
            [this.width / 2, this.height / 2],
            [-this.width / 2, this.height / 2]
        ];
        return corners.map(([x, y]) => {
            const rotX = x * cos - y * sin;
            const rotY = x * sin + y * cos;
            return new Vector2(this.position.x + rotX, this.position.y + rotY);
        });
    }
}

class Track {
    constructor() {
        this.waypoints = [];
        this.width = 100;
        this.generateTrack();
        this.checkpoints = [];
        this.generateCheckpoints();
    }

    generateTrack() {
        // Figure-8 track
        const points = 200;
        for (let i = 0; i < points; i++) {
            const t = (i / points) * Math.PI * 2;
            let x, y;

            if (t < Math.PI) {
                // Left loop
                x = 400 + 200 * Math.cos(t);
                y = 300 + 150 * Math.sin(t);
            } else {
                // Right loop
                x = 800 + 200 * Math.cos(t);
                y = 300 + 150 * Math.sin(t);
            }

            this.waypoints.push(new Vector2(x, y));
        }
    }

    generateCheckpoints() {
        // Create checkpoints every 20 waypoints
        for (let i = 0; i < this.waypoints.length; i += 20) {
            this.checkpoints.push({
                index: i,
                position: this.waypoints[i],
                radius: 80,
                hit: false
            });
        }
    }

    render(ctx) {
        // Draw track
        ctx.strokeStyle = 'rgba(100, 100, 100, 0.8)';
        ctx.lineWidth = this.width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(this.waypoints[0].x, this.waypoints[0].y);
        for (let i = 1; i < this.waypoints.length; i++) {
            ctx.lineTo(this.waypoints[i].x, this.waypoints[i].y);
        }
        ctx.closePath();
        ctx.stroke();

        // Draw center line
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 10]);
        ctx.beginPath();
        ctx.moveTo(this.waypoints[0].x, this.waypoints[0].y);
        for (let i = 1; i < this.waypoints.length; i++) {
            ctx.lineTo(this.waypoints[i].x, this.waypoints[i].y);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw checkpoints
        ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.8)';
        ctx.lineWidth = 2;
        for (let cp of this.checkpoints) {
            ctx.beginPath();
            ctx.arc(cp.position.x, cp.position.y, cp.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }

        // Draw start line
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 5;
        ctx.beginPath();
        const start = this.waypoints[0];
        const next = this.waypoints[1];
        const dx = next.x - start.x;
        const dy = next.y - start.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const px = -dy / len * 50;
        const py = dx / len * 50;
        ctx.moveTo(start.x + px, start.y + py);
        ctx.lineTo(start.x - px, start.y - py);
        ctx.stroke();
    }

    getClosestWaypoint(position) {
        let closest = 0;
        let minDist = Infinity;
        for (let i = 0; i < this.waypoints.length; i++) {
            const dist = position.distance(this.waypoints[i]);
            if (dist < minDist) {
                minDist = dist;
                closest = i;
            }
        }
        return closest;
    }
}

function checkCollision(car1, car2) {
    const dx = car2.position.x - car1.position.x;
    const dy = car2.position.y - car1.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < (car1.width + car2.width);
}

function checkTrackCollision(car, track) {
    const closest = track.getClosestWaypoint(car.position);
    const waypoint = track.waypoints[closest];
    const dist = car.position.distance(waypoint);
    return dist > (track.width / 2 + car.width / 2);
}
