// Логика улья (управление ресурсами, юнитами, структурами)

class HiveManager {
    constructor(id, x, y, color) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.color = color;
        
        // Ресурсы
        this.resources = {
            [ResourceType.BIOMASS]: 0,
            [ResourceType.BIOPLASMA]: 0,
            [ResourceType.CHITIN]: 0,
            [ResourceType.NEURO_CRYSTAL]: 0
        };
        
        // Лимиты хранилищ
        this.solidStorageCapacity = 50;
        this.liquidStorageCapacity = 30;
        
        // Юниты
        this.units = [];
        this.queen = null;
        
        // Структуры
        this.structures = [];
        
        // Личинки
        this.larvae = [];
        
        // Лимит юнитов
        this.unitLimit = 50;
        
        // Счётчик вылупившихся юнитов
        this.totalHatched = 0;
        
        // Таймеры
        this.lastEggTime = 0;
        this.eggCooldown = 3000;
        this.initialEggsLaid = 0;
        this.maxInitialEggs = 6;
    }
    
    addResource(type, amount) {
        if (type === ResourceType.BIOPLASMA) {
            const space = this.liquidStorageCapacity - this.resources[type];
            const toAdd = Math.min(amount, space);
            this.resources[type] += toAdd;
            return toAdd;
        } else {
            const space = this.solidStorageCapacity - this.resources[type];
            const toAdd = Math.min(amount, space);
            this.resources[type] += toAdd;
            return toAdd;
        }
    }
    
    spendResource(type, amount) {
        if (this.resources[type] >= amount) {
            this.resources[type] -= amount;
            return true;
        }
        return false;
    }
    
    addUnit(unit) {
        if (this.units.length < this.unitLimit) {
            this.units.push(unit);
            return true;
        }
        return false;
    }
    
    createQueen() {
        this.queen = new Queen(this.x + 1, this.y + 1, this.id);
        this.units.push(this.queen);
    }
    
    // ⭐ НОВОЕ: Проверка, можем ли мы позволить себе юнита определённой касты
    canAffordUnit(casteType) {
        switch(casteType) {
            case 'worker':
                return this.resources[ResourceType.BIOPLASMA] >= 3;
            case 'nurse':
                return this.resources[ResourceType.BIOPLASMA] >= 2;
            case 'scout':
                return this.resources[ResourceType.BIOPLASMA] >= 5;
            case 'soldier':
                return this.resources[ResourceType.BIOPLASMA] >= 5 && 
                       this.resources[ResourceType.CHITIN] >= 2;
        }
        return false;
    }
    
    // ⭐ НОВОЕ: Получить стоимость касты (для информации)
    getUnitCost(casteType) {
        switch(casteType) {
            case 'worker':
                return { [ResourceType.BIOPLASMA]: 3 };
            case 'nurse':
                return { [ResourceType.BIOPLASMA]: 2 };
            case 'scout':
                return { [ResourceType.BIOPLASMA]: 5 };
            case 'soldier':
                return { [ResourceType.BIOPLASMA]: 5, [ResourceType.CHITIN]: 2 };
        }
        return {};
    }
    
    // ⭐ НОВОЕ: Проверка, есть ли угроза улью
    hasThreat() {
        const threatRadius = 20;
        
        for (const otherHive of window.game.hives) {
            if (otherHive.id === this.id) continue;
            
            for (const unit of otherHive.units) {
                if (unit.type === 'soldier') {
                    const dist = Utils.distance(this.x + 1, this.y + 1, unit.x, unit.y);
                    if (dist < threatRadius) return true;
                }
            }
        }
        
        return false;
    }
    
    // ⭐ НОВОЕ: Определить, какую касту нужно вывести следующей
    getDesiredUnitType() {
        // Подсчёт юнитов по типам
        const counts = { worker: 0, nurse: 0, scout: 0, soldier: 0 };
        this.units.forEach(u => {
            if (counts[u.type] !== undefined) counts[u.type]++;
        });
        
        const total = counts.worker + counts.nurse + counts.scout + counts.soldier;
        
        // Первые 6 юнитов — ВСЕГДА рабочие (быстрый старт экономики)
        if (this.totalHatched < 6) {
            return this.canAffordUnit('worker') ? 'worker' : null;
        }
        
        // Процентный состав популяции
        const workerPercent = total > 0 ? counts.worker / total : 0;
        const nursePercent = total > 0 ? counts.nurse / total : 0;
        const scoutPercent = total > 0 ? counts.scout / total : 0;
        const soldierPercent = total > 0 ? counts.soldier / total : 0;
        
        // === ПРИОРИТЕТЫ ВЫВОДА ===
        
        // 1. Если критически мало рабочих — нужен рабочий
        if (counts.worker < 5 || workerPercent < 0.35) {
            if (this.canAffordUnit('worker')) return 'worker';
        }
        
        // 2. Если есть угроза и мало солдат — нужен солдат
        if (this.hasThreat() && (counts.soldier < 3 || soldierPercent < 0.25)) {
            if (this.canAffordUnit('soldier')) return 'soldier';
        }
        
        // 3. Если мало нянек (они кормят личинок эффективно)
        if (counts.nurse < 2 || nursePercent < 0.12) {
            if (this.canAffordUnit('nurse')) return 'nurse';
        }
        
        // 4. Если мало разведчиков (нужно исследовать карту)
        if (counts.scout < 2 || scoutPercent < 0.12) {
            if (this.canAffordUnit('scout')) return 'scout';
        }
        
        // 5. Если есть угроза и можно позволить солдата — солдат
        if (this.hasThreat() && this.canAffordUnit('soldier')) {
            return 'soldier';
        }
        
        // 6. Балансировка: если солдат слишком мало относительно популяции
        if (soldierPercent < 0.2 && this.canAffordUnit('soldier')) {
            return 'soldier';
        }
        
        // 7. Если разведчиков мало — разведчик
        if (scoutPercent < 0.15 && this.canAffordUnit('scout')) {
            return 'scout';
        }
        
        // 8. Если нянек мало — нянька
        if (nursePercent < 0.15 && this.canAffordUnit('nurse')) {
            return 'nurse';
        }
        
        // 9. По умолчанию — рабочий (основа экономики)
        if (this.canAffordUnit('worker')) return 'worker';
        
        // 10. Если вообще ничего не можем позволить — не выводим
        return null;
    }
    
    // ⭐ ИЗМЕНЁН: Отложить яйцо с учётом желаемой касты
    layEgg(currentTime) {
        if (currentTime - this.lastEggTime < this.eggCooldown) {
            return false;
        }
        
        if (this.units.length >= this.unitLimit) {
            return false;
        }
        
        const totalLarvaeSlots = this.getTotalLarvaeSlots();
        if (this.larvae.length >= totalLarvaeSlots) {
            return false;
        }
        
        // Стоимость яйца (биомасса для выживания)
        const eggCost = 2;
        if (!this.spendResource(ResourceType.BIOMASS, eggCost)) {
            return false;
        }
        
        // ⭐ Определяем, какую касту хотим вывести
        const desiredCast = this.getDesiredUnitType();
        
        // Если не можем позволить ни одного юнита — не откладываем яйцо
        if (!desiredCast) {
            // Возвращаем биомассу, т.к. яйцо не отложили
            this.resources[ResourceType.BIOMASS] += eggCost;
            return false;
        }
        
        // Создаём личинку с меткой целевой касты
        const larva = new Larva(this.x + 1, this.y + 1, this.id, desiredCast);
        this.larvae.push(larva);
        this.lastEggTime = currentTime;
        
        return true;
    }
    
    getTotalLarvaeSlots() {
        let slots = 6;
        
        this.structures.forEach(structure => {
            if (structure.type === 'incubator') {
                slots += 5;
            }
        });
        
        return slots;
    }
    
    getTotalStorageCapacity() {
        let solidCapacity = 50;
        let liquidCapacity = 30;
        
        this.structures.forEach(structure => {
            if (structure.type === 'storage_solid') {
                solidCapacity += structure.capacity;
            } else if (structure.type === 'storage_liquid') {
                liquidCapacity += structure.capacity;
            }
        });
        
        return { solid: solidCapacity, liquid: liquidCapacity };
    }
    
    updateStorageCapacity() {
        const capacity = this.getTotalStorageCapacity();
        this.solidStorageCapacity = capacity.solid;
        this.liquidStorageCapacity = capacity.liquid;
    }
    
    getConstructionPriority() {
        const storage = this.getTotalStorageCapacity();
        
        const biomassFull = this.resources[ResourceType.BIOMASS] / storage.solid > 0.8;
        const bioplasmaFull = this.resources[ResourceType.BIOPLASMA] / storage.liquid > 0.8;
        
        if (biomassFull && this.resources[ResourceType.BIOMASS] >= 8 && this.resources[ResourceType.CHITIN] >= 3) {
            return { type: 'storage_solid', priority: 1 };
        }
        
        if (bioplasmaFull && this.resources[ResourceType.BIOMASS] >= 10 && this.resources[ResourceType.CHITIN] >= 5) {
            return { type: 'storage_liquid', priority: 1 };
        }
        
        const totalSlots = this.getTotalLarvaeSlots();
        const freeSlots = totalSlots - this.larvae.length;
        
        if (freeSlots < 3 && this.resources[ResourceType.BIOMASS] >= 10 && this.resources[ResourceType.CHITIN] >= 5) {
            return { type: 'incubator', priority: 2 };
        }
        
        if (this.resources[ResourceType.BIOMASS] < 20 && this.resources[ResourceType.BIOMASS] >= 70 && this.resources[ResourceType.CHITIN] >= 10) {
            return { type: 'biomass_farm', priority: 3 };
        }
        
        return null;
    }
    
    buildStructure(type, x, y) {
        let structure = null;
        
        switch(type) {
            case 'storage_solid':
                structure = new StorageSolid(x, y, this.id, this.color);
                break;
            case 'storage_liquid':
                structure = new StorageLiquid(x, y, this.id, this.color);
                break;
            case 'biomass_farm':
                structure = new BiomassFarm(x, y, this.id, this.color);
                break;
            case 'incubator':
                structure = new Incubator(x, y, this.id, this.color);
                break;
            default:
                return false;
        }
        
        this.structures.push(structure);
        this.updateStorageCapacity();
        
        return true;
    }
    
    updateLarvae(deltaTime) {
        this.larvae.forEach(larva => {
            larva.update(deltaTime, this);
            
            if (larva.isReady()) {
                this.hatchLarva(larva);
            }
        });
        
        this.larvae = this.larvae.filter(l => !l.isDead());
    }
    
    // ⭐ ИЗМЕНЁН: Вылупление по заранее определённой касте
    hatchLarva(larva) {
        let unit = null;
        
        const spawnX = this.x + 1 + Utils.random(-2, 2);
        const spawnY = this.y + 1 + Utils.random(-2, 2);
        
        // Создаём юнита той касты, которая была запланирована
        switch(larva.desiredCast) {
            case 'worker':
                unit = new Worker(spawnX, spawnY, this.id);
                break;
            case 'nurse':
                unit = new Nurse(spawnX, spawnY, this.id);
                break;
            case 'scout':
                unit = new Scout(spawnX, spawnY, this.id);
                break;
            case 'soldier':
                unit = new Soldier(spawnX, spawnY, this.id);
                break;
            default:
                unit = new Worker(spawnX, spawnY, this.id);
        }
        
        this.addUnit(unit);
        this.totalHatched++;
        
        const index = this.larvae.indexOf(larva);
        if (index > -1) {
            this.larvae.splice(index, 1);
        }
    }
    
    update(deltaTime, currentTime, pheromoneSystem) {
        if (this.initialEggsLaid < this.maxInitialEggs) {
            if (this.layEgg(currentTime)) {
                this.initialEggsLaid++;
            }
        }
        
        this.updateLarvae(deltaTime);
        
        this.structures.forEach(structure => {
            if (structure.type === 'biomass_farm') {
                const produced = structure.produce();
                this.addResource(ResourceType.BIOMASS, produced);
            }
        });
        
        this.units.forEach(unit => {
            if (!unit.isDead()) {
                unit.update(deltaTime, this, pheromoneSystem);
            }
        });
        
        this.units = this.units.filter(u => !u.isDead());
    }
}

