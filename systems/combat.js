// Боевая система

class CombatSystem {
    constructor() {
        this.attackCooldown = 1000;
        this.visionRange = 10;
        this.nurseVisionRange = 5;
    }
    
    update(deltaTime, hives, pheromoneSystem) {
        hives.forEach(hive => {
            hive.units.forEach(unit => {
                if (unit.isDead()) return;
                
                switch(unit.type) {
                    case 'soldier':
                        this.updateSoldier(unit, hive, hives, deltaTime, pheromoneSystem);
                        break;
                    case 'scout':
                        this.updateScout(unit, hive, hives, deltaTime, pheromoneSystem);
                        break;
                    case 'worker':
                        this.updateWorker(unit, hive, hives, deltaTime, pheromoneSystem);
                        break;
                    case 'nurse':
                        this.updateNurse(unit, hive, hives, deltaTime, pheromoneSystem);
                        break;
                    case 'queen':
                        this.updateQueen(unit, hive, hives, deltaTime, pheromoneSystem);
                        break;
                }
            });
        });
        
        this.handleDeaths(hives, pheromoneSystem);
    }
    
    // Найти ближайшего врага (ВСЕХ - включая рабочих)
    findNearestEnemy(unit, hive, hives, maxDistance = null) {
        if (maxDistance === null) {
            maxDistance = this.visionRange;
        }
        
        let nearestEnemy = null;
        let nearestDistance = Infinity;
        
        hives.forEach(otherHive => {
            if (otherHive.id === hive.id) return;
            
            otherHive.units.forEach(enemy => {
                if (enemy.isDead()) return;
                
                const dist = Utils.distance(unit.x, unit.y, enemy.x, enemy.y);
                if (dist <= maxDistance && dist < nearestDistance) {
                    nearestDistance = dist;
                    nearestEnemy = enemy;
                }
            });
            
            otherHive.structures.forEach(structure => {
                if (structure.isDestroyed()) return;
                
                const structureCenterX = structure.x + structure.size / 2;
                const structureCenterY = structure.y + structure.size / 2;
                const dist = Utils.distance(unit.x, unit.y, structureCenterX, structureCenterY);
                
                if (dist <= maxDistance && dist < nearestDistance) {
                    nearestDistance = dist;
                    nearestEnemy = structure;
                }
            });
        });
        
        return nearestEnemy;
    }
    
    // Обновление солдата
    updateSoldier(unit, hive, hives, deltaTime, pheromoneSystem) {
        const enemy = this.findNearestEnemy(unit, hive, hives);
        
        if (enemy) {
            unit.state = 'attacking';
            unit.target = enemy;
            
            const enemyX = enemy.x !== undefined ? enemy.x : enemy.x + enemy.size / 2;
            const enemyY = enemy.y !== undefined ? enemy.y : enemy.y + enemy.size / 2;
            
            const dist = unit.moveTowards(enemyX, enemyY, deltaTime);
            
            if (dist <= 1.5) {
                this.tryAttack(unit, enemy, pheromoneSystem);
            }
        } else {
            const dangerPheromone = pheromoneSystem.findNearestDangerPheromone(
                unit.x, unit.y, unit.hiveId
            );
            
            if (dangerPheromone && dangerPheromone.intensity > 0.3) {
                unit.state = 'patrolling';
                unit.moveTowards(dangerPheromone.x, dangerPheromone.y, deltaTime);
            } else {
                unit.state = 'guarding';
                if (!unit.patrolTarget) {
                    const angle = Utils.random(0, Math.PI * 2);
                    const radius = Utils.random(5, 10);
                    unit.patrolTarget = {
                        x: hive.x + 1 + Math.cos(angle) * radius,
                        y: hive.y + 1 + Math.sin(angle) * radius
                    };
                }
                
                const dist = unit.moveTowards(unit.patrolTarget.x, unit.patrolTarget.y, deltaTime);
                if (dist <= 1) {
                    unit.patrolTarget = null;
                }
                
                unit.depositPheromone(pheromoneSystem, PheromoneType.HOME, 0.1);
            }
        }
    }
    
