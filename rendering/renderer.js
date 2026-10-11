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
    
    // Отрисовка карты
    renderMap() {
        // Отрисовка сетки (опционально, для отладки)
        this.ctx.strokeStyle = '#1a1a1a';
        this.ctx.lineWidth = 0.5;
        
        for (let x = 0; x <= this.gameMap.width; x++) {
            this.ctx.beginPath();
            this.ctx.moveTo(x * this.tileSize, 0);
            this.ctx.lineTo(x * this.tileSize, this.canvas.height);
            this.ctx.stroke();
        }
        
        for (let y = 0; y <= this.gameMap.height; y++) {
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
            
            // Цвет зависит от типа ресурса
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
            
            // Интенсивность зависит от количества ресурса
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
    
    // Отрисовка ульев
    renderHives(hives) {
        hives.forEach(hive => {
            const pixelPos = Utils.tileToPixel(hive.x, hive.y, this.tileSize);
            
            // Цвет улья
            this.ctx.fillStyle = hive.color;
            
            // Улей занимает 3x3 тайла
            this.ctx.fillRect(
                pixelPos.x,
                pixelPos.y,
                this.tileSize * 3,
                this.tileSize * 3
            );
            
            // Обводка
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(
                pixelPos.x,
                pixelPos.y,
                this.tileSize * 3,
                this.tileSize * 3
            );
            
            // Текст с номером улья
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '16px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(
                `H${hive.id}`,
                pixelPos.x + (this.tileSize * 3) / 2,
                pixelPos.y + (this.tileSize * 3) / 2
            );
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
                    case 'nurse': size = 4; break;
                    case 'worker': size = 5; break;
                    case 'scout': size = 6; break;
                    case 'soldier': size = 7; break;
                    case 'queen': size = 8; break;
                    default: size = 5;
                }
                
                // Цвет юнита (цвет улья)
                this.ctx.fillStyle = hive.color;
                
                // Рисуем кружок
                this.ctx.beginPath();
                this.ctx.arc(pixelX, pixelY, size, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Обводка
                this.ctx.strokeStyle = '#ffffff';
                this.ctx.lineWidth = 1;
                this.ctx.stroke();
                
                // Если юнит несет ресурс, показать индикатор
                if (unit.carrying) {
                    this.ctx.fillStyle = '#FFFF00';
                    this.ctx.beginPath();
                    this.ctx.arc(pixelX, pixelY - size - 2, 2, 0, Math.PI * 2);
                    this.ctx.fill();
                }
            });
            
            // Отрисовка личинок
            hive.larvae.forEach(larva => {
                const pixelX = larva.x * this.tileSize;
                const pixelY = larva.y * this.tileSize;
                
                this.ctx.fillStyle = hive.color;
                this.ctx.globalAlpha = 0.5;
                this.ctx.beginPath();
                this.ctx.arc(pixelX, pixelY, 3, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.globalAlpha = 1.0;
            });
        });
    }
    
    // Полная отрисовка
    render(hives) {
        this.clear();
        this.renderMap();
        this.renderResources();
        this.renderHives(hives);
        this.renderUnits(hives);
    }
}
