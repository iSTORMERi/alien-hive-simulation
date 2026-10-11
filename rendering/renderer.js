// Рендерер игры

class Renderer {
    constructor(canvas, gameMap) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.gameMap = gameMap;
        this.tileSize = gameMap.tileSize;
    }
    
    // Очистка canvas
    clear() {
        this.ctx.fillStyle = '#0a0a0a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    // Отрисовка сетки карты
    renderMap() {
        this.ctx.strokeStyle = '#111111';
        this.ctx.lineWidth = 0.3;
        
        // Рисуем сетку каждые 10 тайлов, чтобы не перегружать
        for (let x = 0; x <= this.gameMap.width; x += 10) {
            this.ctx.beginPath();
            this.ctx.moveTo(x * this.tileSize, 0);
            this.ctx.lineTo(x * this.tileSize, this.canvas.height);
            this.ctx.stroke();
        }
        
        for (let y = 0; y <= this.gameMap.height; y += 10) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y * this.tileSize);
            this.ctx.lineTo(this.canvas.width, y * this.tileSize);
            this.ctx.stroke();
        }
    }
    
    // Отрисовка ресурсов
    renderResources() {
        const resources = this.gameMap.getAllResources();
        
        resources.forEach(resource => {
            const pixelPos = Utils.tileToPixel(resource.x, resource.y, this.tileSize);
            
            let color;
            switch(resource.type) {
                case ResourceType.BIOMASS:
                    color = '#8B4513'; // Коричневый
                    break;
                case ResourceType.BIOPLASMA:
                    color = '#00FF00'; // Зеленый
                    break;
                case ResourceType.CHITIN:
                    color = '#708090'; // Серый
                    break;
                case ResourceType.NEURO_CRYSTAL:
                    color = '#9370DB'; // Фиолетовый
                    break;
            }
            
            const intensity = resource.amount / resource.maxAmount;
            this.ctx.globalAlpha = 0.3 + intensity * 0.7;
            
            this.ctx.fillStyle = color;
            this.ctx.fillRect(
                pixelPos.x + 1,
                pixelPos.y + 1,
                this.tileSize - 2,
                this.tileSize - 2
            );
            
            this.ctx.globalAlpha = 1.0;
        });
    }
    
    // Отрисовка структур улья
    renderStructures(hives) {
        hives.forEach(hive => {
            hive.structures.forEach(structure => {
                const pixelPos = Utils.tileToPixel(structure.x, structure.y, this.tileSize);
                const sizeInPixels = structure.size * this.tileSize;
                
                // Основной цвет структуры — цвет улья
                this.ctx.fillStyle = structure.color;
                this.ctx.globalAlpha = 0.6;
                this.ctx.fillRect(
                    pixelPos.x,
                    pixelPos.y,
                    sizeInPixels,
                    sizeInPixels
                );
                this.ctx.globalAlpha = 1.0;
                
                // Обводка
                this.ctx.strokeStyle = structure.color;
                this.ctx.lineWidth = 1;
                this.ctx.strokeRect(
                    pixelPos.x,
                    pixelPos.y,
                    sizeInPixels,
                    sizeInPixels
                );
                
                // Иконка/символ внутри структуры
                this.ctx.fillStyle = '#ffffff';
                this.ctx.font = '10px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                
                let icon = '';
                switch(structure.type) {
                    case 'hive':
                        icon = '👑';
                        this.ctx.font = '14px Arial';
                        break;
                    case 'storage_solid':
                        icon = '📦';
                        break;
                    case 'storage_liquid':
                        icon = '💧';
                        break;
                    case 'biomass_farm':
                        icon = '🌿';
                        break;
                    case 'incubator':
                        icon = '🥚';
                        break;
                }
                
                this.ctx.fillText(
                    icon,
                    pixelPos.x + sizeInPixels / 2,
                    pixelPos.y + sizeInPixels / 2
                );
                
                // Полоска HP (если структура повреждена)
                if (structure.hp < structure.maxHP) {
                    const barWidth = sizeInPixels;
                    const barHeight = 2;
                    const barX = pixelPos.x;
                    const barY = pixelPos.y - 4;
                    const hpPercent = structure.hp / structure.maxHP;
                    
                    // Фон полоски
                    this.ctx.fillStyle = '#333333';
                    this.ctx.fillRect(barX, barY, barWidth, barHeight);
                    
                    // Сама полоска
                    this.ctx.fillStyle = hpPercent > 0.5 ? '#00FF00' : (hpPercent > 0.25 ? '#FFFF00' : '#FF0000');
                    this.ctx.fillRect(barX, barY, barWidth * hpPercent, barHeight);
                }
            });
        });
    }
    
    // Отрисовка юнитов
    renderUnits(hives) {
        hives.forEach(hive => {
            hive.units.forEach(unit => {
                const pixelX = unit.x * this.tileSize;
                const pixelY = unit.y * this.tileSize;
                
                // Размер зависит от типа юнита
                let size;
                switch(unit.type) {
                    case 'nurse': size = 2; break;    // Самый маленький
                    case 'worker': size = 3; break;    // Средний
                    case 'scout': size = 3.5; break;   // Чуть больше рабочего
                    case 'soldier': size = 4; break;   // Самый большой
                    case 'queen': size = 5; break;     // Королева
                    default: size = 3;
                }
                
                // Цвет юнита = цвет улья
                this.ctx.fillStyle = hive.color;
                
                // Рисуем кружок
                this.ctx.beginPath();
                this.ctx.arc(pixelX, pixelY, size, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Тёмная обводка для контраста
                this.ctx.strokeStyle = 'rgba(0,0,0,0.5)';
                this.ctx.lineWidth = 0.5;
                this.ctx.stroke();
                
                // Если юнит несет ресурс, показать жёлтый индикатор
                if (unit.carrying && unit.carrying.amount > 0) {
                    let resColor;
                    switch(unit.carrying.type) {
                        case ResourceType.BIOMASS: resColor = '#8B4513'; break;
                        case ResourceType.BIOPLASMA: resColor = '#00FF00'; break;
                        case ResourceType.CHITIN: resColor = '#708090'; break;
                        case ResourceType.NEURO_CRYSTAL: resColor = '#9370DB'; break;
                        default: resColor = '#FFFF00';
                    }
                    
                    this.ctx.fillStyle = resColor;
                    this.ctx.beginPath();
                    this.ctx.arc(pixelX, pixelY - size - 2, 1.5, 0, Math.PI * 2);
                    this.ctx.fill();
                }
            });
            
            // Отрисовка личинок
            hive.larvae.forEach(larva => {
                const pixelX = larva.x * this.tileSize;
                const pixelY = larva.y * this.tileSize;
                
                // Личинки — полупрозрачные, цвет улья
                this.ctx.fillStyle = hive.color;
                this.ctx.globalAlpha = 0.4;
                this.ctx.beginPath();
                this.ctx.arc(pixelX, pixelY, 2, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.globalAlpha = 1.0;
                
                // Прогресс-бар развития личинки
                const barWidth = 6;
                const barHeight = 1;
                const barX = pixelX - barWidth / 2;
                const barY = pixelY + 3;
                const progress = larva.developmentProgress / larva.requiredDevelopment;
                
                this.ctx.fillStyle = '#333333';
                this.ctx.fillRect(barX, barY, barWidth, barHeight);
                
                this.ctx.fillStyle = '#00FFFF';
                this.ctx.fillRect(barX, barY, barWidth * Math.min(progress, 1), barHeight);
            });
        });
    }
    
    // Полная отрисовка
    render(hives) {
        this.clear();
        this.renderMap();
        this.renderResources();
        this.renderStructures(hives);  // <-- НОВОЕ: отрисовка структур
        this.renderUnits(hives);
    }
}
