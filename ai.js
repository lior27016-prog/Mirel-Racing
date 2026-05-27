class AIDriver {
    constructor(car, track, difficulty = 'medium') {
        this.car = car;
        this.track = track;
        this.difficulty = difficulty;
        this.targetWaypoint = 0;
        this.decisionTimer = 0;
        this.decisionInterval = 10;
        this.avoidanceRadius = 200;
        this.pathFollowDistance = 150;
        this.overtakeAttempt = false;
        this.overtakeTimer = 0;
        
        // Difficulty parameters
        this.difficultyParams = {
            easy: {
                maxSpeed: 10,
                steering: 0.1,
                braking: 0.15,
                reactionTime: 20
            },
            medium: {
                maxSpeed: 13,
                steering: 0.15,
                braking: 0.2,
                reactionTime: 10
            },
            hard: {
                maxSpeed: 15,
                steering: 0.2,
                braking: 0.25,
                reactionTime: 5
            }
        };
        
        this.params = this.difficultyParams[difficulty];
    }

    update(allCars, gameState) {
        this.decisionTimer++;
        
        if (this.decisionTimer >= this.decisionInterval) {
            this.decisionTimer = 0;
            this.makeDecision(allCars, gameState);
        }
        
        this.updateOvertaking(allCars);
    }

    makeDecision(allCars, gameState) {
        // Find target waypoint
        const targetIndex = (this.targetWaypoint + Math.floor(this.pathFollowDistance / 5)) % this.track.waypoints.length;
        const targetWaypoint = this.track.waypoints[targetIndex];
        
        // Calculate steering direction
        const dirToTarget = targetWaypoint.subtract(this.car.position).normalize();
        const carForward = new Vector2(
            Math.sin(this.car.angle),
            -Math.cos(this.car.angle)
        );
        
        const crossProduct = carForward.x * dirToTarget.y - carForward.y * dirToTarget.x;
        const dotProduct = carForward.dot(dirToTarget);
        
        // Smooth steering
        if (Math.abs(crossProduct) > 0.1) {
            this.car.steering = Math.sign(crossProduct) * this.params.steering;
        } else {
            this.car.steering *= 0.9;
        }
        
        // Speed control
        const speedFactor = Math.max(0, dotProduct);
        if (speedFactor > 0.5) {
            this.car.throttle = 1;
            this.car.brake = 0;
        } else {
            this.car.throttle = 0.5;
            this.car.brake = this.params.braking;
        }
        
        // Obstacle avoidance
        const nearbyObstacles = this.detectNearbyObstacles(allCars);
        if (nearbyObstacles.length > 0) {
            this.avoidObstacles(nearbyObstacles);
        }
        
        // Check for lap progress
        const closestWaypoint = this.track.getClosestWaypoint(this.car.position);
        this.targetWaypoint = closestWaypoint;
        
        // Limit speed
        const speed = this.car.velocity.magnitude();
        if (speed > this.params.maxSpeed) {
            this.car.brake = 0.3;
            this.car.throttle = 0;
        }
    }

    detectNearbyObstacles(allCars) {
        const obstacles = [];
        const carForward = new Vector2(
            Math.sin(this.car.angle),
            -Math.cos(this.car.angle)
        );
        
        for (let car of allCars) {
            if (car === this.car) continue;
            
            const toOther = car.position.subtract(this.car.position);
            const distance = toOther.magnitude();
            
            if (distance < this.avoidanceRadius) {
                const dotProduct = toOther.normalize().dot(carForward);
                if (dotProduct > 0.3) {
                    obstacles.push({
                        car: car,
                        distance: distance,
                        direction: toOther.normalize()
                    });
                }
            }
        }
        
        return obstacles;
    }

    avoidObstacles(obstacles) {
        if (obstacles.length === 0) return;
        
        // Find the closest obstacle
        let closest = obstacles[0];
        for (let obs of obstacles) {
            if (obs.distance < closest.distance) {
                closest = obs;
            }
        }
        
        // Brake if too close
        if (closest.distance < 100) {
            this.car.brake = this.params.braking;
            this.car.throttle = 0;
        }
        
        // Calculate avoidance steering
        const avoidDirection = new Vector2(-closest.direction.y, closest.direction.x);
        if (closest.car.position.x < this.car.position.x) {
            this.car.steering = -0.2;
        } else {
            this.car.steering = 0.2;
        }
    }

    updateOvertaking(allCars) {
        if (this.overtakeTimer > 0) {
            this.overtakeTimer--;
        }
        
        // Check if we can overtake
        const aheadCars = allCars.filter(car => {
            if (car === this.car) return false;
            const closestWaypoint = this.track.getClosestWaypoint(car.position);
            const ourClosest = this.track.getClosestWaypoint(this.car.position);
            return closestWaypoint > ourClosest;
        });
        
        if (aheadCars.length > 0 && this.overtakeTimer === 0 && this.difficulty !== 'easy') {
            this.overtakeAttempt = true;
            this.overtakeTimer = 100;
        }
    }
}

function calculateRacePosition(cars, track) {
    // Sort cars by progress on track
    const carsWithProgress = cars.map(car => ({
        car: car,
        progress: track.getClosestWaypoint(car.position),
        lap: car.lap,
        distance: car.totalDistance
    }));
    
    carsWithProgress.sort((a, b) => {
        if (a.lap !== b.lap) return b.lap - a.lap;
        return b.progress - a.progress;
    });
    
    return carsWithProgress.map((item, index) => ({
        car: item.car,
        position: index + 1
    }));
}
