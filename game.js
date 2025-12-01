// ===================================
// Logika Game Punto - Enhanced Web Application (FINAL CODE)
// ===================================

const GRID_SIZE = 9; 
const WIN_COUNT = 4;
const HAND_SIZE = 3; 
// Player Colors (Index 0: Red, 1: Blue, 2: Green, 3: Orange (Human Default))
const COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#ffa500']; 
const AI_MODELS = {
    // Colors removed from names to maintain neutrality
    'greedy': { name: 'Greedy-Aggressive', fn: ai_greedyAggressive },
    'blocker': { name: 'Blocker-Defensive', fn: ai_blockerDefensive },
    'balanced': { name: 'Balanced-Tactician', fn: ai_balancedTactician },
};
const SIMULATION_SPEED = 100; 

// Original Fixed deck sets (18 card values each)
const ORIGINAL_FIXED_DECK_STRINGS = [
    "395441927186237658", "673647219239541885", "723683744982596115", "759528638726934411", "794163412685859372",
    "651769537318289244", "132588127437946659", "956482786437946659", "328474756513129689", "789723624151835964",
    "455799846281126373", "217143664285958793", "236587195392644817", "374891915562273864", "628979543256117834",
    "646135279573281849", "192954647323887156", "849135676734229518", "874431928915626375", "518722549139643687"
];

// --- STRUKTUR DATA UTAMA ---
class Tile {
    constructor(playerIndex, value, color) {
        this.playerIndex = playerIndex;
        this.value = value;
        this.color = color;
    }
}

