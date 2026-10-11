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
        
        // Феромоны
        this.lastPheromoneTime = 0;
        this.pheromoneCooldown = 500; // Оставляем феромон каждые 0.5 секунды
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
    
    // Оставить феромон
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
    
    // Обновление юнита
    update(deltaTime, hive, pheromoneSystem) {
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
    
    update(deltaTime, hive, pheromoneSystem) {
        super.update(deltaTime, hive, pheromoneSystem);
        
        // Простой ИИ для рабочего с феромонами
        switch(this.state) {
            case 'idle':
                this.findResource(hive, pheromoneSystem);
                break;
            case 'moving_to_resource':
                this.moveToResource(deltaTime, hive, pheromoneSystem);
                break;
            case 'gathering':
                this.gatherResource(deltaTime, hive, pheromoneSystem);
                break;
            case 'returning':
                this.returnToHive(deltaTime, hive, pheromoneSystem);
                break;
        }
    }
    
    // Найти ресурс (сначала ищем феромоны, потом случайно)
    findResource(hive, pheromoneSystem) {
        // Сначала пробуем найти по феромонам
        const pheromoneTarget = pheromoneSystem.findNearestResourcePheromone(
            this.x, this.y, this.hiveId, null
        );
        
        if (pheromoneTarget && pheromoneTarget.intensity > 0.3) {
            // Нашли сильный феромонный след, идём по нему
            this.targetX = pheromoneTarget.x;
            this.targetY = pheromoneTarget.y;
            this.state = 'moving_to_resource';
            return;
        }
        
        // Если феромонов нет, ищем ближайший ресурс напрямую
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
            this.targetX = closest.x;
            this.targetY = closest.y;
            this.state = 'moving_to_resource';
        }
    }
    
    // Движение к ресурсу
    moveToResource(deltaTime, hive, pheromoneSystem) {
        // Оставляем феромон "дом" по пути
        this.depositPheromone(pheromoneSystem, PheromoneType.HOME, 0.1);
        
        const dist = this.moveTowards(this.targetX, this.targetY, deltaTime);
        
        // Проверяем, есть ли ресурс в этой точке
        const resource = window.game.gameMap.resourceManager.getResourceAt(
            Math.floor(this.targetX),
            Math.floor(this.targetY)
        );
        
        if (resource && resource.hasResource()) {
            this.targetResource = resource;
            this.state = 'gathering';
        } else if (dist <= 1) {
            // Достигли цели, но ресурса нет - ищем новый
            this.state = 'idle';
            this.targetResource = null;
        }
    }
    
    // Добыча ресурса
    gatherResource(deltaTime, hive, pheromoneSystem) {
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
            
            // Оставляем ресурсный феромон на месте добычи
            this.depositPheromone(
                pheromoneSystem,
                PheromoneType.RESOURCE,
                0.2,
                this.targetResource.type
            );
            
            // Если набрали полную грузоподъемность, возвращаемся
            if (this.carrying.amount >= this.carryCapacity) {
                this.state = 'returning';
                this.targetX = hive.x + 1; // Центр улья
                this.targetY = hive.y + 1;
            }
        }
    }
    
    // Возврат в улей
    returnToHive(deltaTime, hive, pheromoneSystem) {
        // Оставляем ресурсный феромон по пути (чтобы другие шли по следу)
        if (this.carrying) {
            this.depositPheromone(
                pheromoneSystem,
                PheromoneType.RESOURCE,
                0.3,
                this.carrying.type
            );
        }
        
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
    
    update(deltaTime, hive, pheromoneSystem) {
        super.update(deltaTime, hive, pheromoneSystem);
        // Няньки кормят личинок (будет реализовано позже)
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
        
        // Разведчики исследуют карту
        switch(this.state) {
            case 'exploring':
                this.explore(deltaTime, hive, pheromoneSystem);
                break;
            case 'returning':
                this.returnToHive(deltaTime, hive, pheromoneSystem);
                break;
        }
    }
    
    // Исследование карты
    explore(deltaTime, hive, pheromoneSystem) {
        // Если нет цели, выбираем случайную точку
        if (!this.exploreTarget) {
            this.exploreTarget = {
                x: Utils.random(10, window.game.mapWidth - 10),
                y: Utils.random(10, window.game.mapHeight - 10)
            };
        }
        
        // Оставляем феромон "дом"
        this.depositPheromone(pheromoneSystem, PheromoneType.HOME, 0.05);
        
        const dist = this.moveTowards(this.exploreTarget.x, this.exploreTarget.y, deltaTime);
        
        // Если достигли цели, выбираем новую
        if (dist <= 2) {
            this.exploreTarget = null;
        }
        
        // Если нашли ресурс, оставляем феромон
        const resource = window.game.gameMap.resourceManager.getResourceAt(
            Math.floor(this.x),
            Math.floor(this.y)
        );
        
        if (resource && resource.hasResource()) {
            this.depositPheromone(
                pheromoneSystem,
                PheromoneType.RESOURCE,
                0.5,
                resource.type
            );
        }
    }
    
    // Возврат в улей
    returnToHive(deltaTime, hive, pheromoneSystem) {
        const hiveX = hive.x + 1;
        const hiveY = hive.y + 1;
        
        const dist = this.moveTowards(hiveX, hiveY, deltaTime);
        
        if (dist <= 2) {
            this.state = 'exploring';
        }
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
        
        // Солдаты охраняют улей
        switch(this.state) {
            case 'guarding':
                this.guard(deltaTime, hive, pheromoneSystem);
                break;
            case 'patrolling':
                this.patrol(deltaTime, hive, pheromoneSystem);
                break;
        }
    }
    
    // Охрана улья
    guard(deltaTime, hive, pheromoneSystem) {
        // Патрулируем вокруг улья
        if (!this.patrolTarget) {
            const angle = Utils.random(0, Math.PI * 2);
            const radius = Utils.random(5, 10);
            this.patrolTarget = {
                x: hive.x + 1 + Math.cos(angle) * radius,
                y: hive.y + 1 + Math.sin(angle) * radius
            };
        }
        
        const dist = this.moveTowards(this.patrolTarget.x, this.patrolTarget.y, deltaTime);
        
        if (dist <= 1) {
            this.patrolTarget = null;
        }
        
        // Оставляем феромон "дом"
        this.depositPheromone(pheromoneSystem, PheromoneType.HOME, 0.1);
    }
    
    // Патрулирование
    patrol(deltaTime, hive, pheromoneSystem) {
        // Здесь будет логика реагирования на феромоны тревоги
        this.guard(deltaTime, hive, pheromoneSystem);
    }
}

class Queen extends Unit {
    constructor(x, y, hiveId) {
        super('queen', x, y, hiveId);
    }
    
    update(deltaTime, hive, pheromoneSystem) {
        super.update(deltaTime, hive, pheromoneSystem);
        // Королева не двигается
    }
}
