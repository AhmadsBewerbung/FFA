// --- Global Game Variables ---
let scene, camera, renderer;
let playerHealth = 100;
let zoneRadius = 100; 
let zoneCenter = new THREE.Vector3(0, 0, 0); 
const damagePerTick = 1;
const zoneShrinkRate = 0.05; 
const clock = new THREE.Clock(); // Used for time-based movement if needed

// --- Inventory Data ---
const inventory = [
    { name: "AR (Epic)", rarity: "Epic" },
    { name: "Pistol (Common)", rarity: "Common" },
    { name: "Sniper (Legendary)", rarity: "Legendary" },
    { name: "Shotgun (Rare)", rarity: "Rare" },
    { name: "SMG (Uncommon)", rarity: "Uncommon" }
];
let activeSlot = 0; 

// --- Player & Camera Variables ---
const playerSpeed = 0.3; // Slower for better TP control
const keyState = {};
const player = new THREE.Object3D(); 
player.position.set(0, 0, 10); // Start player in a visible location

// Third Person Camera Constants
const TP_CAMERA_DISTANCE = 8; 
const TP_CAMERA_HEIGHT = 4;   
const TP_CAMERA_OFFSET_BACK = new THREE.Vector3(0, TP_CAMERA_HEIGHT, TP_CAMERA_DISTANCE);

// --- Shooting Variables ---
const bulletSpeed = 1.5; // Adjusted for animate loop
const activeBullets = [];

// --- Initialization Function ---
function init() {
    // 1. Scene and Renderer Setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb); 

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    // Position camera relative to the player using the offset
    camera.position.copy(TP_CAMERA_OFFSET_BACK);
    
    player.add(camera);
    scene.add(player);

    // Add a simple representation of the player body (a green cylinder for the player)
    const playerBodyGeometry = new THREE.CylinderGeometry(0.5, 0.5, 1.7, 16);
    const playerBodyMaterial = new THREE.MeshLambertMaterial({ color: 0x00aa00 }); 
    const playerBody = new THREE.Mesh(playerBodyGeometry, playerBodyMaterial);
    playerBody.position.y = 0.85; 
    player.add(playerBody); 

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
    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x228b22 }); 
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2; 
    scene.add(ground);

    // 4. Add Map Features (Cubes are easy targets for hit detection later)
    createMapFeature(new THREE.Vector3(20, 5, 20), new THREE.Vector3(10, 10, 10), 0x964b00); 
    createMapFeature(new THREE.Vector3(-30, 7.5, 10), new THREE.Vector3(15, 15, 15), 0x808080); 
    createMapFeature(new THREE.Vector3(5, 2.5, -40), new THREE.Vector3(5, 5, 5), 0x006400); 

    // 5. Update UI 
    updateInventoryUI();
    updateHealthUI();
    updateZoneUI();

    // 6. Event Listeners
    window.addEventListener('resize', onWindowResize, false);
    document.addEventListener('keydown', onKeyDown, false);
    document.addEventListener('keyup', onKeyUp, false);
    document.addEventListener('mousemove', onMouseMove, false);

    // Shoot on mouse click
    document.body.addEventListener('click', () => {
        if(document.pointerLockElement === renderer.domElement) {
             shoot(); 
        } else {
             renderer.domElement.requestPointerLock();
        }
    });

    // Start the game loop
    animate();
}

// --- Helper for creating simple map features ---
function createMapFeature(position, size, color) {
    const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
    const material = new THREE.MeshLambertMaterial({ color: color });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(position.x, position.y / 2, position.z); 
    scene.add(mesh);
}

// --- Main Game Loop ---
function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta(); // Time elapsed since last frame

    handlePlayerMovement(delta);
    handleZoneLogic();
    handleBullets(delta); // Pass delta for smooth, frame-rate independent movement
    
    // In third person, the camera must constantly look back at the player
    camera.lookAt(player.position.x, player.position.y + 1.2, player.position.z);
    
    renderer.render(scene, camera);
}

// --- Shooting Logic ---
function shoot() {
    // 1. Get the direction the player is looking (which determines where the bullet goes)
    // In TP, the direction is based on the player object's rotation (yaw)
    const direction = new THREE.Vector3(0, 0, 1);
    direction.applyQuaternion(player.quaternion);
    direction.y = 0; // Keep horizontal aim for simplicity
    direction.normalize();

    // 2. Create the bullet mesh (a small yellow sphere for visibility)
    const bulletGeometry = new THREE.SphereGeometry(0.15, 8, 8);
    const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
    
    // 3. Set the bullet's starting position (slightly in front of the player)
    const spawnHeight = player.position.y + 1.2; 
    bullet.position.copy(player.position).add(direction.clone().multiplyScalar(1));
    bullet.position.y = spawnHeight;

    scene.add(bullet);

    // 4. Track the bullet's movement data
    activeBullets.push({
        mesh: bullet,
        direction: direction.normalize(), 
        life: 200 // Max distance/lifetime
    });
}

