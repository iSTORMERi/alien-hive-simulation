// Карта игры

class GameMap {
    constructor(width, height, tileSize) {
        this.width = width;
        this.height = height;
        this.tileSize = tileSize;
        this.tiles = [];
        this.resourceManager = new ResourceManager();
        
        this.initialize();
    }
    
    initialize() {
        // Создание пустой карты
        for (let y = 0; y < this.height; y++) {
            this.tiles[y] = [];
            for (let x = 0; x < this.width; x++) {
                this.tiles[y][x] = {
                    x: x,
                    y: y,
                    resource: null,
                    structure: null
                };
            }
        }
    }
    
    // Получить тайл по координатам
    getTile(x, y) {
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
            return this.tiles[y][x];
        }
        return null;
    }
    
    // Добавить ресурс на карту
    addResource(x, y, type, amount, richness) {
        const resource = new Resource(type, x, y, amount, richness);
        this.tiles[y][x].resource = resource;
        this.resourceManager.addResource(resource);
        return resource;
    }
    
    // Спавн начальных ресурсов для улья
    spawnStartingResources(hiveX, hiveY) {
        // Бедная жила Био Массы рядом с ульем
        const biomassX = hiveX + Utils.randomInt(3, 6);
        const biomassY = hiveY + Utils.randomInt(3, 6);
        this.addResource(biomassX, biomassY, ResourceType.BIOMASS, 100, 1);
        
        // Бедная жила Био Плазмы рядом с ульем
        const bioplasmaX = hiveX - Utils.randomInt(3, 6);
        const bioplasmaY = hiveY - Utils.randomInt(3, 6);
        this.addResource(bioplasmaX, bioplasmaY, ResourceType.BIOPLASMA, 50, 1);
    }
    
    // Обновление карты
    update() {
        this.resourceManager.update();
    }
    
    // Получить все ресурсы
    getAllResources() {
        return this.resourceManager.getAllResources();
    }
}
