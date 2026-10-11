// Типы ресурсов

const ResourceType = {
    BIOMASS: 'biomass',           // Био Масса (твердый)
    BIOPLASMA: 'bioplasma',       // Био Плазма (жидкий)
    CHITIN: 'chitin',             // Хитиновая руда (твердый)
    NEURO_CRYSTAL: 'neuro_crystal' // Нейро Кристалл (твердый, редкий)
};

class Resource {
    constructor(type, x, y, amount, richness) {
        this.type = type;
        this.x = x;
        this.y = y;
        this.amount = amount;           // Текущее количество
        this.maxAmount = amount;        // Максимальное количество
        this.richness = richness;       // Богатство жилы (1-3: бедная, средняя, богатая)
        this.regenRate = this.getRegenRate(); // Скорость регенерации
        this.lastRegenTime = Date.now();
    }
    
    getRegenRate() {
        // Скорость регенерации зависит от типа ресурса
        switch(this.type) {
            case ResourceType.BIOMASS:
                return 0.2; // 1 единица за 5 секунд
            case ResourceType.BIOPLASMA:
                return 0.067; // 1 единица за 15 секунд
            case ResourceType.CHITIN:
                return 0.033; // 1 единица за 30 секунд
            case ResourceType.NEURO_CRYSTAL:
                return 0.017; // 1 единица за 60 секунд
            default:
                return 0.1;
        }
    }
    
    // Добыча ресурса
    extract(amount) {
        const extracted = Math.min(amount, this.amount);
        this.amount -= extracted;
        return extracted;
    }
    
    // Регенерация ресурса
    regen() {
        const now = Date.now();
        const timePassed = (now - this.lastRegenTime) / 1000; // в секундах
        
        if (this.amount < this.maxAmount) {
            const regenAmount = timePassed * this.regenRate * this.richness;
            this.amount = Math.min(this.maxAmount, this.amount + regenAmount);
            this.lastRegenTime = now;
        }
    }
    
    // Проверка, есть ли ресурс
    hasResource() {
        return this.amount >= 1;
    }
}

// Класс для управления всеми ресурсами на карте
class ResourceManager {
    constructor() {
        this.resources = [];
    }
    
    addResource(resource) {
        this.resources.push(resource);
    }
    
    getResourceAt(x, y) {
        return this.resources.find(r => r.x === x && r.y === y);
    }
    
    getAllResources() {
        return this.resources;
    }
    
    update() {
        // Регенерация всех ресурсов
        this.resources.forEach(r => r.regen());
    }
}