    // Обновление разведчика
    updateScout(unit, hive, hives, deltaTime, pheromoneSystem) {
        const enemy = this.findNearestEnemy(unit, hive, hives);
        
        if (enemy) {
            unit.state = 'fleeing';
            
            const enemyX = enemy.x !== undefined ? enemy.x : enemy.x + enemy.size / 2;
            const enemyY = enemy.y !== undefined ? enemy.y : enemy.y + enemy.size / 2;
            
            const dx = unit.x - enemyX;
            const dy = unit.y - enemyY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > 0) {
                const fleeX = unit.x + (dx / dist) * 10;
                const fleeY = unit.y + (dy / dist) * 10;
                
                const targetX = Math.max(1, Math.min(window.game.mapWidth - 1, fleeX));
                const targetY = Math.max(1, Math.min(window.game.mapHeight - 1, fleeY));
                
                unit.moveTowards(targetX, targetY, deltaTime);
            }
            
            pheromoneSystem.depositPheromone(
                PheromoneType.DANGER,
                unit.x,
                unit.y,
                0.8,
                unit.hiveId
            );
            
            return;
        }
        
        switch(unit.state) {
            case 'fleeing':
                const closestEnemy = this.findNearestEnemy(unit, hive, hives, 15);
                if (!closestEnemy) {
                    unit.state = 'exploring';
                } else {
                    const enemyX = closestEnemy.x !== undefined ? closestEnemy.x : closestEnemy.x + closestEnemy.size / 2;
                    const enemyY = closestEnemy.y !== undefined ? closestEnemy.y : closestEnemy.y + closestEnemy.size / 2;
                    const dx = unit.x - enemyX;
                    const dy = unit.y - enemyY;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist > 0) {
                        const fleeX = Math.max(1, Math.min(window.game.mapWidth - 1, unit.x + (dx / dist) * 10));
                        const fleeY = Math.max(1, Math.min(window.game.mapHeight - 1, unit.y + (dy / dist) * 10));
                        unit.moveTowards(fleeX, fleeY, deltaTime);
                    }
                }
                break;
            case 'exploring':
                if (!unit.exploreTarget) {
                    unit.exploreTarget = {
                        x: Utils.random(10, window.game.mapWidth - 10),
                        y: Utils.random(10, window.game.mapHeight - 10)
                    };
                }
                
                unit.depositPheromone(pheromoneSystem, PheromoneType.HOME, 0.05);
                
                const dist = unit.moveTowards(unit.exploreTarget.x, unit.exploreTarget.y, deltaTime);
                if (dist <= 2) {
                    unit.exploreTarget = null;
                }
                
                const resource = window.game.gameMap.resourceManager.getResourceAt(
                    Math.floor(unit.x),
                    Math.floor(unit.y)
                );
                