// --- STATUS APLIKASI GLOBAL ---
const APP = {
    views: {},
    currentPlayer: 0, 
    isGameOver: false,
    board: [],
    decks: [],
    hands: [], 
    playerConfig: [], 
    playerCount: 4,
    
    isHumanTurn: false,
    selectedRow: -1,
    selectedCol: -1,
    selectedCardIndex: -1, 

    allPresetDecks: [],
    comparisonHistories: [],
    currentHistoryIndex: 0,
    
    D: {}, 

    // --- UTILITIES ---

    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    },

    setupDOM() {
        this.views = {
            'main-menu': document.getElementById('main-menu'),
            'game-setup-view': document.getElementById('game-setup-view'),
            'game-board-view': document.getElementById('game-board-view'),
            'ai-description-view': document.getElementById('ai-description-view'),
            'ai-comparison-setup-view': document.getElementById('ai-comparison-setup-view'),
            'ai-comparison-visualizer-view': document.getElementById('ai-comparison-visualizer-view'),
            'deck-modal': document.getElementById('deck-modal'), 
        };
        this.D = {
            boardElement: document.getElementById('game-board'),
            currentPlayerDisplay: document.getElementById('current-player-display'),
            deckInfoDisplay: document.getElementById('deck-info-display'), 
            winnerDisplay: document.getElementById('winner-display'),
            humanControlsElement: document.getElementById('human-controls'),
            confirmMoveButton: document.getElementById('confirm-move-button'),
            humanHandElement: document.getElementById('human-hand'),
            playerConfigList: document.getElementById('player-config-list'),
            startBattleButton: document.getElementById('start-battle-button'),
            botASelect: document.getElementById('bot-a-select'),
            botBSelect: document.getElementById('bot-b-select'),
            startComparisonButton: document.getElementById('start-comparison-button'),
            simulationStatus: document.getElementById('simulation-status'),
            comparisonResultsOutput: document.getElementById('comparison-results-output'),
            visualizationBoard: document.getElementById('visualization-board'),
            historyLog: document.getElementById('history-log'),
            deckModalContent: document.getElementById('deck-modal-content'), 
            closeDeckModal: document.getElementById('close-deck-modal'), 
            viewDecksButton: document.getElementById('view-decks-button'), 
            gameEndControls: document.getElementById('game-end-controls'), 
        };
        this.setupEventListeners();
        this.showView('main-menu'); 
        this.renderPlayerSetupSelectors();
        this.renderAIComparisonSelectors();
    },

    setupEventListeners() {
        // FIX: Explicitly bind all event listeners to the APP object to prevent TypeError
        this.D.startBattleButton.addEventListener('click', this.startBattle.bind(this));
        this.D.confirmMoveButton.addEventListener('click', this.makeHumanMove.bind(this));
        this.D.startComparisonButton.addEventListener('click', this.startAIComparison.bind(this));
        
        this.D.viewDecksButton.addEventListener('click', this.showDeckModal.bind(this));
        this.D.closeDeckModal.addEventListener('click', this.closeDeckModal.bind(this));
    },

    showView(viewId) {
        Object.values(this.views).forEach(view => view.style.display = 'none');
        const viewElement = this.views[viewId];
        if (viewElement) {
            viewElement.style.display = viewId === 'game-board-view' || viewId === 'ai-comparison-visualizer-view' ? 'block' : 'flex';
        }
    },

    showDeckModal() {
        this.renderDeckSets();
        this.views['deck-modal'].style.display = 'flex';
    },

    closeDeckModal() {
        this.views['deck-modal'].style.display = 'none';
    },

    quitGame() {
        window.close();
    },

    resetGameAndShowMenu() {
        this.board = [];
        this.decks = [];
        this.hands = [];
        this.isGameOver = true;
        this.D.boardElement.innerHTML = '';
        this.D.winnerDisplay.textContent = '';
        this.D.gameEndControls.style.display = 'none'; 
        this.showView('main-menu');
    },
    
    restartCurrentGame() {
        this.D.winnerDisplay.textContent = '';
        this.D.gameEndControls.style.display = 'none';
        this.initializeGame(false); 
    },
    
    resetComparison() {
        this.comparisonHistories = [];
        this.currentHistoryIndex = 0;
        this.D.comparisonResultsOutput.innerHTML = '';
        this.D.visualizationBoard.innerHTML = '';
        this.D.historyLog.innerHTML = '';
        this.showView('ai-comparison-setup-view');
    },

    // -----------------------------------
    // A. GAME SETUP LOGIC 
    // -----------------------------------
    
    renderPlayerSetupSelectors() {
        this.D.playerConfigList.innerHTML = '';
        const allModels = Object.keys(AI_MODELS);
        for (let i = 0; i < 4; i++) {
            const div = document.createElement('div');
            div.className = 'player-config';
            
            // --- CHANGE 1: Simplify label to "Player X" ---
            const playerLabel = `Player ${i + 1}`; 
            
            // Determine initial type selection based on index (Player 4 usually defaults to Human)
            const initialType = (i === 3) ? 'human' : 'bot';
            
            div.innerHTML = `
                <label style="color: ${COLORS[i]};">${playerLabel}:</label>
                <select id="player-type-${i}" onchange="APP.updateModelSelector(${i})">
                    <option value="human" ${initialType === 'human' ? 'selected' : ''}>Human</option>
                    <option value="bot" ${initialType === 'bot' ? 'selected' : ''}>Bot</option>
                </select>
                <select id="player-model-${i}" class="model-selector" style="display:none;">
                    ${allModels.map(key => `<option value="${key}">${AI_MODELS[key].name}</option>`).join('')}
                </select>
            `;
            this.D.playerConfigList.appendChild(div);
            this.updateModelSelector(i);
        }
    },

    updateModelSelector(playerIndex) {
        const typeSelect = document.getElementById(`player-type-${playerIndex}`);
        const modelSelect = document.getElementById(`player-model-${playerIndex}`);
        if (typeSelect.value === 'bot') {
            modelSelect.style.display = 'inline-block';
        } else {
            modelSelect.style.display = 'none';
        }
    },

    startBattle() {
        const config = [];
        let humanCount = 0;
        let botCount = 0;
        
        for (let i = 0; i < 4; i++) {
            const typeSelect = document.getElementById(`player-type-${i}`);
            const modelSelect = document.getElementById(`player-model-${i}`);
            const type = typeSelect.value;
            const model = type === 'bot' ? modelSelect.value : 'human';
            
            config.push({ type, model, index: i, color: COLORS[i] });
            if (type === 'human') humanCount++;
            else botCount++;
        }

        if (humanCount === 0 || botCount === 0 || config.length !== 4) {
            if (humanCount === 0) alert("Harus ada setidaknya 1 Pemain Manusia.");
            else if (botCount === 0) alert("Harus ada setidaknya 1 Bot.");
            else alert("Kesalahan konfigurasi. Pastikan 4 pemain dipilih.");
            return;
        }

        this.playerConfig = config; 
        this.playerCount = config.length;
        this.showView('game-board-view');
        this.initializeGame(false); 
    },

    // -----------------------------------
    // B. GAME CORE LOGIC (3-CARD HAND)
    // -----------------------------------

    initializeGame(isHeadless) {
        this.isGameOver = false;
        this.currentPlayer = Math.floor(Math.random() * this.playerCount); 
        this.selectedRow = -1;
        this.selectedCol = -1;
        this.selectedCardIndex = -1;
        this.board = Array(GRID_SIZE).fill(0).map(() => Array(GRID_SIZE).fill(null));
        this.decks = [];
        this.hands = [];
        this.D.gameEndControls.style.display = 'none'; 

        for (let p = 0; p < this.playerCount; p++) {
            const fullDeck = [];
            const color = this.playerConfig[p].color;
            for (let val = 1; val <= 9; val++) {
                fullDeck.push(new Tile(p, val, color));
                fullDeck.push(new Tile(p, val, color));
            }
            this.shuffle(fullDeck);
            
            this.hands[p] = fullDeck.splice(0, HAND_SIZE);
            this.decks[p] = fullDeck;
        }
        
        if (!isHeadless) {
            this.D.winnerDisplay.textContent = '';
            this.renderBoard();
            this.updateGameInfo();
            this.handleTurn(); 
        }
    },
    
    drawCard(pIndex) {
        if (this.decks[pIndex].length > 0) {
            this.hands[pIndex].push(this.decks[pIndex].pop());
            return true;
        }
        return false;
    },

    isValidMove(r, c, card, currentBoard) {
        if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE || !card) return false;
        const targetTile = currentBoard[r][c];
        
        if (targetTile === null) {
            let totalTiles = currentBoard.flat().filter(t => t !== null).length;
            if (totalTiles === 0) return r === 4 && c === 4; 
            
            let hasNeighbor = false;
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    if (dr === 0 && dc === 0) continue;
                    const nr = r + dr;
                    const nc = c + dc;
                    if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE && currentBoard[nr][nc] !== null) {
                        hasNeighbor = true;
                        break;
                    }
                }
                if (hasNeighbor) break;
            }
            return hasNeighbor;
        } 
        
        return card.value > targetTile.value;
    },

    placeCard(r, c, card, currentBoard) {
        currentBoard[r][c] = card;
    },
    
    checkWin(r, c, gameBoard) {
        const startTile = gameBoard[r][c];
        if (!startTile) return false; 
        
        const pIndex = startTile.playerIndex;
        const directions = [[0, 1], [1, 0], [1, 1], [-1, 1]]; 

        for (const [dr, dc] of directions) {
            let count = 1;
            for (let i = 1; i < WIN_COUNT; i++) {
                const nr = r + dr * i;
                const nc = c + dc * i;
                if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE && 
                    gameBoard[nr][nc] !== null && gameBoard[nr][nc].playerIndex === pIndex) { count++; } else { break; }
            }
            for (let i = 1; i < WIN_COUNT; i++) {
                const nr = r - dr * i;
                const nc = c - dc * i;
                if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE && 
                    gameBoard[nr][nc] !== null && gameBoard[nr][nc].playerIndex === pIndex) { count++; } else { break; }
            }
            if (count >= WIN_COUNT) return true;
        }
        return false;
    },

    nextPlayerTurn() {
        this.currentPlayer = (this.currentPlayer + 1) % this.playerCount;
    },

    // -----------------------------------
    // C. UI RENDERING & HUMAN INTERACTION (Main Game)
    // -----------------------------------

    renderBoard() {
        const { boardElement } = this.D;
        boardElement.innerHTML = '';
        boardElement.style.gridTemplateColumns = `repeat(${GRID_SIZE}, var(--board-size))`; 
        boardElement.style.gridTemplateRows = `repeat(${GRID_SIZE}, var(--board-size))`; 

        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                const cell = document.createElement('div');
                cell.dataset.row = r;
                cell.dataset.col = c;
                cell.className = 'cell';
                
                const tile = this.board[r][c];
                if (tile) {
                    const card = document.createElement('div');
                    card.className = `card player-${tile.playerIndex}`; 
                    card.textContent = tile.value;
                    cell.appendChild(card);
                }
                
                cell.addEventListener('click', this.handleCellClick.bind(this));
                boardElement.appendChild(cell);
            }
        }
    },
    
    renderHumanHand() {
        const { humanHandElement, humanControlsElement } = this.D;
        const humanIndex = this.playerConfig.findIndex(p => p.type === 'human');
        humanHandElement.innerHTML = '';

        if (humanIndex === -1 || !this.hands[humanIndex] || this.isGameOver) {
            humanControlsElement.style.display = 'none';
            return;
        }

        this.hands[humanIndex].forEach((card, index) => {
            const slot = document.createElement('div');
            slot.className = 'hand-card-slot';
            slot.dataset.cardIndex = index;
            slot.textContent = card ? card.value : 'Empty';
            
            if (card) {
                slot.style.backgroundColor = card.color;
                slot.style.color = '#fff';
                
                if (index === this.selectedCardIndex) {
                    slot.classList.add('selected');
                }
                
                slot.addEventListener('click', this.handleCardSelect.bind(this, index));
            } else {
                slot.classList.add('empty');
            }
            
            humanHandElement.appendChild(slot);
        });

        if (this.isHumanTurn) {
            humanControlsElement.style.display = 'flex';
        }
    },

    handleCardSelect(index) {
        if (!this.isHumanTurn || this.isGameOver) return;
        this.selectedCardIndex = (this.selectedCardIndex === index) ? -1 : index;
        this.renderHumanHand();
        this.checkMoveValidity();
    },

    highlightSelectedCell(r, c) {
        document.querySelectorAll('.cell').forEach(cell => {
            cell.style.boxShadow = 'none';
            cell.style.backgroundColor = '#111';
        });

        if (r !== -1 && c !== -1) {
            const cellElement = document.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
            if (cellElement) {
                cellElement.style.boxShadow = `0 0 10px 2px ${this.playerConfig[this.currentPlayer].color}`;
                cellElement.style.backgroundColor = '#2a2a2a'; 
            }
        }
    },
    
    handleCellClick(e) {
        if (!this.isHumanTurn || this.isGameOver) return; 

        const r = parseInt(e.currentTarget.dataset.row);
        const c = parseInt(e.currentTarget.dataset.col);

        this.selectedRow = r;
        this.selectedCol = c;
        
        this.highlightSelectedCell(r, c);
        this.checkMoveValidity();
    },

    updateGameInfo() {
        const { currentPlayerDisplay, deckInfoDisplay, winnerDisplay, gameEndControls } = this.D;
        const config = this.playerConfig[this.currentPlayer];
        const playerColor = config.color;
        
        // --- CHANGE 2: Simplify current player display ---
        let playerName = `Player ${this.currentPlayer + 1}`;
        if (config.type === 'bot') {
             playerName += `: ${AI_MODELS[config.model].name}`;
        } else {
             playerName += ` (Anda)`;
        }
        
        currentPlayerDisplay.textContent = playerName;
        currentPlayerDisplay.style.color = playerColor;
        
        // Deck Info for ALL players
        let deckInfoHTML = '';
        this.playerConfig.forEach((p, index) => {
            const deckCount = this.decks[index].length;
            const handCount = this.hands[index].filter(c => c).length;
            
            // --- CHANGE 3: Simplify deck info display ---
            const pName = `Player ${index + 1}`;

            deckInfoHTML += `<span style="color: ${p.color};">
                ${pName} (Hand: ${handCount}, Deck: ${deckCount})
            </span>`;
        });
        deckInfoDisplay.innerHTML = deckInfoHTML;

        if (config.type === 'human') {
            this.renderHumanHand();
        } else {
            this.D.humanControlsElement.style.display = 'none';
        }
        
        if (this.isGameOver) {
            this.D.humanControlsElement.style.display = 'none';
            gameEndControls.style.display = 'block'; 
        } else {
            gameEndControls.style.display = 'none'; 
        }
    },
    
    checkMoveValidity() {
        const { confirmMoveButton } = this.D;
        const humanIndex = this.playerConfig.findIndex(p => p.type === 'human');
        const selectedCard = (humanIndex !== -1 && this.selectedCardIndex !== -1) ? this.hands[humanIndex][this.selectedCardIndex] : null;
        
        const isHandEmpty = this.hands[humanIndex].filter(c => c !== null).length === 0;

        if (isHandEmpty) {
            confirmMoveButton.disabled = false; 
            confirmMoveButton.classList.add('ready');
            confirmMoveButton.textContent = 'Pass (Hand Empty)';
            return;
        }

        confirmMoveButton.textContent = 'Konfirmasi Langkah';
        
        const isReadyToMove = this.selectedRow !== -1 && this.selectedCol !== -1 && selectedCard;
        
        if (isReadyToMove) {
            const isValid = this.isValidMove(this.selectedRow, this.selectedCol, selectedCard, this.board);
            
            if (isValid) {
                confirmMoveButton.disabled = false;
                confirmMoveButton.classList.add('ready');
            } else {
                confirmMoveButton.disabled = true;
                confirmMoveButton.classList.remove('ready');
            }
        } else {
            confirmMoveButton.disabled = true;
            confirmMoveButton.classList.remove('ready');
        }
    },
    
    makeHumanMove() {
        if (this.isGameOver) return;
        const humanIndex = this.playerConfig.findIndex(p => p.type === 'human');
        const selectedCard = (this.selectedCardIndex !== -1) ? this.hands[humanIndex][this.selectedCardIndex] : null;
        
        if (!selectedCard) { 
            if (this.hands[humanIndex].filter(c => c !== null).length === 0) {
                 this.processTurnEnd(false); 
                 return;
            }
            alert("Pilih Kartu di Tangan dan Posisi di Papan!");
            return;
        }
        
        const r = this.selectedRow;
        const c = this.selectedCol;

        if (r === -1 || c === -1) {
             alert("Pilih Posisi di Papan!");
             return;
        }

        if (this.isValidMove(r, c, selectedCard, this.board)) {
            this.placeCard(r, c, selectedCard, this.board);
            
            this.hands[humanIndex].splice(this.selectedCardIndex, 1);
            this.drawCard(humanIndex);

            if (this.checkWin(r, c, this.board)) {
                this.isGameOver = true;
                this.D.winnerDisplay.textContent = `🎉 Pemenang: Pemain Manusia!`;
                this.D.winnerDisplay.style.color = this.playerConfig[humanIndex].color;
            }
            
            this.processTurnEnd(true); 

        } else {
            alert("Langkah tidak valid. Coba lagi.");
            this.selectedRow = -1;
            this.selectedCol = -1;
            this.highlightSelectedCell(-1, -1);
            this.checkMoveValidity();
        }
    },

    // -----------------------------------
    // D. GAME FLOW & BOT LOGIC
    // -----------------------------------

    makeAIMove() {
        if (this.isGameOver) return;
        
        const pIndex = this.currentPlayer;
        const currentConfig = this.playerConfig[pIndex];
        const aiFn = AI_MODELS[currentConfig.model].fn;
        
        let bestMove = null;
        let bestCardIndex = -1;
        let maxScore = -Infinity;
        
        const currentHand = this.hands[pIndex];

        currentHand.forEach((card, cardIndex) => {
            if (!card) return;
            const { move, score } = aiFn(pIndex, card, this.board, this.playerCount, true); 
            
            if (score > maxScore) {
                maxScore = score;
                bestMove = move;
                bestCardIndex = cardIndex;
            }
        });

        if (bestMove && maxScore > -Infinity) {
            const r = bestMove.r; 
            const c = bestMove.c;
            const cardToPlay = currentHand[bestCardIndex];

            this.placeCard(r, c, cardToPlay, this.board);
            
            currentHand.splice(bestCardIndex, 1);
            this.drawCard(pIndex);

            if (this.checkWin(r, c, this.board)) { 
                this.isGameOver = true;
                // --- CHANGE 4: Simplify winner display for bots ---
                this.D.winnerDisplay.textContent = `🎉 Pemenang: Player ${pIndex + 1}: ${AI_MODELS[currentConfig.model].name}!`;
                this.D.winnerDisplay.style.color = currentConfig.color;
            }

            this.processTurnEnd(true); 
            
        } else {
            this.processTurnEnd(false); 
        }
    },

    processTurnEnd(moveWasExecuted) {
        if (!this.isGameOver) {
            this.nextPlayerTurn();
            
            const allHandsEmpty = this.hands.every(hand => hand.filter(c => c).length === 0);
            const allDecksEmpty = this.decks.every(deck => deck.length === 0);

            if (allHandsEmpty && allDecksEmpty) {
                this.isGameOver = true;
                this.D.winnerDisplay.textContent = 'Semua kartu habis. Permainan berakhir seri!';
                this.D.winnerDisplay.style.color = 'darkred';
            }
        }
        
        this.isHumanTurn = false;
        this.selectedRow = -1;
        this.selectedCol = -1;
        this.selectedCardIndex = -1;
        this.highlightSelectedCell(-1, -1);
        
        this.renderBoard();
        this.updateGameInfo();
        
        if (!this.isGameOver) {
            setTimeout(() => this.handleTurn(), 500); 
        }
    },

    handleTurn() {
        if (this.isGameOver) return;
        
        const config = this.playerConfig[this.currentPlayer];
        
        if (this.hands[this.currentPlayer].filter(c => c).length === 0) {
            setTimeout(() => this.processTurnEnd(false), 500);
            return;
        }

        if (config.type === 'human') {
            this.isHumanTurn = true;
            this.updateGameInfo(); 
            this.checkMoveValidity();
            
        } else {
            this.isHumanTurn = false;
            this.D.humanControlsElement.style.display = 'none';
            setTimeout(() => this.makeAIMove(), 1000); 
        }
    },
    
    // -----------------------------------
    // E. AI COMPARISON MODE (Visualizer & Fixed Decks)
    // -----------------------------------

    renderDeckSets() {
        let html = '<h3>20 Set Kartu Preset (18 Kartu per Set)</h3><div class="deck-sets-grid">';
        
        // Use the function that returns randomized decks for the display modal
        const randomizedDeckDisplay = APP.getShuffledDeckSets(); 

        randomizedDeckDisplay.forEach((deckString, index) => {
            const formattedDeck = deckString.split('').join(', ');
            
            html += `<div class="deck-set-card">
                        <h4>Set ${index + 1}</h4>
                        <p>${formattedDeck}</p>
                     </div>`;
        });
        
        html += '</div>';
        this.D.deckModalContent.innerHTML = html;
    },

    renderAIComparisonSelectors() {
        const models = Object.entries(AI_MODELS);
        const options = models.map(([key, model]) => `<option value="${key}">${model.name}</option>`).join('');
        this.D.botASelect.innerHTML = options;
        this.D.botBSelect.innerHTML = options;
        this.D.botASelect.value = 'greedy';
        this.D.botBSelect.value = 'blocker';
    },

    // NEW: Function to get the randomized list of deck strings
    getShuffledDeckSets() {
        return ORIGINAL_FIXED_DECK_STRINGS.map(deckString => {
            let chars = deckString.split('');
            APP.shuffle(chars);
            return chars.join('');
        });
    },
    
    generatePresetDecks(playerAColor, playerBColor) {
        const allDecks = [];
        
        // Generate new randomized strings for Deck A
        const shuffledDeckStrings = APP.getShuffledDeckSets();

        shuffledDeckStrings.forEach(deckString => {
            const fullDeckA = [];
            const fullDeckB = [];

            // Deck A: Randomized order from the deck string
            for (let i = 0; i < deckString.length; i++) {
                const value = parseInt(deckString[i]);
                fullDeckA.push(new Tile(0, value, playerAColor));
            }
            
            // Deck B: Randomized deck with the same total card distribution (9x2 = 18 cards)
            const valuesB = [];
            for (let val = 1; val <= 9; val++) { valuesB.push(val, val); }
            this.shuffle(valuesB);
            valuesB.forEach(value => fullDeckB.push(new Tile(1, value, playerBColor)));

            allDecks.push({ deckA: fullDeckA, deckB: fullDeckB });
        });
        
        return allDecks;
    },

    runHeadlessGame(fullDeckA, fullDeckB, modelAKey, modelBKey, startPlayerIndex) {
        const board = Array(GRID_SIZE).fill(0).map(() => Array(GRID_SIZE).fill(null));
        const decks = [fullDeckA.slice(), fullDeckB.slice()]; 
        const hands = [[], []];
        const history = [];

        const colorA = COLORS[0]; 
        const colorB = COLORS[1]; 
        
        const playerConfig = [
            { type: 'bot', model: modelAKey, index: 0, color: colorA },
            { type: 'bot', model: modelBKey, index: 1, color: colorB }
        ];
        let currentPlayer = startPlayerIndex;

        hands[0] = decks[0].splice(0, HAND_SIZE);
        hands[1] = decks[1].splice(0, HAND_SIZE);
        
        const drawCard = (pIndex) => {
            if (decks[pIndex].length > 0) {
                hands[pIndex].push(decks[pIndex].pop());
                return true;
            }
            return false;
        };

        const checkDraw = () => {
            const allHandsEmpty = hands.every(hand => hand.filter(c => c).length === 0);
            const allDecksEmpty = decks.every(deck => deck.length === 0);
            return allHandsEmpty && allDecksEmpty;
        };
        
        while (!checkDraw()) {
            const pIndex = currentPlayer;
            const currentConfig = playerConfig[pIndex];
            const aiFn = AI_MODELS[currentConfig.model].fn;
            const currentHand = hands[pIndex];
            
            let bestMove = null;
            let bestCardIndex = -1;
            let maxScore = -Infinity;
            let playedCard = null;

            if (currentHand.filter(c => c).length > 0) {
                currentHand.forEach((card, cardIndex) => {
                    if (!card) return;
                    const { move, score } = aiFn(pIndex, card, board, 2, true); 
                    
                    if (score > maxScore) {
                        maxScore = score;
                        bestMove = move;
                        bestCardIndex = cardIndex;
                    }
                });
            }

            if (bestMove && maxScore > -Infinity) {
                const r = bestMove.r; 
                const c = bestMove.c;
                playedCard = currentHand[bestCardIndex];

                APP.placeCard(r, c, playedCard, board);
                
                const newBoardState = board.map(row => row.map(tile => tile ? { index: tile.playerIndex, value: tile.value } : null));

                history.push({
                    player: pIndex,
                    move: { r, c, value: playedCard.value },
                    board: newBoardState,
                    win: false
                });

                currentHand.splice(bestCardIndex, 1);
                drawCard(pIndex);

                if (APP.checkWin(r, c, board)) { 
                    history[history.length - 1].win = true;
                    return { winner: pIndex, history }; 
                }
                
            } else {
                history.push({ player: pIndex, move: { r: -1, c: -1, value: null }, board: board.map(row => row.map(tile => tile ? { index: tile.playerIndex, value: tile.value } : null)), win: false, pass: true });
            }

            currentPlayer = (currentPlayer + 1) % 2;
        }

        return { winner: -1, history }; 
    },

    async startAIComparison() {
        const modelAKey = this.D.botASelect.value;
        const modelBKey = this.D.botBSelect.value;
        if (modelAKey === modelBKey) { alert("Pilih dua model AI yang berbeda."); return; }
        
        this.D.startComparisonButton.disabled = true;
        this.D.startComparisonButton.textContent = "Running 20 Games (Simulating...)";
        this.showView('ai-comparison-visualizer-view');
        this.D.comparisonResultsOutput.innerHTML = '';
        this.D.visualizationBoard.innerHTML = '';
        this.D.historyLog.innerHTML = '';

        const modelA = AI_MODELS[modelAKey];
        const modelB = AI_MODELS[modelBKey];
        
        // Generate new randomized decks for each comparison run
        this.allPresetDecks = this.generatePresetDecks(COLORS[0], COLORS[1]); 
        this.comparisonHistories = [];
        let winsA = 0;
        let winsB = 0;
        let draws = 0;

        // --- ROUND 1 (Games 1-10: Bot A uses D1-D10 vs Bot B uses D11-D20). Bot A starts (0) ---
        for (let i = 0; i < 10; i++) {
            const deckSetA = this.allPresetDecks[i]; // D1 to D10
            const deckSetB = this.allPresetDecks[i + 10]; // D11 to D20
            
            const { winner, history } = this.runHeadlessGame(deckSetA.deckA, deckSetB.deckB, modelAKey, modelBKey, 0); 
            
            if (winner === 0) winsA++; else if (winner === 1) winsB++; else draws++;
            this.comparisonHistories.push({ winner, history, gameNum: i + 1, deckSetA: i + 1, deckSetB: i + 11, starter: modelA.name, modelA: modelA.name, modelB: modelB.name });
        }

        // --- ROUND 2 (Games 11-20: Bot A uses D11-D20 vs Bot B uses D1-D10). Bot B starts (1) ---
        for (let i = 0; i < 10; i++) {
            const deckSetA = this.allPresetDecks[i + 10]; // D11 to D20
            const deckSetB = this.allPresetDecks[i]; // D1 to D10

            const { winner, history } = this.runHeadlessGame(deckSetA.deckA, deckSetB.deckB, modelAKey, modelBKey, 1); 
            
            if (winner === 0) winsA++; else if (winner === 1) winsB++; else draws++;
            this.comparisonHistories.push({ winner, history, gameNum: i + 11, deckSetA: i + 11, deckSetB: i + 1, starter: modelB.name, modelA: modelA.name, modelB: modelB.name });
        }
        
        const totalGames = 20;
        const winRateA = (winsA / totalGames * 100).toFixed(1);
        const winRateB = (winsB / totalGames * 100).toFixed(1);

        this.D.comparisonResultsOutput.innerHTML = `
            <h3>Final Results</h3>
            <ul>
                <li>Total Games: <strong>${totalGames}</strong></li>
                <li>${modelA.name} Wins: <strong>${winsA}</strong> (${winRateA}%)</li>
                <li>${modelB.name} Wins: <strong>${winsB}</strong> (${winRateB}%)</li>
                <li>Draws: <strong>${draws}</strong></li>
            </ul>
        `;

        this.D.simulationStatus.textContent = "Simulasi selesai. Memulai visualisasi langkah demi langkah.";
        this.currentHistoryIndex = 0;
        this.visualizeNextGame();
    },

    visualizeNextGame() {
        if (this.currentHistoryIndex >= this.comparisonHistories.length) {
            this.D.simulationStatus.textContent = "Visualisasi Selesai.";
            this.D.startComparisonButton.disabled = false;
            this.D.startComparisonButton.textContent = "Run New Comparison";
            return;
        }

        const game = this.comparisonHistories[this.currentHistoryIndex];
        this.D.historyLog.innerHTML = '';
        this.D.visualizationBoard.innerHTML = '';
        
        let winnerName = game.winner === 0 ? game.modelA : (game.winner === 1 ? game.modelB : 'Draw');
        let winnerColor = game.winner === 0 ? COLORS[0] : (game.winner === 1 ? COLORS[1] : '#333'); 
        const modelAColor = COLORS[0];
        const modelBColor = COLORS[1];

        this.D.simulationStatus.innerHTML = `
            Game ${game.gameNum}/20 | 
            <span style="color: ${modelAColor}">${game.modelA}</span> (Deck ${game.deckSetA}) 
            vs 
            <span style="color: ${modelBColor}">${game.modelB}</span> (Deck ${game.deckSetB})
            <br>Starter: ${game.starter} | Winner: <strong style="color: ${winnerColor}">${winnerName}</strong>
        `;
        
        this.renderVisualizationBoard(Array(GRID_SIZE).fill(0).map(() => Array(GRID_SIZE).fill(null)), this.D.visualizationBoard);

        this.playVisualization(game.history, 0, winnerName, winnerColor);
        this.currentHistoryIndex++;
    },

    playVisualization(history, step, winnerName, winnerColor) {
        if (step >= history.length) {
            this.D.historyLog.innerHTML += `<div class="log-entry win" style="color:${winnerColor}">GAME OVER. WINNER: ${winnerName}</div>`;
            setTimeout(() => this.visualizeNextGame(), 2000); 
            return;
        }

        const moveData = history[step];
        const player = moveData.player;
        const modelKey = player === 0 ? this.D.botASelect.value : this.D.botBSelect.value;
        const modelName = AI_MODELS[modelKey].name;
        const modelColor = player === 0 ? COLORS[0] : COLORS[1];
        
        this.renderVisualizationBoard(moveData.board, this.D.visualizationBoard);
        
        let logMessage;
        if (moveData.pass) {
            logMessage = `<span style="color:${modelColor}">Bot ${player + 1} (${modelName})</span> passed (no valid move/card).`;
        } else {
            logMessage = `<span style="color:${modelColor}">Bot ${player + 1} (${modelName})</span> played <strong style="color:${modelColor}">${moveData.move.value}</strong> at (${moveData.move.r}, ${moveData.move.c}).`;
        }
        
        if (moveData.win) {
            logMessage = `<span style="color:${winnerColor}">Bot ${player + 1} (${modelName}) WINS!</span> played ${moveData.move.value} at (${moveData.move.r}, ${moveData.move.c}).`;
        }

        this.D.historyLog.innerHTML += `<div class="log-entry">${logMessage}</div>`;
        this.D.historyLog.scrollTop = this.D.historyLog.scrollHeight;

        setTimeout(() => this.playVisualization(history, step + 1, winnerName, winnerColor), SIMULATION_SPEED);
    },

    renderVisualizationBoard(boardState, container) {
        container.innerHTML = '';
        container.style.gridTemplateColumns = `repeat(${GRID_SIZE}, 25px)`; 
        container.style.gridTemplateRows = `repeat(${GRID_SIZE}, 25px)`; 
        container.style.width = `${GRID_SIZE * 25 + 10}px`;
        container.style.margin = '10px auto';
        container.style.display = 'grid';
        container.style.gap = '1px';

        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.style.width = '25px';
                cell.style.height = '25px';
                
                const tile = boardState[r][c];
                if (tile) {
                    const card = document.createElement('div');
                    card.className = `card player-${tile.index}`;
                    card.textContent = tile.value;
                    card.style.fontSize = '0.9em';
                    card.style.width = '90%';
                    card.style.height = '90%';
                    cell.appendChild(card);
                }
                container.appendChild(cell);
            }
        }
    },
};

