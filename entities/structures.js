// Структуры улья

class Structure {
    constructor(type, x, y, hiveId) {
        this.type = type;
        this.x = x;
        this.y = y;
        this.hiveId = hiveId;
        this.hp = this.getMaxHP();
        this.maxHP = this.getMaxHP();
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

class Hive extends Structure {
    constructor(x, y, hiveId) {
        super('hive', x, y, hiveId);
        this.id = hiveId;
        this.color = this.getHiveColor(hiveId);
        this.incubatorSlots = 6; // 6 слотов для личинок
        this.solidStorage = 50;  // Базовое хранилище твердых ресурсов
        this.liquidStorage = 30; // Базовое хранилище жидких ресурсов
    }
    
    getHiveColor(id) {
        const colors = ['#FF4444', '#44FF44', '#4444FF', '#FFFF44'];
        return colors[id % colors.length];
    }
}
