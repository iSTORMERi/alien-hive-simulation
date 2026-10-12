// Главный файл игры

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Логический размер карты
        this.mapWidth = 150;
        this.mapHeight = 150;
        this.baseTileSize = 8;
        this.tileSize = this.baseTileSize;
        
        // Физический размер canvas
        this.canvas.width = this.mapWidth * this.tileSize;
        this.canvas.height = this.mapHeight * this.tileSize;
        
        // Создание карты
        this.gameMap = new GameMap(this.mapWidth, this.mapHeight, this.tileSize);
        
        // Создание системы феромонов
        this.pheromoneSystem = new PheromoneSystem(this.mapWidth, this.mapHeight);
        
        // Создание боевой системы
        this.combatSystem = new CombatSystem();
        
        // Создание рендерера
        this.renderer = new Renderer(this.canvas, this.gameMap);
        
        // Ульи
        this.hives = [];
        
        // Состояние игры
        this.isRunning = false;
        this.startTime = 0;
        this.lastFrameTime = 0;
        this.fps = 0;
        
        // Инициализация
        this.initializeHives();
        
        // Генерация ресурсов по карте
        const hivePositions = [
            { x: 5, y: 5 },
            { x: this.mapWidth - 8, y: 5 },
            { x: 5, y: this.mapHeight - 8 },
            { x: this.mapWidth - 8, y: this.mapHeight - 8 }
        ];
        this.gameMap.generateResources(hivePositions);
        
        // Обработчики кнопок
        document.getElementById('startBtn').addEventListener('click', () => this.start());
        document.getElementById('pauseBtn').addEventListener('click', () => this.pause());
        
        // Обработчики зума
        document.getElementById('zoomInBtn').addEventListener('click', () => this.zoom(1.25));
        document.getElementById('zoomOutBtn').addEventListener('click', () => this.zoom(0.8));
        document.getElementById('zoomResetBtn').addEventListener('click', () => this.resetZoom());
        
        // Первый рендер
        this.renderer.render(this.hives, this.pheromoneSystem);
    }
    
    // Получить цвет улья по его ID
    getHiveColor(id) {
        const colors = ['#FF4444', '#44FF44', '#4444FF', '#FFFF44'];
        return colors[id % colors.length];
    }
    
    // Создание 4 ульев в углах карты
    initializeHives() {
        const hivePositions = [
            { x: 5, y: 5 },
            { x: this.mapWidth - 8, y: 5 },
            { x: 5, y: this.mapHeight - 8 },
            { x: this.mapWidth - 8, y: this.mapHeight - 8 }
        ];
        
        hivePositions.forEach((pos, index) => {
            const color = this.getHiveColor(index);
            
            const hiveManager = new HiveManager(index, pos.x, pos.y, color);
            this.hives.push(hiveManager);
            
            const hiveStructure = new HiveStructure(pos.x, pos.y, index, color);
            hiveManager.structures.push(hiveStructure);
            
            hiveManager.createQueen();
            
            // ⭐ БОЛЬШОЙ начальный запас ресурсов (с запасом!)
            // 6 яиц * 2 биомассы = 12 биомассы нужно для яиц
            // + 6 личинок * 3 биомассы (на развитие) = 18 биомассы
            // + 6 личинок * 3 био плазмы (на развитие) = 18 био плазмы
            // + запас на первые минуты жизни рабочих
            hiveManager.addResource(ResourceType.BIOMASS, 50);      // Было 20, стало 50
            hiveManager.addResource(ResourceType.BIOPLASMA, 30);    // ⭐ НОВОЕ! Было 0, стало 30
            
            this.gameMap.spawnStartingResources(pos.x, pos.y);
        });
    }
    
    // Зум
    zoom(factor) {
        const newTileSize = Math.max(2, Math.min(16, Math.round(this.tileSize * factor)));
        
        if (newTileSize === this.tileSize) return;
        
        this.tileSize = newTileSize;
        this.canvas.width = this.mapWidth * this.tileSize;
        this.canvas.height = this.mapHeight * this.tileSize;
        
        // Обновляем tileSize у карты и рендерера
        this.gameMap.tileSize = this.tileSize;
        this.renderer.tileSize = this.tileSize;
        
        // Перерисовка
        if (!this.isRunning) {
            this.renderer.render(this.hives, this.pheromoneSystem);
        }
    }
    
    // Сброс зума
    resetZoom() {
        this.tileSize = this.baseTileSize;
        this.canvas.width = this.mapWidth * this.tileSize;
        this.canvas.height = this.mapHeight * this.tileSize;
        this.gameMap.tileSize = this.tileSize;
        this.renderer.tileSize = this.tileSize;
        
        if (!this.isRunning) {
            this.renderer.render(this.hives, this.pheromoneSystem);
        }
    }
    
    // Запуск симуляции
    start() {
        if (!this.isRunning) {
            this.isRunning = true;
            this.startTime = Date.now();
            this.lastFrameTime = Date.now();
            this.gameLoop();
        }
    }
    
    // Пауза
    pause() {
        this.isRunning = false;
    }
    
    // Игровой цикл
    gameLoop() {
        if (!this.isRunning) return;
        
        const now = Date.now();
        const deltaTime = (now - this.lastFrameTime) / 1000;
        this.lastFrameTime = now;
        
        // Обновление FPS
        this.fps = Math.round(1 / deltaTime);
        document.getElementById('fps').textContent = `FPS: ${this.fps}`;
        
        // Обновление времени
        const elapsedTime = Math.floor((now - this.startTime) / 1000);
        document.getElementById('time').textContent = `Time: ${elapsedTime}s`;
        
        // Обновление игры
        this.update(deltaTime, now);
        
        // Рендер
        this.renderer.render(this.hives, this.pheromoneSystem);
        
        // Следующий кадр
        requestAnimationFrame(() => this.gameLoop());
    }
    
    // Обновление логики игры
    update(deltaTime, currentTime) {
        this.gameMap.update();
        this.pheromoneSystem.update(deltaTime);
        this.hives.forEach(hive => hive.update(deltaTime, currentTime, this.pheromoneSystem));
        this.combatSystem.update(deltaTime, this.hives, this.pheromoneSystem);
    }
}

// Запуск игры после загрузки страницы
window.addEventListener('load', () => {
    window.game = new Game();
});
