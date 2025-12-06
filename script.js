body {
    margin: 0;
    overflow: hidden; 
    background-color: #000;
}

canvas {
    display: block;
}

/* --- UI Overlays --- */
#game-ui {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    pointer-events: none; /* Allows mouse to interact with the canvas underneath */
    color: white;
    font-family: sans-serif;
    padding: 10px;
}

#health-bar, #zone-info {
    background-color: rgba(0, 0, 0, 0.5);
    padding: 5px 10px;
    border-radius: 5px;
    margin-bottom: 10px;
}

/* Inventory Positioning (Bottom Right and Smaller) */
#inventory {
    position: fixed;
    bottom: 20px;
    right: 20px; 
    left: auto;  
    transform: none; 
    display: flex;
    background-color: rgba(0, 0, 0, 0.7);
    padding: 5px; 
    border-radius: 8px;
}

#inventory h3 {
    display: none;
}

/* Slot Sizes (Smaller) */
.slot {
    width: 60px; 
    height: 60px; 
    line-height: 60px;
    text-align: center;
    margin: 0 4px; 
    border: 2px solid #666; 
    background-color: #333;
    border-radius: 4px;
    transition: border-color 0.2s;
    font-size: 12px; 
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.slot.active {
    border-color: #ff9900; 
    background-color: #555;
}