// ... (AI implementations below)

function evaluateBoardPosition(pIndex, gameBoard) {
    let score = 0;
    const directions = [[0, 1], [1, 0], [1, 1], [-1, 1]]; 
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            if (gameBoard[r][c] && gameBoard[r][c].playerIndex === pIndex) {
                for (const [dr, dc] of directions) {
                    let count = 0;
                    let openEnds = 0; 
                    for (let i = 1; i < WIN_COUNT; i++) {
                        const nr = r + dr * i;
                        const nc = c + dc * i;
                        if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE && 
                            gameBoard[nr][nc] && gameBoard[nr][nc].playerIndex === pIndex) { count++; } else {
                            if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE && 
                                APP.isValidMove(nr, nc, {value: 10}, gameBoard)) { openEnds++; } 
                            break;
                        }
                    }
                    let r_neg = r - dr;
                    let c_neg = c - dc;
                    if (r_neg >= 0 && r_neg < GRID_SIZE && c_neg >= 0 && c_neg < GRID_SIZE && 
                        APP.isValidMove(r_neg, c_neg, {value: 10}, gameBoard)) { openEnds++; }

                    if (count === 2 && openEnds >= 1) score += 10; 
                    if (count === 3 && openEnds >= 1) score += 1000; 
                }
            }
        }
    }
    return score;
}

