// Структуры улья

class Structure {
    constructor(type, x, y, hiveId, color) {
        this.type = type;
        this.x = x;
        this.y = y;
        this.hiveId = hiveId;
        this.color = color; // Цвет улья, которому принадлежит структура
        this.hp = this.getMaxHP();
        this.maxHP = this.getMaxHP();
        this.size = this.getSize(); // Размер в тайлах
    }
    
    getMaxHP() {
        switch(this.type) {
            case 'hive': return 500;
            case 'storage_solid': return 100;
            case 'storage_liquid': return 100;
            case 'biomass_farm': return 150;
            case 'incubator': return 120;
            default: return 100;
        }
    }
    
    getSize() {
        switch(this.type) {
            case 'hive': return 3;          // 3x3 тайла
            case 'storage_solid': return 2; // 2x2 тайла
            case 'storage_liquid': return 2;
            case 'biomass_farm': return 3;  // 3x3 тайла
            case 'incubator': return 2;     // 2x2 тайла
            default: return 1;
        }
    }
    
    takeDamage(damage) {
        this.hp = Math.max(0, this.hp - damage);
    }
    
    repair(amount) {
        this.hp = Math.min(this.maxHP, this.hp + amount);
    }
    
    isDestroyed() {
        return this.hp <= 0;
    }
}

class HiveStructure extends Structure {
    constructor(x, y, hiveId, color) {
        super('hive', x, y, hiveId, color);
        this.incubatorSlots = 6;
        this.solidStorage = 50;
        this.liquidStorage = 30;
    }
}

class StorageSolid extends Structure {
    constructor(x, y, hiveId, color) {
        super('storage_solid', x, y, hiveId, color);
        this.capacity = 50; // +50 к хранилищу твердых ресурсов
    }
}

class StorageLiquid extends Structure {
    constructor(x, y, hiveId, color) {
        super('storage_liquid', x, y, hiveId, color);
        this.capacity = 30; // +30 к хранилищу жидких ресурсов
    }
}

class BiomassFarm extends Structure {
    constructor(x, y, hiveId, color) {
        super('biomass_farm', x, y, hiveId, color);
        this.productionRate = 10; // 10 биомассы в минуту
        this.lastProductionTime = Date.now();
    }
    
    // Произвести биомассу
    produce() {
        const now = Date.now();
        const timePassed = (now - this.lastProductionTime) / 1000; // в секундах
        const produced = (this.productionRate / 60) * timePassed; // 10 в минуту = 10/60 в секунду
        this.lastProductionTime = now;
        return produced;
    }
}

class Incubator extends Structure {
    constructor(x, y, hiveId, color) {
        super('incubator', x, y, hiveId, color);
        this.slots = 5; // +5 слотов для личинок
    }
}
