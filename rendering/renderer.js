// Рендерер игры

class Renderer {
    constructor(canvas, gameMap) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.gameMap = gameMap;
        this.tileSize = gameMap.tileSize;
        this.lastUIUpdate = 0;
        this.uiUpdateInterval = 500; // Обновляем UI каждые 500мс
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
                    color = '#8B4513';
                    break;
                case ResourceType.BIOPLASMA:
                    color = '#00FF00';
                    break;
                case ResourceType.CHITIN:
                    color = '#708090';
                    break;
                case ResourceType.NEURO_CRYSTAL:
                    color = '#9370DB';
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
    
    // Отрисовка феромонов
    renderPheromones(pheromoneSystem) {
        const pheromones = pheromoneSystem.getAllPheromones();
        
        pheromones.forEach(p => {
            const pixelPos = Utils.tileToPixel(p.x, p.y, this.tileSize);
            
            let color;
            switch(p.type) {
                case PheromoneType.RESOURCE:
                    switch(p.resourceType) {
                        case ResourceType.BIOMASS: color = '#8B4513'; break;
                        case ResourceType.BIOPLASMA: color = '#00FF00'; break;
                        case ResourceType.CHITIN: color = '#708090'; break;
                        case ResourceType.NEURO_CRYSTAL: color = '#9370DB'; break;
                        default: color = '#FFFF00';
                    }
                    break;
                case PheromoneType.DANGER:
                    color = '#FF0000';
                    break;
                case PheromoneType.HOME:
                    color = '#00BFFF';
                    break;
            }
            
            this.ctx.globalAlpha = p.intensity * 0.5;
            
            this.ctx.fillStyle = color;
            this.ctx.fillRect(
                pixelPos.x,
                pixelPos.y,
                this.tileSize,
                this.tileSize
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
                
                this.ctx.fillStyle = structure.color;
                this.ctx.globalAlpha = 0.6;
                this.ctx.fillRect(
                    pixelPos.x,
                    pixelPos.y,
                    sizeInPixels,
                    sizeInPixels
                );
                this.ctx.globalAlpha = 1.0;
                
                this.ctx.strokeStyle = structure.color;
                this.ctx.lineWidth = 1;
                this.ctx.strokeRect(
                    pixelPos.x,
                    pixelPos.y,
                    sizeInPixels,
                    sizeInPixels
                );
                
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
                
                if (structure.hp < structure.maxHP) {
                    const barWidth = sizeInPixels;
                    const barHeight = 2;
                    const barX = pixelPos.x;
                    const barY = pixelPos.y - 4;
                    const hpPercent = structure.hp / structure.maxHP;
                    
                    this.ctx.fillStyle = '#333333';
                    this.ctx.fillRect(barX, barY, barWidth, barHeight);
                    
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
                
                let size;
                switch(unit.type) {
                    case 'nurse': size = 2; break;
                    case 'worker': size = 3; break;
                    case 'scout': size = 3.5; break;
                    case 'soldier': size = 4; break;
                    case 'queen': size = 5; break;
                    default: size = 3;
                }
                
                this.ctx.fillStyle = hive.color;
                
                this.ctx.beginPath();
                this.ctx.arc(pixelX, pixelY, size, 0, Math.PI * 2);
                this.ctx.fill();
                
                this.ctx.strokeStyle = 'rgba(0,0,0,0.5)';
                this.ctx.lineWidth = 0.5;
                this.ctx.stroke();
                
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
            
            hive.larvae.forEach(larva => {
                const pixelX = larva.x * this.tileSize;
                const pixelY = larva.y * this.tileSize;
                
                this.ctx.fillStyle = hive.color;
                this.ctx.globalAlpha = 0.4;
                this.ctx.beginPath();
                this.ctx.arc(pixelX, pixelY, 2, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.globalAlpha = 1.0;
                
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
    
    // Обновление UI панели со статистикой
    updateUI(hives, currentTime) {
        if (currentTime - this.lastUIUpdate < this.uiUpdateInterval) {
            return;
        }
        this.lastUIUpdate = currentTime;
        
        const container = document.getElementById('hivesInfo');
        if (!container) return;
        
        let html = '';
        
        hives.forEach(hive => {
            // Подсчёт юнитов по типам
            const unitCounts = {
                queen: 0,
                worker: 0,
                nurse: 0,
                scout: 0,
                soldier: 0
            };
            
            hive.units.forEach(u => {
                if (unitCounts[u.type] !== undefined) {
                    unitCounts[u.type]++;
                }
            });
            
            html += `
                <div class="hive-info" style="border-left-color: ${hive.color};">
                    <h3 style="color: ${hive.color};">Улей #${hive.id}</h3>
                    <div class="resource-line">
                        <span>🟤 Био Масса:</span>
                        <span>${Math.floor(hive.resources[ResourceType.BIOMASS])} / ${hive.solidStorageCapacity}</span>
                    </div>
                    <div class="resource-line">
                        <span>🟢 Био Плазма:</span>
                        <span>${Math.floor(hive.resources[ResourceType.BIOPLASMA])} / ${hive.liquidStorageCapacity}</span>
                    </div>
                    <div class="resource-line">
                        <span>⚪ Хитин:</span>
                        <span>${Math.floor(hive.resources[ResourceType.CHITIN])} / ${hive.solidStorageCapacity}</span>
                    </div>
                    <div class="resource-line">
                        <span>🟣 Нейро:</span>
                        <span>${Math.floor(hive.resources[ResourceType.NEURO_CRYSTAL])} / ${hive.solidStorageCapacity}</span>
                    </div>
                    <div class="units-line">
                        👑 ${unitCounts.queen} | 👷 ${unitCounts.worker} | 🍼 ${unitCounts.nurse} | 🔭 ${unitCounts.scout} | ⚔️ ${unitCounts.soldier} | 🥚 ${hive.larvae.length}
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }
    
    // Полная отрисовка
    render(hives, pheromoneSystem) {
        this.clear();
        this.renderMap();
        this.renderResources();
        this.renderPheromones(pheromoneSystem);
        this.renderStructures(hives);
        this.renderUnits(hives);
        
        // Обновляем UI
        this.updateUI(hives, Date.now());
    }
}
