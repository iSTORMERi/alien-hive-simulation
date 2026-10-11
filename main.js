// Главный файл игры

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.mapWidth = 150;
        this.mapHeight = 150;
        this.tileSize = 8;
        
        // Установка размера canvas
        this.canvas.width = this.mapWidth * this.tileSize;
        this.canvas.height = this.mapHeight * this.tileSize;
        
        // Создание карты
        this.gameMap = new GameMap(this.mapWidth, this.mapHeight, this.tileSize);
        
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
        
        // Обработчики кнопок
        document.getElementById('startBtn').addEventListener('click', () => this.start());
        document.getElementById('pauseBtn').addEventListener('click', () => this.pause());
        
        // Первый рендер
        this.renderer.render(this.hives);
    }
    
    // Создание 4 ульев в углах карты
    initializeHives() {
        const hivePositions = [
            { x: 5, y: 5 },                           // Верхний левый
            { x: this.mapWidth - 8, y: 5 },           // Верхний правый
            { x: 5, y: this.mapHeight - 8 },          // Нижний левый
            { x: this.mapWidth - 8, y: this.mapHeight - 8 }  // Нижний правый
        ];
        
        hivePositions.forEach((pos, index) => {
            const hive = new Hive(pos.x, pos.y, index);
            this.hives.push(hive);
            
            // Создание структуры улья
            const hiveStructure = new Hive(pos.x, pos.y, index);
            hive.structures.push(hiveStructure);
            
            // Создание королевы
            hive.createQueen();
            
            // Спавн начальных ресурсов
            this.gameMap.spawnStartingResources(pos.x, pos.y);
        });
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
        this.update(deltaTime);
        
        // Рендер
        this.renderer.render(this.hives);
        
        // Следующий кадр
        requestAnimationFrame(() => this.gameLoop());
    }
    
    // Обновление логики игры
    update(deltaTime) {
        // Обновление карты (регенерация ресурсов)
        this.gameMap.update();
        
        // Обновление ульев
        this.hives.forEach(hive => hive.update());
    }
}

// Запуск игры после загрузки страницы
window.addEventListener('load', () => {
    new Game();
});
