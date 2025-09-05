// 俄罗斯方块游戏核心逻辑
// 开始游戏代码

// 游戏配置常量
const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;
const BLOCK_SIZE = 30;

// 游戏状态
const GAME_STATES = {
    MENU: 'menu',
    PLAYING: 'playing',
    PAUSED: 'paused',
    GAME_OVER: 'game_over'
};

// 俄罗斯方块形状定义
const TETRIS_PIECES = [
    // I形状 (直线)
    {
        shape: [
            [1, 1, 1, 1]
        ],
        color: '#00f5ff'
    },
    // O形状 (正方形)
    {
        shape: [
            [1, 1],
            [1, 1]
        ],
        color: '#ffff00'
    },
    // T形状
    {
        shape: [
            [0, 1, 0],
            [1, 1, 1]
        ],
        color: '#a000f0'
    },
    // S形状
    {
        shape: [
            [0, 1, 1],
            [1, 1, 0]
        ],
        color: '#00f000'
    },
    // Z形状
    {
        shape: [
            [1, 1, 0],
            [0, 1, 1]
        ],
        color: '#f00000'
    },
    // J形状
    {
        shape: [
            [1, 0, 0],
            [1, 1, 1]
        ],
        color: '#0000f0'
    },
    // L形状
    {
        shape: [
            [0, 0, 1],
            [1, 1, 1]
        ],
        color: '#ff7f00'
    }
];