                if (resource && resource.hasResource()) {
                    unit.depositPheromone(
                        pheromoneSystem,
                        PheromoneType.RESOURCE,
                        0.5,
                        resource.type
                    );
                }
                break;
            case 'returning':
                const hiveX = hive.x + 1;
                const hiveY = hive.y + 1;
                const d = unit.moveTowards(hiveX, hiveY, deltaTime);
                if (d <= 2) {
                    unit.state = 'exploring';
                }
                break;
        }
    }
    
    // Обновление рабочего - ИСПРАВЛЕННАЯ ЛОГИКА
    updateWorker(unit, hive, hives, deltaTime, pheromoneSystem) {
        const isBusy = (unit.state === 'returning' || 
                        unit.state === 'gathering' || 
                        unit.state === 'building');
        
        if (!isBusy) {
            const enemy = this.findNearestEnemy(unit, hive, hives, 5);
            
            if (enemy) {
                unit.state = 'fleeing';
                
                const hiveX = hive.x + 1;
                const hiveY = hive.y + 1;
                unit.moveTowards(hiveX, hiveY, deltaTime);
                
                pheromoneSystem.depositPheromone(
                    PheromoneType.DANGER,
                    unit.x,
                    unit.y,
                    0.5,
                    unit.hiveId
                );
                return;
            }
        }
        
        switch(unit.state) {
            case 'fleeing':
                const closestEnemy = this.findNearestEnemy(unit, hive, hives, 10);
                if (!closestEnemy) {
                    unit.state = 'idle';
                    unit.targetResource = null;
                } else {
                    const hiveX = hive.x + 1;
                    const hiveY = hive.y + 1;
                    unit.moveTowards(hiveX, hiveY, deltaTime);
                }
                break;
                
            case 'idle':
                this.workerFindResource(unit, hive, pheromoneSystem);
                break;
                
            case 'moving_to_resource':
                // ⭐ ИСПРАВЛЕНО: передаём deltaTime правильным порядком
                this.workerMoveToResource(unit, hive, pheromoneSystem, deltaTime);
                break;
                
            case 'gathering':
                this.workerGatherResource(unit, hive, pheromoneSystem, deltaTime);
                break;
                
            case 'returning':
                this.workerReturnToHive(unit, hive, pheromoneSystem, deltaTime);
                break;
                
            case 'moving_to_build':
                this.workerMoveToConstruction(unit, hive, pheromoneSystem, deltaTime);
                break;
                
            case 'building':
                this.workerBuild(unit, hive, pheromoneSystem, deltaTime);
                break;
        }
    }
    
    workerFindResource(unit, hive, pheromoneSystem) {
        const pheromoneTarget = pheromoneSystem.findNearestResourcePheromone(
            unit.x, unit.y, unit.hiveId, null
        );
        
        if (pheromoneTarget && pheromoneTarget.intensity > 0.4) {
            unit.targetX = pheromoneTarget.x;
            unit.targetY = pheromoneTarget.y;
            unit.state = 'moving_to_resource';
            unit.targetResource = null;
            return;
        }
        
        const resources = window.game.gameMap.getAllResources();
        let closest = null;
        let closestDist = Infinity;
        
        resources.forEach(resource => {
            if (resource.hasResource()) {
                const dist = Utils.distance(unit.x, unit.y, resource.x, resource.y);
                if (dist < closestDist) {
                    closestDist = dist;
                    closest = resource;
                }
            }
        });
        
        if (closest) {
            unit.targetResource = closest;
            unit.targetX = closest.x;
            unit.targetY = closest.y;
            unit.state = 'moving_to_resource';
        }
    }
    
    // ⭐ КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ ЗДЕСЬ
    workerMoveToResource(unit, hive, pheromoneSystem, deltaTime) {
        unit.depositPheromone(pheromoneSystem, PheromoneType.HOME, 0.1);
        
        // Используем переданный deltaTime для движения
        const dist = unit.moveTowards(unit.targetX, unit.targetY, deltaTime);
        
        const resource = window.game.gameMap.resourceManager.getResourceAt(
            Math.floor(unit.targetX),
            Math.floor(unit.targetY)
        );
        
        if (resource && resource.hasResource()) {
            unit.targetResource = resource;
            unit.state = 'gathering';
        } else if (dist <= 1) {
            unit.state = 'idle';
            unit.targetResource = null;
        }
    }
    
    workerGatherResource(unit, deltaTime, hive, pheromoneSystem) {
        if (!unit.targetResource || !unit.targetResource.hasResource()) {
            unit.state = 'idle';
            unit.targetResource = null;
            return;
        }
        
        if (unit.carrying && unit.carrying.amount >= unit.carryCapacity) {
            unit.state = 'returning';
            unit.targetX = hive.x + 1;
            unit.targetY = hive.y + 1;
            return;
        }
        
        const extractAmount = 0.5;
        const extracted = unit.targetResource.extract(extractAmount);
        
        if (extracted > 0) {
            if (!unit.carrying) {
                unit.carrying = {
                    type: unit.targetResource.type,
                    amount: extracted
                };
            } else {
                unit.carrying.amount += extracted;
            }
            
            unit.depositPheromone(
                pheromoneSystem,
                PheromoneType.RESOURCE,
                0.3,
                unit.targetResource.type
            );
            
            if (unit.carrying.amount >= unit.carryCapacity) {
                unit.state = 'returning';
                unit.targetX = hive.x + 1;
                unit.targetY = hive.y + 1;
            }
        }
    }
    
    workerReturnToHive(unit, deltaTime, hive, pheromoneSystem) {
        if (unit.carrying) {
            unit.depositPheromone(
                pheromoneSystem,
                PheromoneType.RESOURCE,
                0.4,
                unit.carrying.type
            );
        }
        
        const hiveX = hive.x + 1;
        const hiveY = hive.y + 1;
        
        const dist = unit.moveTowards(hiveX, hiveY, deltaTime);
        
        if (dist <= 2) {
            if (unit.carrying) {
                hive.addResource(unit.carrying.type, unit.carrying.amount);
                unit.carrying = null;
            }
            unit.state = 'idle';
            unit.targetResource = null;
        }
    }
    
    workerTryToStartConstruction(unit, hive) {
        const priority = hive.getConstructionPriority();
        if (!priority) return false;
        
        const type = priority.type;
        
        let canBuild = false;
        switch(type) {
            case 'storage_solid':
                canBuild = hive.resources[ResourceType.BIOMASS] >= 8 && hive.resources[ResourceType.CHITIN] >= 3;
                break;
            case 'storage_liquid':
                canBuild = hive.resources[ResourceType.BIOMASS] >= 10 && hive.resources[ResourceType.CHITIN] >= 5;
                break;
            case 'incubator':
                canBuild = hive.resources[ResourceType.BIOMASS] >= 10 && hive.resources[ResourceType.CHITIN] >= 5;
                break;
            case 'biomass_farm':
                canBuild = hive.resources[ResourceType.BIOMASS] >= 70 && hive.resources[ResourceType.CHITIN] >= 10;
                break;
        }
        
        if (!canBuild) return false;
        
        const structureSize = this.getStructureSize(type);
        const spot = window.game.gameMap.findConstructionSpot(hive.x, hive.y, structureSize);
        
        if (!spot) return false;
        
        let structure = null;
        switch(type) {
            case 'storage_solid':
                structure = new StorageSolid(spot.x, spot.y, hive.id, hive.color);
                break;
            case 'storage_liquid':
                structure = new StorageLiquid(spot.x, spot.y, hive.id, hive.color);
                break;
            case 'incubator':
                structure = new Incubator(spot.x, spot.y, hive.id, hive.color);
                break;
            case 'biomass_farm':
                structure = new BiomassFarm(spot.x, spot.y, hive.id, hive.color);
                break;
        }
        
        unit.constructionTarget = structure;
        unit.buildProgress = 0;
        unit.targetX = spot.x + structureSize / 2;
        unit.targetY = spot.y + structureSize / 2;
        unit.state = 'moving_to_build';
        
        return true;
    }
    
    getStructureSize(type) {
        switch(type) {
            case 'storage_solid':
            case 'storage_liquid':
            case 'incubator':
                return 2;
            case 'biomass_farm':
                return 3;
            default:
                return 2;
        }
    }
    
    workerMoveToConstruction(unit, deltaTime, hive, pheromoneSystem) {
        if (!unit.constructionTarget) {
            unit.state = 'idle';
            return;
        }
        
        const dist = unit.moveTowards(unit.targetX, unit.targetY, deltaTime);
        if (dist <= 1) {
            unit.state = 'building';
        }
    }
    
    workerBuild(unit, deltaTime, hive, pheromoneSystem) {
        if (!unit.constructionTarget) {
            unit.state = 'idle';
            return;
        }
        
        unit.buildProgress += deltaTime * 20;
        
        if (unit.buildProgress >= unit.buildRequired) {
            const type = unit.constructionTarget.type;
            switch(type) {
                case 'storage_solid':
                    hive.spendResource(ResourceType.BIOMASS, 8);
                    hive.spendResource(ResourceType.CHITIN, 3);
                    break;
                case 'storage_liquid':
                    hive.spendResource(ResourceType.BIOMASS, 10);
                    hive.spendResource(ResourceType.CHITIN, 5);
                    break;
                case 'incubator':
                    hive.spendResource(ResourceType.BIOMASS, 10);
                    hive.spendResource(ResourceType.CHITIN, 5);
                    break;
                case 'biomass_farm':
                    hive.spendResource(ResourceType.BIOMASS, 70);
                    hive.spendResource(ResourceType.CHITIN, 10);
                    break;
            }
            
            window.game.gameMap.placeStructure(unit.constructionTarget);
            hive.buildStructure(type, unit.constructionTarget.x, unit.constructionTarget.y);
            
            unit.constructionTarget = null;
            unit.buildProgress = 0;
            unit.state = 'idle';
        }
    }
    
    updateNurse(unit, hive, hives, deltaTime, pheromoneSystem) {
        const enemy = this.findNearestEnemy(unit, hive, hives, 3);
        
        if (enemy) {
            unit.state = 'defending';
            unit.target = enemy;
            
            const enemyX = enemy.x !== undefined ? enemy.x : enemy.x + enemy.size / 2;
            const enemyY = enemy.y !== undefined ? enemy.y : enemy.y + enemy.size / 2;
            
            const dist = unit.moveTowards(enemyX, enemyY, deltaTime);
            if (dist <= 1.5) {
                this.tryAttack(unit, enemy, pheromoneSystem);
            }
        } else {
            unit.state = 'nursing';
        }
    }
    
    updateQueen(unit, hive, hives, deltaTime, pheromoneSystem) {
        const enemy = this.findNearestEnemy(unit, hive, hives, 2);
        
        if (enemy) {
            unit.state = 'defending';
            unit.target = enemy;
            
            const enemyX = enemy.x !== undefined ? enemy.x : enemy.x + enemy.size / 2;
            const enemyY = enemy.y !== undefined ? enemy.y : enemy.y + enemy.size / 2;
            
            const dist = unit.moveTowards(enemyX, enemyY, deltaTime);
            if (dist <= 1.5) {
                this.tryAttack(unit, enemy, pheromoneSystem);
            }
        } else {
            unit.state = 'idle';
        }
    }
    
    tryAttack(attacker, target, pheromoneSystem) {
        const currentTime = Date.now();
        
        if (!attacker.lastAttackTime) {
            attacker.lastAttackTime = 0;
        }
        
        if (currentTime - attacker.lastAttackTime < this.attackCooldown) {
            return;
        }
        
        target.takeDamage(attacker.damage);
        attacker.lastAttackTime = currentTime;
        
        pheromoneSystem.depositPheromone(
            PheromoneType.DANGER,
            attacker.x,
            attacker.y,
            0.4,
            attacker.hiveId
        );
    }
    
    handleDeaths(hives, pheromoneSystem) {
        hives.forEach(hive => {
            const deadUnits = hive.units.filter(u => u.isDead());
            
            deadUnits.forEach(deadUnit => {
                this.spawnBiomassOnDeath(deadUnit.x, deadUnit.y);
            });
            
            hive.units = hive.units.filter(u => !u.isDead());
            
            const destroyedStructures = hive.structures.filter(s => s.isDestroyed());
            
            destroyedStructures.forEach(structure => {
                this.spawnBiomassOnDeath(
                    structure.x + structure.size / 2,
                    structure.y + structure.size / 2,
                    structure.maxHP / 10
                );
            });
            
            destroyedStructures.forEach(structure => {
                window.game.gameMap.removeStructure(structure);
            });
            
            hive.structures = hive.structures.filter(s => !s.isDestroyed());
        });
    }
    
    spawnBiomassOnDeath(x, y, amount = 5) {
        const tileX = Math.floor(x);
        const tileY = Math.floor(y);
        
        const tile = window.game.gameMap.getTile(tileX, tileY);
        if (tile && !tile.resource) {
            window.game.gameMap.addResource(
                tileX,
                tileY,
                ResourceType.BIOMASS,
                amount,
                1
            );
            return;
        }
        
        const neighbors = [
            { dx: 1, dy: 0 },
            { dx: -1, dy: 0 },
            { dx: 0, dy: 1 },
            { dx: 0, dy: -1 },
            { dx: 1, dy: 1 },
            { dx: -1, dy: -1 },
            { dx: 1, dy: -1 },
            { dx: -1, dy: 1 }
        ];
        
        for (const n of neighbors) {
            const nx = tileX + n.dx;
            const ny = tileY + n.dy;
            const neighborTile = window.game.gameMap.getTile(nx, ny);
            
            if (neighborTile && !neighborTile.resource) {
                window.game.gameMap.addResource(
                    nx,
                    ny,
                    ResourceType.BIOMASS,
                    amount,
                    1
                );
                return;
            }
        }
    }
}
