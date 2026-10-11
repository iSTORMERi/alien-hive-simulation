// Вспомогательные функции

class Utils {
    // Генерация случайного числа в диапазоне
    static random(min, max) {
        return Math.random() * (max - min) + min;
    }
    
    // Генерация случайного целого числа в диапазоне
    static randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    
    // Расстояние между двумя точками (евклидово)
    static distance(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    // Расстояние между двумя точками (Манхэттенское)
    static manhattanDistance(x1, y1, x2, y2) {
        return Math.abs(x2 - x1) + Math.abs(y2 - y1);
    }
    
    // Конвертация координат тайла в пиксели
    static tileToPixel(tileX, tileY, tileSize) {
        return {
            x: tileX * tileSize,
            y: tileY * tileSize
        };
    }
    
    // Конвертация пикселей в координаты тайла
    static pixelToTile(pixelX, pixelY, tileSize) {
        return {
            x: Math.floor(pixelX / tileSize),
            y: Math.floor(pixelY / tileSize)
        };
    }
    
    // Проверка, находятся ли две точки в радиусе
    static inRadius(x1, y1, x2, y2, radius) {
        return this.distance(x1, y1, x2, y2) <= radius;
    }
}