// ⭐ ИЗМЕНЁН: Класс личинки
class Larva {
    constructor(x, y, hiveId, desiredCast) {
        this.x = x;
        this.y = y;
        this.hiveId = hiveId;
        this.hp = 10;
        this.maxHP = 10;
        
        // ⭐ НОВОЕ: Целевая каста, определённая королевой
        this.desiredCast = desiredCast || 'worker';
        
        this.fedResources = {
            [ResourceType.BIOMASS]: 0,
            [ResourceType.BIOPLASMA]: 0,
            [ResourceType.CHITIN]: 0,
            [ResourceType.NEURO_CRYSTAL]: 0
        };
        
        // Таймеры
        this.lastFeedTime = 0;
        this.feedCooldown = 180000; // 3 минуты — биомасса для выживания
        this.lastDevelopmentFeedTime = 0;
        this.developmentFeedCooldown = 60000; // 1 минута — развивающие ресурсы
        
        this.starvationTimer = 0;
        this.maxStarvationTime = 180000;
        
        this.developmentProgress = 0;
        this.requiredDevelopment = 100;
    }
    
    // ⭐ НОВОЕ: Получить требуемые развивающие ресурсы для целевой касты
    getRequiredDevelopmentResources() {
        switch(this.desiredCast) {
            case 'worker':
                return { type: ResourceType.BIOPLASMA, amountPerFeed: 1, progressPerFeed: 34 };
            case 'nurse':
                return { type: ResourceType.BIOPLASMA, amountPerFeed: 1, progressPerFeed: 50 };
            case 'scout':
                return { type: ResourceType.BIOPLASMA, amountPerFeed: 1, progressPerFeed: 20 };
            case 'soldier':
                // Солдату нужно и плазма, и хитин — чередуем
                return null; // Особая логика
        }
        return { type: ResourceType.BIOPLASMA, amountPerFeed: 1, progressPerFeed: 34 };
    }
    