// 游戏类
class TetrisGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.nextCanvas = document.getElementById('nextCanvas');
        this.nextCtx = this.nextCanvas.getContext('2d');
        
        // 烟花效果
        this.fireworksCanvas = document.getElementById('fireworksCanvas');
        this.fireworksCtx = this.fireworksCanvas.getContext('2d');
        this.fireworks = [];
        this.fireworksActive = false;
        
        // 游戏状态
        this.gameState = GAME_STATES.MENU;
        this.board = [];
        this.currentPiece = null;
        this.nextPiece = null;
        this.score = 0;
        this.level = 1;
        this.lines = 0;
        this.dropTime = 0;
        this.dropInterval = 1000; // 1秒
        
        // 游戏循环
        this.lastTime = 0;
        this.gameLoop = null;
        
        this.initializeBoard();
        this.setupEventListeners();
        this.updateDisplay();
        this.setupFireworksCanvas();
    }

    // 初始化游戏板
    initializeBoard() {
        this.board = [];
        for (let y = 0; y < BOARD_HEIGHT; y++) {
            this.board[y] = [];
            for (let x = 0; x < BOARD_WIDTH; x++) {
                this.board[y][x] = 0;
            }
        }
    }

    // 设置事件监听器
    setupEventListeners() {
        // 按钮事件
        document.getElementById('startBtn').addEventListener('click', () => this.startGame());
        document.getElementById('pauseBtn').addEventListener('click', () => this.togglePause());
        document.getElementById('resetBtn').addEventListener('click', () => this.resetGame());
        document.getElementById('playAgainBtn').addEventListener('click', () => this.resetGame());

        // 键盘事件
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
    }

    // 开始游戏
    startGame() {
        if (this.gameState === GAME_STATES.MENU || this.gameState === GAME_STATES.GAME_OVER) {
            this.resetGame();
        }
        this.gameState = GAME_STATES.PLAYING;
        this.spawnNewPiece();
        this.gameLoop = requestAnimationFrame((time) => this.update(time));
    }

    // 暂停/继续游戏
    togglePause() {
        if (this.gameState === GAME_STATES.PLAYING) {
            this.gameState = GAME_STATES.PAUSED;
            if (this.gameLoop) {
                cancelAnimationFrame(this.gameLoop);
            }
        } else if (this.gameState === GAME_STATES.PAUSED) {
            this.gameState = GAME_STATES.PLAYING;
            this.gameLoop = requestAnimationFrame((time) => this.update(time));
        }
    }

    // 重置游戏
    resetGame() {
        this.gameState = GAME_STATES.MENU;
        this.score = 0;
        this.level = 1;
        this.lines = 0;
        this.dropInterval = 1000;
        this.initializeBoard();
        this.currentPiece = null;
        this.nextPiece = null;
        this.updateDisplay();
        this.draw();
        this.hideGameOverModal();

        if (this.gameLoop) {
            cancelAnimationFrame(this.gameLoop);
        }
    }

    // 生成新方块
    spawnNewPiece() {
        if (!this.nextPiece) {
            this.nextPiece = this.getRandomPiece();
        }

        this.currentPiece = this.nextPiece;
        this.nextPiece = this.getRandomPiece();

        // 检查游戏是否结束
        if (this.checkCollision(this.currentPiece, 0, 0)) {
            this.gameOver();
            return;
        }

        this.drawNextPiece();
    }

    // 获取随机方块
    getRandomPiece() {
        const pieceIndex = Math.floor(Math.random() * TETRIS_PIECES.length);
        const piece = TETRIS_PIECES[pieceIndex];
        return {
            shape: piece.shape,
            color: piece.color,
            x: Math.floor(BOARD_WIDTH / 2) - Math.floor(piece.shape[0].length / 2),
            y: 0
        };
    }

    // 处理键盘输入
    handleKeyPress(e) {
        if (this.gameState !== GAME_STATES.PLAYING) return;

        switch (e.code) {
            case 'ArrowLeft':
                this.movePiece(-1, 0);
                break;
            case 'ArrowRight':
                this.movePiece(1, 0);
                break;
            case 'ArrowDown':
                this.movePiece(0, 1);
                break;
            case 'ArrowUp':
                this.rotatePiece();
                break;
            case 'Space':
                e.preventDefault();
                this.hardDrop();
                break;
        }
    }

    // 移动方块
    movePiece(dx, dy) {
        if (this.checkCollision(this.currentPiece, dx, dy)) {
            if (dy > 0) {
                // 方块落地
                this.placePiece();
                this.clearLines();
                this.spawnNewPiece();
            }
            return false;
        }

        this.currentPiece.x += dx;
        this.currentPiece.y += dy;
        return true;
    }

    // 旋转方块
    rotatePiece() {
        const rotated = this.rotateMatrix(this.currentPiece.shape);
        const originalShape = this.currentPiece.shape;

        this.currentPiece.shape = rotated;

        if (this.checkCollision(this.currentPiece, 0, 0)) {
            // 尝试踢墙
            const kicks = [
                [-1, 0], [1, 0], [0, -1], [-1, -1], [1, -1]
            ];

            let kickSuccess = false;
            for (const kick of kicks) {
                if (!this.checkCollision(this.currentPiece, kick[0], kick[1])) {
                    this.currentPiece.x += kick[0];
                    this.currentPiece.y += kick[1];
                    kickSuccess = true;
                    break;
                }
            }

            if (!kickSuccess) {
                this.currentPiece.shape = originalShape;
            }
        }
    }

    // 矩阵旋转
    rotateMatrix(matrix) {
        const rows = matrix.length;
        const cols = matrix[0].length;
        const rotated = [];

        for (let i = 0; i < cols; i++) {
            rotated[i] = [];
            for (let j = 0; j < rows; j++) {
                rotated[i][j] = matrix[rows - 1 - j][i];
            }
        }

        return rotated;
    }

    // 硬降（瞬间下降）
    hardDrop() {
        while (this.movePiece(0, 1)) {
            this.score += 2; // 硬降奖励分数
        }
    }

    // 检查碰撞
    checkCollision(piece, dx, dy) {
        const newX = piece.x + dx;
        const newY = piece.y + dy;

        for (let y = 0; y < piece.shape.length; y++) {
            for (let x = 0; x < piece.shape[y].length; x++) {
                if (piece.shape[y][x]) {
                    const boardX = newX + x;
                    const boardY = newY + y;

                    // 检查边界
                    if (boardX < 0 || boardX >= BOARD_WIDTH ||
                        boardY >= BOARD_HEIGHT) {
                        return true;
                    }

                    // 检查与已放置方块的碰撞
                    if (boardY >= 0 && this.board[boardY][boardX]) {
                        return true;
                    }
                }
            }
        }

        return false;
    }

    // 放置方块
    placePiece() {
        for (let y = 0; y < this.currentPiece.shape.length; y++) {
            for (let x = 0; x < this.currentPiece.shape[y].length; x++) {
                if (this.currentPiece.shape[y][x]) {
                    const boardX = this.currentPiece.x + x;
                    const boardY = this.currentPiece.y + y;

                    if (boardY >= 0) {
                        this.board[boardY][boardX] = this.currentPiece.color;
                    }
                }
            }
        }
    }

    // 清除完整行
    clearLines() {
        let linesCleared = 0;

        for (let y = BOARD_HEIGHT - 1; y >= 0; y--) {
            if (this.board[y].every(cell => cell !== 0)) {
                this.board.splice(y, 1);
                this.board.unshift(new Array(BOARD_WIDTH).fill(0));
                linesCleared++;
                y++; // 重新检查这一行
            }
        }

        if (linesCleared > 0) {
            this.lines += linesCleared;
            this.updateScore(linesCleared);
            this.updateLevel();
        }
    }

    // 更新分数
    updateScore(linesCleared) {
        const points = [0, 40, 100, 300, 1200];
        this.score += points[linesCleared] * this.level;
    }

    // 更新等级
    updateLevel() {
        const newLevel = Math.floor(this.lines / 10) + 1;
        if (newLevel > this.level) {
            this.level = newLevel;
            this.dropInterval = Math.max(50, 1000 - (this.level - 1) * 50);
        }
    }

    // 游戏结束
    gameOver() {
        this.gameState = GAME_STATES.GAME_OVER;
        if (this.gameLoop) {
            cancelAnimationFrame(this.gameLoop);
        }
        this.showGameOverModal();
    }

    // 显示游戏结束弹窗
    showGameOverModal() {
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('finalLines').textContent = this.lines;
        
        // 检查是否达到高分成就
        if (this.score > 100) {
            document.getElementById('celebrationMessage').style.display = 'block';
            this.startFireworks();
        } else {
            document.getElementById('celebrationMessage').style.display = 'none';
        }
        
        document.getElementById('gameOverModal').style.display = 'block';
    }

    // 隐藏游戏结束弹窗
    hideGameOverModal() {
        document.getElementById('gameOverModal').style.display = 'none';
    }

    // 游戏主循环
    update(currentTime) {
        if (this.gameState !== GAME_STATES.PLAYING) return;

        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;

        this.dropTime += deltaTime;

        if (this.dropTime >= this.dropInterval) {
            this.movePiece(0, 1);
            this.dropTime = 0;
        }

        this.draw();
        this.gameLoop = requestAnimationFrame((time) => this.update(time));
    }

    // 绘制游戏
    draw() {
        // 清空画布
        this.ctx.fillStyle = '#1a202c';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 绘制网格
        this.drawGrid();

        // 绘制已放置的方块
        this.drawBoard();

        // 绘制当前方块
        if (this.currentPiece) {
            this.drawPiece(this.currentPiece);
        }

        // 绘制幽灵方块（预览位置）
        if (this.currentPiece) {
            this.drawGhostPiece();
        }
    }

    // 绘制网格
    drawGrid() {
        this.ctx.strokeStyle = '#2d3748';
        this.ctx.lineWidth = 1;

        for (let x = 0; x <= BOARD_WIDTH; x++) {
            this.ctx.beginPath();
            this.ctx.moveTo(x * BLOCK_SIZE, 0);
            this.ctx.lineTo(x * BLOCK_SIZE, this.canvas.height);
            this.ctx.stroke();
        }

        for (let y = 0; y <= BOARD_HEIGHT; y++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y * BLOCK_SIZE);
            this.ctx.lineTo(this.canvas.width, y * BLOCK_SIZE);
            this.ctx.stroke();
        }
    }

    // 绘制游戏板
    drawBoard() {
        for (let y = 0; y < BOARD_HEIGHT; y++) {
            for (let x = 0; x < BOARD_WIDTH; x++) {
                if (this.board[y][x]) {
                    this.drawBlock(x * BLOCK_SIZE, y * BLOCK_SIZE, this.board[y][x]);
                }
            }
        }
    }

    // 绘制方块
    drawPiece(piece) {
        for (let y = 0; y < piece.shape.length; y++) {
            for (let x = 0; x < piece.shape[y].length; x++) {
                if (piece.shape[y][x]) {
                    const drawX = (piece.x + x) * BLOCK_SIZE;
                    const drawY = (piece.y + y) * BLOCK_SIZE;
                    this.drawBlock(drawX, drawY, piece.color);
                }
            }
        }
    }

    // 绘制幽灵方块
    drawGhostPiece() {
        const ghostPiece = {
            ...this.currentPiece,
            y: this.currentPiece.y
        };

        // 找到幽灵方块的位置
        while (!this.checkCollision(ghostPiece, 0, 1)) {
            ghostPiece.y++;
        }

        // 绘制半透明的幽灵方块
        this.ctx.save();
        this.ctx.globalAlpha = 0.3;

        for (let y = 0; y < ghostPiece.shape.length; y++) {
            for (let x = 0; x < ghostPiece.shape[y].length; x++) {
                if (ghostPiece.shape[y][x]) {
                    const drawX = (ghostPiece.x + x) * BLOCK_SIZE;
                    const drawY = (ghostPiece.y + y) * BLOCK_SIZE;
                    this.drawBlock(drawX, drawY, ghostPiece.color);
                }
            }
        }

        this.ctx.restore();
    }

    // 绘制单个方块
    drawBlock(x, y, color) {
        // 方块主体
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x + 1, y + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2);

        // 高光效果
        this.ctx.fillStyle = this.lightenColor(color, 0.3);
        this.ctx.fillRect(x + 1, y + 1, BLOCK_SIZE - 2, 3);
        this.ctx.fillRect(x + 1, y + 1, 3, BLOCK_SIZE - 2);

        // 阴影效果
        this.ctx.fillStyle = this.darkenColor(color, 0.3);
        this.ctx.fillRect(x + BLOCK_SIZE - 4, y + 1, 3, BLOCK_SIZE - 2);
        this.ctx.fillRect(x + 1, y + BLOCK_SIZE - 4, BLOCK_SIZE - 2, 3);
    }

    // 绘制下一个方块
    drawNextPiece() {
        this.nextCtx.fillStyle = '#1a202c';
        this.nextCtx.fillRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);

        if (this.nextPiece) {
            const blockSize = 20;
            const offsetX = (this.nextCanvas.width - this.nextPiece.shape[0].length * blockSize) / 2;
            const offsetY = (this.nextCanvas.height - this.nextPiece.shape.length * blockSize) / 2;

            for (let y = 0; y < this.nextPiece.shape.length; y++) {
                for (let x = 0; x < this.nextPiece.shape[y].length; x++) {
                    if (this.nextPiece.shape[y][x]) {
                        const drawX = offsetX + x * blockSize;
                        const drawY = offsetY + y * blockSize;

                        this.nextCtx.fillStyle = this.nextPiece.color;
                        this.nextCtx.fillRect(drawX + 1, drawY + 1, blockSize - 2, blockSize - 2);

                        // 高光效果
                        this.nextCtx.fillStyle = this.lightenColor(this.nextPiece.color, 0.3);
                        this.nextCtx.fillRect(drawX + 1, drawY + 1, blockSize - 2, 2);
                        this.nextCtx.fillRect(drawX + 1, drawY + 1, 2, blockSize - 2);

                        // 阴影效果
                        this.nextCtx.fillStyle = this.darkenColor(this.nextPiece.color, 0.3);
                        this.nextCtx.fillRect(drawX + blockSize - 3, drawY + 1, 2, blockSize - 2);
                        this.nextCtx.fillRect(drawX + 1, drawY + blockSize - 3, blockSize - 2, 2);
                    }
                }
            }
        }
    }

    // 颜色工具函数
    lightenColor(color, factor) {
        const hex = color.replace('#', '');
        const r = Math.min(255, parseInt(hex.substr(0, 2), 16) + Math.floor(255 * factor));
        const g = Math.min(255, parseInt(hex.substr(2, 2), 16) + Math.floor(255 * factor));
        const b = Math.min(255, parseInt(hex.substr(4, 2), 16) + Math.floor(255 * factor));
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }

    darkenColor(color, factor) {
        const hex = color.replace('#', '');
        const r = Math.max(0, parseInt(hex.substr(0, 2), 16) - Math.floor(255 * factor));
        const g = Math.max(0, parseInt(hex.substr(2, 2), 16) - Math.floor(255 * factor));
        const b = Math.max(0, parseInt(hex.substr(4, 2), 16) - Math.floor(255 * factor));
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }

    // 更新显示
    updateDisplay() {
        document.querySelector('.score').textContent = this.score;
        document.querySelector('.level').textContent = this.level;
        document.querySelector('.lines').textContent = this.lines;
    }
    
    // 设置烟花画布
    setupFireworksCanvas() {
        this.fireworksCanvas.width = window.innerWidth;
        this.fireworksCanvas.height = window.innerHeight;
        
        window.addEventListener('resize', () => {
            this.fireworksCanvas.width = window.innerWidth;
            this.fireworksCanvas.height = window.innerHeight;
        });
    }
    
    // 开始烟花效果
    startFireworks() {
        this.fireworksActive = true;
        this.fireworks = [];
        
        // 创建多个烟花
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                this.createFirework();
            }, i * 500);
        }
        
        // 开始烟花动画循环
        this.animateFireworks();
        
        // 5秒后停止烟花
        setTimeout(() => {
            this.fireworksActive = false;
        }, 5000);
    }
    
    // 创建烟花
    createFirework() {
        const firework = {
            x: Math.random() * this.fireworksCanvas.width,
            y: this.fireworksCanvas.height,
            targetX: Math.random() * this.fireworksCanvas.width,
            targetY: Math.random() * this.fireworksCanvas.height * 0.6,
            particles: [],
            exploded: false,
            color: this.getRandomColor()
        };
        
        this.fireworks.push(firework);
    }
    
    // 获取随机颜色
    getRandomColor() {
        const colors = ['#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', '#54a0ff', '#5f27cd', '#00d2d3', '#ff9f43'];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    // 烟花动画循环
    animateFireworks() {
        if (!this.fireworksActive && this.fireworks.length === 0) return;
        
        this.fireworksCtx.clearRect(0, 0, this.fireworksCanvas.width, this.fireworksCanvas.height);
        
        for (let i = this.fireworks.length - 1; i >= 0; i--) {
            const firework = this.fireworks[i];
            
            if (!firework.exploded) {
                // 烟花上升阶段
                this.drawFireworkTrail(firework);
                this.updateFireworkPosition(firework);
                
                if (firework.y <= firework.targetY) {
                    this.explodeFirework(firework);
                }
            } else {
                // 烟花爆炸阶段
                this.updateFireworkParticles(firework);
                this.drawFireworkParticles(firework);
                
                if (firework.particles.length === 0) {
                    this.fireworks.splice(i, 1);
                }
            }
        }
        
        if (this.fireworksActive || this.fireworks.length > 0) {
            requestAnimationFrame(() => this.animateFireworks());
        }
    }
    
    // 绘制烟花轨迹
    drawFireworkTrail(firework) {
        this.fireworksCtx.beginPath();
        this.fireworksCtx.arc(firework.x, firework.y, 3, 0, Math.PI * 2);
        this.fireworksCtx.fillStyle = firework.color;
        this.fireworksCtx.fill();
        
        // 添加拖尾效果
        this.fireworksCtx.beginPath();
        this.fireworksCtx.moveTo(firework.x, firework.y);
        this.fireworksCtx.lineTo(firework.x, firework.y + 20);
        this.fireworksCtx.strokeStyle = firework.color;
        this.fireworksCtx.lineWidth = 2;
        this.fireworksCtx.stroke();
    }
    
    // 更新烟花位置
    updateFireworkPosition(firework) {
        const dx = firework.targetX - firework.x;
        const dy = firework.targetY - firework.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 1) {
            firework.x += dx * 0.02;
            firework.y += dy * 0.02;
        }
    }
    
    // 烟花爆炸
    explodeFirework(firework) {
        firework.exploded = true;
        
        // 创建爆炸粒子
        for (let i = 0; i < 30; i++) {
            const angle = (Math.PI * 2 * i) / 30;
            const speed = 2 + Math.random() * 4;
            
            firework.particles.push({
                x: firework.x,
                y: firework.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1.0,
                decay: 0.02 + Math.random() * 0.01,
                size: 2 + Math.random() * 3,
                color: firework.color
            });
        }
    }
    
    // 更新烟花粒子
    updateFireworkParticles(firework) {
        for (let i = firework.particles.length - 1; i >= 0; i--) {
            const particle = firework.particles[i];
            
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.vy += 0.1; // 重力效果
            particle.life -= particle.decay;
            
            if (particle.life <= 0) {
                firework.particles.splice(i, 1);
            }
        }
    }
    
    // 绘制烟花粒子
    drawFireworkParticles(firework) {
        for (const particle of firework.particles) {
            this.fireworksCtx.save();
            this.fireworksCtx.globalAlpha = particle.life;
            this.fireworksCtx.beginPath();
            this.fireworksCtx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.fireworksCtx.fillStyle = particle.color;
            this.fireworksCtx.fill();
            this.fireworksCtx.restore();
        }
    }
}

// 初始化游戏
document.addEventListener('DOMContentLoaded', () => {
    const game = new TetrisGame();
    game.draw();
});

// 结束游戏代码
