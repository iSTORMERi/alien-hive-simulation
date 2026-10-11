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
        // Проверка, что тайл свободен
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return null;
        if (this.tiles[y][x].resource) return null;
        
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
    
    // Генерация дополнительных ресурсов по всей карте
    generateResources(hivePositions) {
        // Количество жил каждого типа
        const resourceConfig = [
            { type: ResourceType.BIOMASS, count: 40, minRichness: 1, maxRichness: 3, minAmount: 80, maxAmount: 300 },
            { type: ResourceType.BIOPLASMA, count: 25, minRichness: 1, maxRichness: 2, minAmount: 40, maxAmount: 150 },
            { type: ResourceType.CHITIN, count: 15, minRichness: 1, maxRichness: 2, minAmount: 50, maxAmount: 200 },
            { type: ResourceType.NEURO_CRYSTAL, count: 4, minRichness: 1, maxRichness: 1, minAmount: 30, maxAmount: 80 }
        ];
        
        resourceConfig.forEach(config => {
            let placed = 0;
            let attempts = 0;
            const maxAttempts = config.count * 20;
            
            while (placed < config.count && attempts < maxAttempts) {
                attempts++;
                
                // Случайная позиция
                const x = Utils.randomInt(10, this.width - 10);
                const y = Utils.randomInt(10, this.height - 10);
                
                // Проверка, что не слишком близко к ульям (минимум 15 тайлов)
                let tooCloseToHive = false;
                hivePositions.forEach(pos => {
                    if (Utils.distance(x, y, pos.x + 1, pos.y + 1) < 15) {
                        tooCloseToHive = true;
                    }
                });
                
                if (tooCloseToHive) continue;
                
                // Проверка, что тайл свободен
                if (this.tiles[y][x].resource) continue;
                
                // Генерация параметров
                const richness = Utils.randomInt(config.minRichness, config.maxRichness);
                const amount = Utils.random(config.minAmount, config.maxAmount);
                
                // Создаём жилу
                this.addResource(x, y, config.type, amount, richness);
                placed++;
                
                // Иногда добавляем соседние тайлы той же жилы
                if (Math.random() < 0.5) {
                    const neighbors = [
                        { dx: 1, dy: 0 },
                        { dx: -1, dy: 0 },
                        { dx: 0, dy: 1 },
                        { dx: 0, dy: -1 }
                    ];
                    
                    const extraCount = Utils.randomInt(0, 2);
                    for (let i = 0; i < extraCount; i++) {
                        const n = neighbors[Utils.randomInt(0, neighbors.length - 1)];
                        const nx = x + n.dx;
                        const ny = y + n.dy;
                        
                        if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
                            if (!this.tiles[ny][nx].resource) {
                                this.addResource(nx, ny, config.type, amount * 0.7, richness);
                            }
                        }
                    }
                }
            }
        });
        
        console.log(`Сгенерировано ресурсов: ${this.resourceManager.resources.length}`);
    }
    
    // Разместить структуру на карте
    placeStructure(structure) {
        const size = structure.size;
        
        // Проверка, что структура помещается на карте
        if (structure.x < 0 || structure.x + size > this.width ||
            structure.y < 0 || structure.y + size > this.height) {
            return false;
        }
        
        // Проверка, что все тайлы свободны
        for (let dy = 0; dy < size; dy++) {
            for (let dx = 0; dx < size; dx++) {
                const tileX = structure.x + dx;
                const tileY = structure.y + dy;
                
                if (this.tiles[tileY][tileX].structure) {
                    return false; // Уже есть структура
                }
            }
        }
        
        // Размещение структуры
        for (let dy = 0; dy < size; dy++) {
            for (let dx = 0; dx < size; dx++) {
                const tileX = structure.x + dx;
                const tileY = structure.y + dy;
                this.tiles[tileY][tileX].structure = structure;
            }
        }
        
        return true;
    }
    
    // Найти место для строительства рядом с ульем
    findConstructionSpot(hiveX, hiveY, structureSize) {
        // Ищем свободное место в радиусе 10 тайлов от улья
        const searchRadius = 10;
        
        for (let radius = 4; radius <= searchRadius; radius++) {
            for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
                const x = Math.floor(hiveX + Math.cos(angle) * radius);
                const y = Math.floor(hiveY + Math.sin(angle) * radius);
                
                // Проверка, что структура помещается
                if (x < 0 || x + structureSize > this.width ||
                    y < 0 || y + structureSize > this.height) {
                    continue;
                }
                
                // Проверка, что все тайлы свободны
                let free = true;
                for (let dy = 0; dy < structureSize; dy++) {
                    for (let dx = 0; dx < structureSize; dx++) {
                        const tileX = x + dx;
                        const tileY = y + dy;
                        
                        if (this.tiles[tileY][tileX].structure || this.tiles[tileY][tileX].resource) {
                            free = false;
                            break;
                        }
                    }
                    if (!free) break;
                }
                
                if (free) {
                    return { x: x, y: y };
                }
            }
        }
        
        return null; // Не нашли место
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