function getValidMoves(card, currentBoard) {
    const moves = [];
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            if (APP.isValidMove(r, c, card, currentBoard)) {
                moves.push({ r, c });
            }
        }
    }
    return moves;
}

function findWinningMove(pIndex, card, currentBoard) {
    const validMoves = getValidMoves(card, currentBoard);
    for (const { r, c } of validMoves) {
        const simulatedBoard = currentBoard.map(row => [...row]);
        simulatedBoard[r][c] = new Tile(pIndex, card.value, card.color); 
        if (APP.checkWin(r, c, simulatedBoard)) {
            return { r, c };
        }
    }
    return null;
}

function selectRandomBestMove(bestMoves, maxScore, returnScore) {
    if (bestMoves.length === 0) return returnScore ? { move: null, score: -Infinity } : null;
    const move = bestMoves[Math.floor(Math.random() * bestMoves.length)];
    return returnScore ? { move, score: maxScore } : move;
}

function ai_greedyAggressive(pIndex, card, currentBoard, playerCount, returnScore = false) {
    const validMoves = getValidMoves(card, currentBoard);
    const winMove = findWinningMove(pIndex, card, currentBoard);
    if (winMove) return returnScore ? { move: winMove, score: 1000000 } : winMove; 

    for (let opponentIndex = 0; opponentIndex < playerCount; opponentIndex++) {
        if (opponentIndex === pIndex) continue;
        const opponentMaxCard = new Tile(opponentIndex, 9, COLORS[opponentIndex]); 
        const opponentWinMove = findWinningMove(opponentIndex, opponentMaxCard, currentBoard);
        if (opponentWinMove) {
            const blockMove = validMoves.find(m => m.r === opponentWinMove.r && m.c === opponentWinMove.c);
            if (blockMove) return returnScore ? { move: blockMove, score: 500000 } : blockMove; 
        }
    }
    let bestMoves = [];
    let maxScore = -Infinity;
    for (const move of validMoves) {
        const simulatedBoard = currentBoard.map(row => [...row]);
        const isStack = currentBoard[move.r][move.c] !== null;
        simulatedBoard[move.r][move.c] = new Tile(pIndex, card.value, card.color);
        let score = evaluateBoardPosition(pIndex, simulatedBoard);
        if (isStack) score += 5; 
        if (score > maxScore) {
            maxScore = score;
            bestMoves = [move]; 
        } else if (score === maxScore) {
            bestMoves.push(move);
        }
    }
    return selectRandomBestMove(bestMoves, maxScore, returnScore);
}