function handleBullets(delta) {
    for (let i = activeBullets.length - 1; i >= 0; i--) {
        const bulletData = activeBullets[i];
        
        // Move the bullet distance = speed * time
        bulletData.mesh.position.addScaledVector(bulletData.direction, bulletSpeed * delta * 60);
        
        // Decrease bullet life
        bulletData.life--;

        // Check if bullet should be removed (lifetime expired)
        if (bulletData.life <= 0) {
            scene.remove(bulletData.mesh);
            activeBullets.splice(i, 1);
        }
    }
}


// --- Game Logic Functions ---

function handlePlayerMovement(delta) {
    const distance = playerSpeed * delta * 60; // Scale movement by time

    // Get direction player is currently facing
    const forward = new THREE.Vector3(0, 0, 1);
    forward.applyQuaternion(player.quaternion);
    forward.y = 0; 
    forward.normalize();
    
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    // W - Move Forward
    if (keyState['w'] || keyState['W']) {
        player.position.addScaledVector(forward, distance);
    }
    // S - Move Backward
    if (keyState['s'] || keyState['S']) {
        player.position.addScaledVector(forward, -distance);
    }
    // A - Strafe Left
    if (keyState['a'] || keyState['A']) {
        player.position.addScaledVector(right, -distance);
    }
    // D - Strafe Right
    if (keyState['d'] || keyState['D']) {
        player.position.addScaledVector(right, distance);
    }

    // Simple boundary check 
    const maxBound = 145; 
    player.position.x = Math.max(-maxBound, Math.min(maxBound, player.position.x));
    player.position.z = Math.max(-maxBound, Math.min(maxBound, player.position.z));
}

function handleZoneLogic() {
    zoneRadius -= zoneShrinkRate * clock.getDelta(); // Shrink by time
    zoneRadius = Math.max(10, zoneRadius); 

    const playerDistance = player.position.distanceTo(zoneCenter);
    
    if (playerDistance > zoneRadius) {
        playerHealth = Math.max(0, playerHealth - damagePerTick * clock.getDelta() * 10); // Damage over time
        updateHealthUI();

        renderer.domElement.style.border = '2px solid red';
        setTimeout(() => renderer.domElement.style.border = 'none', 100);
    }

    updateZoneUI();

    if (playerHealth <= 0) {
        alert("You were eliminated by the storm! Refresh to restart.");
        cancelAnimationFrame(animate); 
    }
}


// --- UI Update Functions ---
function updateInventoryUI() {
    const slots = document.querySelectorAll('.slot');
    slots.forEach((slot, index) => {
        const item = inventory[index];
        slot.textContent = `${index + 1}. ${item.name}`;
        slot.style.color = getRarityColor(item.rarity);
        
        if (index === activeSlot) {
            slot.classList.add('active');
        } else {
            slot.classList.remove('active');
        }
    });
}

function updateHealthUI() {
    document.getElementById('health-value').textContent = Math.round(playerHealth);
}

function updateZoneUI() {
     document.getElementById('zone-size').textContent = Math.round(zoneRadius);
}

function getRarityColor(rarity) {
    switch(rarity) {
        case 'Common': return '#aaaaaa'; 
        case 'Uncommon': return '#00aa00'; 
        case 'Rare': return '#0000aa'; 
        case 'Epic': return '#aa00aa'; 
        case 'Legendary': return '#ff8000'; 
        default: return 'white';
    }
}

// --- Event Handlers ---
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function onKeyDown(event) {
    keyState[event.key.toLowerCase()] = true;
    
    const slotKey = parseInt(event.key);
    if (slotKey >= 1 && slotKey <= 5) {
        activeSlot = slotKey - 1;
        updateInventoryUI();
    }
}

function onKeyUp(event) {
    keyState[event.key.toLowerCase()] = false;
}

// Third-person look controls: rotates the player object (yaw)
function onMouseMove(event) {
    if (document.pointerLockElement === renderer.domElement) {
        const movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
        player.rotation.y -= movementX * 0.002;
    }
}


// Start the game!
window.onload = init;
