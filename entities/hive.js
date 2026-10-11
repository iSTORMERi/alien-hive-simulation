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
    }
    
    // Добавить ресурс
    addResource(type, amount) {
        if (type === ResourceType.BIOPLASMA) {
            // Жидкий ресурс
            const space = this.liquidStorageCapacity - this.resources[type];
            const toAdd = Math.min(amount, space);
            this.resources[type] += toAdd;
            return toAdd;
        } else {
            // Твердый ресурс
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
    
    // Обновление улья
    update() {
        // Здесь будет логика обновления улья
    }
}
