// Юниты улья

class Unit {
    constructor(type, x, y, hiveId) {
        this.type = type;
        this.x = x;
        this.y = y;
        this.hiveId = hiveId;
        this.hp = this.getMaxHP();
        this.maxHP = this.getMaxHP();
        this.speed = this.getSpeed();
        this.damage = this.getDamage();
        this.carryCapacity = this.getCarryCapacity();
        this.carrying = null;
        
        // Состояние
        this.state = 'idle';
        this.target = null;
        this.lastEatTime = 0;
        this.eatCooldown = 180000; // 3 минуты
        
        // Феромоны
        this.lastPheromoneTime = 0;
        this.pheromoneCooldown = 500;
        
        // Атака
        this.lastAttackTime = 0;
    }
    
    getMaxHP() {
        switch(this.type) {
            case 'worker': return 30;
            case 'nurse': return 20;
            case 'scout': return 25;
            case 'soldier': return 80;
            case 'queen': return 200;
            default: return 30;
        }
    }
    
    getSpeed() {
        switch(this.type) {
            case 'worker': return 2;
            case 'nurse': return 1.5;
            case 'scout': return 3.5;
            case 'soldier': return 1.2;
            case 'queen': return 0;
            default: return 1;
        }
    }
    
    getDamage() {
        switch(this.type) {
            case 'worker': return 5;
            case 'nurse': return 2;
            case 'scout': return 3;
            case 'soldier': return 15;
            case 'queen': return 10;
            default: return 1;
        }
    }
    
    getCarryCapacity() {
        switch(this.type) {
            case 'worker': return 2;
            case 'nurse': return 1;
            case 'scout': return 1;
            case 'soldier': return 3;
            case 'queen': return 0;
            default: return 1;
        }
    }
    
    takeDamage(damage) {
        this.hp = Math.max(0, this.hp - damage);
    }
    
    isDead() {
        return this.hp <= 0;
    }
    
    moveTowards(targetX, targetY, deltaTime) {
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0.1) {
            const moveAmount = this.speed * deltaTime;
            this.x += (dx / distance) * moveAmount;
            this.y += (dy / distance) * moveAmount;
        }
        
        return distance;
    }
    
    reachedTarget(targetX, targetY, threshold = 0.5) {
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance <= threshold;
    }
    
    eat(hive) {
        const currentTime = Date.now();
        if (currentTime - this.lastEatTime < this.eatCooldown) {
            return true;
        }
        
        const foodRequired = this.getFoodRequired();
        
        if (hive.resources[ResourceType.BIOMASS] >= foodRequired) {
            hive.spendResource(ResourceType.BIOMASS, foodRequired);
            this.lastEatTime = currentTime;
            return true;
        }
        
        return false;
    }
    
    getFoodRequired() {
        switch(this.type) {
            case 'worker': return 1;
            case 'nurse': return 1;
            case 'scout': return 1;
            case 'soldier': return 3;
            case 'queen': return 5;
            default: return 1;
        }
    }
    
    depositPheromone(pheromoneSystem, type, intensity, resourceType = null) {
        const currentTime = Date.now();
        
        if (currentTime - this.lastPheromoneTime < this.pheromoneCooldown) {
            return;
        }
        
        pheromoneSystem.depositPheromone(
            type,
            this.x,
            this.y,
            intensity,
            this.hiveId,
            resourceType
        );
        
        this.lastPheromoneTime = currentTime;
    }
    
    update(deltaTime, hive, pheromoneSystem) {
        this.eat(hive);
    }
}

class Worker extends Unit {
    constructor(x, y, hiveId) {
        super('worker', x, y, hiveId);
        this.state = 'idle';
        this.targetResource = null;
        this.constructionTarget = null;
        this.buildProgress = 0;
        this.buildRequired = 100;
    }
    
    update(deltaTime, hive, pheromoneSystem) {
        super.update(deltaTime, hive, pheromoneSystem);
        // Логика рабочего теперь в combat.js
    }
}

class Nurse extends Unit {
    constructor(x, y, hiveId) {
        super('nurse', x, y, hiveId);
    }
    
    update(deltaTime, hive, pheromoneSystem) {
        super.update(deltaTime, hive, pheromoneSystem);
        // Логика няньки теперь в combat.js
    }
}

class Scout extends Unit {
    constructor(x, y, hiveId) {
        super('scout', x, y, hiveId);
        this.state = 'exploring';
        this.exploreTarget = null;
    }
    
    update(deltaTime, hive, pheromoneSystem) {
        super.update(deltaTime, hive, pheromoneSystem);
        // Логика разведчика теперь в combat.js
    }
}

class Soldier extends Unit {
    constructor(x, y, hiveId) {
        super('soldier', x, y, hiveId);
        this.state = 'guarding';
        this.patrolTarget = null;
    }
    
    update(deltaTime, hive, pheromoneSystem) {
        super.update(deltaTime, hive, pheromoneSystem);
        // Логика солдата теперь в combat.js
    }
}

class Queen extends Unit {
    constructor(x, y, hiveId) {
        super('queen', x, y, hiveId);
    }
    
    update(deltaTime, hive, pheromoneSystem) {
        super.update(deltaTime, hive, pheromoneSystem);
        // Логика королевы теперь в combat.js
    }
}