function ai_blockerDefensive(pIndex, card, currentBoard, playerCount, returnScore = false) {
    const validMoves = getValidMoves(card, currentBoard);
    const winMove = findWinningMove(pIndex, card, currentBoard);
    if (winMove) return returnScore ? { move: winMove, score: 1000000 } : winMove;

    let bestDefenseMoves = [];
    let maxDefenseScore = -Infinity;
    for (const move of validMoves) {
        const simulatedBoard = currentBoard.map(row => [...row]);
        simulatedBoard[move.r][move.c] = new Tile(pIndex, card.value, card.color);
        let defenseScore = 0;
        const isStack = currentBoard[move.r][move.c] !== null;
        for (let opponentIndex = 0; opponentIndex < playerCount; opponentIndex++) {
            if (opponentIndex === pIndex) continue;
            defenseScore -= evaluateBoardPosition(opponentIndex, simulatedBoard); 
        }
        if (isStack) defenseScore += 10;
        if (defenseScore > maxDefenseScore) {
            maxDefenseScore = defenseScore;
            bestDefenseMoves = [move];
        } else if (defenseScore === maxDefenseScore) {
            bestDefenseMoves.push(move);
        }
    }
    
    if (maxDefenseScore > -500 && bestDefenseMoves.length > 0) return selectRandomBestMove(bestDefenseMoves, maxDefenseScore, returnScore);

    let bestAttackMoves = [];
    let maxAttackScore = -Infinity;
    for (const move of validMoves) {
        const simulatedBoard = currentBoard.map(row => [...row]);
        simulatedBoard[move.r][move.c] = new Tile(pIndex, card.value, card.color);
        let attackScore = evaluateBoardPosition(pIndex, simulatedBoard);
        if (attackScore > maxAttackScore) {
            maxAttackScore = attackScore;
            bestAttackMoves = [move];
        } else if (attackScore === maxAttackScore) {
            bestAttackMoves.push(move);
        }
    }
    return selectRandomBestMove(bestAttackMoves, maxAttackScore, returnScore);
}

