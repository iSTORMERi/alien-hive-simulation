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
        this.carrying = null; // {type: ResourceType, amount: number}
        
        // Состояние
        this.state = 'idle'; // idle, moving, gathering, returning
        this.target = null;
        this.lastEatTime = 0;
        this.eatCooldown = 180000; // 3 минуты
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
    
    // Движение к цели
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
    
    // Проверка, достиг ли цели
    reachedTarget(targetX, targetY, threshold = 0.5) {
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance <= threshold;
    }
    
    // Поесть (потребить биомассу)
    eat(hive) {
        const currentTime = Date.now();
        if (currentTime - this.lastEatTime < this.eatCooldown) {
            return true; // Еще не время есть
        }
        
        const foodRequired = this.getFoodRequired();
        
        if (hive.resources[ResourceType.BIOMASS] >= foodRequired) {
            hive.spendResource(ResourceType.BIOMASS, foodRequired);
            this.lastEatTime = currentTime;
            return true;
        }
        
        return false; // Не хватает еды
    }
    
    // Сколько еды нужно этому юниту
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
    
    // Обновление юнита
    update(deltaTime, hive) {
        // Поесть, если нужно
        this.eat(hive);
        
        // Здесь будет специфичная логика для каждой касты
    }
}

class Worker extends Unit {
    constructor(x, y, hiveId) {
        super('worker', x, y, hiveId);
        this.state = 'idle';
        this.targetResource = null;
    }
    
    update(deltaTime, hive) {
        super.update(deltaTime, hive);
        
        // Простой ИИ для рабочего
        switch(this.state) {
            case 'idle':
                this.findResource(hive);
                break;
            case 'moving_to_resource':
                this.moveToResource(deltaTime, hive);
                break;
            case 'gathering':
                this.gatherResource(deltaTime, hive);
                break;
            case 'returning':
                this.returnToHive(deltaTime, hive);
                break;
        }
    }
    
    // Найти ресурс
    findResource(hive) {
        // Пока что просто ищем ближайший ресурс
        const resources = window.game.gameMap.getAllResources();
        let closest = null;
        let closestDist = Infinity;
        
        resources.forEach(resource => {
            if (resource.hasResource()) {
                const dist = Utils.distance(this.x, this.y, resource.x, resource.y);
                if (dist < closestDist) {
                    closestDist = dist;
                    closest = resource;
                }
            }
        });
        
        if (closest) {
            this.targetResource = closest;
            this.state = 'moving_to_resource';
        }
    }
    
    // Движение к ресурсу
    moveToResource(deltaTime, hive) {
        if (!this.targetResource || !this.targetResource.hasResource()) {
            this.state = 'idle';
            this.targetResource = null;
            return;
        }
        
        const dist = this.moveTowards(this.targetResource.x, this.targetResource.y, deltaTime);
        
        if (dist <= 1) {
            this.state = 'gathering';
        }
    }
    
    // Добыча ресурса
    gatherResource(deltaTime, hive) {
        if (!this.targetResource || !this.targetResource.hasResource()) {
            this.state = 'idle';
            this.targetResource = null;
            return;
        }
        
        // Проверка, не несем ли уже ресурс
        if (this.carrying && this.carrying.amount >= this.carryCapacity) {
            this.state = 'returning';
            return;
        }
        
        // Добыча ресурса
        const extractAmount = 0.5; // 0.5 единицы за тик
        const extracted = this.targetResource.extract(extractAmount);
        
        if (extracted > 0) {
            if (!this.carrying) {
                this.carrying = {
                    type: this.targetResource.type,
                    amount: extracted
                };
            } else {
                this.carrying.amount += extracted;
            }
            
            // Если набрали полную грузоподъемность, возвращаемся
            if (this.carrying.amount >= this.carryCapacity) {
                this.state = 'returning';
            }
        }
    }
    
    // Возврат в улей
    returnToHive(deltaTime, hive) {
        const hiveX = hive.x + 1; // Центр улья
        const hiveY = hive.y + 1;
        
        const dist = this.moveTowards(hiveX, hiveY, deltaTime);
        
        if (dist <= 2) {
            // Сдать ресурс
            if (this.carrying) {
                hive.addResource(this.carrying.type, this.carrying.amount);
                this.carrying = null;
            }
            this.state = 'idle';
        }
    }
}

class Nurse extends Unit {
    constructor(x, y, hiveId) {
        super('nurse', x, y, hiveId);
    }
    
    update(deltaTime, hive) {
        super.update(deltaTime, hive);
        // Няньки кормят личинок (будет реализовано позже)
    }
}

class Scout extends Unit {
    constructor(x, y, hiveId) {
        super('scout', x, y, hiveId);
    }
    
    update(deltaTime, hive) {
        super.update(deltaTime, hive);
        // Разведчики исследуют карту (будет реализовано позже)
    }
}

class Soldier extends Unit {
    constructor(x, y, hiveId) {
        super('soldier', x, y, hiveId);
    }
    
    update(deltaTime, hive) {
        super.update(deltaTime, hive);
        // Солдаты охраняют улей (будет реализовано позже)
    }
}

class Queen extends Unit {
    constructor(x, y, hiveId) {
        super('queen', x, y, hiveId);
    }
    
    update(deltaTime, hive) {
        super.update(deltaTime, hive);
        // Королева не двигается
    }
}
