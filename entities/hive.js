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
        
        // Лимит юнитов (увеличивается Нейро Кристаллами)
        this.unitLimit = 50;
        
        // Таймеры
        this.lastEggTime = 0;
        this.eggCooldown = 3000; // 3 секунды между яйцами
        this.initialEggsLaid = 0;
        this.maxInitialEggs = 6; // Первые 6 рабочих
    }
    
    // Добавить ресурс
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
    
    // Потратить ресурс
    spendResource(type, amount) {
        if (this.resources[type] >= amount) {
            this.resources[type] -= amount;
            return true;
        }
        return false;
    }
    
    // Добавить юнита
    addUnit(unit) {
        if (this.units.length < this.unitLimit) {
            this.units.push(unit);
            return true;
        }
        return false;
    }
    
    // Создать королеву
    createQueen() {
        this.queen = new Queen(this.x + 1, this.y + 1, this.id);
        this.units.push(this.queen);
    }
    
    // Отложить яйцо
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
        
        const eggCost = 2;
        if (!this.spendResource(ResourceType.BIOMASS, eggCost)) {
            return false;
        }
        
        const larva = new Larva(this.x + 1, this.y + 1, this.id);
        this.larvae.push(larva);
        this.lastEggTime = currentTime;
        
        return true;
    }
    
    // Получить общее количество слотов для личинок
    getTotalLarvaeSlots() {
        let slots = 6;
        
        this.structures.forEach(structure => {
            if (structure.type === 'incubator') {
                slots += 5;
            }
        });
        
        return slots;
    }
    
    // Получить общую емкость хранилищ
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
    
    // Обновить лимиты хранилищ
    updateStorageCapacity() {
        const capacity = this.getTotalStorageCapacity();
        this.solidStorageCapacity = capacity.solid;
        this.liquidStorageCapacity = capacity.liquid;
    }
    
    // Определить, что нужно построить
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
    
    // Построить структуру
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
    
    // Обновление личинок
    updateLarvae(deltaTime) {
        this.larvae.forEach(larva => {
            larva.update(deltaTime, this);
            
            if (larva.isReady()) {
                this.hatchLarva(larva);
            }
        });
        
        this.larvae = this.larvae.filter(l => !l.isDead());
    }
    
    // Вылупление личинки
    hatchLarva(larva) {
        let unit = null;
        
        const spawnX = this.x + 1 + Utils.random(-2, 2);
        const spawnY = this.y + 1 + Utils.random(-2, 2);
        
        const fedResources = larva.getFedResources();
        
        if (fedResources[ResourceType.BIOPLASMA] >= 5 && fedResources[ResourceType.CHITIN] >= 2) {
            unit = new Soldier(spawnX, spawnY, this.id);
        } else if (fedResources[ResourceType.BIOPLASMA] >= 5) {
            unit = new Scout(spawnX, spawnY, this.id);
        } else if (fedResources[ResourceType.BIOPLASMA] >= 2 && fedResources[ResourceType.BIOMASS] >= 1) {
            unit = new Nurse(spawnX, spawnY, this.id);
        } else {
            unit = new Worker(spawnX, spawnY, this.id);
        }
        
        this.addUnit(unit);
        
        const index = this.larvae.indexOf(larva);
        if (index > -1) {
            this.larvae.splice(index, 1);
        }
    }
    
    // Обновление улья
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

// Класс личинки
class Larva {
    constructor(x, y, hiveId) {
        this.x = x;
        this.y = y;
        this.hiveId = hiveId;
        this.hp = 10;
        this.maxHP = 10;
        
        // Ресурсы, которыми кормили личинку
        this.fedResources = {
            [ResourceType.BIOMASS]: 0,
            [ResourceType.BIOPLASMA]: 0,
            [ResourceType.CHITIN]: 0,
            [ResourceType.NEURO_CRYSTAL]: 0
        };
        
        // Таймеры
        this.lastFeedTime = 0;
        this.feedCooldown = 180000; // 3 минуты
        this.lastBioplasmaFeedTime = 0;
        this.bioplasmaFeedCooldown = 60000; // 1 минута между порциями плазмы
        
        this.starvationTimer = 0;
        this.maxStarvationTime = 180000;
        
        // Прогресс развития
        this.developmentProgress = 0;
        this.requiredDevelopment = 100;
    }
    
    // Покормить личинку
    feed(resourceType, amount) {
        this.fedResources[resourceType] += amount;
        this.lastFeedTime = Date.now();
        this.starvationTimer = 0;
        
        // Био плазма ускоряет развитие
        if (resourceType === ResourceType.BIOPLASMA) {
            this.developmentProgress += amount * 20; // 20% за единицу плазмы
            this.lastBioplasmaFeedTime = Date.now();
        }
        
        // Био масса тоже немного помогает развитию
        if (resourceType === ResourceType.BIOMASS) {
            this.developmentProgress += amount * 2; // 2% за единицу биомассы
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
        
        // Кормление личинки
        this.tryToFeed(hive, currentTime);
    }
    
    // Попытка покормить личинку
    tryToFeed(hive, currentTime) {
        // 1. Кормление биомассой (для выживания) - раз в 3 минуты
        if (currentTime - this.lastFeedTime >= this.feedCooldown) {
            if (hive.resources[ResourceType.BIOMASS] >= 1) {
                hive.spendResource(ResourceType.BIOMASS, 1);
                this.feed(ResourceType.BIOMASS, 1);
            }
        }
        
        // 2. Кормление био плазмой (для развития) - раз в минуту
        if (currentTime - this.lastBioplasmaFeedTime >= this.bioplasmaFeedCooldown) {
            if (hive.resources[ResourceType.BIOPLASMA] >= 1) {
                hive.spendResource(ResourceType.BIOPLASMA, 1);
                this.feed(ResourceType.BIOPLASMA, 1);
            }
        }
    }
    
    isDead() {
        return this.hp <= 0;
    }
}