function ai_balancedTactician(pIndex, card, currentBoard, playerCount, returnScore = false) {
    const validMoves = getValidMoves(card, currentBoard);
    const winMove = findWinningMove(pIndex, card, currentBoard);
    if (winMove) return returnScore ? { move: winMove, score: 1000000 } : winMove;

    let bestMoves = [];
    let maxNetScore = -Infinity;
    for (const move of validMoves) {
        const simulatedBoard = currentBoard.map(row => [...row]);
        simulatedBoard[move.r][move.c] = new Tile(pIndex, card.value, card.color);
        let attackScore = evaluateBoardPosition(pIndex, simulatedBoard);
        let defenseScore = 0;
        for (let opponentIndex = 0; opponentIndex < playerCount; opponentIndex++) {
            if (opponentIndex === pIndex) continue;
            defenseScore += evaluateBoardPosition(opponentIndex, simulatedBoard);
        }
        let netScore = (attackScore * 1.2) - (defenseScore * 1.8); 
        netScore += card.value * 0.1;
        if (netScore > maxNetScore) {
            maxNetScore = netScore;
            bestMoves = [move];
        } else if (netScore === maxNetScore) {
            bestMoves.push(move);
        }
    }
    return selectRandomBestMove(bestMoves, maxNetScore, returnScore);
}


document.addEventListener('DOMContentLoaded', () => APP.setupDOM());