    feed(resourceType, amount, progressGain) {
        this.fedResources[resourceType] += amount;
        this.lastFeedTime = Date.now();
        this.starvationTimer = 0;
        
        // Увеличиваем прогресс развития
        if (progressGain) {
            this.developmentProgress += progressGain;
        }
    }
    
    getFedResources() {
        return this.fedResources;
    }
    
    isReady() {
        return this.developmentProgress >= this.requiredDevelopment;
    }
    
    update(deltaTime, hive) {
        const currentTime = Date.now();
        
        // Проверка голода (биомасса нужна для выживания)
        if (currentTime - this.lastFeedTime > this.feedCooldown) {
            this.starvationTimer += deltaTime * 1000;
            
            if (this.starvationTimer >= this.maxStarvationTime) {
                this.hp = 0;
            }
        }
        
        this.tryToFeed(hive, currentTime);
    }
    
    // ⭐ ИЗМЕНЁН: Кормление с учётом целевой касты
    tryToFeed(hive, currentTime) {
        // 1. Кормление биомассой (для выживания) — раз в 3 минуты
        if (currentTime - this.lastFeedTime >= this.feedCooldown) {
            if (hive.resources[ResourceType.BIOMASS] >= 1) {
                hive.spendResource(ResourceType.BIOMASS, 1);
                this.feed(ResourceType.BIOMASS, 1, 0); // Биомасса не даёт прогресс
            }
        }
        
        // 2. Кормление развивающими ресурсами — раз в минуту
        if (currentTime - this.lastDevelopmentFeedTime >= this.developmentFeedCooldown) {
            
            if (this.desiredCast === 'soldier') {
                // ⭐ Особая логика для солдата: нужно и плазма, и хитин
                // Чередует: сначала плазма, потом хитин
                const bioplasmaFed = this.fedResources[ResourceType.BIOPLASMA];
                const chitinFed = this.fedResources[ResourceType.CHITIN];
                
                if (bioplasmaFed < 5 && hive.resources[ResourceType.BIOPLASMA] >= 1) {
                    // Нужно больше плазмы
                    hive.spendResource(ResourceType.BIOPLASMA, 1);
                    this.feed(ResourceType.BIOPLASMA, 1, 10);
                    this.lastDevelopmentFeedTime = currentTime;
                } else if (chitinFed < 2 && hive.resources[ResourceType.CHITIN] >= 1) {
                    // Нужно больше хитина
                    hive.spendResource(ResourceType.CHITIN, 1);
                    this.feed(ResourceType.CHITIN, 1, 15);
                    this.lastDevelopmentFeedTime = currentTime;
                }
                // Если и того и другого достаточно — просто ждём прогресса
                else if (bioplasmaFed >= 5 && chitinFed >= 2) {
                    // Даём небольшой пассивный прогресс
                    this.developmentProgress += 5;
                    this.lastDevelopmentFeedTime = currentTime;
                }
            } else {
                // Обычная логика для других каст
                const required = this.getRequiredDevelopmentResources();
                if (required && hive.resources[required.type] >= required.amountPerFeed) {
                    hive.spendResource(required.type, required.amountPerFeed);
                    this.feed(required.type, required.amountPerFeed, required.progressPerFeed);
                    this.lastDevelopmentFeedTime = currentTime;
                }
            }
        }
    }
    
    isDead() {
        return this.hp <= 0;
    }
}
