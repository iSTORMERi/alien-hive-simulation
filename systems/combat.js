// Боевая система

class CombatSystem {
    constructor() {
        this.attackCooldown = 1000; // 1 секунда между атаками
        this.visionRange = 10; // Радиус видимости для обнаружения врагов
        this.nurseVisionRange = 5; // У нянек радиус меньше
    }
    
    // Обновление боевой системы
    update(deltaTime, hives, pheromoneSystem) {
        // Обрабатываем атаки всех юнитов
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
        
        // Обрабатываем смерти
        this.handleDeaths(hives, pheromoneSystem);
    }
    
    // Найти ближайшего врага
    findNearestEnemy(unit, hive, hives, maxDistance = null) {
        if (maxDistance === null) {
            maxDistance = unit.type === 'nurse' ? this.nurseVisionRange : this.visionRange;
        }
        
        let nearestEnemy = null;
        let nearestDistance = Infinity;
        
        hives.forEach(otherHive => {
            if (otherHive.id === hive.id) return; // Не считаем своих
            
            // Проверяем юнитов
            otherHive.units.forEach(enemy => {
                if (enemy.isDead()) return;
                
                const dist = Utils.distance(unit.x, unit.y, enemy.x, enemy.y);
                if (dist <= maxDistance && dist < nearestDistance) {
                    nearestDistance = dist;
                    nearestEnemy = enemy;
                }
            });
            
            // Проверяем структуры
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
        // Проверяем, есть ли враг рядом
        const enemy = this.findNearestEnemy(unit, hive, hives);
        
        if (enemy) {
            // Нашли врага - атакуем
            unit.state = 'attacking';
            unit.target = enemy;
            
            // Двигаемся к врагу
            const enemyX = enemy.x !== undefined ? enemy.x : enemy.x + enemy.size / 2;
            const enemyY = enemy.y !== undefined ? enemy.y : enemy.y + enemy.size / 2;
            
            const dist = unit.moveTowards(enemyX, enemyY, deltaTime);
            
            // Если достаточно близко - атакуем
            if (dist <= 1.5) {
                this.tryAttack(unit, enemy, pheromoneSystem);
            }
        } else {
            // Врагов нет - проверяем феромоны тревоги
            const dangerPheromone = pheromoneSystem.findNearestDangerPheromone(
                unit.x, unit.y, unit.hiveId
            );
            
            if (dangerPheromone && dangerPheromone.intensity > 0.3) {
                // Идём к месту тревоги
                unit.state = 'patrolling';
                unit.moveTowards(dangerPheromone.x, dangerPheromone.y, deltaTime);
            } else {
                // Патрулируем
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
        // Разведчики избегают боя!
        const enemy = this.findNearestEnemy(unit, hive, hives);
        
        if (enemy) {
            // Убегаем от врага!
            unit.state = 'fleeing';
            
            const enemyX = enemy.x !== undefined ? enemy.x : enemy.x + enemy.size / 2;
            const enemyY = enemy.y !== undefined ? enemy.y : enemy.y + enemy.size / 2;
            
            // Направление от врага
            const dx = unit.x - enemyX;
            const dy = unit.y - enemyY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > 0) {
                // Убегаем в противоположную сторону
                const fleeX = unit.x + (dx / dist) * 10;
                const fleeY = unit.y + (dy / dist) * 10;
                
                // Ограничиваем границами карты
                const targetX = Math.max(1, Math.min(window.game.mapWidth - 1, fleeX));
                const targetY = Math.max(1, Math.min(window.game.mapHeight - 1, fleeY));
                
                unit.moveTowards(targetX, targetY, deltaTime);
            }
            
            // Оставляем феромон тревоги!
            pheromoneSystem.depositPheromone(
                PheromoneType.DANGER,
                unit.x,
                unit.y,
                0.8,
                unit.hiveId
            );
            
            return;
        }
        
        // Если не убегаем - обычное поведение разведчика
        switch(unit.state) {
            case 'fleeing':
                // Если убежали достаточно далеко, возвращаемся к исследованию
                const closestEnemy = this.findNearestEnemy(unit, hive, hives, 15);
                if (!closestEnemy) {
                    unit.state = 'exploring';
                } else {
                    // Продолжаем убегать
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
                
                // Если нашли ресурс, оставляем феромон
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
    
    // Обновление рабочего
    updateWorker(unit, hive, hives, deltaTime, pheromoneSystem) {
        // Рабочие не ищут бой, но если враг очень близко - защищаются
        const enemy = this.findNearestEnemy(unit, hive, hives, 3); // Малый радиус
        
        if (enemy) {
            // Враг очень близко - либо убегаем, либо атакуем (если нет солдат)
            const soldiersNearby = hive.units.filter(u => u.type === 'soldier' && !u.isDead() && 
                Utils.distance(u.x, u.y, unit.x, unit.y) < 10).length;
            
            if (soldiersNearby === 0 && Math.random() < 0.5) {
                // Нет солдат рядом - атакуем в отчаянии
                unit.state = 'attacking';
                unit.target = enemy;
                
                const enemyX = enemy.x !== undefined ? enemy.x : enemy.x + enemy.size / 2;
                const enemyY = enemy.y !== undefined ? enemy.y : enemy.y + enemy.size / 2;
                
                const dist = unit.moveTowards(enemyX, enemyY, deltaTime);
                if (dist <= 1.5) {
                    this.tryAttack(unit, enemy, pheromoneSystem);
                }
            } else {
                // Убегаем к улью
                unit.state = 'fleeing';
                const hiveX = hive.x + 1;
                const hiveY = hive.y + 1;
                unit.moveTowards(hiveX, hiveY, deltaTime);
                
                // Оставляем феромон тревоги
                pheromoneSystem.depositPheromone(
                    PheromoneType.DANGER,
                    unit.x,
                    unit.y,
                    0.5,
                    unit.hiveId
                );
            }
            return;
        }
        
        // Если не в бою - обычное поведение рабочего
        switch(unit.state) {
            case 'fleeing':
                // Если убежали, возвращаемся к работе
                const closestEnemy = this.findNearestEnemy(unit, hive, hives, 8);
                if (!closestEnemy) {
                    unit.state = 'idle';
                } else {
                    const hiveX = hive.x + 1;
                    const hiveY = hive.y + 1;
                    unit.moveTowards(hiveX, hiveY, deltaTime);
                }
                break;
            case 'attacking':
                // Если цель мертва, возвращаемся к работе
                if (unit.target && unit.target.isDead && unit.target.isDead()) {
                    unit.state = 'idle';
                    unit.target = null;
                } else if (unit.target) {
                    const enemyX = unit.target.x !== undefined ? unit.target.x : unit.target.x + unit.target.size / 2;
                    const enemyY = unit.target.y !== undefined ? unit.target.y : unit.target.y + unit.target.size / 2;
                    const dist = unit.moveTowards(enemyX, enemyY, deltaTime);
                    if (dist <= 1.5) {
                        this.tryAttack(unit, unit.target, pheromoneSystem);
                    }
                } else {
                    unit.state = 'idle';
                }
                break;
            case 'idle':
                this.workerDecideAction(unit, hive, pheromoneSystem);
                break;
            case 'moving_to_resource':
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
    
    // Рабочий решает, что делать
    workerDecideAction(unit, hive, pheromoneSystem) {
        // Приоритет 1: Строительство
        const constructionPriority = hive.getConstructionPriority();
        if (constructionPriority && Math.random() < 0.3) {
            if (this.workerTryToStartConstruction(unit, hive)) {
                return;
            }
        }
        
        // Приоритет 2: Поиск ресурсов
        this.workerFindResource(unit, hive, pheromoneSystem);
    }
    
    // Рабочий пытается начать строительство
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
    
    workerFindResource(unit, hive, pheromoneSystem) {
        const pheromoneTarget = pheromoneSystem.findNearestResourcePheromone(
            unit.x, unit.y, unit.hiveId, null
        );
        
        if (pheromoneTarget && pheromoneTarget.intensity > 0.3) {
            unit.targetX = pheromoneTarget.x;
            unit.targetY = pheromoneTarget.y;
            unit.state = 'moving_to_resource';
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
    
    workerMoveToResource(unit, deltaTime, hive, pheromoneSystem) {
        unit.depositPheromone(pheromoneSystem, PheromoneType.HOME, 0.1);
        
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
                0.2,
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
                0.3,
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
        }
    }
    
    // Обновление няньки
    updateNurse(unit, hive, hives, deltaTime, pheromoneSystem) {
        // Няньки остаются в гнезде, но защищаются если враг очень близко
        const enemy = this.findNearestEnemy(unit, hive, hives, 3);
        
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
            unit.state = 'nursing';
            // Няньки кормят личинок - это уже обрабатывается в hive.js
        }
    }
    
    // Обновление королевы
    updateQueen(unit, hive, hives, deltaTime, pheromoneSystem) {
        // Королева не двигается, но защищается
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
    
    // Попытка атаки
    tryAttack(attacker, target, pheromoneSystem) {
        const currentTime = Date.now();
        
        if (!attacker.lastAttackTime) {
            attacker.lastAttackTime = 0;
        }
        
        if (currentTime - attacker.lastAttackTime < this.attackCooldown) {
            return;
        }
        
        // Наносим урон
        target.takeDamage(attacker.damage);
        attacker.lastAttackTime = currentTime;
        
        // Оставляем феромон тревоги на месте боя
        pheromoneSystem.depositPheromone(
            PheromoneType.DANGER,
            attacker.x,
            attacker.y,
            0.4,
            attacker.hiveId
        );
    }
    
    // Обработка смертей
    handleDeaths(hives, pheromoneSystem) {
        hives.forEach(hive => {
            // Обрабатываем смерти юнитов
            const deadUnits = hive.units.filter(u => u.isDead());
            
            deadUnits.forEach(deadUnit => {
                // Создаём биомассу на месте смерти
                this.spawnBiomassOnDeath(deadUnit.x, deadUnit.y);
            });
            
            // Удаляем мёртвых юнитов
            hive.units = hive.units.filter(u => !u.isDead());
            
            // Проверяем смерть структур
            const destroyedStructures = hive.structures.filter(s => s.isDestroyed());
            
            destroyedStructures.forEach(structure => {
                // Создаём биомассу на месте разрушенной структуры
                this.spawnBiomassOnDeath(
                    structure.x + structure.size / 2,
                    structure.y + structure.size / 2,
                    structure.maxHP / 10 // Больше HP = больше биомассы
                );
            });
            
            // Удаляем разрушенные структуры из карты
            destroyedStructures.forEach(structure => {
                window.game.gameMap.removeStructure(structure);
            });
            
            // Удаляем разрушенные структуры из улья
            hive.structures = hive.structures.filter(s => !s.isDestroyed());
        });
    }
    
    // Создать биомассу на месте смерти
    spawnBiomassOnDeath(x, y, amount = 5) {
        const tileX = Math.floor(x);
        const tileY = Math.floor(y);
        
        // Проверяем, свободен ли тайл
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
        
        // Если тайл занят, ищем соседний свободный
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
