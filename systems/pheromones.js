// Система феромонов

const PheromoneType = {
    RESOURCE: 'resource',     // След к ресурсу
    DANGER: 'danger',         // След тревоги
    HOME: 'home'              // След к дому (для ориентации)
};

class PheromoneSystem {
    constructor(mapWidth, mapHeight) {
        this.width = mapWidth;
        this.height = mapHeight;
        
        // Массивы феромонов для каждого типа
        // Каждый элемент: { intensity: number, hiveId: number, resourceType: string, timestamp: number }
        this.pheromones = {
            [PheromoneType.RESOURCE]: this.createEmptyGrid(),
            [PheromoneType.DANGER]: this.createEmptyGrid(),
            [PheromoneType.HOME]: this.createEmptyGrid()
        };
        
        // Время жизни феромона (5 минут = 300 секунд)
        this.pheromoneLifetime = 300000; // в миллисекундах
        
        // Скорость испарения (интенсивность уменьшается со временем)
        this.evaporationRate = 0.001; // 0.1% за тик
    }
    
    // Создать пустую сетку
    createEmptyGrid() {
        const grid = [];
        for (let y = 0; y < this.height; y++) {
            grid[y] = [];
            for (let x = 0; x < this.width; x++) {
                grid[y][x] = null;
            }
        }
        return grid;
    }
    
    // Оставить феромон
    depositPheromone(type, x, y, intensity, hiveId, resourceType = null) {
        // Проверка границ
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return;
        }
        
        const gridX = Math.floor(x);
        const gridY = Math.floor(y);
        
        if (gridX < 0 || gridX >= this.width || gridY < 0 || gridY >= this.height) {
            return;
        }
        
        const existing = this.pheromones[type][gridY][gridX];
        
        if (existing) {
            // Если феромон уже есть, усиливаем его (но не выше максимума)
            if (existing.hiveId === hiveId) {
                existing.intensity = Math.min(1.0, existing.intensity + intensity);
                existing.timestamp = Date.now();
            }
        } else {
            // Создаём новый феромон
            this.pheromones[type][gridY][gridX] = {
                intensity: intensity,
                hiveId: hiveId,
                resourceType: resourceType,
                timestamp: Date.now()
            };
        }
    }
    
    // Получить феромон в точке
    getPheromone(type, x, y) {
        const gridX = Math.floor(x);
        const gridY = Math.floor(y);
        
        if (gridX < 0 || gridX >= this.width || gridY < 0 || gridY >= this.height) {
            return null;
        }
        
        return this.pheromones[type][gridY][gridX];
    }
    
    // Найти ближайший феромон ресурса определенного типа
    findNearestResourcePheromone(x, y, hiveId, resourceType) {
        let bestPheromone = null;
        let bestDistance = Infinity;
        let bestX = 0;
        let bestY = 0;
        
        // Поиск в радиусе 20 тайлов (можно настроить)
        const searchRadius = 20;
        
        for (let dy = -searchRadius; dy <= searchRadius; dy++) {
            for (let dx = -searchRadius; dx <= searchRadius; dx++) {
                const checkX = Math.floor(x) + dx;
                const checkY = Math.floor(y) + dy;
                
                if (checkX < 0 || checkX >= this.width || checkY < 0 || checkY >= this.height) {
                    continue;
                }
                
                const pheromone = this.pheromones[PheromoneType.RESOURCE][checkY][checkX];
                
                if (pheromone && 
                    pheromone.hiveId === hiveId && 
                    pheromone.resourceType === resourceType &&
                    pheromone.intensity > 0.1) {
                    
                    const distance = Utils.distance(x, y, checkX, checkY);
                    
                    // Учитываем интенсивность (более сильные следы привлекательнее)
                    const score = distance / pheromone.intensity;
                    
                    if (score < bestDistance) {
                        bestDistance = score;
                        bestPheromone = pheromone;
                        bestX = checkX;
                        bestY = checkY;
                    }
                }
            }
        }
        
        if (bestPheromone) {
            return { x: bestX, y: bestY, intensity: bestPheromone.intensity };
        }
        
        return null;
    }
    
    // Испарение феромонов
    evaporate(deltaTime) {
        const currentTime = Date.now();
        
        for (let type in this.pheromones) {
            const grid = this.pheromones[type];
            
            for (let y = 0; y < this.height; y++) {
                for (let x = 0; x < this.width; x++) {
                    const pheromone = grid[y][x];
                    
                    if (pheromone) {
                        // Проверка времени жизни
                        const age = currentTime - pheromone.timestamp;
                        
                        if (age > this.pheromoneLifetime) {
                            // Феромон исчез
                            grid[y][x] = null;
                        } else {
                            // Испарение
                            pheromone.intensity -= this.evaporationRate * deltaTime;
                            
                            if (pheromone.intensity <= 0) {
                                grid[y][x] = null;
                            }
                        }
                    }
                }
            }
        }
    }
    
    // Обновление системы
    update(deltaTime) {
        this.evaporate(deltaTime);
    }
    
    // Получить все феромоны для отрисовки
    getAllPheromones() {
        const result = [];
        
        for (let type in this.pheromones) {
            const grid = this.pheromones[type];
            
            for (let y = 0; y < this.height; y++) {
                for (let x = 0; x < this.width; x++) {
                    const pheromone = grid[y][x];
                    
                    if (pheromone) {
                        result.push({
                            type: type,
                            x: x,
                            y: y,
                            intensity: pheromone.intensity,
                            hiveId: pheromone.hiveId,
                            resourceType: pheromone.resourceType
                        });
                    }
                }
            }
        }
        
        return result;
    }
}
