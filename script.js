// --- Global Game Variables ---
let scene, camera, renderer;
let playerHealth = 100;
let zoneRadius = 100; // Initial Zone Radius
let zoneCenter = new THREE.Vector3(0, 0, 0); // Center of the map
const damagePerTick = 1;
const zoneShrinkRate = 0.05; // How much the radius shrinks per game loop cycle

// --- Inventory Data ---
const inventory = [
    { name: "AR (Epic)", rarity: "Epic" },
    { name: "Pistol (Common)", rarity: "Common" },
    { name: "Sniper (Legendary)", rarity: "Legendary" },
    { name: "Shotgun (Rare)", rarity: "Rare" },
    { name: "SMG (Uncommon)", rarity: "Uncommon" }
];
let activeSlot = 0; // 0-indexed: 0 to 4

// --- Player Movement Variables ---
const playerSpeed = 0.5;
const keyState = {};
const player = new THREE.Object3D(); // A container to hold the camera and simulate player position

// --- Initialization Function ---
function init() {
    // 1. Scene and Renderer Setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb); // Sky blue background

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 2, 0); // Start slightly above the ground
    player.add(camera);
    scene.add(player);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // 2. Lighting
    const ambientLight = new THREE.AmbientLight(0x606060);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 1, 0.5).normalize();
    scene.add(directionalLight);

    // 3. Create the Map (Ground)
    const groundGeometry = new THREE.PlaneGeometry(300, 300);
    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x228b22 }); // Forest Green
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2; // Rotate to be flat on the XZ plane
    scene.add(ground);

    // 4. Add Map Features (Hills/Buildings/Trees - represented by simple cubes)
    createMapFeature(new THREE.Vector3(20, 5, 20), new THREE.Vector3(10, 10, 10), 0x964b00); // Hill (Brown Cube)
    createMapFeature(new THREE.Vector3(-30, 7.5, 10), new THREE.Vector3(15, 15, 15), 0x808080); // Building (Grey Cube)
    createMapFeature(new THREE.Vector3(5, 2.5, -40), new THREE.Vector3(5, 5, 5), 0x006400); // Tree (Dark Green Cube)

    // 5. Update UI (Initial Inventory and Health)
    updateInventoryUI();
    updateHealthUI();
    updateZoneUI();

    // 6. Event Listeners
    window.addEventListener('resize', onWindowResize, false);
    document.addEventListener('keydown', onKeyDown, false);
    document.addEventListener('keyup', onKeyUp, false);
    document.addEventListener('mousemove', onMouseMove, false);

    // Lock cursor for better first-person control (needs user interaction first)
    document.body.addEventListener('click', () => {
        renderer.domElement.requestPointerLock();
    });

    // Start the game loop
    animate();
}

// --- Helper for creating simple map features ---
function createMapFeature(position, size, color) {
    const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
    const material = new THREE.MeshLambertMaterial({ color: color });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(position.x, position.y / 2, position.z); // Y is half the height
    scene.add(mesh);
}

// --- Main Game Loop ---
function animate() {
    requestAnimationFrame(animate);

    handlePlayerMovement();
    handleZoneLogic();
    
    renderer.render(scene, camera);
}

// --- Event Handlers ---
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function onKeyDown(event) {
    keyState[event.key] = true;
    
    // Check for inventory keybinds 1-5
    const slotKey = parseInt(event.key);
    if (slotKey >= 1 && slotKey <= 5) {
        activeSlot = slotKey - 1;
        updateInventoryUI();
    }
}

function onKeyUp(event) {
    keyState[event.key] = false;
}

// First-person look controls
function onMouseMove(event) {
    if (document.pointerLockElement === renderer.domElement) {
        const movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
        const movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;
        
        // Rotate the player object around the Y axis for horizontal look
        player.rotation.y -= movementX * 0.002;

        // Rotate the camera (pitch) up and down
        // Ensure pitch doesn't flip the camera (e.g., limit between -PI/2 and PI/2)
        camera.rotation.x -= movementY * 0.002;
        camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.rotation.x));
    }
}


// --- Game Logic Functions ---

function handlePlayerMovement() {
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0; // Prevent upward/downward movement on sloped terrain (for simplicity)
    forward.normalize();
    
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    // W - Move Forward
    if (keyState['w'] || keyState['W']) {
        player.position.addScaledVector(forward, playerSpeed);
    }
    // S - Move Backward
    if (keyState['s'] || keyState['S']) {
        player.position.addScaledVector(forward, -playerSpeed);
    }
    // A - Strafe Left
    if (keyState['a'] || keyState['A']) {
        player.position.addScaledVector(right, -playerSpeed);
    }
    // D - Strafe Right
    if (keyState['d'] || keyState['D']) {
        player.position.addScaledVector(right, playerSpeed);
    }

    // Simple boundary check to prevent falling off the edge (e.g., map is 300x300)
    const maxBound = 145; 
    player.position.x = Math.max(-maxBound, Math.min(maxBound, player.position.x));
    player.position.z = Math.max(-maxBound, Math.min(maxBound, player.position.z));
}

function handleZoneLogic() {
    // 1. Shrink the Zone
    zoneRadius -= zoneShrinkRate;
    zoneRadius = Math.max(10, zoneRadius); // Don't shrink below a minimum size

    // 2. Check Player Position vs. Zone
    const playerDistance = player.position.distanceTo(zoneCenter);
    
    if (playerDistance > zoneRadius) {
        // Player is outside the zone, apply damage
        playerHealth = Math.max(0, playerHealth - damagePerTick);
        updateHealthUI();

        // Optional: Change background color to red briefly to indicate damage
        renderer.domElement.style.border = '2px solid red';
        setTimeout(() => renderer.domElement.style.border = 'none', 100);
    }

    // 3. Update Zone UI
    updateZoneUI();

    if (playerHealth <= 0) {
        alert("You were eliminated by the storm! Refresh to restart.");
        // Stop the game loop
        cancelAnimationFrame(animate); 
    }
}


// --- UI Update Functions ---

function updateInventoryUI() {
    const slots = document.querySelectorAll('.slot');
    slots.forEach((slot, index) => {
        const item = inventory[index];
        // Set content and apply rarity color
        slot.textContent = `${index + 1}. ${item.name}`;
        slot.style.color = getRarityColor(item.rarity);
        
        // Highlight active slot
        if (index === activeSlot) {
            slot.classList.add('active');
            console.log(`Equipped: ${item.name}`);
        } else {
            slot.classList.remove('active');
        }
    });
}

function updateHealthUI() {
    document.getElementById('health-value').textContent = playerHealth;
}

function updateZoneUI() {
     document.getElementById('zone-size').textContent = Math.round(zoneRadius);
}

// Helper to assign a color based on the rarity
function getRarityColor(rarity) {
    switch(rarity) {
        case 'Common': return '#aaaaaa'; // Grey
        case 'Uncommon': return '#00aa00'; // Green
        case 'Rare': return '#0000aa'; // Blue
        case 'Epic': return '#aa00aa'; // Purple
        case 'Legendary': return '#ff8000'; // Orange
        default: return 'white';
    }
}

// Start the game!
window.onload = init;
