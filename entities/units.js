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
    
    move(targetX, targetY) {
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
            this.x += (dx / distance) * this.speed * 0.016; // 0.016 = время кадра
            this.y += (dy / distance) * this.speed * 0.016;
        }
    }
}

class Worker extends Unit {
    constructor(x, y, hiveId) {
        super('worker', x, y, hiveId);
    }
}

class Nurse extends Unit {
    constructor(x, y, hiveId) {
        super('nurse', x, y, hiveId);
    }
}

class Scout extends Unit {
    constructor(x, y, hiveId) {
        super('scout', x, y, hiveId);
    }
}

class Soldier extends Unit {
    constructor(x, y, hiveId) {
        super('soldier', x, y, hiveId);
    }
}

class Queen extends Unit {
    constructor(x, y, hiveId) {
        super('queen', x, y, hiveId);
    }
}
